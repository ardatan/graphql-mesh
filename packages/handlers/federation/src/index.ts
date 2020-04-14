import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { ApolloGateway } from '@apollo/gateway';
import { GraphQLResolveInfo, print, Kind, OperationDefinitionNode } from 'graphql';
import { delegateToSchema, IDelegateToSchemaOptions, makeRemoteExecutableSchema, Fetcher } from 'graphql-tools';
import { fetchache, Request } from 'fetchache';

const handler: MeshHandlerLibrary<YamlConfig.FederationHandler> = {
  async getMeshSource({ config, hooks, cache }) {
    const gateway = new ApolloGateway({
      fetcher: (info: any, init: any) =>
        fetchache(typeof info === 'string' ? new Request(info, init) : info, cache) as any,
      ...config,
    });
    const { schema, executor } = await gateway.load();
    const fetcher: Fetcher = ({ query, operationName, variables, context }) =>
      executor({
        document: query,
        request: {
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
    hooks.on('buildSdkFn', ({ fieldName, replaceFn, schema }) => {
      replaceFn((args: any, context: any, info: GraphQLResolveInfo) => {
        const delegationOptions: IDelegateToSchemaOptions = {
          operation: info.operation.operation,
          fieldName,
          schema,
          args,
          info,
          context,
        };

        return delegateToSchema(delegationOptions);
      });
    });
    hooks.on('destroy', () => gateway.stop());
    return {
      schema: remoteSchema,
    };
  },
};

export default handler;
