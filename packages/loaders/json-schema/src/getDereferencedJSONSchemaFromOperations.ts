import type { JSONSchemaObject } from 'json-machete';
import { dereferenceObject, healJSONSchema } from 'json-machete';
import { type Logger } from '@graphql-hive/logger';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import type { MeshFetch } from '@graphql-mesh/types';
import { defaultImportFn, readFileOrUrl } from '@graphql-mesh/utils';
import { getReferencedJSONSchemaFromOperations } from './getReferencedJSONSchemaFromOperations.js';
import type { JSONSchemaOperationConfig } from './types.js';

export async function getDereferencedJSONSchemaFromOperations({
  operations,
  cwd = globalThis.process?.cwd?.(),
  log,
  fetchFn,
  schemaHeaders,
  ignoreErrorResponses,
  endpoint,
  operationHeaders,
  queryParams,
}: {
  operations: JSONSchemaOperationConfig[];
  cwd: string;
  log: Logger;
  fetchFn: MeshFetch;
  schemaHeaders?: Record<string, string>;
  ignoreErrorResponses?: boolean;
  endpoint: string;
  operationHeaders: Record<string, string>;
  queryParams: Record<string, string | number | boolean>;
}): Promise<JSONSchemaObject> {
  const referencedJSONSchema = await getReferencedJSONSchemaFromOperations({
    operations,
    cwd,
    log,
    schemaHeaders,
    ignoreErrorResponses,
    fetchFn,
    endpoint,
    operationHeaders,
    queryParams,
  });
  log.debug(`Dereferencing JSON Schema to resolve all $refs`);
  const schemaHeadersFactory = getInterpolatedHeadersFactory(schemaHeaders);
  const dereferenceObjectLogger = log.child('dereferenceObject');
  const readFileOrUrlForJsonMachete = (path: string, opts: { cwd: string }) =>
    readFileOrUrl(path, {
      cwd: opts.cwd,
      fetch: fetchFn,
      log: dereferenceObjectLogger,
      headers: schemaHeadersFactory({ env: globalThis.process?.env }),
      importFn: defaultImportFn,
    });
  const fullyDeferencedSchema = await dereferenceObject(referencedJSONSchema, {
    cwd,
    debugLogFn: dereferenceObjectLogger.debug.bind(dereferenceObjectLogger),
    readFileOrUrl: readFileOrUrlForJsonMachete,
  });
  log.debug(`Healing JSON Schema`);
  const healJSONSchemaLogger = log.child('healJSONSchema');
  const healedSchema = await healJSONSchema(
    fullyDeferencedSchema,
    healJSONSchemaLogger.debug.bind(healJSONSchemaLogger),
  );
  return healedSchema as JSONSchemaObject;
}
