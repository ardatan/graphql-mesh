import { GraphQLJSON, ObjectTypeComposer, ObjectTypeComposerFieldConfig, SchemaComposer } from 'graphql-compose';
import { Logger, MeshPubSub } from '@graphql-mesh/types';
import { JSONSchemaLinkConfig, JSONSchemaOperationConfig, OperationHeadersConfiguration } from './types';
import { getOperationMetadata, isPubSubOperationConfig, isFileUpload, cleanObject } from './utils';
import { memoize1 } from '@graphql-tools/utils';
import urlJoin from 'url-join';
import { resolveDataByUnionInputType } from './resolveDataByUnionInputType';
import { stringify as qsStringify, parse as qsParse, IStringifyOptions } from 'qs';
import {
  getNamedType,
  GraphQLError,
  GraphQLFieldResolver,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLResolveInfo,
  GraphQLString,
  isListType,
  isNonNullType,
  isScalarType,
  isUnionType,
} from 'graphql';
import lodashSet from 'lodash.set';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';
import { getHeadersObj, MeshFetch } from '@graphql-mesh/utils';

export interface AddExecutionLogicToComposerOptions {
  schemaComposer: SchemaComposer;
  baseUrl: string;
  operations: JSONSchemaOperationConfig[];
  operationHeaders?: OperationHeadersConfiguration;
  fetch: MeshFetch;
  logger: Logger;
  pubsub?: MeshPubSub;
  queryParams?: Record<string, string | number | boolean>;
  queryStringOptions?: IStringifyOptions;
}

const defaultQsOptions: IStringifyOptions = {
  indices: false,
};

const isListTypeOrNonNullListType = memoize1(function isListTypeOrNonNullListType(type: GraphQLOutputType) {
  if (isNonNullType(type)) {
    return isListType(type.ofType);
  }
  return isListType(type);
});

function createError(message: string, extensions?: any) {
  return new GraphQLError(message, undefined, undefined, undefined, undefined, undefined, extensions);
}

function linkResolver(
  linkObjArgs: any,
  actualResolver: GraphQLFieldResolver<any, any>,
  root: any,
  args: any,
  context: any,
  info: GraphQLResolveInfo
) {
  for (const argKey in linkObjArgs) {
    const argInterpolation = linkObjArgs[argKey];
    const actualValue = stringInterpolator.parse(argInterpolation, {
      root,
      args,
      context,
      info,
      env: process.env,
    });
    lodashSet(args, argKey, actualValue);
  }
  return actualResolver(root, args, context, info);
}

const responseMetadataType = new GraphQLObjectType({
  name: 'ResponseMetadata',
  fields: {
    url: { type: GraphQLString },
    method: { type: GraphQLString },
    status: { type: GraphQLInt },
    statusText: { type: GraphQLString },
    headers: { type: GraphQLJSON },
    body: { type: GraphQLJSON },
  },
});

