import { dset } from 'dset';
import {
  getNamedType,
  GraphQLField,
  GraphQLOutputType,
  GraphQLResolveInfo,
  GraphQLSchema,
  isListType,
  isNonNullType,
  isScalarType,
  isUnionType,
} from 'graphql';
import { IStringifyOptions, parse as qsParse, stringify as qsStringify } from 'qs';
import urlJoin from 'url-join';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { Logger, MeshFetch } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { createGraphQLError, memoize1 } from '@graphql-tools/utils';
import { AbortSignal, Blob, File, FormData } from '@whatwg-node/fetch';
import { resolveDataByUnionInputType } from './resolveDataByUnionInputType.js';
import { HTTPMethod } from './types.js';
import { isFileUpload } from './utils.js';

const isListTypeOrNonNullListType = memoize1(function isListTypeOrNonNullListType(
  type: GraphQLOutputType,
) {
  if (isNonNullType(type)) {
    return isListType(type.ofType);
  }
  return isListType(type);
});

const defaultQsOptions: IStringifyOptions = {
  indices: false,
};

export interface HTTPRootFieldResolverOpts {
  sourceName: string;
  endpoint: string;
  path: string;
  httpMethod: HTTPMethod;
  operationSpecificHeaders: Record<string, string>;
  isBinary: boolean;
  requestBaseBody: any;
  queryParamArgMap: Record<string, string>;
  queryStringOptionsByParam: Record<string, IStringifyOptions & { destructObject?: boolean }>;
}

export interface GlobalOptions {
  sourceName: string;
  endpoint: string;
  timeout: number;
  operationHeaders: Record<string, string>;
  queryStringOptions: IStringifyOptions;
  queryParams: Record<string, string | number | boolean>;
}

