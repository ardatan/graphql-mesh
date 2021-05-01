import {
  GetMeshSourceOptions,
  MeshHandler,
  MeshSource,
  ResolverData,
  YamlConfig,
  KeyValueCache,
} from '@graphql-mesh/types';
import { UrlLoader } from '@graphql-tools/url-loader';
import { GraphQLSchema, buildClientSchema, introspectionFromSchema, buildSchema, IntrospectionQuery } from 'graphql';
import { introspectSchema } from '@graphql-tools/wrap';
import {
  getInterpolatedHeadersFactory,
  ResolverDataBasedFactory,
  getHeadersObject,
  loadFromModuleExportExpression,
  getInterpolatedStringFactory,
  getCachedFetch,
} from '@graphql-mesh/utils';
import { ExecutionParams, AsyncExecutor } from '@graphql-tools/delegate';

export interface GraphQLHandlerIntrospection {
  introspection?: IntrospectionQuery;
}

export default class GraphQLHandler implements MeshHandler {
  private config: YamlConfig.GraphQLHandler;
  private baseDir: string;
  private cache: KeyValueCache<any>;
  private introspectionCache: GraphQLHandlerIntrospection;

  constructor({
    config,
    baseDir,
    cache,
    introspectionCache = {},
  }: GetMeshSourceOptions<YamlConfig.GraphQLHandler, GraphQLHandlerIntrospection>) {
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.introspectionCache = introspectionCache;
  }

  async getMeshSource(): Promise<MeshSource> {
    const { endpoint, schemaHeaders: configHeaders, introspection, useWebSocketLegacyProtocol = false } = this.config;
    const customFetch = getCachedFetch(this.cache);

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
    const urlLoader = new UrlLoader(useWebSocketLegacyProtocol);
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
        customFetch,
        ...this.config,
        headers,
      });
    };
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
    if (!this.introspectionCache.introspection) {
      const introspectionExecutor: AsyncExecutor = async (params): Promise<any> => {
        const { executor } = await getExecutorAndSubscriberForParams(params, schemaHeadersFactory, () => endpoint);
        return executor(params);
      };
      if (introspection) {
        const result = await urlLoader.handleSDLAsync(introspection, {
          customFetch,
          ...this.config,
          headers: schemaHeaders,
        });
        this.introspectionCache.introspection = introspectionFromSchema(result.schema);
      } else {
        this.introspectionCache.introspection = introspectionFromSchema(await introspectSchema(introspectionExecutor));
      }
    }
    const nonExecutableSchema = buildClientSchema(this.introspectionCache.introspection);
    const operationHeadersFactory = getInterpolatedHeadersFactory(this.config.operationHeaders);
    const endpointFactory = getInterpolatedStringFactory(endpoint);
    return {
      schema: nonExecutableSchema,
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
