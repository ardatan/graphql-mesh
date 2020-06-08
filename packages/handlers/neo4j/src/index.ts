import { makeAugmentedSchema, inferSchema } from 'neo4j-graphql-js';
import neo4j from 'neo4j-driver';
import { YamlConfig, MeshHandlerLibrary } from '@graphql-mesh/types';
import { isAbsolute, join } from 'path';
import { cwd } from 'process';
import { pathExists, readFile, writeFile } from 'fs-extra';

const handler: MeshHandlerLibrary<YamlConfig.Neo4JHandler> = {
  async getMeshSource({ config, hooks }) {
    const driver = neo4j.driver(config.url, neo4j.auth.basic(config.username, config.password));

    hooks.on('destroy', () => driver.close());

    let typeDefs: string, absoluteCachePath: string;

    if (config.cachePath) {
      absoluteCachePath = isAbsolute(config.cachePath) ? config.cachePath : join(cwd(), config.cachePath);
    }

    if (absoluteCachePath && (await pathExists(absoluteCachePath))) {
      typeDefs = await readFile(absoluteCachePath, 'utf-8');
    } else {
      const inferredSchema = await inferSchema(driver, {
        alwaysIncludeRelationships: config.alwaysIncludeRelationships,
      });
      typeDefs = inferredSchema.typeDefs;

      if (absoluteCachePath) {
        await writeFile(absoluteCachePath, typeDefs);
      }
    }

    const schema = makeAugmentedSchema({ typeDefs });

    return {
      schema,
      contextBuilder: async () => ({ driver, neo4jDatabase: config.database }),
    };
  },
};

export default handler;
