import type {
  DocumentNode,
  ExecutionResult,
  GraphQLResolveInfo,
  IntrospectionQuery,
  SelectionNode,
} from 'graphql';
import {
  buildASTSchema,
  buildClientSchema,
  buildSchema,
  getIntrospectionQuery,
  GraphQLSchema,
  Kind,
  parse,
  print,
  visit,
} from 'graphql';
import lodashGet from 'lodash.get';
import { process, util } from '@graphql-mesh/cross-helpers';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions, ValidationError } from '@graphql-mesh/store';
import {
  getInterpolatedHeadersFactory,
  getInterpolatedStringFactory,
  parseInterpolationStrings,
  stringInterpolator,
} from '@graphql-mesh/string-interpolation';
import type {
  GetMeshSourcePayload,
  ImportFn,
  Logger,
  MeshFetch,
  MeshHandler,
  MeshHandlerOptions,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import {
  isUrl,
  loadFromModuleExportExpression,
  parseWithCache,
  readFile,
  readFileOrUrl,
  readUrl,
} from '@graphql-mesh/utils';
import type { SubscriptionProtocol } from '@graphql-tools/url-loader';
import { UrlLoader } from '@graphql-tools/url-loader';
import type { ExecutionRequest, Executor } from '@graphql-tools/utils';
import {
  getDocumentNodeFromSchema,
  getOperationASTFromRequest,
  isAsyncIterable,
  isDocumentNode,
  memoize1,
  parseSelectionSet,
} from '@graphql-tools/utils';
import { getSubschemaForFederationWithTypeDefs, SubgraphSDLQuery } from './utils.js';

const getResolverData = memoize1(function getResolverData(params: ExecutionRequest) {
  return {
    root: params.rootValue,
    args: params.variables,
    context: params.context,
    env: process.env,
  };
});

export default class GraphQLHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.Handler['graphql'];
  private baseDir: string;
  private nonExecutableSchema: StoreProxy<GraphQLSchema>;
  private importFn: ImportFn;
  private fetchFn: MeshFetch;
  private logger: Logger;
  private urlLoader = new UrlLoader();

  constructor({
    name,
    config,
    baseDir,
    store,
    importFn,
    logger,
  }: MeshHandlerOptions<YamlConfig.Handler['graphql']>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.nonExecutableSchema = store.proxy(
      'introspectionSchema',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
    this.importFn = importFn;
    this.logger = logger;
  }

  private interpolationStringSet = new Set<string>();

  private getArgsAndContextVariables() {
    return parseInterpolationStrings(this.interpolationStringSet);
  }

  private wrapExecutorToPassSourceNameAndDebug(executor: Executor) {
    const sourceName = this.name;
    const logger = this.logger;
    return function executorWithSourceName(executionRequest: ExecutionRequest) {
      logger.debug(() => `Sending GraphQL Request: `, print(executionRequest.document));
      executionRequest.info = executionRequest.info || ({} as GraphQLResolveInfo);
      (executionRequest.info as any).sourceName = sourceName;
      return executor(executionRequest);
    };
  }

  async getExecutorForHTTPSourceConfig(
    httpSourceConfig: YamlConfig.GraphQLHandlerHTTPConfiguration,
  ): Promise<MeshSource['executor']> {
    const { endpoint, operationHeaders = {}, connectionParams = {} } = httpSourceConfig;

    this.interpolationStringSet.add(endpoint);
    Object.keys(operationHeaders).forEach(headerName => {
      this.interpolationStringSet.add(headerName.toString());
    });

    const endpointFactory = getInterpolatedStringFactory(endpoint);
    const operationHeadersFactory = getInterpolatedHeadersFactory(operationHeaders);

    const subscriptionsEndpoint = httpSourceConfig.subscriptionsEndpoint
      ? stringInterpolator.parse(httpSourceConfig.subscriptionsEndpoint, { env: process.env })
      : undefined;
    const connectionParamsFactory = getInterpolatedHeadersFactory(connectionParams);
    const executor = this.urlLoader.getExecutorAsync(endpoint, {
      ...httpSourceConfig,
      subscriptionsEndpoint,
      subscriptionsProtocol: httpSourceConfig.subscriptionsProtocol as SubscriptionProtocol,
      customFetch: this.fetchFn,
    });

    return function meshExecutor(params) {
      const resolverData = getResolverData(params);
      return executor({
        ...params,
        extensions: {
          ...params.extensions,
          headers: operationHeadersFactory(resolverData),
          connectionParams: connectionParamsFactory(resolverData),
          endpoint: endpointFactory(resolverData),
        },
      });
    };
  }

  private getSchemaFromContent(sdlOrIntrospection: string | IntrospectionQuery | DocumentNode) {
    if (typeof sdlOrIntrospection === 'string') {
      if (sdlOrIntrospection.includes('@key')) {
        sdlOrIntrospection = sdlOrIntrospection.replace(/extend type (\w+)/g, 'type $1 @extends');
      }
      return buildSchema(sdlOrIntrospection, {
        assumeValid: true,
        assumeValidSDL: true,
      });
    } else if (isDocumentNode(sdlOrIntrospection)) {
      return buildASTSchema(sdlOrIntrospection, {
        assumeValid: true,
        assumeValidSDL: true,
      });
    } else if (sdlOrIntrospection.__schema) {
      return buildClientSchema(sdlOrIntrospection, {
        assumeValid: true,
      });
    }
    throw new Error(`Invalid introspection data: ${util.inspect(sdlOrIntrospection)}`);
  }

  async getNonExecutableSchemaForHTTPSource(
    httpSourceConfig: YamlConfig.GraphQLHandlerHTTPConfiguration,
  ): Promise<GraphQLSchema> {
    this.interpolationStringSet.add(httpSourceConfig.endpoint);
    Object.keys(httpSourceConfig.schemaHeaders || {}).forEach(headerName => {
      this.interpolationStringSet.add(headerName.toString());
    });

    const schemaHeadersFactory = getInterpolatedHeadersFactory(
      httpSourceConfig.schemaHeaders || {},
    );
    const interpolatedSourcePath =
      httpSourceConfig.source &&
      stringInterpolator.parse(httpSourceConfig.source, {
        env: process.env,
      });
    if (interpolatedSourcePath) {
      const opts = {
        cwd: this.baseDir,
        allowUnknownExtensions: true,
        importFn: this.importFn,
        fetch: this.fetchFn,
        logger: this.logger,
      };
      if (!isUrl(interpolatedSourcePath)) {
        return this.nonExecutableSchema.getWithSet(async () => {
          const sdlOrIntrospection = await readFile<string | IntrospectionQuery | DocumentNode>(
            interpolatedSourcePath,
            opts,
          );
          return this.getSchemaFromContent(sdlOrIntrospection);
        });
      }
      const headers = schemaHeadersFactory({
        env: process.env,
      });
      const sdlOrIntrospection = await readUrl<string | IntrospectionQuery | DocumentNode>(
        interpolatedSourcePath,
        {
          ...opts,
          headers,
        },
      );
      return this.getSchemaFromContent(sdlOrIntrospection);
    }
    return this.nonExecutableSchema.getWithSet(async () => {
      const endpointFactory = getInterpolatedStringFactory(httpSourceConfig.endpoint);
      const executor = this.urlLoader.getExecutorAsync(httpSourceConfig.endpoint, {
        ...httpSourceConfig,
        customFetch: this.fetchFn,
        subscriptionsProtocol: httpSourceConfig.subscriptionsProtocol as SubscriptionProtocol,
      });
      function meshIntrospectionExecutor(params: ExecutionRequest) {
        const resolverData = getResolverData(params);
        return executor({
          ...params,
          extensions: {
            ...params.extensions,
            headers: schemaHeadersFactory(resolverData),
            endpoint: endpointFactory(resolverData),
          },
        });
      }
      const introspection = (await meshIntrospectionExecutor({
        document: parseWithCache(getIntrospectionQuery()),
      })) as ExecutionResult<IntrospectionQuery>;
      if (introspection.data.__schema.types.find(t => t.name === '_Service')) {
        const sdl = (await meshIntrospectionExecutor({
          document: parseWithCache(SubgraphSDLQuery),
        })) as ExecutionResult<{ _service: { sdl: string } }>;
        const schema = buildSchema(
          sdl.data._service.sdl.replace(/extend type (\w+)/g, 'type $1 @extends'),
          {
            assumeValid: true,
            assumeValidSDL: true,
          },
        );
        return schema;
      }
      return buildClientSchema(introspection.data, {
        assumeValid: true,
      });
    });
  }

  async getCodeFirstSource({
    source: schemaConfig,
  }: YamlConfig.GraphQLHandlerCodeFirstConfiguration): Promise<MeshSource> {
    if (schemaConfig.endsWith('.graphql')) {
      const rawSDL = await readFileOrUrl<string>(schemaConfig, {
        cwd: this.baseDir,
        allowUnknownExtensions: true,
        importFn: this.importFn,
        fetch: this.fetchFn,
        logger: this.logger,
      });
      const schema = buildSchema(rawSDL, {
        assumeValid: true,
        assumeValidSDL: true,
      });
      const { contextVariables } = this.getArgsAndContextVariables();
      return {
        schema,
        contextVariables,
      };
    } else {
      // Loaders logic should be here somehow
      const schemaOrStringOrDocumentNode = await loadFromModuleExportExpression<
        GraphQLSchema | string | DocumentNode
      >(schemaConfig, { cwd: this.baseDir, defaultExportName: 'schema', importFn: this.importFn });
      let schema: GraphQLSchema;
      if (schemaOrStringOrDocumentNode instanceof GraphQLSchema) {
        schema = schemaOrStringOrDocumentNode;
      } else if (typeof schemaOrStringOrDocumentNode === 'string') {
        schema = buildSchema(schemaOrStringOrDocumentNode, {
          assumeValid: true,
          assumeValidSDL: true,
        });
      } else if (
        typeof schemaOrStringOrDocumentNode === 'object' &&
        schemaOrStringOrDocumentNode?.kind === Kind.DOCUMENT
      ) {
        schema = buildASTSchema(schemaOrStringOrDocumentNode, {
          assumeValid: true,
          assumeValidSDL: true,
        });
      } else {
        throw new Error(
          `Provided file '${schemaConfig} exports an unknown type: ${util.inspect(
            schemaOrStringOrDocumentNode,
          )}': expected GraphQLSchema, SDL or DocumentNode.`,
        );
      }
      const { contextVariables } = this.getArgsAndContextVariables();
      return {
        schema,
        contextVariables,
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
      let response: ExecutionResult<any>;
      for (const executor of executors) {
        try {
          const executorResponse = await executor(params);
          if ('errors' in executorResponse && executorResponse.errors?.length) {
            response = executorResponse;
            continue;
          } else {
            return executorResponse;
          }
        } catch (e) {
          error = e;
        }
      }
      if (response != null) {
        return response;
      }
      throw error;
    };
  }

  async getMeshSource(payload: GetMeshSourcePayload): Promise<MeshSource> {
    const meshSource = await this.getMeshSourceWithoutFederation(payload);
    if (meshSource.schema.getDirective('key') != null) {
      const typeDefs = visit(getDocumentNodeFromSchema(meshSource.schema), {
        ObjectTypeDefinition(node) {
          if (node.directives?.find(d => d.name.value === 'extends')) {
            return {
              ...node,
              directives: node.directives.filter(d => d.name.value !== 'extends'),
              kind: Kind.OBJECT_TYPE_EXTENSION,
            };
          }
          return node;
        },
      });
      const extraConfig = getSubschemaForFederationWithTypeDefs(typeDefs);
      return {
        ...meshSource,
        ...extraConfig,
        batch: true,
      };
    }
    return meshSource;
  }

  async getMeshSourceWithoutFederation({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    this.fetchFn = fetchFn;
    if ('sources' in this.config) {
      if (this.config.strategy === 'race') {
        const schemaPromises: Promise<GraphQLSchema>[] = [];

        const executorPromises: Promise<MeshSource['executor']>[] = [];
        let batch = true;
        for (const httpSourceConfig of this.config.sources) {
          if (httpSourceConfig.batch === false) {
            batch = false;
          }
          schemaPromises.push(this.getNonExecutableSchemaForHTTPSource(httpSourceConfig));
          executorPromises.push(this.getExecutorForHTTPSourceConfig(httpSourceConfig));
        }

        const [schema, ...executors] = await Promise.all([
          Promise.race(schemaPromises),
          ...executorPromises,
        ]);

        const executor = this.getRaceExecutor(executors);

        const { contextVariables } = this.getArgsAndContextVariables();

        return {
          schema,
          executor,
          batch,
          contextVariables,
        };
      } else if (this.config.strategy === 'highestValue') {
        if (this.config.strategyConfig == null) {
          throw new Error(`You must configure 'highestValue' strategy`);
        }
        let schema: GraphQLSchema;
        const executorPromises: Promise<MeshSource['executor']>[] = [];
        let error: Error;
        for (const httpSourceConfig of this.config.sources) {
          executorPromises.push(this.getExecutorForHTTPSourceConfig(httpSourceConfig));
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

        const executors = await Promise.all(executorPromises);
        const parsedSelectionSet = parseSelectionSet(this.config.strategyConfig.selectionSet);
        const valuePath = this.config.strategyConfig.value;
        const highestValueExecutor = async function highestValueExecutor(
          executionRequest: ExecutionRequest,
        ) {
          const operationAST = getOperationASTFromRequest(executionRequest);
          (operationAST.selectionSet.selections as SelectionNode[]).push(
            ...parsedSelectionSet.selections,
          );
          const results = await Promise.all(executors.map(executor => executor(executionRequest)));
          let highestValue = -Infinity;
          let resultWithHighestResult = results[0];
          for (const result of results) {
            if (isAsyncIterable(result)) {
              console.warn('Incremental delivery is not supported currently');
              return result;
            } else if (result.data != null) {
              const currentValue = lodashGet(result.data, valuePath);
              if (currentValue > highestValue) {
                resultWithHighestResult = result;
                highestValue = currentValue;
              }
            }
          }
          return resultWithHighestResult;
        };

        const { contextVariables } = this.getArgsAndContextVariables();

        return {
          schema,
          executor: this.wrapExecutorToPassSourceNameAndDebug(highestValueExecutor),
          // Batching doesn't make sense with fallback strategy
          batch: false,
          contextVariables,
        };
      } else {
        let schema: GraphQLSchema;
        const executorPromises: Promise<MeshSource['executor']>[] = [];
        let error: Error;
        for (const httpSourceConfig of this.config.sources) {
          executorPromises.push(this.getExecutorForHTTPSourceConfig(httpSourceConfig));
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

        const executors = await Promise.all(executorPromises);
        const executor = this.getFallbackExecutor(executors);

        const { contextVariables } = this.getArgsAndContextVariables();

        return {
          schema,
          executor,
          // Batching doesn't make sense with fallback strategy
          batch: false,
          contextVariables,
        };
      }
    } else if ('endpoint' in this.config) {
      const [schemaResult, executorResult] = await Promise.allSettled([
        this.getNonExecutableSchemaForHTTPSource(this.config),
        this.getExecutorForHTTPSourceConfig(this.config),
      ]);
      if (schemaResult.status === 'rejected') {
        if (schemaResult.reason instanceof ValidationError) {
          throw schemaResult.reason;
        }
        throw new Error(
          `Failed to fetch introspection from ${this.config.endpoint}: ${util.inspect(
            schemaResult.reason,
          )}`,
        );
      }
      if (executorResult.status === 'rejected') {
        throw new Error(
          `Failed to create executor for ${this.config.endpoint}: ${util.inspect(
            executorResult.reason,
          )}`,
        );
      }
      const { contextVariables } = this.getArgsAndContextVariables();

      return {
        schema: schemaResult.value,
        executor: this.wrapExecutorToPassSourceNameAndDebug(executorResult.value),
        batch: this.config.batch != null ? this.config.batch : true,
        contextVariables,
      };
    } else if ('source' in this.config) {
      return this.getCodeFirstSource(this.config);
    }

    throw new Error(`Unexpected config: ${util.inspect(this.config)}`);
  }
}
