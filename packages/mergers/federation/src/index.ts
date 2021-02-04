import { MergerFn, RawSourceOutput } from '@graphql-mesh/types';
import { GraphQLSchema, print, graphql, extendSchema } from 'graphql';
import { wrapSchema } from '@graphql-tools/wrap';
import { ApolloGateway, ServiceEndpointDefinition } from '@apollo/gateway';
import { addResolversToSchema } from '@graphql-tools/schema';
import objectHash from 'object-hash';

const mergeUsingFederation: MergerFn = async function ({
  rawSources,
  cache,
  pubsub,
  typeDefs,
  resolvers,
  transforms,
}): Promise<GraphQLSchema> {
  const serviceMap = new Map<string, GraphQLSchema>();
  const serviceList: ServiceEndpointDefinition[] = [];
  const sourceMap = new Map<RawSourceOutput, GraphQLSchema>();
  await Promise.all(
    rawSources.map(async rawSource => {
      const transformedSchema = wrapSchema(rawSource);
      serviceMap.set(rawSource.name, transformedSchema);
      sourceMap.set(rawSource, transformedSchema);
      serviceList.push({
        name: rawSource.name,
        url: 'http://localhost/' + rawSource.name,
      });
    })
  );
  const gateway = new ApolloGateway({
    serviceList,
    buildService({ name }) {
      return {
        process({ request, context }) {
          const schema = serviceMap.get(name);
          return graphql(
            schema,
            request.query,
            null,
            context.graphqlContext || context,
            request.variables,
            request.operationName
          ) as any;
        },
      };
    },
  });
  const { schema, executor: gatewayExecutor } = await gateway.load();
  const schemaHash: any = objectHash({ schema }, { ignoreUnknown: true });
  let remoteSchema: GraphQLSchema = schema;
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
        queryHash: objectHash(
          {
            document,
            variables,
          },
          { ignoreUnknown: true }
        ),
        logger: console,
        metrics: {},
        source: documentStr,
        operation,
        schema,
        schemaHash,
      });
    },
  });
  pubsub.subscribe('destroy', () => gateway.stop());
  typeDefs?.forEach(typeDef => {
    remoteSchema = extendSchema(remoteSchema, typeDef);
  });
  if (resolvers) {
    remoteSchema = addResolversToSchema({
      schema: remoteSchema,
      resolvers,
      updateResolversInPlace: true,
    });
  }
  if (transforms?.length) {
    remoteSchema = wrapSchema({
      schema: remoteSchema,
      transforms,
    });
  }
  remoteSchema.extensions = remoteSchema.extensions || {};
  Object.defineProperty(remoteSchema.extensions, 'sourceMap', {
    get: () => sourceMap,
  });
  return remoteSchema;
};

export default mergeUsingFederation;
