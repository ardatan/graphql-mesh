import { createPool, type Pool } from 'mysql2/promise';
import pg from 'pg';
import type { Pool as PgPool, PoolConfig as PgPoolConfig } from 'pg';
import { resolveSqlitePath } from './adapter.js';
import type { SqlAdapter, SqlClient, SqlTransportOptions } from './types.js';
import { parseSqlUri } from './uri.js';

/** Minimal `node:sqlite` DatabaseSync surface used by {@link createSqliteClient}. */
type NodeSqliteDatabase = {
  prepare(sql: string): {
    columns?: () => unknown[];
    all: (...params: any[]) => unknown[];
    run: (...params: any[]) => { changes?: number };
  };
  close(): void;
};

type NodeSqliteDatabaseSync = new (path: string) => NodeSqliteDatabase;

/**
 * Load `node:sqlite` only when the Node SQLite client path is selected.
 * `process.getBuiltinModule` avoids a static import (and `createRequire`) so
 * MySQL / Postgres / Bun.SQL can load on runtimes without that builtin.
 */
function loadNodeSqliteDatabaseSync(): NodeSqliteDatabaseSync {
  const getBuiltin = (
    process as NodeJS.Process & {
      getBuiltinModule?: (
        id: string,
      ) => { DatabaseSync?: new (path: string) => unknown } | undefined;
    }
  ).getBuiltinModule;
  const mod = typeof getBuiltin === 'function' ? getBuiltin('node:sqlite') : undefined;
  if (typeof mod?.DatabaseSync !== 'function') {
    throw new Error(
      'node:sqlite is not available in this runtime. Use Bun.SQL (omit preferNode) or Node >= 22.18.',
    );
  }
  return mod.DatabaseSync as NodeSqliteDatabaseSync;
}

/**
 * Options for {@link createSqlClient} — dialect + connection location plus
 * {@link SqlTransportOptions} pool / TLS / soft-delete fields.
 *
 * @example
 * ```ts
 * import { createSqlClient } from '@graphql-mesh/transport-sql';
 *
 * const client = createSqlClient({
 *   adapter: 'postgres',
 *   location: 'postgres://localhost/shop',
 *   schema: 'app',
 *   max: 10,
 * });
 * ```
 * @example
 * ```ts
 * createSqlClient({
 *   adapter: 'sqlite',
 *   location: 'file:./chinook.db',
 *   cwd: process.cwd(),
 * })
 * ```
 */
export interface CreateSqlClientOptions extends SqlTransportOptions {
  /**
   * SQL dialect for the client drivers (`postgres` → `pg`, `mysql` → `mysql2`,
   * `sqlite` → `node:sqlite` / `Bun.SQL`).
   *
   * @example 'postgres'
   */
  adapter: SqlAdapter;
  /**
   * Connection URI or sqlite path (same shapes as `loadSqlSubgraph` `endpoint`:
   * `postgres(ql)://…`, `mysql(2|s)://…`, `file:…`, `:memory:`, or a `*.db` path).
   *
   * @example 'postgres://localhost:5432/shop'
   * @example 'file:./chinook.db'
   */
  location: string;
  /**
   * Base directory joined onto relative sqlite paths before opening the DB.
   * When omitted, relative locations stay as given (Node/Bun resolve them from
   * the process cwd).
   *
   * @example process.cwd()
   */
  cwd?: string;
  /**
   * Force Node drivers (`pg` / `mysql2` / `node:sqlite`) even when
   * `globalThis.Bun.SQL` is present. Prefer this in unit tests that must not
   * depend on that client.
   *
   * @default false
   */
  preferNode?: boolean;
}

type BunSqlCtor = new (
  url?: string | object,
  options?: Record<string, unknown>,
) => {
  unsafe: (query: string, params?: unknown[] | Record<string, unknown>) => Promise<any>;
  close?: () => void | Promise<void>;
  end?: () => void | Promise<void>;
};

function getBunSqlCtor(): BunSqlCtor | undefined {
  const bun = (globalThis as { Bun?: { SQL?: BunSqlCtor } }).Bun;
  return typeof bun?.SQL === 'function' ? bun.SQL : undefined;
}

export function isBunSqlAvailable(): boolean {
  return getBunSqlCtor() != null;
}

