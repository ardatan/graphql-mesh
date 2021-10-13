/* eslint-disable no-case-declarations */
/* eslint-disable camelcase */
// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/**
 * Functions to create resolve functions.
 */

// Type imports:
import { ParameterObject, SchemaObject } from './types/oas3';
import { Operation } from './types/operation';
import { ResolveFunction, SubscriptionContext } from './types/graphql';
import { PreprocessingData } from './types/preprocessing_data';

// Imports:
import * as Oas3Tools from './oas_3_tools';
import * as JSONPath from 'jsonpath-plus';
import { GraphQLError, GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import formurlencoded from 'form-urlencoded';
import urlJoin from 'url-join';
import { Path } from 'graphql/jsutils/Path';
import { ConnectOptions, RequestOptions } from './types/options';
import { Logger, MeshPubSub } from '@graphql-mesh/types';

// Type definitions & exports:
type AuthReqAndProtcolName = {
  authRequired: boolean;
  sanitizedSecurityRequirement?: string;
};

type AuthOptions = {
  authHeaders: { [key: string]: string };
  authQs: { [key: string]: string };
  authCookie: string;
};

type GetResolverParams<TSource, TContext, TArgs> = {
  operation: Operation;
  argsFromLink?: Record<string, string>;
  payloadName?: string;
  responseName?: string;
  data: PreprocessingData<TSource, TContext, TArgs>;
  baseUrl?: string;
  requestOptions?: RequestOptions<TSource, TContext, TArgs>;
  fetch?: (input: RequestInfo, init?: RequestInit, ctx?: TContext) => Promise<Response>;
  qs?: Record<string, string>;
  logger: Logger;
};

function headersToObject(headers: Headers) {
  const headersObj: HeadersInit = {};
  headers.forEach((value, key) => {
    headersObj[key] = value;
  });
  return headersObj;
}

interface ResolveData {
  url: string;
  usedParams: any;
  usedPayload: string;
  usedRequestOptions: RequestInit;
  usedStatusCode: string;
  responseHeaders: HeadersInit;
}

type GetSubscribeParams<TSource, TContext, TArgs> = {
  operation: Operation;
  argsFromLink?: { [key: string]: string };
  payloadName?: string;
  data: PreprocessingData<TSource, TContext, TArgs>;
  baseUrl?: string;
  connectOptions?: ConnectOptions;
  pubsub: MeshPubSub;
  logger: Logger;
};

/*
 * If operationType is Subscription, creates and returns a resolver object that
 * contains subscribe to perform subscription and resolve to execute payload
 * transformation
 */
export function getSubscribe<TSource, TContext, TArgs>({
  operation,
  payloadName,
  data,
  baseUrl,
  connectOptions,
  pubsub,
  logger,
}: GetSubscribeParams<TSource, TContext, TArgs>): GraphQLFieldResolver<TSource, SubscriptionContext, TArgs> {
  const translationLogger = logger.child('translation');
  const pubSubLogger = logger.child('pubsub');

  // Determine the appropriate URL:
  if (typeof baseUrl === 'undefined') {
    baseUrl = Oas3Tools.getBaseUrl(operation, logger);
  }

  // Return custom resolver if it is defined
  const customResolvers = data.options.customSubscriptionResolvers;
  const title = operation.oas.info?.title;
  const path = operation.path;
  const method = operation.method;

  if (
    typeof customResolvers === 'object' &&
    typeof customResolvers[title] === 'object' &&
    typeof customResolvers[title][path] === 'object' &&
    typeof customResolvers[title][path][method] === 'object' &&
    typeof customResolvers[title][path][method].subscribe === 'function'
  ) {
    translationLogger.debug(() => `Use custom publish resolver for ${operation.operationString}`);

    return customResolvers[title][path][method].subscribe;
  }

  return (root, args, context, info) => {
    try {
      /**
       * Determine possible topic(s) by resolving callback path
       *
       * GraphQL produces sanitized payload names, so we have to sanitize before
       * lookup here
       */
      const paramName = Oas3Tools.sanitize(payloadName, Oas3Tools.CaseStyle.camelCase);

      const resolveData: any = {};

      if (payloadName && typeof payloadName === 'string') {
        // The option genericPayloadArgName will change the payload name to "requestBody"
        const sanePayloadName = data.options.genericPayloadArgName
          ? 'requestBody'
          : Oas3Tools.sanitize(payloadName, Oas3Tools.CaseStyle.camelCase);

        if (sanePayloadName in args) {
          if (typeof args[sanePayloadName] === 'object') {
            const rawPayload = Oas3Tools.desanitizeObjectKeys(args[sanePayloadName], data.saneMap);
            resolveData.usedPayload = rawPayload;
          } else {
            const rawPayload = JSON.parse(args[sanePayloadName]);
            resolveData.usedPayload = rawPayload;
          }
        }
      }

      if (connectOptions) {
        resolveData.usedRequestOptions = connectOptions;
      } else {
        resolveData.usedRequestOptions = {
          method: resolveData.usedPayload.method ? resolveData.usedPayload.method : method.toUpperCase(),
        };
      }

      pubSubLogger.debug(() => `Subscription schema: ${JSON.stringify(resolveData.usedPayload)}`);

      let value = path;
      let paramNameWithoutLocation = paramName;
      if (paramName.indexOf('.') !== -1) {
        paramNameWithoutLocation = paramName.split('.')[1];
      }

      // See if the callback path contains constants expression
      if (value.search(/{|}/) === -1) {
        args[paramNameWithoutLocation] = isRuntimeExpression(value)
          ? resolveRuntimeExpression(paramName, value, resolveData, root, args, logger)
          : value;
      } else {
        // Replace callback expression with appropriate values
        const cbParams = value.match(/{([^}]*)}/g);
        pubSubLogger.debug(() => `Analyzing subscription path: ${cbParams.toString()}`);

        cbParams.forEach(cbParam => {
          value = value.replace(
            cbParam,
            resolveRuntimeExpression(
              paramName,
              cbParam.substring(1, cbParam.length - 1),
              resolveData,
              root,
              args,
              logger
            )
          );
        });
        args[paramNameWithoutLocation] = value;
      }

      const topic = args[paramNameWithoutLocation] || 'test';
      pubSubLogger.debug(() => `Subscribing to: ${topic}`);
      return pubsub.asyncIterator(topic);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };
}

/*
 * If operationType is Subscription, creates and returns a resolver function
 * triggered after a message has been published to the corresponding subscribe
 * topic(s) to execute payload transformation
 */
export function getPublishResolver<TSource, TContext, TArgs>({
  operation,
  responseName,
  data,
  logger,
}: GetResolverParams<TSource, TContext, TArgs>): GraphQLFieldResolver<TSource, TContext, TArgs> {
  const translationLogger = logger.child('translation');
  const pubSubLogger = logger.child('pubsub');

  // Return custom resolver if it is defined
  const customResolvers = data.options.customSubscriptionResolvers;
  const title = operation.oas.info?.title;
  const path = operation.path;
  const method = operation.method;

  if (
    typeof customResolvers === 'object' &&
    typeof customResolvers[title] === 'object' &&
    typeof customResolvers[title][path] === 'object' &&
    typeof customResolvers[title][path][method] === 'object' &&
    typeof customResolvers[title][path][method].resolve === 'function'
  ) {
    translationLogger.debug(() => `Use custom publish resolver for ${operation.operationString}`);

    return customResolvers[title][path][method].resolve;
  }

  return (payload, args, context, info) => {
    // Validate and format based on operation.responseDefinition
    const typeOfResponse = operation.responseDefinition.targetGraphQLType;
    pubSubLogger.debug(() => `Message received: ${responseName}, ${typeOfResponse}, ${JSON.stringify(payload)}`);

    let responseBody;
    let saneData: any;

    if (typeof payload === 'object') {
      if (typeOfResponse === 'object') {
        if (Buffer.isBuffer(payload)) {
          try {
            responseBody = JSON.parse(payload.toString());
          } catch (e) {
            const errorString =
              `Cannot JSON parse payload` +
              `operation ${operation.operationString} ` +
              `even though it has content-type 'application/json'`;

            pubSubLogger.debug(() => errorString);
            return null;
          }
        } else {
          responseBody = payload;
        }
        saneData = Oas3Tools.sanitizeObjectKeys(payload);
      } else if ((Buffer.isBuffer(payload) || Array.isArray(payload)) && typeOfResponse === 'string') {
        saneData = payload.toString();
      }
    } else if (typeof payload === 'string') {
      if (typeOfResponse === 'object') {
        try {
          responseBody = JSON.parse(payload);
          saneData = Oas3Tools.sanitizeObjectKeys(responseBody);
        } catch (e) {
          const errorString =
            `Cannot JSON parse payload` +
            `operation ${operation.operationString} ` +
            `even though it has content-type 'application/json'`;

          pubSubLogger.debug(() => errorString);
          return null;
        }
      } else if (typeOfResponse === 'string') {
        saneData = payload;
      }
    }

    pubSubLogger.debug(() => `Message forwarded: ${JSON.stringify(saneData || payload)}`);
    return saneData || payload;
  };
}

export type ResolverMiddleware<TSource, TContext, TArgs> = (
  getResolverParams: () => GetResolverParams<TSource, TContext, TArgs>,
  factory: ResolverFactory
) => ResolveFunction;

type ResolverFactory = typeof getResolver;

/**
 * Creates and returns a resolver function that performs API requests for the
 * given GraphQL query
 */
export function getResolver<TSource, TContext, TArgs>(
  getResolverParams: () => GetResolverParams<TSource, TContext, TArgs>,
  logger: Logger
): ResolveFunction {
  const translationLogger = logger.child('translation');
  const httpLogger = logger.child('http');

  let {
    operation,
    argsFromLink = {},
    payloadName,
    data,
    baseUrl,
    requestOptions,
    fetch: fetchFn = data.options.fetch,
    qs: customQs,
  } = getResolverParams();
  // Determine the appropriate URL:
  if (typeof baseUrl === 'undefined') {
    baseUrl = Oas3Tools.getBaseUrl(operation, logger);
  }

  // Return custom resolver if it is defined
  const customResolvers = data.options.customResolvers;
  const title = operation.oas.info?.title;
  const path = operation.path;
  const method = operation.method;

  if (
    typeof customResolvers === 'object' &&
    typeof customResolvers[title] === 'object' &&
    typeof customResolvers[title][path] === 'object' &&
    typeof customResolvers[title][path][method] === 'function'
  ) {
    translationLogger.debug(() => `Use custom resolver for ${operation.operationString}`);

    return customResolvers[title][path][method];
  }

  // Return resolve function:
  return async (root: any, args: any, ctx: any, info = {} as GraphQLResolveInfo) => {
    /**
     * Retch resolveData from possibly existing _openAPIToGraphQL
     *
     * NOTE: _openAPIToGraphQL is an object used to pass security info and data
     * from previous resolvers
     */
    let resolveData = {} as ResolveData;
    if (
      root &&
      typeof root === 'object' &&
      typeof root._openAPIToGraphQL === 'object' &&
      typeof root._openAPIToGraphQL.data === 'object'
    ) {
      const parentIdentifier = getParentIdentifier(info);
      if (!(parentIdentifier.length === 0) && parentIdentifier in root._openAPIToGraphQL.data) {
        /**
         * Resolving link params may change the usedParams, but these changes
         * should not be present in the parent _openAPIToGraphQL, therefore copy
         * the object
         */
        resolveData = JSON.parse(JSON.stringify(root._openAPIToGraphQL.data[parentIdentifier]));
      }
    }

    if (typeof resolveData.usedParams === 'undefined') {
      resolveData.usedParams = {};
    }

    /**
     * Handle default values of parameters, if they have not yet been defined by
     * the user.
     */
    operation.parameters.forEach(param => {
      const paramName = Oas3Tools.sanitize(
        param.name,
        !data.options.simpleNames ? Oas3Tools.CaseStyle.camelCase : Oas3Tools.CaseStyle.simple
      );
      if (typeof args[paramName] === 'undefined' && param.schema && typeof param.schema === 'object') {
        let schema = param.schema;
        if (schema && schema.$ref && typeof schema.$ref === 'string') {
          schema = Oas3Tools.resolveRef(schema.$ref, operation.oas);
        }
        if (schema && (schema as SchemaObject).default && typeof (schema as SchemaObject).default !== 'undefined') {
          args[paramName] = (schema as SchemaObject).default;
        }
      }
    });

    // Handle arguments provided by links
    for (const paramName in argsFromLink) {
      const saneParamName = Oas3Tools.sanitize(
        paramName,
        !data.options.simpleNames ? Oas3Tools.CaseStyle.camelCase : Oas3Tools.CaseStyle.simple
      );

      let value = argsFromLink[paramName];

      /**
       * see if the link parameter contains constants that are appended to the link parameter
       *
       * e.g. instead of:
       * $response.body#/employerId
       *
       * it could be:
       * abc_{$response.body#/employerId}
       */
      if (value.search(/{|}/) === -1) {
        args[saneParamName] = isRuntimeExpression(value)
          ? resolveLinkParameter(paramName, value, resolveData, root, args, logger)
          : value;
      } else {
        // Replace link parameters with appropriate values
        const linkParams = value.match(/{([^}]*)}/g);
        linkParams.forEach(linkParam => {
          value = value.replace(
            linkParam,
            resolveLinkParameter(
              paramName,
              linkParam.substring(1, linkParam.length - 1),
              resolveData,
              root,
              args,
              logger
            )
          );
        });

        args[saneParamName] = value;
      }
    }

    // Stored used parameters to future requests:
    resolveData.usedParams = Object.assign(resolveData.usedParams, args);

    // Build URL (i.e., fill in path parameters):
    const {
      path,
      qs: query,
      headers,
    } = extractRequestDataFromArgs(operation.path, operation.parameters, args, data, logger);
    const urlObject = new URL(urlJoin(baseUrl, path));

    /**
     * The Content-type and accept property should not be changed because the
     * object type has already been created and unlike these properties, it
     * cannot be easily changed
     *
     * NOTE: This may cause the user to encounter unexpected changes
     */
    if (operation.method !== 'get') {
      /**
       * the check is done on the 'get' operation to determine if there is a payload because
       * operation.payloadRequired is not always correctly initialized (at least during the unit test)
       */
      headers['content-type'] =
        typeof operation.payloadContentType !== 'undefined' ? operation.payloadContentType : 'application/json';
    }
    headers.accept =
      typeof operation.responseContentType !== 'undefined' ? operation.responseContentType : 'application/json';

    let options: RequestInit;
    if (requestOptions) {
      options = { ...requestOptions };
      options.method = operation.method;
      options.headers = options.headers || {};
      for (const headerName in headers) {
        const headerValue = headers[headerName];
        if (headerValue) {
          options.headers[headerName] = headerValue;
        }
      }
    } else {
      options = {
        method: operation.method,
        headers: headers,
      };
    }

    for (const paramName in query) {
      const val = query[paramName];
      if (val !== undefined) {
        urlObject.searchParams.set(paramName, val);
      }
    }

    /**
     * Determine possible payload
     *
     * GraphQL produces sanitized payload names, so we have to sanitize before
     * lookup here
     */
    resolveData.usedPayload = undefined;
    if (typeof payloadName === 'string') {
      // The option genericPayloadArgName will change the payload name to "requestBody"
      const sanePayloadName = data.options.genericPayloadArgName
        ? 'requestBody'
        : Oas3Tools.sanitize(payloadName, Oas3Tools.CaseStyle.camelCase);

      let rawPayload;
      if (operation.payloadContentType.includes('application/json') || operation.payloadContentType.includes('*/*')) {
        rawPayload = JSON.stringify(Oas3Tools.desanitizeObjectKeys(args[sanePayloadName], data.saneMap));
      } else if (operation.payloadContentType.includes('application/x-www-form-urlencoded')) {
        rawPayload = formurlencoded(Oas3Tools.desanitizeObjectKeys(args[sanePayloadName], data.saneMap));
      } else {
        // Payload is not an object
        rawPayload = args[sanePayloadName];
      }
      options.body = rawPayload;
      resolveData.usedPayload = rawPayload;
    }

    /**
     * Pass on OpenAPI-to-GraphQL options
     */
    if (typeof data.options === 'object') {
      // Headers:
      if (typeof data.options.headers === 'object') {
        for (const header in data.options.headers) {
          const val = data.options.headers[header];
          if (val) {
            options.headers[header] = val;
          }
        }
      }
      // Query string:
      if (typeof data.options.qs === 'object') {
        for (const query in data.options.qs) {
          const val = data.options.qs[query];
          if (val) {
            urlObject.searchParams.set(query, val);
          }
        }
      }
    }

    if (typeof customQs === 'object') {
      for (const query in customQs) {
        const val = customQs[query];
        if (val) {
          urlObject.searchParams.set(query, val);
        }
      }
    }

    // Get authentication headers and query parameters
    if (root && typeof root === 'object' && typeof root._openAPIToGraphQL === 'object') {
      const { authHeaders, authQs, authCookie } = getAuthOptions(operation, root._openAPIToGraphQL, data);

      // ...and pass them to the options
      for (const headerName in authHeaders) {
        const headerValue = authHeaders[headerName];
        if (headerValue) {
          options.headers[headerName] = headerValue;
        }
      }
      for (const query in authQs) {
        const val = authQs[query];
        if (val) {
          urlObject.searchParams.set(query, val);
        }
      }

      // Add authentication cookie if created
      if (authCookie !== null) {
        const cookieHeaderName = 'cookie';
        options.headers[cookieHeaderName] = authCookie;
      }
    }

    // Extract OAuth token from context (if available)
    if (data.options.sendOAuthTokenInQuery) {
      const oauthQueryObj = createOAuthQS(data, ctx, logger);
      for (const query in oauthQueryObj) {
        const val = oauthQueryObj[query];
        if (val) {
          urlObject.searchParams.set(query, val);
        }
      }
    } else {
      const oauthHeader = createOAuthHeader(data, ctx, logger);
      for (const headerName in oauthHeader) {
        const headerValue = oauthHeader[headerName];
        if (headerValue) {
          options.headers[headerName] = headerValue;
        }
      }
    }

    const urlWithoutQuery = urlObject.href.replace(urlObject.search, '');
    resolveData.url = urlWithoutQuery;
    resolveData.usedRequestOptions = options;
    resolveData.usedStatusCode = operation.statusCode;

    // Make the call
    httpLogger.debug(
      () =>
        `Call ${options.method.toUpperCase()} ${urlWithoutQuery}?${urlObject.search}\n` +
        `headers: ${JSON.stringify(options.headers)}\n` +
        `request body: ${options.body}`
    );

    let response: Response;
    try {
      response = await fetchFn(urlObject.href, options, ctx);
    } catch (err) {
      httpLogger.debug(() => err);
      throw err;
    }
    const body = await response.text();
    if (response.status < 200 || response.status > 299) {
      httpLogger.debug(() => `${response.status} - ${Oas3Tools.trim(body, 100)}`);

      const errorString = `Could not invoke operation ${operation.operationString}`;

      if (data.options.provideErrorExtensions) {
        let responseBody;
        try {
          responseBody = JSON.parse(body);
        } catch (e) {
          responseBody = body;
        }

        const extensions = {
          method: operation.method,
          path: operation.path,
          statusText: response.statusText,
          statusCode: response.status,
          responseHeaders: headersToObject(response.headers),
          responseBody,
        };
        throw graphQLErrorWithExtensions(errorString, extensions);
      } else {
        throw new Error(errorString);
      }

      // Successful response 200-299
    } else {
      httpLogger.debug(() => `${response.status} - ${Oas3Tools.trim(body, 100)}`);

      if (response.headers.get('content-type')) {
        /**
         * If the response body is type JSON, then parse it
         *
         * content-type may not be necessarily 'application/json' it can be
         * 'application/json; charset=utf-8' for example
         */
        if (response.headers.get('content-type').includes('json')) {
          let responseBody;
          try {
            responseBody = body ? JSON.parse(body) : {};
          } catch (e) {
            const errorString =
              `Cannot JSON parse response body of ` +
              `operation ${operation.operationString} ` +
              `even though it has content-type '${response.headers.get('content-type')}'`;

            httpLogger.debug(() => errorString);
            throw errorString;
          }

          resolveData.responseHeaders = headersToObject(response.headers);

          // Deal with the fact that the server might send unsanitized data
          let saneData = Oas3Tools.sanitizeObjectKeys(
            responseBody,
            !data.options.simpleNames ? Oas3Tools.CaseStyle.camelCase : Oas3Tools.CaseStyle.simple
          );

          // Pass on _openAPIToGraphQL to subsequent resolvers
          if (saneData && typeof saneData === 'object') {
            if (Array.isArray(saneData)) {
              saneData.forEach(element => {
                if (typeof element._openAPIToGraphQL === 'undefined') {
                  element._openAPIToGraphQL = {
                    data: {},
                  };
                }

                if (root && typeof root === 'object' && typeof root._openAPIToGraphQL === 'object') {
                  Object.assign(element._openAPIToGraphQL, root._openAPIToGraphQL);
                }

                element._openAPIToGraphQL.data[getIdentifier(info)] = resolveData;
              });
            } else {
              if (typeof saneData._openAPIToGraphQL === 'undefined') {
                saneData._openAPIToGraphQL = {
                  data: {},
                };
              }

              if (root && typeof root === 'object' && typeof root._openAPIToGraphQL === 'object') {
                Object.assign(saneData._openAPIToGraphQL, root._openAPIToGraphQL);
              }

              saneData._openAPIToGraphQL.data[getIdentifier(info)] = resolveData;
            }
          }

          // Apply limit argument
          if (
            data.options.addLimitArgument &&
            /**
             * NOTE: Does not differentiate between autogenerated args and
             * preexisting args
             *
             * Ensure that there is not preexisting 'limit' argument
             */
            !operation.parameters.find(parameter => {
              return parameter.name === 'limit';
            }) &&
            // Only array data
            Array.isArray(saneData) &&
            // Only array of objects/arrays
            saneData.some(data => {
              return typeof data === 'object';
            }) &&
            'limit' in args
          ) {
            let arraySaneData = saneData;

            const limit = args.limit;

            if (limit >= 0) {
              arraySaneData = arraySaneData.slice(0, limit);
            } else {
              throw new Error(`Auto-generated 'limit' argument must be greater than or equal to 0`);
            }

            saneData = arraySaneData;
          }

          return saneData;
        } else {
          // TODO: Handle YAML

          return body;
        }
      } else {
        /**
         * Check to see if there is not supposed to be a response body,
         * if that is the case, that would explain why there is not
         * a content-type
         */
        const { responseContentType } = Oas3Tools.getResponseObject(operation, operation.statusCode, operation.oas);
        if (responseContentType === null) {
          return null;
        } else {
          const errorString = 'Response does not have a Content-Type property';

          httpLogger.debug(() => errorString);
          throw errorString;
        }
      }
    }
  };
}

