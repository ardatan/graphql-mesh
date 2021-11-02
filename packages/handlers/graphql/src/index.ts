import {
  GetMeshSourceOptions,
  MeshHandler,
  MeshSource,
  ResolverData,
  YamlConfig,
  KeyValueCache,
  ImportFn,
} from '@graphql-mesh/types';
import { UrlLoader, SubscriptionProtocol } from '@graphql-tools/url-loader';
import {
  GraphQLSchema,
  buildSchema,
  DocumentNode,
  Kind,
  buildASTSchema,
  IntrospectionQuery,
  buildClientSchema,
} from 'graphql';
import { introspectSchema } from '@graphql-tools/wrap';
import {
  getInterpolatedHeadersFactory,
  ResolverDataBasedFactory,
  loadFromModuleExportExpression,
  getInterpolatedStringFactory,
  getCachedFetch,
  readFileOrUrl,
} from '@graphql-mesh/utils';
import { ExecutionRequest, isDocumentNode } from '@graphql-tools/utils';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { env } from 'process';

export default class GraphQLHandler implements MeshHandler {
  private config: YamlConfig.GraphQLHandler;
  private baseDir: string;
  private cache: KeyValueCache<any>;
  private nonExecutableSchema: StoreProxy<GraphQLSchema>;
  private importFn: ImportFn;

  constructor({ config, baseDir, cache, store, importFn }: GetMeshSourceOptions<YamlConfig.GraphQLHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.nonExecutableSchema = store.proxy('schema.graphql', PredefinedProxyOptions.GraphQLSchemaWithDiffing);
    this.importFn = importFn;
  }

  async getMeshSource(): Promise<MeshSource> {
    const { endpoint, schemaHeaders: configHeaders, introspection } = this.config;
    const customFetch = this.config.customFetch
      ? await loadFromModuleExportExpression<ReturnType<typeof getCachedFetch>>(this.config.customFetch, {
          cwd: this.baseDir,
          defaultExportName: 'default',
          importFn: this.importFn,
        })
      : getCachedFetch(this.cache);

    if (endpoint.endsWith('.js') || endpoint.endsWith('.ts')) {
      // Loaders logic should be here somehow
      const schemaOrStringOrDocumentNode = await loadFromModuleExportExpression<GraphQLSchema | string | DocumentNode>(
        endpoint,
        { cwd: this.baseDir, defaultExportName: 'default', importFn: this.importFn }
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
      const rawSDL = await readFileOrUrl<string>(endpoint, {
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
      params: ExecutionRequest,
      headersFactory: ResolverDataBasedFactory<Record<string, string>>,
      endpointFactory: ResolverDataBasedFactory<string>
    ) => {
      const resolverData: ResolverData = {
        root: {},
        args: params.variables,
        context: params.context,
        env,
      };
      const headers = headersFactory(resolverData);
      const endpoint = endpointFactory(resolverData);
      return urlLoader.getExecutorAsync(endpoint, {
        ...this.config,
        customFetch,
        subscriptionsProtocol: this.config.subscriptionsProtocol as SubscriptionProtocol,
        headers,
      });
    };
    let schemaHeaders =
      typeof configHeaders === 'string'
        ? await loadFromModuleExportExpression(configHeaders, {
            cwd: this.baseDir,
            defaultExportName: 'default',
            importFn: this.importFn,
          })
        : configHeaders;
    if (typeof schemaHeaders === 'function') {
      schemaHeaders = schemaHeaders();
    }
    if (schemaHeaders && 'then' in schemaHeaders) {
      schemaHeaders = await schemaHeaders;
    }
    const schemaHeadersFactory = getInterpolatedHeadersFactory(schemaHeaders || {});
    const endpointFactory = getInterpolatedStringFactory(endpoint);
    const operationHeadersFactory = getInterpolatedHeadersFactory(this.config.operationHeaders);

    const nonExecutableSchema = await this.nonExecutableSchema.getWithSet(async () => {
      if (introspection) {
        const headers = schemaHeadersFactory({
          env,
        });
        const sdlOrIntrospection = await readFileOrUrl<string | IntrospectionQuery | DocumentNode>(endpoint, {
          cwd: this.baseDir,
          allowUnknownExtensions: true,
          fetch: customFetch,
          headers,
        });
        if (typeof sdlOrIntrospection === 'string') {
          return buildSchema(sdlOrIntrospection);
        } else if (isDocumentNode(sdlOrIntrospection)) {
          return buildASTSchema(sdlOrIntrospection);
        } else {
          return buildClientSchema(sdlOrIntrospection);
        }
      } else {
        const introspectionExecutor = async function introspectionExecutor(request: ExecutionRequest) {
          const executor = await getExecutorForParams(request, schemaHeadersFactory, endpointFactory);
          return executor(request);
        };
        return introspectSchema(introspectionExecutor);
      }
    });
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
