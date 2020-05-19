import { KeyValueCache, Hooks, MergerFn, RawSourceOutput } from '@graphql-mesh/types';
import { GraphQLSchema, print, Kind, OperationDefinitionNode, graphql } from 'graphql';
import { makeRemoteExecutableSchema, Fetcher } from 'graphql-tools';
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
  const { schema, executor } = await gateway.load();
  const fetcher: Fetcher = ({ query, operationName, variables, context }) =>
    executor({
      document: query,
      request: {
        operationName,
        query: print(query),
        variables,
      },
      operationName,
      cache,
      context,
      queryHash: print(query) + '_' + JSON.stringify(variables),
      logger: console,
      metrics: {},
      source: print(query),
      operation: query.definitions.find(
        definition => definition.kind === Kind.OPERATION_DEFINITION && definition.name?.value === operationName
      ) as OperationDefinitionNode,
    });
  const remoteSchemaOptions = {
    schema,
    fetcher,
  };
  const remoteSchema = makeRemoteExecutableSchema(remoteSchemaOptions);
  hooks.on('destroy', () => gateway.stop());
  return remoteSchema;
};

export default mergeUsingFederation;
