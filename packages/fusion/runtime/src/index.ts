import {
  buildASTSchema,
  buildSchema,
  DocumentNode,
  execute,
  ExecutionResult,
  GraphQLSchema,
  introspectionFromSchema,
  isSchema,
  valueFromASTUntyped,
} from 'graphql';
import type { Plugin, YogaServer } from 'graphql-yoga';
import {
  createExecutablePlanForOperation,
  ExecutableOperationPlan,
  executeOperationPlan,
  extractSubgraphFromFusiongraph,
} from '@graphql-mesh/fusion-execution';
// eslint-disable-next-line import/no-extraneous-dependencies
import { getInContextSDK } from '@graphql-mesh/runtime';
import {
  Transport,
  TransportBaseContext,
  TransportEntry,
  TransportExecutorFactoryFn,
  TransportExecutorFactoryOpts,
} from '@graphql-mesh/transport-common';
// eslint-disable-next-line import/no-extraneous-dependencies
import { iterateAsync } from '@graphql-mesh/utils';
import { stitchSchemas } from '@graphql-tools/stitch';
import {
  ExecutionRequest,
  Executor,
  getDirective,
  IResolvers,
  isAsyncIterable,
  isPromise,
  mapAsyncIterator,
  memoize2of4,
} from '@graphql-tools/utils';

export { Transport, TransportEntry, TransportExecutorFactoryFn, TransportExecutorFactoryOpts };

function getTransportDirectives(fusiongraph: GraphQLSchema) {
  const transportDirectives = getDirective(fusiongraph, fusiongraph, 'transport');
  if (transportDirectives?.length) {
    return transportDirectives;
  }
  const astNode = fusiongraph.astNode;
  if (astNode?.directives?.length) {
    return astNode.directives
      .filter(directive => directive.name.value === 'transport')
      .map(transportDirective =>
        Object.fromEntries(
          transportDirective.arguments?.map(argument => [
            argument.name.value,
            valueFromASTUntyped(argument.value),
          ]),
        ),
      );
  }
  return [];
}

export function getSubgraphTransportMapFromFusiongraph(fusiongraph: GraphQLSchema) {
  const subgraphTransportEntryMap: Record<string, TransportEntry> = {};
  const transportDirectives = getTransportDirectives(fusiongraph);
  for (const { kind, subgraph, location, headers, ...options } of transportDirectives) {
    subgraphTransportEntryMap[subgraph] = {
      kind,
      location,
      headers,
      options,
      subgraph,
    };
  }
  return subgraphTransportEntryMap;
}

export const getMemoizedExecutionPlanForOperation = memoize2of4(
  function getMemoizedExecutionPlanForOperation(
    fusiongraph: GraphQLSchema,
    document: DocumentNode,
    operationName?: string,
    _random?: number,
  ) {
    return createExecutablePlanForOperation({
      fusiongraph,
      document,
      operationName,
    });
  },
);

export type TransportsOption =
  | {
      [TTransportKind in string]: Transport<TTransportKind>;
    }
  | (<TTransportKind extends string>(
      transportKind: TTransportKind,
    ) => Promise<Transport<TTransportKind>> | Transport<TTransportKind>);

interface GetExecutorForFusiongraphOpts extends TransportBaseContext {
  fusiongraph: GraphQLSchema;
  transports?: TransportsOption;
  plugins?: FusiongraphPlugin[];
}

export function defaultTransportsOption(transportKind: string) {
  return import(`@graphql-mesh/transport-${transportKind}`).catch(err => {
    console.error(err);
    throw new Error(
      `No transport found for ${transportKind}. Please install @graphql-mesh/transport-${transportKind}`,
    );
  });
}

export function createTransportGetter(transports: TransportsOption) {
  if (typeof transports === 'function') {
    return transports;
  }
  return function getTransport<TTransportKind extends string>(
    transportKind: TTransportKind,
  ): Transport<TTransportKind> {
    const transport = transports[transportKind];
    if (!transport) {
      throw new Error(`No transport found for ${transportKind}`);
    }
    return transport;
  };
}

