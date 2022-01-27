/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/ban-types */
// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/**
 * Utility functions around the OpenAPI Specification 3.
 */

// Type imports:
import { Oas2 } from './types/oas2';
import { Operation } from './types/operation';
import {
  Oas3,
  ServerObject,
  ParameterObject,
  SchemaObject,
  OperationObject,
  ResponsesObject,
  ResponseObject,
  PathItemObject,
  RequestBodyObject,
  ReferenceObject,
  LinksObject,
  LinkObject,
  MediaTypesObject,
  SecuritySchemeObject,
  SecurityRequirementObject,
} from './types/oas3';
import { PreprocessingData, ProcessedSecurityScheme } from './types/preprocessing_data';
import { InternalOptions } from './types/options';

// Imports:
import * as Swagger2OpenAPI from 'swagger2openapi';
import { handleWarning, MitigationTypes } from './utils';
import * as jsonptr from 'json-ptr';
import pluralize from 'pluralize';
import { jsonFlatStringify } from '@graphql-mesh/utils';
import { Logger } from '@graphql-mesh/types';

// Type definitions & exports:
export type SchemaNames = {
  // Sorted in the following priority order
  fromRef?: string;
  fromSchema?: string;
  fromPath?: string;

  /**
   * Used when the preferred name is known, i.e. a new data def does not need to
   * be created
   */
  preferred?: string;
};

export type RequestSchemaAndNames = {
  payloadContentType?: string;
  payloadSchema?: SchemaObject | ReferenceObject;
  payloadSchemaNames?: SchemaNames;
  payloadRequired: boolean;
};

export type ResponseSchemaAndNames = {
  responseContentType?: string;
  responseSchema?: SchemaObject | ReferenceObject;
  responseSchemaNames?: SchemaNames;
  statusCode?: string;
};

// OAS constants
export enum HTTP_METHODS {
  'get' = 'get',
  'put' = 'put',
  'post' = 'post',
  'patch' = 'patch',
  'delete' = 'delete',
  'options' = 'options',
  'head' = 'head',
}

export const SUCCESS_STATUS_RX = /2[0-9]{2}|2XX/;

/**
 * Given an HTTP method, convert it to the HTTP_METHODS enum
 */
export function methodToHttpMethod(method: string): HTTP_METHODS {
  switch (method.toLowerCase()) {
    case 'get':
      return HTTP_METHODS.get;

    case 'put':
      return HTTP_METHODS.put;

    case 'post':
      return HTTP_METHODS.post;

    case 'patch':
      return HTTP_METHODS.patch;

    case 'delete':
      return HTTP_METHODS.delete;

    case 'options':
      return HTTP_METHODS.options;

    case 'head':
      return HTTP_METHODS.head;

    default:
      throw new Error(`Invalid HTTP method '${method}'`);
  }
}

/**
 * Resolves on a validated OAS 3 for the given spec (OAS 2 or OAS 3), or rejects
 * if errors occur.
 */
export async function getValidOAS3(spec: Oas2 | Oas3): Promise<Oas3> {
  if (typeof (spec as Oas2).swagger === 'string' && (spec as Oas2).swagger === '2.0') {
    const { openapi } = await Swagger2OpenAPI.convertObj(spec, {
      patch: true,
      warnOnly: true,
    });
    return openapi;
  } else {
    return spec as Oas3;
  }
}

/**
 * Counts the number of operations in an OAS.
 */
export function countOperations(oas: Oas3): number {
  let numOps = 0;
  for (const path in oas.paths) {
    for (const method in oas.paths[path]) {
      if (isHttpMethod(method)) {
        numOps++;
        if (oas.paths[path][method].callbacks) {
          for (const cbName in oas.paths[path][method].callbacks) {
            for (const _ in oas.paths[path][method].callbacks[cbName]) {
              numOps++;
            }
          }
        }
      }
    }
  }

  return numOps;
}

/**
 * Counts the number of operations that translate to queries in an OAS.
 */
