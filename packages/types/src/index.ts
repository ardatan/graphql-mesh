import { GraphQLSchema } from 'graphql';
import * as YamlConfig from './config';

export { YamlConfig };

export type MeshSource = {
  name: string;
  source: string;
  schema: GraphQLSchema;
  sdk: Record<string, any> | ((context: any) => Record<string, any>);
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
  config?: TConfig;
};

// Handlers
export declare type MeshHandlerLibrary<TConfig = any, TPayload = any> = {
  getMeshSource: (
    options: GetMeshSourceOptions<TConfig>
  ) => Promise<{ source: MeshSource; payload: TPayload }>;
  tsSupport?: (options: TsSupportOptions<TPayload>) => Promise<TsSupportOutput>;
};

// Transform
export type TransformFn<
  Config extends { type: string } = any
> = (options: {
  schema: GraphQLSchema;
  config: Config;
  apiName?: string;
}) => Promise<GraphQLSchema> | GraphQLSchema;
