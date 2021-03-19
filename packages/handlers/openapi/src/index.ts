import {
  readFileOrUrlWithCache,
  parseInterpolationStrings,
  getInterpolatedHeadersFactory,
  getInterpolatedStringFactory,
  getHeadersObject,
  ResolverDataBasedFactory,
  loadFromModuleExportExpression,
} from '@graphql-mesh/utils';
import { createGraphQLSchema, GraphQLOperationType } from './openapi-to-graphql';
import { Oas3 } from './openapi-to-graphql/types/oas3';
import {
  MeshHandler,
  YamlConfig,
  ResolverData,
  GetMeshSourceOptions,
  MeshSource,
  KeyValueCache,
  MeshPubSub,
} from '@graphql-mesh/types';
import { fetchache, Request } from 'fetchache';
import { set } from 'lodash';
import { OasTitlePathMethodObject } from './openapi-to-graphql/types/options';

export default class OpenAPIHandler implements MeshHandler {
  private config: YamlConfig.OpenapiHandler;
  private baseDir: string;
  private cache: KeyValueCache;
  private pubsub: MeshPubSub;

  constructor({ config, baseDir, cache, pubsub }: GetMeshSourceOptions<YamlConfig.OpenapiHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.pubsub = pubsub;
  }

  async getMeshSource(): Promise<MeshSource> {
    const {
      addLimitArgument,
      baseUrl,
      customFetch,
      genericPayloadArgName,
      operationHeaders,
      qs,
      selectQueryOrMutationField,
      source,
    } = this.config;
    const spec = typeof source !== 'string' ? source : await readFileOrUrlWithCache<Oas3>(source, this.cache, {
      cwd: this.baseDir,
      fallbackFormat: this.config.sourceFormat,
      headers: this.config.schemaHeaders,
    });

    let fetch: WindowOrWorkerGlobalScope['fetch'];
    if (customFetch) {
      fetch = await loadFromModuleExportExpression(customFetch, { defaultExportName: 'default', cwd: this.baseDir });
    } else {
      fetch = (...args) => fetchache(args[0] instanceof Request ? args[0] : new Request(...args), this.cache);
    }

    const baseUrlFactory = getInterpolatedStringFactory(baseUrl);

    const headersFactory = getInterpolatedHeadersFactory(operationHeaders);
    const queryStringFactoryMap = new Map<string, ResolverDataBasedFactory<string>>();
    for (const queryName in qs || {}) {
      queryStringFactoryMap.set(queryName, getInterpolatedStringFactory(qs[queryName]));
    }
    const searchParamsFactory = (resolverData: ResolverData, searchParams: URLSearchParams) => {
      for (const queryName in qs || {}) {
        searchParams.set(queryName, queryStringFactoryMap.get(queryName)(resolverData));
      }
      return searchParams;
    };

    const { schema } = await createGraphQLSchema(spec, {
      fetch,
      baseUrl: baseUrl,
      operationIdFieldNames: true,
      fillEmptyResponses: true,
      includeHttpDetails: this.config.includeHttpDetails,
      genericPayloadArgName: genericPayloadArgName === undefined ? false : genericPayloadArgName,
      selectQueryOrMutationField:
        selectQueryOrMutationField === undefined
          ? {}
          : selectQueryOrMutationField.reduce((acc, curr) => {
              let operationType: GraphQLOperationType;
              switch (curr.type) {
                case 'Query':
                  operationType = GraphQLOperationType.Query;
                  break;
                case 'Mutation':
                  operationType = GraphQLOperationType.Mutation;
                  break;
              }
              set(acc, `${curr.title}.${curr.path}.${curr.method}`, operationType);
              return acc;
            }, {} as OasTitlePathMethodObject<GraphQLOperationType>),
      addLimitArgument: addLimitArgument === undefined ? true : addLimitArgument,
      sendOAuthTokenInQuery: true,
      viewer: false,
      equivalentToMessages: true,
      pubsub: this.pubsub,
      resolverMiddleware: (getResolverParams, originalFactory) => (root, args, context, info: any) => {
        const resolverData: ResolverData = { root, args, context, info };
        const resolverParams = getResolverParams();
        resolverParams.requestOptions = {
          headers: getHeadersObject(headersFactory(resolverData)),
        };
        resolverParams.qs = qs;

        /* FIXME: baseUrl is coming from Fastify Request
        if (context?.baseUrl) {
          resolverParams.baseUrl = context.baseUrl;
        }
        */

        if (!resolverParams.baseUrl && baseUrl) {
          resolverParams.baseUrl = baseUrlFactory(resolverData);
        }

        if (resolverParams.baseUrl) {
          const urlObj = new URL(resolverParams.baseUrl);
          searchParamsFactory(resolverData, urlObj.searchParams);
        } /* else {
          console.warn(
            `There is no 'baseUrl' defined for this OpenAPI definition. We recommend you to define one manually!`
          );
        } */

        if (context?.fetch) {
          resolverParams.fetch = context.fetch;
        }

        if (context?.qs) {
          resolverParams.qs = context.qs;
        }

        return originalFactory(() => resolverParams)(root, args, context, info);
      },
    });

    const { args, contextVariables } = parseInterpolationStrings(Object.values(operationHeaders || {}));

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

    contextVariables.push('fetch' /*, 'baseUrl' */);

    return {
      schema,
      contextVariables,
    };
  }
}
