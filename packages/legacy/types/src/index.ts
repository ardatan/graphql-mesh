/* eslint-disable @typescript-eslint/no-misused-new */
import type { DocumentNode, GraphQLResolveInfo, GraphQLSchema, SelectionSetNode } from 'graphql';
import type { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue.js';
import type { Plugin } from '@envelop/core';
import type { PubSub as HivePubSub } from '@graphql-hive/pubsub';
import { MeshPubSub as HiveMeshPubSub } from '@graphql-hive/pubsub/mesh';
import type { MeshStore } from '@graphql-mesh/store';
import type { BatchDelegateOptions } from '@graphql-tools/batch-delegate';
import type {
  CreateProxyingResolverFn,
  IDelegateToSchemaOptions,
  MergedTypeConfig,
  SubschemaConfig,
  Transform,
} from '@graphql-tools/delegate';
import type { ExecutionRequest, Executor, IResolvers, MaybePromise } from '@graphql-tools/utils';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import * as YamlConfig from './config.js';

export { jsonSchema } from './config-schema.js';

export { YamlConfig };

export type MeshSource = {
  schema: GraphQLSchema;
  executor?: Executor;
  contextVariables?: Record<string, string>;
  batch?: boolean;
  merge?: Record<string, MergedTypeConfig>;
};

export interface KeyValueCacheSetOptions {
  /**
   * Specified in **seconds**, the time-to-live (TTL) value limits the lifespan
   * of the data being stored in the cache.
   */
  ttl?: number | null;
}
export interface KeyValueCache<V = any> {
  get(key: string): MaybePromise<V | undefined>;
  set(key: string, value: V, options?: KeyValueCacheSetOptions): MaybePromise<void>;
  delete(key: string): MaybePromise<boolean>;
  getKeysByPrefix(prefix: string): MaybePromise<string[]>;
}

export type MeshHandlerOptions<THandlerConfig> = {
  name: string;
  config: THandlerConfig;
  baseDir: string;
  cache: KeyValueCache;
  pubsub: MeshPubSub;
  store: MeshStore;
  logger: Logger;
  importFn: ImportFn;
};

export type GetMeshSourcePayload = {
  fetchFn: MeshFetch;
};

// Handlers
export interface MeshHandler {
  getMeshSource: (payload: GetMeshSourcePayload) => Promise<MeshSource>;
}

export interface MeshHandlerLibrary<TConfig = any> {
  new (options: MeshHandlerOptions<TConfig>): MeshHandler;
}

// Hooks
export type AllHooks = {
  destroy: void;
  [key: string]: any;
};
export type HookName = keyof AllHooks & string;

export interface MeshPubSub {
  publish<THook extends HookName>(triggerName: THook, payload: AllHooks[THook]): void;
  subscribe<THook extends HookName>(
    triggerName: THook,
    onMessage: (data: AllHooks[THook]) => void,
    options?: any,
  ): number;
  unsubscribe(subId: number): void;
  getEventNames(): Iterable<string>;
  asyncIterator<THook extends HookName>(triggers: THook): AsyncIterable<AllHooks[THook]>;
}

export type { HivePubSub };

/**
 * Checks whether the provided {@link pubsub} is a {@link HivePubSub}. It is only
 * accurate when dealing with `@graphql-hive/pubsub` v2 and above.
 */
export function isHivePubSub(pubsub: undefined | MeshPubSub | HivePubSub): pubsub is HivePubSub {
  // HivePubSub does not have asyncIterator method. this only applies for @graphql-hive/pubsub v2+
  return !('asyncIterator' in pubsub);
}

const meshForHibePubSub = new WeakMap<HivePubSub, MeshPubSub>();

/**
 * A utility function ensuring the provided {@link pubsub} is always the legacy {@link MeshPubSub}.
 * It does so by converting a {@link HivePubSub} to a {@link MeshPubSub} if provided, or leaving it
 * as is if it's already a {@link MeshPubSub}.
 *
 * Internally uses a WeakMap to cache the conversion for performance and to avoid creating too many
 * unnecessary instances if called multiple times.
 */
export function toMeshPubSub(pubsub: undefined): undefined;
export function toMeshPubSub(pubsub: MeshPubSub): MeshPubSub;
export function toMeshPubSub(pubsub: HivePubSub): MeshPubSub;
export function toMeshPubSub(pubsub: HivePubSub | MeshPubSub): MeshPubSub;
export function toMeshPubSub(pubsub: HivePubSub | MeshPubSub | undefined): MeshPubSub | undefined;
export function toMeshPubSub(pubsub?: MeshPubSub | HivePubSub | undefined): MeshPubSub | undefined {
  if (isHivePubSub(pubsub)) {
    let hivePubsub = meshForHibePubSub.get(pubsub);
    if (hivePubsub) {
      return hivePubsub;
    }
    hivePubsub = HiveMeshPubSub.from(pubsub);
    meshForHibePubSub.set(pubsub, hivePubsub);
    return hivePubsub;
  }
  return pubsub;
}

export interface MeshTransformOptions<Config = any> {
  apiName: string;
  config: Config;
  baseDir: string;
  cache: KeyValueCache;
  pubsub: MeshPubSub;
  importFn: ImportFn;
  logger: Logger;
}

export interface MeshTransformLibrary<Config = any> {
  new (options: MeshTransformOptions<Config>): MeshTransform;
}

export interface MeshTransform<T = any> extends Transform<T> {
  noWrap?: boolean;
}

export type Maybe<T> = null | undefined | T;

export interface MeshMergerOptions {
  cache: KeyValueCache;
  pubsub: MeshPubSub;
  logger: Logger;
  store: MeshStore;
}

export interface MeshMergerLibrary {
  new (options: MeshMergerOptions): MeshMerger;
}

export interface MeshMergerContext {
  rawSources: RawSourceOutput[];
  typeDefs?: DocumentNode[];
  resolvers?: IResolvers | IResolvers[];
}

export interface MeshMerger {
  name: string;
  getUnifiedSchema(mergerContext: MeshMergerContext): SubschemaConfig | Promise<SubschemaConfig>;
}

export type MeshPluginOptions<TConfig> = TConfig & {
  logger: Logger;
  cache: KeyValueCache;
  pubsub: MeshPubSub;
  baseDir: string;
  importFn: ImportFn;
};

export type MeshPluginFactory<TConfig> = (options: MeshPluginOptions<TConfig>) => Plugin;

export type OnDelegateHookPayload<TContext> = Partial<BatchDelegateOptions<TContext>> &
  Partial<IDelegateToSchemaOptions<TContext>> & {
    sourceName: string;
    typeName: string;
    fieldName: string;
  };

export type OnDelegateHook<TContext> = (
  payload: OnDelegateHookPayload<TContext>,
) => PromiseOrValue<OnDelegateHookDone | void>;

export type OnDelegateHookDonePayload = {
  result: any;
  setResult: (result: any) => void;
};

export type OnDelegateHookDone = (payload: OnDelegateHookDonePayload) => PromiseOrValue<void>;

export type MeshPlugin<TContext> = Plugin<TContext> & {
  onFetch?: OnFetchHook<TContext>;
  onDelegate?: OnDelegateHook<TContext>;
  [Symbol.asyncDispose]?: () => PromiseLike<void> | void;
};

export type MeshFetch = (
  url: string,
  options?: MeshFetchRequestInit,
  context?: any,
  info?: GraphQLResolveInfo,
) => MaybePromise<Response>;

export type MeshFetchRequestInit = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

export interface OnFetchHookPayload<TContext> {
  url: string;
  setURL(url: URL | string): void;
  options: MeshFetchRequestInit;
  setOptions(options: MeshFetchRequestInit): void;
  context: TContext;
  info: GraphQLResolveInfo;
  fetchFn: MeshFetch;
  setFetchFn: (fetchFn: MeshFetch) => void;
  executionRequest?: ExecutionRequest;
  logger: Logger;
  requestId?: string;
  endResponse: (response$: MaybePromise<Response>) => void;
}

export interface OnFetchHookDonePayload {
  response: Response;
  setResponse: (response: Response) => void;
}

export type OnFetchHookDone = (payload: OnFetchHookDonePayload) => MaybePromise<void>;

export type OnFetchHook<TContext> = (
  payload: OnFetchHookPayload<TContext>,
) => MaybePromise<void | OnFetchHookDone>;

export type RawSourceOutput = {
  name: string;
  schema: GraphQLSchema;
  executor?: Executor;
  transforms: MeshTransform[];
  contextVariables: Record<string, string>;
  handler: MeshHandler;
  batch: boolean;
  merge?: Record<string, MergedTypeConfig>;
  createProxyingResolver: CreateProxyingResolverFn<any>;
};

export type GraphQLOperation<TData, TVariables> = TypedDocumentNode<TData, TVariables> | string;

export type ImportFn = <T = any>(moduleId: string, noCache?: boolean) => Promise<T>;

export type LazyLoggerMessage = (() => any | any[]) | any;

export type Logger = {
  name?: string;
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...lazyArgs: LazyLoggerMessage[]) => void;
  child: (name: string | Record<string, string | number>) => Logger;
  addPrefix?: (prefix: string | Record<string, string | number>) => Logger;
};

