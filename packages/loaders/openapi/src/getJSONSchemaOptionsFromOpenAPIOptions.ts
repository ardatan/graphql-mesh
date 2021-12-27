import { getInterpolatedHeadersFactory, readFileOrUrl, sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { dereferenceObject, healJSONSchema, JSONSchemaObject } from 'json-machete';
import { OpenAPIV3, OpenAPIV2 } from 'openapi-types';
import { HTTPMethod, JSONSchemaHTTPJSONOperationConfig, JSONSchemaOperationConfig } from '@omnigraph/json-schema';
import { env } from 'process';
import * as Swagger2OpenAPI from 'swagger2openapi';
import { getFieldNameFromPath } from './utils';

export async function getJSONSchemaOptionsFromOpenAPIOptions({
  oasFilePath,
  fallbackFormat,
  cwd,
  fetch,
  schemaHeaders,
  operationHeaders,
}: {
  oasFilePath: OpenAPIV3.Document | OpenAPIV2.Document | string;
  fallbackFormat?: 'json' | 'yaml' | 'js' | 'ts';
  cwd?: string;
  fetch?: WindowOrWorkerGlobalScope['fetch'];
  schemaHeaders?: Record<string, string>;
  operationHeaders?: Record<string, string>;
}) {
  const operations: JSONSchemaOperationConfig[] = [];
  const schemaHeadersFactory = getInterpolatedHeadersFactory(schemaHeaders);
  const fileContent: any =
    typeof oasFilePath === 'string'
      ? await readFileOrUrl(oasFilePath, {
          cwd,
          fallbackFormat,
          headers: schemaHeadersFactory({ env }),
          fetch,
        })
      : oasFilePath;
  const convertedOasv3: OpenAPIV3.Document = fileContent.swagger
    ? await Swagger2OpenAPI.convertObj(fileContent, {
        patch: true,
        warnOnly: true,
      }).then(({ openapi }: any) => openapi)
    : fileContent;
  const baseUrl = convertedOasv3.servers[0].url;
  const dereferencedOasSchema = await dereferenceObject(convertedOasv3, {
    cwd,
    fetch,
    headers: schemaHeadersFactory({ env }),
  });
  const healedOasSchema = await healJSONSchema(dereferencedOasSchema);
  for (const relativePath in healedOasSchema.paths) {
    const pathObj = healedOasSchema.paths[relativePath];
    for (const method in pathObj) {
      const methodObj = pathObj[method] as OpenAPIV3.OperationObject;
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
      for (const paramObj of methodObj.parameters as OpenAPIV3.ParameterObject[]) {
        switch (paramObj.in) {
          case 'query':
            if (paramObj.required) {
              if (!operationConfig.path.includes('?')) {
                operationConfig.path += '?';
              }
              operationConfig.path += `{args.${paramObj.name}}`;
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
      const responseObj = methodObj.responses[Object.keys(methodObj.responses)[0]] as OpenAPIV3.ResponseObject;
      const contentObj = responseObj.content[Object.keys(responseObj.content)[0]];
      operationConfig.responseSchema = contentObj.schema as JSONSchemaObject;

      // Operation ID might not be avaiable so let's generate field name from path and response type schema
      operationConfig.field =
        operationConfig.field ||
        sanitizeNameForGraphQL(
          getFieldNameFromPath(relativePath, method, operationConfig.responseSchema as JSONSchemaObject)
        );
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
