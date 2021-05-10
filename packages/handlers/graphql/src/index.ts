import {
  GetMeshSourceOptions,
  MeshHandler,
  MeshSource,
  ResolverData,
  YamlConfig,
  KeyValueCache,
} from '@graphql-mesh/types';
import { UrlLoader } from '@graphql-tools/url-loader';
import {
  GraphQLSchema,
  buildClientSchema,
  introspectionFromSchema,
  buildSchema,
  IntrospectionQuery,
  parse,
  execute,
  GraphQLResolveInfo,
} from 'graphql';
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
  sdl?: string;
}

const APOLLO_GET_SERVICE_DEFINITION_QUERY = /* GraphQL */ `
  query __ApolloGetServiceDefinition__ {
    _service {
      sdl
    }
  }
`;

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
    const { endpoint, schemaHeaders: configHeaders, introspection } = this.config;
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
    const urlLoader = new UrlLoader();
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
    const introspectionExecutor: AsyncExecutor = async (params): Promise<any> => {
      const { executor } = await getExecutorAndSubscriberForParams(params, schemaHeadersFactory, () => endpoint);
      return executor(params);
    };
    if (!this.introspectionCache.introspection) {
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
    const queryType = nonExecutableSchema.getQueryType();
    const queryTypeFieldMap = queryType.getFields();
    if ('_service' in queryTypeFieldMap) {
      const _serviceField = queryTypeFieldMap._service;
      if ('resolve' in _serviceField) {
        _serviceField.resolve = async () => {
          if (!this.introspectionCache.sdl) {
            const sdlQueryResult = await introspectionExecutor({
              document: parse(APOLLO_GET_SERVICE_DEFINITION_QUERY),
            });
            this.introspectionCache.sdl = sdlQueryResult?.data?._service?.sdl;
          }
          return {
            sdl: this.introspectionCache.sdl,
          };
        };
      }
    }
    const isSdlQuery = (info: GraphQLResolveInfo) =>
      info.fieldName === '_service' &&
      info.fieldNodes[0].selectionSet.selections[0].kind === 'Field' &&
      info.fieldNodes[0].selectionSet.selections[0].name.value === 'sdl';
    return {
      schema: nonExecutableSchema,
      executor: async params => {
        if (isSdlQuery(params.info)) {
          return execute(nonExecutableSchema, params.document);
        }
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
