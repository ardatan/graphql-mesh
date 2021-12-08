import {
  getGraphQLSchemaFromBundle,
  createBundle as createJSONSchemaLoaderBundle,
  JSONSchemaLoaderBundle as RAMLLoaderBundle,
} from '@omnigraph/json-schema';
import { getJSONSchemaOptionsFromRAMLOptions } from './getJSONSchemaOptionsFromRAMLOptions';
import { RAMLLoaderOptions } from './types';

/**
 * Creates a bundle by downloading and resolving the internal references once
 * to load the schema locally later
 */
export async function createBundle(name: string, ramlLoaderOptions: RAMLLoaderOptions): Promise<RAMLLoaderBundle> {
  const { operations, baseUrl, cwd, fetch } = await getJSONSchemaOptionsFromRAMLOptions(ramlLoaderOptions);
  return createJSONSchemaLoaderBundle(name, { ...ramlLoaderOptions, baseUrl, operations, cwd, fetch });
}

export { getGraphQLSchemaFromBundle, RAMLLoaderBundle };
