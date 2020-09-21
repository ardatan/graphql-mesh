/* eslint-disable @typescript-eslint/no-unused-vars */
import { GetMeshSourceOptions, MeshHandler, MeshSource, YamlConfig, Hooks, KeyValueCache } from '@graphql-mesh/types';
import { execute, subscribe } from 'graphql';
import { withPostGraphileContext, Plugin } from 'postgraphile';
import { getPostGraphileBuilder } from 'postgraphile-core';
import { Pool } from 'pg';
import { join } from 'path';
import { tmpdir } from 'os';
import { readJSON, unlink } from 'fs-extra';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';

export default class PostGraphileHandler implements MeshHandler {
  private name: string;
  private cache: KeyValueCache;
  private config: YamlConfig.PostGraphileHandler;
  private hooks: Hooks;

  constructor({ name, cache, config, hooks }: GetMeshSourceOptions<YamlConfig.PostGraphileHandler>) {
    this.name = name;
    this.cache = cache;
    this.config = config;
    this.hooks = hooks;
  }

  async getMeshSource(): Promise<MeshSource> {
    const pgPool = new Pool({
      ...(this.config?.pool
        ? {
            ...this.config?.pool,
          }
        : {
            connectionString: this.config.connectionString,
          }),
    });

    this.hooks.once('destroy', () => pgPool.end());

    const cacheKey = this.name + '_introspection';

    const tmpFile = join(tmpdir(), cacheKey);
    const cachedIntrospection = this.config.cacheIntrospection && (await this.cache.get(cacheKey));

    let writeCache: () => Promise<void>;

    const appendPlugins = await Promise.all<Plugin>(
      (this.config.appendPlugins || []).map(pluginName => loadFromModuleExportExpression<any>(pluginName))
    );
    const skipPlugins = await Promise.all<Plugin>(
      (this.config.skipPlugins || []).map(pluginName => loadFromModuleExportExpression<any>(pluginName))
    );
    const options = await loadFromModuleExportExpression<any>(this.config.options);

    const builder = await getPostGraphileBuilder(pgPool, this.config.schemaName || 'public', {
      dynamicJson: true,
      subscriptions: true,
      live: true,
      readCache: cachedIntrospection,
      writeCache: this.config.cacheIntrospection && !cachedIntrospection && tmpFile,
      setWriteCacheCallback: fn => {
        writeCache = fn;
      },
      appendPlugins,
      skipPlugins,
      ...options,
    });

    const schema = builder.buildSchema();

    if (this.config.cacheIntrospection && !cachedIntrospection) {
      await writeCache();
      const json = await readJSON(tmpFile);
      await this.cache.set(cacheKey, json);
      await unlink(tmpFile);
    }

    return {
      schema,
      executor: ({ document, variables, context: meshContext }) =>
        withPostGraphileContext(
          { pgPool },
          // Execute your GraphQL query in this function with the provided
          // `context` object, which should NOT be used outside of this
          // function.
          postgraphileContext =>
            execute({
              schema, // The schema from `createPostGraphileSchema`
              document,
              contextValue: { ...postgraphileContext, ...meshContext }, // You can add more to context if you like
              variableValues: variables,
            }) as any
        ) as any,
      subscriber: ({ document, variables, context: meshContext }) =>
        withPostGraphileContext(
          { pgPool },
          // Execute your GraphQL query in this function with the provided
          // `context` object, which should NOT be used outside of this
          // function.
          postgraphileContext =>
            subscribe({
              schema, // The schema from `createPostGraphileSchema`
              document,
              contextValue: { ...postgraphileContext, ...meshContext }, // You can add more to context if you like
              variableValues: variables,
            }) as any
        ) as any,
    };
  }
}
