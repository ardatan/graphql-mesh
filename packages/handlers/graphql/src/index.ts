import {
  GetMeshSourceOptions,
  MeshHandler,
  MeshSource,
  ResolverData,
  YamlConfig,
  KeyValueCache,
} from '@graphql-mesh/types';
import { UrlLoader } from '@graphql-tools/url-loader';
import { GraphQLSchema, buildSchema, parse, DocumentNode, Kind, buildASTSchema, ExecutionResult } from 'graphql';
import { introspectSchema } from '@graphql-tools/wrap';
import {
  getInterpolatedHeadersFactory,
  ResolverDataBasedFactory,
  getHeadersObject,
  loadFromModuleExportExpression,
  getInterpolatedStringFactory,
  getCachedFetch,
  readFileOrUrlWithCache,
} from '@graphql-mesh/utils';
import { ExecutionParams, AsyncExecutor } from '@graphql-tools/delegate';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import federationToStitchingSDL from 'federation-to-stitching-sdl';
import { mergeSchemas } from '@graphql-tools/merge';

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
  private nonExecutableSchema: StoreProxy<GraphQLSchema>;
  private apolloServiceSdl: StoreProxy<string>;

  constructor({ config, baseDir, cache, store }: GetMeshSourceOptions<YamlConfig.GraphQLHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.nonExecutableSchema = store.proxy('schema.graphql', PredefinedProxyOptions.GraphQLSchemaWithDiffing);
    this.apolloServiceSdl = store.proxy('apolloService.graphql', PredefinedProxyOptions.StringWithoutValidation);
  }

  async getMeshSource(): Promise<MeshSource> {
    const { endpoint, schemaHeaders: configHeaders, introspection } = this.config;
    const customFetch = getCachedFetch(this.cache);

    if (endpoint.endsWith('.js') || endpoint.endsWith('.ts')) {
      // Loaders logic should be here somehow
      const schemaOrStringOrDocumentNode = await loadFromModuleExportExpression<GraphQLSchema | string | DocumentNode>(
        endpoint,
        { cwd: this.baseDir }
      );
      let schema: GraphQLSchema;
      if (schemaOrStringOrDocumentNode instanceof GraphQLSchema) {
        schema = schemaOrStringOrDocumentNode;
      } else if (typeof schemaOrStringOrDocumentNode === 'string') {
        schema = buildSchema(schemaOrStringOrDocumentNode);
      } else if (
        typeof schemaOrStringOrDocumentNode === 'object' &&
        schemaOrStringOrDocumentNode?.kind === Kind.DOCUMENT
      ) {
        schema = buildASTSchema(schemaOrStringOrDocumentNode);
      } else {
        throw new Error(
          `Provided file '${endpoint} exports an unknown type: ${typeof schemaOrStringOrDocumentNode}': expected GraphQLSchema, SDL or DocumentNode.`
        );
      }
      return {
        schema,
      };
    } else if (endpoint.endsWith('.graphql')) {
      const rawSDL = await readFileOrUrlWithCache<string>(endpoint, this.cache, {
        cwd: this.baseDir,
        allowUnknownExtensions: true,
      });
      const schema = buildSchema(rawSDL);
      return {
        schema,
      };
    }
    const urlLoader = new UrlLoader();
    const getExecutorForParams = (
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
      return urlLoader.getExecutorAsync(endpoint, {
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
      const executor = await getExecutorForParams(params, schemaHeadersFactory, () => endpoint);
      return executor(params);
    };
    const operationHeadersFactory = getInterpolatedHeadersFactory(this.config.operationHeaders);
    const endpointFactory = getInterpolatedStringFactory(endpoint);

    const fetchApolloServiceSdl = async () => {
      return this.apolloServiceSdl.getWithSet(async () => {
        const sdlQueryResult = (await introspectionExecutor({
          document: parse(APOLLO_GET_SERVICE_DEFINITION_QUERY),
        })) as ExecutionResult;
        return sdlQueryResult?.data?._service?.sdl;
      });
    };

    const nonExecutableSchema = await this.nonExecutableSchema.getWithSet(async () => {
      const schemaFromIntrospection = await (introspection
        ? urlLoader
            .handleSDL(introspection, customFetch, {
              ...this.config,
              headers: schemaHeaders,
            })
            .then(({ schema }) => schema)
        : introspectSchema(introspectionExecutor));
      const queryTypeFromIntrospection = schemaFromIntrospection.getQueryType();
      const queryTypeFieldMap = queryTypeFromIntrospection.getFields();
      if ('_service' in queryTypeFieldMap) {
        const apolloServiceSdl = await fetchApolloServiceSdl();
        // eslint-disable-next-line no-unused-expressions
        (schemaFromIntrospection.getDirectives() as any[]).splice(0, schemaFromIntrospection.getDirectives().length);
        return mergeSchemas({
          schemas: [schemaFromIntrospection],
          typeDefs: [federationToStitchingSDL(apolloServiceSdl)],
        });
      }
      return schemaFromIntrospection;
    });
    const queryTypeFromIntrospection = nonExecutableSchema.getQueryType();
    const queryTypeFieldMap = queryTypeFromIntrospection.getFields();
    if ('_service' in queryTypeFieldMap) {
      const _serviceField = queryTypeFieldMap._service;
      const apolloServiceSdl = await fetchApolloServiceSdl();
      _serviceField.resolve = async () => {
        return {
          sdl: apolloServiceSdl,
        };
      };
      nonExecutableSchema.extensions = nonExecutableSchema.extensions || {};
      Object.assign(nonExecutableSchema.extensions, {
        apolloServiceSdl,
      });
    }
    return {
      schema: nonExecutableSchema,
      executor: async params => {
        const executor = await getExecutorForParams(params, operationHeadersFactory, endpointFactory);
        return executor(params);
      },
      batch: 'batch' in this.config ? this.config.batch : true,
    };
  }
}
