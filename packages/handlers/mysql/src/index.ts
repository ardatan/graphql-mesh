import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { MySQLGraphQLSchemaFactory } from './generate-schema';

const handler: MeshHandlerLibrary<YamlConfig.MySQLHandler> = {
  async getMeshSource({ config, hooks }) {
    const schemaFactory = new MySQLGraphQLSchemaFactory(config.connectionString);
    const schema = await schemaFactory.buildGraphQLSchema();
    hooks.on('destroy', async () => {
      await schemaFactory.destroyConnection();
    });
    return {
      schema,
    };
  },
};

export default handler;
