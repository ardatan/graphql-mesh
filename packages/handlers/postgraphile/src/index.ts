import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { GraphQLNamedType } from 'graphql';
import { createPostGraphileSchema } from 'postgraphile';
import { Pool, PoolClient } from 'pg';

const handler: MeshHandlerLibrary<
  YamlConfig.PostGraphileHandler,
  { pgClient: PoolClient }
> = {
  async getMeshSource({ config, hooks }) {
    const mapsToPatch: Array<Map<GraphQLNamedType, any>> = [];
    const pgPool = new Pool(
      config?.pool
        ? { ...config?.pool }
        : { connectionString: config.connectionString }
    );
    const graphileSchema = await createPostGraphileSchema(
      pgPool,
      config.schemaName || 'public',
      {
        dynamicJson: true,
        appendPlugins: [
          builder => {
            builder.hook('finalize', (schema, build) => {
              mapsToPatch.push(build.fieldDataGeneratorsByType);
              mapsToPatch.push(build.fieldDataGeneratorsByFieldNameByType);
              mapsToPatch.push(build.fieldArgDataGeneratorsByFieldNameByType);
              mapsToPatch.push(build.scopeByType);

              return schema;
            });
          }
        ]
      }
    );

    // This is a workaround because the final schema changes, and we need to make sure
    // the new types are there on those maps, otherwise postgraphile will fail to build queries
    hooks.on('schemaReady', finalSchema => {
      const typeMap = finalSchema.getTypeMap();

      for (const [typeName, type] of Object.entries(typeMap)) {
        for (const map of mapsToPatch) {
          const oldType = graphileSchema.getType(typeName);
          const val = oldType ? map.get(oldType) : null;

          if (val) {
            map.set(type, val);
          }
        }
      }
    });

    return {
      schema: graphileSchema,
      contextBuilder: async () => {
        const pgClient = await pgPool.connect();
        return { pgClient };
      }
    };
  }
};

export default handler;
