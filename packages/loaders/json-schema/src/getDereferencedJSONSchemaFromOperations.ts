import { JSONSchemaOperationConfig } from './types.js';
import { getReferencedJSONSchemaFromOperations } from './getReferencedJSONSchemaFromOperations.js';
import { dereferenceObject, healJSONSchema, JSONSchemaObject } from 'json-machete';
import { Logger } from '@graphql-mesh/types';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';

export async function getDereferencedJSONSchemaFromOperations({
  operations,
  cwd = process.cwd(),
  logger,
  fetchFn,
  schemaHeaders,
  ignoreErrorResponses,
  endpoint,
  operationHeaders,
  queryParams,
}: {
  operations: JSONSchemaOperationConfig[];
  cwd: string;
  logger: Logger;
  fetchFn: WindowOrWorkerGlobalScope['fetch'];
  schemaHeaders?: Record<string, string>;
  ignoreErrorResponses?: boolean;
  endpoint: string;
  operationHeaders: Record<string, string>;
  queryParams: Record<string, string | number | boolean>;
}): Promise<JSONSchemaObject> {
  const referencedJSONSchema = await getReferencedJSONSchemaFromOperations({
    operations,
    cwd,
    schemaHeaders,
    ignoreErrorResponses,
    fetchFn,
    endpoint,
    operationHeaders,
    queryParams,
  });
  logger.debug(`Dereferencing JSON Schema to resolve all $refs`);
  const schemaHeadersFactory = getInterpolatedHeadersFactory(schemaHeaders);
  const fullyDeferencedSchema = await dereferenceObject(referencedJSONSchema, {
    cwd,
    fetchFn,
    logger: logger.child('dereferenceObject'),
    headers: schemaHeadersFactory({ env: process.env }),
  });
  logger.debug(`Healing JSON Schema`);
  const healedSchema = await healJSONSchema(fullyDeferencedSchema, {
    logger: logger.child('healJSONSchema'),
  });
  return healedSchema as JSONSchemaObject;
}
