import { EventEmitter } from 'tsee';
import { GraphQLSchema, GraphQLFieldResolver } from 'graphql';
import * as YamlConfig from './config';

export { YamlConfig };

export type MeshSource<ContextType = any> = {
  schema: GraphQLSchema;
  contextVariables?: string[];
  contextBuilder?: () => Promise<ContextType>;
};

export type GetMeshSourceOptions<TConfig> = {
  filePathOrUrl: string;
  name: string;
  hooks: Hooks;
  config: TConfig;
};

// Handlers
export declare type MeshHandlerLibrary<TConfig = any, TContext = any> = {
  getMeshSource: (
    options: GetMeshSourceOptions<TConfig>
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
};
export class Hooks extends EventEmitter<AllHooks> {}
export type HooksKeys = keyof AllHooks;

// Transform
export type TransformFn<Config extends { type: string } = any> = (options: {
  schema: GraphQLSchema;
  config: Config;
  apiName?: string;
}) => Promise<GraphQLSchema> | GraphQLSchema;
