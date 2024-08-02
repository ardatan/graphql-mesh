import type { JSONSchemaObject } from 'json-machete';
import { AnySchema } from 'json-machete';
import toJsonSchema from 'to-json-schema';
import { getInterpolationKeys } from '@graphql-mesh/string-interpolation';
import type { Logger, MeshFetch } from '@graphql-mesh/types';
import {
  defaultImportFn,
  DefaultLogger,
  readFileOrUrl,
  sanitizeNameForGraphQL,
} from '@graphql-mesh/utils';
import type { JSONSchemaOperationConfig, JSONSchemaOperationResponseConfig } from './types.js';
import { getOperationMetadata } from './utils.js';

async function handleOperationResponseConfig(
  operationResponseConfig: JSONSchemaOperationResponseConfig,
  {
    schemaHeaders,
    cwd,
    fetchFn,
    logger = new DefaultLogger('handleOperationResponseConfig'),
  }: {
    schemaHeaders: Record<string, any>;
    cwd: string;
    fetchFn: MeshFetch;
    logger?: Logger;
  },
): Promise<JSONSchemaObject> {
  if (operationResponseConfig.responseSchema) {
    const schema =
      typeof operationResponseConfig.responseSchema === 'string'
        ? {
            $ref: operationResponseConfig.responseSchema,
            title: operationResponseConfig.responseTypeName,
          }
        : operationResponseConfig.responseSchema;
    if (operationResponseConfig.responseSample) {
      schema.examples = schema.examples || [operationResponseConfig.responseSample];
    }
    return schema;
  } else if (operationResponseConfig.responseSample) {
    const sample =
      typeof operationResponseConfig.responseSample === 'object'
        ? operationResponseConfig.responseSample
        : await readFileOrUrl(operationResponseConfig.responseSample, {
            cwd,
            fetch: fetchFn,
            logger,
            importFn: defaultImportFn,
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
    generatedSchema.examples = [sample];
    return generatedSchema as any;
  } else {
    return AnySchema as any;
  }
}

export async function getReferencedJSONSchemaFromOperations({
  operations,
  cwd,
  schemaHeaders,
  ignoreErrorResponses,
  logger = new DefaultLogger('getReferencedJSONSchemaFromOperations'),
  fetchFn,
  endpoint,
  operationHeaders,
  queryParams,
}: {
  operations: JSONSchemaOperationConfig[];
  cwd: string;
  schemaHeaders?: { [key: string]: string };
  ignoreErrorResponses?: boolean;
  logger?: Logger;
  fetchFn: MeshFetch;
  endpoint: string;
  operationHeaders: Record<string, string>;
  queryParams: Record<string, string | number | boolean>;
}) {
  const finalJsonSchema: JSONSchemaObject = {
    type: 'object',
    title: '_schema',
    properties: {},
    required: ['query'],
  };
  for (const operationConfig of operations) {
    const { operationType, rootTypeName, fieldName } = getOperationMetadata(operationConfig);
    const rootTypeDefinition = (finalJsonSchema.properties[operationType] = finalJsonSchema
      .properties[operationType] || {
      type: 'object',
      title: rootTypeName,
      properties: {},
      readOnly: true,
    });
    rootTypeDefinition.properties = rootTypeDefinition.properties || {};

    const interpolationStrings: string[] = [
      ...Object.values(operationHeaders || {}),
      ...Object.values(queryParams || {}).map(val => val.toString()),
      endpoint,
    ];

    if ('pubsubTopic' in operationConfig) {
      interpolationStrings.push(operationConfig.pubsubTopic);
    }

    if ('headers' in operationConfig) {
      interpolationStrings.push(...Object.values(operationConfig.headers || {}));
    }

    if ('path' in operationConfig) {
      interpolationStrings.push(operationConfig.path);
    }

    if ('responseByStatusCode' in operationConfig) {
      rootTypeDefinition.properties[fieldName] = rootTypeDefinition.properties[fieldName] || {};
      const statusCodeOneOfIndexMap: Record<string, number> = {};
      const responseSchemas: JSONSchemaObject[] = [];
      for (const statusCode in operationConfig.responseByStatusCode) {
        if (ignoreErrorResponses && !statusCode.startsWith('2')) {
          continue;
        }
        const responseOperationConfig = operationConfig.responseByStatusCode[statusCode];
        const responseOperationSchema = await handleOperationResponseConfig(
          responseOperationConfig,
          {
            cwd,
            schemaHeaders,
            fetchFn,
            logger,
          },
        );
        statusCodeOneOfIndexMap[statusCode] = responseSchemas.length;
        responseOperationSchema.title =
          responseOperationSchema.title || `${fieldName}_${statusCode}_response`;
        responseSchemas.push(responseOperationSchema);
      }
      if (responseSchemas.length === 1) {
        rootTypeDefinition.properties[fieldName] = responseSchemas[0];
      } else if (responseSchemas.length === 0) {
        rootTypeDefinition.properties[fieldName] = AnySchema;
      } else {
        rootTypeDefinition.properties[fieldName] = {
          $comment: `statusCodeOneOfIndexMap:${JSON.stringify(statusCodeOneOfIndexMap)}`,
          title: fieldName + '_response',
          oneOf: responseSchemas,
        };
      }
    } else {
      rootTypeDefinition.properties[fieldName] = await handleOperationResponseConfig(
        operationConfig as JSONSchemaOperationResponseConfig,
        {
          cwd,
          schemaHeaders,
          fetchFn,
          logger,
        },
      );
    }

    if (operationConfig.deprecated) {
      rootTypeDefinition.properties[fieldName].deprecated = true;
    }

    const rootTypeInputPropertyName = operationType + 'Input';
    const rootInputTypeName = rootTypeName + 'Input';
    const rootTypeInputTypeDefinition = (finalJsonSchema.properties[rootTypeInputPropertyName] =
      finalJsonSchema.properties[rootTypeInputPropertyName] || {
        type: 'object',
        title: rootInputTypeName,
        properties: {},
        writeOnly: true,
      });

    if (
      'queryParamsSample' in operationConfig &&
      operationConfig.queryParamsSample &&
      typeof operationConfig.queryParamsSample === 'object'
    ) {
      for (const queryParamName in operationConfig.queryParamsSample) {
        const example = operationConfig.queryParamsSample[queryParamName];
        const generatedSchema = toJsonSchema(example, {
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
        generatedSchema.examples = [example];
        const argName = sanitizeNameForGraphQL(queryParamName);
        operationConfig.queryParamArgMap = operationConfig.queryParamArgMap || {};
        operationConfig.queryParamArgMap[queryParamName] = argName;
        operationConfig.argTypeMap = operationConfig.argTypeMap || {};
        operationConfig.argTypeMap[argName] = generatedSchema as any;
      }
    }

    const interpolationKeys: string[] = getInterpolationKeys(...interpolationStrings);

    if ('queryParamArgMap' in operationConfig) {
      interpolationKeys.push(
        ...Object.values(operationConfig.queryParamArgMap).map(key => `args.${key}`),
      );
    }

    for (const interpolationKey of interpolationKeys) {
      const [initialObjectName, varName] = interpolationKey.split('.');

      if (initialObjectName === 'args') {
        rootTypeInputTypeDefinition.properties[fieldName] = rootTypeInputTypeDefinition.properties[
          fieldName
        ] || {
          title: `${rootTypeInputPropertyName}_${fieldName}`,
          type: 'object',
          properties: {},
        };
        if (operationConfig.argTypeMap != null && varName in operationConfig.argTypeMap) {
          const argTypeDef = operationConfig.argTypeMap[varName];
          if (typeof argTypeDef === 'object') {
            rootTypeInputTypeDefinition.properties[fieldName].properties[varName] = argTypeDef;
          } else {
            rootTypeInputTypeDefinition.properties[fieldName].properties[varName] = {
              $ref: argTypeDef,
            };
          }
        } else if (!rootTypeInputTypeDefinition.properties[fieldName].properties[varName]) {
          rootTypeInputTypeDefinition.properties[fieldName].properties[varName] = {
            type: 'string',
          };
        }
      }
    }

    if ('binary' in operationConfig) {
      const generatedSchema = {
        type: 'string',
        format: 'binary',
      };
      rootTypeInputTypeDefinition.properties[fieldName] = rootTypeInputTypeDefinition.properties[
        fieldName
      ] || {
        title: `${rootTypeInputPropertyName}_${fieldName}`,
        type: 'object',
        properties: {},
      };
      rootTypeInputTypeDefinition.properties[fieldName].properties.input = generatedSchema;
    } else if ('requestSchema' in operationConfig && operationConfig.requestSchema) {
      rootTypeInputTypeDefinition.properties[fieldName] = rootTypeInputTypeDefinition.properties[
        fieldName
      ] || {
        title: `${rootTypeInputPropertyName}_${fieldName}`,
        type: 'object',
        properties: {},
      };
      rootTypeInputTypeDefinition.properties[fieldName].properties.input =
        typeof operationConfig.requestSchema === 'string'
          ? {
              $ref: operationConfig.requestSchema,
              title: operationConfig.requestTypeName,
            }
          : operationConfig.requestSchema;
      if (operationConfig.requestSample) {
        rootTypeInputTypeDefinition.properties[fieldName].properties.input.examples =
          rootTypeInputTypeDefinition.properties[fieldName].properties.input.examples || [
            operationConfig.requestSample,
          ];
      }
    } else if ('requestSample' in operationConfig) {
      const sample =
        typeof operationConfig.requestSample === 'object'
          ? operationConfig.requestSample
          : await readFileOrUrl(operationConfig.requestSample, {
              cwd,
              headers: schemaHeaders,
              fetch: fetchFn,
              logger,
              importFn: defaultImportFn,
            }).catch((e: any) => {
              throw new Error(
                `${operationConfig.field}.requestSample: ${operationConfig.requestSample}; ${e.message}`,
              );
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
      generatedSchema.examples = [sample];
      rootTypeInputTypeDefinition.properties[fieldName] = rootTypeInputTypeDefinition.properties[
        fieldName
      ] || {
        title: `${rootTypeInputPropertyName}_${fieldName}`,
        type: 'object',
        properties: {},
      };
      rootTypeInputTypeDefinition.properties[fieldName].properties.input = generatedSchema;
    }
  }
  return finalJsonSchema;
}
