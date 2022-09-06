import { GraphQLSchema, getOperationAST, DocumentNode } from 'graphql';
import { ExecuteMeshFn, GetMeshOptions, SubscribeMeshFn } from './types';
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

import { CreateProxyingResolverFn, SubschemaConfig } from '@graphql-tools/delegate';
import { AggregateError, ExecutionResult, isAsyncIterable, mapAsyncIterator, memoize1 } from '@graphql-tools/utils';
import { enableIf, envelop, PluginOrDisabledPlugin, useExtendContext } from '@envelop/core';
import { OneOfInputObjectsRule, useExtendedValidation } from '@envelop/extended-validation';
import { getInContextSDK } from './in-context-sdk';
import { useSubschema } from './useSubschema';
import { process } from '@graphql-mesh/cross-helpers';
import { useIncludeHttpDetailsInExtensions } from './plugins/useIncludeHttpDetailsInExtensions';
import { useFetchache } from './plugins/useFetchache';
import { useDeduplicateRequest } from './plugins/useDeduplicateRequest';
import { fetch as defaultFetchFn } from '@whatwg-node/fetch';

export interface MeshInstance {
  execute: ExecuteMeshFn;
  subscribe: SubscribeMeshFn;
  schema: GraphQLSchema;
  rawSources: RawSourceOutput[];
  destroy(): void;
  pubsub: MeshPubSub;
  cache: KeyValueCache;
  logger: Logger;
  plugins: PluginOrDisabledPlugin[];
  getEnveloped: ReturnType<typeof envelop>;
  sdkRequesterFactory: (globalContext: any) => (document: DocumentNode, variables?: any, operationContext?: any) => any;
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
function createProxyingResolverFactory(apiName: string): CreateProxyingResolverFn {
  return function createProxyingResolver() {
    return function proxyingResolver(root, args, context, info) {
      return context[apiName][info.parentType.name][info.fieldName]({ root, args, context, info });
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

        rawSources.push({
          name: apiName,
          schema: apiSchema,
          executor: source.executor,
          transforms,
          contextVariables: source.contextVariables || {},
          handler: apiSource.handler,
          batch: 'batch' in source ? source.batch : true,
          merge: apiSource.merge,
          createProxyingResolver: createProxyingResolverFactory(apiName),
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
  unifiedSubschema.transforms.push(...transforms);

  let inContextSDK$: Promise<Record<string, any>>;

  const inContextSDKPlugin = useExtendContext(() => {
    if (!inContextSDK$) {
      const onDelegateHooks: OnDelegateHook<any>[] = [];
      for (const plugin of initialPluginList) {
        if (plugin?.onDelegate != null) {
          onDelegateHooks.push(plugin.onDelegate);
        }
      }
      inContextSDK$ = getInContextSDK(finalSchema, rawSources, logger, onDelegateHooks);
    }
    return inContextSDK$;
  });

  const { plugin: subschemaPlugin, transformedSchema: finalSchema } = useSubschema(unifiedSubschema);

  finalSchema.extensions = unifiedSubschema.schema.extensions;

  const getEnveloped = envelop({
    plugins: [
      subschemaPlugin,
      inContextSDKPlugin,
      enableIf(!!finalSchema.getDirective('oneOf'), () =>
        useExtendedValidation({
          rules: [OneOfInputObjectsRule],
        })
      ),
      ...initialPluginList,
    ],
  });

  const EMPTY_ROOT_VALUE: any = {};
  const EMPTY_CONTEXT_VALUE: any = {};
  const EMPTY_VARIABLES_VALUE: any = {};

  async function meshExecute<TVariables = any, TContext = any, TRootValue = any, TData = any>(
    documentOrSDL: GraphQLOperation<TData, TVariables>,
    variableValues: TVariables = EMPTY_VARIABLES_VALUE,
    contextValue: TContext = EMPTY_CONTEXT_VALUE,
    rootValue: TRootValue = EMPTY_ROOT_VALUE,
    operationName?: string
  ) {
    const { schema, execute, contextFactory, parse } = getEnveloped(contextValue);

    return execute({
      document: typeof documentOrSDL === 'string' ? parse(documentOrSDL) : documentOrSDL,
      contextValue: await contextFactory(),
      rootValue,
      variableValues: variableValues as any,
      schema,
      operationName,
    });
  }

  async function meshSubscribe<TVariables = any, TContext = any, TRootValue = any, TData = any>(
    documentOrSDL: GraphQLOperation<TData, TVariables>,
    variableValues: TVariables = EMPTY_VARIABLES_VALUE,
    contextValue: TContext = EMPTY_CONTEXT_VALUE,
    rootValue: TRootValue = EMPTY_ROOT_VALUE,
    operationName?: string
  ) {
    const { schema, subscribe, contextFactory, parse } = getEnveloped(contextValue);

    return subscribe({
      document: typeof documentOrSDL === 'string' ? parse(documentOrSDL) : documentOrSDL,
      contextValue: await contextFactory(),
      rootValue,
      variableValues: variableValues as any,
      schema,
      operationName,
    });
  }

  function sdkRequesterFactory(globalContext: any) {
    return async function meshSdkRequester(document: DocumentNode, variables: any, contextValue: any) {
      const executeFn = memoizedGetOperationType(document) === 'subscription' ? meshSubscribe : meshExecute;
      const result = await executeFn(document, variables, {
        ...globalContext,
        ...contextValue,
      });
      if (isAsyncIterable(result)) {
        return mapAsyncIterator(result, extractDataOrThrowErrors);
      }
      return extractDataOrThrowErrors(result);
    };
  }

  return {
    execute: meshExecute,
    subscribe: meshSubscribe,
    schema: finalSchema,
    rawSources,
    cache,
    pubsub,
    destroy() {
      return pubsub.publish('destroy', undefined);
    },
    logger,
    plugins: getEnveloped._plugins,
    getEnveloped,
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
