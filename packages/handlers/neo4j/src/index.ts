import { makeAugmentedSchema, inferSchema } from 'neo4j-graphql-js';
import neo4j from 'neo4j-driver';
import { YamlConfig, MeshHandlerLibrary } from '@graphql-mesh/types';

const handler: MeshHandlerLibrary<YamlConfig.Neo4JHandler> = {
  async getMeshSource({ config, hooks }) {
    const driver = neo4j.driver(config.url, neo4j.auth.basic(config.username, config.password));

    hooks.on('destroy', () => driver.close());

    const { typeDefs } = await inferSchema(driver, {
      alwaysIncludeRelationships: config.alwaysIncludeRelationships,
    });

    const schema = makeAugmentedSchema({ typeDefs });

    return {
      schema,
      contextBuilder: async () => ({ driver }),
    };
  },
};

export default handler;
