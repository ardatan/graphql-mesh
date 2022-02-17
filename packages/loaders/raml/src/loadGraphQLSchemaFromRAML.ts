import { loadGraphQLSchemaFromJSONSchemas } from '@omnigraph/json-schema';
import { getJSONSchemaOptionsFromRAMLOptions } from './getJSONSchemaOptionsFromRAMLOptions';
import { RAMLLoaderOptions } from './types';

/**
 * Creates a local GraphQLSchema instance from a RAML API Document.
 * Everytime this function is called, the RAML file and its dependencies will be resolved on runtime.
 * If you want to avoid this, use `createBundle` function to create a bundle once and save it to a storage
 * then load it with `loadGraphQLSchemaFromBundle`.
 */
export async function loadGraphQLSchemaFromRAML(name: string, options: RAMLLoaderOptions) {
  const extraJSONSchemaOptions = await getJSONSchemaOptionsFromRAMLOptions(options);
  return loadGraphQLSchemaFromJSONSchemas(name, {
    ...options,
    ...extraJSONSchemaOptions,
  });
}
