import { loadGraphQLSchemaFromJSONSchemas } from '@omnigraph/json-schema';
import { OpenAPILoaderOptions } from '.';
import { getJSONSchemaOptionsFromOpenAPIOptions } from './getJSONSchemaOptionsFromOpenAPIOptions';

/**
 * Creates a local GraphQLSchema instance from a OpenAPI Document.
 * Everytime this function is called, the OpenAPI file and its dependencies will be resolved on runtime.
 * If you want to avoid this, use `createBundle` function to create a bundle once and save it to a storage
 * then load it with `loadGraphQLSchemaFromBundle`.
 */
export async function loadGraphQLSchemaFromOpenAPI(name: string, options: OpenAPILoaderOptions) {
  const extraJSONSchemaOptions = await getJSONSchemaOptionsFromOpenAPIOptions(options);
  return loadGraphQLSchemaFromJSONSchemas(name, {
    ...options,
    ...extraJSONSchemaOptions,
  });
}
