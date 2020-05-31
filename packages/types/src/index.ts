import { IResolvers } from '@graphql-tools/utils';
import { IEventEmitter } from 'tsee';
import { GraphQLSchema, GraphQLResolveInfo, DocumentNode } from 'graphql';
import * as YamlConfig from './config';
import { KeyValueCache, KeyValueCacheSetOptions } from 'fetchache';

export { YamlConfig };

export function getJsonSchema() {
  return require('./config-schema.json');
}

export type MeshSource<ContextType = any, InitialContext = any> = {
  schema: GraphQLSchema;
  contextVariables?: (keyof InitialContext)[];
  contextBuilder?: (initialContextValue: InitialContext) => Promise<ContextType>;
};

export type GetMeshSourceOptions<THandlerConfig> = {
  name: string;
  hooks: Hooks;
  config: THandlerConfig;
  cache: KeyValueCache;
};

// Handlers
export declare type MeshHandlerLibrary<THandlerConfig = any, TContext = any> = {
  getMeshSource: (options: GetMeshSourceOptions<THandlerConfig>) => Promise<MeshSource<TContext>>;
};

export type ResolverData<TParent = any, TArgs = any, TContext = any> = {
  root?: TParent;
  args?: TArgs;
  context?: TContext;
  info?: GraphQLResolveInfo;
};

// Hooks
export type AllHooks = {
  schemaReady: (options: { schema: GraphQLSchema; applyResolvers: (modifiedResolvers: IResolvers) => void }) => void;
  destroy: () => void;
  resolverCalled: (resolverData: ResolverData) => void;
  resolverDone: (resolverData: ResolverData, result: any) => void;
  resolverError: (resolverData: ResolverData, error: Error) => void;
};
export type Hooks = IEventEmitter<AllHooks>;
export type HooksKeys = keyof AllHooks;

export type TransformFn<Config = any> = (options: {
  schema: GraphQLSchema;
  config: Config;
  cache: KeyValueCache;
  hooks: Hooks;
  apiName?: string;
}) => Promise<GraphQLSchema> | GraphQLSchema;

export type Maybe<T> = null | undefined | T;

export { KeyValueCache, KeyValueCacheSetOptions };

export type MergerFn = (options: {
  rawSources: RawSourceOutput[];
  cache: KeyValueCache;
  hooks: Hooks;
  typeDefs: DocumentNode[];
  resolvers: IResolvers;
}) => Promise<GraphQLSchema> | GraphQLSchema;

export type RawSourceOutput = {
  name: string;
  // TOOD: Remove globalContextBuilder and use hooks for that
  globalContextBuilder: null | ((initialContextValue?: any) => Promise<any>);
  schema: GraphQLSchema;
  context: Record<string, any>;
  contextVariables: (keyof any)[];
  handler: MeshHandlerLibrary;
};