/**
 * Open a {@link SqlClient} for the given adapter / location.
 * Prefers `Bun.SQL` when available unless {@link CreateSqlClientOptions.preferNode} is set.
 *
 * @example
 * ```ts
 * const client = createSqlClient({
 *   adapter: 'mysql',
 *   location: 'mysql://root@127.0.0.1/employees',
 *   max: 10,
 * });
 * ```
 */
export function createSqlClient(opts: CreateSqlClientOptions): SqlClient {
  if (!opts.preferNode && isBunSqlAvailable()) {
    return createBunSqlClient(opts);
  }
  switch (opts.adapter) {
    case 'sqlite':
      return createSqliteClient(opts.location, opts.cwd);
    case 'mysql':
      return createMysqlClient(opts);
    case 'postgres':
      return createPostgresClient(opts);
    default:
      throw new Error(`Unknown SQL adapter: ${opts.adapter as string}`);
  }
}

/**
 * Build Bun.SQL constructor options (exported for unit tests under Node).
 * Forwards `ssl.ca` / `rejectUnauthorized` into Bun's `tls` object.
 */
export function buildBunSqlCtorOptions(opts: CreateSqlClientOptions): Record<string, unknown> {
  const bunOpts: Record<string, unknown> = {
    adapter: opts.adapter === 'mysql' ? 'mysql' : opts.adapter,
  };
  if (opts.max != null) bunOpts.max = opts.max;
  if (opts.idleTimeout != null) bunOpts.idleTimeout = opts.idleTimeout;
  if (opts.connectionTimeout != null) bunOpts.connectionTimeout = opts.connectionTimeout;
  const tls = resolveBunTlsOption(opts.tls, opts.ssl);
  if (tls != null) bunOpts.tls = tls;
  // Per-connection GUC so every pooled Postgres connection gets the schema
  // (one-shot `SET search_path` only affects whichever connection ran it).
  // Explicit `public` is applied too — Postgres may otherwise prefer `"$user"`.
  const schema = opts.adapter === 'postgres' ? opts.schema?.trim() : undefined;
  if (schema) {
    const ident = `"${schema.replace(/"/g, '""')}"`;
    const prev =
      bunOpts.connection && typeof bunOpts.connection === 'object'
        ? (bunOpts.connection as Record<string, unknown>)
        : {};
    bunOpts.connection = { ...prev, search_path: ident };
  }
  return bunOpts;
}

/** Merge `tls` mode strings with optional `ssl.ca` / `rejectUnauthorized` for Bun.SQL. */
export function resolveBunTlsOption(
  tls: boolean | string | undefined,
  ssl?: { rejectUnauthorized?: boolean; ca?: string },
): boolean | string | { rejectUnauthorized?: boolean; ca?: string } | undefined {
  const mode = typeof tls === 'string' ? tls.toLowerCase() : undefined;
  // Explicit disable must win over URI `sslmode=require` — omit (`undefined`)
  // leaves Bun on the URL's TLS mode.
  if (tls === false || mode === 'disable' || mode === 'false') {
    return false;
  }
  const insecure = mode === 'insecure' || mode === 'no-verify' || ssl?.rejectUnauthorized === false;
  if (ssl?.ca != null || ssl?.rejectUnauthorized != null || insecure) {
    return {
      rejectUnauthorized: !insecure,
      ...(ssl?.ca != null ? { ca: ssl.ca } : {}),
    };
  }
  if (tls === true || mode === 'true' || mode === 'require') {
    return true;
  }
  // Pass through other Bun tls mode strings (e.g. custom engine names).
  if (typeof tls === 'string') {
    return tls;
  }
  return undefined;
}

/**
 * Wrap Bun's native `SQL` client when running under Bun.
 * Uses `sql.unsafe(query, params)` so our adapter placeholders (`$1` / `?`) work as-is.
 */
