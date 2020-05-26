import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { JSONSchemaVisitor } from './json-schema-visitor';
import urlJoin from 'url-join';
import { readFileOrUrlWithCache, stringInterpolator, parseInterpolationStrings } from '@graphql-mesh/utils';
import AggregateError from 'aggregate-error';
import { fetchache, Request } from 'fetchache';
import { JSONSchemaDefinition } from './json-schema-types';
import { SchemaComposer } from 'graphql-compose';

const getFileName = (filePath: string) => {
  const arr = filePath
    .split('/')
    .map(part => part.split('\\'))
    .flat();
  return arr.pop().split('.').join('_');
};

const handler: MeshHandlerLibrary<YamlConfig.JsonSchemaHandler> = {
  async getMeshSource({ config, cache }) {
    const schemaComposer = new SchemaComposer();
    const inputSchemaVisitor = new JSONSchemaVisitor(schemaComposer, true);
    const outputSchemaVisitor = new JSONSchemaVisitor(schemaComposer, false);

    const contextVariables: string[] = [];

    await Promise.all(
      config.operations?.map(async operationConfig => {
        const [requestSchema, responseSchema] = await Promise.all([
          operationConfig.requestSchema
            ? readFileOrUrlWithCache<JSONSchemaDefinition>(operationConfig.requestSchema, cache, {
                headers: config.schemaHeaders,
              })
            : undefined,
          readFileOrUrlWithCache<JSONSchemaDefinition>(operationConfig.responseSchema, cache, {
            headers: config.schemaHeaders,
          }),
        ]);
        operationConfig.method = operationConfig.method || (operationConfig.type === 'Mutation' ? 'POST' : 'GET');
        operationConfig.type = operationConfig.type || (operationConfig.method === 'GET' ? 'Query' : 'Mutation');
        const destination = operationConfig.type;
        const responseFileName = getFileName(operationConfig.responseSchema);
        const type = outputSchemaVisitor.visit(responseSchema, 'Response', responseFileName);

        const { args, contextVariables: specificContextVariables } = parseInterpolationStrings([
          ...Object.values(config.operationHeaders || {}),
          ...Object.values(operationConfig.headers || {}),
          operationConfig.path,
        ]);

        contextVariables.push(...specificContextVariables);

        if (requestSchema) {
          const requestFileName = getFileName(operationConfig.requestSchema);
          args.input = {
            type: inputSchemaVisitor.visit(requestSchema, 'Request', requestFileName) as any,
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