export type SelectionSetParam = SelectionSetNode | DocumentNode | string | SelectionSetNode;
export type SelectionSetParamOrFactory =
  | ((subtree: SelectionSetNode) => SelectionSetParam)
  | SelectionSetParam;

export type InContextSdkMethodBatchingParams<TDefaultReturn, TArgs, TKey, TReturn> = {
  key: TKey;
  argsFromKeys: (keys: TKey[]) => TArgs;
  valuesFromResults?: (results: TDefaultReturn, keys: TKey[]) => TReturn | TReturn[];
};

export type InContextSdkMethodRegularParams<TDefaultReturn, TArgs, TReturn> = {
  args?: TArgs;
  valuesFromResults?: (results: TDefaultReturn) => TReturn | TReturn[];
};

export type InContextSdkMethodCustomSelectionSetParams = {
  // Use this parameter if the selection set of the return type doesn't match
  selectionSet: SelectionSetParamOrFactory;
  info?: GraphQLResolveInfo;
};

export type InContextSdkMethodInfoParams = {
  info: GraphQLResolveInfo;
};

export type InContextSdkMethodAutoSelectionSetParams = {
  // Use this parameter if the selection set of the return type doesn't match
  autoSelectionSetWithDepth: number;
  info?: GraphQLResolveInfo;
};

export type InContextSdkMethodParams<TDefaultReturn, TArgs, TContext, TKey, TReturn> = {
  root?: any;
  context: TContext;
} & (
  | InContextSdkMethodCustomSelectionSetParams
  | InContextSdkMethodInfoParams
  | InContextSdkMethodAutoSelectionSetParams
) &
  (
    | InContextSdkMethodBatchingParams<TDefaultReturn, TArgs, TKey, TReturn>
    | InContextSdkMethodRegularParams<TDefaultReturn, TArgs, TReturn>
  );

export type InContextSdkMethod<TDefaultReturn = any, TArgs = any, TContext = any> = <
  TKey,
  TReturn = TDefaultReturn,
>(
  params: InContextSdkMethodParams<TDefaultReturn, TArgs, TContext, TKey, TReturn>,
) => Promise<TReturn>;
