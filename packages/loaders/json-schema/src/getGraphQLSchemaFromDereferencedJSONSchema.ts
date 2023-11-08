import { specifiedDirectives } from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import { JSONSchemaObject } from 'json-machete';
import {
  addExecutionDirectivesToComposer,
  AddExecutionLogicToComposerOptions,
} from './addExecutionLogicToComposer.js';
import { getComposerFromJSONSchema } from './getComposerFromJSONSchema.js';
import { CustomSchemaComposer } from './types.js';

export async function getGraphQLSchemaFromDereferencedJSONSchema(
  name: string,
  opts: Omit<AddExecutionLogicToComposerOptions, 'schemaComposer'> & {
    fullyDeferencedSchema: JSONSchemaObject;
    customSchemaComposer?: CustomSchemaComposer;
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
    customSchemaComposer,
  } = opts;
  logger.debug(`Generating GraphQL Schema from the bundled JSON Schema`);
  const visitorResult = await getComposerFromJSONSchema(
    fullyDeferencedSchema,
    logger.child('getComposerFromJSONSchema'),
    customSchemaComposer,
  );

  const schemaComposerWithoutExecutionLogic = visitorResult.output;

  if (!(schemaComposerWithoutExecutionLogic instanceof SchemaComposer)) {
    throw new Error('The visitor result should be a SchemaComposer instance.');
  }

  // graphql-compose doesn't add @defer and @stream to the schema
  for (const directive of specifiedDirectives) {
    schemaComposerWithoutExecutionLogic.addDirective(directive);
  }

  const schemaComposerWithExecutionLogic = await addExecutionDirectivesToComposer(name, {
    schemaComposer: schemaComposerWithoutExecutionLogic,
    logger,
    operations,
    operationHeaders,
    endpoint,
    queryParams,
    queryStringOptions,
  });

  if (schemaComposerWithExecutionLogic.Query.getFieldNames().length === 0) {
    schemaComposerWithExecutionLogic.Query.addFields({
      dummy: {
        type: 'String',
        resolve: () => 'dummy',
      },
    });
  }

  return schemaComposerWithExecutionLogic.buildSchema();
}
