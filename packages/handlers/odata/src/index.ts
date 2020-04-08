import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { ODataGraphQLSchemaFactory } from './schema-factory';

const handler: MeshHandlerLibrary<YamlConfig.ODataHandler> = {
  async getMeshSource({ config, cache }) {
    const schemaFactory = new ODataGraphQLSchemaFactory(config, cache);
    await schemaFactory.processServiceConfig();

    const schema = schemaFactory.buildSchema();
    const contextVariables = schemaFactory.getContextVariables();
    return {
      schema,
      contextVariables,
    };
  },
};

export default handler;
