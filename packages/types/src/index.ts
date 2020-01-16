import { GraphQLSchema } from 'graphql';

// Handlers
export type MeshHandlerLibrary<
  BuildSchemaPayload = any,
  GenerateApiServicesPayload = any
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
  }) => Promise<void>;
};

export type MeshHandlerFnResult<SdkPayload = any> = {
  payload: SdkPayload;
  schema: GraphQLSchema;
};

export type GenerateApiServicesFnResult<GenerateApiServicesPayload = any> = {
  payload: GenerateApiServicesPayload;
};

// Transformations
export type SchemaTransformationFn = (
  name: string,
  schema: GraphQLSchema
) => Promise<GraphQLSchema>;

export type OutputTransformationFn = (
  schema: GraphQLSchema
) => Promise<GraphQLSchema>;
