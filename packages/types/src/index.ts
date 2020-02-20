import { GraphQLSchema } from 'graphql';

export type MeshSource = {
  name: string;
  source: string;
  schema: GraphQLSchema;
  sdk: Record<string, any>;
};

export type GetMeshSourceOptions<TConfig> = {
  filePathOrUrl: string;
  name: string;
  config?: TConfig;
};

// Handlers
export type MeshHandlerLibrary<TConfig = any> = {
  getMeshSource: (
    options: GetMeshSourceOptions<TConfig>
  ) => Promise<MeshSource>;
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