export function createBunSqlClient(opts: CreateSqlClientOptions): SqlClient {
  const BunSQL = getBunSqlCtor();
  if (!BunSQL) {
    throw new Error('Bun.SQL is not available in this runtime');
  }

  const bunOpts = buildBunSqlCtorOptions(opts);

  // Bun resolves relative sqlite paths from process.cwd — honor Mesh `cwd` first.
  const location =
    opts.adapter === 'sqlite' ? resolveSqlitePath(opts.location, opts.cwd) : opts.location;
  const sql = new BunSQL(location, bunOpts);

  return {
    adapter: opts.adapter,
    async query<T = Record<string, unknown>>(query: string, params: unknown[] = []) {
      const result = await sql.unsafe(query, params);
      const rows = normalizeBunRows<T>(result);
      const rowCount =
        typeof result?.count === 'number'
          ? result.count
          : typeof result?.affectedRows === 'number'
            ? result.affectedRows
            : rows.length;
      // Bun MySQL exposes AUTO_INCREMENT via lastInsertRowid (prototype accessor).
      const lastId = opts.adapter === 'mysql' ? result?.lastInsertRowid : undefined;
      return {
        rows,
        rowCount,
        ...(lastId != null && Number(lastId) !== 0 ? { insertId: lastId as number | bigint } : {}),
      };
    },
    async dispose() {
      if (typeof sql.close === 'function') {
        await sql.close();
      } else if (typeof sql.end === 'function') {
        await sql.end();
      }
    },
  };
}

function normalizeBunRows<T>(result: any): T[] {
  if (result == null) return [];
  // Copy into a plain array — Bun results are array-like and may carry extra props (`count`).
  if (typeof result.length === 'number') {
    return Array.from({ length: result.length }, (_, i) => result[i] as T);
  }
  if (Array.isArray(result)) {
    return [...(result as T[])];
  }
  return [];
}

type PgPoolConnectable = {
  on?(
    event: 'connect' | 'acquire',
    listener: (client: { query: (sql: string) => Promise<unknown> }) => void,
  ): unknown;
};

/**
 * Apply Postgres `search_path` on pooled connections (including idle clients already
 * in a supplied pool). Uses `acquire` so introspection that left a session at the
 * default path still gets the selected schema before the next query. Explicit
 * `public` is applied too — Postgres may otherwise prefer `"$user"` first.
 *
 * Patches `client.query` so callers (including `@dataplan/pg`) await an in-flight
 * SET before issuing SQL. Pool `connect`/`acquire` listeners cannot block checkout,
 * so this query wrapper is the await barrier.
 */
/** One schema binding per physical pool — conflicting wrappers must use separate pools. */
const poolSchemaBindings = new WeakMap<object, string>();

export function applyPgPoolSearchPath(pool: PgPoolConnectable, schema?: string): void {
  const trimmed = schema?.trim();
  if (!trimmed) return;
  if (typeof pool.on !== 'function') {
    throw new Error(
      `SQL transport: schema "${trimmed}" was requested but the pool cannot emit connect/acquire events to enforce search_path. Pass a real pg.Pool (or omit schema).`,
    );
  }
  const bound = poolSchemaBindings.get(pool);
  if (bound === trimmed) {
    // Already initialized for this schema — do not stack acquire/connect listeners.
    return;
  }
  if (bound != null) {
    throw new Error(
      `SQL transport: shared pg.Pool already bound to schema "${bound}"; refusing conflicting schema "${trimmed}". Use a dedicated pool per schema.`,
    );
  }
  poolSchemaBindings.set(pool, trimmed);
  const ident = `"${trimmed.replace(/"/g, '""')}"`;
  const sql = `SET search_path TO ${ident}`;
  const seen = new WeakSet<object>();
  const pending = new WeakMap<object, Promise<void>>();
  const failed = new WeakMap<object, unknown>();
  const origQueryByClient = new WeakMap<object, (...args: any[]) => any>();

  const patchClient = (client: { query: (...args: any[]) => any }) => {
    if (origQueryByClient.has(client)) return;
    const origQuery = client.query.bind(client);
    origQueryByClient.set(client, origQuery);
    client.query = ((...args: any[]) => {
      const fail = failed.get(client);
      if (fail !== undefined) {
        const cb = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
        if (cb) {
          queueMicrotask(() => cb(fail));
          return;
        }
        return Promise.reject(fail);
      }
      const wait = pending.get(client);
      if (wait) {
        const cb = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
        if (cb) {
          // Promise-style SET wait; invoke callback-form caller after setup.
          wait.then(
            () => origQuery(...args),
            err => cb(err),
          );
          return;
        }
        return wait.then(() => origQuery(...args));
      }
      return origQuery(...args);
    }) as typeof client.query;
  };

  const ensure = (client: { query: (q: string) => Promise<unknown> }) => {
    if (seen.has(client)) return;
    patchClient(client as { query: (...args: any[]) => any });
    if (pending.has(client)) return;
    // Retry SET after a prior failure on this idle client.
    failed.delete(client);
    const orig = origQueryByClient.get(client)!;
    const p = Promise.resolve(orig(sql)).then(
      () => {
        seen.add(client);
        pending.delete(client);
      },
      (err: unknown) => {
        // Fail closed: waiters reject; further queries reject until next acquire
        // retries SET. Leave unseen so a later checkout can recover.
        // Do NOT release here — `pool.query` / the caller releases once on error;
        // releasing first causes a double-release throw in pg-pool.
        failed.set(client, err);
        pending.delete(client);
        throw err;
      },
    );
    // Swallow when SET fails before any caller attaches to `pending` (avoids
    // unhandledRejection). Later `.then` / query waiters still see the error.
    p.catch(() => undefined);
    pending.set(client, p);
  };
  pool.on('acquire', ensure);
  pool.on('connect', ensure);
}

