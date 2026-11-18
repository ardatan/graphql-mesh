// eslint-disable-next-line import/no-nodejs-modules
import { createPool, type Pool } from 'mysql2/promise';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import type { Pool as PgPool } from 'pg';
import { resolveSqlitePath } from './adapter.js';
import type { SqlAdapter, SqlClient, SqlTransportOptions } from './types.js';
import { parseSqlUri } from './uri.js';

export interface CreateSqlClientOptions extends SqlTransportOptions {
  adapter: SqlAdapter;
  location: string;
  cwd?: string;
  /** Force Node drivers even when `Bun.SQL` is present. */
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
  return bunOpts;
}

/** Merge `tls` mode strings with optional `ssl.ca` / `rejectUnauthorized` for Bun.SQL. */
export function resolveBunTlsOption(
  tls: boolean | string | undefined,
  ssl?: { rejectUnauthorized?: boolean; ca?: string },
): boolean | string | { rejectUnauthorized?: boolean; ca?: string } | undefined {
  const mode = typeof tls === 'string' ? tls.toLowerCase() : undefined;
  if (tls === false || mode === 'disable' || mode === 'false') {
    return undefined;
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

  const schema = opts.adapter === 'postgres' ? opts.schema?.trim() : undefined;
  let searchPathReady: Promise<void> | null = null;
  const ensureSearchPath = async () => {
    if (!schema || schema === 'public') return;
    if (!searchPathReady) {
      const ident = `"${schema.replace(/"/g, '""')}"`;
      searchPathReady = Promise.resolve(sql.unsafe(`SET search_path TO ${ident}`)).then(
        () => undefined,
        () => undefined,
      );
    }
    await searchPathReady;
  };

  return {
    adapter: opts.adapter,
    async query<T = Record<string, unknown>>(query: string, params: unknown[] = []) {
      await ensureSearchPath();
      const result = await sql.unsafe(query, params);
      const rows = normalizeBunRows<T>(result);
      const rowCount =
        typeof result?.count === 'number'
          ? result.count
          : typeof result?.affectedRows === 'number'
            ? result.affectedRows
            : rows.length;
      return { rows, rowCount };
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

/**
 * Wrap an existing `pg.Pool` (or compatible) as SqlClient.
 */
export function wrapPgPoolAsSqlClient(pool: {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
  end?: () => Promise<void>;
}): SqlClient {
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
      if (typeof pool.end === 'function') {
        await pool.end();
      }
    },
  };
  return client;
}

/**
 * Wrap an existing `mysql` / `mysql2` pool (legacy handler `pool` config) as SqlClient.
 */
function mysqlPromiseClient(p: {
  query: (...args: any[]) => any;
  end?: (...args: any[]) => any;
}): SqlClient {
  return {
    adapter: 'mysql',
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const [result] = await p.query(sql, params);
      if (Array.isArray(result)) {
        return { rows: result as T[], rowCount: result.length };
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
          pool.query(sql, params, (err: Error | null, result: any) => {
            if (err) {
              reject(err);
              return;
            }
            if (Array.isArray(result)) {
              resolve({ rows: result as T[], rowCount: result.length });
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
  const dbPath = resolveSqlitePath(location, cwd);
  const db = new DatabaseSync(dbPath);
  return {
    adapter: 'sqlite',
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const stmt = db.prepare(sql);
      // node:sqlite rejects boolean binds — coerce GraphQLBoolean filters/writes.
      const bind = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p)) as Array<
        null | number | bigint | string | Uint8Array
      >;
      const returnsRows = /^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);
      if (returnsRows) {
        const rows = stmt.all(...bind) as T[];
        return { rows, rowCount: rows.length };
      }
      const result = stmt.run(...bind) as { changes?: number };
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
  const pool: Pool = createPool({
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    ssl,
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
  const pool = new pg.Pool({
    connectionString: opts.location,
    max: opts.max ?? 10,
    idleTimeoutMillis: opts.idleTimeout != null ? opts.idleTimeout * 1000 : undefined,
    connectionTimeoutMillis:
      opts.connectionTimeout != null ? opts.connectionTimeout * 1000 : undefined,
    ssl,
  });
  const schema = opts.schema?.trim();
  if (schema && schema !== 'public') {
    const ident = `"${schema.replace(/"/g, '""')}"`;
    pool.on('connect', client => {
      client.query(`SET search_path TO ${ident}`).catch(() => undefined);
    });
  }
  return wrapPgPoolAsSqlClient(pool);
}

/**
 * TLS on by default verifies certificates (`rejectUnauthorized: true`).
 * Opt out explicitly with `tls: "insecure"` / `"no-verify"` or URI `sslmode=no-verify`.
 * `ssl.ca` / `ssl.rejectUnauthorized` are merged when SSL is enabled.
 * Shared by runtime clients and MySQL/Postgres introspection.
 */
export function resolveSslOption(
  option: boolean | string | undefined,
  parsed: { ssl?: boolean; searchParams?: Record<string, string> },
  sslDetails?: { rejectUnauthorized?: boolean; ca?: string },
): { rejectUnauthorized: boolean; ca?: string } | undefined {
  const mode = typeof option === 'string' ? option.toLowerCase() : undefined;
  const sslmode = String(parsed.searchParams?.sslmode || '').toLowerCase();
  if (
    option === false ||
    mode === 'disable' ||
    mode === 'false' ||
    sslmode === 'disable' ||
    sslmode === 'false'
  ) {
    return undefined;
  }
  const insecure =
    mode === 'insecure' ||
    mode === 'no-verify' ||
    sslmode === 'no-verify' ||
    sslmode === 'insecure' ||
    sslDetails?.rejectUnauthorized === false;
  const enabled =
    option === true ||
    mode === 'true' ||
    mode === 'require' ||
    mode === 'insecure' ||
    mode === 'no-verify' ||
    Boolean(parsed.ssl) ||
    Boolean(sslDetails?.ca) ||
    sslDetails?.rejectUnauthorized != null;
  if (!enabled) return undefined;
  return {
    rejectUnauthorized: !insecure,
    ...(sslDetails?.ca ? { ca: sslDetails.ca } : {}),
  };
}
