import { Logger } from '@graphql-mesh/types';
import { readFileOrUrl } from '@graphql-mesh/utils';
import { dereferenceObject, healJSONSchema, JSONSchema, JSONSchemaObject, referenceJSONSchema } from 'json-machete';
import toJsonSchema from 'to-json-schema';
import { JSONSchemaOperationConfig } from './types';
import { getOperationMetadata } from './utils';

export interface BundleJSONSchemasOptions {
  operations: JSONSchemaOperationConfig[];
  cwd: string;
  logger: Logger;
}

export async function bundleJSONSchemas({ operations, cwd, logger }: BundleJSONSchemasOptions) {
  const finalJsonSchema: JSONSchema = {
    type: 'object',
    title: '_schema',
    properties: {},
    required: ['query'],
  };
  for (const operationConfig of operations) {
    const { operationType, rootTypeName, fieldName } = getOperationMetadata(operationConfig);
    const rootTypeDefinition = (finalJsonSchema.properties[operationType] = finalJsonSchema.properties[
      operationType
    ] || {
      type: 'object',
      title: rootTypeName,
      properties: {},
    });
    rootTypeDefinition.properties = rootTypeDefinition.properties || {};
    if (operationConfig.responseSchema) {
      rootTypeDefinition.properties[fieldName] = {
        $ref: operationConfig.responseSchema,
      };
    } else if (operationConfig.responseSample) {
      const sample = await readFileOrUrl(operationConfig.responseSample, {
        cwd,
      }).catch((e: any) => {
        throw new Error(`responseSample - ${e.message}`);
      });
      const generatedSchema = toJsonSchema(sample, {
        required: false,
        objects: {
          additionalProperties: false,
        },
        strings: {
          detectFormat: true,
        },
        arrays: {
          mode: 'first',
        },
      });
      generatedSchema.title = operationConfig.responseTypeName;
      rootTypeDefinition.properties[fieldName] = generatedSchema;
    } else {
      const generatedSchema: JSONSchemaObject = {
        type: 'object',
      };
      generatedSchema.title = operationConfig.responseTypeName;
      rootTypeDefinition.properties[fieldName] = generatedSchema;
    }

    const rootTypeInputPropertyName = operationType + 'Input';
    const rootInputTypeName = rootTypeName + 'Input';
    const rootTypeInputTypeDefinition = (finalJsonSchema.properties[rootTypeInputPropertyName] = finalJsonSchema
      .properties[rootTypeInputPropertyName] || {
      type: 'object',
      title: rootInputTypeName,
      properties: {},
    });
    if (operationConfig.requestSchema) {
      rootTypeInputTypeDefinition.properties[fieldName] = {
        $ref: operationConfig.requestSchema,
      };
    } else if (operationConfig.requestSample) {
      const sample = await readFileOrUrl(operationConfig.requestSample, {
        cwd,
      }).catch((e: any) => {
        throw new Error(`requestSample:${operationConfig.requestSample} cannot be read - ${e.message}`);
      });
      const generatedSchema = toJsonSchema(sample, {
        required: false,
        objects: {
          additionalProperties: false,
        },
        strings: {
          detectFormat: true,
        },
        arrays: {
          mode: 'first',
        },
      });
      generatedSchema.title = operationConfig.requestTypeName;
      rootTypeInputTypeDefinition.properties[fieldName] = generatedSchema;
    }
  }
  logger.debug(`Dereferencing JSON Schema to resolve all $refs`);
  const fullyDeferencedSchema = await dereferenceObject(finalJsonSchema, {
    cwd,
  });
  logger.debug(`Healing JSON Schema`);
  const healedSchema = await healJSONSchema(fullyDeferencedSchema);
  logger.debug(`Building and mapping $refs back to JSON Schema`);
  const fullyReferencedSchema = await referenceJSONSchema(healedSchema as any);
  return fullyReferencedSchema;
}
