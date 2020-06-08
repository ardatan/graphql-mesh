import { makeAugmentedSchema, inferSchema } from 'neo4j-graphql-js';
import neo4j from 'neo4j-driver';
import { YamlConfig, MeshHandlerLibrary } from '@graphql-mesh/types';

const handler: MeshHandlerLibrary<YamlConfig.Neo4JHandler> = {
  async getMeshSource({ name, cache, config, hooks }) {
    const driver = neo4j.driver(config.url, neo4j.auth.basic(config.username, config.password));

    hooks.on('destroy', () => driver.close());
    let typeDefs: string;

    if (config.cacheIntrospection) {
      const cacheKey = name + '_introspection';
      typeDefs = await cache.get(cacheKey);
      if (!typeDefs) {
        const inferredSchema = await inferSchema(driver, {
          alwaysIncludeRelationships: config.alwaysIncludeRelationships,
        });
        typeDefs = inferredSchema.typeDefs;
        await cache.set(cacheKey, typeDefs);
      }
    } else {
      const inferredSchema = await inferSchema(driver, {
        alwaysIncludeRelationships: config.alwaysIncludeRelationships,
      });
      typeDefs = inferredSchema.typeDefs;
    }

    const schema = makeAugmentedSchema({ typeDefs });

    return {
      schema,
      contextBuilder: async () => ({ driver, neo4jDatabase: config.database }),
    };
  },
};

export default handler;
