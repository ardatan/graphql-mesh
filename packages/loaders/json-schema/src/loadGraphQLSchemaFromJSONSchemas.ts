import { DefaultLogger } from '@graphql-mesh/utils';
import { getDereferencedJSONSchemaFromOperations } from './getDereferencedJSONSchemaFromOperations';
import { getGraphQLSchemaFromDereferencedJSONSchema } from './getGraphQLSchemaFromDereferencedJSONSchema';
import { JSONSchemaLoaderOptions } from './types';

export async function loadGraphQLSchemaFromJSONSchemas(name: string, options: JSONSchemaLoaderOptions) {
  const logger = options.logger || new DefaultLogger(name);
  const operations = options.operations;
  const cwd = options.cwd || process.cwd();
  const fullyDeferencedSchema = await getDereferencedJSONSchemaFromOperations({
    operations,
    cwd,
    logger,
    fetchFn: options.fetch,
    schemaHeaders: options.schemaHeaders,
    ignoreErrorResponses: options.ignoreErrorResponses,
    noDeduplication: options.noDeduplication,
  });
  const graphqlSchema = await getGraphQLSchemaFromDereferencedJSONSchema(fullyDeferencedSchema, {
    fetch: options.fetch,
    logger,
    operations,
    operationHeaders: options.operationHeaders,
    baseUrl: options.baseUrl,
    pubsub: options.pubsub,
    queryParams: options.queryParams,
    queryStringOptions: options.queryStringOptions,
  });
  return graphqlSchema;
}
