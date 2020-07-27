import {
  readFileOrUrlWithCache,
  parseInterpolationStrings,
  getInterpolatedHeadersFactory,
  getInterpolatedStringFactory,
  getHeadersObject,
  ResolverDataBasedFactory,
  loadFromModuleExportExpression,
} from '@graphql-mesh/utils';
import { createGraphQLSchema } from './openapi-to-graphql';
import { Oas3 } from './openapi-to-graphql/types/oas3';
import { MeshHandlerLibrary, YamlConfig, ResolverData } from '@graphql-mesh/types';
import { fetchache, Request } from 'fetchache';

const handler: MeshHandlerLibrary<YamlConfig.OpenapiHandler> = {
  async getMeshSource({ config, cache }) {
    const path = config.source;
    const spec = await readFileOrUrlWithCache<Oas3>(path, cache, {
      headers: config.schemaHeaders,
    });

    let fetch: WindowOrWorkerGlobalScope['fetch'];
    if (config.customFetch) {
      switch (typeof config.customFetch) {
        case 'string':
          fetch = await loadFromModuleExportExpression(config.customFetch as any, 'default');
          break;
        case 'function':
          fetch = config.customFetch as any;
      }
    } else {
      fetch = (...args) => fetchache(args[0] instanceof Request ? args[0] : new Request(...args), cache);
    }

    const headersFactory = getInterpolatedHeadersFactory(config.operationHeaders);
    const queryStringFactoryMap = new Map<string, ResolverDataBasedFactory<string>>();
    for (const queryName in config.qs || {}) {
      queryStringFactoryMap.set(queryName, getInterpolatedStringFactory(config.qs[queryName]));
    }
    const searchParamsFactory = (resolverData: ResolverData, searchParams: URLSearchParams) => {
      for (const queryName in config.qs || {}) {
        searchParams.set(queryName, queryStringFactoryMap.get(queryName)(resolverData));
      }
      return searchParams;
    };

    const { schema } = await createGraphQLSchema(spec, {
      fetch,
      baseUrl: config.baseUrl,
      skipSchemaValidation: config.skipSchemaValidation,
      operationIdFieldNames: true,
      fillEmptyResponses: true,
      viewer: false,
      resolverMiddleware: (getResolverParams, originalFactory) => (root, args, context, info: any) => {
        const resolverData: ResolverData = { root, args, context, info };
        const resolverParams = getResolverParams();
        resolverParams.requestOptions = {
          headers: getHeadersObject(headersFactory(resolverData)),
        };
        const urlObj = new URL(resolverParams.baseUrl);
        searchParamsFactory(resolverData, urlObj.searchParams);
        return originalFactory(() => resolverParams)(root, args, context, info);
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
