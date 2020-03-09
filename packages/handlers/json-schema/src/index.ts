import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { GraphQLSchema, GraphQLObjectType, GraphQLFieldConfigMap, GraphQLOutputType, GraphQLInputType, GraphQLBoolean } from 'graphql';
import { JSONSchemaVisitor, JSONSchemaVisitorCache } from './json-schema-visitor';
import { fetch } from 'cross-fetch';
import urlJoin from 'url-join';
import isUrl from 'is-url';

type Config = YamlConfig.JsonSchema['config'];

async function loadJsonSchema(filePathOrUrl: string, config: Config) {
    if (isUrl(filePathOrUrl)) {
        const res = await fetch(filePathOrUrl, {
            headers: {
                ...config?.schemaHeaders,
            }
        });
        return res.json();
    } else {
        const m = await import(filePathOrUrl);
        return 'default' in m ? m.default : m;
    }
}

async function loadFromModuleExportExpression(expression: string) {
    const [moduleName, exportName] = expression.split('#');
    const m = await import(moduleName);
    return m[exportName] || (m.default && m.default[exportName]);
}

declare global {
    interface ObjectConstructor {
        keys<T>(obj: T): Array<keyof T>;
    }
}

const handler: MeshHandlerLibrary<Config> = {
    async getMeshSource({ name, config }) {

        const visitorCache = new JSONSchemaVisitorCache();
        await Promise.all(
            config?.typeReferences?.map(
                typeReference => Promise.all(Object.keys(typeReference).map(async key => {
                    switch (key) {
                        case 'sharedType':
                            const sharedType = await loadFromModuleExportExpression(typeReference.sharedType);
                            visitorCache.sharedTypesByIdentifier.set(typeReference.reference, sharedType);
                            break;
                        case 'outputType':
                            const outputType = await loadFromModuleExportExpression(typeReference.outputType);
                            visitorCache.outputSpecificTypesByIdentifier.set(typeReference.reference, outputType);
                            break;
                        case 'inputType':
                            const inputType = await loadFromModuleExportExpression(typeReference.inputType);
                            visitorCache.inputSpecificTypesByIdentifier.set(typeReference.reference, inputType);
                            break;
                        default:
                            throw new Error(`Unexpected type reference field: ${key}`)
                    }
                }))) || []);

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
                    type: schemaVisitor.visit(responseSchema, operationConfig.field, operationConfig.field, false) as GraphQLOutputType,
                    args: {
                        input: {
                            type: schemaVisitor.visit(requestSchema, operationConfig.field, operationConfig.field, true) as GraphQLInputType,
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
