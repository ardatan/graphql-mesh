/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  GetMeshSourceOptions,
  MeshHandler,
  MeshSource,
  YamlConfig,
  MeshPubSub,
  Logger,
  ImportFn,
} from '@graphql-mesh/types';
import { Plugin } from 'postgraphile';
import { getPostGraphileBuilder } from 'postgraphile-core';
import pg from 'pg';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadFromModuleExportExpression, readJSON } from '@graphql-mesh/utils';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import FederationPlugin from '@graphile/federation';

export default class PostGraphileHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.PostGraphileHandler;
  private baseDir: string;
  private pubsub: MeshPubSub;
  private pgCache: any;
  private logger: Logger;
  private importFn: ImportFn;

  constructor({
    name,
    config,
    baseDir,
    pubsub,
    store,
    logger,
    importFn,
  }: GetMeshSourceOptions<YamlConfig.PostGraphileHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.pgCache = store.proxy('pgCache.json', PredefinedProxyOptions.JsonWithoutValidation);
    this.logger = logger;
    this.importFn = importFn;
  }

  async getMeshSource(): Promise<MeshSource> {
    let pgPool: pg.Pool;

    if (typeof this.config?.pool === 'string') {
      pgPool = await loadFromModuleExportExpression<any>(this.config.pool, {
        cwd: this.baseDir,
        importFn: this.importFn,
        defaultExportName: 'default',
      });
    }

    if (!pgPool || !('connect' in pgPool)) {
      const pgLogger = this.logger.child('PostgreSQL');
      pgPool = new pg.Pool({
        connectionString: this.config.connectionString,
        log: messages => pgLogger.debug(messages),
        ...this.config?.pool,
      });
    }

    this.pubsub.subscribe('destroy', () => pgPool.end());

    const cacheKey = this.name + '_introspection.json';

    const dummyCacheFilePath = join(tmpdir(), cacheKey);
    let cachedIntrospection = await this.pgCache.get();

    let writeCache: () => Promise<void>;

    const appendPlugins = await Promise.all<Plugin>(
      (this.config.appendPlugins || []).map(pluginName =>
        loadFromModuleExportExpression<any>(pluginName, {
          cwd: this.baseDir,
          importFn: this.importFn,
          defaultExportName: 'default',
        })
      )
    );
    const skipPlugins = await Promise.all<Plugin>(
      (this.config.skipPlugins || []).map(pluginName =>
        loadFromModuleExportExpression<any>(pluginName, {
          cwd: this.baseDir,
          importFn: this.importFn,
          defaultExportName: 'default',
        })
      )
    );
    const options = await loadFromModuleExportExpression<any>(this.config.options, {
      cwd: this.baseDir,
      importFn: this.importFn,
      defaultExportName: 'default',
    });

    // This will bring Federation and Type Merging support
    appendPlugins.push(FederationPlugin);

    const builder = await getPostGraphileBuilder(pgPool, this.config.schemaName || 'public', {
      dynamicJson: true,
      subscriptions: 'subscriptions' in this.config ? this.config.subscriptions : true,
      live: 'live' in this.config ? this.config.live : true,
      readCache: cachedIntrospection,
      writeCache: !cachedIntrospection && dummyCacheFilePath,
      setWriteCacheCallback: fn => {
        writeCache = fn;
      },
      appendPlugins,
      skipPlugins,
      ...options,
    });

    const schema = builder.buildSchema();

    if (!cachedIntrospection) {
      await writeCache();
      cachedIntrospection = await readJSON(dummyCacheFilePath);
      await this.pgCache.set(cachedIntrospection);
    }

    this.pubsub.subscribe('executionDone', ({ contextValue }) => contextValue.pgClient.release());

    return {
      schema,
      contextBuilder: async () => {
        // In order to prevent unnecessary connections
        // We need to implement some kind of lazy connections
        let pgClient$: Promise<pg.PoolClient>;
        return {
          pgClient: new Proxy(
            {},
            {
              get: (_, pKey) => {
                if (pKey !== 'release' && !pgClient$) {
                  pgClient$ = pgPool.connect();
                }
                return (...args: any[]) => pgClient$?.then(pgClient => pgClient[pKey](...args));
              },
            }
          ),
        };
      },
    };
  }
}
