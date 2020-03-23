import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { ApolloGateway } from '@apollo/gateway';
import { GraphQLResolveInfo, print } from 'graphql';
import { delegateToSchema, IDelegateToSchemaOptions, makeRemoteExecutableSchema } from 'graphql-tools-fork';
import { fetchache, Request } from 'fetchache';
import { parse } from 'querystring';

const handler: MeshHandlerLibrary<YamlConfig.FederationHandler> = {
    async getMeshSource({ config, hooks, cache }) {
        const gateway = new ApolloGateway({
            fetcher: (info: any, init: any) => fetchache(typeof info === 'string' ? new Request(info, init) : info, cache) as any,
            ...config,
        });
        const { schema, executor } = await gateway.load();
        hooks.on('buildSdkFn', ({ fieldName, replaceFn, schema }) => {
            replaceFn((args: any, context: any, info: GraphQLResolveInfo) => {
                const delegationOptions: IDelegateToSchemaOptions = {
                    schema: {
                        schema,
                        executor: ({ document, variables }) => executor({
                            document,
                            request: {
                                query: print(document),
                                operationName: info.operation.name?.value,
                                variables,
                            },
                            cache,
                            context,
                            queryHash: print(document) + '_' + JSON.stringify(variables),
                            operationName: info.operation.name?.value,
                            operation: info.operation,
                        }),
                    },
                    fieldName,
                    args,
                    info,
                    context
                };

                return delegateToSchema(delegationOptions);
            });
        });
        return { 
            schema: makeRemoteExecutableSchema({
                schema,
                fetcher: ({ query, operationName, variables, context }) => executor({
                    document: query,
                    request: {
                        query: print(query),
                        variables,
                    },
                    operationName,
                    cache,
                    context,
                    queryHash: print(query) + '_' + JSON.stringify(variables),
                })
            })
        };
    }
}

export default handler;