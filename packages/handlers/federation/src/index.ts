import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { ApolloGateway } from '@apollo/gateway';
import { print, Kind, OperationDefinitionNode } from 'graphql';
import { makeRemoteExecutableSchema, Fetcher } from 'graphql-tools';
import { fetchache, Request } from 'fetchache';

const handler: MeshHandlerLibrary<YamlConfig.FederationHandler> = {
  async getMeshSource({ config, hooks, cache }) {
    const gatewayFetcher: any = (info: RequestInfo, init: RequestInit) =>
      fetchache(typeof info === 'string' ? new Request(info, init) : info, cache);
    const gateway = new ApolloGateway({
      fetcher: gatewayFetcher,
      ...config,
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
    return {
      schema: remoteSchema,
    };
  },
};

export default handler;
