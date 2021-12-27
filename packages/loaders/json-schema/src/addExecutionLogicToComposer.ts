import { SchemaComposer, getComposeTypeName, ObjectTypeComposer } from 'graphql-compose';
import { Logger, MeshPubSub } from '@graphql-mesh/types';
import { JSONSchemaOperationConfig } from './types';
import { getOperationMetadata, isPubSubOperationConfig, isFileUpload, cleanObject } from './utils';
import { jsonFlatStringify, parseInterpolationStrings, stringInterpolator } from '@graphql-mesh/utils';
import { inspect } from '@graphql-tools/utils';
import { env } from 'process';
import urlJoin from 'url-join';
import { resolveDataByUnionInputType } from './resolveDataByUnionInputType';
import { stringify as qsStringify } from 'qs';
import {
  getNamedType,
  GraphQLOutputType,
  GraphQLSchema,
  isAbstractType,
  isListType,
  isNonNullType,
  isScalarType,
} from 'graphql';

export interface AddExecutionLogicToComposerOptions {
  baseUrl: string;
  operations: JSONSchemaOperationConfig[];
  operationHeaders?: Record<string, string>;
  errorMessage?: string;
  fetch: WindowOrWorkerGlobalScope['fetch'];
  logger: Logger;
  pubsub?: MeshPubSub;
}

function isListTypeOrNonNullListType(type: GraphQLOutputType) {
  if (isNonNullType(type)) {
    return isListType(type.ofType);
  }
  return isListType(type);
}

function getErrorTypeName(schema: GraphQLSchema, type: GraphQLOutputType, errorFieldName: string): string | void {
  const namedType = getNamedType(type);
  if (isAbstractType(namedType)) {
    for (const possibleType of schema.getPossibleTypes(namedType)) {
      const errorTypeName = getErrorTypeName(schema, possibleType, errorFieldName);
      if (errorTypeName) {
        return errorTypeName;
      }
    }
  }
  if ('getFields' in type && type.getFields()[errorFieldName]) {
    return type.name;
  }
}