export function getTransportExecutor(
  transportGetter: ReturnType<typeof createTransportGetter>,
  transportContext: TransportExecutorFactoryOpts,
): Executor | Promise<Executor> {
  transportContext.logger?.info(`Loading transport ${transportContext.transportEntry?.kind}`);
  const transport$ = transportGetter(transportContext.transportEntry?.kind);
  if (isPromise(transport$)) {
    return transport$.then(transport => transport.getSubgraphExecutor(transportContext));
  }
  return transport$.getSubgraphExecutor(transportContext);
}

export function getExecutorForFusiongraph({
  fusiongraph,
  transports = defaultTransportsOption,
  plugins,
  ...transportBaseContext
}: GetExecutorForFusiongraphOpts) {
  const onSubgraphExecuteHooks: OnSubgraphExecuteHook[] = [];
  if (plugins) {
    for (const plugin of plugins) {
      if (plugin.onSubgraphExecute) {
        onSubgraphExecuteHooks.push(plugin.onSubgraphExecute);
      }
    }
  }
  const transportEntryMap = getSubgraphTransportMapFromFusiongraph(fusiongraph);
  const subgraphExecutorMap: Record<string, Executor> = {};
  const transportGetter = createTransportGetter(transports);
  function onSubgraphExecute(
    subgraphName: string,
    document: DocumentNode,
    variables: any,
    context: any,
  ) {
    let executor: Executor = subgraphExecutorMap[subgraphName];
    if (executor == null) {
      transportBaseContext?.logger?.info(`Initializing executor for subgraph ${subgraphName}`);
      const transportEntry = transportEntryMap[subgraphName];
      // eslint-disable-next-line no-inner-declarations
      function wrapExecutorWithHooks(currentExecutor: Executor) {
        if (onSubgraphExecuteHooks.length) {
          return function executorWithHooks(subgraphExecReq: ExecutionRequest) {
            const onSubgraphExecuteDoneHooks: OnSubgraphExecuteDoneHook[] = [];
            const onSubgraphExecuteHooksRes$ = iterateAsync(
              onSubgraphExecuteHooks,
              onSubgraphExecuteHook =>
                onSubgraphExecuteHook({
                  fusiongraph,
                  subgraphName,
                  transportKind: transportEntry?.kind,
                  transportLocation: transportEntry?.location,
                  transportHeaders: transportEntry?.headers,
                  transportOptions: transportEntry?.options,
                  executionRequest: subgraphExecReq,
                  executor: currentExecutor,
                  setExecutor(newExecutor: Executor) {
                    currentExecutor = newExecutor;
                  },
                }),
              onSubgraphExecuteDoneHooks,
            );
            function handleOnSubgraphExecuteHooksResult() {
              if (onSubgraphExecuteDoneHooks.length) {
                // eslint-disable-next-line no-inner-declarations
                function handleExecutorResWithHooks(currentResult: ExecutionResult) {
                  const onSubgraphExecuteDoneHooksRes$ = iterateAsync(
                    onSubgraphExecuteDoneHooks,
                    onSubgraphExecuteDoneHook =>
                      onSubgraphExecuteDoneHook({
                        result: currentResult,
                        setResult(newResult: ExecutionResult) {
                          currentResult = newResult;
                        },
                      }),
                  );
                  if (isPromise(onSubgraphExecuteDoneHooksRes$)) {
                    return onSubgraphExecuteDoneHooksRes$.then(() => currentResult);
                  }
                  return currentResult;
                }
                const executorRes$ = currentExecutor(subgraphExecReq);
                if (isPromise(executorRes$)) {
                  return executorRes$.then(handleExecutorResWithHooks);
                }
                if (isAsyncIterable(executorRes$)) {
                  return mapAsyncIterator(executorRes$ as any, handleExecutorResWithHooks);
                }
                return handleExecutorResWithHooks(executorRes$);
              }
              return currentExecutor(subgraphExecReq);
            }
            if (isPromise(onSubgraphExecuteHooksRes$)) {
              return onSubgraphExecuteHooksRes$.then(handleOnSubgraphExecuteHooksResult);
            }
            return handleOnSubgraphExecuteHooksResult();
          };
        }
        return currentExecutor;
      }
      executor = function lazyExecutor(subgraphExecReq: ExecutionRequest) {
        function getSubgraph() {
          return extractSubgraphFromFusiongraph(subgraphName, fusiongraph);
        }
        const executor$ = getTransportExecutor(
          transportGetter,
          transportBaseContext
            ? {
                ...transportBaseContext,
                subgraphName,
                getSubgraph,
                transportEntry,
              }
            : { getSubgraph, transportEntry, subgraphName },
        );
        if (isPromise(executor$)) {
          return executor$.then(executor_ => {
            executor = wrapExecutorWithHooks(executor_) as Executor;
            subgraphExecutorMap[subgraphName] = executor;
            return executor(subgraphExecReq);
          });
        }
        executor = wrapExecutorWithHooks(executor$) as Executor;
        subgraphExecutorMap[subgraphName] = executor;
        return executor(subgraphExecReq);
      };
    }
    return executor({ document, variables, context });
  }
  function fusiongraphExecutor(execReq: ExecutionRequest) {
    if (execReq.operationName === 'IntrospectionQuery') {
      return {
        data: introspectionFromSchema(fusiongraph) as any,
      };
    }

    const executablePlan = getMemoizedExecutionPlanForOperation(
      fusiongraph,
      execReq.document,
      execReq.operationName,
    );
    return executeOperationPlan({
      executablePlan,
      onExecute: onSubgraphExecute,
      variables: execReq.variables,
      context: execReq.context,
    });
  }

  return {
    fusiongraphExecutor,
    transportEntryMap,
    onSubgraphExecute,
  };
}

