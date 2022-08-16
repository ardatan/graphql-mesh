import { referenceJSONSchema, JSONSchemaObject, dereferenceObject } from 'json-machete';
import { DefaultLogger } from '@graphql-mesh/utils';
import { getDereferencedJSONSchemaFromOperations } from './getDereferencedJSONSchemaFromOperations';
import { Logger, MeshPubSub } from '@graphql-mesh/types';
import { JSONSchemaOperationConfig, OperationHeadersConfiguration } from './types';
import { fetch as crossUndiciFetch } from '@whatwg-node/fetch';
import { GraphQLSchema } from 'graphql';
import { getGraphQLSchemaFromDereferencedJSONSchema } from './getGraphQLSchemaFromDereferencedJSONSchema';
import type { IStringifyOptions } from 'qs';
import { ResolverData } from '@graphql-mesh/string-interpolation';

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
  noDeduplication?: boolean;

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
    noDeduplication = false,
  }: JSONSchemaLoaderBundleOptions
): Promise<JSONSchemaLoaderBundle> {
  logger.debug(`Creating the dereferenced schema from operations config`);
  const dereferencedSchema = await getDereferencedJSONSchemaFromOperations({
    operations,
    cwd,
    logger,
    fetchFn: fetch,
    schemaHeaders,
    ignoreErrorResponses,
    noDeduplication,
  });
  logger.debug(`Creating references from dereferenced schema`);
  const referencedSchema = await referenceJSONSchema(dereferencedSchema);

  logger.debug(`Bundle generation finished`);
  return {
    name,
    baseUrl,
    operations,
    operationHeaders: typeof operationHeaders === 'object' ? operationHeaders : {},
    referencedSchema,
  };
}

export interface JSONSchemaLoaderBundleToGraphQLSchemaOptions {
  cwd?: string;
  fetch?: WindowOrWorkerGlobalScope['fetch'];
  pubsub?: MeshPubSub;
  logger?: Logger;
  baseUrl?: string;
  operationHeaders?: OperationHeadersConfiguration;
  queryParams?: Record<string, string>;
  queryStringOptions?: IStringifyOptions;
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
    queryStringOptions,
  }: JSONSchemaLoaderBundleToGraphQLSchemaOptions = {}
): Promise<GraphQLSchema> {
  logger.info(`Dereferencing the bundle`);
  const fullyDeferencedSchema = await dereferenceObject(referencedSchema, {
    cwd,
    fetchFn: fetch,
    logger,
  });

  let operationHeaders = {};
  if (typeof additionalOperationHeaders === 'function') {
    operationHeaders = async (resolverData: ResolverData) => {
      const result = await additionalOperationHeaders(resolverData);
      return {
        ...bundledOperationHeaders,
        ...result,
      };
    };
  } else {
    operationHeaders = {
      ...bundledOperationHeaders,
      ...additionalOperationHeaders,
    };
  }
  logger.info(`Creating the GraphQL Schema from dereferenced schema`);
  return getGraphQLSchemaFromDereferencedJSONSchema(fullyDeferencedSchema, {
    fetch,
    pubsub,
    logger,
    baseUrl: overwrittenBaseUrl || bundledBaseUrl,
    operations,
    operationHeaders,
    queryParams,
    queryStringOptions,
  });
}
