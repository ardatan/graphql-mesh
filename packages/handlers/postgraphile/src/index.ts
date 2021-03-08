/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  GetMeshSourceOptions,
  MeshHandler,
  MeshSource,
  YamlConfig,
  MeshPubSub,
  KeyValueCache,
} from '@graphql-mesh/types';
import { execute, subscribe } from 'graphql';
import { withPostGraphileContext, Plugin } from 'postgraphile';
import { getPostGraphileBuilder } from 'postgraphile-core';
import { Pool } from 'pg';
import { join } from 'path';
import { tmpdir } from 'os';
import { promises as fsPromises } from 'fs';
import { loadFromModuleExportExpression, readFileOrUrlWithCache, readJSON } from '@graphql-mesh/utils';

const { unlink } = fsPromises || {};

export default class PostGraphileHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.PostGraphileHandler;
  private baseDir: string;
  private cache: KeyValueCache;
  private pubsub: MeshPubSub;

  constructor({ name, config, baseDir, cache, pubsub }: GetMeshSourceOptions<YamlConfig.PostGraphileHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.pubsub = pubsub;
  }

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
        await this.cache.set(cacheKey, json, { ttl });
        await unlink(cacheIntrospectionFile);
      }
    }
  }

  async getMeshSource(): Promise<MeshSource> {
    let pgPool: Pool;

    if (typeof this.config?.pool === 'string') {
      pgPool = await loadFromModuleExportExpression<any>(this.config.pool, { cwd: this.baseDir });
    }

    if (!pgPool || !('connect' in pgPool)) {
      pgPool = new Pool({
        connectionString: this.config.connectionString,
        ...this.config?.pool,
      });
    }

    this.pubsub.subscribe('destroy', () => pgPool.end());

    const cacheKey = this.name + '_introspection';

    let cacheIntrospectionFile = join(tmpdir(), cacheKey);
    let cachedIntrospection;
    let ifTmpFileUsed = false;
    if (this.config.cacheIntrospection) {
      if (typeof this.config.cacheIntrospection === 'object' && this.config.cacheIntrospection.path) {
        cacheIntrospectionFile = this.config.cacheIntrospection.path;
        cachedIntrospection = await readFileOrUrlWithCache(this.config.cacheIntrospection.path, this.cache, {
          cwd: this.baseDir,
        });
        ifTmpFileUsed = true;
      } else {
        cachedIntrospection = await this.cache.get(cacheKey);
      }
    }

    let writeCache: () => Promise<void>;

    const appendPlugins = await Promise.all<Plugin>(
      (this.config.appendPlugins || []).map(pluginName =>
        loadFromModuleExportExpression<any>(pluginName, { cwd: this.baseDir })
      )
    );
    const skipPlugins = await Promise.all<Plugin>(
      (this.config.skipPlugins || []).map(pluginName =>
        loadFromModuleExportExpression<any>(pluginName, { cwd: this.baseDir })
      )
    );
    const options = await loadFromModuleExportExpression<any>(this.config.options, { cwd: this.baseDir });

    const builder = await getPostGraphileBuilder(pgPool, this.config.schemaName || 'public', {
      dynamicJson: true,
      subscriptions: 'subscriptions' in this.config ? this.config.subscriptions : true,
      live: 'live' in this.config ? this.config.live : true,
      readCache: cachedIntrospection,
      writeCache: !cachedIntrospection && cacheIntrospectionFile,
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
