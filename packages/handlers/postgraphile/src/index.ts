import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { GraphQLObjectType, GraphQLNamedType } from 'graphql';
import Maybe from 'graphql/tsutils/Maybe';
import { createPostGraphileSchema } from 'postgraphile';
import { Pool, PoolClient } from 'pg';

const handler: MeshHandlerLibrary<
  YamlConfig.PostGraphileConfig,
  any,
  { pgClient: PoolClient }
> = {
  async tsSupport(options) {
    const sdkIdentifier = `${options.name}Sdk`;
    const contextIdentifier = `${options.name}Context`;

    return {};
  },
  async getMeshSource({ filePathOrUrl, name, config, hooks }) {
    const mapsToPatch: Array<Map<GraphQLNamedType, any>> = [];
    const graphileSchema = await createPostGraphileSchema(
      filePathOrUrl,
      config?.schemaName || 'public',
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
      source: {
        schema: graphileSchema,
        contextBuilder: async () => {
          return new Promise((resolve, reject) => {
            const pool = new Pool(
              config?.pool
                ? { ...config?.pool }
                : { connectionString: filePathOrUrl }
            );

            pool.connect((err, client) => {
              if (err) {
                return reject(err);
              }

              return resolve({ pgClient: client });
            });
          });
        },
        sdk: context => {
          const queryType = graphileSchema.getQueryType();
          const mutationType = graphileSchema.getMutationType();

          return extractSdkFromResolvers(context, [queryType, mutationType]);
        },
        name,
        source: filePathOrUrl
      },
      payload: {}
    };
  }
};

function extractSdkFromResolvers(
  context: any,
  types: Maybe<GraphQLObjectType>[]
) {
  const sdk: Record<string, Function> = {};

  for (const type of types) {
    if (type) {
      const fields = type.getFields();

      Object.keys(fields).forEach(fieldName => {
        if (fields[fieldName]) {
          const resolveFn = fields[fieldName].resolve;

          if (resolveFn) {
            sdk[fieldName] = (args: any) =>
              resolveFn(null, args, context, { path: { prev: '' } } as any);
          }
        }
      });
    }
  }

  return sdk;
}

export default handler;
