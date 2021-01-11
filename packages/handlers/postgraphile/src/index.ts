/* eslint-disable @typescript-eslint/no-unused-vars */
import { MeshHandler, MeshSource, YamlConfig, loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { execute, subscribe } from 'graphql';
import { withPostGraphileContext, Plugin } from 'postgraphile';
import { getPostGraphileBuilder } from 'postgraphile-core';
import { Pool } from 'pg';
import { join } from 'path';
import { tmpdir } from 'os';
import { readJSON, unlink } from 'fs-extra';

export default class PostGraphileHandler extends MeshHandler<YamlConfig.PostGraphileHandler> {
  private async writeIntrospectionToMeshCache({
    cacheKey,
    writeCache,
    cacheIntrospectionFile,
    cachedIntrospection,
    ifTmpFileUsed,
  }: {
    cacheKey: string;
    writeCache: () => Promise<void>;
    cacheIntrospectionFile: string;
    cachedIntrospection: any;
    ifTmpFileUsed: boolean;
  }) {
    if (this.config.cacheIntrospection && !cachedIntrospection) {
      await writeCache();
      if (!ifTmpFileUsed) {
        const json = await readJSON(cacheIntrospectionFile);
        const ttl = typeof this.config.cacheIntrospection === 'object' && this.config.cacheIntrospection.ttl;
        await this.handlerContext.cache.set(cacheKey, json, { ttl });
        await unlink(cacheIntrospectionFile);
      }
    }
  }

  async getMeshSource(): Promise<MeshSource> {
    let pgPool: Pool;
    if (typeof this.config?.pool === 'string') {
      pgPool = await loadFromModuleExportExpression(pgPool);
    } else if (this.config?.pool instanceof Pool) {
      pgPool = this.config?.pool;
    } else {
      pgPool = new Pool({
        connectionString: this.config.connectionString,
        ...this.config?.pool,
      });
    }

    this.handlerContext.pubsub.subscribe('destroy', () => pgPool.end());

    const cacheKey = this.name + '_introspection';

    let cacheIntrospectionFile = join(tmpdir(), cacheKey);
    let cachedIntrospection;
    let ifTmpFileUsed = false;
    if (this.config.cacheIntrospection) {
      if (typeof this.config.cacheIntrospection === 'object' && this.config.cacheIntrospection.path) {
        cacheIntrospectionFile = this.config.cacheIntrospection.path;
        cachedIntrospection = await this.readFileOrUrl(this.config.cacheIntrospection.path);
        ifTmpFileUsed = true;
      } else {
        cachedIntrospection = await this.handlerContext.cache.get(cacheKey);
      }
    }

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
      writeCache: cacheIntrospectionFile,
      setWriteCacheCallback: fn => {
        writeCache = fn;
      },
      appendPlugins,
      skipPlugins,
      ...options,
    });

    const schema = builder.buildSchema();

    this.writeIntrospectionToMeshCache({
      cacheKey,
      writeCache,
      cacheIntrospectionFile,
      cachedIntrospection,
      ifTmpFileUsed,
    });

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