/**
 * Options when wrapping an existing `pg.Pool` as {@link SqlClient}.
 *
 * @example
 * ```ts
 * wrapPgPoolAsSqlClient(pool, { schema: 'app' })
 * ```
 */
export interface WrapPgPoolAsSqlClientOpts {
  /**
   * Bind `search_path` on every pooled connection (including idle clients
   * already in a supplied pool). One schema per shared pool; a second wrap
   * with a different schema is rejected. When omitted, Mesh does not issue
   * `SET search_path`.
   *
   * @example 'app'
   * @example 'public'
   */
  schema?: string;
  /**
   * When true, `dispose()` calls `pool.end()`. Use for pools this transport
   * created. Shared/injected pools (Mesh handlers) leave this false so other
   * consumers keep the pool.
   *
   * @default false
   */
  endPool?: boolean;
}

/**
 * Wrap an existing `pg.Pool` (or compatible) as SqlClient.
 * Pass `schema` to enforce `search_path` on every pooled connection (TLS / dial
 * settings on the supplied pool are preserved).
 *
 * @example
 * ```ts
 * import pg from 'pg';
 * import { wrapPgPoolAsSqlClient } from '@graphql-mesh/transport-sql';
 *
 * const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
 * const client = wrapPgPoolAsSqlClient(pool, { schema: 'public' });
 * ```
 */
export function wrapPgPoolAsSqlClient(
  pool: {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
    end?: () => Promise<void>;
  } & PgPoolConnectable,
  opts?: WrapPgPoolAsSqlClientOpts,
): SqlClient {
  applyPgPoolSearchPath(pool, opts?.schema);
  const endPool = opts?.endPool === true;
  const client: SqlClient = {
    adapter: 'postgres',
    // Expose real pg.Pool when present for `@dataplan/pg`.
    pgPool: 'connect' in pool ? (pool as PgPool) : undefined,
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params);
      return {
        rows: (result.rows || []) as T[],
        rowCount: Number(result.rowCount ?? result.rows?.length ?? 0),
      };
    },
    async dispose() {
      if (endPool && typeof pool.end === 'function') {
        await pool.end();
      }
    },
  };
  return client;
}

/** mysql2 `Types.BIT` — single-bit columns map to GraphQLBoolean and need Buffer→boolean. */
const MYSQL_TYPE_BIT = 16;

/**
 * Convert mysql2 `BIT(1)` Buffer values to boolean before GraphQL serialization.
 * Wider `BIT(n)` stays binary. NULL is preserved.
 */
function coerceMysqlBit1Rows(
  rows: Array<Record<string, unknown>>,
  fields:
    | Array<{
        name?: string;
        type?: number | string;
        columnType?: number;
        length?: number;
        columnLength?: number;
      }>
    | undefined,
): Array<Record<string, unknown>> {
  if (!rows.length || !fields?.length) return rows;
  const bit1: string[] = [];
  for (const f of fields) {
    const type = f.type ?? f.columnType;
    const isBit = type === MYSQL_TYPE_BIT || type === 'BIT';
    const len = f.length ?? f.columnLength;
    if (isBit && len === 1 && f.name) bit1.push(f.name);
  }
  if (!bit1.length) return rows;
  return rows.map(row => {
    let changed = false;
    const next: Record<string, unknown> = { ...row };
    for (const name of bit1) {
      const v = row[name];
      if (v == null) continue;
      if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) {
        next[name] = v.length > 0 && v[0] !== 0;
        changed = true;
      } else if (v instanceof Uint8Array) {
        next[name] = v.length > 0 && v[0] !== 0;
        changed = true;
      }
    }
    return changed ? next : row;
  });
}

