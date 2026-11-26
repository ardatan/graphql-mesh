import { constantCase } from 'change-case';
import {
  isEnumType,
  isInterfaceType,
  isObjectType,
  type DocumentNode,
  type ExecutionResult,
  type GraphQLError,
  type GraphQLResolveInfo,
  type GraphQLSchema,
} from 'graphql';
import { getInstrumented } from '@envelop/instrumentation';
import { Logger } from '@graphql-hive/logger';
import {
  defaultPrintFn,
  type Transport,
  type TransportContext,
  type TransportEntry,
  type TransportGetSubgraphExecutor,
  type TransportGetSubgraphExecutorOptions,
} from '@graphql-mesh/transport-common';
import { isDisposable, iterateAsync } from '@graphql-mesh/utils';
import { getBatchingExecutor } from '@graphql-tools/batch-execute';
import {
  getDirectiveExtensions,
  isAsyncIterable,
  isDocumentNode,
  mergeDeep,
  printSchemaWithDirectives,
  type ExecutionRequest,
  type Executor,
  type GraphQLResolveInfoHelpers,
  type Maybe,
} from '@graphql-tools/utils';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import { handleMaybePromise, mapAsyncIterator } from '@whatwg-node/promise-helpers';
import { restoreExtraDirectives } from './federation/supergraph.js';
import { type Instrumentation, type TransportEntryAdditions } from './unifiedGraphManager.js';

export type { TransportEntry, TransportGetSubgraphExecutor, TransportGetSubgraphExecutorOptions };

export type Transports =
  | {
      [key: string]: MaybePromise<Transport | { default: Transport }>;
    }
  | ((kind: string) => MaybePromise<Transport | { default: Transport }>);

function defaultTransportsGetter(kind: string): MaybePromise<Transport> {
  const moduleName = `@graphql-mesh/transport-${kind}`;
  return handleMaybePromise(
    () => import(moduleName),
    transport => {
      if (!transport) {
        throw new Error(`${moduleName} module is empty`);
      }
      if (typeof transport !== 'object') {
        throw new Error(`${moduleName} module does not export an object`);
      }
      let getSubgraphExecutor: TransportGetSubgraphExecutor | undefined;
      while (true) {
        if (transport.getSubgraphExecutor) {
          getSubgraphExecutor = transport.getSubgraphExecutor;
          break;
        }
        if (!transport.default) {
          break;
        }
        // unwrap default export, node's sometimes weird and puts a default inside a default
        // all e2e tests that import transports prove that the default gets wrapped multiple times
        transport = transport.default;
      }
      if (!getSubgraphExecutor) {
        throw new Error(`${moduleName} module does not export "getSubgraphExecutor"`);
      }
      if (typeof getSubgraphExecutor !== 'function') {
        throw new Error(`${moduleName} module's export "getSubgraphExecutor" is not a function`);
      }
      return { getSubgraphExecutor };
    },
  );
}

