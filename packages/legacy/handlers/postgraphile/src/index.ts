import type { GraphQLSchema } from 'graphql';
import pg from 'pg';
import { process } from '@graphql-mesh/cross-helpers';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type {
  ImportFn,
  MeshHandler,
  MeshHandlerOptions,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { dispose, isDisposable, loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { getSqlExecutor, loadGraphQLSchemaFromSql, wrapPgPoolAsSqlClient } from '@omnigraph/sql';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

/**
 * Legacy v0 Postgres handler (`postgraphile`). Under the hood `@omnigraph/sql` +
 * `transport-sql` — not the PostGraphile runtime. See the package changeset for
 * migration notes (plugins / live queries / Graphile context options removed).
 */
export default class PostGraphileHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.PostGraphileHandler;
  private baseDir: string;
  private importFn: ImportFn;
  private schemaProxy: StoreProxy<GraphQLSchema>;
  private disposableResource?: Disposable | AsyncDisposable;

  constructor({
    name,
    config,
    baseDir,
    store,
    importFn,
  }: MeshHandlerOptions<YamlConfig.PostGraphileHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.importFn = importFn;
    this.schemaProxy = store.proxy(
      'schema.graphql',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
  }

  async getMeshSource(): Promise<MeshSource> {
    const connectionString = resolveConnectionString(this.config);
    const schemaName = resolveSchemaName(this.config.schemaName);

    const schema = await this.schemaProxy.getWithSet(() =>
      loadGraphQLSchemaFromSql(this.name, {
        endpoint: connectionString,
        schema: schemaName,
        includeTables: this.config.tables,
        tableFields: this.config.tableFields,
        cwd: this.baseDir,
      }),
    );

    let client;
    if (this.config.pool != null) {
      const pool =
        typeof this.config.pool === 'string'
          ? await loadFromModuleExportExpression(this.config.pool, {
              cwd: this.baseDir,
              defaultExportName: 'default',
              importFn: this.importFn,
            })
          : this.config.pool;
      // Existing `pg.Pool` instance → wrap. Plain settings objects fall through to
      // getSqlExecutor, which opens its own pool from `@transport(location)`.
      if (pool && typeof pool === 'object' && 'connect' in pool) {
        client = wrapPgPoolAsSqlClient(pool as pg.Pool);
      }
    }

    const executor = await getSqlExecutor({
      subgraph: schema,
      cwd: this.baseDir,
      client,
    });

    if (isDisposable(executor)) {
      this.disposableResource = executor;
    }

    return {
      schema,
      executor,
    };
  }

  [DisposableSymbols.asyncDispose]() {
    if (this.disposableResource) {
      return dispose(this.disposableResource);
    }
  }
}

function resolveConnectionString(config: YamlConfig.PostGraphileHandler): string {
  if (!config.connectionString) {
    throw new Error(
      '@graphql-mesh/postgraphile: `connectionString` is required (postgres://… URI).',
    );
  }
  return stringInterpolator.parse(config.connectionString, { env: process.env });
}

/** Omnigraph SQL introspects a single Postgres schema; arrays take the first entry. */
function resolveSchemaName(schemaName: string | string[] | undefined): string {
  if (schemaName == null) return 'public';
  if (Array.isArray(schemaName)) return schemaName[0] || 'public';
  return schemaName || 'public';
}
