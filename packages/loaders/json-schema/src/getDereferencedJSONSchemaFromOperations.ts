import { dereferenceObject, healJSONSchema, JSONSchemaObject } from 'json-machete';
import { process } from '@graphql-mesh/cross-helpers';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import { Logger } from '@graphql-mesh/types';
import { defaultImportFn, readFileOrUrl } from '@graphql-mesh/utils';
import { getReferencedJSONSchemaFromOperations } from './getReferencedJSONSchemaFromOperations.js';
import { JSONSchemaOperationConfig } from './types.js';

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
  const dereferenceObjectLogger = logger.child('dereferenceObject');
  const readFileOrUrlForJsonMachete = (path: string, opts: { cwd: string }) =>
    readFileOrUrl(path, {
      cwd: opts.cwd,
      fetch: fetchFn,
      logger: dereferenceObjectLogger,
      headers: schemaHeadersFactory({ env: process.env }),
      importFn: defaultImportFn,
    });
  const fullyDeferencedSchema = await dereferenceObject(referencedJSONSchema, {
    cwd,
    debugLogFn: dereferenceObjectLogger.debug.bind(dereferenceObjectLogger),
    readFileOrUrl: readFileOrUrlForJsonMachete,
  });
  logger.debug(`Healing JSON Schema`);
  const healJSONSchemaLogger = logger.child('healJSONSchema');
  const healedSchema = await healJSONSchema(
    fullyDeferencedSchema,
    healJSONSchemaLogger.debug.bind(healJSONSchemaLogger),
  );
  return healedSchema as JSONSchemaObject;
}
