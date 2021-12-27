import { JSONSchemaOperationConfig } from './types';
import { getReferencedJSONSchemaFromOperations } from './getReferencedJSONSchemaFromOperations';
import { dereferenceObject, healJSONSchema, JSONSchemaObject } from 'json-machete';
import { Logger } from '@graphql-mesh/types';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/utils';
import { env } from 'process';

export async function getDereferencedJSONSchemaFromOperations({
  operations,
  cwd = process.cwd(),
  logger,
  fetch,
  schemaHeaders,
}: {
  operations: JSONSchemaOperationConfig[];
  cwd: string;
  logger: Logger;
  fetch: WindowOrWorkerGlobalScope['fetch'];
  schemaHeaders?: Record<string, string>;
}): Promise<JSONSchemaObject> {
  const referencedJSONSchema = await getReferencedJSONSchemaFromOperations({
    operations,
    cwd,
    schemaHeaders,
  });
  logger.debug(() => `Dereferencing JSON Schema to resolve all $refs`);
  const schemaHeadersFactory = getInterpolatedHeadersFactory(schemaHeaders);
  const fullyDeferencedSchema = await dereferenceObject(referencedJSONSchema, {
    cwd,
    fetch,
    headers: schemaHeadersFactory({ env }),
  });
  logger.debug(() => `Healing JSON Schema`);
  const healedSchema = await healJSONSchema(fullyDeferencedSchema);
  return healedSchema;
}
