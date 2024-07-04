import { processDirectives } from '@graphql-mesh/transport-rest';
import { DefaultLogger } from '@graphql-mesh/utils';
import { fetch } from '@whatwg-node/fetch';
import { getDereferencedJSONSchemaFromOperations } from './getDereferencedJSONSchemaFromOperations.js';
import { getGraphQLSchemaFromDereferencedJSONSchema } from './getGraphQLSchemaFromDereferencedJSONSchema.js';
import type { JSONSchemaLoaderOptions } from './types.js';

export async function loadNonExecutableGraphQLSchemaFromJSONSchemas(
  name: string,
  options: JSONSchemaLoaderOptions,
) {
  options.logger = options.logger || new DefaultLogger(name);
  options.cwd = options.cwd || process.cwd();
  const fullyDeferencedSchema = await getDereferencedJSONSchemaFromOperations({
    operations: options.operations,
    operationHeaders: typeof options.operationHeaders === 'object' ? options.operationHeaders : {},
    queryParams: options.queryParams,
    endpoint: options.endpoint,
    cwd: options.cwd,
    logger: options.logger,
    fetchFn: options.fetch,
    schemaHeaders: options.schemaHeaders,
    ignoreErrorResponses: options.ignoreErrorResponses,
  });
  return getGraphQLSchemaFromDereferencedJSONSchema(name, {
    fullyDeferencedSchema,
    logger: options.logger,
    operations: options.operations,
    operationHeaders: options.operationHeaders,
    endpoint: options.endpoint,
    queryParams: options.queryParams,
    queryStringOptions: options.queryStringOptions,
    getScalarForFormat: options.getScalarForFormat,
    handlerName: options.handlerName,
  });
}

export async function loadGraphQLSchemaFromJSONSchemas(
  name: string,
  options: JSONSchemaLoaderOptions,
) {
  const graphqlSchema = await loadNonExecutableGraphQLSchemaFromJSONSchemas(name, options);
  return processDirectives(graphqlSchema, {
    ...options,
    operationHeaders: typeof options.operationHeaders === 'object' ? options.operationHeaders : {},
    globalFetch: options.fetch || fetch,
    pubsub: options.pubsub,
    logger: options.logger,
  });
}
