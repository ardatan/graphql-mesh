import type { DocumentNode, GraphQLObjectType, GraphQLSchema, OperationTypeNode } from 'graphql';
import { getOperationAST, specifiedRules, validate } from 'graphql';
import type { Plugin } from '@envelop/core';
import { envelop, useEngine, useExtendContext, useSchema } from '@envelop/core';
import { process } from '@graphql-mesh/cross-helpers';
import type {
  GraphQLOperation,
  KeyValueCache,
  Logger,
  MeshFetch,
  MeshPlugin,
  MeshPubSub,
  MeshTransform,
  OnDelegateHook,
  OnFetchHook,
  OnFetchHookPayload,
  RawSourceOutput,
} from '@graphql-mesh/types';
import {
  applySchemaTransforms,
  DefaultLogger,
  getHeadersObj,
  getInContextSDK,
  groupTransforms,
  makeDisposable,
  parseWithCache,
  PubSub,
  wrapFetchWithHooks,
} from '@graphql-mesh/utils';
import type { CreateProxyingResolverFn, SubschemaConfig } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import type { ExecutionResult } from '@graphql-tools/utils';
import {
  createGraphQLError,
  getRootTypeMap,
  isAsyncIterable,
  mapAsyncIterator,
  memoize1,
} from '@graphql-tools/utils';
import { wrapSchema } from '@graphql-tools/wrap';
import { fetch as defaultFetchFn } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { MESH_CONTEXT_SYMBOL } from './constants.js';
import type { ExecuteMeshFn, GetMeshOptions, MeshExecutor, SubscribeMeshFn } from './types.js';
import { getOriginalError } from './utils.js';

type SdkRequester = (document: DocumentNode, variables?: any, operationContext?: any) => any;

export interface MeshInstance extends Disposable {
  execute: ExecuteMeshFn;
  subscribe: SubscribeMeshFn;
  schema: GraphQLSchema;
  createExecutor(globalContext: any): MeshExecutor;
  rawSources: RawSourceOutput[];
  destroy(): void;
  pubsub: MeshPubSub;
  cache: KeyValueCache;
  logger: Logger;
  plugins: Plugin[];
  getEnveloped: ReturnType<typeof envelop>;
  sdkRequesterFactory(globalContext: any): SdkRequester;
}

const memoizedGetEnvelopedFactory = memoize1(function getEnvelopedFactory(
  plugins: MeshPlugin<any>[],
) {
  return envelop({
    plugins,
  });
});

export function wrapFetchWithPlugins(plugins: MeshPlugin<any>[]): MeshFetch {
  const onFetchHooks: OnFetchHook<any>[] = [];
  for (const plugin of plugins as MeshPlugin<any>[]) {
    if (plugin?.onFetch != null) {
      onFetchHooks.push(plugin.onFetch);
    }
  }
  return wrapFetchWithHooks(onFetchHooks);
}

// Use in-context-sdk for tracing
function createProxyingResolverFactory(
  apiName: string,
  rootTypeMap: Map<OperationTypeNode, GraphQLObjectType>,
): CreateProxyingResolverFn {
  return function createProxyingResolver({ operation }) {
    const rootType = rootTypeMap.get(operation);
    return function proxyingResolver(root, args, context, info) {
      if (!context?.[apiName]?.[rootType.name]?.[info.fieldName]) {
        throw new Error(
          `${info.fieldName} couldn't find in ${rootType.name} of ${apiName} as a ${operation}`,
        );
      }
      return context[apiName][rootType.name][info.fieldName]({ root, args, context, info });
    };
  };
}

