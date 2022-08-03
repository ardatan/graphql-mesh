import { readFileOrUrl } from '@graphql-mesh/utils';
import { asArray } from '@graphql-tools/utils';
import { createGraphQLSchema, GraphQLOperationType } from './openapi-to-graphql';
import { Oas3 } from './openapi-to-graphql/types/oas3';
import {
  MeshHandler,
  YamlConfig,
  GetMeshSourceOptions,
  MeshSource,
  MeshPubSub,
  Logger,
  ImportFn,
} from '@graphql-mesh/types';
import { OasTitlePathMethodObject } from './openapi-to-graphql/types/options';
import { GraphQLArgument, GraphQLID, GraphQLInputType } from 'graphql';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import openapiDiff from 'openapi-diff';
import { getValidOAS3 } from './openapi-to-graphql/oas_3_tools';
import { Oas2 } from './openapi-to-graphql/types/oas2';
import { path, process } from '@graphql-mesh/cross-helpers';
import {
  stringInterpolator,
  getInterpolatedHeadersFactory,
  ResolverDataBasedFactory,
  getInterpolatedStringFactory,
  ResolverData,
  parseInterpolationStrings,
} from '@graphql-mesh/string-interpolation';

export default class OpenAPIHandler implements MeshHandler {
  private config: YamlConfig.OpenapiHandler;
  private baseDir: string;
  private fetchFn: typeof fetch;
  private importFn: ImportFn;
  private pubsub: MeshPubSub;
  private oasSchema: StoreProxy<Oas3[]>;
  private logger: Logger;

  constructor({
    name,
    config,
    baseDir,
    fetchFn,
    importFn,
    pubsub,
    store,
    logger,
  }: GetMeshSourceOptions<YamlConfig.OpenapiHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.logger = logger;
    this.fetchFn = fetchFn;
    this.importFn = importFn;
    // TODO: This validation here should be more flexible, probably specific to OAS
    // Because we can handle json/swagger files, and also we might want to use this:
    // https://github.com/Azure/openapi-diff
    this.oasSchema = store.proxy<Oas3[]>('oas-schema', {
      ...PredefinedProxyOptions.JsonWithoutValidation,
      validate: async (oldOass, newOass) => {
        for (const index in oldOass) {
          const oldOas = oldOass[index];
          const newOas = newOass[index];
          const result = await openapiDiff.diffSpecs({
            sourceSpec: {
              content: JSON.stringify(oldOas),
              location: path.join(this.baseDir, `.mesh/sources/${name}/oas-schema.js`),
              format: 'openapi3',
            },
            destinationSpec: {
              content: JSON.stringify(newOas),
              location: config.source,
              format: 'openapi3',
            },
          });
          if (result.breakingDifferencesFound) {
            throw new Error('Breaking changes found!');
          }
        }
      },
    });
  }

  private getCachedSpec(): Promise<Oas3[]> {
    const { source: nonInterpolatedSource } = this.config;
    const source = stringInterpolator.parse(nonInterpolatedSource, {
      env: process.env,
    });
    const schemaHeadersFactory = getInterpolatedHeadersFactory(this.config.schemaHeaders);
    return this.oasSchema.getWithSet(async () => {
      let rawSpec: Oas3 | Oas2 | (Oas3 | Oas2)[];
      if (typeof source !== 'string') {
        rawSpec = source;
      } else {
        rawSpec = await readFileOrUrl(source, {
          cwd: this.baseDir,
          fallbackFormat: this.config.sourceFormat,
          headers: schemaHeadersFactory({
            env: process.env,
          }),
          importFn: this.importFn,
          fetch: this.fetchFn,
          logger: this.logger,
        });
      }
      return Promise.all(asArray(rawSpec).map(singleSpec => getValidOAS3(singleSpec)));
    });
  }

  async getMeshSource(): Promise<MeshSource> {
    const { addLimitArgument, baseUrl, genericPayloadArgName, operationHeaders, qs, selectQueryOrMutationField } =
      this.config;

    const spec = await this.getCachedSpec();

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
      fetch: this.fetchFn,
      baseUrl,
      operationIdFieldNames: this.config.operationIdFieldNames,
      fillEmptyResponses: true,
      includeHttpDetails: this.config.includeHttpDetails,
      provideErrorExtensions: this.config.provideErrorExtensions,
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
              return {
                ...acc,
                [curr.title]: {
                  ...acc[curr.title],
                  [curr.path]: {
                    ...((acc[curr.title] && acc[curr.title][curr.path]) || {}),
                    [curr.method]: operationType,
                  },
                },
              };
            }, {} as OasTitlePathMethodObject<GraphQLOperationType>),
      addLimitArgument: addLimitArgument === undefined ? true : addLimitArgument,
      sendOAuthTokenInQuery: true,
      viewer: false,
      equivalentToMessages: true,
      pubsub: this.pubsub,
      logger: this.logger,
      resolverMiddleware: (getResolverParams, originalFactory) => (root, args, context, info: any) => {
        const resolverData: ResolverData = { root, args, context, info, env: process.env };
        const resolverParams = getResolverParams();
        resolverParams.requestOptions = {
          headers: headersFactory(resolverData),
        };
        resolverParams.qs = qs;

        /* FIXME: baseUrl is coming from Fastify Request
        if (context?.baseUrl) {
          resolverParams.baseUrl = context.baseUrl;
        }
        */

        if (baseUrl) {
          resolverParams.baseUrl = stringInterpolator.parse(baseUrl, resolverData);
        }

        if (resolverParams.baseUrl) {
          const urlObj = new URL(resolverParams.baseUrl);
          searchParamsFactory(resolverData, urlObj.searchParams);
        } else {
          this.logger.debug(
            () =>
              `Warning: There is no 'baseUrl' defined for this OpenAPI definition. We recommend you to define one manually!`
          );
        }

        if (context?.fetch) {
          resolverParams.fetch = context.fetch;
        }

        if (context?.qs) {
          resolverParams.qs = context.qs;
        }

        return originalFactory(() => resolverParams, this.logger)(root, args, context, info);
      },
      allowUndefinedSchemaRefTags: this.config.allowUndefinedSchemaRefTags,
      defaultUndefinedSchemaType: this.config.defaultUndefinedSchemaType,
    });

    const { args, contextVariables } = parseInterpolationStrings(Object.values(operationHeaders || {}));

    const rootFields = [
      ...Object.values(schema.getQueryType()?.getFields() || {}),
      ...Object.values(schema.getMutationType()?.getFields() || {}),
      ...Object.values(schema.getSubscriptionType()?.getFields() || {}),
    ];

    await Promise.all(
      rootFields.map(rootField =>
        Promise.all(
          Object.entries(args).map(async ([argName, { type }]) =>
            (rootField?.args as GraphQLArgument[]).push({
              name: argName,
              description: undefined,
              defaultValue: undefined,
              extensions: undefined,
              astNode: undefined,
              deprecationReason: undefined,
              type: (typeof type === 'string' ? (schema.getType(type) as GraphQLInputType) : type) || GraphQLID,
            })
          )
        )
      )
    );

    contextVariables.fetch = 'typeof fetch';

    return {
      schema,
      contextVariables,
    };
  }
}
