import { EventEmitter } from 'tsee';
import { GraphQLSchema, GraphQLFieldResolver } from 'graphql';
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

// Hooks
export type AllHooks = {
  schemaReady: (schema: GraphQLSchema) => void;
  buildSdkFn: (options: {
    schema: GraphQLSchema;
    typeName: string;
    fieldName: string;
    originalResolveFn?: GraphQLFieldResolver<any, any>;
    replaceFn: (fn: Function) => void;
  }) => void;
  destroy: () => void;
};
export class Hooks extends EventEmitter<AllHooks> {}
export type HooksKeys = keyof AllHooks;

// Transform
export type TransformFn<Config = any> = (options: {
  schema: GraphQLSchema;
  config: Config;
  cache: KeyValueCache;
  apiName?: string;
}) => Promise<GraphQLSchema> | GraphQLSchema;

export { KeyValueCache, KeyValueCacheSetOptions };