import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { JSONSchemaVisitor, getFileName } from './json-schema-visitor';
import urlJoin from 'url-join';
import { readFileOrUrlWithCache, stringInterpolator, parseInterpolationStrings, isUrl } from '@graphql-mesh/utils';
import AggregateError from 'aggregate-error';
import { fetchache, Request, KeyValueCache } from 'fetchache';
import { JSONSchemaDefinition } from './json-schema-types';
import { SchemaComposer } from 'graphql-compose';
import { pathExists, writeJSON } from 'fs-extra';
import toJsonSchema from 'to-json-schema';
import { dirname } from 'path';

async function generateJsonSchemaFromSample({
  samplePath,
  schemaPath,
  cache,
}: {
  samplePath: string;
  schemaPath?: string;
  cache: KeyValueCache;
}) {
  if (!schemaPath || (!isUrl(schemaPath) && !(await pathExists(schemaPath)))) {
    const sample = await readFileOrUrlWithCache(samplePath, cache);
    const schema = toJsonSchema(sample, {
      required: false,
      objects: {
        additionalProperties: false,
      },
    });
    if (schemaPath) {
      await writeJSON(schemaPath, schema);
    }
    return schema;
  }
  return null;
}

const handler: MeshHandlerLibrary<YamlConfig.JsonSchemaHandler> = {
  async getMeshSource({ config, cache }) {
    const schemaComposer = new SchemaComposer();
    const inputSchemaVisitor = new JSONSchemaVisitor(schemaComposer, true);
    const outputSchemaVisitor = new JSONSchemaVisitor(schemaComposer, false);

    const contextVariables: string[] = [];

    await Promise.all(
      config.operations?.map(async operationConfig => {
        let [requestSchema, responseSchema] = await Promise.all([
          operationConfig.requestSample &&
            generateJsonSchemaFromSample({
              samplePath: operationConfig.requestSample,
              schemaPath: operationConfig.requestSchema,
              cache,
            }),
          operationConfig.responseSample &&
            generateJsonSchemaFromSample({
              samplePath: operationConfig.responseSample,
              schemaPath: operationConfig.responseSchema,
              cache,
            }),
        ]);
        [requestSchema, responseSchema] = await Promise.all([
          requestSchema ||
            (operationConfig.requestSchema &&
              readFileOrUrlWithCache(operationConfig.requestSchema, cache, {
                headers: config.schemaHeaders,
              })),
          responseSchema ||
            (operationConfig.responseSchema &&
              readFileOrUrlWithCache(operationConfig.responseSchema, cache, {
                headers: config.schemaHeaders,
              })),
        ]);
        operationConfig.method = operationConfig.method || (operationConfig.type === 'Mutation' ? 'POST' : 'GET');
        operationConfig.type = operationConfig.type || (operationConfig.method === 'GET' ? 'Query' : 'Mutation');
        const destination = operationConfig.type;
        const basedFileName = operationConfig.responseSchema || operationConfig.responseSample;
        const responseFileName = getFileName(basedFileName);
        const type = outputSchemaVisitor.visit(
          responseSchema as JSONSchemaDefinition,
          'Response',
          responseFileName,
          dirname(basedFileName)
        );

        const { args, contextVariables: specificContextVariables } = parseInterpolationStrings([
          ...Object.values(config.operationHeaders || {}),
          ...Object.values(operationConfig.headers || {}),
          operationConfig.path,
        ]);

        contextVariables.push(...specificContextVariables);

        if (requestSchema) {
          const basedFileName = operationConfig.requestSchema || operationConfig.requestSample;
          const requestFileName = getFileName(basedFileName);
          args.input = {
            type: inputSchemaVisitor.visit(
              requestSchema as JSONSchemaDefinition,
              'Request',
              requestFileName,
              isUrl(basedFileName) ? basedFileName : dirname(basedFileName)
            ) as any,
          };
        }

        schemaComposer[destination].addFields({
          [operationConfig.field]: {
            description:
              operationConfig.description ||
              responseSchema.description ||
              `${operationConfig.method} ${operationConfig.path}`,
            type,
            args,
            resolve: async (root, args, context, info) => {
              const interpolationData = { root, args, context, info };
              const interpolatedPath = stringInterpolator.parse(operationConfig.path, interpolationData);
              const fullPath = urlJoin(config.baseUrl, interpolatedPath);
              const method = operationConfig.method;
              const headers = {
                ...config.operationHeaders,
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
                  case 'PUT': {
                    requestInit.body = JSON.stringify(input);
                    break;
                  }
                  default:
                    throw new Error(`Unknown method ${operationConfig.method}`);
                }
              }
              const request = new Request(urlObj.toString(), requestInit);
              const response = await fetchache(request, cache);
              const responseText = await response.text();
              let responseJson: any;
              try {
                responseJson = JSON.parse(responseText);
              } catch (e) {
                throw responseText;
              }
              if (responseJson.errors) {
                throw new AggregateError(responseJson.errors);
              }
              if (responseJson._errors) {
                throw new AggregateError(responseJson._errors);
              }
              if (responseJson.error) {
                throw responseJson.error;
              }
              return responseJson;
            },
          },
        });
      }) || []
    );

    const schema = schemaComposer.buildSchema();

    return {
      schema,
      contextVariables,
    };
  },
};

export default handler;