export async function addExecutionLogicToComposer(
  name: string,
  {
    schemaComposer,
    fetch: globalFetch,
    logger,
    operations,
    operationHeaders,
    baseUrl,
    pubsub: globalPubsub,
    queryParams,
    queryStringOptions = {},
  }: AddExecutionLogicToComposerOptions
) {
  logger.debug(`Attaching execution logic to the schema`);
  const qsOptions = { ...defaultQsOptions, ...queryStringOptions };
  const linkResolverMapByField = new Map<string, Record<string, GraphQLFieldResolver<any, any>>>();
  for (const operationConfig of operations) {
    const { httpMethod, rootTypeName, fieldName } = getOperationMetadata(operationConfig);
    const operationLogger = logger.child(`${rootTypeName}.${fieldName}`);

    const rootTypeComposer = schemaComposer[rootTypeName];

    const field = rootTypeComposer.getField(fieldName);

    if (isPubSubOperationConfig(operationConfig)) {
      field.description = operationConfig.description || `PubSub Topic: ${operationConfig.pubsubTopic}`;
      field.subscribe = (root, args, context, info) => {
        const pubsub = context?.pubsub || globalPubsub;
        if (!pubsub) {
          return new GraphQLError(`You should have PubSub defined in either the config or the context!`);
        }
        const interpolationData = { root, args, context, info, env: process.env };
        const pubsubTopic = stringInterpolator.parse(operationConfig.pubsubTopic, interpolationData);
        operationLogger.debug(`=> Subscribing to pubSubTopic: ${pubsubTopic}`);
        return pubsub.asyncIterator(pubsubTopic);
      };
      field.resolve = root => {
        operationLogger.debug('Received ', root, ' from ', operationConfig.pubsubTopic);
        return root;
      };
    } else if (operationConfig.path) {
      if (process.env.DEBUG === '1' || process.env.DEBUG === 'fieldDetails') {
        field.description = `
>**Method**: \`${operationConfig.method}\`
>**Base URL**: \`${baseUrl}\`
>**Path**: \`${operationConfig.path}\`
${operationConfig.description || ''}
`;
      } else {
        field.description = operationConfig.description;
      }
      field.resolve = async (root, args, context) => {
        operationLogger.debug(`=> Resolving`);
        const interpolationData = { root, args, context, env: process.env };
        const interpolatedBaseUrl = stringInterpolator.parse(baseUrl, interpolationData);
        const interpolatedPath = stringInterpolator.parse(operationConfig.path, interpolationData);
        let fullPath = urlJoin(interpolatedBaseUrl, interpolatedPath);
        const operationHeadersObj =
          typeof operationHeaders === 'function' ? await operationHeaders(interpolationData) : operationHeaders;
        const nonInterpolatedHeaders = {
          ...operationHeadersObj,
          ...operationConfig?.headers,
        };
        const headers: Record<string, any> = {};
        for (const headerName in nonInterpolatedHeaders) {
          const nonInterpolatedValue = nonInterpolatedHeaders[headerName];
          const interpolatedValue = stringInterpolator.parse(nonInterpolatedValue, interpolationData);
          if (interpolatedValue) {
            headers[headerName.toLowerCase()] = interpolatedValue;
          }
        }
        const requestInit: RequestInit = {
          method: httpMethod,
          headers,
        };
        // Handle binary data
        if ('binary' in operationConfig) {
          const binaryUpload = await args.input;
          if (isFileUpload(binaryUpload)) {
            const readable = binaryUpload.createReadStream();
            const chunks: number[] = [];
            for await (const chunk of readable) {
              for (const byte of chunk) {
                chunks.push(byte);
              }
            }
            requestInit.body = new Uint8Array(chunks);

            const [, contentType] = Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type') || [];
            if (!contentType) {
              headers['content-type'] = binaryUpload.mimetype;
            }
          }
          requestInit.body = binaryUpload;
        } else {
          if (operationConfig.requestBaseBody != null) {
            args.input = args.input || {};
            for (const key in operationConfig.requestBaseBody) {
              const configValue = operationConfig.requestBaseBody[key];
              if (typeof configValue === 'string') {
                const value = stringInterpolator.parse(configValue, interpolationData);
                lodashSet(args.input, key, value);
              } else {
                args.input[key] = configValue;
              }
            }
          }
          // Resolve union input
          const input = (args.input = resolveDataByUnionInputType(
            cleanObject(args.input),
            field.args?.input?.type?.getType(),
            schemaComposer
          ));
          if (input != null) {
            const [, contentType] = Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type') || [];
            if (contentType?.startsWith('application/x-www-form-urlencoded')) {
              requestInit.body = qsStringify(input, qsOptions);
            } else {
              requestInit.body = typeof input === 'object' ? JSON.stringify(input) : input;
            }
          }
        }
        if (queryParams) {
          const interpolatedQueryParams: Record<string, any> = {};
          for (const queryParamName in queryParams) {
            if (
              args != null &&
              operationConfig.queryParamArgMap != null &&
              queryParamName in operationConfig.queryParamArgMap &&
              operationConfig.queryParamArgMap[queryParamName] in args
            ) {
              continue;
            }
            interpolatedQueryParams[queryParamName] = stringInterpolator.parse(
              queryParams[queryParamName].toString(),
              interpolationData
            );
          }
          const queryParamsString = qsStringify(interpolatedQueryParams, qsOptions);
          fullPath += fullPath.includes('?') ? '&' : '?';
          fullPath += queryParamsString;
        }

        if (operationConfig.queryParamArgMap) {
          const queryParamsFromArgs = {};
          for (const queryParamName in operationConfig.queryParamArgMap) {
            const argName = operationConfig.queryParamArgMap[queryParamName];
            const argValue = args[argName];
            if (argValue != null) {
              queryParamsFromArgs[queryParamName] = argValue;
            }
          }
          const queryParamsString = qsStringify(queryParamsFromArgs, qsOptions);
          fullPath += fullPath.includes('?') ? '&' : '?';
          fullPath += queryParamsString;
        }

        // Delete unused queryparams
        const [actualPath, queryString] = fullPath.split('?');
        if (queryString) {
          const queryParams = qsParse(queryString);
          const cleanedQueryParams = cleanObject(queryParams);
          fullPath = actualPath + '?' + qsStringify(cleanedQueryParams, qsOptions);
        }

        operationLogger.debug(`=> Fetching `, fullPath, `=>`, requestInit);
        const fetch: typeof globalFetch = context?.fetch || globalFetch;
        if (!fetch) {
          return createError(`You should have fetch defined in either the config or the context!`, {
            url: fullPath,
            method: httpMethod,
          });
        }
        const response = await fetch(fullPath, requestInit, context);
        // If return type is a file
        if (field.type.getTypeName() === 'File') {
          return response.blob();
        }
        const responseText = await response.text();
        operationLogger.debug(`=> Received`, {
          headers: response.headers,
          text: responseText,
        });
        let responseJson: any;
        try {
          responseJson = JSON.parse(responseText);
        } catch (error) {
          const returnNamedGraphQLType = getNamedType(field.type.getType());
          // The result might be defined as scalar
          if (isScalarType(returnNamedGraphQLType)) {
            operationLogger.debug(` => Return type is not a JSON so returning ${responseText}`);
            return responseText;
          } else if (response.status === 204) {
            responseJson = {};
          } else {
            logger.debug(`Unexpected response in ${fieldName};\n\t${responseText}`);
            return createError(`Unexpected response`, {
              url: fullPath,
              method: httpMethod,
              responseText,
              error,
            });
          }
        }

        if (!response.status.toString().startsWith('2')) {
          const returnNamedGraphQLType = getNamedType(field.type.getType());
          if (!isUnionType(returnNamedGraphQLType)) {
            return createError(
              `HTTP Error: ${response.status}, Could not invoke operation ${operationConfig.method} ${operationConfig.path}`,
              {
                method: httpMethod,
                url: fullPath,
                statusCode: response.status,
                statusText: response.statusText,
                responseBody: responseJson,
              }
            );
          }
        }

        operationLogger.debug(`Returning `, responseJson);
        // Sometimes API returns an array but the return type is not an array
        const isListReturnType = isListTypeOrNonNullListType(field.type.getType());
        const isArrayResponse = Array.isArray(responseJson);
        if (isListReturnType && !isArrayResponse) {
          operationLogger.debug(`Response is not array but return type is list. Normalizing the response`);
          responseJson = [responseJson];
        }
        if (!isListReturnType && isArrayResponse) {
          operationLogger.debug(`Response is array but return type is not list. Normalizing the response`);
          responseJson = responseJson[0];
        }

        const addResponseMetadata = (obj: any) => {
          Object.defineProperties(obj, {
            $field: {
              get() {
                return operationConfig.field;
              },
            },
            $url: {
              get() {
                return fullPath.split('?')[0];
              },
            },
            $method: {
              get() {
                return httpMethod;
              },
            },
            $statusCode: {
              get() {
                return response.status;
              },
            },
            $statusText: {
              get() {
                return response.statusText;
              },
            },
            $headers: {
              get() {
                return requestInit.headers;
              },
            },
            $request: {
              get() {
                return new Proxy(
                  {},
                  {
                    get(_, requestProp) {
                      switch (requestProp) {
                        case 'query':
                          return qsParse(fullPath.split('?')[1]);
                        case 'path':
                          return new Proxy(args, {
                            get(_, prop) {
                              return args[prop] || args.input?.[prop] || obj?.[prop];
                            },
                            has(_, prop) {
                              return prop in args || (args.input && prop in args.input) || obj?.[prop];
                            },
                          });
                        case 'header':
                          if ('get' in requestInit.headers) {
                            return getHeadersObj(requestInit.headers as Headers);
                          }
                          return requestInit.headers;
                        case 'body':
                          return requestInit.body;
                      }
                    },
                  }
                );
              },
            },
            $response: {
              get() {
                return new Proxy(
                  {},
                  {
                    get(_, responseProp) {
                      switch (responseProp) {
                        case 'header':
                          return getHeadersObj(response.headers);
                        case 'body':
                          return obj;
                        case 'query':
                          return qsParse(fullPath.split('?')[1]);
                        case 'path':
                          return new Proxy(args, {
                            get(_, prop) {
                              return args[prop] || args.input?.[prop] || obj?.[prop];
                            },
                            has(_, prop) {
                              return prop in args || (args.input && prop in args.input) || obj?.[prop];
                            },
                          });
                      }
                    },
                  }
                );
              },
            },
          });
          return obj;
        };
        operationLogger.debug(`Adding response metadata to the response object`);
        return Array.isArray(responseJson)
          ? responseJson.map(obj => addResponseMetadata(obj))
          : addResponseMetadata(responseJson);
      };

      const handleLinkMap = (linkMap: Record<string, JSONSchemaLinkConfig>, typeTC: ObjectTypeComposer) => {
        for (const linkName in linkMap) {
          typeTC.addFields({
            [linkName]: () => {
              const linkObj = linkMap[linkName];
              let linkResolverFieldMap = linkResolverMapByField.get(operationConfig.field);
              if (!linkResolverFieldMap) {
                linkResolverFieldMap = {};
                linkResolverMapByField.set(operationConfig.field, linkResolverFieldMap);
              }
              let targetField: ObjectTypeComposerFieldConfig<any, any> | undefined;
              try {
                targetField = schemaComposer.Query.getField(linkObj.fieldName);
              } catch {
                try {
                  targetField = schemaComposer.Mutation.getField(linkObj.fieldName);
                } catch {}
              }
              if (!targetField) {
                logger.debug(`Field ${linkObj.fieldName} not found in ${name} for link ${linkName}`);
              }
              linkResolverFieldMap[linkName] = (root, args, context, info) =>
                linkResolver(linkObj.args, targetField.resolve, root, args, context, info);
              return {
                ...targetField,
                args: linkObj.args ? {} : targetField.args,
                description: linkObj.description || targetField.description,
                // Pick the correct link resolver if there are many link for the same return type used by different operations
                resolve: (root, args, context, info) => {
                  const linkResolverFieldMapForCurrentField =
                    linkResolverMapByField.get(root.$field) ?? linkResolverFieldMap;
                  return linkResolverFieldMapForCurrentField[linkName](root, args, context, info);
                },
              };
            },
          });
        }
      };

      if ('links' in operationConfig) {
        const typeTC = schemaComposer.getOTC(field.type.getTypeName());
        handleLinkMap(operationConfig.links, typeTC);
      }

      if ('exposeResponseMetadata' in operationConfig && operationConfig.exposeResponseMetadata) {
        const typeTC = schemaComposer.getOTC(field.type.getTypeName());
        typeTC.addFields({
          _response: {
            type: responseMetadataType,
            resolve: root => ({
              url: root.$url,
              headers: root.$response.header,
              method: root.$method,
              status: root.$statusCode,
              statusText: root.$statusText,
              body: root.$response.body,
            }),
          },
        });
      }

      if ('responseByStatusCode' in operationConfig) {
        const unionOrSingleTC = schemaComposer.getAnyTC(getNamedType(field.type.getType()));
        const types = 'getTypes' in unionOrSingleTC ? unionOrSingleTC.getTypes() : [unionOrSingleTC];
        const statusCodeOneOfIndexMap =
          (unionOrSingleTC.getExtension('statusCodeOneOfIndexMap') as Record<string, number>) || {};
        for (const statusCode in operationConfig.responseByStatusCode) {
          const responseConfig = operationConfig.responseByStatusCode[statusCode];
          if (responseConfig.links || responseConfig.exposeResponseMetadata) {
            const typeTCThunked = types[statusCodeOneOfIndexMap[statusCode] || 0];
            const typeTC = schemaComposer.getAnyTC(typeTCThunked.getTypeName());
            if ('addFieldArgs' in typeTC) {
              if (responseConfig.exposeResponseMetadata) {
                typeTC.addFields({
                  _response: {
                    type: responseMetadataType,
                    resolve: root => root.$response,
                  },
                });
              }
              if (responseConfig.links) {
                handleLinkMap(responseConfig.links, typeTC as ObjectTypeComposer);
              }
            }
          }
        }
      }
    }
  }

  logger.debug(`Building the executable schema.`);
  return schemaComposer;
}
