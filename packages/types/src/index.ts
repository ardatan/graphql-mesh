/* eslint-disable @typescript-eslint/no-misused-new */
import { IResolvers } from '@graphql-tools/utils';
import { GraphQLSchema, GraphQLResolveInfo, DocumentNode, ExecutionArgs, ExecutionResult } from 'graphql';
import * as YamlConfig from './config';
import { KeyValueCache, KeyValueCacheSetOptions } from 'fetchache';
import { Executor, Transform, MergedTypeConfig } from '@graphql-tools/delegate';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { MeshStore } from '@graphql-mesh/store';

export { default as jsonSchema } from './config-schema.json';

export { YamlConfig };

export type MeshSource<ContextType = any, InitialContext = any> = {
  schema: GraphQLSchema;
  executor?: Executor;
  contextVariables?: (keyof InitialContext)[];
  contextBuilder?: (initialContextValue: InitialContext) => Promise<ContextType>;
  batch?: boolean;
};

export type GetMeshSourceOptions<THandlerConfig> = {
  name: string;
  config: THandlerConfig;
  baseDir?: string;
  cache: KeyValueCache;
  pubsub: MeshPubSub;
  store: MeshStore;
  logger: Logger;
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
};

// Hooks
export type AllHooks = {
  destroy: void;
  resolverCalled: { resolverData: ResolverData };
  resolverDone: { resolverData: ResolverData; result: any };
  resolverError: { resolverData: ResolverData; error: Error };
  executionDone: ExecutionArgs & { executionResult: ExecutionResult };
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
  asyncIterator<THook extends HookName>(triggers: THook): AsyncIterator<AllHooks[THook]>;
}

export interface MeshTransformOptions<Config = any> {
  apiName?: string;
  config: Config;
  baseDir?: string;
  cache: KeyValueCache;
  pubsub: MeshPubSub;
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
  resolvers?: IResolvers;
  transforms?: Transform[];
}

export interface MeshMerger {
  name: string;
  getUnifiedSchema(mergerContext: MeshMergerContext): GraphQLSchema | Promise<GraphQLSchema>;
}

export type RawSourceOutput = {
  name: string;
  // TOOD: Remove globalContextBuilder and use hooks for that
  contextBuilder: null | ((initialContextValue?: any) => Promise<any>);
  schema: GraphQLSchema;
  executor?: Executor;
  transforms: MeshTransform[];
  contextVariables: (keyof any)[];
  handler: MeshHandler;
  batch: boolean;
  merge?: Record<string, MergedTypeConfig>;
};

export type GraphQLOperation<TData, TVariables> = TypedDocumentNode<TData, TVariables> | string;

export type ImportFn = (moduleId: string) => Promise<any>;

export type Logger = {
  name: string;
  log: (message: string) => void;
  warn: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
  child: (name: string) => Logger;
};