function getTransportExecutor({
  transportContext,
  transportEntry,
  subgraphName = '',
  subgraph,
  transports = defaultTransportsGetter,
  getDisposeReason,
}: {
  transportContext: TransportContext | undefined;
  transportEntry: TransportEntry;
  subgraphName?: string;
  subgraph: GraphQLSchema;
  transports?: Transports;
  getDisposeReason?: () => GraphQLError | undefined;
}): MaybePromise<Executor> {
  const kind = transportEntry?.kind || '';
  transportContext?.log.debug(`Loading transport "${kind}"`);
  return handleMaybePromise(
    () => (typeof transports === 'function' ? transports(kind) : transports[kind]),
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
      const log =
        transportContext?.log ||
        // if the logger is not provided by the context, create a new silent one just for consistency in the hooks
        new Logger({ level: false });
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
            getDisposeReason,
          });
        },
        getDisposeReason,
        ...transportContext,
        log,
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
  getDisposeReason,
  batch = true,
  instrumentation,
}: {
  onSubgraphExecuteHooks: OnSubgraphExecuteHook[];
  transports?: Transports;
  transportContext?: TransportContext;
  transportEntryMap: Record<string, TransportEntry>;
  getSubgraphSchema(subgraphName: string): GraphQLSchema;
  transportExecutorStack: AsyncDisposableStack;
  getDisposeReason?: () => GraphQLError | undefined;
  /**
   * Whether to batch the executions of subgraphs. A function decides it for every subgraph by
   * its name.
   */
  batch?: boolean | ((subgraphName: string) => boolean);
  instrumentation: () => Instrumentation | undefined;
}): (subgraphName: string, executionRequest: ExecutionRequest) => ReturnType<Executor> {
  const subgraphExecutorMap = new Map<string, Executor>();
  return function onSubgraphExecute(
    subgraphName: string,
    executionRequest: ExecutionRequest,
  ): ReturnType<Executor> {
    let executor: Executor | undefined = subgraphExecutorMap.get(subgraphName);
    // If the executor is not initialized yet, initialize it
    if (executor == null) {
      // Subgraph-scoped logger for the cached transport — never mutate the
      // shared transportContext.log (request attrs would leak across requests).
      const transportLog = transportContext
        ? subgraphName
          ? transportContext.log.child({ subgraph: subgraphName })
          : transportContext.log
        : undefined;
      transportLog?.debug('Initializing executor');
      const transportContextForExecutor =
        transportContext && transportLog
          ? { ...transportContext, log: transportLog }
          : transportContext;
      // concurrent first requests share the same pending transport executor, otherwise
      // each would create its own executor and lose things like inflight dedupe
      let loadingExecutor$: MaybePromise<Executor> | undefined;
      // Lazy executor that loads transport executor on demand
      executor = function lazyExecutor(subgraphExecReq: ExecutionRequest) {
        loadingExecutor$ ||= handleMaybePromise(
          () =>
            // Gets the transport executor for the given subgraph
            getTransportExecutor({
              transportContext: transportContextForExecutor,
              subgraphName,
              get subgraph() {
                return getSubgraphSchema(subgraphName);
              },
              get transportEntry() {
                return transportEntryMap[subgraphName]!;
              },
              transports,
              getDisposeReason,
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
              instrumentation,
            });
            // Caches the executor for future use
            subgraphExecutorMap.set(subgraphName, executor);
            return executor;
          },
          err => {
            // dont cache failures so the next request retries loading the transport
            loadingExecutor$ = undefined;
            throw err;
          },
        );
        return handleMaybePromise(
          () => loadingExecutor$!,
          executor_ => executor_(subgraphExecReq),
        );
      };
      // Caches the lazy executor to prevent race conditions
      subgraphExecutorMap.set(subgraphName, executor);
    }

    if (typeof batch === 'function' ? batch(subgraphName) : batch) {
      executor = getBatchingExecutor(executionRequest.context || subgraphExecutorMap, executor);
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
  instrumentation: () => Instrumentation | undefined;
}

declare module 'graphql' {
  interface GraphQLResolveInfo {
    executionRequest?: ExecutionRequest;
    readonly getAbortSignal: () => AbortSignal | undefined;
    readonly getAsyncHelpers: () => GraphQLResolveInfoHelpers;
  }
}

/**
 * This function wraps the executor created by the transport package
 * with `onSubgraphExecuteHooks` to hook into the execution phase of subgraphs
 */
export function wrapExecutorWithHooks({
  executor: baseExecutor,
  onSubgraphExecuteHooks,
  subgraphName,
  transportEntryMap,
  getSubgraphSchema,
  transportContext,
  instrumentation,
}: WrapExecuteWithHooksOptions): Executor {
  function executorWithHooks(baseExecutionRequest: ExecutionRequest) {
    baseExecutionRequest.info = baseExecutionRequest.info || ({} as GraphQLResolveInfo);
    baseExecutionRequest.info.executionRequest = baseExecutionRequest;
    // this rootValue will be set in the info value for field.resolvers in non-graphql requests
    // TODO: Also consider if a subgraph can ever rely on the gateway's rootValue?
    baseExecutionRequest.rootValue = {
      executionRequest: baseExecutionRequest,
    };
    // Request-scoped logger for hooks (from the execution context when present).
    const requestLog =
      baseExecutionRequest.context?.log ||
      transportContext?.log ||
      new Logger({ attrs: { subgraph: subgraphName } });
    const log = subgraphName ? requestLog.child({ subgraph: subgraphName }) : requestLog;
    if (onSubgraphExecuteHooks.length === 0) {
      return baseExecutor(baseExecutionRequest);
    }
    let executor = baseExecutor;
    let executionRequest = baseExecutionRequest;
    const onSubgraphExecuteDoneHooks: OnSubgraphExecuteDoneHook[] = [];
    return handleMaybePromise(
      () =>
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
                // Point metadata at the final request without mutating the original.
                if (executionRequest.info) {
                  executionRequest.info.executionRequest = executionRequest;
                }
                const priorRoot = executionRequest.rootValue;
                executionRequest.rootValue = {
                  ...(priorRoot != null &&
                  typeof priorRoot === 'object' &&
                  !Array.isArray(priorRoot)
                    ? priorRoot
                    : null),
                  executionRequest,
                };
              },
              executor,
              setExecutor(newExecutor) {
                log.debug('executor has been updated');
                executor = newExecutor;
              },
              log,
            }),
          onSubgraphExecuteDoneHooks,
        ),
      () => {
        if (onSubgraphExecuteDoneHooks.length === 0) {
          return executor(executionRequest);
        }
        return handleMaybePromise(
          () => executor(executionRequest),
          currentResult => {
            const executeDoneResults: OnSubgraphExecuteDoneResult[] = [];
            return handleMaybePromise(
              () =>
                iterateAsync(
                  onSubgraphExecuteDoneHooks,
                  onSubgraphExecuteDoneHook =>
                    onSubgraphExecuteDoneHook({
                      result: currentResult,
                      setResult(newResult: ExecutionResult) {
                        log.debug('overriding result with: ', newResult);
                        if (
                          isAsyncIterable(currentResult) &&
                          currentResult !== newResult &&
                          typeof (currentResult as AsyncIterableIterator<unknown>).return ===
                            'function'
                        ) {
                          // Close the abandoned subscription; ownership does not transfer.
                          void (currentResult as AsyncIterableIterator<unknown>).return?.(
                            undefined,
                          );
                        }
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
                    handleMaybePromise(
                      () =>
                        iterateAsync(onNextHooks, onNext =>
                          onNext({
                            result: currentResult,
                            setResult: res => {
                              log.debug('overriding result with: ', res);

                              currentResult = res;
                            },
                          }),
                        ),
                      () => currentResult,
                    ),
                  undefined,
                  () =>
                    onEndHooks.length === 0
                      ? undefined
                      : iterateAsync(onEndHooks, onEnd => onEnd()),
                );
              },
            );
          },
        );
      },
    );
  }

  return function instrumentedExecutor(executionRequest: ExecutionRequest) {
    const subgraphInstrument = instrumentation()?.subgraphExecute;
    return getInstrumented({ executionRequest, subgraphName }).asyncFn(
      subgraphInstrument,
      executorWithHooks,
    )(executionRequest);
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
  log: Logger;
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
  if (a === b) {
    return true;
  }
  let aStr: string;
  if (typeof a === 'string') {
    aStr = a;
  } else if (isDocumentNode(a)) {
    aStr = defaultPrintFn(a);
  } else {
    aStr = printSchemaWithDirectives(a);
  }
  let bStr: string;
  if (typeof b === 'string') {
    bStr = b;
  } else if (isDocumentNode(b)) {
    bStr = defaultPrintFn(b);
  } else {
    bStr = printSchemaWithDirectives(b);
  }
  return aStr === bStr;
}