/**
 * Attempts to create an object to become an OAuth query string by extracting an
 * OAuth token from the ctx based on the JSON path provided in the options.
 */
function createOAuthQS<TSource, TContext, TArgs>(
  data: PreprocessingData<TSource, TContext, TArgs>,
  context: TContext,
  logger: Logger
): { [key: string]: string } {
  return typeof data.options.tokenJSONpath !== 'string' ? {} : extractToken(data, context, logger);
}

function extractToken<TSource, TContext, TArgs>(
  data: PreprocessingData<TSource, TContext, TArgs>,
  ctx: TContext,
  logger: Logger
) {
  const httpLogger = logger.child('http');

  const tokenJSONpath = data.options.tokenJSONpath;
  const tokens = JSONPath.JSONPath({ path: tokenJSONpath, json: ctx as any });
  if (Array.isArray(tokens) && tokens.length > 0) {
    const token = tokens[0];
    return {
      access_token: token,
    };
  } else {
    httpLogger.debug(() => `Warning: could not extract OAuth token from context at '${tokenJSONpath}'`);
    return {};
  }
}

/**
 * Attempts to create an OAuth authorization header by extracting an OAuth token
 * from the ctx based on the JSON path provided in the options.
 */
function createOAuthHeader<TSource, TContext, TArgs>(
  data: PreprocessingData<TSource, TContext, TArgs>,
  ctx: TContext,
  logger: Logger
): { [key: string]: string } {
  const httpLogger = logger.child('http');
  if (typeof data.options.tokenJSONpath !== 'string') {
    return {};
  }

  // Extract token
  const tokenJSONpath = data.options.tokenJSONpath;
  const tokens = JSONPath.JSONPath({ path: tokenJSONpath, json: ctx as any });
  if (Array.isArray(tokens) && tokens.length > 0) {
    const token = tokens[0];
    return {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'openapi-to-graphql',
    };
  } else {
    httpLogger.debug(() => `Warning: could not extract OAuth token from context at ` + `'${tokenJSONpath}'`);
    return {};
  }
}

