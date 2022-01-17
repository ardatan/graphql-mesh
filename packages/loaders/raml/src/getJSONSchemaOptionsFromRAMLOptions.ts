import { getInterpolatedHeadersFactory, sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { HTTPMethod, JSONSchemaOperationConfig } from '@omnigraph/json-schema';
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
}: RAMLLoaderOptions): Promise<{
  operations: JSONSchemaOperationConfig[];
  cwd: string;
  baseUrl: string;
  fetch?: WindowOrWorkerGlobalScope['fetch'];
}> {
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
  for (const resourceNode of ramlAPI.allResources()) {
    for (const methodNode of resourceNode.methods()) {
      let requestSchema: string | JSONSchemaObject;
      let requestTypeName: string;
      let responseSchema: string | JSONSchemaObject;
      let responseTypeName: string;
      const method = methodNode.method().toUpperCase() as HTTPMethod;
      let fieldName = methodNode.displayName()?.replace('GET_', '');
      const description = methodNode.description()?.value() || resourceNode.description()?.value();
      const originalFullRelativeUrl = resourceNode.completeRelativeUri();
      let fullRelativeUrl = originalFullRelativeUrl;
      for (const uriParameterNode of resourceNode.uriParameters()) {
        const paramName = uriParameterNode.name();
        fullRelativeUrl = fullRelativeUrl.replace(`{${paramName}}`, `{args.${paramName}}`);
      }
      for (const queryParameterNode of methodNode.queryParameters()) {
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
        if ('enum' in queryParameterNodeJson) {
          (requestSchema as JSONSchemaObject).properties[parameterName] = {
            type: 'string',
            enum: queryParameterNodeJson.enum,
          };
        } else {
          (requestSchema as JSONSchemaObject).properties[parameterName] = toJsonSchema(
            queryParameterNodeJson.example || queryParameterNodeJson.default,
            {
              required: false,
              strings: {
                detectFormat: true,
              },
            }
          );
        }
        if (queryParameterNode.description) {
          (requestSchema as JSONSchemaObject).properties[parameterName].description =
            queryParameterNodeJson.description;
        }
      }

      for (const bodyNode of methodNode.body()) {
        if (bodyNode.name().includes('application/json')) {
          const bodyJson = bodyNode.toJSON();
          if (bodyJson.schemaPath) {
            const schemaPath = bodyJson.schemaPath;
            requestTypeName = pathTypeMap.get(schemaPath);
            requestSchema = schemaPath;
          } else if (bodyJson.type) {
            const typeNames = asArray(bodyJson.type);
            requestSchema = {
              oneOf: typeNames.map(typeName => ({
                title: typeName,
                $ref: typePathMap.get(typeName),
              })),
            };
            if (requestSchema.oneOf?.length === 1) {
              requestSchema = requestSchema.oneOf[0] as any;
              requestTypeName = (requestSchema as any).title;
            }
          }
        }
      }
      for (const responseNode of methodNode.responses()) {
        if (responseNode.code().value().startsWith('2')) {
          for (const bodyNode of responseNode.body()) {
            if (bodyNode.name().includes('application/json')) {
              const bodyJson = bodyNode.toJSON();
              if (bodyJson.schemaPath) {
                const schemaPath = bodyJson.schemaPath;
                const typeName = pathTypeMap.get(schemaPath);
                responseSchema = schemaPath;
                responseTypeName = typeName;
              } else if (bodyJson.type) {
                const typeNames = asArray(bodyJson.type);
                responseSchema = {
                  oneOf: typeNames.map(typeName => ({
                    title: typeName,
                    $ref: typePathMap.get(typeName),
                  })),
                };
                if (responseSchema.oneOf?.length === 1) {
                  responseSchema = responseSchema.oneOf[0] as any;
                  responseTypeName = (responseSchema as any).title;
                }
              }
            }
          }
        }
      }
      fieldName = fieldName || getFieldNameFromPath(originalFullRelativeUrl, method, responseTypeName);
      if (fieldName) {
        const operationType: any = method === 'GET' ? 'query' : 'mutation';
        const graphQLFieldName = sanitizeNameForGraphQL(fieldName);
        operations.push({
          type: operationType,
          field: graphQLFieldName,
          description,
          path: fullRelativeUrl,
          method,
          requestSchema,
          requestTypeName,
          responseSchema,
          responseTypeName,
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
