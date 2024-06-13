import { DocumentNode, ExecutionResult, GraphQLSchema, print } from 'graphql';
import type {
  Transport,
  TransportBaseContext,
  TransportEntry,
  TransportExecutorFactoryFn,
  TransportExecutorFactoryOpts,
} from '@graphql-mesh/transport-common';
import { Logger } from '@graphql-mesh/types';
import { iterateAsync, mapMaybePromise } from '@graphql-mesh/utils';
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

export function createDefaultTransportsOption(logger?: Logger) {
  return function defaultTransportsOption(transportKind: string): Promise<Transport<string>> {
    const childLogger = logger?.child?.(transportKind);
    return import(`@graphql-mesh/transport-${transportKind}`).catch(err => {
      childLogger?.error(err);
      throw new Error(
        `No transport found for ${transportKind}. Please make sure you have installed @graphql-mesh/transport-${transportKind}`,
      );
    });
  };
}

export type TransportGetter = <TTransportKind extends string>(
  transportKind: TTransportKind,
) => MaybePromise<Transport<TTransportKind>>;

/**
 * Creates a function that returns the transport object for the given `transports` config option
 */
export function createTransportGetter(transports: TransportsOption): TransportGetter {
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
  transportGetter: TransportGetter,
  transportContext: TransportExecutorFactoryOpts,
  disposableStack: AsyncDisposableStack,
): MaybePromise<Executor> {
  const transportKind = transportContext.transportEntry?.kind || '';
  const subgraphName = transportContext.subgraphName || '';
  transportContext.logger?.info(`Loading transport ${transportKind} for subgraph ${subgraphName}`);
  return mapMaybePromise(transportGetter(transportKind), transport =>
    mapMaybePromise(transport.getSubgraphExecutor(transportContext), executor => {
      if (isDisposable(executor)) {
        disposableStack.use(executor);
      }
      return executor;
    }),
  );
}

/**
 * This function creates a executor factory that uses the transport packages,
 * and wraps them with the hooks
 */
export function getOnSubgraphExecute({
  onSubgraphExecuteHooks,
  transportBaseContext,
  transportEntryMap,
  getSubgraphSchema,
  disposableStack,
  transports = createDefaultTransportsOption(transportBaseContext?.logger),
}: {
  onSubgraphExecuteHooks: OnSubgraphExecuteHook[];
  transports?: TransportsOption;
  transportBaseContext?: TransportBaseContext;
  transportEntryMap?: Record<string, TransportEntry>;
  getSubgraphSchema(subgraphName: string): GraphQLSchema;
  disposableStack: AsyncDisposableStack;
}) {
  const subgraphExecutorMap = new Map<string, Executor>();
  const transportGetter = createTransportGetter(transports);

  return function onSubgraphExecute(subgraphName: string, executionRequest: ExecutionRequest) {
    let executor: Executor = subgraphExecutorMap.get(subgraphName);
    // If the executor is not initialized yet, initialize it
    if (executor == null) {
      transportBaseContext?.logger?.info(`Initializing executor for subgraph ${subgraphName}`);
      // Lazy executor that loads transport executor on demand
      executor = function lazyExecutor(subgraphExecReq: ExecutionRequest) {
        return mapMaybePromise(
          // Gets the transport executor for the given subgraph
          getTransportExecutor(
            transportGetter,
            transportBaseContext
              ? {
                  ...transportBaseContext,
                  subgraphName,
                  get subgraph() {
                    return getSubgraphSchema(subgraphName);
                  },
                  get transportEntry() {
                    return transportEntryMap?.[subgraphName];
                  },
                }
              : {
                  get subgraph() {
                    return getSubgraphSchema(subgraphName);
                  },
                  get transportEntry() {
                    return transportEntryMap?.[subgraphName];
                  },
                  subgraphName,
                },
            disposableStack,
          ),
          executor_ => {
            // Wraps the transport executor with hooks
            executor = wrapExecutorWithHooks({
              executor: executor_,
              onSubgraphExecuteHooks,
              subgraphName,
              transportEntryMap,
              getSubgraphSchema,
            });
            // Caches the executor for future use
            subgraphExecutorMap.set(subgraphName, executor);
            return executor(subgraphExecReq);
          },
        );
      };
      // Caches the lazy executor to prevent race conditions
      subgraphExecutorMap.set(subgraphName, executor);
    }
    return executor(executionRequest);
  };
}

export interface WrapExecuteWithHooksOptions {
  executor: Executor;
  onSubgraphExecuteHooks: OnSubgraphExecuteHook[];
  subgraphName: string;
  transportEntryMap?: Record<string, TransportEntry>;
  getSubgraphSchema: (subgraphName: string) => GraphQLSchema;
}

/**
 * This function wraps the executor created by the transport package
 * with `onSubgraphExecuteHooks` to hook into the execution phase of subgraphs
 */
export function wrapExecutorWithHooks({
  executor,
  onSubgraphExecuteHooks,
  subgraphName,
  transportEntryMap,
  getSubgraphSchema,
}: WrapExecuteWithHooksOptions): Executor {
  if (onSubgraphExecuteHooks.length === 0) {
    return executor;
  }
  return function executorWithHooks(executionRequest: ExecutionRequest) {
    const onSubgraphExecuteDoneHooks: OnSubgraphExecuteDoneHook[] = [];
    return mapMaybePromise(
      iterateAsync(
        onSubgraphExecuteHooks,
        onSubgraphExecuteHook =>
          onSubgraphExecuteHook({
            get subgraph() {
              return getSubgraphSchema(subgraphName);
            },
            subgraphName,
            get transportEntry() {
              return transportEntryMap?.[subgraphName];
            },
            executionRequest,
            setExecutionRequest(newExecutionRequest) {
              executionRequest = newExecutionRequest;
            },
            executor,
            setExecutor(newExecutor) {
              executor = newExecutor;
            },
          }),
        onSubgraphExecuteDoneHooks,
      ),
      () => {
        if (onSubgraphExecuteDoneHooks.length === 0) {
          return executor(executionRequest);
        }
        return mapMaybePromise(executor(executionRequest), currentResult => {
          const executeDoneResults: OnSubgraphExecuteDoneResult[] = [];
          return mapMaybePromise(
            iterateAsync(
              onSubgraphExecuteDoneHooks,
              onSubgraphExecuteDoneHook =>
                onSubgraphExecuteDoneHook({
                  result: currentResult,
                  setResult(newResult: ExecutionResult) {
                    currentResult = newResult;
                  },
                }),
              executeDoneResults,
            ),
            () => {
              if (!isAsyncIterable(currentResult)) {
                return currentResult;
              }

              if (executeDoneResults.length === 0) {
                return currentResult;
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

              if (onNextHooks.length === 0 && onEndHooks.length === 0) {
                return currentResult;
              }

              const asyncIterator = currentResult[Symbol.asyncIterator]();
              return mapAsyncIterator(
                asyncIterator,
                currentResult =>
                  mapMaybePromise(
                    iterateAsync(onNextHooks, onNext =>
                      onNext({
                        result: currentResult,
                        setResult: res => {
                          currentResult = res;
                        },
                      }),
                    ),
                    () => currentResult,
                  ),
                undefined,
                () =>
                  onEndHooks.length === 0 ? undefined : iterateAsync(onEndHooks, onEnd => onEnd()),
              );
            },
          );
        });
      },
    );
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