/**
 * Returns the headers and query strings to authenticate a request (if any).
 * Object containing authHeader and authQs object,
 * which hold headers and query parameters respectively to authentication a
 * request.
 */
function getAuthOptions<TSource, TContext, TArgs>(
  operation: Operation,
  _openAPIToGraphQL: any,
  data: PreprocessingData<TSource, TContext, TArgs>
): AuthOptions {
  const authHeaders: any = {};
  const authQs = {};
  let authCookie = null;

  /**
   * Determine if authentication is required, and which protocol (if any) we can
   * use
   */
  const { authRequired, sanitizedSecurityRequirement } = getAuthReqAndProtcolName(operation, _openAPIToGraphQL);
  const securityRequirement = data.saneMap[sanitizedSecurityRequirement];

  // Possibly, we don't need to do anything:
  if (!authRequired) {
    return { authHeaders, authQs, authCookie };
  }

  // If authentication is required, but we can't fulfill the protocol, throw:
  if (authRequired && typeof securityRequirement !== 'string') {
    throw new Error(`Missing information to authenticate API request.`);
  }

  if (typeof securityRequirement === 'string') {
    const security = data.security[securityRequirement];
    switch (security.def.type) {
      case 'apiKey':
        const apiKey = _openAPIToGraphQL.security[sanitizedSecurityRequirement].apiKey;
        if ('in' in security.def) {
          if (typeof security.def.name === 'string') {
            if (security.def.in === 'header') {
              authHeaders[security.def.name] = apiKey;
            } else if (security.def.in === 'query') {
              authQs[security.def.name] = apiKey;
            } else if (security.def.in === 'cookie') {
              authCookie = `${security.def.name}=${apiKey}`;
            }
          } else {
            throw new Error(`Cannot send API key in '${JSON.stringify(security.def.in)}'`);
          }
        }
        break;

      case 'http':
        switch (security.def.scheme) {
          case 'basic':
            const username = _openAPIToGraphQL.security[sanitizedSecurityRequirement].username;
            const password = _openAPIToGraphQL.security[sanitizedSecurityRequirement].password;
            const credentials = `${username}:${password}`;
            authHeaders.Authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
            break;
          default:
            throw new Error(`Cannot recognize http security scheme ` + `'${JSON.stringify(security.def.scheme)}'`);
        }
        break;

      case 'oauth2':
        break;

      case 'openIdConnect':
        break;

      default:
        throw new Error(`Cannot recognize security type '${security.def.type}'`);
    }
  }
  return { authHeaders, authQs, authCookie };
}

