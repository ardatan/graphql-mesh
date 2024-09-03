import { constantCase } from 'change-case';
import { print, type DocumentNode, type ExecutionResult, type GraphQLSchema } from 'graphql';
import type { GraphQLResolveInfo } from 'graphql/type';
import type {
  Transport,
  TransportContext,
  TransportEntry,
  TransportGetSubgraphExecutor,
  TransportGetSubgraphExecutorOptions,
} from '@graphql-mesh/transport-common';
import type { Logger } from '@graphql-mesh/types';
import {
  isDisposable,
  iterateAsync,
  loggerForExecutionRequest,
  mapMaybePromise,
  requestIdByRequest,
} from '@graphql-mesh/utils';
import {
  isAsyncIterable,
  isDocumentNode,
  mapAsyncIterator,
  printSchemaWithDirectives,
  type ExecutionRequest,
  type Executor,
  type Maybe,
  type MaybePromise,
} from '@graphql-tools/utils';

export type { TransportEntry, TransportGetSubgraphExecutor, TransportGetSubgraphExecutorOptions };

export type Transports =
  | {
      [key: string]: MaybePromise<Transport | { default: Transport }>;
    }
  | ((kind: string) => MaybePromise<Transport | { default: Transport }>);

async function defaultTransportsGetter(kind: string): Promise<Transport> {
  try {
    let transport = await import(`@graphql-mesh/transport-${kind}`);
    if (!transport) {
      throw new Error(`@graphql-mesh/transport-${kind} module does not export anything`);
    }
    if (typeof transport !== 'object') {
      throw new Error(`@graphql-mesh/transport-${kind} module does not export an object`);
    }
    if (transport.default?.getSubgraphExecutor) {
      transport = transport.default;
    }
    if (!transport.getSubgraphExecutor) {
      throw new Error(
        `@graphql-mesh/transport-${kind} module does not export "getSubgraphExecutor"`,
      );
    }
    if (typeof transport.getSubgraphExecutor !== 'function') {
      throw new Error(
        `@graphql-mesh/transport-${kind} module's export "getSubgraphExecutor" is not a function`,
      );
    }
    return transport;
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        `No transport found for ${kind}. Please make sure you have installed @graphql-mesh/transport-${kind} or defined the transport config in "mesh.config.ts"`,
      );
    } else {
      throw e; // bubble non-module_not_found errors
    }
  }
}

function getTransportExecutor({
  transportContext,
  transportEntry,
  subgraphName = '',
  subgraph,
  transports = defaultTransportsGetter,
}: {
  transportContext: TransportContext;
  transportEntry: TransportEntry;
  subgraphName?: string;
  subgraph: GraphQLSchema;
  transports?: Transports;
}): MaybePromise<Executor> {
  const kind = transportEntry.kind;
  transportContext?.logger?.debug(`Loading transport "${kind}" for subgraph ${subgraphName}`);
  return mapMaybePromise(
    typeof transports === 'function' ? transports(kind) : transports[kind],
    transport => {
      if (!transport) {
        throw new Error(`Transport "${kind}" is empty`);
      }
      if (typeof transport !== 'object') {
        throw new Error(`Transport "${kind}" is not an object`);
      }
      let getSubgraphExecutor: TransportGetSubgraphExecutor | undefined;
      if ('default' in transport) {
        getSubgraphExecutor = transport.default?.getSubgraphExecutor;
      } else {
        getSubgraphExecutor = transport.getSubgraphExecutor;
      }
      if (!getSubgraphExecutor) {
        throw new Error(`Transport "${kind}" does not have "getSubgraphExecutor"`);
      }
      if (typeof getSubgraphExecutor !== 'function') {
        throw new Error(`Transport "${kind}" "getSubgraphExecutor" is not a function`);
      }
      return getSubgraphExecutor({
        subgraphName,
        subgraph,
        transportEntry,
        getTransportExecutor(transportEntry) {
          return getTransportExecutor({
            transportContext,
            transportEntry,
            subgraphName,
            subgraph,
            transports,
          });
        },
        ...transportContext,
      });
    },
  );
}

/**
 * This function creates a executor factory that uses the transport packages,
 * and wraps them with the hooks
 */
