// eslint-disable-next-line import/no-nodejs-modules
import { tmpdir } from 'os';
import pg from 'pg';
import type { Plugin } from 'postgraphile';
import { withPostGraphileContext } from 'postgraphile';
import { getPostGraphileBuilder } from 'postgraphile-core';
import { type Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type {
  ImportFn,
  MeshHandler,
  MeshHandlerOptions,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

export default class PostGraphileHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.PostGraphileHandler;
  private baseDir: string;
  private pubsub: PubSub;
  private pgCache: any;
  private log: Logger;
  private importFn: ImportFn;
  private pgPool?: { end(): Promise<void> };

  constructor({
    name,
    config,
    baseDir,
    pubsub,
    store,
    log,
    importFn,
  }: MeshHandlerOptions<YamlConfig.PostGraphileHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.pgCache = store.proxy('pgCache.json', PredefinedProxyOptions.JsonWithoutValidation);
    this.log = log;
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
      const pgLogger = this.log.child('PostgreSQL');
      pgPool = new pg.Pool({
        connectionString: stringInterpolator.parse(this.config.connectionString, {
          env: globalThis.process?.env,
        }),
        log: messages => pgLogger.debug(messages),
        ...this.config?.pool,
      });
    }

    this.pgPool = pgPool;

    const cacheKey = this.name + '_introspection.json';
    const pathModule = globalThis.process?.getBuiltinModule?.('node:path');
    if (!pathModule) {
      throw new Error('Node.js path module is required for PostGraphile handler');
    }
    const dummyCacheFilePath = pathModule.join(tmpdir(), cacheKey);
    let cachedIntrospection = await this.pgCache.get();

    let writeCache: () => Promise<void>;

    const appendPlugins = await Promise.all<Plugin>(
      (this.config.appendPlugins || []).map(pluginName =>
        loadFromModuleExportExpression<any>(pluginName, {
          cwd: this.baseDir,
          importFn: this.importFn,
          defaultExportName: 'default',
        }),
      ),
    );
    const skipPlugins = await Promise.all<Plugin>(
      (this.config.skipPlugins || []).map(pluginName =>
        loadFromModuleExportExpression<any>(pluginName, {
          cwd: this.baseDir,
          importFn: this.importFn,
          defaultExportName: 'default',
        }),
      ),
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
    const defaultExecutor = createDefaultExecutor(schema);

    if (!cachedIntrospection) {
      await writeCache();
      cachedIntrospection = await import(dummyCacheFilePath);
      await this.pgCache.set(cachedIntrospection);
    }

    let contextOptions = await loadFromModuleExportExpression<any>(this.config.contextOptions, {
      cwd: this.baseDir,
      importFn: this.importFn,
      defaultExportName: 'default',
    });
    if (typeof contextOptions !== 'function') contextOptions = () => ({});

    return {
      schema,
      executor({
        document,
        variables,
        context: meshContext,
        rootValue,
        operationName,
        extensions,
      }) {
        return withPostGraphileContext(
          {
            pgPool,
            queryDocumentAst: document,
            operationName,
            variables,
            ...contextOptions(meshContext),
          },
          function withPgContextCallback(pgContext) {
            return defaultExecutor({
              document,
              variables,
              context: {
                ...meshContext,
                ...pgContext,
              },
              rootValue,
              operationName,
              extensions,
            }) as any;
          },
        ) as any;
      },
    };
  }

  [DisposableSymbols.asyncDispose]() {
    if (this.pgPool) {
      this.log.debug('Destroying PostgreSQL pool');
      return this.pgPool.end();
    }
  }
}