/**
 * Determines whether given operation requires authentication, and which of the
 * (possibly multiple) authentication protocols can be used based on the data
 * present in the given context.
 */
function getAuthReqAndProtcolName(operation: Operation, _openAPIToGraphQL: any): AuthReqAndProtcolName {
  let authRequired = false;
  if (Array.isArray(operation.securityRequirements) && operation.securityRequirements.length > 0) {
    authRequired = true;

    for (const securityRequirement of operation.securityRequirements) {
      const sanitizedSecurityRequirement = Oas3Tools.sanitize(securityRequirement, Oas3Tools.CaseStyle.camelCase);
      if (typeof _openAPIToGraphQL.security[sanitizedSecurityRequirement] === 'object') {
        return {
          authRequired,
          sanitizedSecurityRequirement,
        };
      }
    }
  }
  return {
    authRequired,
  };
}

/**
 * Given a link parameter, determine the value
 *
 * The link parameter is a reference to data contained in the
 * url/method/statuscode or response/request body/query/path/header
 */
function resolveLinkParameter(
  paramName: string,
  value: string,
  resolveData: ResolveData,
  root: any,
  args: any,
  logger: Logger
): any {
  const httpLogger = logger.child('http');

  if (value === '$url') {
    return resolveData.url;
  } else if (value === '$method') {
    return resolveData.usedRequestOptions.method;
  } else if (value === '$statusCode') {
    return resolveData.usedStatusCode;
  } else if (value.startsWith('$request.')) {
    // CASE: parameter is previous body
    if (value === '$request.body') {
      return resolveData.usedPayload;

      // CASE: parameter in previous body
    } else if (value.startsWith('$request.body#')) {
      const tokens = JSONPath.JSONPath({
        path: value.split('body#/')[1],
        json: resolveData.usedPayload,
      });
      if (Array.isArray(tokens) && tokens.length > 0) {
        return tokens[0];
      } else {
        httpLogger.debug(() => `Warning: could not extract parameter '${paramName}' from link`);
      }

      // CASE: parameter in previous query parameter
    } else if (value.startsWith('$request.query')) {
      return resolveData.usedParams[Oas3Tools.sanitize(value.split('query.')[1], Oas3Tools.CaseStyle.camelCase)];

      // CASE: parameter in previous path parameter
    } else if (value.startsWith('$request.path')) {
      return resolveData.usedParams[Oas3Tools.sanitize(value.split('path.')[1], Oas3Tools.CaseStyle.camelCase)];

      // CASE: parameter in previous header parameter
    } else if (value.startsWith('$request.header')) {
      return resolveData.usedRequestOptions.headers[value.split('header.')[1]];
    }
  } else if (value.startsWith('$response.')) {
    /**
     * CASE: parameter is body
     *
     * NOTE: may not be used because it implies that the operation does not
     * return a JSON object and OpenAPI-to-GraphQL does not create GraphQL
     * objects for non-JSON data and links can only exists between objects.
     */
    if (value === '$response.body') {
      const result = JSON.parse(JSON.stringify(root));
      /**
       * _openAPIToGraphQL contains data used by OpenAPI-to-GraphQL to create the GraphQL interface
       * and should not be exposed
       */
      result._openAPIToGraphQL = undefined;
      return result;

      // CASE: parameter in body
    } else if (value.startsWith('$response.body#')) {
      const tokens = JSONPath.JSONPath({
        path: value.split('body#/')[1],
        json: root,
      });
      if (Array.isArray(tokens) && tokens.length > 0) {
        return tokens[0];
      } else {
        httpLogger.debug(() => `Warning: could not extract parameter '${paramName}' from link`);
      }

      // CASE: parameter in query parameter
    } else if (value.startsWith('$response.query')) {
      // NOTE: handled the same way $request.query is handled
      return resolveData.usedParams[Oas3Tools.sanitize(value.split('query.')[1], Oas3Tools.CaseStyle.camelCase)];

      // CASE: parameter in path parameter
    } else if (value.startsWith('$response.path')) {
      // NOTE: handled the same way $request.path is handled
      return resolveData.usedParams[Oas3Tools.sanitize(value.split('path.')[1], Oas3Tools.CaseStyle.camelCase)];

      // CASE: parameter in header parameter
    } else if (value.startsWith('$response.header')) {
      return resolveData.responseHeaders[value.split('header.')[1]];
    }
  }

  throw new Error(`Cannot create link because '${value}' is an invalid runtime expression`);
}

