import { IResolvers } from 'graphql-tools-fork';
import { EventEmitter } from 'tsee';
import {
  GraphQLSchema,
  GraphQLFieldResolver,
  GraphQLResolveInfo
} from 'graphql';
import * as YamlConfig from './config';
import { KeyValueCache, KeyValueCacheSetOptions } from 'fetchache';

export { YamlConfig };

export type MeshSource<ContextType = any> = {
  schema: GraphQLSchema;
  contextVariables?: string[];
  contextBuilder?: () => Promise<ContextType>;
};

export type GetMeshSourceOptions<THandlerConfig> = {
  name: string;
  hooks: Hooks;
  config: THandlerConfig;
  cache: KeyValueCache;
};

// Handlers
export declare type MeshHandlerLibrary<THandlerConfig = any, TContext = any> = {
  getMeshSource: (
    options: GetMeshSourceOptions<THandlerConfig>
  ) => Promise<MeshSource<TContext>>;
};

export type ResolverInfo = {
  parent: any;
  args: any;
  context: any;
  info: GraphQLResolveInfo;
};

// Hooks
export type AllHooks = {
  schemaReady: (options: {
    schema: GraphQLSchema;
    applyResolvers: (modifiedResolvers: IResolvers) => void;
  }) => void;
  buildSdkFn: (options: {
    schema: GraphQLSchema;
    typeName: string;
    fieldName: string;
    originalResolveFn?: GraphQLFieldResolver<any, any>;
    replaceFn: (fn: Function) => void;
  }) => void;
  destroy: () => void;
  resolverCalled: (resolverInfo: ResolverInfo) => void;
  resolverDone: (resolverInfo: ResolverInfo, result: any) => void;
  resolverError: (resolverInfo: ResolverInfo, error: Error) => void;
};
export class Hooks extends EventEmitter<AllHooks> {}
export type HooksKeys = keyof AllHooks;

export type TransformFn<Config = any> = (options: {
  schema: GraphQLSchema;
  config: Config;
  cache: KeyValueCache;
  hooks: Hooks;
  apiName?: string;
}) => Promise<GraphQLSchema | void> | GraphQLSchema | void;

export { KeyValueCache, KeyValueCacheSetOptions };
