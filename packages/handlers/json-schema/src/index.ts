import { StoreProxy } from '@graphql-mesh/store';
import { GetMeshSourceOptions, KeyValueCache, Logger, MeshHandler, MeshPubSub, YamlConfig } from '@graphql-mesh/types';
import {
  jsonFlatStringify,
  parseInterpolationStrings,
  stringInterpolator,
  readFileOrUrlWithCache,
  getCachedFetch,
  asArray,
  AggregateError,
} from '@graphql-mesh/utils';
import { JSONSchema, JSONSchemaObject } from '@json-schema-tools/meta-schema';
import { SchemaComposer } from 'graphql-compose';
import toJsonSchema from 'to-json-schema';
import { stringify as qsStringify } from 'qs';
import urlJoin from 'url-join';
import {
  GraphQLInputType,
  isInputObjectType,
  isListType,
  isNonNullType,
  isScalarType,
  specifiedDirectives,
} from 'graphql';
import { JsonSchemaWithDiff } from './JsonSchemaWithDiff';
import { inspect } from 'util';
import { dereferenceJSONSchema } from './utils/dereferenceJSONSchema';
import { getComposerFromJSONSchema } from './utils/getComposerFromJSONSchema';
import { healJSONSchema } from './utils/healJSONSchema';
import { referenceJSONSchema } from './utils/referenceJSONSchema';

export default class JsonSchemaHandler implements MeshHandler {
  private config: YamlConfig.JsonSchemaHandler;
  private baseDir: string;
  public cache: KeyValueCache<any>;
  public pubsub: MeshPubSub;
  public jsonSchema: StoreProxy<JSONSchema>;
  private logger: Logger;

  constructor({ config, baseDir, cache, pubsub, store, logger }: GetMeshSourceOptions<YamlConfig.JsonSchemaHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.pubsub = pubsub;
    this.jsonSchema = store.proxy('jsonSchema.json', JsonSchemaWithDiff);
    this.logger = logger;
  }