export function addHTTPRootFieldResolver(
  schema: GraphQLSchema,
  field: GraphQLField<any, any>,
  logger: Logger,
  globalFetch: MeshFetch,
  {
    path,
    operationSpecificHeaders,
    httpMethod,
    isBinary,
    requestBaseBody,
    queryParamArgMap,
    queryStringOptionsByParam,
  }: HTTPRootFieldResolverOpts,
  {
    sourceName,
    endpoint,
    timeout,
    operationHeaders: globalOperationHeaders,
    queryStringOptions: globalQueryStringOptions = {},
    queryParams: globalQueryParams,
  }: GlobalOptions,
) {
  globalQueryStringOptions = {
    ...defaultQsOptions,
    ...globalQueryStringOptions,
  };
  const returnNamedGraphQLType = getNamedType(field.type);
  field.resolve = async (root, args, context, info) => {
    const operationLogger = logger.child(`${info.parentType.name}.${info.fieldName}`);
    operationLogger.debug(`=> Resolving`);
    const interpolationData = { root, args, context, env: process.env };
    const interpolatedBaseUrl = stringInterpolator.parse(endpoint, interpolationData);
    const interpolatedPath = stringInterpolator.parse(path, interpolationData);
    let fullPath = urlJoin(interpolatedBaseUrl, interpolatedPath);
    const headers: Record<string, any> = {};
    for (const headerName in globalOperationHeaders) {
      const nonInterpolatedValue = globalOperationHeaders[headerName];
      const interpolatedValue = stringInterpolator.parse(nonInterpolatedValue, interpolationData);
      if (interpolatedValue) {
        headers[headerName.toLowerCase()] = interpolatedValue;
      }
    }
    if (operationSpecificHeaders) {
      for (const headerName in operationSpecificHeaders) {
        const nonInterpolatedValue = operationSpecificHeaders[headerName];
        const interpolatedValue = stringInterpolator.parse(nonInterpolatedValue, interpolationData);
        if (interpolatedValue) {
          headers[headerName.toLowerCase()] = interpolatedValue;
        }
      }
    }
    const requestInit: RequestInit = {
      method: httpMethod,
      headers,
    };
    if (timeout) {
      requestInit.signal = AbortSignal.timeout(timeout);
    }
    // Handle binary data
    if (isBinary) {
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

        const [, contentType] =
          Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type') || [];
        if (!contentType) {
          headers['content-type'] = binaryUpload.mimetype;
        }
      }
      requestInit.body = binaryUpload;
    } else {
      if (requestBaseBody != null) {
        args.input = args.input || {};
        for (const key in requestBaseBody) {
          const configValue = requestBaseBody[key];
          if (typeof configValue === 'string') {
            const value = stringInterpolator.parse(configValue, interpolationData);
            dset(args.input, key, value);
          } else {
            args.input[key] = configValue;
          }
        }
      }
      // Resolve union input
      const input = (args.input = resolveDataByUnionInputType(
        args.input,
        field.args?.find(arg => arg.name === 'input')?.type,
        schema,
      ));
      if (input != null) {
        const [, contentType] =
          Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type') || [];
        if (contentType?.startsWith('application/x-www-form-urlencoded')) {
          requestInit.body = qsStringify(input, globalQueryStringOptions);
        } else if (contentType?.startsWith('multipart/form-data')) {
          delete headers['content-type'];
          delete headers['Content-Type'];
          const formData = new FormData();
          for (const key in input) {
            const inputValue = input[key];
            if (inputValue != null) {
              let formDataValue: Blob | string;
              if (typeof inputValue === 'object') {
                if (inputValue instanceof File) {
                  formDataValue = inputValue;
                } else if (inputValue.name && inputValue instanceof Blob) {
                  formDataValue = new File([inputValue], (inputValue as File).name, {
                    type: inputValue.type,
                  });
                } else if (inputValue.arrayBuffer) {
                  const arrayBuffer = await inputValue.arrayBuffer();
                  if (inputValue.name) {
                    formDataValue = new File([arrayBuffer], inputValue.name, {
                      type: inputValue.type,
                    });
                  } else {
                    formDataValue = new Blob([arrayBuffer], { type: inputValue.type });
                  }
                } else {
                  formDataValue = JSON.stringify(inputValue);
                }
              } else {
                formDataValue = inputValue.toString();
              }
              formData.append(key, formDataValue);
            }
          }
          requestInit.body = formData;
        } else {
          requestInit.body = typeof input === 'object' ? JSON.stringify(input) : input;
        }
      }
    }
    if (globalQueryParams) {
      for (const queryParamName in globalQueryParams) {
        if (
          args != null &&
          queryParamArgMap != null &&
          queryParamName in queryParamArgMap &&
          queryParamArgMap[queryParamName] in args
        ) {
          continue;
        }
        const interpolatedQueryParam = stringInterpolator.parse(
          globalQueryParams[queryParamName].toString(),
          interpolationData,
        );
        const queryParamsString = qsStringify(
          {
            [queryParamName]: interpolatedQueryParam,
          },
          {
            ...globalQueryStringOptions,
            ...queryStringOptionsByParam?.[queryParamName],
          },
        );
        fullPath += fullPath.includes('?') ? '&' : '?';
        fullPath += queryParamsString;
      }
    }

    if (queryParamArgMap) {
      for (const queryParamName in queryParamArgMap) {
        const argName = queryParamArgMap[queryParamName];
        let argValue = args[argName];
        if (argValue != null) {
          // Somehow it doesn't serialize URLs so we need to do it manually.
          if (argValue instanceof URL) {
            argValue = argValue.toString();
          }
          const opts = {
            ...globalQueryStringOptions,
            ...queryStringOptionsByParam?.[queryParamName],
          };
          let queryParamObj = argValue;
          if (Array.isArray(argValue) || !(typeof argValue === 'object' && opts.destructObject)) {
            queryParamObj = {
              [queryParamName]: argValue,
            };
          }
          const queryParamsString = qsStringify(queryParamObj, opts);
          fullPath += fullPath.includes('?') ? '&' : '?';
          fullPath += queryParamsString;
        }
      }
    }

    operationLogger.debug(`=> Fetching `, fullPath, `=>`, requestInit);
    const fetch: typeof globalFetch = context?.fetch || globalFetch;
    if (!fetch) {
      return createGraphQLError(
        `You should have fetch defined in either the config or the context!`,
        {
          extensions: {
            request: {
              url: fullPath,
              method: httpMethod,
            },
          },
        },
      );
    }
    // Trick to pass `sourceName` to the `fetch` function for tracing
    const response = await fetch(fullPath, requestInit, context, {
      ...info,
      sourceName,
    } as GraphQLResolveInfo);
    // If return type is a file
    if (returnNamedGraphQLType.name === 'File') {
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
      // The result might be defined as scalar
      if (isScalarType(returnNamedGraphQLType)) {
        operationLogger.debug(` => Return type is not a JSON so returning ${responseText}`);
        return responseText;
      } else if (response.status === 204) {
        responseJson = {};
      } else if (response.status.toString().startsWith('2')) {
        logger.debug(`Unexpected response in ${field.name};\n\t${responseText}`);
        return createGraphQLError(`Unexpected response in ${field.name}`, {
          extensions: {
            http: {
              status: response.status,
              statusText: response.statusText,
              headers: getHeadersObj(response.headers),
            },
            request: {
              url: fullPath,
              method: httpMethod,
            },
            responseText,
            originalError: {
              message: error.message,
              stack: error.stack,
            },
          },
        });
      } else {
        return createGraphQLError(
          `HTTP Error: ${response.status}, Could not invoke operation ${httpMethod} ${path}`,
          {
            extensions: {
              http: {
                status: response.status,
                statusText: response.statusText,
                headers: getHeadersObj(response.headers),
              },
              request: {
                url: fullPath,
                method: httpMethod,
              },
              responseText,
            },
          },
        );
      }
    }

    if (!response.status.toString().startsWith('2')) {
      if (!isUnionType(returnNamedGraphQLType)) {
        return createGraphQLError(
          `HTTP Error: ${response.status}, Could not invoke operation ${httpMethod} ${path}`,
          {
            extensions: {
              http: {
                status: response.status,
                statusText: response.statusText,
                headers: getHeadersObj(response.headers),
              },
              request: {
                url: fullPath,
                method: httpMethod,
              },
              responseJson,
            },
          },
        );
      }
    }

    operationLogger.debug(`Returning `, responseJson);
    // Sometimes API returns an array but the return type is not an array
    const isListReturnType = isListTypeOrNonNullListType(field.type);
    const isArrayResponse = Array.isArray(responseJson);
    if (isListReturnType && !isArrayResponse) {
      operationLogger.debug(
        `Response is not array but return type is list. Normalizing the response`,
      );
      responseJson = [responseJson];
    }
    if (!isListReturnType && isArrayResponse) {
      operationLogger.debug(
        `Response is array but return type is not list. Normalizing the response`,
      );
      responseJson = responseJson[0];
    }

    const addResponseMetadata = (obj: any) => {
      if (typeof obj !== 'object') {
        return obj;
      }
      Object.defineProperties(obj, {
        $field: {
          get() {
            return field.name;
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
                      return getHeadersObj(requestInit.headers as Headers);
                    case 'body':
                      return requestInit.body;
                  }
                },
              },
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
              },
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
}