/** `mysql2/promise` (or `.promise()`) pool wrapper. */
function mysqlPromiseClient(p: {
  query: (...args: any[]) => any;
  end?: (...args: any[]) => any;
}): SqlClient {
  return {
    adapter: 'mysql',
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const [result, fields] = await p.query(sql, params);
      if (Array.isArray(result)) {
        const rows = coerceMysqlBit1Rows(result as Array<Record<string, unknown>>, fields) as T[];
        return { rows, rowCount: rows.length };
      }
      const header = result as { affectedRows?: number; insertId?: number | bigint };
      return {
        rows: [] as T[],
        rowCount: Number(header.affectedRows ?? 0),
        ...(header.insertId != null && Number(header.insertId) !== 0
          ? { insertId: header.insertId }
          : {}),
      };
    },
    async dispose() {
      if (typeof p.end === 'function') {
        await p.end();
      }
    },
  };
}

/** Classic `mysql` callback pool — `query`/`end` take node-style callbacks. */
function mysqlCallbackClient(pool: {
  query: (...args: any[]) => any;
  end?: (...args: any[]) => any;
}): SqlClient {
  return {
    adapter: 'mysql',
    query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      return new Promise<{ rows: T[]; rowCount: number; insertId?: number | bigint }>(
        (resolve, reject) => {
          pool.query(sql, params, (err: Error | null, result: any, fields?: any[]) => {
            if (err) {
              reject(err);
              return;
            }
            if (Array.isArray(result)) {
              const rows = coerceMysqlBit1Rows(
                result as Array<Record<string, unknown>>,
                fields,
              ) as T[];
              resolve({ rows, rowCount: rows.length });
              return;
            }
            const header = result as { affectedRows?: number; insertId?: number | bigint };
            resolve({
              rows: [] as T[],
              rowCount: Number(header?.affectedRows ?? 0),
              ...(header?.insertId != null && Number(header.insertId) !== 0
                ? { insertId: header.insertId }
                : {}),
            });
          });
        },
      );
    },
    dispose() {
      if (typeof pool.end !== 'function') return;
      return new Promise<void>((resolve, reject) => {
        pool.end((err: Error | null) => (err ? reject(err) : resolve()));
      });
    },
  };
}

/**
 * Wrap an existing `mysql` / `mysql2` pool (legacy handler `pool` config) as SqlClient.
 *
 * @example
 * ```ts
 * import { createPool } from 'mysql2/promise';
 * import { wrapMysqlPoolAsSqlClient } from '@graphql-mesh/transport-sql';
 *
 * const pool = createPool(process.env.MYSQL_URL!);
 * const client = wrapMysqlPoolAsSqlClient(pool);
 * ```
 */
export function wrapMysqlPoolAsSqlClient(pool: {
  query: (...args: any[]) => any;
  end?: (...args: any[]) => any;
  promise?: () => { query: (...args: any[]) => any; end?: (...args: any[]) => any };
  execute?: (...args: any[]) => any;
}): SqlClient {
  // mysql2 callback pool exposes `.promise()`; mysql2/promise createPool does not.
  if (typeof pool.promise === 'function') {
    return mysqlPromiseClient(pool.promise());
  }
  // Classic `mysql` has no `execute` (prepared statements); mysql2 (promise or
  // callback-via-promise()) does. Select by API shape — never probe with a query.
  if (typeof pool.execute !== 'function') {
    return mysqlCallbackClient(pool);
  }
  // Already-promisified pool (`mysql2/promise` or handler-injected promise pool).
  return mysqlPromiseClient(pool);
}

