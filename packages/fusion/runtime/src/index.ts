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
import { useReadinessCheck, type Plugin, type PromiseOrValue, type YogaServer } from 'graphql-yoga';
import {
  createExecutablePlanForOperation,
  ExecutableOperationPlan,
  executeOperationPlan,
  extractSubgraphFromFusiongraph,
} from '@graphql-mesh/fusion-execution';
// eslint-disable-next-line import/no-extraneous-dependencies
import { getInContextSDK } from '@graphql-mesh/runtime';
// eslint-disable-next-line import/no-extraneous-dependencies
import type { MeshServeContext } from '@graphql-mesh/serve-runtime';
import {
  Transport,
  TransportBaseContext,
  TransportEntry,
  TransportExecutorFactoryFn,
  TransportExecutorFactoryOpts,
} from '@graphql-mesh/transport-common';
import { iterateAsync, mapMaybePromise } from '@graphql-mesh/utils';
import { stitchSchemas, ValidationLevel } from '@graphql-tools/stitch';
import {
  ExecutionRequest,
  Executor,
  getDirective,
  IResolvers,
  isAsyncIterable,
  isPromise,
  mapAsyncIterator,
  memoize2of4,
  type Maybe,
  type MaybePromise,
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
  fusiongraph: GraphQLSchema | DocumentNode | string;
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
): MaybePromise<Executor> {
  transportContext.logger?.info(`Loading transport ${transportContext.transportEntry?.kind}`);
  const transport$ = transportGetter(transportContext.transportEntry?.kind);
  return mapMaybePromise(transport$, transport => transport.getSubgraphExecutor(transportContext));
}

export function getOnSubgraphExecute({
  getFusiongraph,
  plugins,
  transports,
  transportBaseContext,
  transportEntryMap,
}: {
  getFusiongraph: () => GraphQLSchema;
  plugins?: FusiongraphPlugin[];
  transports?: TransportsOption;
  transportBaseContext?: TransportBaseContext;
  transportEntryMap?: Record<string, TransportEntry>;
}) {
  const onSubgraphExecuteHooks: OnSubgraphExecuteHook[] = [];
  if (plugins) {
    for (const plugin of plugins) {
      if (plugin.onSubgraphExecute) {
        onSubgraphExecuteHooks.push(plugin.onSubgraphExecute);
      }
    }
  }
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
                  get fusiongraph() {
                    return getFusiongraph();
                  },
                  subgraphName,
                  transportEntry,
                  executionRequest: subgraphExecReq,
                  setExecutionRequest(newExecutionRequest) {
                    subgraphExecReq = newExecutionRequest;
                  },
                  executor: currentExecutor,
                  setExecutor(newExecutor) {
                    currentExecutor = newExecutor;
                  },
                }),
              onSubgraphExecuteDoneHooks,
            );
            function handleOnSubgraphExecuteHooksResult() {
              if (onSubgraphExecuteDoneHooks.length) {
                // eslint-disable-next-line no-inner-declarations
                function handleExecutorResWithHooks(
                  currentResult: ExecutionResult | AsyncIterable<ExecutionResult>,
                ) {
                  const executeDoneResults: OnSubgraphExecuteDoneResult[] = [];
                  const onSubgraphExecuteDoneHooksRes$ = iterateAsync(
                    onSubgraphExecuteDoneHooks,
                    onSubgraphExecuteDoneHook =>
                      onSubgraphExecuteDoneHook({
                        result: currentResult,
                        setResult(newResult: ExecutionResult) {
                          currentResult = newResult;
                        },
                      }),
                    executeDoneResults,
                  );
                  function handleExecuteDoneResults(
                    result: AsyncIterable<ExecutionResult> | ExecutionResult,
                  ) {
                    if (!isAsyncIterable(result)) {
                      return result;
                    }

                    if (executeDoneResults.length === 0) {
                      return result;
                    }

                    const onNextHooks: OnSubgraphExecuteDoneResultOnNext[] = [];
                    const onEndHooks: OnSubgraphExecuteDoneResultOnEnd[] = [];
                    for (const executeDoneResult of executeDoneResults) {
                      if (executeDoneResult.onNext) {
                        onNextHooks.push(executeDoneResult.onNext);
                      }
                      if (executeDoneResult.onEnd) {
                        onEndHooks.push(executeDoneResult.onEnd);
                      }
                    }

                    return mapAsyncIterator(
                      result[Symbol.asyncIterator](),
                      currentResult => {
                        if (onNextHooks.length === 0) {
                          return currentResult;
                        }
                        const $ = iterateAsync(onNextHooks, onNext =>
                          onNext({
                            result: currentResult,
                            setResult: res => {
                              currentResult = res;
                            },
                          }),
                        );
                        return mapMaybePromise($, () => currentResult);
                      },
                      undefined,
                      () =>
                        onEndHooks.length === 0
                          ? undefined
                          : iterateAsync(onEndHooks, onEnd => onEnd()),
                    );
                  }
                  return mapMaybePromise(onSubgraphExecuteDoneHooksRes$, () =>
                    handleExecuteDoneResults(currentResult),
                  );
                }
                const executorRes$ = currentExecutor(subgraphExecReq);
                return mapMaybePromise(executorRes$, handleExecutorResWithHooks);
              }
              return currentExecutor(subgraphExecReq);
            }
            return mapMaybePromise(onSubgraphExecuteHooksRes$, handleOnSubgraphExecuteHooksResult);
          };
        }
        return currentExecutor;
      }
      executor = function lazyExecutor(subgraphExecReq: ExecutionRequest) {
        function getSubgraph() {
          return extractSubgraphFromFusiongraph(subgraphName, getFusiongraph());
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
        return mapMaybePromise(executor$, executor_ => {
          executor = wrapExecutorWithHooks(executor_) as Executor;
          subgraphExecutorMap[subgraphName] = executor;
          return executor(subgraphExecReq);
        });
      };
    }
    return executor({ document, variables, context });
  }

  return onSubgraphExecute;
}

