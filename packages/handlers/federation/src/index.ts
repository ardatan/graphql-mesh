import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { ApolloGateway } from '@apollo/gateway';
import { DocumentNode, Kind, print, GraphQLField, GraphQLResolveInfo, buildSchema } from 'graphql';
import { addTypenameToAbstract } from 'graphql-tools-fork/dist/stitching/addTypenameToAbstract';
import { printSchemaWithDirectives } from '@graphql-toolkit/common';
import { addResolveFunctionsToSchema } from 'graphql-tools-fork';

const handler: MeshHandlerLibrary<YamlConfig.FederationHandler> = {
    async getMeshSource({ config }) {
        const gateway = new ApolloGateway(config);
        const loadedGateway = await gateway.load();
        // TODO: Change with Mesh's Cache Impl.
        const cacheMap = new Map();
        const keyValueCache = {
            get: async (key: string) => cacheMap.get(key),
            set: async (key: string, value: string) => cacheMap.set(key, value) as any,
            delete: async (key: string) => cacheMap.delete(key)
        };
        const proxyResolver = async (source: any, args: any, context: any, info: GraphQLResolveInfo) => {
            const fragments = Object.keys(info.fragments).map(
                fragment => info.fragments[fragment],
            );

            const operation = {
                ...info.operation,
                name: {
                    kind: Kind.NAME,
                    value: info.operation.name?.value + '_' + info.fieldName,
                },
                selectionSet: {
                    ...info.operation.selectionSet,
                    selections: info.operation.selectionSet.selections.filter(selection => {
                        if (selection.kind === 'Field') {
                            if (selection.name.value === info.fieldName) {
                                return true;
                            } 
                            return false;
                        }
                        return true;
                    })
                }
            }
    
            let query: DocumentNode = {
                kind: Kind.DOCUMENT,
                definitions: [operation, ...fragments],
            };
    
            query = addTypenameToAbstract(info.schema, query);
    
            const result = await loadedGateway.executor({
                document: query,
                queryHash: JSON.stringify(query) + '_' + info.fieldName,
                context,
                request: {
                    query: print(query),
                    operationName: operation.name.value,
                    variables: args,
                },
                cache: keyValueCache,
                source,
            });
            if (result.errors) {
                throw result.errors;
            }
            return result.data && result.data[info.fieldName];
        };

        const resolvers: any = {};
        for (const fieldName in loadedGateway.schema.getQueryType()?.getFields()) {
            resolvers.Query = resolvers.Query || {};
            resolvers.Query[fieldName] = proxyResolver;
        }
        for (const fieldName in (loadedGateway.schema.getMutationType()?.getFields() || {})) {
            resolvers.Mutation = resolvers.Mutation || {};
            resolvers.Mutation[fieldName] = proxyResolver;
        }
        
        const proxySchema = buildSchema(
            printSchemaWithDirectives(loadedGateway.schema),
            {
                assumeValid: true,
                assumeValidSDL: true,
            }
        )

        addResolveFunctionsToSchema({
            schema: proxySchema,
            resolvers,
        });

        return { schema: proxySchema };
    }
}

export default handler;