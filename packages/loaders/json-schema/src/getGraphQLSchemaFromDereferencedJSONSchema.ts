import { specifiedDirectives } from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import type { JSONSchemaObject } from 'json-machete';
import type { AddExecutionLogicToComposerOptions } from './addExecutionLogicToComposer.js';
import { addExecutionDirectivesToComposer } from './addExecutionLogicToComposer.js';
import { getComposerFromJSONSchema } from './getComposerFromJSONSchema.js';
import { pruneJsonSchemaByFieldFilter } from './pruneJsonSchemaByFieldFilter.js';
import type { SchemaFieldFilter } from './types.js';

export async function getGraphQLSchemaFromDereferencedJSONSchema(
  subgraphName: string,
  opts: Omit<AddExecutionLogicToComposerOptions, 'schemaComposer'> & {
    fullyDeferencedSchema: JSONSchemaObject;
    handlerName: string;
    include?: SchemaFieldFilter;
    exclude?: SchemaFieldFilter;
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
    include,
    exclude,
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
  // Explicit include/exclude limits emit. Clone first so prune does not mutate
  // caller-owned inline responseSchema / shared $ref targets.
  const schemaForCompose = structuredClone(fullyDeferencedSchema);
  pruneJsonSchemaByFieldFilter(schemaForCompose, operations, include, exclude);
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
