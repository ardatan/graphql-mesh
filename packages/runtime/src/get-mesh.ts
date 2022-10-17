import {
  GraphQLSchema,
  getOperationAST,
  DocumentNode,
  GraphQLObjectType,
  OperationTypeNode,
  validate,
  specifiedRules,
} from 'graphql';
import { ExecuteMeshFn, GetMeshOptions, MeshExecutor, SubscribeMeshFn } from './types';
import {
  MeshPubSub,
  KeyValueCache,
  RawSourceOutput,
  GraphQLOperation,
  Logger,
  MeshTransform,
  OnFetchHookPayload,
  MeshFetch,
  MeshPlugin,
  OnFetchHookDone,
  OnDelegateHook,
} from '@graphql-mesh/types';

import { MESH_CONTEXT_SYMBOL } from './constants';
import {
  applySchemaTransforms,
  groupTransforms,
  DefaultLogger,
  parseWithCache,
  PubSub,
  getHeadersObj,
} from '@graphql-mesh/utils';

import { CreateProxyingResolverFn, Subschema, SubschemaConfig } from '@graphql-tools/delegate';
import {
  AggregateError,
  ExecutionResult,
  getRootTypeMap,
  isAsyncIterable,
  mapAsyncIterator,
  memoize1,
} from '@graphql-tools/utils';
import { envelop, Plugin, useEngine, useExtendContext } from '@envelop/core';
import { OneOfInputObjectsRule, useExtendedValidation } from '@envelop/extended-validation';
import { getInContextSDK } from './in-context-sdk';
import { useSubschema } from './useSubschema';
import { process } from '@graphql-mesh/cross-helpers';
import { useIncludeHttpDetailsInExtensions } from './plugins/useIncludeHttpDetailsInExtensions';
import { useFetchache } from './plugins/useFetchache';
import { useDeduplicateRequest } from './plugins/useDeduplicateRequest';
import { fetch as defaultFetchFn } from '@whatwg-node/fetch';

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

const memoizedGetOperationType = memoize1((document: DocumentNode) => {
  const operationAST = getOperationAST(document, undefined);
  if (!operationAST) {
    throw new Error('Must provide document with a valid operation');
  }
  return operationAST.operation;
});

export function wrapFetchWithPlugins(plugins: MeshPlugin<any>[]): MeshFetch {
  return async function wrappedFetchFn(url, options, context, info) {
    let fetchFn: MeshFetch;
    const doneHooks: OnFetchHookDone[] = [];
    for (const plugin of plugins as MeshPlugin<any>[]) {
      if (plugin?.onFetch != null) {
        const doneHook = await plugin.onFetch({
          fetchFn,
          setFetchFn(newFetchFn) {
            fetchFn = newFetchFn;
          },
          url,
          options,
          context,
          info,
        });
        if (doneHook) {
          doneHooks.push(doneHook);
        }
      }
    }
    let response = await fetchFn(url, options, context, info);
    for (const doneHook of doneHooks) {
      await doneHook({
        response,
        setResponse(newResponse) {
          response = newResponse;
        },
      });
    }
    return response;
  };
}