// TODO: Fix this in GraphQL Tools
export function compareSubgraphNames(name1: string, name2: string) {
  return constantCase(name1) === constantCase(name2);
}

// Taken from https://stackoverflow.com/questions/8211744/convert-time-interval-given-in-seconds-into-more-human-readable-form
export function millisecondsToStr(milliseconds: number): string {
  // TIP: to find current time in milliseconds, use:
  // current_time_milliseconds = new Date().getTime();

  function numberEnding(number: number) {
    return number > 1 ? 's' : '';
  }

  let temp = Math.floor(milliseconds / 1000);
  const days = Math.floor((temp %= 31536000) / 86400);
  if (days) {
    return days + ' day' + numberEnding(days);
  }
  const hours = Math.floor((temp %= 86400) / 3600);
  if (hours) {
    return hours + ' hour' + numberEnding(hours);
  }
  const minutes = Math.floor((temp %= 3600) / 60);
  if (minutes) {
    return minutes + ' minute' + numberEnding(minutes);
  }
  const seconds = temp % 60;
  if (seconds) {
    return seconds + ' second' + numberEnding(seconds);
  }
  return 'less than a second'; // 'just now' //or other string you like;
}

type JoinDirective = {
  name?: string;
  graphs?: string[];
  args?: Record<string, unknown>;
};