function createSqliteClient(location: string, cwd?: string): SqlClient {
  const DatabaseSync = loadNodeSqliteDatabaseSync();
  const dbPath = resolveSqlitePath(location, cwd);
  const db = new DatabaseSync(dbPath);
  return {
    adapter: 'sqlite',
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const stmt = db.prepare(sql);
      // node:sqlite rejects boolean binds — coerce GraphQLBoolean filters/writes.
      const bind = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
      // Prefer statement metadata over SQL-text heuristics — a table named
      // `"returning"` must not look like a RETURNING clause.
      const cols = typeof stmt.columns === 'function' ? stmt.columns() : null;
      const returnsRows =
        cols != null
          ? cols.length > 0
          : /^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);
      if (returnsRows) {
        const rows = stmt.all(...bind) as T[];
        return { rows, rowCount: rows.length };
      }
      const result = stmt.run(...bind);
      return {
        rows: [] as T[],
        rowCount: Number(result.changes ?? 0),
      };
    },
    dispose() {
      db.close();
    },
  };
}

function createMysqlClient(opts: CreateSqlClientOptions): SqlClient {
  const parsed = parseSqlUri(opts.location);
  if (parsed.adapter !== 'mysql') {
    throw new Error(`Expected mysql URI, got ${parsed.adapter}`);
  }
  const ssl = resolveSslOption(opts.tls, parsed, opts.ssl);
  // mysql2 `ssl` is `string | SslOptions` only; omit when disabled (`false`).
  const pool: Pool = createPool({
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    ...(ssl ? { ssl } : {}),
    supportBigNumbers: true,
    bigNumberStrings: true,
    connectionLimit: opts.max ?? 10,
    idleTimeout: opts.idleTimeout != null ? opts.idleTimeout * 1000 : undefined,
    connectTimeout: opts.connectionTimeout != null ? opts.connectionTimeout * 1000 : undefined,
  });
  return wrapMysqlPoolAsSqlClient(pool);
}

function createPostgresClient(opts: CreateSqlClientOptions): SqlClient {
  const parsed = parseSqlUri(opts.location);
  if (parsed.adapter !== 'postgres') {
    throw new Error(`Expected postgres URI, got ${parsed.adapter}`);
  }
  const ssl = resolveSslOption(opts.tls, parsed, opts.ssl);
  // Discrete fields so URI `sslmode` cannot replace an explicit `ssl.ca` object.
  const pool = new pg.Pool(
    pgPoolConfigFromLocation(opts.location, {
      ssl,
      max: opts.max ?? 10,
      idleTimeoutMillis: opts.idleTimeout != null ? opts.idleTimeout * 1000 : undefined,
      connectionTimeoutMillis:
        opts.connectionTimeout != null ? opts.connectionTimeout * 1000 : undefined,
    }),
  );
  // Idle-client failures emit `error` on the pool; without a listener Node aborts.
  pool.on('error', () => {
    // pg discards the broken client; the next query opens a fresh connection.
  });
  applyPgPoolSearchPath(pool, opts.schema);
  return wrapPgPoolAsSqlClient(pool, { endPool: true });
}

/** URI query keys consumed by {@link resolveSslOption} — not passed through to `pg.Pool`. */
const PG_URI_SSL_PARAMS = new Set(['sslmode', 'ssl', 'tls']);

/**
 * Postgres URI query params we map onto `pg.Pool` config. Unknown keys are rejected
 * so the transport does not silently drop connection settings.
 */
const PG_URI_POOL_PARAMS = new Set([
  'host',
  'port',
  'application_name',
  'options',
  'connect_timeout',
  'client_encoding',
]);

/**
 * Build a `pg.Pool` config from a postgres URI using discrete connection fields.
 * Prefer this over `{ connectionString, ssl }` so URI `sslmode` / `ssl` query
 * params cannot override an explicit `ssl` object (e.g. private CA).
 *
 * Honors URI `?host=` (Unix socket), `application_name`, `options`, etc. Omits
 * host/port when absent so `pg` can use `PGHOST` / `PGPORT`.
 */
