import { MeshHandlerLibrary, YamlConfig } from "@graphql-mesh/types";
import { ODataGraphQLSchemaFactory } from "./schema-factory";
import { GraphQLObjectType, GraphQLSchema, printSchema, printType, GraphQLSchemaConfig } from "graphql";
import { printSchemaWithDirectives,extractResolversFromSchema }from'@graphql-toolkit/common';
import { addResolversToSchema } from'graphql-tools-fork';

const handler: MeshHandlerLibrary<YamlConfig.ODataHandler> = {
    async getMeshSource({ config, cache }) {
        const schemaFactory = new ODataGraphQLSchemaFactory(cache);
        await Promise.all(config.services.map(serviceConfig => schemaFactory.processServiceConfig({
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
        
        const schema = schemaFactory.buildSchema();
        const contextVariables = schemaFactory.getContextVariables();
        return {
            schema,
            contextVariables,
        }
    }
};


export default handler;