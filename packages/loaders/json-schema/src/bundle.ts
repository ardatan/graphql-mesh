import { referenceJSONSchema, JSONSchemaObject, dereferenceObject } from 'json-machete';
import { DefaultLogger } from '@graphql-mesh/utils';
import { Logger, MeshFetch } from '@graphql-mesh/types';
import { JSONSchemaOperationConfig, OperationHeadersConfiguration } from './types.js';
import { fetch as crossUndiciFetch } from '@whatwg-node/fetch';
import { GraphQLSchema } from 'graphql';
import { getGraphQLSchemaFromDereferencedJSONSchema } from './getGraphQLSchemaFromDereferencedJSONSchema.js';
import type { IStringifyOptions } from 'qs';
import { ResolverData } from '@graphql-mesh/string-interpolation';

export interface JSONSchemaLoaderBundle {
  name?: string;
  endpoint?: string;
  operations: JSONSchemaOperationConfig[];
  operationHeaders?: Record<string, string>;

  referencedSchema: JSONSchemaObject;
}

export interface JSONSchemaLoaderBundleOptions {
  dereferencedSchema: JSONSchemaObject;
  endpoint?: string;
  operations: JSONSchemaOperationConfig[];
  operationHeaders?: Record<string, string>;
  logger?: Logger;
}

export async function createBundleFromDereferencedSchema(
  name: string,
  {
    dereferencedSchema,
    endpoint,
    operations,
    operationHeaders,
    logger = new DefaultLogger(name),
  }: JSONSchemaLoaderBundleOptions,
): Promise<JSONSchemaLoaderBundle> {
  logger.debug(`Creating references from dereferenced schema`);
  const referencedSchema = await referenceJSONSchema(dereferencedSchema);

  logger.debug(`Bundle generation finished`);
  return {
    name,
    endpoint,
    operations,
    operationHeaders: typeof operationHeaders === 'object' ? operationHeaders : {},
    referencedSchema,
  };
}

export interface JSONSchemaLoaderBundleToGraphQLSchemaOptions {
  cwd?: string;
  logger?: Logger;
  fetch?: MeshFetch;
  endpoint?: string;
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
    endpoint: bundledBaseUrl,
    operations,
    operationHeaders: bundledOperationHeaders = {},
    referencedSchema,
  }: JSONSchemaLoaderBundle,
  {
    cwd = process.cwd(),
    logger = new DefaultLogger(name),
    fetch = crossUndiciFetch,
    endpoint: overwrittenBaseUrl,
    operationHeaders: additionalOperationHeaders = {},
    queryParams,
    queryStringOptions,
  }: JSONSchemaLoaderBundleToGraphQLSchemaOptions = {},
): Promise<GraphQLSchema> {
  logger.info(`Dereferencing the bundle`);
  const fullyDeferencedSchema = await dereferenceObject(referencedSchema, {
    cwd,
    fetchFn: fetch,
    logger,
  });

  const endpoint = overwrittenBaseUrl || bundledBaseUrl;

  let operationHeaders = {};
  if (typeof additionalOperationHeaders === 'function') {
    operationHeaders = async (
      resolverData: ResolverData,
      operationConfig: JSONSchemaOperationConfig,
    ) => {
      const result = await additionalOperationHeaders(resolverData, {
        endpoint,
        field: operationConfig.field,
        method: 'method' in operationConfig ? operationConfig.method : 'POST',
        path: 'path' in operationConfig ? operationConfig.path : operationConfig.pubsubTopic,
      });
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
  return getGraphQLSchemaFromDereferencedJSONSchema(name, {
    fullyDeferencedSchema,
    logger,
    endpoint,
    operations,
    operationHeaders,
    queryParams,
    queryStringOptions,
  });
}
