/* eslint-disable @typescript-eslint/no-misused-new */
import { IResolvers, Executor } from '@graphql-tools/utils';
import { GraphQLSchema, GraphQLResolveInfo, DocumentNode, SelectionSetNode } from 'graphql';
import * as YamlConfig from './config';
import { KeyValueCache, KeyValueCacheSetOptions } from 'fetchache';
import { Transform, MergedTypeConfig } from '@graphql-tools/delegate';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { MeshStore } from '@graphql-mesh/store';
import configSchema from './config-schema.json';

export const jsonSchema: any = configSchema;

export { YamlConfig };

export type MeshSource<ContextType = any, InitialContext = any> = {
  schema: GraphQLSchema;
  executor?: Executor;
  contextVariables?: (keyof InitialContext)[];
  batch?: boolean;
};

export type GetMeshSourceOptions<THandlerConfig> = {
  name: string;
  config: THandlerConfig;
  baseDir: string;
  cache: KeyValueCache;
  pubsub: MeshPubSub;
  store: MeshStore;
  logger: Logger;
  importFn: ImportFn;
};

// Handlers
export interface MeshHandler<TContext = any> {
  getMeshSource: () => Promise<MeshSource<TContext>>;
}

export interface MeshHandlerLibrary<TConfig = any, TContext = any> {
  new (options: GetMeshSourceOptions<TConfig>): MeshHandler<TContext>;
}

export type ResolverData<TParent = any, TArgs = any, TContext = any, TResult = any> = {
  root?: TParent;
  args?: TArgs;
  context?: TContext;
  info?: GraphQLResolveInfo;
  result?: TResult;
  env: Record<string, string>;
};

// Hooks
export type AllHooks = {
  destroy: void;
  resolverCalled: { resolverData: ResolverData };
  resolverDone: { resolverData: ResolverData; result: any };
  resolverError: { resolverData: ResolverData; error: Error };
  [key: string]: any;
};
export type HookName = keyof AllHooks & string;

export interface MeshPubSub {
  publish<THook extends HookName>(triggerName: THook, payload: AllHooks[THook]): Promise<void>;
  subscribe<THook extends HookName>(
    triggerName: THook,
    onMessage: (data: AllHooks[THook]) => void,
    options?: any
  ): Promise<number>;
  unsubscribe(subId: number): void;
  asyncIterator<THook extends HookName>(triggers: THook): AsyncIterable<AllHooks[THook]>;
}

export interface MeshTransformOptions<Config = any> {
  apiName: string;
  config: Config;
  baseDir: string;
  cache: KeyValueCache;
  pubsub: MeshPubSub;
  importFn: ImportFn;
}

export interface MeshTransformLibrary<Config = any> {
  new (options: MeshTransformOptions<Config>): MeshTransform;
}

export interface MeshTransform extends Transform {
  noWrap?: boolean;
}

export type Maybe<T> = null | undefined | T;

export { KeyValueCache, KeyValueCacheSetOptions };

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
  transforms?: Transform[];
}

export interface MeshMerger {
  name: string;
  getUnifiedSchema(mergerContext: MeshMergerContext): GraphQLSchema | Promise<GraphQLSchema>;
}

export type RawSourceOutput = {
  name: string;
  schema: GraphQLSchema;
  executor?: Executor;
  transforms: MeshTransform[];
  contextVariables: (keyof any)[];
  handler: MeshHandler;
  batch: boolean;
  merge?: Record<string, MergedTypeConfig>;
};

export type GraphQLOperation<TData, TVariables> = TypedDocumentNode<TData, TVariables> | string;

export type ImportFn = <T = any>(moduleId: string) => Promise<T>;

export type LazyLoggerMessage = (() => string) | string;

export type Logger = {
  name?: string;
  log: (message: string) => void;
  warn: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
  debug: (message: LazyLoggerMessage) => void;
  child: (name: string) => Logger;
};

export type SelectionSetParam = SelectionSetNode | DocumentNode | string | SelectionSetNode;
export type SelectionSetParamOrFactory = ((subtree: SelectionSetNode) => SelectionSetParam) | SelectionSetParam;

export type InContextSdkMethodBatchingParams<TDefaultReturn, TArgs, TKey, TReturn> = {
  key: TKey;
  argsFromKeys: (keys: TKey[]) => TArgs;
  valuesFromResults?: (results: TDefaultReturn, keys: TKey[]) => TReturn | TReturn[];
};

export type InContextSdkMethodRegularParams<TDefaultReturn, TArgs, TReturn> = {
  args?: TArgs;
  valuesFromResults?: (results: TDefaultReturn) => TReturn | TReturn[];
};

export type InContextSdkMethodParams<TDefaultReturn, TArgs, TContext, TKey, TReturn> = {
  root?: any;
  context: TContext;
  info: GraphQLResolveInfo;
  // Use this parameter if the selection set of the return type doesn't match
  selectionSet?: SelectionSetParamOrFactory;
} & (
  | InContextSdkMethodBatchingParams<TDefaultReturn, TArgs, TKey, TReturn>
  | InContextSdkMethodRegularParams<TDefaultReturn, TArgs, TReturn>
);

export type InContextSdkMethod<TDefaultReturn = any, TArgs = any, TContext = any> = <TKey, TReturn = TDefaultReturn>(
  params: InContextSdkMethodParams<TDefaultReturn, TArgs, TContext, TKey, TReturn>
) => Promise<TReturn>;
