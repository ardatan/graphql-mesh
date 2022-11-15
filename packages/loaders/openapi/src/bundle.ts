import {
  getGraphQLSchemaFromBundle,
  createBundle as createJSONSchemaLoaderBundle,
  JSONSchemaLoaderBundle as OpenAPILoaderBundle,
} from '@omnigraph/json-schema';
import { getJSONSchemaOptionsFromOpenAPIOptions } from './getJSONSchemaOptionsFromOpenAPIOptions.js';
import { OpenAPILoaderOptions } from './types.js';

/**
 * Creates a bundle by downloading and resolving the internal references once
 * to load the schema locally later
 */
export async function createBundle(
  name: string,
  openApiLoaderOptions: OpenAPILoaderOptions
): Promise<OpenAPILoaderBundle> {
  const { operations, baseUrl, cwd, fetch, schemaHeaders, operationHeaders } =
    await getJSONSchemaOptionsFromOpenAPIOptions(name, openApiLoaderOptions);
  return createJSONSchemaLoaderBundle(name, {
    operations,
    baseUrl,
    cwd,
    fetch,
    schemaHeaders,
    operationHeaders: typeof operationHeaders === 'object' ? operationHeaders : {},
    queryParams: openApiLoaderOptions.queryParams,
    ignoreErrorResponses: openApiLoaderOptions.ignoreErrorResponses,
    logger: openApiLoaderOptions.logger,
  });
}

export { getGraphQLSchemaFromBundle, OpenAPILoaderBundle };
