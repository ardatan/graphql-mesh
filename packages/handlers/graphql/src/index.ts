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
  private baseDir: string;
  private cache: KeyValueCache<any>;

  constructor({ name, config, baseDir, cache }: GetMeshSourceOptions<YamlConfig.GraphQLHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
  }

  async getMeshSource(): Promise<MeshSource> {
    const { endpoint, schemaHeaders: configHeaders, cacheIntrospection, introspection } = this.config;

    if (endpoint.endsWith('.js') || endpoint.endsWith('.ts')) {
      const schema = await loadFromModuleExportExpression<GraphQLSchema>(endpoint, { cwd: this.baseDir });
      return {
        schema,
      };
    } else if (endpoint.endsWith('.graphql')) {
      const rawSDL = await loadFromModuleExportExpression<string>(endpoint, { cwd: this.baseDir });
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
    let schemaHeaders =
      typeof configHeaders === 'string'
        ? await loadFromModuleExportExpression(configHeaders, { cwd: this.baseDir })
        : configHeaders;
    if (typeof schemaHeaders === 'function') {
      schemaHeaders = schemaHeaders();
    }
    if (schemaHeaders && 'then' in schemaHeaders) {
      schemaHeaders = await schemaHeaders;
    }
    const schemaHeadersFactory = getInterpolatedHeadersFactory(schemaHeaders || {});
    const introspectionExecutor: AsyncExecutor = async (params): Promise<any> => {
      const { executor } = await getExecutorAndSubscriberForParams(params, schemaHeadersFactory, () => endpoint);
      return executor(params);
    };
    if (introspection) {
      const result = await urlLoader.handleSDLAsync(introspection, {
        customFetch: customFetch as any,
        ...this.config,
        headers: schemaHeaders,
      });
      schema = result.schema;
    } else if (cacheIntrospection) {
      const cacheKey = this.name + '_introspection';
      const introspectionData: any = await this.cache.get(cacheKey);
      if (introspectionData) {
        schema = buildClientSchema(introspectionData);
      } else {
        schema = await introspectSchema(introspectionExecutor);
        const ttl = typeof cacheIntrospection === 'object' && cacheIntrospection.ttl;
        const introspection = introspectionFromSchema(schema);
        this.cache.set(cacheKey, introspection, { ttl });
      }
    } else {
      schema = await introspectSchema(introspectionExecutor);
    }
    const operationHeadersFactory = getInterpolatedHeadersFactory(this.config.operationHeaders);
    const endpointFactory = getInterpolatedStringFactory(endpoint);
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
      batch: 'batch' in this.config ? this.config.batch : true,
    };
  }
}
