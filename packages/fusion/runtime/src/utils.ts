import { ExecutionResult, GraphQLSchema, print } from 'graphql';
import type {
  Transport,
  TransportBaseContext,
  TransportEntry,
  TransportExecutorFactoryFn,
  TransportExecutorFactoryOpts,
} from '@graphql-mesh/transport-common';
import { iterateAsync, mapMaybePromise } from '@graphql-mesh/utils';
import { contextIdMap } from '@graphql-tools/delegate';
import {
  ExecutionRequest,
  Executor,
  isAsyncIterable,
  mapAsyncIterator,
  type Maybe,
  type MaybePromise,
} from '@graphql-tools/utils';

export { Transport, TransportEntry, TransportExecutorFactoryFn, TransportExecutorFactoryOpts };

export type TransportsOption =
  | {
      [TTransportKind in string]: Transport<TTransportKind>;
    }
  | (<TTransportKind extends string>(
      transportKind: TTransportKind,
    ) => Promise<Transport<TTransportKind>> | Transport<TTransportKind>);

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
  fusiongraph,
  plugins,
  transports,
  transportBaseContext,
  transportEntryMap,
  subgraphMap,
}: {
  fusiongraph: GraphQLSchema;
  plugins?: FusiongraphPlugin[];
  transports?: TransportsOption;
  transportBaseContext?: TransportBaseContext;
  transportEntryMap?: Record<string, TransportEntry>;
  subgraphMap: Map<string, GraphQLSchema>;
}) {
  const onSubgraphExecuteHooks: OnSubgraphExecuteHook[] = [];
  if (plugins) {
    for (const plugin of plugins) {
      if (plugin.onSubgraphExecute) {
        onSubgraphExecuteHooks.push(plugin.onSubgraphExecute);
      }
    }
  }
  if (globalThis.process?.env.DEBUG) {
    onSubgraphExecuteHooks.push(({ executionRequest, subgraphName }) => {
      transportBaseContext.logger.debug({
        status: 'EXECUTION_SUBGRAPH',
        contextId: contextIdMap.get(executionRequest.context),
        subgraphName,
        document: print(executionRequest.document),
        variables: executionRequest.variables,
      });
    });
  }
  const subgraphExecutorMap: Record<string, Executor> = {};
  const transportGetter = createTransportGetter(transports);
  function onSubgraphExecute(subgraphName: string, executionRequest: ExecutionRequest) {
    let executor: Executor = subgraphExecutorMap[subgraphName];
    if (executor == null) {
      transportBaseContext?.logger?.info(`Initializing executor for subgraph ${subgraphName}`);
      const transportEntry = transportEntryMap[subgraphName];
      // eslint-disable-next-line no-inner-declarations
      function wrapExecutorWithHooks(currentExecutor: Executor) {
        if (onSubgraphExecuteHooks.length) {
          return function executorWithHooks(executionRequest: ExecutionRequest) {
            const onSubgraphExecuteDoneHooks: OnSubgraphExecuteDoneHook[] = [];
            const subgraph = subgraphMap.get(subgraphName);
            const onSubgraphExecuteHooksRes$ = iterateAsync(
              onSubgraphExecuteHooks,
              onSubgraphExecuteHook =>
                onSubgraphExecuteHook({
                  fusiongraph,
                  subgraph,
                  subgraphName,
                  transportEntry,
                  executionRequest,
                  setExecutionRequest(newExecutionRequest) {
                    executionRequest = newExecutionRequest;
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
                const executorRes$ = currentExecutor(executionRequest);
                return mapMaybePromise(executorRes$, handleExecutorResWithHooks);
              }
              return currentExecutor(executionRequest);
            }
            return mapMaybePromise(onSubgraphExecuteHooksRes$, handleOnSubgraphExecuteHooksResult);
          };
        }
        return currentExecutor;
      }
      executor = function lazyExecutor(subgraphExecReq: ExecutionRequest) {
        const subgraph = subgraphMap.get(subgraphName);
        const executor$ = getTransportExecutor(
          transportGetter,
          transportBaseContext
            ? {
                ...transportBaseContext,
                subgraphName,
                subgraph,
                transportEntry,
              }
            : { subgraph, transportEntry, subgraphName },
        );
        return mapMaybePromise(executor$, executor_ => {
          executor = wrapExecutorWithHooks(executor_) as Executor;
          subgraphExecutorMap[subgraphName] = executor;
          return executor(subgraphExecReq);
        });
      };
    }
    return executor(executionRequest);
  }

  return onSubgraphExecute;
}

export interface FusiongraphPlugin {
  onSubgraphExecute?: OnSubgraphExecuteHook;
}

export type OnSubgraphExecuteHook = (
  payload: OnSubgraphExecutePayload,
) => Promise<Maybe<OnSubgraphExecuteDoneHook | void>> | Maybe<OnSubgraphExecuteDoneHook | void>;

export interface OnSubgraphExecutePayload {
  fusiongraph: GraphQLSchema;
  subgraph: GraphQLSchema;
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
