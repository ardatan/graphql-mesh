import { specifiedDirectives } from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import type { JSONSchemaObject } from 'json-machete';
import type { AddExecutionLogicToComposerOptions } from './addExecutionLogicToComposer.js';
import { addExecutionDirectivesToComposer } from './addExecutionLogicToComposer.js';
import { getComposerFromJSONSchema } from './getComposerFromJSONSchema.js';

export async function getGraphQLSchemaFromDereferencedJSONSchema(
  subgraphName: string,
  opts: Omit<AddExecutionLogicToComposerOptions, 'schemaComposer'> & {
    fullyDeferencedSchema: JSONSchemaObject;
    handlerName: string;
  },
) {
  const {
    fullyDeferencedSchema,
    logger,
    operations,
    operationHeaders,
    endpoint,
    queryParams,
    queryStringOptions,
    handlerName = 'rest',
  } = opts;
  logger.debug(`Generating GraphQL Schema from the bundled JSON Schema`);
  const visitorResult = await getComposerFromJSONSchema({
    subgraphName,
    schema: fullyDeferencedSchema,
    logger: logger.child('getComposerFromJSONSchema'),
    getScalarForFormat: opts.getScalarForFormat,
  });

  const schemaComposerWithoutExecutionLogic = visitorResult.output;

  if (!(schemaComposerWithoutExecutionLogic instanceof SchemaComposer)) {
    throw new Error('The visitor result should be a SchemaComposer instance.');
  }

  // graphql-compose doesn't add @defer and @stream to the schema
  for (const directive of specifiedDirectives) {
    schemaComposerWithoutExecutionLogic.addDirective(directive);
  }

  return addExecutionDirectivesToComposer(subgraphName, {
    schemaComposer: schemaComposerWithoutExecutionLogic,
    logger,
    operations,
    operationHeaders,
    endpoint,
    queryParams,
    queryStringOptions,
    handlerName,
  });
}
