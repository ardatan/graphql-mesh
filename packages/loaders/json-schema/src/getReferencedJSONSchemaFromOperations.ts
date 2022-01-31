import { readFileOrUrl } from '@graphql-mesh/utils';
import { JSONSchema, JSONSchemaObject } from 'json-machete';
import toJsonSchema from 'to-json-schema';
import { JSONSchemaOperationResponseConfig } from '.';
import { JSONSchemaOperationConfig } from './types';
import { getOperationMetadata } from './utils';

const anySchema: JSONSchemaObject = {
  title: 'Any',
  anyOf: [
    {
      type: 'object',
      additionalProperties: true,
    },
    {
      type: 'string',
    },
    {
      type: 'number',
    },
    {
      type: 'boolean',
    },
  ],
};

async function handleOperationResponseConfig(
  operationResponseConfig: JSONSchemaOperationResponseConfig,
  {
    schemaHeaders,
    cwd,
  }: {
    schemaHeaders: Record<string, any>;
    cwd: string;
  }
): Promise<JSONSchemaObject> {
  if (operationResponseConfig.responseSchema) {
    return typeof operationResponseConfig.responseSchema === 'string'
      ? {
          $ref: operationResponseConfig.responseSchema,
          title: operationResponseConfig.responseTypeName,
        }
      : operationResponseConfig.responseSchema;
  } else if (operationResponseConfig.responseSample) {
    const sample =
      typeof operationResponseConfig.responseSample === 'object'
        ? operationResponseConfig.responseSample
        : await readFileOrUrl(operationResponseConfig.responseSample, {
            cwd,
            headers: schemaHeaders,
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
    generatedSchema.title = operationResponseConfig.responseTypeName;
    return generatedSchema as any;
  } else {
    const generatedSchema: JSONSchemaObject = operationResponseConfig.responseTypeName
      ? {
          ...anySchema,
          title: operationResponseConfig.responseTypeName,
        }
      : anySchema;
    return generatedSchema;
  }
}

export async function getReferencedJSONSchemaFromOperations({
  operations,
  cwd,
  schemaHeaders,
  ignoreErrorResponses,
}: {
  operations: JSONSchemaOperationConfig[];
  cwd: string;
  schemaHeaders?: { [key: string]: string };
  ignoreErrorResponses?: boolean;
}) {
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

    if ('responseByStatusCode' in operationConfig) {
      rootTypeDefinition.properties[fieldName] = rootTypeDefinition.properties[fieldName] || {};
      const statusCodeOneOfIndexMap: Record<string, number> = {};
      const responseSchemas: JSONSchemaObject[] = [];
      for (const statusCode in operationConfig.responseByStatusCode) {
        if (ignoreErrorResponses && !statusCode.startsWith('2')) {
          continue;
        }
        const responseOperationConfig = operationConfig.responseByStatusCode[statusCode];
        const responseOperationSchema = await handleOperationResponseConfig(responseOperationConfig, {
          cwd,
          schemaHeaders,
        });
        statusCodeOneOfIndexMap[statusCode] = responseSchemas.length;
        responseOperationSchema.title = responseOperationSchema.title || `${fieldName}_${statusCode}_response`;
        responseSchemas.push(responseOperationSchema);
      }
      if (responseSchemas.length === 1) {
        rootTypeDefinition.properties[fieldName] = responseSchemas[0];
      }
      rootTypeDefinition.properties[fieldName] = {
        $comment: `statusCodeOneOfIndexMap:${JSON.stringify(statusCodeOneOfIndexMap)}`,
        title: fieldName + '_response',
        oneOf: responseSchemas,
      };
    } else {
      rootTypeDefinition.properties[fieldName] = await handleOperationResponseConfig(
        operationConfig as JSONSchemaOperationResponseConfig,
        {
          cwd,
          schemaHeaders,
        }
      );
    }

    const rootTypeInputPropertyName = operationType + 'Input';
    const rootInputTypeName = rootTypeName + 'Input';
    const rootTypeInputTypeDefinition = (finalJsonSchema.properties[rootTypeInputPropertyName] = finalJsonSchema
      .properties[rootTypeInputPropertyName] || {
      type: 'object',
      title: rootInputTypeName,
      properties: {},
    });
    if ('binary' in operationConfig) {
      const generatedSchema = {
        title: operationConfig.requestTypeName || 'Upload',
        type: 'string',
        format: 'upload',
      };
      rootTypeInputTypeDefinition.properties[fieldName] = generatedSchema;
    } else if ('requestSchema' in operationConfig && operationConfig.requestSchema) {
      rootTypeInputTypeDefinition.properties[fieldName] =
        typeof operationConfig.requestSchema === 'string'
          ? {
              $ref: operationConfig.requestSchema,
              title: operationConfig.requestTypeName,
            }
          : operationConfig.requestSchema;
    } else if ('requestSample' in operationConfig) {
      const sample =
        typeof operationConfig.requestSample === 'object'
          ? operationConfig.requestSample
          : await readFileOrUrl(operationConfig.requestSample, {
              cwd,
              headers: schemaHeaders,
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
  return finalJsonSchema;
}
