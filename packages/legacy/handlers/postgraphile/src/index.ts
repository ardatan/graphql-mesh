import type { GraphQLSchema } from 'graphql';
import type { Pool as PgPool } from 'pg';
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
import {
  createSqlClient,
  getSqlExecutor,
  loadGraphQLSchemaFromSql,
  wrapPgPoolAsSqlClient,
} from '@omnigraph/sql';
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
    const schemaName = resolveSchemaName(this.config.schemaName);
    const pool = await resolvePgPool(this.config, this.baseDir, this.importFn);
    const connectionString = resolveConnectionString(this.config, pool);
    if (!pool && !connectionString) {
      throw new Error(
        '@graphql-mesh/postgraphile: provide `connectionString` (postgres://… URI) and/or `pool` (pg.Pool / module export).',
      );
    }

    // Prefer an explicit URI for `@transport(location)`; pool-only falls back to
    // pool.options.connectionString or a postgres:// stamp inside the loader.
    const endpoint =
      connectionString ||
      poolConnectionString(pool) ||
      // Loader accepts pgPool without a real URI for introspection.
      undefined;

    const schema = await this.schemaProxy.getWithSet(() =>
      loadGraphQLSchemaFromSql(this.name, {
        endpoint,
        schema: schemaName,
        includeTables: this.config.tables,
        tableFields: this.config.tableFields,
        pgPool: pool,
        cwd: this.baseDir,
      }),
    );

    // Always bind the executor to the *current* pool / URI so a cached schema's
    // `@transport(location)` cannot point queries at a previous database.
    const client = pool
      ? wrapPgPoolAsSqlClient(pool)
      : createSqlClient({
          adapter: 'postgres',
          location: connectionString!,
          schema: schemaName,
          cwd: this.baseDir,
        });

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

async function resolvePgPool(
  config: YamlConfig.PostGraphileHandler,
  baseDir: string,
  importFn: ImportFn,
): Promise<PgPool | undefined> {
  if (config.pool == null) return undefined;
  const pool =
    typeof config.pool === 'string'
      ? await loadFromModuleExportExpression(config.pool, {
          cwd: baseDir,
          defaultExportName: 'default',
          importFn,
        })
      : config.pool;
  // Existing `pg.Pool` instance → use. Plain settings objects are ignored.
  if (pool && typeof pool === 'object' && 'connect' in pool) {
    return pool as PgPool;
  }
  return undefined;
}

function poolConnectionString(pool: PgPool | undefined): string | undefined {
  if (!pool) return undefined;
  const opts = (pool as { options?: { connectionString?: string } }).options;
  const uri = opts?.connectionString;
  return uri && String(uri).trim() ? String(uri) : undefined;
}

function resolveConnectionString(
  config: YamlConfig.PostGraphileHandler,
  pool?: PgPool,
): string | undefined {
  if (config.connectionString) {
    return stringInterpolator.parse(config.connectionString, { env: process.env });
  }
  return poolConnectionString(pool);
}

/** Omnigraph SQL introspects a single Postgres schema; arrays take the first entry. */
function resolveSchemaName(schemaName: string | string[] | undefined): string {
  if (schemaName == null) return 'public';
  if (Array.isArray(schemaName)) return schemaName[0] || 'public';
  return schemaName || 'public';
}
