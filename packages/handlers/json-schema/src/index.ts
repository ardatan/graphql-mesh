import { MeshHandlerLibrary } from '@graphql-mesh/types';
import { GraphQLSchema, GraphQLObjectType, GraphQLFieldConfigMap, GraphQLType, GraphQLOutputType, GraphQLInputType, GraphQLBoolean } from 'graphql';
import { JSONSchemaVisitor } from './json-schema-visitor';
import { pascalCase } from 'pascal-case';
import { fetch } from 'cross-fetch';
import urlJoin from 'url-join';
import { join } from 'path';
import isUrl from 'is-url';
import { JSONSchemaDefinition } from './json-schema-types';

interface Config {
    baseUrl: string;
    operationHeaders?: {[name: string]: string};
    schemaHeaders?: {[name: string]: string}; 
    typeReferences?: TypeReference[];
    operations: OperationConfig[]
}

interface OperationConfig {
    field: string;
    path: string;
    description: string;
    type: 'Query' | 'Mutation';
    method: 'GET' | 'POST';
    headers?: {[name: string]: string};
    requestSchema: string;
    responseSchema: string;
}

interface TypeReference {
    reference: string;
    type: string;
}

async function importModule(filePathOrUrl: string) {
    const m = await import(filePathOrUrl);
    return 'default' in m ? m.default : m;
}

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

        const references = new Map<string, GraphQLType>();
        await Promise.all(config?.typeReferences?.map(async typeReference => {
            const [moduleName, exportName] = typeReference.type.split('#');
            const m = await importModule(moduleName);
            const type = m[exportName];
            references.set(typeReference.reference, type);
        }) || []);

        const queryFields: GraphQLFieldConfigMap<any, any> = {
            ping: { type: GraphQLBoolean, resolve: () => true },
        };
        const mutationFields: GraphQLFieldConfigMap<any, any> = {};
        const defCache = new Map<string, JSONSchemaDefinition>();
        await Promise.all(
            config?.operations?.map(async operationConfig => {
                const requestSchemaVisitor = new JSONSchemaVisitor(operationConfig.field, true, references, defCache);
                const responseSchemaVisitor = new JSONSchemaVisitor(operationConfig.field, false, references, defCache);
                const [requestSchema, responseSchema] = await Promise.all([
                    loadJsonSchema(operationConfig.requestSchema, config),
                    loadJsonSchema(operationConfig.responseSchema, config),
                ]);
                const destination = operationConfig.type === 'Query' ? queryFields : mutationFields;
                destination[operationConfig.field] = {
                    description: operationConfig.description || responseSchema.description || `${operationConfig.method} ${operationConfig.path}`,
                    type: responseSchemaVisitor.visit(responseSchema, pascalCase(operationConfig.field)) as GraphQLOutputType,
                    args: {
                        input: {
                            type: requestSchemaVisitor.visit(requestSchema, pascalCase(operationConfig.field + 'Input')) as GraphQLInputType,
                        }
                    },
                    resolve: async (_, { input }) => {
                        const fullPath = urlJoin(config.baseUrl,operationConfig.path); 
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
                fields: queryFields,
                description: `${name} Query`
            }),
            mutation: Object.keys(mutationFields).length > 0 ? new GraphQLObjectType({
                name: 'Mutation',
                fields: mutationFields,
                description: `${name} Mutation`
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
