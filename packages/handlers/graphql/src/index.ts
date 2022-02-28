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
import { ExecutionRequest, isDocumentNode, inspect } from '@graphql-tools/utils';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { env } from 'process';

export default class GraphQLHandler implements MeshHandler {
  private config: YamlConfig.Handler['graphql'];
  private baseDir: string;
  private cache: KeyValueCache<any>;
  private nonExecutableSchema: StoreProxy<GraphQLSchema>;
  private importFn: ImportFn;
  private urlLoader = new UrlLoader();

  constructor({ config, baseDir, cache, store, importFn }: GetMeshSourceOptions<YamlConfig.Handler['graphql']>) {
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.nonExecutableSchema = store.proxy('schema.graphql', PredefinedProxyOptions.GraphQLSchemaWithDiffing);
    this.importFn = importFn;
  }

  private getDefaultFetch(timeout?: number): ReturnType<typeof getCachedFetch> {
    const cachedFetch = getCachedFetch(this.cache);
    if (timeout != null) {
      return (...args) =>
        Promise.race([
          cachedFetch(...args),
          new Promise<any>((_resolve, reject) => setTimeout(() => reject(new Error('Timeout in ' + timeout)), timeout)),
        ]);
    }
    return cachedFetch;
  }

  private async getExecutorForParams(
    params: ExecutionRequest,
    headersFactory: ResolverDataBasedFactory<Record<string, string>>,
    endpointFactory: ResolverDataBasedFactory<string>,
    httpSourceConfig: YamlConfig.GraphQLHandlerHTTPConfiguration,
    customFetch: ReturnType<typeof getCachedFetch>
  ) {
    const resolverData: ResolverData = {
      root: params.rootValue,
      args: params.variables,
      context: params.context,
      env,
    };
    const headers = headersFactory(resolverData);
    const endpoint = endpointFactory(resolverData);
    const executor = await this.urlLoader.getExecutorAsync(endpoint, {
      ...httpSourceConfig,
      customFetch,
      subscriptionsProtocol: httpSourceConfig.subscriptionsProtocol as SubscriptionProtocol,
      headers,
    });
    if (httpSourceConfig.retry) {
      let error: Error;
      return async function retryExecutor() {
        for (let attempt = 0; attempt < httpSourceConfig.retry; attempt++) {
          try {
            return await executor(params);
          } catch (e) {
            error = e;
          }
        }
        throw error;
      };
    }
    return executor;
  }

  private getCustomFetchImpl(customFetchConfig: string, timeout?: number) {
    return customFetchConfig
      ? loadFromModuleExportExpression<ReturnType<typeof getCachedFetch>>(customFetchConfig, {
          cwd: this.baseDir,
          defaultExportName: 'default',
          importFn: this.importFn,
        })
      : this.getDefaultFetch(timeout);
  }

  async getExecutorForHTTPSourceConfig(
    httpSourceConfig: YamlConfig.GraphQLHandlerHTTPConfiguration
  ): Promise<MeshSource['executor']> {
    const {
      endpoint,
      schemaHeaders: configHeaders,
      customFetch: customFetchConfig,
      operationHeaders,
      timeout,
    } = httpSourceConfig;
    const customFetch = await this.getCustomFetchImpl(customFetchConfig, timeout);
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
    const endpointFactory = getInterpolatedStringFactory(endpoint);
    const operationHeadersFactory = getInterpolatedHeadersFactory(operationHeaders);

    return async params => {
      const executor = await this.getExecutorForParams(
        params,
        operationHeadersFactory,
        endpointFactory,
        httpSourceConfig,
        customFetch
      );
      return executor(params);
    };
  }