export function pgPoolConfigFromLocation(
  location: string,
  extras?: {
    ssl?: false | { rejectUnauthorized: boolean; ca?: string } | undefined;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  },
): PgPoolConfig {
  const parsed = parseSqlUri(location);
  if (parsed.adapter !== 'postgres') {
    throw new Error(`Expected postgres URI, got ${parsed.adapter}`);
  }

  // Lowercase query keys before lookup so `?HOST=` / `?Application_Name=` work
  // after the same case-insensitive allow-list check.
  const sp: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.searchParams || {})) {
    const lower = key.toLowerCase();
    if (PG_URI_SSL_PARAMS.has(lower)) {
      sp[lower] = value;
      continue;
    }
    if (!PG_URI_POOL_PARAMS.has(lower)) {
      throw new Error(
        `Unsupported postgres URI query parameter "${key}". Supported: ${[...PG_URI_POOL_PARAMS].join(', ')} (plus sslmode/ssl/tls).`,
      );
    }
    sp[lower] = value;
  }

  // Query `host` wins (e.g. `postgres:///db?host=/var/run/postgresql`).
  const host = sp.host || parsed.host;
  const portRaw = sp.port || (parsed.port != null ? String(parsed.port) : undefined);
  const port = portRaw != null && portRaw !== '' ? Number(portRaw) : undefined;

  const config: PgPoolConfig = {
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
  };
  // Pass `false` through so PGSSLMODE cannot re-enable TLS; omit when undefined.
  if (extras?.ssl !== undefined) {
    config.ssl = extras.ssl;
  }
  if (host) config.host = host;
  if (port != null && !Number.isNaN(port)) config.port = port;
  if (sp.application_name) config.application_name = sp.application_name;
  if (sp.options) config.options = sp.options;
  if (sp.connect_timeout != null && sp.connect_timeout !== '') {
    const seconds = Number(sp.connect_timeout);
    if (!Number.isNaN(seconds)) {
      config.connectionTimeoutMillis = seconds * 1000;
    }
  }
  if (sp.client_encoding) {
    // pg reads encoding from startup options; surface via options GUC when unset.
    config.options = config.options
      ? `${config.options} -c client_encoding=${sp.client_encoding}`
      : `-c client_encoding=${sp.client_encoding}`;
  }
  if (extras?.max != null) config.max = extras.max;
  if (extras?.idleTimeoutMillis != null) config.idleTimeoutMillis = extras.idleTimeoutMillis;
  if (extras?.connectionTimeoutMillis != null) {
    config.connectionTimeoutMillis = extras.connectionTimeoutMillis;
  }
  return config;
}

/**
 * TLS on by default verifies certificates (`rejectUnauthorized: true`).
 * Opt out explicitly with `tls: "insecure"` / `"no-verify"` or URI `sslmode=no-verify`.
 * Explicit disable returns `false` (not `undefined`) so drivers do not fall back to
 * env defaults such as `PGSSLMODE`. `ssl.ca` / `ssl.rejectUnauthorized` merge when on.
 * Shared by runtime clients and MySQL/Postgres introspection.
 */
export function resolveSslOption(
  option: boolean | string | undefined,
  parsed: { ssl?: boolean; searchParams?: Record<string, string> },
  sslDetails?: { rejectUnauthorized?: boolean; ca?: string },
): false | { rejectUnauthorized: boolean; ca?: string } | undefined {
  const mode = typeof option === 'string' ? option.toLowerCase() : undefined;
  const sslmode = String(parsed.searchParams?.sslmode || '').toLowerCase();
  if (
    option === false ||
    mode === 'disable' ||
    mode === 'false' ||
    sslmode === 'disable' ||
    sslmode === 'false'
  ) {
    return false;
  }
  const insecure =
    mode === 'insecure' ||
    mode === 'no-verify' ||
    sslmode === 'no-verify' ||
    sslmode === 'insecure' ||
    sslDetails?.rejectUnauthorized === false;
  // URI sslmodes that request TLS (verified or not). `parsed.ssl` alone is not enough
  // for postgres `sslmode=no-verify` / `verify-full` (parser only flags `require`).
  const uriWantsTls =
    sslmode === 'require' ||
    sslmode === 'verify-ca' ||
    sslmode === 'verify-full' ||
    sslmode === 'no-verify' ||
    sslmode === 'insecure' ||
    sslmode === 'true';
  const enabled =
    option === true ||
    mode === 'true' ||
    mode === 'require' ||
    mode === 'insecure' ||
    mode === 'no-verify' ||
    mode === 'verify-ca' ||
    mode === 'verify-full' ||
    Boolean(parsed.ssl) ||
    uriWantsTls ||
    insecure ||
    Boolean(sslDetails?.ca) ||
    sslDetails?.rejectUnauthorized != null;
  if (!enabled) return undefined;
  return {
    rejectUnauthorized: !insecure,
    ...(sslDetails?.ca ? { ca: sslDetails.ca } : {}),
  };
}
