import { getInterpolatedHeadersFactory, readFileOrUrl, sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { JSONSchemaObject } from 'json-machete';
import { OpenAPIV3, OpenAPIV2 } from 'openapi-types';
import { HTTPMethod, JSONSchemaHTTPJSONOperationConfig, JSONSchemaOperationConfig } from '@omnigraph/json-schema';
import { env } from 'process';
import { getFieldNameFromPath } from './utils';

interface GetJSONSchemaOptionsFromOpenAPIOptionsParams {
  oasFilePath: OpenAPIV3.Document | OpenAPIV2.Document | string;
  fallbackFormat?: 'json' | 'yaml' | 'js' | 'ts';
  cwd?: string;
  fetch?: WindowOrWorkerGlobalScope['fetch'];
  baseUrl?: string;
  schemaHeaders?: Record<string, string>;
  operationHeaders?: Record<string, string>;
  respectErrorResponses?: boolean;
}

export async function getJSONSchemaOptionsFromOpenAPIOptions({
  oasFilePath,
  fallbackFormat,
  cwd,
  fetch,
  baseUrl,
  schemaHeaders,
  operationHeaders,
  respectErrorResponses,
}: GetJSONSchemaOptionsFromOpenAPIOptionsParams) {
  const schemaHeadersFactory = getInterpolatedHeadersFactory(schemaHeaders);
  const oasOrSwagger: OpenAPIV3.Document | OpenAPIV2.Document =
    typeof oasFilePath === 'string'
      ? await readFileOrUrl(oasFilePath, {
          cwd,
          fallbackFormat,
          headers: schemaHeadersFactory({ env }),
          fetch,
        })
      : oasFilePath;
  const operations: JSONSchemaOperationConfig[] = [];

  if ('servers' in oasOrSwagger) {
    baseUrl = baseUrl || oasOrSwagger.servers[0].url;
  }

  for (const relativePath in oasOrSwagger.paths) {
    const pathObj = oasOrSwagger.paths[relativePath];
    for (const method in pathObj) {
      const methodObj = pathObj[method] as OpenAPIV2.OperationObject | OpenAPIV3.OperationObject;
      const operationConfig = {
        method: method.toUpperCase() as HTTPMethod,
        path: relativePath,
        type: method.toUpperCase() === 'GET' ? 'query' : 'mutation',
        field: methodObj.operationId,
        description: methodObj.description,
        schemaHeaders,
        operationHeaders,
      } as JSONSchemaHTTPJSONOperationConfig;
      operations.push(operationConfig);
      for (const paramObj of methodObj.parameters as OpenAPIV2.ParameterObject[] | OpenAPIV3.ParameterObject[]) {
        switch (paramObj.in) {
          case 'query':
            if (method.toUpperCase() === 'GET') {
              const requestSchema = (operationConfig.requestSchema = operationConfig.requestSchema || {
                type: 'object',
                properties: {},
              }) as JSONSchemaObject;
              requestSchema.properties[paramObj.name] = paramObj.schema || paramObj;
              if (!requestSchema.properties[paramObj.name].title) {
                requestSchema.properties[paramObj.name].name = paramObj.name;
              }
              if (!requestSchema.properties[paramObj.name].description) {
                requestSchema.properties[paramObj.name].description = paramObj.description;
              }
            } else {
              if (!operationConfig.path.includes('?')) {
                operationConfig.path += '?';
              }
              operationConfig.path += `${paramObj.name}={args.${paramObj.name}}`;
              switch (paramObj.schema?.type || (paramObj as any).type) {
                case 'string':
                  operationConfig.argTypeMap = operationConfig.argTypeMap || {};
                  operationConfig.argTypeMap[paramObj.name] = 'String';
                  break;
                case 'integer':
                  operationConfig.argTypeMap = operationConfig.argTypeMap || {};
                  operationConfig.argTypeMap[paramObj.name] = 'Int';
                  break;
                case 'number':
                  operationConfig.argTypeMap = operationConfig.argTypeMap || {};
                  operationConfig.argTypeMap[paramObj.name] = 'Float';
                  break;
                case 'boolean':
                  operationConfig.argTypeMap = operationConfig.argTypeMap || {};
                  operationConfig.argTypeMap[paramObj.name] = 'Boolean';
                  break;
              }
            }
            break;
          case 'path':
            // If it is in the path, let JSON Schema handler put it
            operationConfig.path = operationConfig.path.replace(`{${paramObj.name}}`, `{args.${paramObj.name}}`);
            break;
          case 'header':
            operationConfig.headers = operationConfig.headers || {};
            operationConfig.headers[paramObj.name] = `{args.${paramObj.name}}`;
            break;
          case 'cookie': {
            operationConfig.headers = operationConfig.headers || {};
            operationConfig.headers.cookie = operationConfig.headers.cookie || '';
            const cookieParams = operationConfig.headers.cookie.split('; ');
            cookieParams.push(`${paramObj.name}={args.${paramObj.name}}`);
            operationConfig.headers.cookie = cookieParams.join('; ');
            break;
          }
          case 'body':
            operationConfig.requestSchema = paramObj.schema;
            break;
        }
      }

      if ('requestBody' in methodObj) {
        const requestBodyObj = methodObj.requestBody as OpenAPIV3.RequestBodyObject;
        const contentKey = Object.keys(requestBodyObj.content)[0];
        const contentObj = requestBodyObj.content[contentKey];
        operationConfig.requestSchema = contentObj.schema as any;
      }

      const responseSchemaUnion = (operationConfig.responseSchema = {
        oneOf: [],
      }) as JSONSchemaObject;

      // Handling multiple response types
      for (const responseKey in methodObj.responses) {
        // Only take successful responses
        if (!respectErrorResponses && !(responseKey.startsWith('2') || responseKey === 'default')) {
          continue;
        }
        const responseObj = methodObj.responses[responseKey] as OpenAPIV3.ResponseObject | OpenAPIV2.ResponseObject;
        let schemaObj: JSONSchemaObject;

        if ('content' in responseObj) {
          const contentKey = Object.keys(responseObj.content)[0];
          responseSchemaUnion.oneOf.push({
            $ref: `${oasFilePath}#/paths/${relativePath
              .split('/')
              .join('~1')}/${method}/responses/${responseKey}/content/${contentKey}/schema`,
          });
          schemaObj = responseObj.content[contentKey].schema as any;
        } else if ('schema' in responseObj) {
          responseSchemaUnion.oneOf.push({
            $ref: `${oasFilePath}#/paths/${relativePath
              .split('/')
              .join('~1')}/${method}/responses/${responseKey}/schema`,
          });
          schemaObj = responseObj.schema as any;
        }

        if (!operationConfig.field) {
          // Operation ID might not be avaiable so let's generate field name from path and response type schema
          operationConfig.field = sanitizeNameForGraphQL(getFieldNameFromPath(relativePath, method, schemaObj.$ref));
        }

        // Give a better name to the request input object
        if (typeof operationConfig.requestSchema === 'object' && !operationConfig.requestSchema.title) {
          operationConfig.requestSchema.title = operationConfig.field + '_request';
        }

        // If we don't need unsuccessful response types, just break the loop to have singular response type
        if (!respectErrorResponses) {
          break;
        }
      }

      // If response types are singular, no need to have unions
      if (responseSchemaUnion.oneOf.length === 1) {
        operationConfig.responseSchema = responseSchemaUnion.oneOf[0];
      }
    }
  }

  return {
    operations,
    baseUrl,
    cwd,
    fetch,
    schemaHeaders,
    operationHeaders,
  };
}