  async getNonExecutableSchemaForHTTPSource(
    httpSourceConfig: YamlConfig.GraphQLHandlerHTTPConfiguration
  ): Promise<GraphQLSchema> {
    const endpointFactory = getInterpolatedStringFactory(httpSourceConfig.endpoint);
    const schemaHeadersFactory = getInterpolatedHeadersFactory(httpSourceConfig.schemaHeaders || {});
    return this.nonExecutableSchema.getWithSet(async () => {
      const customFetch = await this.getCustomFetchImpl(httpSourceConfig.customFetch, httpSourceConfig.timeout);
      if (httpSourceConfig.introspection) {
        const headers = schemaHeadersFactory({
          env,
        });
        const sdlOrIntrospection = await readFileOrUrl<string | IntrospectionQuery | DocumentNode>(
          httpSourceConfig.introspection,
          {
            cwd: this.baseDir,
            allowUnknownExtensions: true,
            fetch: customFetch,
            headers,
          }
        );
        if (typeof sdlOrIntrospection === 'string') {
          return buildSchema(sdlOrIntrospection);
        } else if (isDocumentNode(sdlOrIntrospection)) {
          return buildASTSchema(sdlOrIntrospection);
        } else {
          return buildClientSchema(sdlOrIntrospection);
        }
      } else {
        const introspectionExecutor = async (request: ExecutionRequest) => {
          const executor = await this.getExecutorForParams(
            request,
            schemaHeadersFactory,
            endpointFactory,
            httpSourceConfig,
            customFetch
          );
          return executor(request);
        };
        return introspectSchema(introspectionExecutor);
      }
    });
  }

  async getCodeFirstSource({
    schema: schemaConfig,
  }: YamlConfig.GraphQLHandlerCodeFirstConfiguration): Promise<MeshSource> {
    if (schemaConfig.endsWith('.graphql')) {
      const rawSDL = await readFileOrUrl<string>(schemaConfig, {
        cwd: this.baseDir,
        allowUnknownExtensions: true,
        importFn: this.importFn,
      });
      const schema = buildSchema(rawSDL);
      return {
        schema,
      };
    } else {
      // Loaders logic should be here somehow
      const schemaOrStringOrDocumentNode = await loadFromModuleExportExpression<GraphQLSchema | string | DocumentNode>(
        schemaConfig,
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
          `Provided file '${schemaConfig} exports an unknown type: ${inspect(
            schemaOrStringOrDocumentNode
          )}': expected GraphQLSchema, SDL or DocumentNode.`
        );
      }
      return {
        schema,
      };
    }
  }

  getRaceExecutor(executors: MeshSource['executor'][]): MeshSource['executor'] {
    return function raceExecutor(params: ExecutionRequest) {
      return Promise.race(executors.map(executor => executor(params)));
    };
  }

  getFallbackExecutor(executors: MeshSource['executor'][]): MeshSource['executor'] {
    return async function fallbackExecutor(params: ExecutionRequest) {
      let error: Error;
      for (const executor of executors) {
        try {
          return await executor(params);
        } catch (e) {
          error = e;
        }
      }
      throw error;
    };
  }

  async getMeshSource(): Promise<MeshSource> {
    if ('sources' in this.config) {
      if (this.config.strategy === 'race') {
        const schemaPromises: Promise<GraphQLSchema>[] = [];

        const executorPromises: Promise<MeshSource['executor']>[] = [];
        for (const httpSourceConfig of this.config.sources) {
          schemaPromises.push(this.getNonExecutableSchemaForHTTPSource(httpSourceConfig));
          executorPromises.push(this.getExecutorForHTTPSourceConfig(httpSourceConfig));
        }

        const [schema, ...executors] = await Promise.all([Promise.race(schemaPromises), ...executorPromises]);

        const executor = this.getRaceExecutor(executors);

        return {
          schema,
          executor,
        };
      } else {
        let schema: GraphQLSchema;
        const executors: MeshSource['executor'][] = [];
        let error: Error;
        for (const httpSourceConfig of this.config.sources) {
          executors.push(await this.getExecutorForHTTPSourceConfig(httpSourceConfig));
          if (schema == null) {
            try {
              schema = await this.getNonExecutableSchemaForHTTPSource(httpSourceConfig);
            } catch (e) {
              error = e;
            }
          }
        }
        if (schema == null) {
          throw error;
        }

        const executor = this.getFallbackExecutor(executors);

        return {
          schema,
          executor,
        };
      }
    } else if ('endpoint' in this.config) {
      const [schema, executor] = await Promise.all([
        this.getNonExecutableSchemaForHTTPSource(this.config),
        this.getExecutorForHTTPSourceConfig(this.config),
      ]);
      return {
        schema,
        executor,
      };
    } else if ('schema' in this.config) {
      return this.getCodeFirstSource(this.config);
    }
  }
}