export function getTransportEntryMapUsingFusionAndFederationDirectives(
  unifiedGraph: GraphQLSchema,
  transportEntryAdditions?: TransportEntryAdditions,
) {
  unifiedGraph = restoreExtraDirectives(unifiedGraph);
  // Mesh spec contract: reject unsupported specs.graphql-mesh.dev versions on @link.
  {
    const links =
      getDirectiveExtensions<{
        link: { url?: string };
      }>(unifiedGraph)?.link || [];
    for (const link of links) {
      const url = link?.url;
      if (typeof url !== 'string' || !url.startsWith('https://specs.graphql-mesh.dev/')) {
        continue;
      }
      // Compose stamps specs.graphql-mesh.dev (not .com).
      const mm = url.match(/^https:\/\/specs\.graphql-mesh\.dev\/([^/]+)\/(v\d+(?:\.\d+)*)\/?$/);
      if (!mm) {
        throw new Error(`@graphql-mesh/fusion-runtime: unrecognized Mesh @link URL: ${url}`);
      }
      if (mm[2] !== 'v0.1') {
        throw new Error(
          `@graphql-mesh/fusion-runtime: unsupported Mesh spec "${mm[1]}" version ${mm[2]} (supported: v0.1). Found: ${url}`,
        );
      }
    }
  }
  const transportEntryMap: Record<string, TransportEntry> = {};
  const joinGraph = unifiedGraph.getType('join__Graph');
  const schemaDirectives = getDirectiveExtensions<{
    transport: TransportEntry;
    join__directive: JoinDirective;
  }>(unifiedGraph);
  const graphEnumToName: Record<string, string> = {};
  if (isEnumType(joinGraph)) {
    for (const enumValue of joinGraph.getValues()) {
      const enumValueDirectives = getDirectiveExtensions<{
        join__graph: {
          name: string;
          url?: string;
        };
      }>(enumValue);
      if (enumValueDirectives?.join__graph?.length) {
        for (const joinGraphDirective of enumValueDirectives.join__graph) {
          if (joinGraphDirective.name) {
            graphEnumToName[enumValue.name] = joinGraphDirective.name;
          }
          if (joinGraphDirective.url) {
            transportEntryMap[joinGraphDirective.name] = {
              subgraph: joinGraphDirective.name,
              kind: 'http',
              location: joinGraphDirective.url,
            };
          }
        }
      }
    }
  }
  if (schemaDirectives?.transport?.length) {
    for (const transportDirective of schemaDirectives.transport) {
      const existing = transportEntryMap[transportDirective.subgraph] || {
        subgraph: transportDirective.subgraph,
        kind: 'http',
      };
      transportEntryMap[transportDirective.subgraph] = {
        ...existing,
        ...transportDirective,
        subgraph: transportDirective.subgraph,
        kind: transportDirective.kind ?? existing.kind ?? 'http',
        location: transportDirective.location ?? existing.location,
      };
    }
  }
  // Mesh Compose rewrites schema `@transport` → `@join__directive(name: "transport")`.
  const graphsWithConnect = new Set<string>();
  function rememberGraphs(graphs: string[] | undefined) {
    for (const graphEnum of graphs || []) {
      graphsWithConnect.add(graphEnumToName[graphEnum] || graphEnum);
    }
  }
  function applyJoinTransportDirective(dir: JoinDirective | undefined) {
    if (!dir || typeof dir !== 'object') {
      return;
    }
    if (dir.name === 'transport') {
      const args =
        dir.args && typeof dir.args === 'object' ? (dir.args as Partial<TransportEntry>) : {};
      for (const graphEnum of dir.graphs || []) {
        const subgraphName = graphEnumToName[graphEnum] || graphEnum;
        const existing = transportEntryMap[subgraphName] || {
          subgraph: subgraphName,
          kind: 'http',
        };
        transportEntryMap[subgraphName] = {
          ...existing,
          ...args,
          subgraph: subgraphName,
          kind: args.kind ?? existing.kind ?? 'http',
          location: args.location ?? existing.location,
        };
      }
      return;
    }
    // Connectors `@connect` on fields/schema.
    if (dir.name === 'connect') {
      rememberGraphs(dir.graphs);
      return;
    }
    // Connectors SCHEMA `@source` carries `http.baseURL`. Mesh stitching
    // `@source` / `@meshSource` (rename) is also join-ified as name "source" /
    // "meshSource" on types/fields - those must NOT flip transport to connect.
    if (dir.name === 'source') {
      const baseURL = (dir.args as { http?: { baseURL?: string } } | undefined)?.http?.baseURL;
      if (typeof baseURL !== 'string') {
        return;
      }
      rememberGraphs(dir.graphs);
      for (const graphEnum of dir.graphs || []) {
        const subgraphName = graphEnumToName[graphEnum] || graphEnum;
        // Connectors may omit `join__graph(url:)` and rely on SCHEMA `@source`
        // `http.baseURL` for location - seed the entry when missing.
        const existing = transportEntryMap[subgraphName] || {
          subgraph: subgraphName,
          kind: 'http',
        };
        if (!existing.location) {
          existing.location = baseURL;
        }
        transportEntryMap[subgraphName] = existing;
      }
    }
  }
  for (const dir of schemaDirectives?.join__directive || []) {
    applyJoinTransportDirective(dir);
  }
  for (const type of Object.values(unifiedGraph.getTypeMap())) {
    if (!type || type.name?.startsWith('__')) {
      continue;
    }
    for (const dir of getDirectiveExtensions<{
      join__directive: JoinDirective;
    }>(type)?.join__directive || []) {
      applyJoinTransportDirective(dir);
    }
    if (isObjectType(type) || isInterfaceType(type)) {
      for (const field of Object.values(type.getFields())) {
        for (const dir of getDirectiveExtensions<{
          join__directive: JoinDirective;
        }>(field)?.join__directive || []) {
          applyJoinTransportDirective(dir);
        }
      }
    }
  }
  // Connectors `@connect` / SCHEMA `@source` imply `kind: "connect"` - no Mesh
  // `@transport` needed. Selection-only / virtual connectors may have empty
  // `join__graph(url:)` (no SCHEMA `@source`), so they never get a join-url
  // seed entry - still create connect transport.
  for (const subgraphName of graphsWithConnect) {
    const entry: TransportEntry = transportEntryMap[subgraphName] || {
      subgraph: subgraphName,
      kind: 'http',
    };
    if (!entry.kind || entry.kind === 'http') {
      transportEntryMap[subgraphName] = {
        ...entry,
        subgraph: subgraphName,
        kind: 'connect',
      };
    }
  }
  if (transportEntryAdditions) {
    const wildcardTransportOptions = transportEntryAdditions['*'];
    for (const subgraphName in transportEntryMap) {
      const toBeMerged: Partial<TransportEntry>[] = [];
      const transportEntry = transportEntryMap[subgraphName];
      if (transportEntry) {
        toBeMerged.push(transportEntry);
      }
      const transportOptionBySubgraph = transportEntryAdditions[subgraphName];
      if (transportOptionBySubgraph) {
        toBeMerged.push(transportOptionBySubgraph);
      }
      const transportOptionByKind = transportEntryAdditions['*.' + transportEntry?.kind];
      if (transportOptionByKind) {
        toBeMerged.push(transportOptionByKind);
      }
      if (wildcardTransportOptions) {
        toBeMerged.push(wildcardTransportOptions);
      }
      transportEntryMap[subgraphName] = mergeDeep(toBeMerged);
    }
  }
  // Do not write resolved transport overrides back onto the input schema —
  // other callers still resolve locations from their own config / join__graph.
  return transportEntryMap;
}
