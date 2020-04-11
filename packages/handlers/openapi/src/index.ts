import {
  readFileOrUrlWithCache,
  getInterpolatedHeadersFactory,
  ResolverData,
  parseInterpolationStrings,
  getHeadersObject,
} from '@graphql-mesh/utils';
import { createGraphQLSchema } from '@ardatan/openapi-to-graphql';
import { Oas3 } from '@ardatan/openapi-to-graphql/lib/types/oas3';
import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { fetchache, Request } from 'fetchache';

const handler: MeshHandlerLibrary<YamlConfig.OpenapiHandler> = {
  async getMeshSource({ config, cache }) {
    const path = config.source;
    const spec = await readFileOrUrlWithCache<Oas3>(path, cache, {
      headers: config.schemaHeaders,
    });

    const fetch: WindowOrWorkerGlobalScope['fetch'] = (...args) =>
      fetchache(args[0] instanceof Request ? args[0] : new Request(...args), cache);

    const headersFactory = getInterpolatedHeadersFactory(config.operationHeaders);

    const { schema } = await createGraphQLSchema(spec, {
      fetch,
      baseUrl: config.baseUrl,
      headers: config.operationHeaders,
      skipSchemaValidation: config.skipSchemaValidation,
      operationIdFieldNames: true,
      fillEmptyResponses: true,
      viewer: false,
      resolverMiddleware: (resolverFactoryParams, originalFactory) => (root, args, context, info: any) => {
        const resolverData: ResolverData = { root, args, context, info };
        const headers = headersFactory(resolverData);
        resolverFactoryParams.data.options.headers = {
          ...resolverFactoryParams.data.options.headers,
          ...getHeadersObject(headers),
        };
        return originalFactory(resolverFactoryParams)(root, args, context, info);
      },
    });

    const { args, contextVariables } = parseInterpolationStrings(Object.values(config.operationHeaders || {}));

    const rootFields = [
      ...Object.values(schema.getQueryType()?.getFields() || {}),
      ...Object.values(schema.getMutationType()?.getFields() || {}),
      ...Object.values(schema.getSubscriptionType()?.getFields() || {}),
    ];

    for (const rootField of rootFields) {
      for (const argName in args) {
        const argConfig = args[argName];
        rootField.args.push({
          name: argName,
          description: undefined,
          defaultValue: undefined,
          extensions: undefined,
          astNode: undefined,
          ...argConfig,
        });
      }
    }

    return {
      schema,
      contextVariables,
    };
  },
};

export default handler;
