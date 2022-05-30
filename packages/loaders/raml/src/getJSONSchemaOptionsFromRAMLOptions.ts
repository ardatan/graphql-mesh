import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { HTTPMethod, JSONSchemaOperationConfig, JSONSchemaOperationResponseConfig } from '@omnigraph/json-schema';
import { getAbsolutePath, getCwd, JSONSchemaObject } from 'json-machete';
import { api10, loadApi } from '@ardatan/raml-1-parser';
import { fetch as crossUndiciFetch } from 'cross-undici-fetch';
import toJsonSchema from 'to-json-schema';
import { RAMLLoaderOptions } from './types';
import { asArray } from '@graphql-tools/utils';
import { getFieldNameFromPath } from './utils';
import { GraphQLEnumType, GraphQLEnumValueConfigMap, GraphQLInputType } from 'graphql';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';

function resolveTraitsByIs(base: { is: () => api10.TraitRef[] }) {
  const allTraits: api10.Trait[] = [];
  for (const traitRef of base.is()) {
    const traitNode = traitRef.trait();
    if (traitNode) {
      allTraits.push(traitNode);
      allTraits.push(...resolveTraitsByIs(traitNode));
    }
  }
  return allTraits;
}

/**
 * Generates the options for JSON Schema Loader
 * from RAML Loader options by extracting the JSON Schema references
 * from RAML API Document
 */
