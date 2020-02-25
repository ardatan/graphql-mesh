import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { GraphQLObjectType } from 'graphql';
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
  async getMeshSource({ filePathOrUrl, name, config }) {
    const schema = await createPostGraphileSchema(
      filePathOrUrl,
      config?.schemaName || 'public',
      {
        dynamicJson: true
      }
    );

    return {
      source: {
        schema,
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
        // sdk: context => {
        //   const queryType = schema.getQueryType();
        //   const mutationType = schema.getMutationType();

        //   return extractSdkFromResolvers(context, [queryType, mutationType]);
        // },
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
