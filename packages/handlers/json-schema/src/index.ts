import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { GraphQLSchema, GraphQLObjectType, GraphQLFieldConfigMap, GraphQLOutputType, GraphQLInputType, GraphQLBoolean } from 'graphql';
import { JSONSchemaVisitor, JSONSchemaVisitorCache } from './json-schema-visitor';
import { fetch } from 'cross-fetch';
import urlJoin from 'url-join';
import isUrl from 'is-url';

async function importModule(filePathOrUrl: string) {
    const m = await import(filePathOrUrl);
    return 'default' in m ? m.default : m;
}

type Config = YamlConfig.JsonSchema['config'];

async function loadJsonSchema(filePathOrUrl: string, config: Config){
    if (isUrl(filePathOrUrl)) {
        const res = await fetch(filePathOrUrl, {
            headers: {
                ...config?.schemaHeaders,
            }
        });
        return res.json();
    } else {
        return importModule(filePathOrUrl);
    }
}

const handler: MeshHandlerLibrary<Config> = {
    async getMeshSource({ name, config }) {

        const visitorCache = new JSONSchemaVisitorCache();
        await Promise.all(config?.typeReferences?.map(async typeReference => {
            if (typeReference.sharedType) {
                const [moduleName, exportName] = typeReference.sharedType.split('#');
                const m = await importModule(moduleName);
                const type = m[exportName];
                visitorCache.sharedTypesByIdentifier.set(typeReference.reference, type);
            }
            if (typeReference.inputType) {
                const [moduleName, exportName] = typeReference.inputType.split('#');
                const m = await importModule(moduleName);
                const type = m[exportName];
                visitorCache.inputSpecificTypesByIdentifier.set(typeReference.reference, type);
            }
            if (typeReference.outputType) {
                const [moduleName, exportName] = typeReference.outputType.split('#');
                const m = await importModule(moduleName);
                const type = m[exportName];
                visitorCache.outputSpecificTypesByIdentifier.set(typeReference.reference, type);
            }
        }) || []);

        const queryFields: GraphQLFieldConfigMap<any, any> = {};
        const mutationFields: GraphQLFieldConfigMap<any, any> = {};
        const schemaVisitor = new JSONSchemaVisitor(visitorCache);
        await Promise.all(
            config?.operations?.map(async operationConfig => {
                const [requestSchema, responseSchema] = await Promise.all([
                    loadJsonSchema(operationConfig.requestSchema, config),
                    loadJsonSchema(operationConfig.responseSchema, config),
                ]);
                const destination = operationConfig.type === 'Query' ? queryFields : mutationFields;
                destination[operationConfig.field] = {
                    description: operationConfig.description || responseSchema.description || `${operationConfig.method} ${operationConfig.path}`,
                    type: schemaVisitor.visit(responseSchema, operationConfig.field, {
                        isInput: false,
                        prefix: operationConfig.field,
                    }) as GraphQLOutputType,
                    args: {
                        input: {
                            type: schemaVisitor.visit(requestSchema, operationConfig.field, {
                                isInput: true,
                                prefix: operationConfig.field,
                            }) as GraphQLInputType,
                        }
                    },
                    resolve: async (_, { input }) => {
                        const fullPath = urlJoin(config.baseUrl, operationConfig.path); 
                        const res = await fetch(fullPath, {
                                method: operationConfig.method,
                                body: JSON.stringify(input),
                                headers: {
                                    ...config?.operationHeaders,
                                    ...operationConfig?.headers,
                                },
                            });
                        return res.json();
                    },
                };
            }) || []
        );

        const schema: GraphQLSchema = new GraphQLSchema({
            query: new GraphQLObjectType({
                name: 'Query',
                fields: Object.keys(queryFields).length > 0 ? queryFields : { ping: { type: GraphQLBoolean, resolve: () => true } },
            }),
            mutation: Object.keys(mutationFields).length > 0 ? new GraphQLObjectType({
                name: 'Mutation',
                fields: mutationFields,
            }) : undefined,
        });

        return {
            name,
            source: name,
            schema,
        }
    }
};

export default handler;
