/* eslint-disable @typescript-eslint/no-misused-new */
import { IResolvers } from '@graphql-tools/utils';
import { GraphQLSchema, GraphQLResolveInfo, DocumentNode } from 'graphql';
import * as YamlConfig from './config';
import { KeyValueCache, KeyValueCacheSetOptions } from 'fetchache';
import { Executor, Subscriber, Transform } from '@graphql-tools/delegate';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';

export { YamlConfig };

export function getJsonSchema() {
  return require('./config-schema.json');
}

export type MeshSource<ContextType = any, InitialContext = any> = {
  schema: GraphQLSchema;
  executor?: Executor;
  subscriber?: Subscriber;
  contextVariables?: (keyof InitialContext)[];
  contextBuilder?: (initialContextValue: InitialContext) => Promise<ContextType>;
  batch?: boolean;
};

export type GetMeshSourceOptions<THandlerConfig> = {
  name: string;
  pubsub: MeshPubSub;
  config: THandlerConfig;
  cache: KeyValueCache;
};

// Handlers
export interface MeshHandler<TContext = any> {
  getMeshSource: () => Promise<MeshSource<TContext>>;
}

export interface MeshHandlerLibrary<TConfig = any, TContext = any> {
  new (options: GetMeshSourceOptions<TConfig>): MeshHandler<TContext>;
}

export type ResolverData<TParent = any, TArgs = any, TContext = any> = {
  root?: TParent;
  args?: TArgs;
  context?: TContext;
  info?: GraphQLResolveInfo;
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
  asyncIterator<THook extends HookName>(triggers: THook): AsyncIterator<AllHooks[THook]>;
}

export interface MeshTransformOptions<Config = any> {
  config: Config;
  cache: KeyValueCache;
  pubsub: MeshPubSub;
  apiName?: string;
}

export interface MeshTransformLibrary<Config = any> {
  new (options: MeshTransformOptions<Config>): MeshTransform;
}

export interface MeshTransform extends Transform {
  noWrap?: boolean;
}

export type Maybe<T> = null | undefined | T;

export { KeyValueCache, KeyValueCacheSetOptions };

export type MergerFn = (options: {
  rawSources: RawSourceOutput[];
  cache: KeyValueCache;
  pubsub: MeshPubSub;
  typeDefs?: DocumentNode[];
  resolvers?: IResolvers;
  transforms?: Transform[];
  executor?: Executor;
}) => Promise<GraphQLSchema> | GraphQLSchema;

export type RawSourceOutput = {
  name: string;
  // TOOD: Remove globalContextBuilder and use hooks for that
  contextBuilder: null | ((initialContextValue?: any) => Promise<any>);
  schema: GraphQLSchema;
  executor?: Executor;
  subscriber?: Subscriber;
  transforms: MeshTransform[];
  contextVariables: (keyof any)[];
  handler: MeshHandler;
  batch: boolean;
};

export type GraphQLOperation<TData, TVariables> = TypedDocumentNode<TData, TVariables> | string;

export type ImportFn = (moduleId: string) => Promise<any>;
