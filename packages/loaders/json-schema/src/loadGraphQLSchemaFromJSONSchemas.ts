import { BaseLoaderOptions } from '@graphql-tools/utils';
import { specifiedDirectives } from 'graphql';
import { dereferenceObject, JSONSchemaObject } from 'json-machete';
import { Logger, MeshPubSub } from '@graphql-mesh/types';
import { getComposerFromJSONSchema } from './getComposerFromJSONSchema';
import { SchemaComposer } from 'graphql-compose';
import { DefaultLogger } from '@graphql-mesh/utils';
import { JSONSchemaOperationConfig } from './types';
import { addExecutionLogicToComposer, AddExecutionLogicToComposerOptions } from './addExecutionLogicToComposer';
import { bundleJSONSchemas } from './bundleJSONSchemas';

export interface JSONSchemaLoaderOptions extends BaseLoaderOptions {
  baseUrl?: string;
  operationHeaders?: Record<string, string>;
  schemaHeaders?: Record<string, string>;
  operations: JSONSchemaOperationConfig[];
  errorMessage?: string;
  logger?: Logger;
  pubsub?: MeshPubSub;
  fetch?: WindowOrWorkerGlobalScope['fetch'];
  generateInterfaceFromSharedFields?: boolean;
}

export async function loadGraphQLSchemaFromJSONSchemas(name: string, options: JSONSchemaLoaderOptions) {
  const logger = options.logger || new DefaultLogger(name);
  const operations = options.operations;
  const cwd = options.cwd || process.cwd();
  const bundledJSONSchema = await bundleJSONSchemas({
    operations,
    cwd,
    logger,
  });
  const graphqlSchema = await getGraphQLSchemaFromBundledJSONSchema(bundledJSONSchema, {
    cwd,
    fetch: options.fetch,
    logger,
    operations,
    operationHeaders: options.operationHeaders,
    baseUrl: options.baseUrl,
    pubsub: options.pubsub,
    errorMessage: options.errorMessage,
    generateInterfaceFromSharedFields: options.generateInterfaceFromSharedFields,
  });
  return graphqlSchema;
}

export async function getGraphQLSchemaFromBundledJSONSchema(
  bundledJSONSchema: JSONSchemaObject,
  {
    cwd,
    fetch: globalFetch = globalThis.fetch,
    logger,
    operations,
    operationHeaders,
    baseUrl,
    pubsub,
    errorMessage,
    generateInterfaceFromSharedFields,
  }: AddExecutionLogicToComposerOptions & { cwd: string; generateInterfaceFromSharedFields?: boolean }
) {
  logger.debug(() => `Derefering the bundled JSON Schema`);
  const fullyDeferencedSchema = await dereferenceObject(bundledJSONSchema, {
    cwd,
  });
  logger.debug(() => `Generating GraphQL Schema from the bundled JSON Schema`);
  const visitorResult = await getComposerFromJSONSchema(
    fullyDeferencedSchema as JSONSchemaObject,
    logger,
    generateInterfaceFromSharedFields
  );

  const schemaComposerWithoutExecutionLogic = visitorResult.output;

  if (!(schemaComposerWithoutExecutionLogic instanceof SchemaComposer)) {
    throw new Error('The visitor result should be a SchemaComposer instance.');
  }

  // graphql-compose doesn't add @defer and @stream to the schema
  for (const directive of specifiedDirectives) {
    schemaComposerWithoutExecutionLogic.addDirective(directive);
  }

  const schemaComposerWithExecutionLogic = await addExecutionLogicToComposer(schemaComposerWithoutExecutionLogic, {
    fetch: globalFetch,
    logger,
    operations,
    operationHeaders,
    baseUrl,
    pubsub,
    errorMessage,
  });

  return schemaComposerWithExecutionLogic.buildSchema();
}
