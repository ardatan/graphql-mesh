import {
  DocumentNode,
  getOperationAST,
  GraphQLObjectType,
  GraphQLSchema,
  OperationTypeNode,
  specifiedRules,
  validate,
} from 'graphql';
import { envelop, Plugin, useEngine, useExtendContext } from '@envelop/core';
import { OneOfInputObjectsRule, useExtendedValidation } from '@envelop/extended-validation';
import { process } from '@graphql-mesh/cross-helpers';
import {
  GraphQLOperation,
  KeyValueCache,
  Logger,
  MeshFetch,
  MeshPlugin,
  MeshPubSub,
  MeshTransform,
  OnDelegateHook,
  OnFetchHook,
  OnFetchHookDone,
  OnFetchHookPayload,
  RawSourceOutput,
} from '@graphql-mesh/types';
import {
  applySchemaTransforms,
  DefaultLogger,
  getHeadersObj,
  groupTransforms,
  parseWithCache,
  PubSub,
} from '@graphql-mesh/utils';
import { CreateProxyingResolverFn, Subschema, SubschemaConfig } from '@graphql-tools/delegate';
import {
  ExecutionResult,
  getRootTypeMap,
  inspect,
  isAsyncIterable,
  isPromise,
  mapAsyncIterator,
  memoize1,
} from '@graphql-tools/utils';
import { fetch as defaultFetchFn } from '@whatwg-node/fetch';
import { MESH_CONTEXT_SYMBOL } from './constants.js';
import { getInContextSDK } from './in-context-sdk.js';
import { ExecuteMeshFn, GetMeshOptions, MeshExecutor, SubscribeMeshFn } from './types.js';
import { useSubschema } from './useSubschema.js';
import { iterateAsync } from './utils.js';

type SdkRequester = (document: DocumentNode, variables?: any, operationContext?: any) => any;

