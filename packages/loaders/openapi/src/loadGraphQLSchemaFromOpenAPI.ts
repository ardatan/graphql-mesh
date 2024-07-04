import {
  loadGraphQLSchemaFromJSONSchemas,
  loadNonExecutableGraphQLSchemaFromJSONSchemas,
} from '@omnigraph/json-schema';
import { getJSONSchemaOptionsFromOpenAPIOptions } from './getJSONSchemaOptionsFromOpenAPIOptions.js';
import type { OpenAPILoaderOptions } from './types.js';

/**
 * Creates a local GraphQLSchema instance from a OpenAPI Document.
 * Everytime this function is called, the OpenAPI file and its dependencies will be resolved on runtime.
 * If you want to avoid this, use `createBundle` function to create a bundle once and save it to a storage
 * then load it with `loadGraphQLSchemaFromBundle`.
 */
export async function loadGraphQLSchemaFromOpenAPI(name: string, options: OpenAPILoaderOptions) {
  const extraJSONSchemaOptions = await getJSONSchemaOptionsFromOpenAPIOptions(name, options);
  return loadGraphQLSchemaFromJSONSchemas(name, {
    ...options,
    ...extraJSONSchemaOptions,
  });
}

export async function loadNonExecutableGraphQLSchemaFromOpenAPI(
  name: string,
  options: OpenAPILoaderOptions,
) {
  const extraJSONSchemaOptions = await getJSONSchemaOptionsFromOpenAPIOptions(name, options);
  return loadNonExecutableGraphQLSchemaFromJSONSchemas(name, {
    ...options,
    ...extraJSONSchemaOptions,
  });
}

export { processDirectives } from '@omnigraph/json-schema';