export function countOperationsQuery(oas: Oas3): number {
  let numOps = 0;
  for (const path in oas.paths) {
    for (const method in oas.paths[path]) {
      if (isHttpMethod(method) && method.toLowerCase() === HTTP_METHODS.get) {
        numOps++;
      }
    }
  }
  return numOps;
}

/**
 * Counts the number of operations that translate to mutations in an OAS.
 */
export function countOperationsMutation(oas: Oas3): number {
  let numOps = 0;
  for (const path in oas.paths) {
    for (const method in oas.paths[path]) {
      if (isHttpMethod(method) && method.toLowerCase() !== HTTP_METHODS.get) {
        numOps++;
      }
    }
  }
  return numOps;
}

/**
 * Counts the number of operations that translate to subscriptions in an OAS.
 */
export function countOperationsSubscription(oas: Oas3): number {
  let numOps = 0;
  for (const path in oas.paths) {
    for (const method in oas.paths[path]) {
      if (isHttpMethod(method) && method.toLowerCase() !== HTTP_METHODS.get && oas.paths[path][method].callbacks) {
        for (const cbName in oas.paths[path][method].callbacks) {
          for (const _ in oas.paths[path][method].callbacks[cbName]) {
            numOps++;
          }
        }
      }
    }
  }
  return numOps;
}

/**
 * Counts the number of operations with a payload definition in an OAS.
 */
export function countOperationsWithPayload(oas: Oas3): number {
  let numOps = 0;
  for (const path in oas.paths) {
    for (const method in oas.paths[path]) {
      if (isHttpMethod(method) && typeof oas.paths[path][method].requestBody === 'object') {
        numOps++;
      }
    }
  }
  return numOps;
}

/**
 * Resolves the given reference in the given object.
 */
export function resolveRef(ref: string, oas: Oas3): any {
  return jsonptr.JsonPointer.get(oas, ref);
}

/**
 * Returns the base URL to use for the given operation.
 */
export function getBaseUrl(operation: Operation, logger: Logger): string {
  const httpLogger = logger.child('http');

  // Check for servers:
  if (!Array.isArray(operation.servers) || operation.servers.length === 0) {
    throw new Error(`No servers defined for operation '${operation.operationString}'`);
  }

  // Check for local servers
  if (Array.isArray(operation.servers) && operation.servers.length > 0) {
    const url = buildUrl(operation.servers[0]);

    if (Array.isArray(operation.servers) && operation.servers.length > 1) {
      httpLogger.debug(() => `Warning: Randomly selected first server '${url}'`);
    }

    return url.replace(/\/$/, '');
  }

  const oas = operation.oas;

  if (Array.isArray(oas.servers) && oas.servers.length > 0) {
    const url = buildUrl(oas.servers[0]);

    if (Array.isArray(oas.servers) && oas.servers.length > 1) {
      httpLogger.debug(() => `Warning: Randomly selected first server '${url}'`);
    }

    return url.replace(/\/$/, '');
  }

  throw new Error('Cannot find a server to call');
}

/**
 * Returns the default URL for a given OAS server object.
 */
function buildUrl(server: ServerObject): string {
  let url = server.url;

  // Replace with variable defaults, if applicable
  if (typeof server.variables === 'object' && Object.keys(server.variables).length > 0) {
    for (const variableKey in server.variables) {
      // TODO: check for default? Would be invalid OAS
      url = url.replace(`{${variableKey}}`, server.variables[variableKey].default.toString());
    }
  }

  return url;
}

/**
 * Returns object/array/scalar where all object keys (if applicable) are
 * sanitized.
 */
