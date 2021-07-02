import {
  KeyValueCache,
  Logger,
  MeshMerger,
  MeshMergerContext,
  MeshMergerOptions,
  MeshPubSub,
  RawSourceOutput,
} from '@graphql-mesh/types';
import { GraphQLSchema, print, extendSchema, DocumentNode, parse, execute } from 'graphql';
import { wrapSchema } from '@graphql-tools/wrap';
import { ApolloGateway } from '@apollo/gateway';
import { addResolversToSchema } from '@graphql-tools/schema';
import { hashObject, jitExecutorFactory } from '@graphql-mesh/utils';
import { Executor } from '@graphql-tools/utils';
import { env } from 'process';
import { MeshStore, PredefinedProxyOptions } from '@graphql-mesh/store';

const APOLLO_GET_SERVICE_DEFINITION_QUERY = /* GraphQL */ `
  query __ApolloGetServiceDefinition__ {
    _service {
      sdl
    }
  }
`;

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
        const transformedSchema = wrapSchema(rawSource);
        rawSourceMap.set(rawSource.name, rawSource);
        sourceMap.set(rawSource, transformedSchema);
        const sdl = await this.store
          .proxy(`${rawSource.name}_sdl`, PredefinedProxyOptions.StringWithoutValidation)
          .getWithSet(async () => {
            const sdlQueryResult = await execute({
              schema: transformedSchema,
              document: parse(APOLLO_GET_SERVICE_DEFINITION_QUERY),
            });
            return sdlQueryResult.data._service.sdl;
          });
        localServiceList.push({
          name: rawSource.name,
          typeDefs: parse(sdl),
        });
      })
    );
    this.logger.debug(`Creating ApolloGateway`);
    const rootValue = {};
    const gateway = new ApolloGateway({
      localServiceList,
      buildService: ({ name }) => {
        this.logger.debug(`Building federation service: ${name}`);
        const rawSource = rawSourceMap.get(name);
        const transformedSchema = sourceMap.get(rawSource);
        const jitExecute = jitExecutorFactory(transformedSchema, name, this.logger.child('JIT Executor'));
        return {
          async process({ request, context }) {
            return jitExecute({
              document: parse(request.query),
              variables: request.variables,
              operationName: request.operationName,
              extensions: request.extensions,
              context,
              rootValue,
            });
          },
        };
      },
      logger: this.logger,
      debug: !!env.DEBUG,
      serviceHealthCheck: true,
    });
    this.logger.debug(`Loading gateway`);
    const { schema, executor: gatewayExecutor } = await gateway.load();
    const schemaHash: any = hashObject({ schema });
    let remoteSchema: GraphQLSchema = schema;
    this.logger.debug(`Wrapping gateway executor in a unified schema`);
    remoteSchema = wrapSchema({
      schema: remoteSchema,
      executor: ({ document, info, variables, context }): any => {
        const documentStr = print(document);
        const { operation } = info;
        // const operationName = operation.name?.value;
        return gatewayExecutor({
          document,
          request: {
            query: documentStr,
            operationName: undefined,
            variables,
          },
          operationName: undefined,
          cache: this.cache,
          context,
          queryHash: documentStr,
          logger: this.logger,
          metrics: {},
          source: documentStr,
          operation,
          schema,
          schemaHash,
        });
      },
    });
    this.pubsub.subscribe('destroy', () => gateway.stop());
    this.logger.debug(`Applying additionalTypeDefs`);
    typeDefs?.forEach(typeDef => {
      remoteSchema = extendSchema(remoteSchema, typeDef);
    });
    if (resolvers) {
      this.logger.debug(`Applying additionalResolvers`);
      remoteSchema = addResolversToSchema({
        schema: remoteSchema,
        resolvers,
        updateResolversInPlace: true,
      });
    }
    if (transforms?.length) {
      this.logger.debug(`Applying root level transforms`);
      remoteSchema = wrapSchema({
        schema: remoteSchema,
        transforms,
        executor: jitExecutorFactory(remoteSchema, 'wrapped', this.logger.child('JIT Executor')) as Executor,
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
