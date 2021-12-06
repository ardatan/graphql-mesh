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
  errorMessage?: string;

  referencedSchema: JSONSchemaObject;
}

export interface JSONSchemaLoaderBundleOptions {
  baseUrl?: string;
  operations: JSONSchemaOperationConfig[];
  schemaHeaders?: Record<string, string>;
  operationHeaders?: Record<string, string>;
  errorMessage?: string;
  cwd?: string;

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
    errorMessage,
    cwd = process.cwd(),
    fetch = crossUndiciFetch,
    logger = new DefaultLogger(name),
  }: JSONSchemaLoaderBundleOptions
): Promise<JSONSchemaLoaderBundle> {
  const dereferencedSchema = await getDereferencedJSONSchemaFromOperations({
    operations,
    cwd,
    logger,
    fetch,
    schemaHeaders,
  });
  const referencedSchema = await referenceJSONSchema(dereferencedSchema);

  return {
    name,
    baseUrl,
    operations,
    operationHeaders,
    errorMessage,
    referencedSchema,
  };
}

export interface JSONSchemaLoaderBundleToGraphQLSchemaOptions {
  cwd?: string;
  fetch?: WindowOrWorkerGlobalScope['fetch'];
  pubsub?: MeshPubSub;
  logger?: Logger;
  operationHeaders?: Record<string, string>;
}
export async function getGraphQLSchemaFromBundle(
  {
    name,
    baseUrl,
    operations,
    operationHeaders: bundledOperationHeaders = {},
    errorMessage,
    referencedSchema,
  }: JSONSchemaLoaderBundle,
  {
    cwd = process.cwd(),
    fetch = crossUndiciFetch,
    pubsub,
    logger = new DefaultLogger(name),
    operationHeaders: additionalOperationHeaders = {},
  }: JSONSchemaLoaderBundleToGraphQLSchemaOptions = {}
): Promise<GraphQLSchema> {
  const fullyDeferencedSchema = await dereferenceObject(referencedSchema, {
    cwd,
    fetch,
  });

  const operationHeaders = { ...bundledOperationHeaders, ...additionalOperationHeaders };
  return getGraphQLSchemaFromDereferencedJSONSchema(fullyDeferencedSchema, {
    fetch,
    pubsub,
    logger,
    baseUrl,
    operations,
    operationHeaders,
    errorMessage,
  });
}
