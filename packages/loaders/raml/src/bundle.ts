import {
  getGraphQLSchemaFromBundle,
  createBundle as createJSONSchemaLoaderBundle,
  JSONSchemaLoaderBundle as RAMLLoaderBundle,
} from '@omnigraph/json-schema';
import { getJSONSchemaOptionsFromRAMLOptions } from './getJSONSchemaOptionsFromRAMLOptions.js';
import { RAMLLoaderOptions } from './types.js';

/**
 * Creates a bundle by downloading and resolving the internal references once
 * to load the schema locally later
 */
export async function createBundle(name: string, ramlLoaderOptions: RAMLLoaderOptions): Promise<RAMLLoaderBundle> {
  const { operations, baseUrl, cwd, fetch } = await getJSONSchemaOptionsFromRAMLOptions(ramlLoaderOptions);
  return createJSONSchemaLoaderBundle(name, {
    ...ramlLoaderOptions,
    operationHeaders: typeof ramlLoaderOptions.operationHeaders === 'object' ? ramlLoaderOptions.operationHeaders : {},
    baseUrl,
    operations,
    cwd,
    fetch,
  });
}

export { getGraphQLSchemaFromBundle, RAMLLoaderBundle };