export async function addExecutionLogicToComposer(
  schemaComposer: SchemaComposer,
  {
    fetch: globalFetch,
    logger,
    operations,
    operationHeaders,
    baseUrl,
    pubsub: globalPubsub,
    errorMessage,
  }: AddExecutionLogicToComposerOptions
) {
  logger.debug(() => `Attaching execution logic to the schema`);
  for (const operationConfig of operations) {
    const { httpMethod, rootTypeName, fieldName } = getOperationMetadata(operationConfig);
    const operationLogger = logger.child(`${rootTypeName}.${fieldName}`);

    const interpolationStrings: string[] = [...Object.values(operationHeaders || {}), baseUrl];

    const rootTypeComposer = schemaComposer[rootTypeName];

    const field = rootTypeComposer.getField(fieldName);

    if (operationConfig.requestTypeName) {
      const tcName = getComposeTypeName(field.args.input.type, schemaComposer);
      const tcWithName = schemaComposer.getAnyTC(tcName) as ObjectTypeComposer;
      if (tcName !== operationConfig.requestTypeName && !schemaComposer.has(operationConfig.requestTypeName)) {
        tcWithName.setTypeName(operationConfig.requestTypeName);
      }
    }

    if (operationConfig.responseTypeName) {
      const tcName = getComposeTypeName(field.type, schemaComposer);
      if (tcName !== operationConfig.responseTypeName && !schemaComposer.has(operationConfig.responseTypeName)) {
        const tcWithName = schemaComposer.getAnyTC(tcName) as ObjectTypeComposer;
        tcWithName.setTypeName(operationConfig.responseTypeName);
      }
    }

    if (isPubSubOperationConfig(operationConfig)) {
      field.description = operationConfig.description || `PubSub Topic: ${operationConfig.pubsubTopic}`;
      field.subscribe = (root, args, context, info) => {
        const pubsub = context?.pubsub || globalPubsub;
        if (!pubsub) {
          throw new Error(`You should have PubSub defined in either the config or the context!`);
        }
        const interpolationData = { root, args, context, info, env };
        const pubsubTopic = stringInterpolator.parse(operationConfig.pubsubTopic, interpolationData);
        operationLogger.debug(() => `=> Subscribing to pubSubTopic: ${pubsubTopic}`);
        return pubsub.asyncIterator(pubsubTopic);
      };
      field.resolve = root => {
        operationLogger.debug(() => `Received ${inspect(root)} from ${operationConfig.pubsubTopic}`);
        return root;
      };
      interpolationStrings.push(operationConfig.pubsubTopic);
    } else if (operationConfig.path) {
      field.description = operationConfig.description || `${operationConfig.method} ${operationConfig.path}`;
      field.resolve = async (root, args, context, info) => {
        operationLogger.debug(() => `=> Resolving`);
        const interpolationData = { root, args, context, info, env };
        const interpolatedBaseUrl = stringInterpolator.parse(baseUrl, interpolationData);
        const interpolatedPath = stringInterpolator.parse(operationConfig.path, interpolationData);
        let fullPath = urlJoin(interpolatedBaseUrl, interpolatedPath);
        const headers = {
          ...operationHeaders,
          ...operationConfig?.headers,
        };
        for (const headerName in headers) {
          headers[headerName] = stringInterpolator.parse(headers[headerName], interpolationData);
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
          // Resolve union input
          const input = resolveDataByUnionInputType(
            cleanObject(args.input),
            field.args?.input?.type?.getType(),
            schemaComposer
          );
          if (input != null) {
            switch (httpMethod) {
              case 'GET':
              case 'HEAD':
              case 'CONNECT':
              case 'OPTIONS':
              case 'TRACE': {
                fullPath += fullPath.includes('?') ? '&' : '?';
                fullPath += qsStringify(input, { encode: false });
                break;
              }
              case 'POST':
              case 'PUT':
              case 'PATCH':
              case 'DELETE': {
                const [, contentType] =
                  Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type') || [];
                if (contentType?.startsWith('application/x-www-form-urlencoded')) {
                  requestInit.body = qsStringify(input);
                } else {
                  requestInit.body = jsonFlatStringify(input);
                }
                break;
              }
              default:
                throw new Error(`Unknown method ${httpMethod}`);
            }
          }
        }
        operationLogger.debug(() => `=> Fetching ${fullPath}=>${inspect(requestInit)}`);
        const fetch: typeof globalFetch = context?.fetch || globalFetch;
        if (!fetch) {
          throw new Error(`You should have PubSub defined in either the config or the context!`);
        }
        const response = await fetch(fullPath, requestInit);
        const responseText = await response.text();
        operationLogger.debug(
          () =>
            `=> Received ${inspect({
              headers: response.headers,
              text: responseText,
            })}`
        );
        let responseJson: any;
        try {
          responseJson = JSON.parse(responseText);
        } catch (e) {
          const returnNamedGraphQLType = getNamedType(info.returnType);
          // The result might be defined as scalar
          if (isScalarType(returnNamedGraphQLType)) {
            operationLogger.debug(() => ` => Return type is not a JSON so returning ${responseText}`);
            return responseText;
          }
          throw responseText;
        }
        const errorMessageTemplate = errorMessage || 'message';
        function normalizeError(error: any): Error {
          const errorMessage = stringInterpolator.parse(errorMessageTemplate, error);
          if (typeof error === 'object' && errorMessage) {
            const errorObj = new Error(errorMessage);
            errorObj.stack = null;
            Object.assign(errorObj, error);
            return errorObj;
          } else {
            return error;
          }
        }

        // Make sure the return type doesn't have a field `errors`
        // so ignore auto error detection if the return type has that field
        if (responseJson.errors?.length) {
          const errorTypeName = getErrorTypeName(info.schema, info.returnType, 'errors');
          if (errorTypeName) {
            responseJson.__typename = errorTypeName;
          } else {
            const normalizedErrors: Error[] = responseJson.errors.map(normalizeError);
            const aggregatedError =
              responseJson.errors.length > 1
                ? new AggregateError(
                    normalizedErrors,
                    `${rootTypeName}.${fieldName} failed; \n${normalizedErrors
                      .map(error => ` - ${error.message || error}`)
                      .join('\n')}\n`
                  )
                : normalizedErrors[0];
            aggregatedError.stack = null;
            logger.debug(() => `=> Throwing the error ${inspect(aggregatedError)}`);
            return aggregatedError;
          }
        }

        if (responseJson.error) {
          const errorTypeName = getErrorTypeName(info.schema, info.returnType, 'error');
          if (errorTypeName) {
            responseJson.__typename = errorTypeName;
          } else {
            const normalizedError = normalizeError(responseJson.error);
            operationLogger.debug(() => `=> Throwing the error ${inspect(normalizedError)}`);
            return normalizedError;
          }
        }

        operationLogger.debug(() => `=> Returning ${inspect(responseJson)}`);
        // Sometimes API returns an array but the return type is not an array
        const isListReturnType = isListTypeOrNonNullListType(info.returnType);
        const isArrayResponse = Array.isArray(responseJson);
        if (isListReturnType && !isArrayResponse) {
          operationLogger.debug(() => `Response is not array but return type is list. Normalizing the response`);
          responseJson = [responseJson];
        }
        if (!isListReturnType && isArrayResponse) {
          operationLogger.debug(() => `Response is array but return type is not list. Normalizing the response`);
          responseJson = responseJson[0];
        }
        return responseJson;
      };
      interpolationStrings.push(...Object.values(operationConfig.headers || {}));
      interpolationStrings.push(operationConfig.path);
    }
    const { args: globalArgs } = parseInterpolationStrings(interpolationStrings, operationConfig.argTypeMap);
    rootTypeComposer.addFieldArgs(fieldName, globalArgs);
  }

  logger.debug(() => `Building the executable schema.`);
  return schemaComposer;
}