export function getExecutorForFusiongraph({
  fusiongraph: fusiongraphInput,
  transports = defaultTransportsOption,
  plugins,
  ...transportBaseContext
}: GetExecutorForFusiongraphOpts) {
  const fusiongraph = ensureSchema(fusiongraphInput);
  const transportEntryMap = getSubgraphTransportMapFromFusiongraph(fusiongraph);
  const onSubgraphExecute = getOnSubgraphExecute({
    getFusiongraph() {
      return fusiongraph;
    },
    plugins,
    transports,
    transportBaseContext,
    transportEntryMap,
  });
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
  additionalResolvers?:
    | IResolvers<unknown, MeshServeContext & TContext>
    | IResolvers<unknown, MeshServeContext & TContext>[];
  transportBaseContext?: TransportBaseContext;
  readinessCheckEndpoint?: string;
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
  readinessCheckEndpoint,
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
        resolverValidationOptions: {
          requireResolversForAllFields: 'ignore',
          requireResolversForArgs: 'ignore',
          requireResolversForNonScalar: 'ignore',
          requireResolversForResolveType: 'ignore',
          requireResolversToMatchSchema: 'ignore',
        },
        typeMergingOptions: {
          validationSettings: {
            validationLevel: ValidationLevel.Off,
          },
        },
        mergeDirectives: true,
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
  function getAndSetFusiongraph(): PromiseOrValue<void> {
    const fusiongraph$ = getFusiongraph(transportBaseContext);
    return mapMaybePromise(fusiongraph$, handleLoadedFusiongraph) as PromiseOrValue<void>;
  }
  if (polling) {
    setInterval(getAndSetFusiongraph, polling);
  }

  let initialFusiongraph$: PromiseOrValue<void>;
  let initiated = false;
  return {
    onYogaInit(payload) {
      yoga = payload.yoga;
    },
    onPluginInit({ addPlugin }) {
      if (readinessCheckEndpoint) {
        addPlugin(
          useReadinessCheck({
            endpoint: readinessCheckEndpoint,
            check() {
              if (!initiated) {
                initialFusiongraph$ = getAndSetFusiongraph();
              }
              initiated = true;
              if (isPromise(initialFusiongraph$)) {
                return initialFusiongraph$.then(() => !!fusiongraph);
              }
              return !!fusiongraph;
            },
          }),
        );
      }
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
) => Promise<Maybe<OnSubgraphExecuteDoneHook | void>> | Maybe<OnSubgraphExecuteDoneHook | void>;

export interface OnFusiongraphExecutePayload {
  fusiongraph: GraphQLSchema;
  subgraphName: string;
  transportEntry?: TransportEntry;
  executionRequest: ExecutionRequest;
  setExecutionRequest(executionRequest: ExecutionRequest): void;
  executor: Executor;
  setExecutor(executor: Executor): void;
}

export interface OnSubgraphExecuteDonePayload {
  result: AsyncIterable<ExecutionResult> | ExecutionResult;
  setResult(result: AsyncIterable<ExecutionResult> | ExecutionResult): void;
}

export type OnSubgraphExecuteDoneHook = (
  payload: OnSubgraphExecuteDonePayload,
) => MaybePromise<Maybe<OnSubgraphExecuteDoneResult | void>>;

export type OnSubgraphExecuteDoneResultOnNext = (
  payload: OnSubgraphExecuteDoneOnNextPayload,
) => MaybePromise<void>;

export interface OnSubgraphExecuteDoneOnNextPayload {
  result: ExecutionResult;
  setResult(result: ExecutionResult): void;
}

export type OnSubgraphExecuteDoneResultOnEnd = () => MaybePromise<void>;

export type OnSubgraphExecuteDoneResult = {
  onNext?: OnSubgraphExecuteDoneResultOnNext;
  onEnd?: OnSubgraphExecuteDoneResultOnEnd;
};