export interface PlanCache {
  get(documentStr: string): Promise<ExecutableOperationPlan> | ExecutableOperationPlan;
  set(documentStr: string, plan: ExecutableOperationPlan): Promise<any> | any;
}

export interface FusiongraphPluginOptions<TContext> {
  getFusiongraph(
    baseCtx: TransportBaseContext,
  ): GraphQLSchema | DocumentNode | string | Promise<GraphQLSchema | string | DocumentNode>;
  transports?: TransportsOption;
  planCache?: PlanCache;
  polling?: number;
  additionalResolvers?: IResolvers<unknown, TContext> | IResolvers<unknown, TContext>[];
  transportBaseContext?: TransportBaseContext;
}

function ensureSchema(source: GraphQLSchema | DocumentNode | string) {
  if (isSchema(source)) {
    return source;
  }
  if (typeof source === 'string') {
    return buildSchema(source, { noLocation: true, assumeValidSDL: true, assumeValid: true });
  }
  return buildASTSchema(source, { assumeValidSDL: true, assumeValid: true });
}

function getExecuteFnFromExecutor(executor: Executor): typeof execute {
  return function executeFnFromExecutor({
    document,
    variableValues,
    contextValue,
    rootValue,
    operationName,
  }) {
    return executor({
      document,
      variables: variableValues,
      context: contextValue,
      operationName,
      rootValue,
    }) as Promise<ExecutionResult>;
  };
}

