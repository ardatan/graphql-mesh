import { defaultImportFn, DefaultLogger, readFileOrUrl, sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { JSONSchemaObject, dereferenceObject, resolvePath, handleUntitledDefinitions } from 'json-machete';
import { OpenAPIV3, OpenAPIV2 } from 'openapi-types';
import {
  HTTPMethod,
  JSONSchemaHTTPJSONOperationConfig,
  JSONSchemaOperationConfig,
  JSONSchemaOperationResponseConfig,
  JSONSchemaPubSubOperationConfig,
  OperationHeadersConfiguration,
} from '@omnigraph/json-schema';
import { getFieldNameFromPath } from './utils.js';
import { OperationTypeNode } from 'graphql';
import { OpenAPILoaderSelectQueryOrMutationFieldConfig } from './types.js';
import { Logger } from '@graphql-mesh/types';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';

interface GetJSONSchemaOptionsFromOpenAPIOptionsParams {
  source: OpenAPIV3.Document | OpenAPIV2.Document | string;
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
    source,
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
  const fieldTypeMap: Record<string, OpenAPILoaderSelectQueryOrMutationFieldConfig['fieldName']> = {};
  for (const { fieldName, type } of selectQueryOrMutationField) {
    fieldTypeMap[fieldName] = type;
  }
  const schemaHeadersFactory = getInterpolatedHeadersFactory(schemaHeaders);
  logger?.debug(`Fetching OpenAPI Document from ${source}`);
  let oasOrSwagger: OpenAPIV3.Document | OpenAPIV2.Document =
    typeof source === 'string'
      ? await readFileOrUrl(source, {
          cwd,
          fallbackFormat,
          headers: schemaHeadersFactory({ env: process.env }),
          fetch: fetchFn,
          importFn: defaultImportFn,
          logger,
        })
      : source;

  handleUntitledDefinitions(oasOrSwagger);

  oasOrSwagger = (await dereferenceObject(oasOrSwagger)) as any;
  const operations: JSONSchemaOperationConfig[] = [];
  let baseOperationArgTypeMap: Record<string, JSONSchemaObject>;

  if (!baseUrl) {
    if ('servers' in oasOrSwagger) {
      const serverObj = oasOrSwagger.servers[0];
      baseUrl = serverObj.url.split('{').join('{args.');
      if (serverObj.variables) {
        for (const variableName in serverObj.variables) {
          const variable = serverObj.variables[variableName];
          if (!(variable as JSONSchemaObject).type) {
            (variable as JSONSchemaObject).type = 'string';
          }
          baseOperationArgTypeMap = baseOperationArgTypeMap || {};
          baseOperationArgTypeMap[variableName] = variable as JSONSchemaObject;
          if (variable.default) {
            baseUrl = baseUrl.replace(`{args.${variableName}}`, `{args.${variableName}:${variable.default}}`);
          }
        }
      }
    }

    if ('schemes' in oasOrSwagger && oasOrSwagger.schemes.length > 0 && oasOrSwagger.host) {
      baseUrl = oasOrSwagger.schemes[0] + '://' + oasOrSwagger.host;
      if ('basePath' in oasOrSwagger) {
        baseUrl += oasOrSwagger.basePath;
      }
    }
  }

  type OperationConfig = JSONSchemaHTTPJSONOperationConfig & {
    responseByStatusCode: Record<string, JSONSchemaOperationResponseConfig>;
  };

  const methodObjFieldMap = new WeakMap<OpenAPIV2.OperationObject | OpenAPIV3.OperationObject, OperationConfig>();

  for (const relativePath in oasOrSwagger.paths) {
    const pathObj = oasOrSwagger.paths[relativePath];
    const pathParameters = pathObj.parameters;
    for (const method in pathObj) {
      if (method === 'parameters') {
        continue;
      }
      const methodObj = pathObj[method] as OpenAPIV2.OperationObject | OpenAPIV3.OperationObject;
      const operationConfig: OperationConfig = {
        method: method.toUpperCase() as HTTPMethod,
        path: relativePath,
        type: method.toUpperCase() === 'GET' ? 'query' : 'mutation',
        field: methodObj.operationId && sanitizeNameForGraphQL(methodObj.operationId),
        description: methodObj.description || methodObj.summary,
        schemaHeaders,
        operationHeaders,
        responseByStatusCode: {},
        ...(baseOperationArgTypeMap
          ? {
              argTypeMap: {
                ...baseOperationArgTypeMap,
              },
            }
          : {}),
      } as OperationConfig;
      operations.push(operationConfig);
      methodObjFieldMap.set(methodObj, operationConfig);
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
        const paramObj = allParams[paramObjIndex] as OpenAPIV2.ParameterObject | OpenAPIV3.ParameterObject;
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
            if ('explode' in paramObj) {
              operationConfig.queryStringOptionsByParam = operationConfig.queryStringOptionsByParam || {};
              operationConfig.queryStringOptionsByParam[paramObj.name] =
                operationConfig.queryStringOptionsByParam[paramObj.name] || {};
              if (paramObj.explode) {
                operationConfig.queryStringOptionsByParam[paramObj.name].arrayFormat = 'repeat';
                operationConfig.queryStringOptionsByParam[paramObj.name].destructObject = true;
              } else {
                if (paramObj.style === 'form') {
                  operationConfig.queryStringOptionsByParam[paramObj.name].arrayFormat = 'comma';
                } else {
                  logger.warn(`Other styles including ${paramObj.style} of query parameters are not supported yet.`);
                }
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

            if (typeof operationHeaders === 'object' && operationHeaders[paramObj.name]) {
              paramObj.required = false;
              const valueFromGlobal = operationHeaders[paramObj.name];
              if (!valueFromGlobal.includes('{')) {
                if (paramObj.schema) {
                  paramObj.schema.default = valueFromGlobal;
                }
              } else {
                if (paramObj.schema?.default) {
                  delete paramObj.schema.default;
                }
              }
            }

            if (typeof operationHeaders === 'function') {
              paramObj.required = false;
              if (paramObj.schema?.default) {
                delete paramObj.schema.default;
              }
            }

            let defaultValueSuffix = '';

            if (paramObj.schema?.default) {
              defaultValueSuffix = `:${paramObj.schema.default}`;
            }

            operationConfig.headers[paramObj.name] = `{args.${argName}${defaultValueSuffix}}`;

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
              operationConfig.requestSchema = paramObj.schema;
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
        if (!('type' in paramObj) && !paramObj.schema && !paramObj.content && !paramObj.example && !paramObj.examples) {
          operationArgTypeMap[argName].type = 'string';
        }
      }

      if ('requestBody' in methodObj) {
        const requestBodyObj = methodObj.requestBody;
        if ('content' in requestBodyObj) {
          const contentKey = Object.keys(requestBodyObj.content)[0];
          const contentSchema = requestBodyObj.content[contentKey]?.schema;
          if (contentSchema && Object.keys(contentSchema).length > 0) {
            operationConfig.requestSchema = contentSchema as JSONSchemaObject;
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

        if ('consumes' in methodObj) {
          operationConfig.headers = operationConfig.headers || {};
          operationConfig.headers['Content-Type'] = methodObj.consumes.join(', ');
        }

        if ('produces' in methodObj) {
          operationConfig.headers = operationConfig.headers || {};
          operationConfig.headers.Accept = methodObj.produces.join(', ');
        }

        if ('content' in responseObj) {
          const responseObjForStatusCode: {
            oneOf: JSONSchemaObject[];
          } = {
            oneOf: [],
          };

          let allMimeTypes: string[] = [];
          if (typeof operationHeaders === 'object') {
            const acceptFromOperationHeader = operationHeaders.accept || operationHeaders.Accept;
            if (acceptFromOperationHeader) {
              allMimeTypes = [acceptFromOperationHeader];
            }
          }
          if (allMimeTypes.length === 0) {
            allMimeTypes = Object.keys(responseObj.content) as string[];
          }
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
              responseObjForStatusCode.oneOf.push(schemaObj);
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
            responseByStatusCode[responseKey].responseSchema = responseObjForStatusCode;
          }
        } else if ('schema' in responseObj) {
          schemaObj = responseObj.schema as any;
          if (schemaObj && Object.keys(schemaObj).length > 0) {
            responseByStatusCode[responseKey] = responseByStatusCode[responseKey] || {};
            responseByStatusCode[responseKey].responseSchema = schemaObj;
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
            const linkObj = responseObj.links[linkName] as OpenAPIV3.LinkObject;
            let args: Record<string, string>;
            if (linkObj.parameters) {
              args = {};
              for (const parameterName in linkObj.parameters) {
                const parameterExp = linkObj.parameters[parameterName];
                const sanitizedParamName = sanitizeNameForGraphQL(parameterName);
                if (typeof parameterExp === 'string') {
                  args[sanitizedParamName] = parameterExp.startsWith('$')
                    ? `{root.${parameterExp}}`
                    : parameterExp.split('$').join('root.$');
                } else {
                  args[sanitizedParamName] = parameterExp;
                }
              }
            }
            const sanitizedLinkName = sanitizeNameForGraphQL(linkName);
            if ('operationRef' in linkObj) {
              const [externalPath, ref] = linkObj.operationRef.split('#');
              if (externalPath) {
                logger.debug(
                  `Skipping external operation reference ${linkObj.operationRef}\n Use additionalTypeDefs and additionalResolvers instead.`
                );
              } else {
                const actualOperation = resolvePath(ref, oasOrSwagger);
                responseByStatusCode[responseKey].links[sanitizedLinkName] = {
                  get fieldName() {
                    const linkOperationConfig = methodObjFieldMap.get(actualOperation);
                    return linkOperationConfig.field;
                  },
                  args,
                  description: linkObj.description,
                };
              }
            } else if ('operationId' in linkObj) {
              responseByStatusCode[responseKey].links[sanitizedLinkName] = {
                fieldName: sanitizeNameForGraphQL(linkObj.operationId),
                args,
                description: linkObj.description,
              };
            }
          }
        }

        if (!operationConfig.field) {
          methodObj.operationId = getFieldNameFromPath(relativePath, method, schemaObj?.$resolvedRef);
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
          const callbackObj = methodObj.callbacks[callbackKey] as OpenAPIV3.CallbackObject;
          for (const callbackUrlRefKey in callbackObj) {
            if (callbackUrlRefKey.startsWith('$')) {
              continue;
            }
            const pubsubTopicSuffix = callbackUrlRefKey
              .split('$request.query')
              .join('args')
              .split('$request.body#/')
              .join('args.')
              .split('$response.body#/')
              .join('args.');
            const callbackOperationConfig: JSONSchemaPubSubOperationConfig = {
              type: OperationTypeNode.SUBSCRIPTION,
              field: '',
              pubsubTopic: '',
            };
            const callbackUrlObj = callbackObj[callbackUrlRefKey];
            for (const method in callbackUrlObj) {
              const callbackOperation: OpenAPIV3.OperationObject = callbackUrlObj[method];
              callbackOperationConfig.pubsubTopic = `webhook:${method}:${pubsubTopicSuffix}`;
              callbackOperationConfig.field = callbackOperation.operationId;
              callbackOperationConfig.description = callbackOperation.description || callbackOperation.summary;
              const requestBodyContents = (callbackOperation.requestBody as OpenAPIV3.RequestBodyObject)?.content;
              if (requestBodyContents) {
                callbackOperationConfig.responseSchema = requestBodyContents[Object.keys(requestBodyContents)[0]]
                  .schema as any;
              }
              const responses = callbackOperation.responses;
              if (responses) {
                const response = responses[Object.keys(responses)[0]];
                if (response) {
                  const responseContents = (response as OpenAPIV3.ResponseObject).content;
                  if (responseContents) {
                    callbackOperationConfig.requestSchema = responseContents[Object.keys(responseContents)[0]]
                      .schema as any;
                  }
                }
              }
            }
            callbackOperationConfig.field = callbackOperationConfig.field || sanitizeNameForGraphQL(callbackKey);
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
