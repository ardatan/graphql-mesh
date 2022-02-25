import { getInterpolatedHeadersFactory, sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { HTTPMethod, JSONSchemaOperationConfig, JSONSchemaOperationResponseConfig } from '@omnigraph/json-schema';
import { getAbsolutePath, getCwd, JSONSchemaObject } from 'json-machete';
import { api10, loadApi } from '@ardatan/raml-1-parser';
import { fetch as crossUndiciFetch } from 'cross-undici-fetch';
import toJsonSchema from 'to-json-schema';
import { RAMLLoaderOptions } from './types';
import { env } from 'process';
import { asArray } from '@graphql-tools/utils';
import { getFieldNameFromPath } from './utils';

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
          headers: schemaHeadersFactory({ env }),
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
  const commonQueryParameters: api10.TypeDeclaration[] = [];
  for (const traitNode of ramlAPI.traits()) {
    commonQueryParameters.push(...traitNode.queryParameters());
  }
  for (const resourceNode of ramlAPI.allResources()) {
    for (const methodNode of resourceNode.methods()) {
      const queryParameters: api10.TypeDeclaration[] = [...commonQueryParameters];
      const bodyNodes: api10.TypeDeclaration[] = [];
      const responses: api10.Response[] = [];
      for (const traitRef of methodNode.is()) {
        const traitNode = traitRef.trait();
        if (traitNode) {
          queryParameters.push(...traitNode.queryParameters());
          bodyNodes.push(...traitNode.body());
          responses.push(...traitNode.responses());
        }
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
      const argTypeMap: Record<string, string> = {};
      for (const uriParameterNode of resourceNode.uriParameters()) {
        const paramName = uriParameterNode.name();
        fullRelativeUrl = fullRelativeUrl.replace(`{${paramName}}`, `{args.${paramName}}`);
        for (const typeName of uriParameterNode.type()) {
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
        if (uriParameterNode.required()) {
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
        for (const bodyNode of responseNode.body()) {
          if (bodyNode.name().includes('application/json')) {
            const bodyJson = bodyNode.toJSON();
            if (bodyJson.schemaPath) {
              const schemaPath = bodyJson.schemaPath;
              const typeName = pathTypeMap.get(schemaPath);
              responseByStatusCode[statusCode] = {
                responseSchema: schemaPath,
                responseTypeName: typeName,
              };
            } else if (bodyJson.type) {
              const typeName = asArray(bodyJson.type)[0];
              const schemaPath = typePathMap.get(typeName);
              responseByStatusCode[statusCode] = {
                responseSchema: schemaPath,
                responseTypeName: typeName,
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
