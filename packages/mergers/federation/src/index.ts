import {
  KeyValueCache,
  Logger,
  MeshMerger,
  MeshMergerContext,
  MeshMergerOptions,
  MeshPubSub,
  RawSourceOutput,
} from '@graphql-mesh/types';
import { GraphQLSchema, extendSchema, DocumentNode, parse, execute, ExecutionResult } from 'graphql';
import { wrapSchema } from '@graphql-tools/wrap';
import { ApolloGateway, LocalGraphQLDataSource, SERVICE_DEFINITION_QUERY } from '@apollo/gateway';
import { addResolversToSchema } from '@graphql-tools/schema';
import { printWithCache } from '@graphql-mesh/utils';
import { AggregateError, asArray, ExecutionRequest, printSchemaWithDirectives } from '@graphql-tools/utils';
import { MeshStore, PredefinedProxyOptions } from '@graphql-mesh/store';
import { process } from '@graphql-mesh/cross-helpers';

export default class FederationMerger implements MeshMerger {
  name = 'federation';
  private logger: Logger;
  private cache: KeyValueCache;
  private pubsub: MeshPubSub;
  private store: MeshStore;
  constructor(options: MeshMergerOptions) {
    this.logger = options.logger;
    this.cache = options.cache;
    this.pubsub = options.pubsub;
    this.store = options.store;
  }

  async getUnifiedSchema({ rawSources, typeDefs, resolvers, transforms }: MeshMergerContext) {
    this.logger.debug(`Creating localServiceList for gateway`);
    const rawSourceMap = new Map<string, RawSourceOutput>();
    const localServiceList: { name: string; typeDefs: DocumentNode }[] = [];
    const sourceMap = new Map<RawSourceOutput, GraphQLSchema>();
    await Promise.all(
      rawSources.map(async rawSource => {
        const transformedSchema = wrapSchema(rawSource as any);
        rawSourceMap.set(rawSource.name, rawSource);
        sourceMap.set(rawSource, transformedSchema);
        const sdl = await this.store
          .proxy(`${rawSource.name}_sdl`, PredefinedProxyOptions.StringWithoutValidation)
          .getWithSet(async () => {
            this.logger.debug(`Fetching Apollo Federated Service SDL for ${rawSource.name}`);
            const sdlQueryResult: any = await execute({
              schema: transformedSchema,
              document: parse(SERVICE_DEFINITION_QUERY),
            });
            if (sdlQueryResult.errors?.length) {
              throw new AggregateError(sdlQueryResult.errors, `Failed on fetching Federated SDL for ${rawSource.name}`);
            }
            return sdlQueryResult.data._service.sdl;
          });
        localServiceList.push({
          name: rawSource.name,
          typeDefs: parse(sdl),
        });
      })
    );
    this.logger.debug(`Creating ApolloGateway`);
    const gateway = new ApolloGateway({
      localServiceList,
      buildService: ({ name }) => {
        this.logger.debug(`Building federation service: ${name}`);
        const rawSource = rawSourceMap.get(name);
        const transformedSchema = sourceMap.get(rawSource);
        return new LocalGraphQLDataSource(transformedSchema);
      },
      logger: this.logger,
      debug: !!process.env.DEBUG,
      serviceHealthCheck: true,
    });
    this.logger.debug(`Loading gateway`);
    const { schema, executor: gatewayExecutor } = await gateway.load();
    const schemaHash: any = printSchemaWithDirectives(schema);
    let remoteSchema: GraphQLSchema = schema;
    this.logger.debug(`Wrapping gateway executor in a unified schema`);
    remoteSchema = wrapSchema({
      schema: remoteSchema,
      executor: <TReturn>({ document, info, variables, context, operationName }: ExecutionRequest) => {
        const documentStr = printWithCache(document);
        const { operation } = info;
        // const operationName = operation.name?.value;
        return gatewayExecutor({
          document,
          request: {
            query: documentStr,
            operationName,
            variables,
          },
          operationName,
          cache: this.cache,
          context,
          queryHash: documentStr,
          logger: this.logger,
          metrics: {},
          source: documentStr,
          operation,
          schema,
          schemaHash,
          overallCachePolicy: {} as any,
        }) as ExecutionResult<TReturn>;
      },
      batch: true,
    });
    const id$ = this.pubsub.subscribe('destroy', () => {
      gateway.stop().catch(err => this.logger.error(err));
      id$.then(id => this.pubsub.unsubscribe(id)).catch(err => console.error(err));
    });
    this.logger.debug(`Applying additionalTypeDefs`);
    typeDefs?.forEach(typeDef => {
      remoteSchema = extendSchema(remoteSchema, typeDef);
    });
    if (resolvers) {
      this.logger.debug(`Applying additionalResolvers`);
      for (const resolversObj of asArray(resolvers)) {
        remoteSchema = addResolversToSchema({
          schema: remoteSchema,
          resolvers: resolversObj,
          updateResolversInPlace: true,
        });
      }
    }
    if (transforms?.length) {
      this.logger.debug(`Applying root level transforms`);
      remoteSchema = wrapSchema({
        schema: remoteSchema,
        transforms: transforms as any[],
        batch: true,
      });
    }
    this.logger.debug(`Attaching sourceMap to the unified schema`);
    remoteSchema.extensions = remoteSchema.extensions || {};
    Object.defineProperty(remoteSchema.extensions, 'sourceMap', {
      get: () => sourceMap,
    });
    return remoteSchema;
  }
}
