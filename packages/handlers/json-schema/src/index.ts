import { MeshHandlerLibrary, YamlConfig, KeyValueCache } from '@graphql-mesh/types';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLFieldConfigMap,
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLBoolean,
  GraphQLFieldConfigArgumentMap,
  GraphQLID,
  GraphQLNonNull
} from 'graphql';
import {
  JSONSchemaVisitor,
  JSONSchemaVisitorCache
} from './json-schema-visitor';
import urlJoin from 'url-join';
import isUrl from 'is-url';
import Interpolator from 'string-interpolation';
import { join } from 'path';
import AggregateError from 'aggregate-error';
import { fetchache, Request } from 'fetchache';

async function loadJsonSchema(
  filePathOrUrl: string,
  config: YamlConfig.JsonSchemaHandler,
  cache: KeyValueCache,
) {
  if (isUrl(filePathOrUrl)) {
    const req = new Request(filePathOrUrl, {
      headers: {
        ...config?.schemaHeaders
      }
    });
    const res = await fetchache(req, cache);

    return res.json();
  } else {
    const m = await import(join(process.cwd(), filePathOrUrl));

    return 'default' in m ? m.default : m;
  }
}

async function loadFromModuleExportExpression(expression: string) {
  const [moduleName, exportName] = expression.split('#');
  const m = await import(moduleName);

  return m[exportName] || (m.default && m.default[exportName]);
}

declare global {
  interface ObjectConstructor {
    keys<T>(obj: T): Array<keyof T>;
  }
}

const handler: MeshHandlerLibrary<YamlConfig.JsonSchemaHandler> = {
  async getMeshSource({ config, cache }) {
    const interpolator = new Interpolator();
    const visitorCache = new JSONSchemaVisitorCache();
    await Promise.all(
      config.typeReferences?.map(typeReference =>
        Promise.all(
          Object.keys(typeReference).map(async key => {
            switch (key) {
              case 'sharedType':
                const sharedType = await loadFromModuleExportExpression(
                  typeReference.sharedType
                );
                visitorCache.sharedTypesByIdentifier.set(
                  typeReference.reference,
                  sharedType
                );
                break;
              case 'outputType':
                const outputType = await loadFromModuleExportExpression(
                  typeReference.outputType
                );
                visitorCache.outputSpecificTypesByIdentifier.set(
                  typeReference.reference,
                  outputType
                );
                break;
              case 'inputType':
                const inputType = await loadFromModuleExportExpression(
                  typeReference.inputType
                );
                visitorCache.inputSpecificTypesByIdentifier.set(
                  typeReference.reference,
                  inputType
                );
                break;
              case 'reference':
                break;
              default:
                throw new Error(`Unexpected type reference field: ${key}`);
            }
          })
        )
      ) || []
    );

    const queryFields: GraphQLFieldConfigMap<any, any> = {};
    const mutationFields: GraphQLFieldConfigMap<any, any> = {};
    const schemaVisitor = new JSONSchemaVisitor(visitorCache);

    const contextVariables: string[] = [];

    await Promise.all(
      config.operations?.map(async operationConfig => {
        const [requestSchema, responseSchema] = await Promise.all([
          operationConfig.requestSchema && loadJsonSchema(operationConfig.requestSchema, config, cache),
            loadJsonSchema(operationConfig.responseSchema, config, cache)
        ]);
        operationConfig.method =
          operationConfig.method ||
          (operationConfig.type === 'Mutation' ? 'POST' : 'GET');
        operationConfig.type =
          operationConfig.type ||
          (operationConfig.method === 'GET' ? 'Query' : 'Mutation');
        const destination =
          operationConfig.type === 'Query' ? queryFields : mutationFields;
        const type = schemaVisitor.visit(
          responseSchema,
          'Response',
          operationConfig.field,
          false
        ) as GraphQLOutputType;
        const args: GraphQLFieldConfigArgumentMap = {};

        const interpolationStrings = [
          ...(config.operationHeaders
            ? Object.keys(config.operationHeaders).map(
                headerName => config.operationHeaders![headerName]
              )
            : []),
          ...(operationConfig.headers
            ? Object.keys(operationConfig.headers).map(
                headerName => operationConfig.headers![headerName]
              )
            : []),
          operationConfig.path
        ];

        const interpolationKeys: string[] = interpolationStrings.reduce(
          (keys, str) => [
            ...keys,
            ...interpolator.parseRules(str).map((match: any) => match.key)
          ],
          [] as string[]
        );

        for (const interpolationKey of interpolationKeys) {
          const interpolationKeyParts = interpolationKey.split('.');
          const varName =
            interpolationKeyParts[interpolationKeyParts.length - 1];
          if (interpolationKeyParts[0] === 'args') {
            if (varName === 'input') {
              throw new Error(
                `Argument name cannot be 'input'. Invalid statement; '${interpolationKey}'`
              );
            }
            args[varName] = {
              type: new GraphQLNonNull(GraphQLID)
            };
          } else if (interpolationKeyParts[0] === 'context') {
            contextVariables.push(varName);
          }
        }

        if (requestSchema) {
          args.input = {
            type: schemaVisitor.visit(
              requestSchema,
              'Request',
              operationConfig.field,
              true
            ) as GraphQLInputType
          };
        }

        destination[operationConfig.field] = {
          description:
            operationConfig.description ||
            responseSchema.description ||
            `${operationConfig.method} ${operationConfig.path}`,
          type,
          args,
          resolve: async (root, args, context, info) => {
            const interpolationData = { root, args, context, info };
            const interpolatedPath = interpolator.parse(
              operationConfig.path,
              interpolationData
            );
            const fullPath = urlJoin(config.baseUrl, interpolatedPath);
            const method = operationConfig.method;
            const headers = {
              ...config.operationHeaders,
              ...operationConfig?.headers
            };
            for (const headerName in headers) {
              headers[headerName] = interpolator.parse(
                headers[headerName],
                interpolationData
              );
            }
            const requestInit: RequestInit = {
              method,
              headers
            };
            const urlObj = new URL(fullPath);
            const input = args.input;
            if (input) {
              switch (method) {
                case 'GET':
                case 'DELETE':
                  const newSearchParams = new URLSearchParams(input);
                  newSearchParams.forEach((value, key) => {
                    urlObj.searchParams.set(key, value);
                  });
                  break;
                case 'POST':
                case 'PUT':
                  requestInit.body = JSON.stringify(input);
                  break;
                default:
                  throw `Unknown method ${operationConfig.method}`;
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
          }
        };
      }) || []
    );

    const schema: GraphQLSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields:
          Object.keys(queryFields).length > 0
            ? queryFields
            : { ping: { type: GraphQLBoolean, resolve: () => true } }
      }),
      mutation:
        Object.keys(mutationFields).length > 0
          ? new GraphQLObjectType({
              name: 'Mutation',
              fields: mutationFields
            })
          : undefined
    });

    return {
      schema,
      contextVariables
    };
  }
};

export default handler;