export function sanitizeObjectKeys(
  obj: any, // obj does not necessarily need to be an object
  caseStyle: CaseStyle = CaseStyle.camelCase
): any {
  const cleanKeys = (obj: any): any => {
    // Case: no (response) data
    if (obj === null || typeof obj === 'undefined') {
      return null;

      // Case: array
    } else if (Array.isArray(obj)) {
      return obj.map(cleanKeys);

      // Case: object
    } else if (typeof obj === 'object') {
      const res: object = {};

      for (const key in obj) {
        const saneKey = sanitize(key, caseStyle);

        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          res[saneKey] = cleanKeys(obj[key]);
        }
      }

      return res;

      // Case: scalar
    } else {
      return obj;
    }
  };

  return cleanKeys(obj);
}

/**
 * Desanitizes keys in given object by replacing them with the keys stored in
 * the given mapping.
 */
export function desanitizeObjectKeys(obj: object | Array<any>, mapping: object = {}): object | Array<any> {
  const replaceKeys = (obj: any): any => {
    if (obj === null) {
      return null;
    } else if (Array.isArray(obj)) {
      return obj.map(replaceKeys);
    } else if (typeof obj === 'object') {
      const res = {};
      for (const key in obj) {
        if (key in mapping) {
          const rawKey = mapping[key];
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            res[rawKey] = replaceKeys(obj[key]);
          }
        } else {
          res[key] = replaceKeys(obj[key]);
        }
      }
      return res;
    } else {
      return obj;
    }
  };
  return replaceKeys(obj);
}

/**
 * Returns the GraphQL type that the provided schema should be made into
 *
 * Does not consider allOf, anyOf, oneOf, or not (handled separately)
 */
export function getSchemaTargetGraphQLType<TSource, TContext, TArgs>(
  schema: SchemaObject,
  data: PreprocessingData<TSource, TContext, TArgs>
): string | null {
  // CASE: object
  if (schema.type === 'object' || typeof schema.properties === 'object') {
    // TODO: additionalProperties is more like a flag than a type itself
    // CASE: arbitrary JSON
    if (typeof schema.additionalProperties === 'object') {
      return 'json';
    } else {
      return 'object';
    }
  }

  // CASE: array
  if (schema.type === 'array' || 'items' in schema) {
    return 'list';
  }

  // CASE: enum
  if (Array.isArray(schema.enum)) {
    return 'enum';
  }

  // CASE: a type is present
  if (typeof schema.type === 'string') {
    // Special edge cases involving the schema format
    if (typeof schema.format === 'string') {
      /**
       * CASE: 64 bit int - return number instead of integer, leading to use of
       * GraphQLFloat, which can support 64 bits:
       */
      if (schema.type === 'integer' && schema.format === 'int64') {
        return 'number';

        // CASE: id
      } else if (
        schema.type === 'string' &&
        (schema.format === 'uuid' ||
          // Custom ID format
          (Array.isArray(data.options.idFormats) && data.options.idFormats.includes(schema.format)))
      ) {
        return 'id';
      }
    }

    return schema.type;
  }

  return null;
}

function isIdParam(part: string) {
  return /^{.*(id|name|key).*}$/gi.test(part);
}

function isSingularParam(part: string, nextPart: string) {
  return `\{${pluralize.singular(part)}\}` === nextPart;
}

/**
 * Infers a resource name from the given URL path.
 *
 * For example, turns "/users/{userId}/car" into "userCar".
 */
