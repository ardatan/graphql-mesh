import { DocumentNode, ExecutionResult, GraphQLSchema, print } from 'graphql';
import type {
  Transport,
  TransportBaseContext,
  TransportEntry,
  TransportExecutorFactoryFn,
  TransportExecutorFactoryOpts,
} from '@graphql-mesh/transport-common';
import { iterateAsync, mapMaybePromise } from '@graphql-mesh/utils';
import { SubschemaConfig } from '@graphql-tools/delegate';
import {
  ExecutionRequest,
  Executor,
  isAsyncIterable,
  isDocumentNode,
  mapAsyncIterator,
  printSchemaWithDirectives,
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

export function createTransportGetter(transports: TransportsOption = defaultTransportsOption) {
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
  disposableStack: AsyncDisposableStack,
): MaybePromise<Executor> {
  transportContext.logger?.info(`Loading transport ${transportContext.transportEntry?.kind}`);
  const transport$ = transportGetter(transportContext.transportEntry?.kind);
  return mapMaybePromise(transport$, transport =>
    mapMaybePromise(transport.getSubgraphExecutor(transportContext), executor => {
      if (isDisposable(executor)) {
        disposableStack.use(executor);
      }
      return executor;
    }),
  );
}

export function getOnSubgraphExecute({
  onSubgraphExecuteHooks,
  transports,
  transportBaseContext,
  transportEntryMap,
  getSubgraphSchema,
  disposableStack,
}: {
  onSubgraphExecuteHooks: OnSubgraphExecuteHook[];
  transports?: TransportsOption;
  transportBaseContext?: TransportBaseContext;
  transportEntryMap?: Record<string, TransportEntry>;
  getSubgraphSchema(subgraphName: string): GraphQLSchema;
  disposableStack: AsyncDisposableStack;
}) {
  const subgraphExecutorMap: Record<string, Executor> = {};
  const transportGetter = createTransportGetter(transports);

  return function onSubgraphExecute(subgraphName: string, executionRequest: ExecutionRequest) {
    let executor: Executor = subgraphExecutorMap[subgraphName];
    if (executor == null) {
      transportBaseContext?.logger?.info(`Initializing executor for subgraph ${subgraphName}`);
      const transportEntry = transportEntryMap[subgraphName];
      // eslint-disable-next-line no-inner-declarations
      function wrapExecutorWithHooks(currentExecutor: Executor) {
        if (onSubgraphExecuteHooks.length) {
          return function executorWithHooks(executionRequest: ExecutionRequest) {
            const onSubgraphExecuteDoneHooks: OnSubgraphExecuteDoneHook[] = [];
            const onSubgraphExecuteHooksRes$ = iterateAsync(
              onSubgraphExecuteHooks,
              onSubgraphExecuteHook =>
                onSubgraphExecuteHook({
                  get subgraph() {
                    return getSubgraphSchema(subgraphName);
                  },
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
        const executor$ = getTransportExecutor(
          transportGetter,
          transportBaseContext
            ? {
                ...transportBaseContext,
                subgraphName,
                get subgraph() {
                  return getSubgraphSchema(subgraphName);
                },
                transportEntry,
              }
            : {
                get subgraph() {
                  return getSubgraphSchema(subgraphName);
                },
                transportEntry,
                subgraphName,
              },
          disposableStack,
        );
        return mapMaybePromise(executor$, executor_ => {
          executor = wrapExecutorWithHooks(executor_) as Executor;
          subgraphExecutorMap[subgraphName] = executor;
          return executor(subgraphExecReq);
        });
      };
    }
    return executor(executionRequest);
  };
}

export interface UnifiedGraphPlugin {
  onSubgraphExecute?: OnSubgraphExecuteHook;
}

export type OnSubgraphExecuteHook = (
  payload: OnSubgraphExecutePayload,
) => Promise<Maybe<OnSubgraphExecuteDoneHook | void>> | Maybe<OnSubgraphExecuteDoneHook | void>;

export interface OnSubgraphExecutePayload {
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

export function compareSchemas(
  a: DocumentNode | string | GraphQLSchema,
  b: DocumentNode | string | GraphQLSchema,
) {
  let aStr: string;
  if (typeof a === 'string') {
    aStr = a;
  } else if (isDocumentNode(a)) {
    aStr = print(a);
  } else {
    aStr = printSchemaWithDirectives(a);
  }
  let bStr: string;
  if (typeof b === 'string') {
    bStr = b;
  } else if (isDocumentNode(b)) {
    bStr = print(b);
  } else {
    bStr = printSchemaWithDirectives(b);
  }
  return aStr === bStr;
}

export function isDisposable(obj: any): obj is Disposable | AsyncDisposable {
  return obj?.[Symbol.dispose] != null || obj?.[Symbol.asyncDispose] != null;
}
