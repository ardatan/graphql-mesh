import { specifiedDirectives } from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import type { JSONSchemaObject } from 'json-machete';
import type { AddExecutionLogicToComposerOptions } from './addExecutionLogicToComposer.js';
import { addExecutionDirectivesToComposer } from './addExecutionLogicToComposer.js';
import { getComposerFromJSONSchema } from './getComposerFromJSONSchema.js';

/**
 * Property-name snapshot of arg schemas for queryParams baking.
 * Avoids JSON.stringify on circular dereferenced schemas.
 */
function snapshotArgTypeMapForQueryParams(argTypeMap: Record<string, any>): Record<string, any> {
  const snapshotProps = (schema: any): Record<string, unknown> | undefined => {
    if (!schema?.properties || typeof schema.properties !== 'object') {
      return undefined;
    }
    return Object.fromEntries(Object.keys(schema.properties).map(key => [key, {}]));
  };
  const snapshotBranch = (schema: any) =>
    schema
      ? {
          type: schema.type,
          properties: snapshotProps(schema),
        }
      : undefined;
  const out: Record<string, any> = {};
  for (const [name, schema] of Object.entries(argTypeMap)) {
    out[name] = {
      type: schema?.type,
      properties: snapshotProps(schema),
      anyOf: Array.isArray(schema?.anyOf) ? schema.anyOf.map(snapshotBranch) : undefined,
      oneOf: Array.isArray(schema?.oneOf) ? schema.oneOf.map(snapshotBranch) : undefined,
    };
  }
  return out;
}

export async function getGraphQLSchemaFromDereferencedJSONSchema(
  subgraphName: string,
  opts: Omit<AddExecutionLogicToComposerOptions, 'schemaComposer'> & {
    fullyDeferencedSchema: JSONSchemaObject;
    handlerName: string;
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
  } = opts;
  log.debug(`Generating GraphQL Schema from the bundled JSON Schema`);
  // Composer mutates shared JSON Schema nodes in place (and schemas may be
  // circular after $ref dereference). Snapshot only the fields queryParams
  // baking needs so deepObject / allowDots / form-explode still see properties.
  for (const operation of operations) {
    if (operation.argTypeMap) {
      operation.argTypeMap = snapshotArgTypeMapForQueryParams(operation.argTypeMap);
    }
  }
  const visitorResult = await getComposerFromJSONSchema({
    subgraphName,
    schema: fullyDeferencedSchema,
    log: log.child('getComposerFromJSONSchema'),
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
