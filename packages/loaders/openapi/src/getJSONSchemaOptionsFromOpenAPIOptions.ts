import { defaultImportFn, readFileOrUrl, sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { JSONSchemaObject, dereferenceObject, resolvePath } from 'json-machete';
import { OpenAPIV3, OpenAPIV2 } from 'openapi-types';
import {
  HTTPMethod,
  JSONSchemaHTTPJSONOperationConfig,
  JSONSchemaOperationConfig,
  JSONSchemaOperationResponseConfig,
} from '@omnigraph/json-schema';
import { getFieldNameFromPath } from './utils';
import { OperationTypeNode } from 'graphql';
import { OpenAPILoaderSelectQueryOrMutationFieldConfig } from './types';
import { Logger } from '@graphql-mesh/types';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';

interface GetJSONSchemaOptionsFromOpenAPIOptionsParams {
  oasFilePath: OpenAPIV3.Document | OpenAPIV2.Document | string;
  fallbackFormat?: 'json' | 'yaml' | 'js' | 'ts';
  cwd?: string;
  fetch?: WindowOrWorkerGlobalScope['fetch'];
  baseUrl?: string;
  schemaHeaders?: Record<string, string>;
  operationHeaders?: Record<string, string>;
  selectQueryOrMutationField?: OpenAPILoaderSelectQueryOrMutationFieldConfig[];
  logger?: Logger;
}

export async function getJSONSchemaOptionsFromOpenAPIOptions({
  oasFilePath,
  fallbackFormat,
  cwd,
  fetch: fetchFn,
  baseUrl,
  schemaHeaders,
  operationHeaders,
  selectQueryOrMutationField = [],
  logger,
}: GetJSONSchemaOptionsFromOpenAPIOptionsParams) {
  const fieldTypeMap: Record<string, 'query' | 'mutation'> = {};
  for (const { fieldName, type } of selectQueryOrMutationField) {
    fieldTypeMap[fieldName] = type;
  }
  const schemaHeadersFactory = getInterpolatedHeadersFactory(schemaHeaders);
  logger?.debug(`Fetching OpenAPI Document from ${oasFilePath}`);
  const oasOrSwagger: OpenAPIV3.Document | OpenAPIV2.Document =
    typeof oasFilePath === 'string'
      ? await readFileOrUrl(oasFilePath, {
          cwd,
          fallbackFormat,
          headers: schemaHeadersFactory({ env: process.env }),
          fetch: fetchFn,
          importFn: defaultImportFn,
          logger,
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
        field: methodObj.operationId && sanitizeNameForGraphQL(methodObj.operationId),
        description: methodObj.description || methodObj.summary,
        schemaHeaders,
        operationHeaders,
        responseByStatusCode: {},
      } as JSONSchemaHTTPJSONOperationConfig & {
        responseByStatusCode: Record<string, JSONSchemaOperationResponseConfig>;
      };
      operations.push(operationConfig);
      for (const paramObjIndex in methodObj.parameters) {
        const paramObj = methodObj.parameters[paramObjIndex] as OpenAPIV2.ParameterObject | OpenAPIV3.ParameterObject;
        const argName = sanitizeNameForGraphQL(paramObj.name);
        switch (paramObj.in) {
          case 'query':
            if (method.toUpperCase() === 'GET') {
              const requestSchema = (operationConfig.requestSchema = operationConfig.requestSchema || {
                type: 'object',
                properties: {},
              }) as JSONSchemaObject;
              requestSchema.properties[paramObj.name] =
                paramObj.schema || paramObj.content?.['application/json']?.schema || paramObj;
              if (!requestSchema.properties[paramObj.name].title) {
                requestSchema.properties[paramObj.name].name = paramObj.name;
              }
              if (!requestSchema.properties[paramObj.name].description) {
                requestSchema.properties[paramObj.name].description = paramObj.description;
              }
              if (requestSchema.properties.__typename) {
                delete requestSchema.properties.__typename;
              }
              if (paramObj.required) {
                requestSchema.required = requestSchema.required || [];
                requestSchema.required.push(paramObj.name);
              }
            } else {
              if (!operationConfig.path.includes('?')) {
                operationConfig.path += '?';
              }
              operationConfig.path += `${paramObj.name}={args.${argName}}`;
            }
            break;
          case 'path': {
            // If it is in the path, let JSON Schema handler put it
            operationConfig.path = operationConfig.path.replace(`{${paramObj.name}}`, `{args.${argName}}`);
            break;
          }
          case 'header': {
            operationConfig.headers = operationConfig.headers || {};
            operationConfig.headers[paramObj.name] = `{args.${argName}}`;
            break;
          }
          case 'cookie': {
            operationConfig.headers = operationConfig.headers || {};
            operationConfig.headers.cookie = operationConfig.headers.cookie || '';
            const cookieParams = operationConfig.headers.cookie.split('; ');
            cookieParams.push(`${paramObj.name}={args.${argName}}`);
            operationConfig.headers.cookie = cookieParams.join('; ');
            break;
          }
          case 'body':
            if (paramObj.schema && Object.keys(paramObj.schema).length > 0) {
              operationConfig.requestSchema = `${oasFilePath}#/paths/${relativePath
                .split('/')
                .join('~1')}/${method}/parameters/${paramObjIndex}/schema`;
            }
            if (paramObj.example) {
              operationConfig.requestSample = paramObj.example;
            }
            if (paramObj.examples) {
              operationConfig.requestSample = Object.values(paramObj.examples)[0];
            }
            break;
        }
        switch (paramObj.schema?.type || (paramObj as any).type) {
          case 'string':
            operationConfig.argTypeMap = operationConfig.argTypeMap || {};
            operationConfig.argTypeMap[argName] = 'String';
            break;
          case 'integer':
            operationConfig.argTypeMap = operationConfig.argTypeMap || {};
            operationConfig.argTypeMap[argName] = 'Int';
            break;
          case 'number':
            operationConfig.argTypeMap = operationConfig.argTypeMap || {};
            operationConfig.argTypeMap[argName] = 'Float';
            break;
          case 'boolean':
            operationConfig.argTypeMap = operationConfig.argTypeMap || {};
            operationConfig.argTypeMap[argName] = 'Boolean';
            break;
        }
        if (paramObj.required) {
          operationConfig.argTypeMap = operationConfig.argTypeMap || {};
          operationConfig.argTypeMap[argName] = operationConfig.argTypeMap[argName] || 'ID';
          operationConfig.argTypeMap[argName] += '!';
        }
      }

      if ('requestBody' in methodObj) {
        const requestBodyObj = methodObj.requestBody;
        if ('content' in requestBodyObj) {
          const contentKey = Object.keys(requestBodyObj.content)[0];
          const contentSchema = requestBodyObj.content[contentKey]?.schema;
          if (contentSchema && Object.keys(contentSchema).length > 0) {
            operationConfig.requestSchema = `${oasFilePath}#/paths/${relativePath
              .split('/')
              .join('~1')}/${method}/requestBody/content/${contentKey?.toString().split('/').join('~1')}/schema`;
          }
          const examplesObj = requestBodyObj.content[contentKey]?.examples;
          if (examplesObj) {
            operationConfig.requestSample = Object.values(examplesObj)[0];
          }
        }
      }

      const responseByStatusCode = operationConfig.responseByStatusCode;

      // Handling multiple response types
      for (const responseKey in methodObj.responses) {
        const responseObj = methodObj.responses[responseKey] as OpenAPIV3.ResponseObject | OpenAPIV2.ResponseObject;

        let schemaObj: JSONSchemaObject;

        if ('content' in responseObj) {
          const contentKey = Object.keys(responseObj.content)[0];
          schemaObj = responseObj.content[contentKey].schema as any;
          if (schemaObj && Object.keys(schemaObj).length > 0) {
            responseByStatusCode[responseKey] = responseByStatusCode[responseKey] || {};
            responseByStatusCode[responseKey].responseSchema = `${oasFilePath}#/paths/${relativePath
              .split('/')
              .join('~1')}/${method}/responses/${responseKey}/content/${contentKey
              ?.toString()
              .split('/')
              .join('~1')}/schema`;
          }
          const examplesObj = responseObj.content[contentKey].examples;
          if (examplesObj) {
            responseByStatusCode[responseKey] = responseByStatusCode[responseKey] || {};
            responseByStatusCode[responseKey].responseSample = Object.values(examplesObj)[0];
          }
          const example = responseObj.content[contentKey].example;
          if (example) {
            responseByStatusCode[responseKey] = responseByStatusCode[responseKey] || {};
            responseByStatusCode[responseKey].responseSample = example;
          }
        } else if ('schema' in responseObj) {
          schemaObj = responseObj.schema as any;
          if (schemaObj && Object.keys(schemaObj).length > 0) {
            responseByStatusCode[responseKey] = responseByStatusCode[responseKey] || {};
            responseByStatusCode[responseKey].responseSchema = `${oasFilePath}#/paths/${relativePath
              .split('/')
              .join('~1')}/${method}/responses/${responseKey}/schema`;
          }
        } else if ('examples' in responseObj) {
          const examples = Object.values(responseObj.examples);
          responseByStatusCode[responseKey] = responseByStatusCode[responseKey] || {};
          responseByStatusCode[responseKey].responseSample = examples[0];
        } else if (responseKey.toString() === '204') {
          responseByStatusCode[responseKey] = responseByStatusCode[responseKey] || {};
          responseByStatusCode[responseKey].responseSchema = {
            type: 'null',
            description: responseObj.description,
          };
        }

        if ('links' in responseObj) {
          const dereferencedLinkObj = await dereferenceObject(
            {
              links: responseObj.links,
            },
            {
              cwd,
              root: oasOrSwagger,
              fetchFn,
              logger,
              headers: schemaHeaders,
            }
          );
          responseByStatusCode[responseKey].links = responseByStatusCode[responseKey].links || {};
          for (const linkName in dereferencedLinkObj.links) {
            const linkObj = responseObj.links[linkName];
            if ('$ref' in linkObj) {
              throw new Error('Unexpected $ref in dereferenced link object');
            }
            const args: Record<string, string> = {};
            for (const parameterName in linkObj.parameters || {}) {
              const parameterExp = linkObj.parameters[parameterName].split('-').join('_') as string;
              args[sanitizeNameForGraphQL(parameterName)] = parameterExp.startsWith('$')
                ? `{root.${parameterExp}}`
                : parameterExp.split('$').join('root.$');
            }
            if ('operationRef' in linkObj) {
              const [externalPath, ref] = linkObj.operationRef.split('#');
              if (externalPath) {
                if (process.env.DEBUG) {
                  console.warn(
                    `Skipping external operation reference ${linkObj.operationRef}\n Use additionalTypeDefs and additionalResolvers instead.`
                  );
                }
              } else {
                const actualOperation = resolvePath(ref, oasOrSwagger);
                if (actualOperation.operationId) {
                  const fieldName = sanitizeNameForGraphQL(actualOperation.operationId);
                  responseByStatusCode[responseKey].links[linkName] = {
                    fieldName,
                    args,
                    description: linkObj.description,
                  };
                } else {
                  console.warn('Missing operationId skipping...');
                }
              }
            } else if ('operationId' in linkObj) {
              responseByStatusCode[responseKey].links[linkName] = {
                fieldName: sanitizeNameForGraphQL(linkObj.operationId),
                args,
                description: linkObj.description,
              };
            }
          }
        }

        if (!operationConfig.field) {
          methodObj.operationId = getFieldNameFromPath(relativePath, method, schemaObj?.$ref);
          // Operation ID might not be avaiable so let's generate field name from path and response type schema
          operationConfig.field = sanitizeNameForGraphQL(methodObj.operationId);
        }

        // Give a better name to the request input object
        if (typeof operationConfig.requestSchema === 'object' && !operationConfig.requestSchema.title) {
          operationConfig.requestSchema.title = operationConfig.field + '_request';
        }
      }

      if (fieldTypeMap[operationConfig.field]) {
        operationConfig.type = fieldTypeMap[operationConfig.field] as OperationTypeNode;
      }
    }
  }

  return {
    operations,
    baseUrl,
    cwd,
    fetch: fetchFn,
    schemaHeaders,
    operationHeaders,
  };
}
