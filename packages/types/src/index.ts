import { GraphQLSchema } from 'graphql';

// Handlers
export type MeshHandlerLibrary<
  BuildSchemaPayload = any,
  GenerateApiServicesPayload = any,
  GenerateResolversPayload = any
> = {
  buildGraphQLSchema: (options: {
    apiName: string;
    outputPath: string;
    filePathOrUrl: string;
  }) => Promise<MeshHandlerFnResult<BuildSchemaPayload>>;
  generateApiServices: (options: {
    schema: GraphQLSchema;
    payload: BuildSchemaPayload;
    apiName: string;
    outputPath: string;
  }) => Promise<GenerateApiServicesFnResult<GenerateApiServicesPayload>>;
  generateResolvers: (options: {
    schema: GraphQLSchema;
    buildSchemaPayload: BuildSchemaPayload;
    apiServicesPayload: GenerateApiServicesPayload;
    apiName: string;
    outputPath: string;
  }) => Promise<GenerateResolversFnResult<GenerateResolversPayload>>;
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
};

// Transformations
export type SchemaTransformationFn = (
  name: string,
  schema: GraphQLSchema
) => Promise<GraphQLSchema>;

export type OutputTransformationFn = (
  schema: GraphQLSchema
) => Promise<GraphQLSchema>;
