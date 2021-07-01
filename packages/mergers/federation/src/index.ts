import { MergerFn, RawSourceOutput } from '@graphql-mesh/types';
import { GraphQLSchema, print, extendSchema, DocumentNode, parse } from 'graphql';
import { wrapSchema } from '@graphql-tools/wrap';
import { ApolloGateway, LocalGraphQLDataSource } from '@apollo/gateway';
import { addResolversToSchema } from '@graphql-tools/schema';
import { hashObject, jitExecutorFactory } from '@graphql-mesh/utils';
import { Executor, getDocumentNodeFromSchema } from '@graphql-tools/utils';
import { env } from 'process';

const mergeUsingFederation: MergerFn = async function ({
  rawSources,
  cache,
  pubsub,
  typeDefs,
  resolvers,
  transforms,
  logger,
}): Promise<GraphQLSchema> {
  logger.debug(`Creating localServiceList for gateway`);
  const rawSourceMap = new Map<string, RawSourceOutput>();
  const localServiceList: { name: string; typeDefs: DocumentNode }[] = [];
  const sourceMap = new Map<RawSourceOutput, GraphQLSchema>();
  await Promise.all(
    rawSources.map(async rawSource => {
      const transformedSchema = wrapSchema(rawSource);
      rawSourceMap.set(rawSource.name, rawSource);
      sourceMap.set(rawSource, transformedSchema);
      localServiceList.push({
        name: rawSource.name,
        typeDefs: transformedSchema.extensions?.apolloServiceSdl
          ? parse(transformedSchema.extensions?.apolloServiceSdl)
          : getDocumentNodeFromSchema(transformedSchema),
      });
    })
  );
  logger.debug(`Creating ApolloGateway`);
  // const rootValue = {};
  const gateway = new ApolloGateway({
    localServiceList,
    buildService({ name }) {
      logger.debug(`Building federation service: ${name}`);
      const rawSource = rawSourceMap.get(name);
      const transformedSchema = sourceMap.get(rawSource);
      // const jitExecute = jitExecutorFactory(transformedSchema, name, logger.child('JIT Executor'));
      return new LocalGraphQLDataSource(transformedSchema);
    },
    logger,
    debug: !!env.DEBUG,
    serviceHealthCheck: true,
  });
  logger.debug(`Loading gateway`);
  const { schema, executor: gatewayExecutor } = await gateway.load();
  const schemaHash: any = hashObject({ schema });
  let remoteSchema: GraphQLSchema = schema;
  logger.debug(`Wrapping gateway executor in a unified schema`);
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
        cache,
        context,
        queryHash: documentStr,
        logger,
        metrics: {},
        source: documentStr,
        operation,
        schema,
        schemaHash,
      });
    },
  });
  pubsub.subscribe('destroy', () => gateway.stop());
  logger.debug(`Applying additionalTypeDefs`);
  typeDefs?.forEach(typeDef => {
    remoteSchema = extendSchema(remoteSchema, typeDef);
  });
  if (resolvers) {
    logger.debug(`Applying additionalResolvers`);
    remoteSchema = addResolversToSchema({
      schema: remoteSchema,
      resolvers,
      updateResolversInPlace: true,
    });
  }
  if (transforms?.length) {
    logger.debug(`Applying root level transforms`);
    remoteSchema = wrapSchema({
      schema: remoteSchema,
      transforms,
      executor: jitExecutorFactory(remoteSchema, 'wrapped', logger.child('JIT Executor')) as Executor,
    });
  }
  logger.debug(`Attaching sourceMap to the unified schema`);
  remoteSchema.extensions = remoteSchema.extensions || {};
  Object.defineProperty(remoteSchema.extensions, 'sourceMap', {
    get: () => sourceMap,
  });
  return remoteSchema;
};

export default mergeUsingFederation;
