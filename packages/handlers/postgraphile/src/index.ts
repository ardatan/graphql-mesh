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
import { Plugin, withPostGraphileContext } from 'postgraphile';
import { getPostGraphileBuilder } from 'postgraphile-core';
import pg from 'pg';
import { path } from '@graphql-mesh/cross-helpers';
import { tmpdir } from 'os';
import { jitExecutorFactory, loadFromModuleExportExpression, stringInterpolator } from '@graphql-mesh/utils';
import { PredefinedProxyOptions } from '@graphql-mesh/store';

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
    let pgPool: any;

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
        connectionString: stringInterpolator.parse(this.config.connectionString, { env: process.env }),
        log: messages => pgLogger.debug(() => messages),
        ...this.config?.pool,
      });
    }

    await this.pubsub.subscribe('destroy', () => {
      this.logger.debug(() => 'Destroying PostgreSQL pool');
      pgPool.end();
    });

    const cacheKey = this.name + '_introspection.json';

    const dummyCacheFilePath = path.join(tmpdir(), cacheKey);
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
      simpleCollections: 'both',
      ...options,
    });

    const schema = builder.buildSchema();

    if (!cachedIntrospection) {
      await writeCache();
      cachedIntrospection = await import(dummyCacheFilePath);
      await this.pgCache.set(cachedIntrospection);
    }

    const jitExecutor = jitExecutorFactory(schema, this.name, this.logger);

    return {
      schema,
      executor: ({ document, variables, context: meshContext, rootValue, operationName, extensions }) =>
        withPostGraphileContext(
          {
            pgPool,
            queryDocumentAst: document,
            operationName,
            variables,
          },
          pgContext =>
            jitExecutor({
              document,
              variables,
              context: {
                ...meshContext,
                ...pgContext,
              },
              rootValue,
              operationName,
              extensions,
            }) as any
        ) as any,
    };
  }
}
