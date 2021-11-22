import { JSONSchemaLoaderOptions, loadGraphQLSchemaFromJSONSchemas } from '@omnigraph/json-schema';
import { getJSONSchemaOptionsFromRAMLOptions } from './getJSONSchemaOptionsFromRAMLOptions';

export interface RAMLLoaderOptions extends Partial<JSONSchemaLoaderOptions> {
  ramlFilePath: string;
}

export async function loadGraphQLSchemaFromRAML(name: string, options: RAMLLoaderOptions) {
  const extraJSONSchemaOptions = await getJSONSchemaOptionsFromRAMLOptions(options);
  return loadGraphQLSchemaFromJSONSchemas(name, {
    ...options,
    ...extraJSONSchemaOptions,
  });
}
