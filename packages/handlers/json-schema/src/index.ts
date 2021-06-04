import { GetMeshSourceOptions, MeshHandler, MeshPubSub, YamlConfig, KeyValueCache } from '@graphql-mesh/types';
import { JSONSchemaVisitor, getFileName } from './json-schema-visitor';
import urlJoin from 'url-join';
import {
  readFileOrUrlWithCache,
  stringInterpolator,
  parseInterpolationStrings,
  isUrl,
  pathExists,
  writeJSON,
  jsonFlatStringify,
  getCachedFetch,
} from '@graphql-mesh/utils';
import AggregateError from '@ardatan/aggregate-error';
import { JSONSchemaDefinition } from './json-schema-types';
import { ObjectTypeComposerFieldConfigDefinition, SchemaComposer } from 'graphql-compose';
import toJsonSchema from 'to-json-schema';
import {
  GraphQLJSON,
  GraphQLVoid,
  GraphQLDate,
  GraphQLDateTime,
  GraphQLTime,
  GraphQLTimestamp,
  GraphQLPhoneNumber,
  GraphQLURL,
  GraphQLEmailAddress,
  GraphQLIPv4,
  GraphQLIPv6,
} from 'graphql-scalars';
import { promises as fsPromises } from 'fs';
import { specifiedDirectives } from 'graphql';
import { stringify as qsStringify } from 'qs';

const { stat } = fsPromises || {};

export interface JsonSchemaIntrospectionCache {
  externalFileCache: Record<string, any>;
  schemaCache: Record<string, any>;
}

export default class JsonSchemaHandler implements MeshHandler {
  public config: YamlConfig.JsonSchemaHandler;
  private baseDir: string;
  public cache: KeyValueCache<any>;
  public pubsub: MeshPubSub;
  public introspectionCache: JsonSchemaIntrospectionCache;

  constructor({
    config,
    baseDir,
    cache,
    pubsub,
    introspectionCache,
  }: GetMeshSourceOptions<YamlConfig.JsonSchemaHandler, JsonSchemaIntrospectionCache>) {
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.pubsub = pubsub;
    this.introspectionCache = introspectionCache || {
      externalFileCache: null,
      schemaCache: null,
    };
  }

  public schemaComposer = new SchemaComposer();

