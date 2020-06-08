import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { execute, subscribe } from 'graphql';
import { createPostGraphileSchema, withPostGraphileContext } from 'postgraphile';
import { Pool } from 'pg';
import { isAbsolute, join } from 'path';
import { pathExists } from 'fs-extra';
import { cwd } from 'process';

const handler: MeshHandlerLibrary<YamlConfig.PostGraphileHandler> = {
  async getMeshSource({ config, hooks }) {
    const pgPool = new Pool({
      ...(config?.pool
        ? {
            ...config?.pool,
          }
        : {
            connectionString: config.connectionString,
          }),
    });
    let readCache: string, writeCache: string;
    if (config.cachePath) {
      const absoluteCachePath = isAbsolute(config.cachePath) ? config.cachePath : join(cwd(), config.cachePath);
      if (await pathExists(absoluteCachePath)) {
        // If file exists, read that one. if not, create a new one
        readCache = absoluteCachePath;
      } else {
        writeCache = absoluteCachePath;
      }
    }
    const graphileSchema = await createPostGraphileSchema(pgPool, config.schemaName || 'public', {
      dynamicJson: true,
      readCache,
      writeCache,
    });

    hooks.on('destroy', () => pgPool.end());

    return {
      schema: graphileSchema,
      executor({ document, variables, context: meshContext }) {
        return withPostGraphileContext(
          {
            pgPool,
          },
          async postgraphileContext => {
            // Execute your GraphQL query in this function with the provided
            // `context` object, which should NOT be used outside of this
            // function.
            return execute({
              schema: graphileSchema, // The schema from `createPostGraphileSchema`
              document,
              contextValue: { ...postgraphileContext, ...meshContext }, // You can add more to context if you like
              variableValues: variables,
            });
          }
        ) as any;
      },
      subscriber({ document, variables, context: meshContext }) {
        return withPostGraphileContext(
          {
            pgPool,
          },
          async postgraphileContext => {
            // Execute your GraphQL query in this function with the provided
            // `context` object, which should NOT be used outside of this
            // function.
            return subscribe({
              schema: graphileSchema, // The schema from `createPostGraphileSchema`
              document,
              contextValue: { ...postgraphileContext, ...meshContext }, // You can add more to context if you like
              variableValues: variables,
            }) as any;
          }
        ) as any;
      },
    };
  },
};

export default handler;
