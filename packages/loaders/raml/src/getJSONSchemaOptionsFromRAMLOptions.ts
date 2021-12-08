import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { HTTPMethod, JSONSchemaOperationConfig } from '@omnigraph/json-schema';
import { getAbsolutePath, getCwd, JSONSchemaObject } from 'json-machete';
import { api10, loadApi } from '@ardatan/raml-1-parser';
import { fetch as crossUndiciFetch } from 'cross-undici-fetch';
import toJsonSchema from 'to-json-schema';
import { RAMLLoaderOptions } from './types';

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
  const ramlAPI = (await loadApi(ramlAbsolutePath, [], {
    httpResolver: {
      getResourceAsync: async (url: string) => {
        const fetchResponse = await fetch(url, {
          headers: schemaHeaders,
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
  for (const typeNode of ramlAPI.types()) {
    const typeNodeJson = typeNode.toJSON();
    for (const typeName in typeNodeJson) {
      const { schemaPath } = typeNodeJson[typeName];
      if (schemaPath) {
        pathTypeMap.set(schemaPath, typeName);
      }
    }
  }
  const cwd = getCwd(ramlAbsolutePath);
  for (const resourceNode of ramlAPI.allResources()) {
    for (const methodNode of resourceNode.methods()) {
      let requestSchema: string | JSONSchemaObject;
      let responseSchema: string;
      const method = methodNode.method().toUpperCase() as HTTPMethod;
      const fieldName = methodNode.displayName();
      const description = methodNode.description()?.value() || resourceNode.description()?.value();
      let fullRelativeUrl = resourceNode.completeRelativeUri();
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
          (requestSchema as JSONSchemaObject).properties[parameterName] = toJsonSchema(queryParameterNodeJson.example, {
            required: false,
            strings: {
              detectFormat: true,
            },
          });
        }
        if (queryParameterNode.description) {
          (requestSchema as JSONSchemaObject).properties[parameterName].description =
            queryParameterNodeJson.description;
        }
      }

      for (const bodyNode of methodNode.body()) {
        if (bodyNode.name().includes('application/json')) {
          requestSchema = bodyNode.toJSON().schemaPath;
        }
      }
      for (const responseNode of methodNode.responses()) {
        if (responseNode.code().value().startsWith('2')) {
          for (const bodyNode of responseNode.body()) {
            if (bodyNode.name().includes('application/json')) {
              responseSchema = bodyNode.toJSON().schemaPath;
            }
          }
        }
      }
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
          requestTypeName: typeof requestSchema === 'string' ? pathTypeMap.get(requestSchema) : undefined,
          responseSchema,
          responseTypeName: pathTypeMap.get(responseSchema),
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
