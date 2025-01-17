import type { JSONSchemaObject } from 'json-machete';
import { getAbsolutePath, getCwd } from 'json-machete';
import toJsonSchema from 'to-json-schema';
import type { api10 } from '@ardatan/raml-1-parser';
import { loadApi } from '@ardatan/raml-1-parser';
import { process } from '@graphql-mesh/cross-helpers';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import type { MeshFetch } from '@graphql-mesh/types';
import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { asArray } from '@graphql-tools/utils';
import type {
  HTTPMethod,
  JSONSchemaOperationConfig,
  JSONSchemaOperationResponseConfig,
} from '@omnigraph/json-schema';
import { fetch as crossUndiciFetch } from '@whatwg-node/fetch';
import type { RAMLLoaderOptions, SelectQueryOrMutationFieldConfig } from './types.js';
import { getFieldNameFromPath } from './utils.js';

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
  source,
  cwd: ramlFileCwd = process.cwd(),
  operations: extraOperations,
  endpoint: forcedBaseUrl,
  fetch = crossUndiciFetch,
  schemaHeaders = {},
  selectQueryOrMutationField = [],
}: RAMLLoaderOptions): Promise<{
  operations: JSONSchemaOperationConfig[];
  cwd: string;
  endpoint: string;
  fetch?: MeshFetch;
}> {
  const fieldTypeMap: Record<string, SelectQueryOrMutationFieldConfig['fieldName']> = {};
  for (const { fieldName, type } of selectQueryOrMutationField) {
    fieldTypeMap[fieldName] = type;
  }
  const operations = extraOperations || [];
  const ramlAbsolutePath = getAbsolutePath(source, ramlFileCwd);
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
  let endpoint = forcedBaseUrl;
  if (!endpoint) {
    endpoint = ramlAPI.baseUri().value();
    for (const endpointParamNode of ramlAPI.baseUriParameters()) {
      const paramName = endpointParamNode.name();
      endpoint = endpoint.split(`{${paramName}}`).join(`{context.${paramName}}`);
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
      const argTypeMap: Record<string, JSONSchemaObject> = {};
      const queryParamArgMap: Record<string, string> = {};
      for (const uriParameterNode of resourceNode.uriParameters()) {
        const paramName = uriParameterNode.name();
        const argName = sanitizeNameForGraphQL(paramName);
        fullRelativeUrl = fullRelativeUrl.replace(`{${paramName}}`, `{args.${argName}}`);
        const uriParameterNodeJson = uriParameterNode.toJSON();
        if (uriParameterNodeJson.displayName) {
          uriParameterNodeJson.title = uriParameterNodeJson.displayName;
        }
        argTypeMap[argName] = uriParameterNodeJson;
      }
      for (const queryParameterNode of queryParameters) {
        const parameterName = queryParameterNode.name();
        const argName = sanitizeNameForGraphQL(parameterName);
        const queryParameterNodeJson = queryParameterNode.toJSON();
        if (queryParameterNodeJson.displayName) {
          queryParameterNodeJson.title = queryParameterNodeJson.displayName;
        }
        queryParamArgMap[parameterName] = argName;
        argTypeMap[argName] = queryParameterNodeJson;
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
        getFieldNameFromPath(
          originalFullRelativeUrl,
          method,
          responseByStatusCode['200']?.responseTypeName,
        );
      if (fieldName) {
        const graphQLFieldName = sanitizeNameForGraphQL(fieldName);
        const operationType: any =
          (fieldTypeMap[graphQLFieldName] ?? method === 'GET') ? 'query' : 'mutation';
        operations.push({
          type: operationType,
          field: graphQLFieldName,
          description,
          path: fullRelativeUrl,
          method,
          requestSchema,
          requestTypeName,
          responseByStatusCode,
          queryParamArgMap,
          argTypeMap,
        });
      }
    }
  }
  return {
    operations,
    endpoint,
    cwd,
    fetch,
  };
}
