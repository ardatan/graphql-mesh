import {
  loadGraphQLSchemaFromJSONSchemas,
  loadNonExecutableGraphQLSchemaFromJSONSchemas,
} from '@omnigraph/json-schema';
import { getJSONSchemaOptionsFromRAMLOptions } from './getJSONSchemaOptionsFromRAMLOptions.js';
import type { RAMLLoaderOptions } from './types.js';

export async function loadGraphQLSchemaFromRAML(name: string, options: RAMLLoaderOptions) {
  const extraJSONSchemaOptions = await getJSONSchemaOptionsFromRAMLOptions(options);
  return loadGraphQLSchemaFromJSONSchemas(name, {
    ...options,
    ...extraJSONSchemaOptions,
  });
}

export async function loadNonExecutableGraphQLSchemaFromRAML(
  name: string,
  options: RAMLLoaderOptions,
) {
  const extraJSONSchemaOptions = await getJSONSchemaOptionsFromRAMLOptions(options);
  return loadNonExecutableGraphQLSchemaFromJSONSchemas(name, {
    ...options,
    ...extraJSONSchemaOptions,
  });
}

export { processDirectives } from '@omnigraph/json-schema';
