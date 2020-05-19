import { KeyValueCache, Hooks, MergerFn, RawSourceOutput } from '@graphql-mesh/types';
import { GraphQLSchema, print, graphql } from 'graphql';
import { makeRemoteExecutableSchema } from '@graphql-tools/wrap';
import { ApolloGateway } from '@apollo/gateway';

const mergeUsingFederation: MergerFn = async function ({
  rawSources,
  cache,
  hooks,
}: {
  rawSources: RawSourceOutput[];
  cache: KeyValueCache;
  hooks: Hooks;
}): Promise<GraphQLSchema> {
  const serviceMap = new Map<string, GraphQLSchema>();
  const serviceList: { name: string; url: string }[] = [];
  for (const rawSource of rawSources) {
    serviceMap.set(rawSource.name, rawSource.schema);
    serviceList.push({
      name: rawSource.name,
      url: 'http://localhost/' + rawSource.name,
    });
  }
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
          );
        },
      };
    },
  });
  const { schema, executor: gatewayExecutor } = await gateway.load();
  const remoteSchema = makeRemoteExecutableSchema({
    schema,
    executor: ({ document, info, variables, context }): any => {
      const documentStr = print(document);
      const { operation } = info;
      const operationName = operation.name?.value;
      return gatewayExecutor({
        document,
        request: {
          operationName,
          query: documentStr,
          variables,
        },
        operationName,
        cache,
        context,
        queryHash: documentStr + '_' + JSON.stringify(variables),
        logger: console,
        metrics: {},
        source: documentStr,
        operation,
      });
    },
  });
  hooks.on('destroy', () => gateway.stop());
  return remoteSchema;
};

export default mergeUsingFederation;
