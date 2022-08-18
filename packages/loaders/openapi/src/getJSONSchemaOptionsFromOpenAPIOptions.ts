import { defaultImportFn, DefaultLogger, readFileOrUrl, sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { JSONSchemaObject, dereferenceObject, resolvePath } from 'json-machete';
import { OpenAPIV3, OpenAPIV2 } from 'openapi-types';
import {
  HTTPMethod,
  JSONSchemaHTTPJSONOperationConfig,
  JSONSchemaOperationConfig,
  JSONSchemaOperationResponseConfig,
  JSONSchemaPubSubOperationConfig,
  OperationHeadersConfiguration,
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
  operationHeaders?: OperationHeadersConfiguration;
  queryParams?: Record<string, any>;
  selectQueryOrMutationField?: OpenAPILoaderSelectQueryOrMutationFieldConfig[];
  logger?: Logger;
}

export async function getJSONSchemaOptionsFromOpenAPIOptions(
  name: string,
  {
    oasFilePath,
    fallbackFormat,
    cwd,
    fetch: fetchFn,
    baseUrl,
    schemaHeaders,
    operationHeaders,
    queryParams = {},
    selectQueryOrMutationField = [],
    logger = new DefaultLogger('getJSONSchemaOptionsFromOpenAPIOptions'),
  }: GetJSONSchemaOptionsFromOpenAPIOptionsParams
) {
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
    const pathParameters = pathObj.parameters;
    for (const method in pathObj) {
      if (method === 'parameters') {
        continue;
      }
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
      let allParams;
      if (methodObj.parameters && Array.isArray(methodObj.parameters)) {
        allParams = [...(pathParameters || []), ...methodObj.parameters];
      } else {
        allParams = {
          ...(pathParameters || {}),
          ...((methodObj.parameters || {}) as any),
        };
      }
      for (const paramObjIndex in allParams) {
        let paramObj = allParams[paramObjIndex] as OpenAPIV2.ParameterObject | OpenAPIV3.ParameterObject;
        if ('$ref' in paramObj) {
          paramObj = resolvePath(paramObj.$ref.split('#')[1], oasOrSwagger);
        }
        const argName = sanitizeNameForGraphQL(paramObj.name);
        const operationArgTypeMap = (operationConfig.argTypeMap = operationConfig.argTypeMap || {}) as Record<
          string,
          JSONSchemaObject
        >;

        switch (paramObj.in) {
          case 'query':
            operationConfig.queryParamArgMap = operationConfig.queryParamArgMap || {};
            operationConfig.queryParamArgMap[paramObj.name] = argName;
            if (paramObj.name in queryParams) {
              paramObj.required = false;
              if (!paramObj.schema?.default) {
                paramObj.schema = paramObj.schema || {
                  type: 'string',
                };
                paramObj.schema.default = queryParams[paramObj.name];
              }
            }
            break;
          case 'path': {
            // If it is in the path, let JSON Schema handler put it
            operationConfig.path = operationConfig.path.replace(`{${paramObj.name}}`, `{args.${argName}}`);
            break;
          }
          case 'header': {
            operationConfig.headers = operationConfig.headers || {};
            let defaultValue = '';
            if (typeof operationHeaders === 'object' && !operationHeaders[paramObj.name]?.includes('{')) {
              defaultValue = `:${operationHeaders[paramObj.name]}`;
            } else if (paramObj.schema?.default) {
              defaultValue = `:${paramObj.schema.default}`;
            }
            if (defaultValue) {
              paramObj.required = false;
            }
            operationConfig.headers[paramObj.name] = `{args.${argName}${defaultValue}}`;
            break;
          }
          case 'cookie': {
            operationConfig.headers = operationConfig.headers || {};
            operationConfig.headers.cookie = operationConfig.headers.cookie || '';
            const cookieParams = operationConfig.headers.cookie.split(' ').filter(c => !!c);
            cookieParams.push(`${paramObj.name}={args.${argName}};`);
            operationConfig.headers.cookie = `${cookieParams.join(' ')}`;
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

        operationArgTypeMap[argName] = paramObj.schema || paramObj.content?.['application/json']?.schema || paramObj;
        if (!operationArgTypeMap[argName].title) {
          operationArgTypeMap[argName].name = paramObj.name;
        }
        if (!operationArgTypeMap[argName].description) {
          operationArgTypeMap[argName].description = paramObj.description;
        }
        if (paramObj.required) {
          operationArgTypeMap[argName].nullable = false;
        }
        // Fix the reference
        if (operationArgTypeMap[argName].$ref?.startsWith('#')) {
          operationArgTypeMap[argName].$ref = `${oasFilePath}${operationArgTypeMap[argName].$ref}`;
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
          if (!operationConfig.headers?.['Content-Type'] && typeof contentKey === 'string') {
            operationConfig.headers = operationConfig.headers || {};
            operationConfig.headers['Content-Type'] = contentKey;
          }
        }
      }

      const responseByStatusCode = operationConfig.responseByStatusCode;

      // Handling multiple response types
      for (const responseKey in methodObj.responses) {
        const responseObj = methodObj.responses[responseKey] as OpenAPIV3.ResponseObject | OpenAPIV2.ResponseObject;

        let schemaObj: JSONSchemaObject;

        if ('content' in responseObj) {
          const responseObjForStatusCode: {
            oneOf: JSONSchemaObject[];
          } = {
            oneOf: [],
          };

          const allMimeTypes = Object.keys(responseObj.content);
          const jsonLikeMimeTypes = allMimeTypes.filter(c => c !== '*/*' && c.toString().includes('json'));
          const mimeTypes = jsonLikeMimeTypes.length > 0 ? jsonLikeMimeTypes : allMimeTypes;

          // If we have a better accept header, overwrite User's choice
          if ((!operationConfig.headers?.accept && !operationConfig.headers?.Accept) || mimeTypes.length === 1) {
            operationConfig.headers = operationConfig.headers || {};
            if (operationConfig.headers.Accept) {
              delete operationConfig.headers.Accept;
            }
            operationConfig.headers.accept =
              jsonLikeMimeTypes.length > 0 ? jsonLikeMimeTypes.join(',') : allMimeTypes[0].toString();
          }

          for (const contentKey in responseObj.content) {
            if (!mimeTypes.includes(contentKey)) {
              continue;
            }
            schemaObj = responseObj.content[contentKey].schema as any;
            if (schemaObj && Object.keys(schemaObj).length > 0) {
              responseObjForStatusCode.oneOf.push({
                $ref: `${oasFilePath}#/paths/${relativePath
                  .split('/')
                  .join('~1')}/${method}/responses/${responseKey}/content/${contentKey
                  ?.toString()
                  .split('/')
                  .join('~1')}/schema`,
              });
            } else if (contentKey.toString().startsWith('text')) {
              responseObjForStatusCode.oneOf.push({ type: 'string' });
            } else {
              const examplesObj = responseObj.content[contentKey].examples;
              if (examplesObj) {
                let examples = Object.values(examplesObj);
                if (contentKey.includes('json')) {
                  examples = examples.map(example => {
                    if (typeof example === 'string') {
                      return JSON.parse(example);
                    }
                    return example;
                  });
                }
                responseObjForStatusCode.oneOf.push({
                  examples,
                });
              }
              let example = responseObj.content[contentKey].example;
              if (example) {
                if (typeof example === 'string' && contentKey.includes('json')) {
                  example = JSON.parse(example);
                }
                responseObjForStatusCode.oneOf.push({
                  examples: [example],
                });
              }
            }
          }

          if (responseObjForStatusCode.oneOf.length === 1) {
            responseByStatusCode[responseKey] = responseByStatusCode[responseKey] || {};
            responseByStatusCode[responseKey].responseSchema = responseObjForStatusCode.oneOf[0];
          } else if (responseObjForStatusCode.oneOf.length > 1) {
            responseByStatusCode[responseKey] = responseByStatusCode[responseKey] || {};
            responseByStatusCode[responseKey].responseSchema = responseObjForStatusCode.oneOf;
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
          let example = examples[0];
          if (typeof example === 'string') {
            try {
              // Parse if possible
              example = JSON.parse(example);
            } catch (e) {
              // Do nothing
            }
          }
          responseByStatusCode[responseKey].responseSample = example;
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
            let linkObj = responseObj.links[linkName];
            if ('$ref' in linkObj) {
              linkObj = resolvePath(linkObj.$ref, oasOrSwagger) as OpenAPIV3.LinkObject;
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
                logger.debug(
                  `Skipping external operation reference ${linkObj.operationRef}\n Use additionalTypeDefs and additionalResolvers instead.`
                );
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
                  logger.debug('Missing operationId skipping...');
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

      if ('callbacks' in methodObj) {
        for (const callbackKey in methodObj.callbacks) {
          const callbackObj = methodObj.callbacks[callbackKey];
          for (const callbackUrlRefKey in callbackObj) {
            let callbackUrlRefObj = callbackObj[callbackUrlRefKey];
            if ('$ref' in callbackObj[callbackUrlRefKey]) {
              callbackUrlRefObj = resolvePath(callbackUrlRefObj.$ref, oasOrSwagger);
            }
            const fieldName = sanitizeNameForGraphQL(operationConfig.field + '_' + callbackKey);
            const callbackOperationConfig: JSONSchemaPubSubOperationConfig = {
              type: OperationTypeNode.SUBSCRIPTION,
              field: fieldName,
              pubsubTopic: '{args.callbackUrl}',
            };
            operations.push(callbackOperationConfig);
          }
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