/**
 * Given a link parameter or callback path, determine the value from the runtime
 * expression
 *
 * The link parameter or callback path is a reference to data contained in the
 * url/method/statuscode or response/request body/query/path/header
 */
function resolveRuntimeExpression(
  paramName: string,
  value: string,
  resolveData: any,
  root: any,
  args: any,
  logger: Logger
): any {
  const httpLogger = logger.child('http');
  if (value === '$url') {
    return resolveData.usedRequestOptions.url;
  } else if (value === '$method') {
    return resolveData.usedRequestOptions.method;
  } else if (value === '$statusCode') {
    return resolveData.usedStatusCode;
  } else if (value.startsWith('$request.')) {
    // CASE: parameter is previous body
    if (value === '$request.body') {
      return resolveData.usedPayload;

      // CASE: parameter in previous body
    } else if (value.startsWith('$request.body#')) {
      const tokens = JSONPath.JSONPath({
        path: value.split('body#/')[1],
        json: resolveData.usedPayload,
      });
      if (Array.isArray(tokens) && tokens.length > 0) {
        return tokens[0];
      } else {
        httpLogger.debug(() => `Warning: could not extract parameter '${paramName}' from link`);
      }

      // CASE: parameter in previous query parameter
    } else if (value.startsWith('$request.query')) {
      return resolveData.usedParams[Oas3Tools.sanitize(value.split('query.')[1], Oas3Tools.CaseStyle.camelCase)];

      // CASE: parameter in previous path parameter
    } else if (value.startsWith('$request.path')) {
      return resolveData.usedParams[Oas3Tools.sanitize(value.split('path.')[1], Oas3Tools.CaseStyle.camelCase)];

      // CASE: parameter in previous header parameter
    } else if (value.startsWith('$request.header')) {
      return resolveData.usedRequestOptions.headers[value.split('header.')[1]];
    }
  } else if (value.startsWith('$response.')) {
    /**
     * CASE: parameter is body
     *
     * NOTE: may not be used because it implies that the operation does not
     * return a JSON object and OpenAPI-to-GraphQL does not create GraphQL
     * objects for non-JSON data and links can only exists between objects.
     */
    if (value === '$response.body') {
      const result = JSON.parse(JSON.stringify(root));
      /**
       * _openAPIToGraphQL contains data used by OpenAPI-to-GraphQL to create the GraphQL interface
       * and should not be exposed
       */
      result._openAPIToGraphQL = undefined;
      return result;

      // CASE: parameter in body
    } else if (value.startsWith('$response.body#')) {
      const tokens = JSONPath.JSONPath({
        path: value.split('body#/')[1],
        json: root,
      });
      if (Array.isArray(tokens) && tokens.length > 0) {
        return tokens[0];
      } else {
        httpLogger.debug(() => `Warning: could not extract parameter '${paramName}' from link`);
      }

      // CASE: parameter in query parameter
    } else if (value.startsWith('$response.query')) {
      // NOTE: handled the same way $request.query is handled
      return resolveData.usedParams[Oas3Tools.sanitize(value.split('query.')[1], Oas3Tools.CaseStyle.camelCase)];

      // CASE: parameter in path parameter
    } else if (value.startsWith('$response.path')) {
      // NOTE: handled the same way $request.path is handled
      return resolveData.usedParams[Oas3Tools.sanitize(value.split('path.')[1], Oas3Tools.CaseStyle.camelCase)];

      // CASE: parameter in header parameter
    } else if (value.startsWith('$response.header')) {
      return resolveData.responseHeaders[value.split('header.')[1]];
    }
  }

  throw new Error(`Cannot create link because '${value}' is an invalid runtime expression`);
}

