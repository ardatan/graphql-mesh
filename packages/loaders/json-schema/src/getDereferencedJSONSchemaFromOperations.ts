import { JSONSchemaOperationConfig } from './types';
import { getReferencedJSONSchemaFromOperations } from './getReferencedJSONSchemaFromOperations';
import { dereferenceObject, healJSONSchema, JSONSchemaObject } from 'json-machete';
import { Logger } from '@graphql-mesh/types';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';

export async function getDereferencedJSONSchemaFromOperations({
  operations,
  cwd = process.cwd(),
  logger,
  fetch,
  schemaHeaders,
  ignoreErrorResponses,
}: {
  operations: JSONSchemaOperationConfig[];
  cwd: string;
  logger: Logger;
  fetch: WindowOrWorkerGlobalScope['fetch'];
  schemaHeaders?: Record<string, string>;
  ignoreErrorResponses?: boolean;
}): Promise<JSONSchemaObject> {
  const referencedJSONSchema = await getReferencedJSONSchemaFromOperations({
    operations,
    cwd,
    schemaHeaders,
    ignoreErrorResponses,
  });
  logger.debug(`Dereferencing JSON Schema to resolve all $refs`);
  const schemaHeadersFactory = getInterpolatedHeadersFactory(schemaHeaders);
  const fullyDeferencedSchema = await dereferenceObject(referencedJSONSchema, {
    cwd,
    fetch,
    headers: schemaHeadersFactory({ env: process.env }),
  });
  logger.debug(`Healing JSON Schema`);
  const healedSchema = await healJSONSchema(fullyDeferencedSchema);
  return healedSchema;
}