export function inferResourceNameFromPath(path: string): string {
  const parts = path.split('/');
  const pathNoPathParams = parts.reduce((path, part, i) => {
    if (!/{/g.test(part)) {
      if (parts[i + 1] && (isIdParam(parts[i + 1]) || isSingularParam(part, parts[i + 1]))) {
        return path + capitalize(pluralize.singular(part));
      } else {
        return path + capitalize(part);
      }
    } else {
      return path;
    }
  }, '');

  return pathNoPathParams;
}

/**
 * Returns JSON-compatible schema required by the given operation
 */
export function getRequestBodyObject(
  operation: OperationObject,
  oas: Oas3
): { payloadContentType: string; requestBodyObject: RequestBodyObject } | null {
  if (typeof operation.requestBody === 'object') {
    let requestBodyObject: RequestBodyObject | ReferenceObject = operation.requestBody;

    // Make sure we have a RequestBodyObject:
    if (typeof (requestBodyObject as ReferenceObject).$ref === 'string') {
      requestBodyObject = resolveRef((requestBodyObject as ReferenceObject).$ref, oas) as RequestBodyObject;
    } else {
      requestBodyObject = requestBodyObject as RequestBodyObject;
    }

    if (typeof requestBodyObject.content === 'object') {
      const content: MediaTypesObject = requestBodyObject.content;

      const contentTypes = Object.keys(content);
      const jsonContentType = contentTypes
        .find(contentType => contentType.toString().includes('application/json'))
        ?.toString();
      const formDataContentType = contentTypes
        .find(contentType => contentType.toString().includes('application/x-www-form-urlencoded'))
        ?.toString();

      // Prioritize content-type JSON
      if (jsonContentType) {
        return {
          payloadContentType: jsonContentType,
          requestBodyObject,
        };
      } else if (formDataContentType) {
        return {
          payloadContentType: formDataContentType,
          requestBodyObject,
        };
      } else {
        return {
          payloadContentType: contentTypes[0].toString(),
          requestBodyObject,
        };
      }
    }
  }
  return { payloadContentType: null, requestBodyObject: null };
}

/**
 * Returns the request schema (if any) for the given operation,
 * a dictionary of names from different sources (if available), and whether the
 * request schema is required for the operation.
 */
export function getRequestSchemaAndNames(path: string, operation: OperationObject, oas: Oas3): RequestSchemaAndNames {
  const { payloadContentType, requestBodyObject } = getRequestBodyObject(operation, oas);

  if (payloadContentType) {
    let payloadSchema = requestBodyObject.content[payloadContentType].schema;

    // Get resource name from different sources
    let fromRef: string;
    if ('$ref' in payloadSchema) {
      fromRef = payloadSchema.$ref.split('/').pop();
      payloadSchema = resolveRef(payloadSchema.$ref, oas);
    }

    let payloadSchemaNames: any = {
      fromRef,
      fromSchema: (payloadSchema as SchemaObject).title,
      fromPath: inferResourceNameFromPath(path),
    };

    // Determine if request body is required:
    const payloadRequired = typeof requestBodyObject.required === 'boolean' ? requestBodyObject.required : false;

    /**
     * Edge case: if request body content-type is not application/json or
     * application/x-www-form-urlencoded, do not parse it.
     *
     * Instead, treat the request body as a black box and send it as a string
     * with the proper content-type header
     */
    if (
      !payloadContentType.includes('application/json') &&
      !payloadContentType.includes('application/x-www-form-urlencoded') &&
      !payloadContentType.includes('*/*')
    ) {
      const saneContentTypeName = uncapitalize(
        payloadContentType.split('/').reduce((name, term) => {
          return name + capitalize(term);
        })
      );

      payloadSchemaNames = {
        fromPath: saneContentTypeName,
      };

      let description = `String represents payload of content type '${payloadContentType}'`;

      if ('description' in payloadSchema && typeof payloadSchema.description === 'string') {
        description += `\n\nOriginal top level description: '${payloadSchema.description}'`;
      }

      payloadSchema = {
        description: description,
        type: 'string',
      };
    }

    return {
      payloadContentType,
      payloadSchema,
      payloadSchemaNames,
      payloadRequired,
    };
  }
  return {
    payloadRequired: false,
  };
}

/**
 * Returns JSON-compatible schema produced by the given operation
 */
export function getResponseObject(
  operation: OperationObject,
  statusCode: string,
  oas: Oas3
): { responseContentType: string; responseObject: ResponseObject } | null {
  if (typeof operation.responses === 'object') {
    const responses: ResponsesObject = operation.responses;
    if (typeof responses[statusCode] === 'object') {
      let responseObject: ResponseObject | ReferenceObject = responses[statusCode];

      // Make sure we have a ResponseObject:
      if (typeof (responseObject as ReferenceObject).$ref === 'string') {
        responseObject = resolveRef((responseObject as ReferenceObject).$ref, oas) as ResponseObject;
      } else {
        responseObject = responseObject as ResponseObject;
      }

      if (responseObject.content && typeof responseObject.content !== 'undefined') {
        const content: MediaTypesObject = responseObject.content;

        const contentTypes = Object.keys(content);
        const isJsonContent = contentTypes.some(contentType => contentType.toString().includes('application/json'));
        // Prioritize content-type JSON
        if (isJsonContent) {
          return {
            responseContentType: 'application/json',
            responseObject,
          };
        } else {
          // Pick first (random) content type
          const randomContentType = contentTypes[0].toString();

          return {
            responseContentType: randomContentType,
            responseObject,
          };
        }
      }
    }
  }
  return { responseContentType: null, responseObject: null };
}

/**
 * Returns the response schema for the given operation,
 * a successful  status code, and a dictionary of names from different sources
 * (if available).
 */
export function getResponseSchemaAndNames<TSource, TContext, TArgs>(
  path: string,
  method: HTTP_METHODS,
  operation: OperationObject,
  oas: Oas3,
  data: PreprocessingData<TSource, TContext, TArgs>,
  options: InternalOptions<TSource, TContext, TArgs>
): ResponseSchemaAndNames {
  const statusCode = getResponseStatusCode(path, method, operation, oas, data, options.logger);
  if (!statusCode) {
    return {};
  }
  const { responseContentType, responseObject } = getResponseObject(operation, statusCode, oas);

  if (responseContentType) {
    const contentTypes = Object.keys(responseObject.content);
    const availableSimilarContentType = contentTypes.find(contentType =>
      contentType.toString().includes(responseContentType)
    );
    let responseSchema = responseObject.content[availableSimilarContentType || contentTypes[0]].schema;
    let fromRef: string;

    if (responseSchema) {
      if ('$ref' in responseSchema) {
        fromRef = responseSchema.$ref.split('/').pop();
        responseSchema = resolveRef(responseSchema.$ref, oas);
      }
    } else if (options.allowUndefinedSchemaRefTags) {
      options.logger.info(`${path}:${method.toUpperCase()}:${statusCode}`);
      fromRef = 'Unknown';
      responseSchema = {
        description: `Placeholder for missing ${path}:${method.toUpperCase()}:${statusCode} schema ref`,
        type: options.defaultUndefinedSchemaType || 'object',
      };
    } else {
      throw new Error(`${path}:${method.toUpperCase()}:${statusCode} has an undefined schema ref`);
    }

    const responseSchemaNames = {
      fromRef,
      fromSchema: (responseSchema as SchemaObject).title,
      fromPath: inferResourceNameFromPath(path),
    };

    /**
     * Edge case: if response body content-type is not application/json, do not
     * parse.
     */
    if (!responseContentType.includes('application/json') && !responseContentType.includes('*/*')) {
      let description = 'Placeholder to access non-application/json response bodies';

      if ('description' in responseSchema && typeof responseSchema.description === 'string') {
        description += `\n\nOriginal top level description: '${responseSchema.description}'`;
      }

      responseSchema = {
        description: description,
        type: 'string',
      };
    }

    return {
      responseContentType,
      responseSchema,
      responseSchemaNames,
      statusCode,
    };
  } else {
    /**
     * GraphQL requires that objects must have some properties.
     *
     * To allow some operations (such as those with a 204 HTTP code) to be
     * included in the GraphQL interface, we added the fillEmptyResponses
     * option, which will simply create a placeholder to allow access.
     */
    if (options.fillEmptyResponses) {
      return {
        responseSchemaNames: {
          fromPath: inferResourceNameFromPath(path),
        },
        responseContentType: 'application/json',
        responseSchema: {
          description: 'Placeholder to support operations with no response schema',
          type: 'object',
        },
      };
    }

    return {};
  }
}

/**
 * Returns a success status code for the given operation
 */
export function getResponseStatusCode<TSource, TContext, TArgs>(
  path: string,
  method: string,
  operation: OperationObject,
  oas: Oas3,
  data: PreprocessingData<TSource, TContext, TArgs>,
  logger: Logger
): string | void {
  const translationLogger = logger.child('translation');
  if (typeof operation.responses === 'object') {
    const codes = Object.keys(operation.responses);
    const successCodes = codes.filter(code => {
      return code === 'default' || SUCCESS_STATUS_RX.test(code.toString());
    });
    if (successCodes.length === 1) {
      return successCodes[0].toString();
    } else if (successCodes.length > 1) {
      handleWarning({
        mitigationType: MitigationTypes.MULTIPLE_RESPONSES,
        message:
          `Operation '${formatOperationString(method, path, oas.info?.title)}' ` +
          `contains multiple possible successful response object ` +
          `(HTTP code 200-299 or 2XX). Only one can be chosen.`,
        mitigationAddendum: `The response object with the HTTP code ` + `${successCodes[0]} will be selected`,
        data,
        logger: translationLogger,
      });
      return successCodes[0].toString();
    }
  }
  return null;
}

/**
 * Returns a hash containing the links in the given operation.
 */
export function getLinks<TSource, TContext, TArgs>(
  path: string,
  method: HTTP_METHODS,
  operation: OperationObject,
  oas: Oas3,
  data: PreprocessingData<TSource, TContext, TArgs>,
  logger: Logger
): { [key: string]: LinkObject } {
  const links = {};
  const statusCode = getResponseStatusCode(path, method, operation, oas, data, logger);
  if (!statusCode) {
    return links;
  }
  if (typeof operation.responses === 'object') {
    const responses: ResponsesObject = operation.responses;
    if (typeof responses[statusCode] === 'object') {
      let response: ResponseObject | ReferenceObject = responses[statusCode];

      if (typeof (response as ReferenceObject).$ref === 'string') {
        response = resolveRef((response as ReferenceObject).$ref, oas) as ResponseObject;
      }

      // Here, we can be certain we have a ResponseObject:
      response = response as ResponseObject;

      if (typeof response.links === 'object') {
        const epLinks: LinksObject = response.links;
        for (const linkKey in epLinks) {
          let link: LinkObject | ReferenceObject = epLinks[linkKey];

          // Make sure we have LinkObjects:
          if (typeof (link as ReferenceObject).$ref === 'string') {
            link = resolveRef((link as ReferenceObject).$ref, oas);
          } else {
            link = link as LinkObject;
          }
          links[linkKey] = link;
        }
      }
    }
  }
  return links;
}

/**
 * Returns the list of parameters in the given operation.
 */
export function getParameters(
  path: string,
  method: HTTP_METHODS,
  operation: OperationObject,
  pathItem: PathItemObject,
  oas: Oas3,
  logger: Logger
): ParameterObject[] {
  const translationLogger = logger.child('translation');

  let parameters: ParameterObject[] = [];

  if (!isHttpMethod(method)) {
    translationLogger.debug(
      () => `Warning: attempted to get parameters for ${method} ${path}, ` + `which is not an operation.`
    );
    return parameters;
  }

  // First, consider parameters in Path Item Object:
  const pathParams = pathItem.parameters;
  if (Array.isArray(pathParams)) {
    const pathItemParameters: ParameterObject[] = pathParams.map(p => {
      if (typeof (p as ReferenceObject).$ref === 'string') {
        // Here we know we have a parameter object:
        return resolveRef((p as ReferenceObject).$ref, oas) as ParameterObject;
      } else {
        // Here we know we have a parameter object:
        return p as ParameterObject;
      }
    });
    parameters = parameters.concat(pathItemParameters);
  }

  // Second, consider parameters in Operation Object:
  const opObjectParameters = operation.parameters;
  if (Array.isArray(opObjectParameters)) {
    const operationParameters: ParameterObject[] = opObjectParameters.map(p => {
      if (typeof (p as ReferenceObject).$ref === 'string') {
        // Here we know we have a parameter object:
        return resolveRef((p as ReferenceObject).$ref, oas) as ParameterObject;
      } else {
        // Here we know we have a parameter object:
        return p as ParameterObject;
      }
    });
    parameters = parameters.concat(operationParameters);
  }

  return parameters;
}

/**
 * Returns an array of server objects for the operation at the given path and
 * method. Considers in the following order: global server definitions,
 * definitions at the path item, definitions at the operation, or the OAS
 * default.
 */
export function getServers(operation: OperationObject, pathItem: PathItemObject, oas: Oas3): ServerObject[] {
  let servers: ServerObject[] = [];
  // Global server definitions:
  if (Array.isArray(oas.servers) && oas.servers.length > 0) {
    servers = oas.servers;
  }

  // First, consider servers defined on the path
  if (Array.isArray(pathItem.servers) && pathItem.servers.length > 0) {
    servers = pathItem.servers;
  }

  // Second, consider servers defined on the operation
  if (Array.isArray(operation.servers) && operation.servers.length > 0) {
    servers = operation.servers;
  }

  // Default, in case there is no server:
  if (servers.length === 0) {
    const server: ServerObject = {
      url: '/', // TODO: avoid double-slashes
    };
    servers.push(server);
  }

  return servers;
}

/**
 * Returns a map of Security Scheme definitions, identified by keys. Resolves
 * possible references.
 */
export function getSecuritySchemes(oas: Oas3): { [key: string]: SecuritySchemeObject } {
  // Collect all security schemes:
  const securitySchemes: { [key: string]: SecuritySchemeObject } = {};
  if (typeof oas.components === 'object' && typeof oas.components.securitySchemes === 'object') {
    for (const schemeKey in oas.components.securitySchemes) {
      const obj = oas.components.securitySchemes[schemeKey];

      // Ensure we have actual SecuritySchemeObject:
      if (typeof (obj as ReferenceObject).$ref === 'string') {
        // Result of resolution will be SecuritySchemeObject:
        securitySchemes[schemeKey] = resolveRef((obj as ReferenceObject).$ref, oas) as SecuritySchemeObject;
      } else {
        // We already have a SecuritySchemeObject:
        securitySchemes[schemeKey] = obj as SecuritySchemeObject;
      }
    }
  }
  return securitySchemes;
}

/**
 * Returns the list of sanitized keys of non-OAuth2 security schemes
 * required by the operation at the given path and method.
 */
export function getSecurityRequirements(
  operation: OperationObject,
  securitySchemes: { [key: string]: ProcessedSecurityScheme },
  oas: Oas3
): string[] {
  const results: string[] = [];

  // First, consider global requirements
  const globalSecurity: SecurityRequirementObject[] = oas.security;
  if (globalSecurity && typeof globalSecurity !== 'undefined') {
    for (const secReq of globalSecurity) {
      for (const schemaKey in secReq) {
        if (
          securitySchemes[schemaKey] &&
          typeof securitySchemes[schemaKey] === 'object' &&
          securitySchemes[schemaKey].def.type !== 'oauth2'
        ) {
          results.push(schemaKey);
        }
      }
    }
  }

  // Second, consider operation requirements
  const localSecurity: SecurityRequirementObject[] = operation.security;
  if (localSecurity && typeof localSecurity !== 'undefined') {
    for (const secReq of localSecurity) {
      for (const schemaKey in secReq) {
        if (
          securitySchemes[schemaKey] &&
          typeof securitySchemes[schemaKey] === 'object' &&
          securitySchemes[schemaKey].def.type !== 'oauth2'
        ) {
          if (!results.includes(schemaKey)) {
            results.push(schemaKey);
          }
        }
      }
    }
  }
  return results;
}

export enum CaseStyle {
  simple, // No case style is applied. Only illegal characters are removed.
  PascalCase, // Used for type names
  camelCase, // Used for (input) object field names
  ALL_CAPS, // Used for enum values
}

/**
 * First sanitizes given string and then also camel-cases it.
 */
export function sanitize(str: string, caseStyle: CaseStyle): string {
  /**
   * Used in conjunction to simpleNames, which only removes illegal
   * characters and preserves casing
   */
  if (caseStyle === CaseStyle.simple) {
    return str.replace(/[^a-zA-Z0-9_]/gi, '');
  }

  /**
   * Remove all GraphQL unsafe characters
   */
  const regex =
    caseStyle === CaseStyle.ALL_CAPS
      ? /[^a-zA-Z0-9_]/g // ALL_CAPS has underscores
      : /[^a-zA-Z0-9]/g;

  const operators = {
    '<=': 'less_than_or_equal_to',
    '>=': 'greater_than_or_equal_to',
    '<': 'less_than',
    '>': 'greater_than',
    '=': 'equal_to',
  };

  for (const operator in operators) {
    str = str.replace(operator, operators[operator]);
  }

  let sanitized = str.split(regex).reduce((path, part) => {
    if (caseStyle === CaseStyle.ALL_CAPS) {
      return path + '_' + part;
    } else {
      return path + capitalize(part);
    }
  });

  switch (caseStyle) {
    case CaseStyle.PascalCase:
      // The first character in PascalCase should be uppercase
      sanitized = capitalize(sanitized);
      break;

    case CaseStyle.camelCase:
      // The first character in camelCase should be lowercase
      sanitized = uncapitalize(sanitized);
      break;

    case CaseStyle.ALL_CAPS:
      sanitized = sanitized.toUpperCase();
      break;
  }

  // Special case: we cannot start with number, and cannot be empty:
  if (/^[0-9]/.test(sanitized) || sanitized === '') {
    sanitized = '_' + sanitized;
  }

  return sanitized;
}

/**
 * Sanitizes the given string and stores the sanitized-to-original mapping in
 * the given mapping.
 */
export function storeSaneName(
  saneStr: string,
  str: string,
  mapping: { [key: string]: string },
  logger: Logger
): string {
  if (saneStr in mapping && str !== mapping[saneStr]) {
    const translationLogger = logger.child('translation');
    // TODO: Follow warning model
    translationLogger.debug(
      () =>
        `Warning: '${str}' and '${mapping[saneStr]}' both sanitize ` +
        `to '${saneStr}' - collision possible. Desanitize to '${str}'.`
    );
    let appendix = 2;
    while (`${saneStr}${appendix}` in mapping) {
      appendix++;
    }
    return storeSaneName(`${saneStr}${appendix}`, str, mapping, logger);
  }
  mapping[saneStr] = str;

  return saneStr;
}

/**
 * Stringifies and possibly trims the given string to the provided length.
 */
export function trim(str: string, length: number): string {
  if (typeof str !== 'string') {
    str = jsonFlatStringify(str);
  }

  if (str && str.length > length) {
    str = `${str.substring(0, length)}...`;
  }

  return str;
}

/**
 * Determines if the given "method" is indeed an operation. Alternatively, the
 * method could point to other types of information (e.g., parameters, servers).
 */
export function isHttpMethod(method: string): boolean {
  return Object.keys(HTTP_METHODS).includes(method.toLowerCase() as any);
}

/**
 * Formats a string that describes an operation in the form:
 * {name of OAS} {HTTP method in ALL_CAPS} {operation path}
 *
 * Also used in preprocessing.ts where Operation objects are being constructed
 */
export function formatOperationString(method: string, path: string, title?: string): string {
  if (title) {
    return `${title} ${method.toUpperCase()} ${path}`;
  } else {
    return `${method.toUpperCase()} ${path}`;
  }
}

/**
 * Capitalizes a given string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Uncapitalizes a given string
 */
export function uncapitalize(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * For operations that do not have an operationId, generate one
 */
export function generateOperationId(method: HTTP_METHODS, path: string): string {
  return sanitize(`${method} ${path}`, CaseStyle.camelCase);
}
