/* eslint-disable @typescript-eslint/no-unused-vars */
import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { execute, subscribe } from 'graphql';
import { withPostGraphileContext, Plugin } from 'postgraphile';
import { getPostGraphileBuilder } from 'postgraphile-core';
import { Pool } from 'pg';
import { join } from 'path';
import { tmpdir } from 'os';
import { readJSON, unlink } from 'fs-extra';

const handler: MeshHandlerLibrary<YamlConfig.PostGraphileHandler> = {
  async getMeshSource({ name, cache, config, hooks }) {
    const pgPool = new Pool({
      ...(config?.pool
        ? {
            ...config?.pool,
          }
        : {
            connectionString: config.connectionString,
          }),
    });

    const cacheKey = name + '_introspection';

    const tmpFile = join(tmpdir(), cacheKey);
    const cachedIntrospection = config.cacheIntrospection && (await cache.get(cacheKey));

    let writeCache: () => Promise<void>;

    const appendPlugins = await Promise.all<Plugin>(config.plugins?.map(pluginName => import(pluginName)));

    const builder = await getPostGraphileBuilder(pgPool, config.schemaName || 'public', {
      dynamicJson: true,
      subscriptions: true,
      live: true,
      readCache: cachedIntrospection,
      writeCache: config.cacheIntrospection && !cachedIntrospection && tmpFile,
      setWriteCacheCallback: fn => {
        writeCache = fn;
      },
      appendPlugins,
    });

    const graphileSchema = builder.buildSchema();

    hooks.on('destroy', () => pgPool.end());

    if (config.cacheIntrospection && !cachedIntrospection) {
      await writeCache();
      const json = await readJSON(tmpFile);
      await cache.set(cacheKey, json);
      await unlink(tmpFile);
    }

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