export function useFusiongraph<TContext>({
  getFusiongraph,
  transports,
  additionalResolvers,
  polling,
  transportBaseContext,
}: FusiongraphPluginOptions<TContext>): Plugin<{}, TContext> & {
  invalidateUnifiedGraph(): void;
} {
  let fusiongraph: GraphQLSchema;
  let lastLoadedFusiongraph: string | GraphQLSchema | DocumentNode;
  let executeFn: typeof execute;
  let executor: Executor;
  let yoga: YogaServer<TContext, unknown>;
  // TODO: We need to figure this out in a better way
  let inContextSDK: any;
  function handleLoadedFusiongraph(loadedFusiongraph: string | GraphQLSchema | DocumentNode) {
    // If the fusiongraph is the same, we don't need to do anything
    if (lastLoadedFusiongraph != null && lastLoadedFusiongraph === loadedFusiongraph) {
      return;
    }
    lastLoadedFusiongraph = loadedFusiongraph;
    fusiongraph = ensureSchema(loadedFusiongraph);
    const { fusiongraphExecutor, onSubgraphExecute, transportEntryMap } = getExecutorForFusiongraph(
      {
        fusiongraph,
        transports,
        plugins: yoga.getEnveloped._plugins as FusiongraphPlugin[],
        ...transportBaseContext,
      },
    );
    executor = fusiongraphExecutor;
    if (additionalResolvers != null) {
      fusiongraph = stitchSchemas({
        subschemas: [
          {
            schema: fusiongraph,
            executor,
          },
        ],
        resolvers: additionalResolvers,
      });
      const subgraphsForInContextSdk: {
        name: string;
        schema: GraphQLSchema;
        executor: Executor;
      }[] = [];
      for (const subgraphName in transportEntryMap) {
        subgraphsForInContextSdk.push({
          name: subgraphName,
          schema: extractSubgraphFromFusiongraph(subgraphName, fusiongraph),
          executor(execReq) {
            return onSubgraphExecute(
              subgraphName,
              execReq.document,
              execReq.variables,
              execReq.context,
            );
          },
        });
      }
      inContextSDK = getInContextSDK(
        fusiongraph,
        subgraphsForInContextSdk as any[],
        transportBaseContext.logger,
        [],
      );
    } else {
      executeFn = getExecuteFnFromExecutor(executor);
    }
  }
  function getAndSetFusiongraph(): Promise<void> | void {
    const fusiongraph$ = getFusiongraph(transportBaseContext);
    if (isPromise(fusiongraph$)) {
      return fusiongraph$.then(handleLoadedFusiongraph);
    } else {
      return handleLoadedFusiongraph(fusiongraph$);
    }
  }
  if (polling) {
    setInterval(getAndSetFusiongraph, polling);
  }

  let initialFusiongraph$: Promise<void> | void;
  let initiated = false;
  return {
    onYogaInit(payload) {
      yoga = payload.yoga;
    },
    onRequestParse() {
      return {
        onRequestParseDone() {
          if (!initiated) {
            initialFusiongraph$ = getAndSetFusiongraph();
          }
          initiated = true;
          return initialFusiongraph$;
        },
      };
    },
    onEnveloped({ setSchema }: { setSchema: (schema: GraphQLSchema) => void }) {
      setSchema(fusiongraph);
    },
    onContextBuilding({ extendContext }) {
      if (inContextSDK) {
        extendContext(inContextSDK);
      }
      extendContext(transportBaseContext as any);
    },
    onExecute({ setExecuteFn }) {
      if (executeFn) {
        setExecuteFn(executeFn);
      }
    },
    onSubscribe({ setSubscribeFn }) {
      if (executeFn) {
        setSubscribeFn(executeFn);
      }
    },
    invalidateUnifiedGraph() {
      return getAndSetFusiongraph();
    },
  };
}

export interface FusiongraphPlugin {
  onSubgraphExecute?: OnSubgraphExecuteHook;
}

export type OnSubgraphExecuteHook = (
  payload: OnFusiongraphExecutePayload,
) => Promise<OnSubgraphExecuteDoneHook> | OnSubgraphExecuteDoneHook;

export interface OnFusiongraphExecutePayload {
  fusiongraph: GraphQLSchema;
  subgraphName: string;
  transportKind: string;
  transportLocation: string;
  transportHeaders: Record<string, string>;
  transportOptions: any;
  executionRequest: ExecutionRequest;
  executor: Executor;
  setExecutor(executor: Executor): void;
}

export interface OnSubgraphExecuteDonePayload {
  result: ExecutionResult;
  setResult(result: ExecutionResult): void;
}

export type OnSubgraphExecuteDoneHook = (
  payload: OnSubgraphExecuteDonePayload,
) => Promise<void> | void;
