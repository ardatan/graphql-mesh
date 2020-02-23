import { GraphQLSchema } from 'graphql';

export type MeshSource = {
  name: string;
  source: string;
  schema: GraphQLSchema;
  sdk: Record<string, any> | ((context: any) => Record<string, any>);
};

/* TS Support */
export declare type TsSupportOptions<TPayload> = {
  name: string;
  schema: GraphQLSchema,
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
export type MeshHandlerFnResult<SdkPayload = any> = {
  payload: SdkPayload;
  schema: GraphQLSchema;
};

export type GenerateApiServicesFnResult<GenerateApiServicesPayload = any> = {
  payload: GenerateApiServicesPayload;
};

export type GenerateResolversFnResult<GenerateResolversPayload = any> = {
  payload: GenerateResolversPayload;
  filePath: string;
};

// Transformations
export type SchemaTransformationFn<
  Config extends { type: string } = any
> = (options: {
  apiName: string;
  schema: GraphQLSchema;
  config: Config;
}) => Promise<GraphQLSchema>;

export type OutputTransformationFn<
  Config extends { type: string } = any
> = (options: {
  schema: GraphQLSchema;
  config: Config;
}) => Promise<GraphQLSchema>;
