import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { GraphQLNamedType } from 'graphql';
import { createPostGraphileSchema } from 'postgraphile';
import { Client } from 'pg';

const handler: MeshHandlerLibrary<
  YamlConfig.PostGraphileHandler,
  { pgClient: Client }
> = {
  async getMeshSource({ config, hooks }) {
    const mapsToPatch: Array<Map<GraphQLNamedType, any>> = [];
    const pgClient = new Client({
      ...(config?.pool
        ? {
            ...config?.pool
          }
        : {
            connectionString: config.connectionString
          })
    });
    await pgClient.connect();
    (pgClient as any)['release'] = () => {};
    const graphileSchema = await createPostGraphileSchema(
      pgClient as any,
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
    hooks.on('schemaReady', ({ schema: finalSchema }) => {
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

    hooks.on('destroy', () => pgClient.end());

    return {
      schema: graphileSchema,
      contextBuilder: async () => ({ pgClient })
    };
  }
};

export default handler;
