import { MeshHandlerLibrary, YamlConfig } from "@graphql-mesh/types";
import { SchemaFactory } from "./schema-factory";
import { GraphQLObjectType, GraphQLSchema, printSchema, printType } from "graphql";

const handler: MeshHandlerLibrary<YamlConfig.ODataHandler> = {
    async getMeshSource({ config, cache }) {
        const schemaFactory = new SchemaFactory(cache);
        const serviceGeneratedConfigs = await Promise.all(config.services.map(serviceConfig => schemaFactory.Service({
            baseUrl: config.baseUrl,
            operationHeaders: {
                ...config.operationHeaders,
                ...serviceConfig.operationHeaders,
            },
            metadataHeaders: {
                ...config.metadataHeaders,
                ...serviceConfig.metadataHeaders,
            },
            servicePath: serviceConfig.servicePath,
        })));
        const mergedGeneratedConfigs = serviceGeneratedConfigs.reduce((prev, curr) => {
            Object.assign(prev.queryFields, curr.queryFields);
            Object.assign(prev.mutationFields, curr.mutationFields);
            Object.assign(prev.contextVariables, curr.contextVariables);
            return prev;
        }, {
            queryFields: {},
            mutationFields: {},
            contextVariables: [],
        } as (typeof serviceGeneratedConfigs)[0])
        const query = new GraphQLObjectType({
            name: 'Query',
            fields: mergedGeneratedConfigs.queryFields,
        });
        const schema = new GraphQLSchema({
            query,
        });
        return {
            schema,
            contextVariables: mergedGeneratedConfigs.contextVariables,
        }
    }
};


export default handler;