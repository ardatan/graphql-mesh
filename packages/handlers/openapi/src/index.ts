import { createGraphQLSchema } from './openapi-to-graphql';
import { Oas3 } from './openapi-to-graphql/types/oas3';
import {
  MeshHandler,
  YamlConfig,
  ResolverData,
  MeshSource,
  parseInterpolationStrings,
  getInterpolatedHeadersFactory,
  getInterpolatedStringFactory,
  getHeadersObject,
  ResolverDataBasedFactory,
} from '@graphql-mesh/utils';

export default class OpenAPIHandler extends MeshHandler<YamlConfig.OpenapiHandler> {
  async getMeshSource(): Promise<MeshSource> {
    const path = this.config.source;
    const spec = await this.readFileOrUrl<Oas3>(path, {
      headers: this.config.schemaHeaders,
      fallbackFormat: this.config.sourceFormat,
    });

    const baseUrlFactory = getInterpolatedStringFactory(this.config.baseUrl);

    const headersFactory = getInterpolatedHeadersFactory(this.config.operationHeaders);
    const queryStringFactoryMap = new Map<string, ResolverDataBasedFactory<string>>();
    for (const queryName in this.config.qs || {}) {
      queryStringFactoryMap.set(queryName, getInterpolatedStringFactory(this.config.qs[queryName]));
    }
    const searchParamsFactory = (resolverData: ResolverData, searchParams: URLSearchParams) => {
      for (const queryName in this.config.qs || {}) {
        searchParams.set(queryName, queryStringFactoryMap.get(queryName)(resolverData));
      }
      return searchParams;
    };

    const { schema } = await createGraphQLSchema(spec, {
      fetch: this.handlerContext.fetch,
      baseUrl: this.config.baseUrl,
      operationIdFieldNames: true,
      fillEmptyResponses: true,
      includeHttpDetails: this.config.includeHttpDetails,
      addLimitArgument: this.config.addLimitArgument === undefined ? true : this.config.addLimitArgument,
      sendOAuthTokenInQuery: true,
      viewer: false,
      equivalentToMessages: true,
      pubsub: this.handlerContext.pubsub,
      resolverMiddleware: (getResolverParams, originalFactory) => (root, args, context, info: any) => {
        const resolverData: ResolverData = { root, args, context, info };
        const resolverParams = getResolverParams();
        resolverParams.requestOptions = {
          headers: getHeadersObject(headersFactory(resolverData)),
        };

        if (context?.baseUrl) {
          resolverParams.baseUrl = context.baseUrl;
        }

        if (!resolverParams.baseUrl && this.config.baseUrl) {
          resolverParams.baseUrl = baseUrlFactory(resolverData);
        }

        if (resolverParams.baseUrl) {
          const urlObj = new URL(resolverParams.baseUrl);
          searchParamsFactory(resolverData, urlObj.searchParams);
        } else {
          console.warn(
            `There is no 'baseUrl' defined for this OpenAPI definition. We recommend you to define one manually!`
          );
        }

        if (context?.fetch) {
          resolverParams.fetch = context.fetch;
        }

        if (context?.qs) {
          resolverParams.qs = context.qs;
        }

        return originalFactory(() => resolverParams)(root, args, context, info);
      },
    });

    const { args, contextVariables } = parseInterpolationStrings(Object.values(this.config.operationHeaders || {}));

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
          deprecationReason: undefined,
          ...argConfig,
        });
      }
    }

    contextVariables.push('fetch', 'baseUrl');

    return {
      schema,
      contextVariables,
    };
  }
}
