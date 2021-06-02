import { ProxyOptions, PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { GetMeshSourceOptions, KeyValueCache, MeshHandler, MeshPubSub, YamlConfig } from '@graphql-mesh/types';
import {
  jsonFlatStringify,
  parseInterpolationStrings,
  stringInterpolator,
  readFileOrUrlWithCache,
  getCachedFetch,
} from '@graphql-mesh/utils';
import { JSONSchema, JSONSchemaObject } from '@json-schema-tools/meta-schema';
import { InputTypeComposer, SchemaComposer } from 'graphql-compose';
import { diffSchemas } from 'json-schema-diff';
import toJsonSchema from 'to-json-schema';
import { bundleJSONSchema, dereferenceJSONSchema, getComposerFromJSONSchema } from './utils';
import { stringify as qsStringify } from 'qs';
import urlJoin from 'url-join';
import { specifiedDirectives } from 'graphql';
import AggregateError from '@ardatan/aggregate-error';
import $RefParser from '@apidevtools/json-schema-ref-parser';

const JsonSchemaWithDiff: ProxyOptions<JSONSchema> = {
  ...PredefinedProxyOptions.JsonWithoutValidation,
  validate: async (oldBundledJsonSchema, newBundledJsonSchema) => {
    const [oldJsonSchema, newJsonSchema] = await Promise.all([
      dereferenceJSONSchema(oldBundledJsonSchema as $RefParser.JSONSchema),
      dereferenceJSONSchema(newBundledJsonSchema as $RefParser.JSONSchema),
    ]);
    const result = await diffSchemas({
      sourceSchema: oldJsonSchema as any,
      destinationSchema: newJsonSchema as any,
    });
    if (result.removalsFound) {
      throw new Error(`Breaking changes found in the new schema. ${JSON.stringify(result.removedJsonSchema)}`);
    }
  },
};

export default class JsonSchemaHandler implements MeshHandler {
  private config: YamlConfig.JsonSchemaHandler;
  private baseDir: string;
  public cache: KeyValueCache<any>;
  public pubsub: MeshPubSub;
  public jsonSchema: StoreProxy<JSONSchema>;

  constructor({ config, baseDir, cache, pubsub, store }: GetMeshSourceOptions<YamlConfig.JsonSchemaHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.pubsub = pubsub;
    this.jsonSchema = store.proxy('jsonSchema.json', JsonSchemaWithDiff);
  }

  async getMeshSource() {
    const bundledJsonSchema = await this.jsonSchema.getWithSet(async () => {
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
      return bundleJSONSchema(finalJsonSchema, this.cache, {
        cwd: this.baseDir,
      });
    });
    const inputJsonSchema = await dereferenceJSONSchema(bundledJsonSchema as $RefParser.JSONSchema);
    const visitorResult = getComposerFromJSONSchema(inputJsonSchema);

    const schemaComposer = visitorResult.output as SchemaComposer;

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => schemaComposer.addDirective(directive));

    const contextVariables: string[] = [];

    const fetch = getCachedFetch(this.cache);

    for (const operationConfig of this.config.operations) {
      operationConfig.method = operationConfig.method || (operationConfig.type === 'Mutation' ? 'POST' : 'GET');
      operationConfig.type = operationConfig.type || (operationConfig.method === 'GET' ? 'Query' : 'Mutation');
      const { args, contextVariables: specificContextVariables } = parseInterpolationStrings(
        [
          ...Object.values(this.config.operationHeaders || {}),
          ...Object.values(operationConfig.headers || {}),
          operationConfig.path,
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
          const interpolationData = { root, args, context, info };
          const pubsubTopic = stringInterpolator.parse(operationConfig.pubsubTopic, interpolationData);
          return this.pubsub.asyncIterator(pubsubTopic);
        };
        field.resolve = root => root;
      } else if (operationConfig.path) {
        field.resolve = async (root, args, context, info) => {
          const interpolationData = { root, args, context, info };
          const interpolatedPath = stringInterpolator.parse(operationConfig.path, interpolationData);
          const fullPath = urlJoin(this.config.baseUrl, interpolatedPath);
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
          const input = (field.args?.input?.type as InputTypeComposer)?.getDirectiveByName('oneOf')
            ? args.input && args.input[Object.keys(args.input)[0]]
            : args.input;
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
                const [, contentType] = Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type');
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
          const response = await fetch(urlObj.toString(), requestInit);
          const responseText = await response.text();
          let responseJson: any;
          try {
            responseJson = JSON.parse(responseText);
          } catch (e) {
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
          const returnType = field.type;
          if (errors?.length) {
            if ('getFields' in returnType && !('errors' in returnType.getFields())) {
              const aggregatedError = new AggregateError(errors.map(normalizeError));
              aggregatedError.stack = null;
              return aggregatedError;
            }
          }
          if (responseJson.error) {
            if ('getFields' in returnType && !('error' in returnType.getFields())) {
              const normalizedError = normalizeError(responseJson.error);
              return normalizedError;
            }
          }
          return responseJson;
        };
      }
    }

    const schema = schemaComposer.buildSchema();
    return {
      schema,
    };
  }
}
