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
}

export async function getJSONSchemaOptionsFromOpenAPIOptions({
  oasFilePath,
  fallbackFormat,
  cwd,
  fetch,
  baseUrl,
  schemaHeaders,
  operationHeaders,
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
            if (paramObj.required) {
              if (!operationConfig.path.includes('?')) {
                operationConfig.path += '?';
              }
              operationConfig.path += `${paramObj.name}={args.${paramObj.name}}`;
            } else {
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
            }
            break;
          case 'path':
            // If it is in the path, let JSON Schema handler put it
            operationConfig.path = operationConfig.path.replace(`{${paramObj.name}}`, `{args.${paramObj.name}}`);
            break;
        }
      }
      const responseKey = Object.keys(methodObj.responses)[0];
      const responseObj = methodObj.responses[responseKey] as OpenAPIV3.ResponseObject | OpenAPIV2.ResponseObject;
      let schemaObj: JSONSchemaObject;

      if ('content' in responseObj) {
        const contentKey = Object.keys(responseObj.content)[0];
        operationConfig.responseSchema = `${oasFilePath}#/paths/${relativePath
          .split('/')
          .join('~1')}/${method}/responses/${responseKey}/content/${contentKey}/schema`;
        schemaObj = responseObj.content[contentKey].schema as any;
      } else if ('schema' in responseObj) {
        operationConfig.responseSchema = `${oasFilePath}#/paths/${relativePath
          .split('/')
          .join('~1')}/${method}/responses/${responseKey}/schema`;
        schemaObj = responseObj.schema as any;
      }

      // Operation ID might not be avaiable so let's generate field name from path and response type schema
      operationConfig.field =
        operationConfig.field || sanitizeNameForGraphQL(getFieldNameFromPath(relativePath, method, schemaObj.$ref));
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