export async function getJSONSchemaOptionsFromRAMLOptions({
  ramlFilePath,
  cwd: ramlFileCwd = process.cwd(),
  operations: extraOperations,
  baseUrl: forcedBaseUrl,
  fetch = crossUndiciFetch,
  schemaHeaders = {},
  selectQueryOrMutationField = [],
}: RAMLLoaderOptions): Promise<{
  operations: JSONSchemaOperationConfig[];
  cwd: string;
  baseUrl: string;
  fetch?: WindowOrWorkerGlobalScope['fetch'];
}> {
  const fieldTypeMap: Record<string, 'query' | 'mutation'> = {};
  for (const { fieldName, type } of selectQueryOrMutationField) {
    fieldTypeMap[fieldName] = type;
  }
  const operations = extraOperations || [];
  const ramlAbsolutePath = getAbsolutePath(ramlFilePath, ramlFileCwd);
  const schemaHeadersFactory = getInterpolatedHeadersFactory(schemaHeaders);
  const ramlAPI = (await loadApi(ramlAbsolutePath, [], {
    httpResolver: {
      getResourceAsync: async (url: string) => {
        const fetchResponse = await fetch(url, {
          headers: schemaHeadersFactory({ env: process.env }),
        });
        const content = await fetchResponse.text();
        if (fetchResponse.status !== 200) {
          return {
            errorMessage: content,
          };
        }
        return {
          content,
        };
      },
      getResource: () => {
        throw new Error(`Sync fetching not available for URLs`);
      },
    },
  })) as api10.Api;
  let baseUrl = forcedBaseUrl;
  if (!baseUrl) {
    baseUrl = ramlAPI.baseUri().value();
    for (const baseUrlParamNode of ramlAPI.baseUriParameters()) {
      const paramName = baseUrlParamNode.name();
      baseUrl = baseUrl.split(`{${paramName}}`).join(`{context.${paramName}}`);
    }
  }
  const pathTypeMap = new Map<string, string>();
  const typePathMap = new Map<string, string>();
  for (const typeNode of ramlAPI.types()) {
    const typeNodeJson = typeNode.toJSON();
    for (const typeName in typeNodeJson) {
      const { schemaPath } = typeNodeJson[typeName];
      if (schemaPath) {
        pathTypeMap.set(schemaPath, typeName);
        typePathMap.set(typeName, schemaPath);
      }
    }
  }
  const cwd = getCwd(ramlAbsolutePath);
  const apiQueryParameters: api10.TypeDeclaration[] = [];
  const apiBodyNodes: api10.TypeDeclaration[] = [];
  const apiResponses: api10.Response[] = [];
  for (const traitNode of ramlAPI.traits()) {
    apiQueryParameters.push(...traitNode.queryParameters());
    apiBodyNodes.push(...traitNode.body());
    apiResponses.push(...traitNode.responses());
    const nestedTraits = resolveTraitsByIs(traitNode);
    for (const nestedTrait of nestedTraits) {
      apiQueryParameters.push(...nestedTrait.queryParameters());
      apiBodyNodes.push(...nestedTrait.body());
      apiResponses.push(...nestedTrait.responses());
    }
  }
  for (const resourceNode of ramlAPI.allResources()) {
    const resourceQueryParameters: api10.TypeDeclaration[] = [...apiQueryParameters];
    const resourceBodyNodes: api10.TypeDeclaration[] = [...apiBodyNodes];
    const resourceResponses: api10.Response[] = [...apiResponses];
    const resourceTraits = resolveTraitsByIs(resourceNode);
    for (const traitNode of resourceTraits) {
      apiQueryParameters.push(...traitNode.queryParameters());
      apiBodyNodes.push(...traitNode.body());
      apiResponses.push(...traitNode.responses());
    }
    for (const methodNode of resourceNode.methods()) {
      const queryParameters: api10.TypeDeclaration[] = [...resourceQueryParameters];
      const bodyNodes: api10.TypeDeclaration[] = [...resourceBodyNodes];
      const responses: api10.Response[] = [...resourceResponses];
      const traits = resolveTraitsByIs(methodNode);
      for (const traitNode of traits) {
        queryParameters.push(...traitNode.queryParameters());
        bodyNodes.push(...traitNode.body());
        responses.push(...traitNode.responses());
      }
      queryParameters.push(...methodNode.queryParameters());
      bodyNodes.push(...methodNode.body());
      responses.push(...methodNode.responses());
      let requestSchema: string | JSONSchemaObject;
      let requestTypeName: string;
      const responseByStatusCode: Record<string, JSONSchemaOperationResponseConfig> = {};
      const method = methodNode.method().toUpperCase() as HTTPMethod;
      let fieldName = methodNode.displayName()?.replace('GET_', '');
      const description = methodNode.description()?.value() || resourceNode.description()?.value();
      const originalFullRelativeUrl = resourceNode.completeRelativeUri();
      let fullRelativeUrl = originalFullRelativeUrl;
      const argTypeMap: Record<string, string | GraphQLInputType> = {};
      for (const uriParameterNode of resourceNode.uriParameters()) {
        const paramName = uriParameterNode.name();
        fullRelativeUrl = fullRelativeUrl.replace(`{${paramName}}`, `{args.${paramName}}`);
        const uriParameterNodeJson = uriParameterNode.toJSON();
        for (const typeName of asArray(uriParameterNodeJson.type)) {
          switch (typeName) {
            case 'number':
              argTypeMap[paramName] = 'Float';
              break;
            case 'boolean':
              argTypeMap[paramName] = 'Boolean';
              break;
            case 'integer':
              argTypeMap[paramName] = 'Int';
              break;
            default:
              argTypeMap[paramName] = 'String';
              break;
          }
        }
        /* raml pattern is different
        if (uriParameterNodeJson.pattern) {
          const typeName = sanitizeNameForGraphQL(uriParameterNodeJson.displayName || `${fieldName}_${paramName}`);
          argTypeMap[paramName] = new RegularExpression(typeName, new RegExp(uriParameterNodeJson.pattern), {
            description: uriParameterNodeJson.description,
          });
        }
        */
        if (uriParameterNodeJson.enum) {
          const typeName = sanitizeNameForGraphQL(uriParameterNodeJson.displayName || `${fieldName}_${paramName}`);
          const values: GraphQLEnumValueConfigMap = {};
          for (const value of asArray(uriParameterNodeJson.enum)) {
            let enumKey = sanitizeNameForGraphQL(value.toString());
            if (enumKey === 'false' || enumKey === 'true' || enumKey === 'null') {
              enumKey = enumKey.toUpperCase();
            }
            if (typeof enumKey === 'string' && enumKey.length === 0) {
              enumKey = '_';
            }
            values[enumKey] = {
              // Falsy values are ignored by GraphQL
              // eslint-disable-next-line no-unneeded-ternary
              value: value ? value : value?.toString(),
            };
          }
          argTypeMap[paramName] = new GraphQLEnumType({
            name: typeName,
            description: uriParameterNodeJson.description,
            values,
          });
        }
        if (uriParameterNodeJson.required) {
          argTypeMap[paramName] += '!';
        }
      }
      for (const queryParameterNode of queryParameters) {
        requestSchema = requestSchema || {
          type: 'object',
          properties: {},
          required: [],
        };
        const parameterName = queryParameterNode.name();
        const queryParameterNodeJson = queryParameterNode.toJSON();
        if (queryParameterNodeJson.required) {
          (requestSchema as JSONSchemaObject).required.push(parameterName);
        }
        if (queryParameterNodeJson.enum) {
          (requestSchema as JSONSchemaObject).properties[parameterName] = {
            type: 'string',
            enum: queryParameterNodeJson.enum,
          };
        }
        if (queryParameterNodeJson.type) {
          (requestSchema as JSONSchemaObject).properties[parameterName] = {
            type: asArray(queryParameterNodeJson.type)[0] || 'string',
          };
        } else {
          (requestSchema as JSONSchemaObject).properties[parameterName] = toJsonSchema(
            queryParameterNodeJson.example ?? queryParameterNodeJson.default,
            {
              required: false,
              strings: {
                detectFormat: true,
              },
            }
          );
        }
        if (queryParameterNodeJson.displayName) {
          (requestSchema as JSONSchemaObject).properties[parameterName].title = queryParameterNodeJson.displayName;
        }
        if (queryParameterNode.description) {
          (requestSchema as JSONSchemaObject).properties[parameterName].description =
            queryParameterNodeJson.description;
        }
      }

      for (const bodyNode of bodyNodes) {
        if (bodyNode.name().includes('application/json')) {
          const bodyJson = bodyNode.toJSON();
          if (bodyJson.schemaPath) {
            const schemaPath = bodyJson.schemaPath;
            requestSchema = schemaPath;
            requestTypeName = pathTypeMap.get(schemaPath);
          } else if (bodyJson.type) {
            const typeName = asArray(bodyJson.type)[0];
            requestTypeName = typeName;
            const schemaPath = typePathMap.get(typeName);
            requestSchema = schemaPath;
          }
        }
      }
      for (const responseNode of responses) {
        const statusCode = responseNode.code().value();
        const responseNodeDescription = responseNode.description()?.value();
        for (const bodyNode of responseNode.body()) {
          if (bodyNode.name().includes('application/json')) {
            const bodyJson = bodyNode.toJSON();
            if (bodyJson.schemaPath) {
              const schemaPath = bodyJson.schemaPath;
              const typeName = pathTypeMap.get(schemaPath);
              if (schemaPath) {
                responseByStatusCode[statusCode] = {
                  responseSchema: schemaPath,
                  responseTypeName: typeName,
                };
              }
            } else if (bodyJson.type) {
              const typeName = asArray(bodyJson.type)[0];
              const schemaPath = typePathMap.get(typeName);
              if (schemaPath) {
                responseByStatusCode[statusCode] = {
                  responseSchema: schemaPath,
                  responseTypeName: typeName,
                };
              }
            }
            if (!responseByStatusCode[statusCode] && bodyJson.example) {
              const responseSchema = toJsonSchema(bodyJson.example, {
                required: false,
              }) as any;
              responseSchema.description = responseNodeDescription;
              responseByStatusCode[statusCode] = {
                responseSchema,
              };
            }
          }
        }
      }
      fieldName =
        fieldName ||
        getFieldNameFromPath(originalFullRelativeUrl, method, responseByStatusCode['200']?.responseTypeName);
      if (fieldName) {
        const graphQLFieldName = sanitizeNameForGraphQL(fieldName);
        const operationType: any = fieldTypeMap[graphQLFieldName] ?? method === 'GET' ? 'query' : 'mutation';
        operations.push({
          type: operationType,
          field: graphQLFieldName,
          description,
          path: fullRelativeUrl,
          method,
          requestSchema,
          requestTypeName,
          responseByStatusCode,
          argTypeMap,
        });
      }
    }
  }
  return {
    operations,
    baseUrl,
    cwd,
    fetch,
  };
}
