import { EventEmitter } from 'tsee';
import { GraphQLSchema } from 'graphql';
import * as YamlConfig from './config';

export { YamlConfig };

export type MeshSource<ContextType = any> = {
  name: string;
  source: string;
  schema: GraphQLSchema;
  contextBuilder?: () => Promise<ContextType>;
  sdk?: Record<string, any> | ((context: any) => Record<string, any>);
};

/* Temporary TS Support */
export declare type TsSupportOptions<TPayload> = {
  name: string;
  schema: GraphQLSchema;
  getMeshSourcePayload: TPayload;
};

export type TsSupportOutput = {
  sdk?: ExportedTSType;
  context?: ExportedTSType;
  models?: string;
};

export type ExportedTSType = {
  identifier: string;
  codeAst: string;
};

export type GetMeshSourceOptions<TConfig> = {
  filePathOrUrl: string;
  name: string;
  hooks: Hooks;
  config?: TConfig;
};

// Handlers
export declare type MeshHandlerLibrary<
  TConfig = any,
  TPayload = any,
  TContext = any
> = {
  getMeshSource: (
    options: GetMeshSourceOptions<TConfig>
  ) => Promise<{
    source: MeshSource<TContext>;
    payload: TPayload;
  }>;
  tsSupport?: (options: TsSupportOptions<TPayload>) => Promise<TsSupportOutput>;
};

// Hooks
export type AllHooks = {
  schemaReady: (schema: GraphQLSchema) => void;
};
export class Hooks extends EventEmitter<AllHooks> {}
export type HooksKeys = keyof AllHooks;

// Transform
export type TransformFn<Config extends { type: string } = any> = (options: {
  schema: GraphQLSchema;
  config: Config;
  apiName?: string;
}) => Promise<GraphQLSchema> | GraphQLSchema;
