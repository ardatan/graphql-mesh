import { DefaultLogger } from '@graphql-mesh/utils';
import { createBundleFromDereferencedSchema } from './bundle.js';
import { processDirectives } from './directives.js';
import { getDereferencedJSONSchemaFromOperations } from './getDereferencedJSONSchemaFromOperations.js';
import { getGraphQLSchemaFromDereferencedJSONSchema } from './getGraphQLSchemaFromDereferencedJSONSchema.js';
import { JSONSchemaLoaderOptions } from './types.js';

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
  const schema = await getGraphQLSchemaFromDereferencedJSONSchema(name, {
    fullyDeferencedSchema,
    logger: options.logger,
    operations: options.operations,
    operationHeaders: options.operationHeaders,
    endpoint: options.endpoint,
    queryParams: options.queryParams,
    queryStringOptions: options.queryStringOptions,
  });
  if (options.bundle) {
    schema.extensions = schema.extensions || {};
    Object.defineProperty(schema.extensions, 'bundle', {
      value: await createBundleFromDereferencedSchema(name, {
        dereferencedSchema: fullyDeferencedSchema,
        endpoint: options.endpoint,
        operations: options.operations,
        operationHeaders:
          typeof options.operationHeaders === 'object' ? options.operationHeaders : {},
        logger: options.logger,
      }),
    });
  }
  return schema;
}

export async function loadGraphQLSchemaFromJSONSchemas(
  name: string,
  options: JSONSchemaLoaderOptions,
) {
  const graphqlSchema = await loadNonExecutableGraphQLSchemaFromJSONSchemas(name, options);
  return processDirectives({
    ...options,
    operationHeaders: typeof options.operationHeaders === 'object' ? options.operationHeaders : {},
    schema: graphqlSchema,
    globalFetch: options.fetch,
    pubsub: options.pubsub,
    logger: options.logger,
  });
}
