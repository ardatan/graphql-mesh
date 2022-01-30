import { specifiedDirectives } from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import { JSONSchemaObject } from 'json-machete';
import { addExecutionLogicToComposer, AddExecutionLogicToComposerOptions } from './addExecutionLogicToComposer';
import { getComposerFromJSONSchema } from './getComposerFromJSONSchema';

export async function getGraphQLSchemaFromDereferencedJSONSchema(
  fullyDeferencedSchema: JSONSchemaObject,
  {
    fetch,
    logger,
    operations,
    operationHeaders,
    baseUrl,
    pubsub,
    generateInterfaceFromSharedFields,
  }: AddExecutionLogicToComposerOptions & { generateInterfaceFromSharedFields?: boolean }
) {
  logger.debug(() => `Generating GraphQL Schema from the bundled JSON Schema`);
  const visitorResult = await getComposerFromJSONSchema(
    fullyDeferencedSchema,
    logger,
    generateInterfaceFromSharedFields
  );

  const schemaComposerWithoutExecutionLogic = visitorResult.output;

  if (!(schemaComposerWithoutExecutionLogic instanceof SchemaComposer)) {
    throw new Error('The visitor result should be a SchemaComposer instance.');
  }

  // graphql-compose doesn't add @defer and @stream to the schema
  for (const directive of specifiedDirectives) {
    schemaComposerWithoutExecutionLogic.addDirective(directive);
  }

  const schemaComposerWithExecutionLogic = await addExecutionLogicToComposer(schemaComposerWithoutExecutionLogic, {
    fetch,
    logger,
    operations,
    operationHeaders,
    baseUrl,
    pubsub,
  });

  return schemaComposerWithExecutionLogic.buildSchema();
}