export interface MeshInstance {
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

const memoizedGetOperationType = memoize1((document: DocumentNode) => {
  const operationAST = getOperationAST(document, undefined);
  if (!operationAST) {
    throw new Error('Must provide document with a valid operation');
  }
  return operationAST.operation;
});

export function wrapFetchWithPlugins(plugins: MeshPlugin<any>[]): MeshFetch {
  const onFetchHooks: OnFetchHook<any>[] = [];
  for (const plugin of plugins as MeshPlugin<any>[]) {
    if (plugin?.onFetch != null) {
      onFetchHooks.push(plugin.onFetch);
    }
  }
  return function wrappedFetchFn(url, options, context, info) {
    if (url != null && typeof url !== 'string') {
      throw new TypeError(`First parameter(url) of 'fetch' must be a string, got ${inspect(url)}`);
    }
    if (options != null && typeof options !== 'object') {
      throw new TypeError(
        `Second parameter(options) of 'fetch' must be an object, got ${inspect(options)}`,
      );
    }
    if (context != null && typeof context !== 'object') {
      throw new TypeError(
        `Third parameter(context) of 'fetch' must be an object, got ${inspect(context)}`,
      );
    }
    if (info != null && typeof info !== 'object') {
      throw new TypeError(
        `Fourth parameter(info) of 'fetch' must be an object, got ${inspect(info)}`,
      );
    }
    let fetchFn: MeshFetch;
    const doneHooks: OnFetchHookDone[] = [];
    function setFetchFn(newFetchFn: MeshFetch) {
      fetchFn = newFetchFn;
    }
    const result$ = iterateAsync(
      onFetchHooks,
      onFetch =>
        onFetch({
          fetchFn,
          setFetchFn,
          url,
          options,
          context,
          info,
        }),
      doneHooks,
    );
    function handleIterationResult() {
      const response$ = fetchFn(url, options, context, info);
      if (doneHooks.length === 0) {
        return response$;
      }
      if (isPromise(response$)) {
        return response$.then(response => handleOnFetchDone(response, doneHooks));
      }
      return handleOnFetchDone(response$, doneHooks);
    }
    if (isPromise(result$)) {
      return result$.then(handleIterationResult);
    }
    return handleIterationResult();
  } as MeshFetch;
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
    logger = new DefaultLogger('🕸️  Mesh'),
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
      [MESH_CONTEXT_SYMBOL]: true,
    })),
    {
      onFetch({ setFetchFn }: OnFetchHookPayload<any>) {
        setFetchFn(fetchFn);
      },
    },
    ...(additionalEnvelopPlugins as MeshPlugin<any>[]),
  ];
  const wrappedFetchFn: MeshFetch = wrapFetchWithPlugins(initialPluginList);
  await Promise.allSettled(
    sources.map(async apiSource => {
      const apiName = apiSource.name;
      const sourceLogger = logger.child(apiName);
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
        rawSources.push({
          name: apiName,
          schema: apiSchema,
          executor: source.executor,
          transforms,
          contextVariables: source.contextVariables || {},
          handler: apiSource.handler,
          batch: 'batch' in source ? source.batch : true,
          merge: source.merge,
          createProxyingResolver: createProxyingResolverFactory(apiName, rootTypeMap),
        });
      } catch (e: any) {
        sourceLogger.error(`Failed to generate the schema`, e);
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

  const subschema = new Subschema(unifiedSubschema);

  const plugins = [
    useEngine({
      validate,
      parse: parseWithCache,
      specifiedRules,
    }),
    useSubschema(subschema),
    useExtendContext(() => {
      if (!inContextSDK) {
        const onDelegateHooks: OnDelegateHook<any>[] = [];
        for (const plugin of initialPluginList) {
          if (plugin?.onDelegate != null) {
            onDelegateHooks.push(plugin.onDelegate);
          }
        }
        inContextSDK = getInContextSDK(
          subschema.transformedSchema,
          rawSources,
          logger,
          onDelegateHooks,
        );
      }
      return inContextSDK;
    }),
    useExtendedValidation({
      rules: [OneOfInputObjectsRule],
    }),
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
      const executeFn = memoizedGetOperationType(document) === 'subscription' ? subscribe : execute;
      const contextValue$ = contextFactory(contextValue);
      if (isPromise(contextValue$)) {
        return contextValue$.then(contextValue =>
          executeFn({
            schema,
            document,
            contextValue,
            rootValue,
            variableValues: variableValues as any,
            operationName,
          }),
        );
      }
      return executeFn({
        schema,
        document,
        contextValue: contextValue$,
        rootValue,
        variableValues: variableValues as any,
        operationName,
      });
    } as MeshExecutor;
  }

  function sdkRequesterFactory(globalContext: any): SdkRequester {
    const executor = createExecutor(globalContext);
    return function sdkRequester(...args) {
      const result$ = executor(...args);
      if (isPromise(result$)) {
        return result$.then(handleExecutorResultForSdk);
      }
      return handleExecutorResultForSdk(result$);
    };
  }

  function meshDestroy() {
    return pubsub.publish('destroy', undefined);
  }

  return {
    get schema() {
      return subschema.transformedSchema;
    },
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
  };
}

function handleExecutorResultForSdk(result: Awaited<ReturnType<MeshExecutor>>) {
  if (isAsyncIterable(result)) {
    return mapAsyncIterator(result as AsyncIterableIterator<any>, extractDataOrThrowErrors);
  }
  return extractDataOrThrowErrors(result);
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

function handleOnFetchDone(response: Response, onFetchDoneHooks: OnFetchHookDone[]) {
  function setResponse(newResponse: Response) {
    response = newResponse;
  }
  const result$ = iterateAsync(onFetchDoneHooks, onFetchDone =>
    onFetchDone({
      response,
      setResponse,
    }),
  );
  if (isPromise(result$)) {
    return result$.then(() => response);
  }
  return response;
}