export function getOnSubgraphExecute({
  onSubgraphExecuteHooks,
  transportContext,
  transportEntryMap,
  getSubgraphSchema,
  transportExecutorStack,
  transports,
}: {
  onSubgraphExecuteHooks: OnSubgraphExecuteHook[];
  transports?: Transports;
  transportContext?: TransportContext;
  transportEntryMap?: Record<string, TransportEntry>;
  getSubgraphSchema(subgraphName: string): GraphQLSchema;
  transportExecutorStack: AsyncDisposableStack;
}) {
  const subgraphExecutorMap = new Map<string, Executor>();
  return function onSubgraphExecute(subgraphName: string, executionRequest: ExecutionRequest) {
    let executor: Executor = subgraphExecutorMap.get(subgraphName);
    // If the executor is not initialized yet, initialize it
    if (executor == null) {
      transportContext?.logger?.debug(`Initializing executor for subgraph ${subgraphName}`);
      // Lazy executor that loads transport executor on demand
      executor = function lazyExecutor(subgraphExecReq: ExecutionRequest) {
        return mapMaybePromise(
          // Gets the transport executor for the given subgraph
          getTransportExecutor({
            transportContext,
            subgraphName,
            get subgraph() {
              return getSubgraphSchema(subgraphName);
            },
            get transportEntry() {
              return transportEntryMap?.[subgraphName];
            },
            transports,
          }),
          executor_ => {
            if (isDisposable(executor_)) {
              transportExecutorStack.use(executor_);
            }
            // Wraps the transport executor with hooks
            executor = wrapExecutorWithHooks({
              executor: executor_,
              onSubgraphExecuteHooks,
              subgraphName,
              transportEntryMap,
              transportContext,
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
  transportContext?: TransportContext;
}

declare module 'graphql' {
  interface GraphQLResolveInfo {
    executionRequest?: ExecutionRequest;
  }
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
  transportContext,
}: WrapExecuteWithHooksOptions): Executor {
  return function executorWithHooks(executionRequest: ExecutionRequest) {
    executionRequest.info = executionRequest.info || ({} as GraphQLResolveInfo);
    executionRequest.info.executionRequest = executionRequest;
    const requestId =
      executionRequest.context?.request && requestIdByRequest.get(executionRequest.context.request);
    let execReqLogger = transportContext?.logger?.child?.(subgraphName);
    if (execReqLogger) {
      if (requestId) {
        execReqLogger = execReqLogger.child(requestId);
      }
      loggerForExecutionRequest.set(executionRequest, execReqLogger);
    }
    if (onSubgraphExecuteHooks.length === 0) {
      return executor(executionRequest);
    }
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
              execReqLogger.debug('Updating execution request to: ', newExecutionRequest);
              executionRequest = newExecutionRequest;
            },
            executor,
            setExecutor(newExecutor) {
              execReqLogger.debug('executor has been updated');
              executor = newExecutor;
            },
            requestId,
            logger: execReqLogger,
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
                    execReqLogger.debug('overriding result with: ', newResult);
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

              return mapAsyncIterator(
                currentResult,
                currentResult =>
                  mapMaybePromise(
                    iterateAsync(onNextHooks, onNext =>
                      onNext({
                        result: currentResult,
                        setResult: res => {
                          execReqLogger.debug('overriding result with: ', res);

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

export interface UnifiedGraphPlugin<TContext> {
  onSubgraphExecute?: OnSubgraphExecuteHook<TContext>;
}

export type OnSubgraphExecuteHook<TContext = any> = (
  payload: OnSubgraphExecutePayload<TContext>,
) => MaybePromise<Maybe<OnSubgraphExecuteDoneHook | void>>;

export interface OnSubgraphExecutePayload<TContext> {
  subgraph: GraphQLSchema;
  subgraphName: string;
  transportEntry?: TransportEntry;
  executionRequest: ExecutionRequest<any, TContext>;
  setExecutionRequest(executionRequest: ExecutionRequest): void;
  executor: Executor;
  setExecutor(executor: Executor): void;
  requestId?: string;
  logger?: Logger;
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

// TODO: Fix this in GraphQL Tools
export function compareSubgraphNames(name1: string, name2: string) {
  return constantCase(name1) === constantCase(name2);
}
