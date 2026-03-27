import { execute } from 'grafast';
import pg from 'pg';
import type { PostGraphileInstance } from 'postgraphile';
import { postgraphile } from 'postgraphile';
import { PostGraphileAmberPreset } from 'postgraphile/presets/amber';
import { makePgService } from '@dataplan/pg/adaptors/pg';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type {
  ImportFn,
  Logger,
  MeshHandler,
  MeshHandlerOptions,
  MeshPubSub,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';

declare global {
  namespace Grafast {
    interface RequestContext {
      meshContext?: Record<string, any>;
    }
  }
}

export default class PostGraphileHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.PostGraphileHandler;
  private baseDir: string;
  private pubsub: MeshPubSub;
  private logger: Logger;
  private importFn: ImportFn;

  constructor({
    name,
    config,
    baseDir,
    pubsub,
    logger,
    importFn,
  }: MeshHandlerOptions<YamlConfig.PostGraphileHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.logger = logger;
    this.importFn = importFn;
  }

  async getMeshSource(): Promise<MeshSource> {
    let pgPool: pg.Pool | undefined;

    if (typeof this.config?.pool === 'string') {
      pgPool = await loadFromModuleExportExpression<pg.Pool>(this.config.pool, {
        cwd: this.baseDir,
        importFn: this.importFn,
        defaultExportName: 'default',
      });
    }

    if (!pgPool || !('connect' in pgPool)) {
      const pgLogger = this.logger.child('PostgreSQL');
      pgPool = new pg.Pool({
        connectionString: stringInterpolator.parse(this.config.connectionString, {
          env: process.env,
        }),
        log: messages => pgLogger.debug(messages),
        ...this.config?.pool,
      });
    }

    const id = this.pubsub.subscribe('destroy', () => {
      this.pubsub.unsubscribe(id);
      this.logger.debug('Destroying PostgreSQL pool');
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      pgPool.end();
    });

    let contextOptions = await loadFromModuleExportExpression<any>(this.config.contextOptions, {
      cwd: this.baseDir,
      importFn: this.importFn,
      defaultExportName: 'default',
    });
    if (typeof contextOptions !== 'function') contextOptions = () => ({});

    const appendPlugins = await Promise.all<GraphileConfig.Plugin>(
      (this.config.appendPlugins || []).map(pluginName =>
        loadFromModuleExportExpression<any>(pluginName, {
          cwd: this.baseDir,
          importFn: this.importFn,
          defaultExportName: 'default',
        }),
      ),
    );
    const disablePlugins = (this.config.skipPlugins || []).map(
      name => name as keyof GraphileConfig.Plugins,
    );

    const externalOptions = await loadFromModuleExportExpression<GraphileConfig.Preset>(
      this.config.options,
      {
        cwd: this.baseDir,
        importFn: this.importFn,
        defaultExportName: 'default',
      },
    );

    const preset: GraphileConfig.Preset = {
      extends: [PostGraphileAmberPreset],
      pgServices: [
        makePgService({
          pool: pgPool,
          schemas: this.config.schemaName || ['public'],
        }),
      ],
      plugins: appendPlugins.length ? appendPlugins : undefined,
      disablePlugins: disablePlugins.length ? disablePlugins : undefined,
      grafast: {
        context: async (reqCtx: Grafast.RequestContext) => {
          const meshCtx = reqCtx.meshContext;
          return meshCtx ? contextOptions(meshCtx) : {};
        },
      },
      ...externalOptions,
    };

    const instance: PostGraphileInstance = postgraphile(preset);
    const { schema, resolvedPreset } = await instance.getSchemaResult();

    return {
      schema,
      executor({ document, variables, context: meshContext, rootValue, operationName }) {
        return execute({
          schema,
          document,
          variableValues: variables,
          contextValue: meshContext,
          rootValue,
          operationName: operationName ?? undefined,
          resolvedPreset,
          requestContext: { meshContext },
        }) as any;
      },
    };
  }
}