  async getMeshSource() {
    this.config.disableTimestampScalar =
      typeof this.config.disableTimestampScalar !== 'undefined' ? this.config.disableTimestampScalar : true;
    const fetch = getCachedFetch(this.cache);
    const schemaComposer = this.schemaComposer;
    schemaComposer.add(GraphQLJSON);
    schemaComposer.add(GraphQLVoid);
    schemaComposer.add(GraphQLDateTime);
    schemaComposer.add(GraphQLDate);
    schemaComposer.add(GraphQLTime);
    if (!this.config.disableTimestampScalar) {
      schemaComposer.add(GraphQLTimestamp);
    }
    schemaComposer.add(GraphQLPhoneNumber);
    schemaComposer.add(GraphQLURL);
    schemaComposer.add(GraphQLEmailAddress);
    schemaComposer.add(GraphQLIPv4);
    schemaComposer.add(GraphQLIPv6);

    this.introspectionCache.schemaCache = this.introspectionCache.schemaCache || {};
    this.introspectionCache.externalFileCache = this.introspectionCache.externalFileCache || {};
    const externalFileCache = this.introspectionCache.externalFileCache;
    const inputSchemaVisitor = new JSONSchemaVisitor(
      schemaComposer,
      true,
      externalFileCache,
      this.config.disableTimestampScalar
    );
    const outputSchemaVisitor = new JSONSchemaVisitor(
      schemaComposer,
      false,
      externalFileCache,
      this.config.disableTimestampScalar
    );

    const contextVariables: string[] = [];

    const typeNamedOperations: YamlConfig.JsonSchemaOperation[] = [];
    const unnamedOperations: YamlConfig.JsonSchemaOperation[] = [];

    if (this.config.baseSchema) {
      const basedFilePath = this.config.baseSchema;
      const baseSchema = await readFileOrUrlWithCache(basedFilePath, this.cache, {
        cwd: this.baseDir,
        headers: this.config.schemaHeaders,
      });
      externalFileCache[basedFilePath] = baseSchema;
      const baseFileName = getFileName(basedFilePath);
      outputSchemaVisitor.visit({
        def: baseSchema as JSONSchemaDefinition,
        propertyName: 'Base',
        prefix: baseFileName,
        cwd: basedFilePath,
      });
    }

    this.config?.operations?.forEach(async operationConfig => {
      if (operationConfig.responseTypeName) {
        typeNamedOperations.push(operationConfig);
      } else {
        unnamedOperations.push(operationConfig);
      }
    });

    const handleOperations = async (operationConfig: YamlConfig.JsonSchemaOperation) => {
      let responseTypeName = operationConfig.responseTypeName;

      let [requestSchema, responseSchema] = await Promise.all([
        operationConfig.requestSample &&
          this.generateJsonSchemaFromSample({
            samplePath: operationConfig.requestSample,
            schemaPath: operationConfig.requestSchema,
          }),
        operationConfig.responseSample &&
          this.generateJsonSchemaFromSample({
            samplePath: operationConfig.responseSample,
            schemaPath: operationConfig.responseSchema,
          }),
      ]);
      [requestSchema, responseSchema] = await Promise.all([
        requestSchema ||
          (operationConfig.requestSchema &&
            readFileOrUrlWithCache(operationConfig.requestSchema, this.cache, {
              cwd: this.baseDir,
              headers: this.config.schemaHeaders,
            })),
        responseSchema ||
          (operationConfig.responseSchema &&
            readFileOrUrlWithCache(operationConfig.responseSchema, this.cache, {
              cwd: this.baseDir,
              headers: this.config.schemaHeaders,
            })),
      ]);
      operationConfig.method = operationConfig.method || (operationConfig.type === 'Mutation' ? 'POST' : 'GET');
      operationConfig.type = operationConfig.type || (operationConfig.method === 'GET' ? 'Query' : 'Mutation');
      const basedFilePath = operationConfig.responseSchema || operationConfig.responseSample;
      if (basedFilePath) {
        externalFileCache[basedFilePath] = responseSchema;
        const responseFileName = getFileName(basedFilePath);
        responseTypeName = outputSchemaVisitor.visit({
          def: responseSchema as JSONSchemaDefinition,
          propertyName: 'Response',
          prefix: responseFileName,
          cwd: basedFilePath,
          typeName: operationConfig.responseTypeName,
        });
      }

      const { args, contextVariables: specificContextVariables } = parseInterpolationStrings(
        [
          ...Object.values(this.config.operationHeaders || {}),
          ...Object.values(operationConfig.headers || {}),
          operationConfig.path,
        ],
        operationConfig.argTypeMap
      );

      contextVariables.push(...specificContextVariables);

      let requestTypeName = operationConfig.requestTypeName;

      if (requestSchema) {
        const basedFilePath = operationConfig.requestSchema || operationConfig.requestSample;
        externalFileCache[basedFilePath] = requestSchema;
        const requestFileName = getFileName(basedFilePath);
        requestTypeName = inputSchemaVisitor.visit({
          def: requestSchema as JSONSchemaDefinition,
          propertyName: 'Request',
          prefix: requestFileName,
          cwd: basedFilePath,
          typeName: operationConfig.requestTypeName,
        });
      }

      if (requestTypeName) {
        args.input = {
          type: requestTypeName,
          description: requestSchema?.description,
        } as any;
      }

      const destination = operationConfig.type;
      const fieldConfig: ObjectTypeComposerFieldConfigDefinition<any, any> = {
        description:
          operationConfig.description || responseSchema?.description || operationConfig.path
            ? `${operationConfig.method} ${operationConfig.path}`
            : operationConfig.pubsubTopic
            ? `PubSub Topic: ${operationConfig.pubsubTopic}`
            : '',
        type: responseTypeName,
        args,
      };
      if (operationConfig.pubsubTopic) {
        fieldConfig.subscribe = (root, args, context, info) => {
          const interpolationData = { root, args, context, info };
          const pubsubTopic = stringInterpolator.parse(operationConfig.pubsubTopic, interpolationData);
          return this.pubsub.asyncIterator(pubsubTopic);
        };
        fieldConfig.resolve = root => root;
      } else if (operationConfig.path) {
        fieldConfig.resolve = async (root, args, context, info) => {
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
          const input = args.input;
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
          const errorMessageField = this.config.errorMessageField || 'message';
          function normalizeError(error: any): Error {
            if (typeof error === 'object' && errorMessageField in error) {
              const errorObj = new Error(error[errorMessageField]);
              Object.assign(errorObj, error);
              return errorObj;
            } else {
              return error;
            }
          }
          const errors = responseJson.errors || responseJson._errors;
          const returnType = schema.getType(responseTypeName);
          if (errors?.length) {
            if ('getFields' in returnType && !('errors' in returnType.getFields())) {
              throw new AggregateError(errors.map(normalizeError));
            }
          }
          if (responseJson.error) {
            if ('getFields' in returnType && !('error' in returnType.getFields())) {
              throw normalizeError(responseJson.error);
            }
          }
          return responseJson;
        };
      }
      schemaComposer[destination].addFields({
        [operationConfig.field]: fieldConfig,
      });
    };

    await Promise.all(typeNamedOperations.map(handleOperations));
    await Promise.all(unnamedOperations.map(handleOperations));

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => schemaComposer.addDirective(directive));

    const schema = schemaComposer.buildSchema();
    return {
      schema,
      contextVariables,
    };
  }

  private async isGeneratedJSONSchemaValid({ samplePath, schemaPath }: { samplePath: string; schemaPath?: string }) {
    if (schemaPath || (!isUrl(schemaPath) && (await pathExists(schemaPath)))) {
      const [schemaFileStat, sampleFileStat] = await Promise.all([stat(schemaPath), stat(samplePath)]);
      if (schemaFileStat.mtime > sampleFileStat.mtime) {
        return true;
      }
    }
    return false;
  }

  private async generateJsonSchemaFromSample({ samplePath, schemaPath }: { samplePath: string; schemaPath?: string }) {
    if (!(await this.isGeneratedJSONSchemaValid({ samplePath, schemaPath }))) {
      if (samplePath in this.introspectionCache.schemaCache) {
        return this.introspectionCache.schemaCache[samplePath];
      }
      const sample = await readFileOrUrlWithCache(samplePath, this.cache, { cwd: this.baseDir });
      const schema = toJsonSchema(sample, {
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
      if (schemaPath) {
        writeJSON(schemaPath, schema).catch(e => `JSON Schema for ${samplePath} couldn't get cached: ${e.message}`);
      } else {
        this.introspectionCache.schemaCache[samplePath] = schema;
      }
      return schema;
    }
    return null;
  }
}