export async function getMesh(options: GetMeshOptions): Promise<MeshInstance> {
  const rawSources: RawSourceOutput[] = [];
  const {
    pubsub = new PubSub(),
    cache,
    logger = new DefaultLogger(''),
    additionalEnvelopPlugins = [],
    sources,
    merger,
    additionalResolvers = [],
    additionalTypeDefs = [],
    transforms = [],
    fetchFn = defaultFetchFn,
  } = options;

  const getMeshLogger = logger.child('GetMesh');
  getMeshLogger.debug(`Getting subschemas from source handlers`);
  let failed = false;
  const initialPluginList: MeshPlugin<any>[] = [
    // TODO: Not a good practise to expect users to be a Yoga user
    useExtendContext(
      ({
        request,
        req,
        connectionParams,
      }: {
        request: Request;
        req?: { headers?: Record<string, string> };
        connectionParams?: Record<string, string>;
      }) => {
        // Maybe Node-like environment
        if (req?.headers) {
          return {
            headers: getHeadersObj(req.headers),
            connectionParams,
          };
        }
        // Fetch environment
        if (request?.headers) {
          return {
            headers: getHeadersObj(request.headers),
            connectionParams,
          };
        }
        return {};
      },
    ),
    useExtendContext(() => ({
      pubsub,
      cache,
      logger,
      fetch: wrappedFetchFn,
      [MESH_CONTEXT_SYMBOL]: true,
    })),
    {
      onFetch({ setFetchFn }: OnFetchHookPayload<any>) {
        setFetchFn(fetchFn);
      },
    },
    ...additionalEnvelopPlugins,
  ];
  const wrappedFetchFn: MeshFetch = wrapFetchWithPlugins(initialPluginList);
  await Promise.allSettled(
    sources.map(async (apiSource, index) => {
      const apiName = apiSource.name;
      const sourceLogger = logger.child({ source: apiName });
      sourceLogger.debug(`Generating the schema`);
      try {
        const source = await apiSource.handler.getMeshSource({
          fetchFn: wrappedFetchFn,
        });
        sourceLogger.debug(`The schema has been generated successfully`);

        let apiSchema = source.schema;

        sourceLogger.debug(`Analyzing transforms`);

        let transforms: MeshTransform[];

        const { wrapTransforms, noWrapTransforms } = groupTransforms(apiSource.transforms);

        if (!wrapTransforms?.length && noWrapTransforms?.length) {
          sourceLogger.debug(`${noWrapTransforms.length} bare transforms found and applying`);
          apiSchema = applySchemaTransforms(
            apiSchema,
            source as SubschemaConfig,
            null,
            noWrapTransforms,
          );
        } else {
          transforms = apiSource.transforms;
        }

        const rootTypeMap = getRootTypeMap(apiSchema);
        rawSources[index] = {
          name: apiName,
          schema: apiSchema,
          executor: source.executor,
          transforms,
          contextVariables: source.contextVariables || {},
          handler: apiSource.handler,
          batch: 'batch' in source ? source.batch : true,
          merge: source.merge,
          createProxyingResolver: createProxyingResolverFactory(apiName, rootTypeMap),
        };
      } catch (e: any) {
        sourceLogger.debug(e);
        sourceLogger.error(`Failed to generate the schema for the source\n ${e.message}`);
        failed = true;
      }
    }),
  );

  if (failed) {
    throw new Error(
      `Schemas couldn't be generated successfully. Check for the logs by running Mesh${
        process.env.DEBUG == null
          ? ' with DEBUG=1 environmental variable to get more verbose output'
          : ''
      }.`,
    );
  }

  getMeshLogger.debug(`Schemas have been generated by the source handlers`);

  getMeshLogger.debug(`Merging schemas using the defined merging strategy.`);
  const unifiedSubschema = await merger.getUnifiedSchema({
    rawSources,
    typeDefs: additionalTypeDefs,
    resolvers: additionalResolvers,
  });

  unifiedSubschema.transforms = unifiedSubschema.transforms || [];

  for (const rootLevelTransform of transforms) {
    if (rootLevelTransform.noWrap) {
      if (rootLevelTransform.transformSchema) {
        unifiedSubschema.schema = rootLevelTransform.transformSchema(
          unifiedSubschema.schema,
          unifiedSubschema,
        );
      }
    } else {
      unifiedSubschema.transforms.push(rootLevelTransform);
    }
  }

  let inContextSDK: Record<string, any>;

  let schema: GraphQLSchema = unifiedSubschema.schema;

  if (unifiedSubschema.executor != null || unifiedSubschema.transforms?.length) {
    schema = wrapSchema(unifiedSubschema);
  }

  const plugins = [
    useEngine({
      execute: normalizedExecutor,
      subscribe: normalizedExecutor,
      validate,
      parse: parseWithCache,
      specifiedRules,
    }),
    useSchema(schema),
    useExtendContext(() => {
      if (!inContextSDK) {
        const onDelegateHooks: OnDelegateHook<any>[] = [];
        for (const plugin of initialPluginList) {
          if (plugin?.onDelegate != null) {
            onDelegateHooks.push(plugin.onDelegate);
          }
        }
        inContextSDK = getInContextSDK(schema, rawSources, logger, onDelegateHooks);
      }
      return inContextSDK;
    }),
    {
      onExecute() {
        return {
          onExecuteDone({ result, setResult }) {
            if (result.errors) {
              // Print errors with stack trace in development
              if (process.env.NODE_ENV === 'production') {
                for (const error of result.errors) {
                  const origError = getOriginalError(error);
                  if (origError) {
                    logger.error(origError);
                  }
                }
              } else {
                setResult({
                  ...result,
                  errors: result.errors.map(error => {
                    const origError = getOriginalError(error);
                    if (origError) {
                      return createGraphQLError(error.message, {
                        ...error,
                        extensions: {
                          ...error.extensions,
                          originalError: {
                            name: origError.name,
                            message: origError.message,
                            stack: origError.stack,
                          },
                        },
                      });
                    }
                    return error;
                  }),
                });
              }
            }
          },
        };
      },
    },
    ...initialPluginList,
  ];

  const EMPTY_ROOT_VALUE: any = {};
  const EMPTY_CONTEXT_VALUE: any = {};
  const EMPTY_VARIABLES_VALUE: any = {};

  function createExecutor(globalContext: any = EMPTY_CONTEXT_VALUE): MeshExecutor {
    const getEnveloped = memoizedGetEnvelopedFactory(plugins);
    const { schema, parse, execute, subscribe, contextFactory } = getEnveloped(globalContext);
    return function meshExecutor<TVariables = any, TContext = any, TRootValue = any, TData = any>(
      documentOrSDL: GraphQLOperation<TData, TVariables>,
      variableValues: TVariables = EMPTY_VARIABLES_VALUE,
      contextValue: TContext = EMPTY_CONTEXT_VALUE,
      rootValue: TRootValue = EMPTY_ROOT_VALUE,
      operationName?: string,
    ) {
      const document = typeof documentOrSDL === 'string' ? parse(documentOrSDL) : documentOrSDL;
      const operationAST = getOperationAST(document, operationName);
      if (!operationAST) {
        throw new Error(`Cannot execute a request without a valid operation.`);
      }
      const isSubscription = operationAST.operation === 'subscription';
      const executeFn = isSubscription ? subscribe : execute;
      return handleMaybePromise(
        () => contextFactory(contextValue),
        contextValue =>
          executeFn({
            schema,
            document,
            contextValue,
            rootValue,
            variableValues,
            operationName,
          }),
      );
    };
  }

  function sdkRequesterFactory(globalContext: any): SdkRequester {
    const executor = createExecutor(globalContext);
    return function sdkRequester(...args) {
      return handleMaybePromise(
        () => executor(...args),
        function handleExecutorResultForSdk(result) {
          if (isAsyncIterable(result)) {
            return mapAsyncIterator(result, extractDataOrThrowErrors);
          }
          return extractDataOrThrowErrors(result);
        },
      );
    };
  }

  function meshDestroy() {
    return pubsub.publish('destroy', undefined);
  }

  return makeDisposable(
    {
      schema,
      rawSources,
      cache,
      pubsub,
      destroy: meshDestroy,
      logger,
      plugins,
      get getEnveloped() {
        return memoizedGetEnvelopedFactory(plugins);
      },
      createExecutor,
      get execute() {
        return createExecutor();
      },
      get subscribe() {
        return createExecutor();
      },
      sdkRequesterFactory,
    },
    meshDestroy,
  );
}

function extractDataOrThrowErrors<T>(result: ExecutionResult<T>): T {
  if (result.errors) {
    if (result.errors.length === 1) {
      throw result.errors[0];
    }
    throw new AggregateError(result.errors);
  }
  return result.data;
}