  async getMeshSource() {
    const cachedJsonSchema = await this.jsonSchema.getWithSet(async () => {
      const finalJsonSchema: JSONSchema = {
        type: 'object',
        title: '_schema',
        properties: {},
        required: ['query'],
      };
      for (const operationConfig of this.config.operations) {
        operationConfig.method = operationConfig.method || (operationConfig.type === 'Mutation' ? 'POST' : 'GET');
        operationConfig.type = operationConfig.type || (operationConfig.method === 'GET' ? 'Query' : 'Mutation');
        const rootTypePropertyName = operationConfig.type.toLowerCase();
        const rootTypeDefinition = (finalJsonSchema.properties[rootTypePropertyName] = finalJsonSchema.properties[
          rootTypePropertyName
        ] || {
          type: 'object',
          title: operationConfig.type,
          properties: {},
        });
        rootTypeDefinition.properties = rootTypeDefinition.properties || {};
        if (operationConfig.responseSchema) {
          rootTypeDefinition.properties[operationConfig.field] = {
            $ref: operationConfig.responseSchema,
          };
        } else if (operationConfig.responseSample) {
          const sample = await readFileOrUrlWithCache(operationConfig.responseSample, this.cache, {
            cwd: this.baseDir,
          }).catch(e => {
            throw new Error(`responseSample - ${e.message}`);
          });
          const generatedSchema = toJsonSchema(sample, {
            required: false,
            objects: {
              additionalProperties: false,
            },
            strings: {
              detectFormat: true,
            },
            arrays: {
              mode: 'first',
            },
          });
          generatedSchema.title = operationConfig.responseTypeName;
          rootTypeDefinition.properties[operationConfig.field] = generatedSchema;
        } else {
          const generatedSchema: JSONSchemaObject = {
            type: 'object',
          };
          generatedSchema.title = operationConfig.responseTypeName;
          rootTypeDefinition.properties[operationConfig.field] = generatedSchema;
        }

        const rootTypeInputPropertyName = operationConfig.type.toLowerCase() + 'Input';
        const rootTypeInputTypeDefinition = (finalJsonSchema.properties[rootTypeInputPropertyName] = finalJsonSchema
          .properties[rootTypeInputPropertyName] || {
          type: 'object',
          title: operationConfig.type + 'Input',
          properties: {},
        });
        if (operationConfig.requestSchema) {
          rootTypeInputTypeDefinition.properties[operationConfig.field] = {
            $ref: operationConfig.requestSchema,
          };
        } else if (operationConfig.requestSample) {
          const sample = await readFileOrUrlWithCache(operationConfig.requestSample, this.cache, {
            cwd: this.baseDir,
          }).catch(e => {
            throw new Error(`requestSample:${operationConfig.requestSample} cannot be read - ${e.message}`);
          });
          const generatedSchema = toJsonSchema(sample, {
            required: false,
            objects: {
              additionalProperties: false,
            },
            strings: {
              detectFormat: true,
            },
            arrays: {
              mode: 'first',
            },
          });
          generatedSchema.title = operationConfig.requestTypeName;
          rootTypeInputTypeDefinition.properties[operationConfig.field] = generatedSchema;
        }
      }
      this.logger.debug(`Dereferencing JSON Schema to resolve all $refs`);
      const fullyDeferencedSchema = await dereferenceJSONSchema(finalJsonSchema, this.cache, {
        cwd: this.baseDir,
      });
      this.logger.debug(`Healing JSON Schema`);
      const healedSchema = await healJSONSchema(fullyDeferencedSchema);
      this.logger.debug(`Building and mapping $refs back to JSON Schema`);
      const fullyReferencedSchema = await referenceJSONSchema(healedSchema as any);
      return fullyReferencedSchema;
    });
    this.logger.debug(`Derefering the bundled JSON Schema`);
    const fullyDeferencedSchema = await dereferenceJSONSchema(cachedJsonSchema, this.cache, {
      cwd: this.baseDir,
    });
    this.logger.debug(`Generating GraphQL Schema from the bundled JSON Schema`);
    const visitorResult = await getComposerFromJSONSchema(fullyDeferencedSchema as JSONSchema, this.logger);

    const schemaComposer = visitorResult.output as SchemaComposer;

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => schemaComposer.addDirective(directive));

    const contextVariables: string[] = [];

    const fetch = getCachedFetch(this.cache);

