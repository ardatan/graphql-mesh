import { BaseLoaderOptions } from '@graphql-tools/utils';
import { specifiedDirectives } from 'graphql';
import { dereferenceObject, healJSONSchema, JSONSchemaObject } from 'json-machete';
import { Logger, MeshPubSub } from '@graphql-mesh/types';
import { getComposerFromJSONSchema } from './getComposerFromJSONSchema';
import { SchemaComposer } from 'graphql-compose';
import { DefaultLogger } from '@graphql-mesh/utils';
import { JSONSchemaOperationConfig } from './types';
import { addExecutionLogicToComposer, AddExecutionLogicToComposerOptions } from './addExecutionLogicToComposer';
import { getReferencedJSONSchemaFromOperations } from './getReferencedJSONSchemaFromOperations';

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

export async function getDereferencedJSONSchemaFromOperations({
  operations,
  cwd = process.cwd(),
  logger,
  fetch,
}: {
  operations: JSONSchemaOperationConfig[];
  cwd: string;
  logger: Logger;
  fetch: WindowOrWorkerGlobalScope['fetch'];
}): Promise<JSONSchemaObject> {
  const referencedJSONSchema = await getReferencedJSONSchemaFromOperations({
    operations,
    cwd,
  });
  logger.debug(() => `Dereferencing JSON Schema to resolve all $refs`);
  const fullyDeferencedSchema = await dereferenceObject(referencedJSONSchema, {
    cwd,
    fetch,
  });
  logger.debug(() => `Healing JSON Schema`);
  const healedSchema = await healJSONSchema(fullyDeferencedSchema);
  return healedSchema;
}

export async function loadGraphQLSchemaFromJSONSchemas(name: string, options: JSONSchemaLoaderOptions) {
  const logger = options.logger || new DefaultLogger(name);
  const operations = options.operations;
  const cwd = options.cwd || process.cwd();
  const fullyDeferencedSchema = await getDereferencedJSONSchemaFromOperations({
    operations,
    cwd,
    logger,
    fetch: options.fetch,
  });
  const graphqlSchema = await getGraphQLSchemaFromDereferencedJSONSchema(fullyDeferencedSchema, {
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

export async function getGraphQLSchemaFromDereferencedJSONSchema(
  fullyDeferencedSchema: JSONSchemaObject,
  {
    fetch,
    logger,
    operations,
    operationHeaders,
    baseUrl,
    pubsub,
    errorMessage,
    generateInterfaceFromSharedFields,
  }: AddExecutionLogicToComposerOptions & { generateInterfaceFromSharedFields?: boolean }
) {
  logger.debug(() => `Generating GraphQL Schema from the bundled JSON Schema`);
  const visitorResult = await getComposerFromJSONSchema(
    fullyDeferencedSchema,
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
    fetch,
    logger,
    operations,
    operationHeaders,
    baseUrl,
    pubsub,
    errorMessage,
  });

  return schemaComposerWithExecutionLogic.buildSchema();
}
