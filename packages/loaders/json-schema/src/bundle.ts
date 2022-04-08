import { referenceJSONSchema, JSONSchemaObject, dereferenceObject } from 'json-machete';
import { DefaultLogger } from '@graphql-mesh/utils';
import { getDereferencedJSONSchemaFromOperations } from './getDereferencedJSONSchemaFromOperations';
import { Logger, MeshPubSub } from '@graphql-mesh/types';
import { JSONSchemaOperationConfig } from './types';
import { fetch as crossUndiciFetch } from 'cross-undici-fetch';
import { GraphQLSchema } from 'graphql';
import { getGraphQLSchemaFromDereferencedJSONSchema } from './getGraphQLSchemaFromDereferencedJSONSchema';

export interface JSONSchemaLoaderBundle {
  name?: string;
  baseUrl?: string;
  operations: JSONSchemaOperationConfig[];
  operationHeaders?: Record<string, string>;

  referencedSchema: JSONSchemaObject;
}

export interface JSONSchemaLoaderBundleOptions {
  baseUrl?: string;
  operations: JSONSchemaOperationConfig[];
  schemaHeaders?: Record<string, string>;
  operationHeaders?: Record<string, string>;
  cwd?: string;
  ignoreErrorResponses?: boolean;

  fetch?: WindowOrWorkerGlobalScope['fetch'];
  logger?: Logger;
}

export async function createBundle(
  name: string,
  {
    baseUrl,
    operations,
    schemaHeaders,
    operationHeaders,
    cwd = process.cwd(),
    fetch = crossUndiciFetch,
    logger = new DefaultLogger(name),
    ignoreErrorResponses = false,
  }: JSONSchemaLoaderBundleOptions
): Promise<JSONSchemaLoaderBundle> {
  logger.debug(() => `Creating the dereferenced schema from operations config`);
  const dereferencedSchema = await getDereferencedJSONSchemaFromOperations({
    operations,
    cwd,
    logger,
    fetch,
    schemaHeaders,
    ignoreErrorResponses,
  });
  logger.debug(() => `Creating references from dereferenced schema`);
  const referencedSchema = await referenceJSONSchema(dereferencedSchema);

  logger.debug(() => `Bundle generation finished`);
  return {
    name,
    baseUrl,
    operations,
    operationHeaders,
    referencedSchema,
  };
}

export interface JSONSchemaLoaderBundleToGraphQLSchemaOptions {
  cwd?: string;
  fetch?: WindowOrWorkerGlobalScope['fetch'];
  pubsub?: MeshPubSub;
  logger?: Logger;
  baseUrl?: string;
  operationHeaders?: Record<string, string>;
  queryParams?: Record<string, string>;
}

/**
 * Generates a local GraphQLSchema instance from
 * previously generated JSON Schema bundle
 */
export async function getGraphQLSchemaFromBundle(
  {
    name,
    baseUrl: bundledBaseUrl,
    operations,
    operationHeaders: bundledOperationHeaders = {},
    referencedSchema,
  }: JSONSchemaLoaderBundle,
  {
    cwd = process.cwd(),
    fetch = crossUndiciFetch,
    pubsub,
    logger = new DefaultLogger(name),
    baseUrl: overwrittenBaseUrl,
    operationHeaders: additionalOperationHeaders = {},
    queryParams,
  }: JSONSchemaLoaderBundleToGraphQLSchemaOptions = {}
): Promise<GraphQLSchema> {
  logger.info(`Dereferencing the bundle`);
  const fullyDeferencedSchema = await dereferenceObject(referencedSchema, {
    cwd,
    fetch,
  });

  const operationHeaders = { ...bundledOperationHeaders, ...additionalOperationHeaders };
  logger.info(`Creating the GraphQL Schema from dereferenced schema`);
  return getGraphQLSchemaFromDereferencedJSONSchema(fullyDeferencedSchema, {
    fetch,
    pubsub,
    logger,
    baseUrl: overwrittenBaseUrl || bundledBaseUrl,
    operations,
    operationHeaders,
    queryParams,
  });
}
