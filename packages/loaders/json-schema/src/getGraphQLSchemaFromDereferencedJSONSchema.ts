import { specifiedDirectives } from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import type { JSONSchemaObject } from 'json-machete';
import type { AddExecutionLogicToComposerOptions } from './addExecutionLogicToComposer.js';
import { addExecutionDirectivesToComposer } from './addExecutionLogicToComposer.js';
import { getComposerFromJSONSchema } from './getComposerFromJSONSchema.js';
import { pruneJsonSchemaBySelection } from './pruneJsonSchemaBySelection.js';
import type { SchemaFieldsMode } from './types.js';

export async function getGraphQLSchemaFromDereferencedJSONSchema(
  subgraphName: string,
  opts: Omit<AddExecutionLogicToComposerOptions, 'schemaComposer'> & {
    fullyDeferencedSchema: JSONSchemaObject;
    handlerName: string;
    schemaFields?: SchemaFieldsMode;
  },
) {
  const {
    fullyDeferencedSchema,
    log,
    operations,
    operationHeaders,
    endpoint,
    queryParams,
    queryStringOptions,
    handlerName = 'rest',
    connectSelection,
    schemaFields,
  } = opts;
  log.debug(`Generating GraphQL Schema from the bundled JSON Schema`);
  // Composer mutates shared JSON Schema nodes in place (often circular after
  // $ref dereference). Clone argTypeMap first so queryParams baking still sees
  // `properties` / `anyOf`. Prefer structuredClone — it keeps cycles; JSON
  // stringify would throw on them.
  for (const operation of operations) {
    if (operation.argTypeMap) {
      operation.argTypeMap = structuredClone(operation.argTypeMap);
    }
  }
  // When operations carry a concrete `selection`, drop unselected object
  // properties before compose so GraphQL never emits unused fields/types.
  // Clone first: prune mutates `properties` maps, and inline `responseSchema`
  // objects / shared `$ref` targets must not leak mutations back to callers.
  const schemaForCompose = structuredClone(fullyDeferencedSchema);
  pruneJsonSchemaBySelection(schemaForCompose, operations, schemaFields);
  const visitorResult = await getComposerFromJSONSchema({
    subgraphName,
    schema: schemaForCompose,
    log: log.child('getComposerFromJSONSchema'),
    getScalarForFormat: opts.getScalarForFormat,
    scalarMap: opts.scalarMap,
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
    log,
    operations,
    operationHeaders,
    endpoint,
    queryParams,
    queryStringOptions,
    handlerName,
    connectSelection,
  });
}