/**
 * Check if a string is a runtime expression in the context of link parameters
 */
function isRuntimeExpression(str: string): boolean {
  const references = ['header.', 'query.', 'path.', 'body'];

  if (str === '$url' || str === '$method' || str === '$statusCode') {
    return true;
  } else if (str.startsWith('$request.')) {
    for (let i = 0; i < references.length; i++) {
      if (str.startsWith(`$request.${references[i]}`)) {
        return true;
      }
    }
  } else if (str.startsWith('$response.')) {
    for (let i = 0; i < references.length; i++) {
      if (str.startsWith(`$response.${references[i]}`)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * From the info object provided by the resolver, get a unique identifier, which
 * is the path formed from the nested field names (or aliases if provided)
 *
 * Used to store and retrieve the _openAPIToGraphQL of parent field
 */
function getIdentifier(info: GraphQLResolveInfo): string {
  return getIdentifierRecursive(info.path);
}

/**
 * From the info object provided by the resolver, get the unique identifier of
 * the parent object
 */
function getParentIdentifier(info: GraphQLResolveInfo): string {
  return getIdentifierRecursive(info.path.prev);
}

/**
 * Get the path of nested field names (or aliases if provided)
 */
function getIdentifierRecursive(path: Path): string {
  return typeof path.prev === 'undefined'
    ? path.key.toString()
    : /**
     * Check if the identifier contains array indexing, if so remove.
     *
     * i.e. instead of 0/friends/1/friends/2/friends/user, create
     * friends/friends/friends/user
     */
    isNaN(parseInt(path.key.toString()))
    ? `${path.key}/${getIdentifierRecursive(path.prev)}`
    : getIdentifierRecursive(path.prev);
}

/**
 * Create a new GraphQLError with an extensions field
 */
function graphQLErrorWithExtensions(message: string, extensions: { [key: string]: any }): GraphQLError {
  return new GraphQLError(message, null, null, null, null, null, extensions);
}

/**
 * Extracts data from the GraphQL arguments of a particular field
 *
 * Replaces the path parameter in the given path with values in the given args.
 * Furthermore adds the query parameters for a request.
 */
export function extractRequestDataFromArgs<TSource, TContext, TArgs>(
  path: string,
  parameters: ParameterObject[],
  args: TArgs, // NOTE: argument keys are sanitized!
  data: PreprocessingData<TSource, TContext, TArgs>,
  logger: Logger
): {
  path: string;
  qs: { [key: string]: string };
  headers: { [key: string]: string };
} {
  const httpLogger = logger.child('http');

  const qs = {};
  const headers: any = {};

  // Iterate parameters:
  for (const param of parameters) {
    const sanitizedParamName = Oas3Tools.sanitize(
      param.name,
      !data.options.simpleNames ? Oas3Tools.CaseStyle.camelCase : Oas3Tools.CaseStyle.simple
    );

    if (sanitizedParamName && sanitizedParamName in args) {
      switch (param.in) {
        // Path parameters
        case 'path':
          path = path.replace(`{${param.name}}`, args[sanitizedParamName]);
          break;

        // Query parameters
        case 'query':
          qs[param.name] = args[sanitizedParamName];
          break;

        // Header parameters
        case 'header':
          headers[param.name] = args[sanitizedParamName];
          break;

        // Cookie parameters
        case 'cookie':
          if (!('cookie' in headers)) {
            headers.cookie = '';
          }

          headers.cookie += `${param.name}=${args[sanitizedParamName]}; `;
          break;

        default:
          httpLogger.debug(
            () =>
              `Warning: The parameter location '${param.in}' in the ` +
              `parameter '${param.name}' of operation '${path}' is not ` +
              `supported`
          );
      }
    }
  }

  return { path, qs, headers };
}