    this.logger.debug(`Attaching execution logic to the schema`);
    for (const operationConfig of this.config.operations) {
      operationConfig.method = operationConfig.method || (operationConfig.type === 'Mutation' ? 'POST' : 'GET');
      operationConfig.type = operationConfig.type || (operationConfig.method === 'GET' ? 'Query' : 'Mutation');
      const operationLogger = this.logger.child(`${operationConfig.type}.${operationConfig.field}`);
      const { args, contextVariables: specificContextVariables } = parseInterpolationStrings(
        [
          ...Object.values(this.config.operationHeaders || {}),
          ...Object.values(operationConfig.headers || {}),
          operationConfig.path,
          this.config.baseUrl,
        ],
        operationConfig.argTypeMap
      );

      contextVariables.push(...specificContextVariables);

      const rootTypeComposer = schemaComposer[operationConfig.type];

      rootTypeComposer.addFieldArgs(operationConfig.field, args);

      const field = rootTypeComposer.getField(operationConfig.field);
      if (!field.description) {
        field.description = operationConfig.path
          ? `${operationConfig.method} ${operationConfig.path}`
          : operationConfig.pubsubTopic
          ? `PubSub Topic: ${operationConfig.pubsubTopic}`
          : '';
      }

      if (operationConfig.pubsubTopic) {
        field.subscribe = (root, args, context, info) => {
          operationLogger.debug(`=> Subscribing to pubSubTopic: ${operationConfig.pubsubTopic}`);
          const interpolationData = { root, args, context, info };
          const pubsubTopic = stringInterpolator.parse(operationConfig.pubsubTopic, interpolationData);
          return this.pubsub.asyncIterator(pubsubTopic);
        };
        field.resolve = root => root;
      } else if (operationConfig.path) {
        const resolveDataByUnionInputType = (data: any, type: GraphQLInputType): any => {
          if (data) {
            if (isListType(type)) {
              return asArray(data).map(elem => resolveDataByUnionInputType(elem, type.ofType));
            }
            if (isNonNullType(type)) {
              return resolveDataByUnionInputType(data, type.ofType);
            }
            if (isInputObjectType(type)) {
              const fieldMap = type.getFields();
              const isOneOf = schemaComposer.getAnyTC(type).getDirectiveByName('oneOf');
              data = asArray(data)[0];
              for (const fieldName in data) {
                if (isOneOf) {
                  return data[fieldName];
                }
                data[fieldName] = resolveDataByUnionInputType(data[fieldName], fieldMap[fieldName].type);
              }
            }
          }
          return data;
        };
        field.resolve = async (root, args, context, info) => {
          operationLogger.debug(`=> Resolving`);
          const interpolationData = { root, args, context, info };
          const interpolatedBaseUrl = stringInterpolator.parse(this.config.baseUrl, interpolationData);
          const interpolatedPath = stringInterpolator.parse(operationConfig.path, interpolationData);
          const fullPath = urlJoin(interpolatedBaseUrl, interpolatedPath);
          const method = operationConfig.method;
          const headers = {
            ...this.config.operationHeaders,
            ...operationConfig?.headers,
          };
          for (const headerName in headers) {
            headers[headerName] = stringInterpolator.parse(headers[headerName], interpolationData);
          }
          const requestInit: RequestInit = {
            method,
            headers,
          };
          const urlObj = new URL(fullPath);
          // Resolve union input
          const input = resolveDataByUnionInputType(args.input, field.args?.input?.type?.getType());
          if (input) {
            switch (method) {
              case 'GET':
              case 'DELETE': {
                const newSearchParams = new URLSearchParams(input);
                newSearchParams.forEach((value, key) => {
                  urlObj.searchParams.set(key, value);
                });
                break;
              }
              case 'POST':
              case 'PUT':
              case 'PATCH': {
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
                throw new Error(`Unknown method ${operationConfig.method}`);
            }
          }
          operationLogger.debug(`=> Fetching ${urlObj.toString()}=>${inspect(requestInit, true, 2, true)}`);
          const response = await fetch(urlObj.toString(), requestInit);
          const responseText = await response.text();
          operationLogger.debug(
            `=> Fetched from ${urlObj.toString()}=>{
              body: ${responseText}
            }`
          );
          const returnType = field.type;
          let responseJson: any;
          try {
            responseJson = JSON.parse(responseText);
          } catch (e) {
            // The result might be defined as scalar
            if (isScalarType(returnType)) {
              operationLogger.debug(` => Return type is not a JSON so returning ${responseText}`);
              return responseText;
            }
            throw responseText;
          }
          const errorMessageTemplate = this.config.errorMessage || 'message';
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
          const errors = responseJson.errors || responseJson._errors;
          // Make sure the return type doesn't have a field `errors`
          // so ignore auto error detection if the return type has that field
          if (errors?.length) {
            if (!('getFields' in returnType && 'errors' in returnType.getFields())) {
              const aggregatedError = new AggregateError(
                errors.map(normalizeError),
                `${operationConfig.type}.${operationConfig.field} failed`
              );
              aggregatedError.stack = null;
              this.logger.debug(`=> Throwing the error ${inspect(aggregatedError, true, Infinity, true)}`);
              return aggregatedError;
            }
          }
          if (responseJson.error) {
            if (!('getFields' in returnType && 'error' in returnType.getFields())) {
              const normalizedError = normalizeError(responseJson.error);
              operationLogger.debug(`=> Throwing the error ${inspect(normalizedError, true, Infinity, true)}`);
              return normalizedError;
            }
          }
          operationLogger.debug(`=> Returning ${inspect(responseJson, true, Infinity, true)}`);
          return responseJson;
        };
      }
    }

    this.logger.debug(`Building the executable schema.`);
    const schema = schemaComposer.buildSchema();
    return {
      schema,
    };
  }
}
