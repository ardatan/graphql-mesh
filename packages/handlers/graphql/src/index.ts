import { GetMeshSourceOptions, MeshHandler, MeshSource, ResolverData, YamlConfig } from '@graphql-mesh/types';
import { fetchache, KeyValueCache, Request } from 'fetchache';
import { UrlLoader } from '@graphql-tools/url-loader';
import { GraphQLSchema, buildClientSchema, introspectionFromSchema, buildSchema } from 'graphql';
import { introspectSchema } from '@graphql-tools/wrap';
import {
  getInterpolatedHeadersFactory,
  ResolverDataBasedFactory,
  getHeadersObject,
  loadFromModuleExportExpression,
  getInterpolatedStringFactory,
} from '@graphql-mesh/utils';
import { ExecutionParams, AsyncExecutor } from '@graphql-tools/delegate';

export default class GraphQLHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.GraphQLHandler;
  private cache: KeyValueCache<any>;

  constructor({ name, config, cache }: GetMeshSourceOptions<YamlConfig.GraphQLHandler>) {
    this.name = name;
    this.config = config;
    this.cache = cache;
  }

  async getMeshSource(): Promise<MeshSource> {
    if (this.config.endpoint.endsWith('.js') || this.config.endpoint.endsWith('.ts')) {
      const schema = await loadFromModuleExportExpression<GraphQLSchema>(this.config.endpoint);
      return {
        schema,
      };
    } else if (this.config.endpoint.endsWith('.graphql')) {
      const rawSDL = await loadFromModuleExportExpression<string>(this.config.endpoint);
      const schema = buildSchema(rawSDL);
      return {
        schema,
      };
    }
    const urlLoader = new UrlLoader();
    const customFetch: WindowOrWorkerGlobalScope['fetch'] = (...args) =>
      fetchache(args[0] instanceof Request ? args[0] : new Request(...args), this.cache);
    const getExecutorAndSubscriberForParams = (
      params: ExecutionParams,
      headersFactory: ResolverDataBasedFactory<Headers>,
      endpointFactory: ResolverDataBasedFactory<string>
    ) => {
      const resolverData: ResolverData = {
        root: {},
        args: params.variables,
        context: params.context,
      };
      const headers = getHeadersObject(headersFactory(resolverData));
      const endpoint = endpointFactory(resolverData);
      return urlLoader.getExecutorAndSubscriberAsync(endpoint, {
        customFetch: customFetch as any,
        ...this.config,
        headers,
      });
    };
    let schema: GraphQLSchema;
    const schemaHeadersFactory = getInterpolatedHeadersFactory(this.config.schemaHeaders);
    const introspectionExecutor: AsyncExecutor = async (params): Promise<any> => {
      const { executor } = await getExecutorAndSubscriberForParams(
        params,
        schemaHeadersFactory,
        () => this.config.endpoint
      );
      return executor(params);
    };
    if (this.config.introspection) {
      const result = await urlLoader.handleSDLAsync(this.config.introspection, {
        customFetch: customFetch as any,
        ...this.config,
        headers: this.config.schemaHeaders,
      });
      schema = result.schema;
    } else if (this.config.cacheIntrospection) {
      const cacheKey = this.name + '_introspection';
      const introspectionData: any = await this.cache.get(cacheKey);
      if (introspectionData) {
        schema = buildClientSchema(introspectionData);
      } else {
        schema = await introspectSchema(introspectionExecutor);
        const ttl = typeof this.config.cacheIntrospection === 'object' && this.config.cacheIntrospection.ttl;
        const introspection = introspectionFromSchema(schema);
        this.cache.set(cacheKey, introspection, { ttl });
      }
    } else {
      schema = await introspectSchema(introspectionExecutor);
    }
    const operationHeadersFactory = getInterpolatedHeadersFactory(this.config.operationHeaders);
    const endpointFactory = getInterpolatedStringFactory(this.config.endpoint);
    return {
      schema,
      executor: async params => {
        const { executor } = await getExecutorAndSubscriberForParams(params, operationHeadersFactory, endpointFactory);
        return executor(params) as any;
      },
      subscriber: async params => {
        const { subscriber } = await getExecutorAndSubscriberForParams(
          params,
          operationHeadersFactory,
          endpointFactory
        );
        return subscriber(params);
      },
    };
  }
}