// Use in-context-sdk for tracing
function createProxyingResolverFactory(
  apiName: string,
  rootTypeMap: Map<OperationTypeNode, GraphQLObjectType>
): CreateProxyingResolverFn {
  return function createProxyingResolver({ operation }) {
    const rootType = rootTypeMap.get(operation);
    return function proxyingResolver(root, args, context, info) {
      if (!context[apiName][rootType.name][info.fieldName]) {
        throw new Error(`${info.fieldName} couldn't find in ${rootType.name} of ${apiName} as a ${operation}`);
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
    includeHttpDetailsInExtensions = process?.env?.DEBUG === '1' || process?.env?.DEBUG?.includes('http'),
    fetchFn = defaultFetchFn,
  } = options;

  const getMeshLogger = logger.child('GetMesh');
  getMeshLogger.debug(`Getting subschemas from source handlers`);
  let failed = false;
  const initialPluginList: MeshPlugin<any>[] = [
    // TODO: Not a good practise to expect users to be a Yoga user
    useExtendContext(({ request, req }: { request: Request; req?: { headers?: Record<string, string> } }) => {
      // Maybe Node-like environment
      if (req?.headers) {
        return {
          headers: req.headers,
        };
      }
      // Fetch environment
      if (request?.headers) {
        return {
          headers: getHeadersObj(request.headers),
        };
      }
      return {};
    }),
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
    useFetchache(cache),
    useDeduplicateRequest(),
    includeHttpDetailsInExtensions ? useIncludeHttpDetailsInExtensions() : {},
    {
      onParse({ setParseFn }) {
        setParseFn(parseWithCache);
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
          apiSchema = applySchemaTransforms(apiSchema, source as SubschemaConfig, null, noWrapTransforms);
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
    })
  );

  if (failed) {
    throw new Error(
      `Schemas couldn't be generated successfully. Check for the logs by running Mesh with DEBUG=1 environmental variable to get more verbose output.`
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
        unifiedSubschema.schema = rootLevelTransform.transformSchema(unifiedSubschema.schema, unifiedSubschema);
      }
    } else {
      unifiedSubschema.transforms.push(rootLevelTransform);
    }
  }

  let inContextSDK$: Promise<Record<string, any>>;

  const subschema = new Subschema(unifiedSubschema);

  const getEnveloped = envelop({
    plugins: [
      useEngine({
        validate,
        specifiedRules,
      }),
      useSubschema(subschema),
      useExtendContext(() => {
        if (!inContextSDK$) {
          const onDelegateHooks: OnDelegateHook<any>[] = [];
          for (const plugin of initialPluginList) {
            if (plugin?.onDelegate != null) {
              onDelegateHooks.push(plugin.onDelegate);
            }
          }
          inContextSDK$ = getInContextSDK(subschema.transformedSchema, rawSources, logger, onDelegateHooks);
        }
        return inContextSDK$;
      }),
      useExtendedValidation({
        rules: [OneOfInputObjectsRule],
      }),
      ...initialPluginList,
    ],
  });

  const EMPTY_ROOT_VALUE: any = {};
  const EMPTY_CONTEXT_VALUE: any = {};
  const EMPTY_VARIABLES_VALUE: any = {};

  function createExecutor(globalContext: any = EMPTY_CONTEXT_VALUE): MeshExecutor {
    const { schema, parse, execute, subscribe, contextFactory } = getEnveloped(globalContext);
    return async function meshExecutor<TVariables = any, TContext = any, TRootValue = any, TData = any>(
      documentOrSDL: GraphQLOperation<TData, TVariables>,
      variableValues: TVariables = EMPTY_VARIABLES_VALUE,
      contextValue: TContext = EMPTY_CONTEXT_VALUE,
      rootValue: TRootValue = EMPTY_ROOT_VALUE,
      operationName?: string
    ) {
      const document = typeof documentOrSDL === 'string' ? parse(documentOrSDL) : documentOrSDL;
      const executeFn = memoizedGetOperationType(document) === 'subscription' ? subscribe : execute;
      return executeFn({
        schema,
        document,
        contextValue: await contextFactory(contextValue),
        rootValue,
        variableValues: variableValues as any,
        operationName,
      });
    } as MeshExecutor;
  }

  function sdkRequesterFactory(globalContext: any): SdkRequester {
    const executor = createExecutor(globalContext);
    return async function sdkRequester(...args) {
      const result = await executor(...args);
      if (isAsyncIterable(result)) {
        return mapAsyncIterator(result as AsyncIterableIterator<any>, extractDataOrThrowErrors);
      }
      return extractDataOrThrowErrors(result);
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
    get plugins() {
      return getEnveloped._plugins;
    },
    getEnveloped,
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

function extractDataOrThrowErrors<T>(result: ExecutionResult<T>): T {
  if (result.errors) {
    if (result.errors.length === 1) {
      throw result.errors[0];
    }
    throw new AggregateError(result.errors);
  }
  return result.data;
}
