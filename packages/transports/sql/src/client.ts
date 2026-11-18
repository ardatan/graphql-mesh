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
 * Wrap Bun's native `SQL` client when running under Bun.
 * Uses `sql.unsafe(query, params)` so our adapter placeholders (`$1` / `?`) work as-is.
 */
export function createBunSqlClient(opts: CreateSqlClientOptions): SqlClient {
  const BunSQL = getBunSqlCtor();
  if (!BunSQL) {
    throw new Error('Bun.SQL is not available in this runtime');
  }

  const bunOpts: Record<string, unknown> = {
    adapter: opts.adapter === 'mysql' ? 'mysql' : opts.adapter,
  };
  if (opts.max != null) bunOpts.max = opts.max;
  if (opts.idleTimeout != null) bunOpts.idleTimeout = opts.idleTimeout;
  if (opts.connectionTimeout != null) bunOpts.connectionTimeout = opts.connectionTimeout;
  if (opts.tls != null) bunOpts.tls = opts.tls === 'true' ? true : opts.tls;

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
export function wrapMysqlPoolAsSqlClient(pool: {
  query: (...args: any[]) => any;
  end?: (...args: any[]) => any;
  promise?: () => { query: (...args: any[]) => any; end?: (...args: any[]) => any };
}): SqlClient {
  // Prefer mysql2 promise API when available.
  if (typeof pool.promise === 'function') {
    const p = pool.promise();
    return {
      adapter: 'mysql',
      async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
        const [result] = await p.query(sql, params);
        if (Array.isArray(result)) {
          return { rows: result as T[], rowCount: result.length };
        }
        const header = result as { affectedRows?: number };
        return { rows: [] as T[], rowCount: Number(header.affectedRows ?? 0) };
      },
      async dispose() {
        if (typeof p.end === 'function') {
          await p.end();
        }
      },
    };
  }

  // Legacy callback-style `mysql` pool — adapt rather than casting to promise.
  return {
    adapter: 'mysql',
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const result = await new Promise<unknown>((resolve, reject) => {
        pool.query(sql, params, (err: Error | null, rows: unknown) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      if (Array.isArray(result)) {
        return { rows: result as T[], rowCount: result.length };
      }
      const header = result as { affectedRows?: number };
      return { rows: [] as T[], rowCount: Number(header.affectedRows ?? 0) };
    },
    async dispose() {
      if (typeof pool.end !== 'function') return;
      await new Promise<void>((resolve, reject) => {
        pool.end((err?: Error | null) => (err ? reject(err) : resolve()));
      });
    },
  };
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
  const ssl = resolveSslOption(opts.tls, parsed);
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
  const ssl = resolveSslOption(opts.tls, parsed);
  const pool = new pg.Pool({
    connectionString: opts.location,
    max: opts.max ?? 10,
    idleTimeoutMillis: opts.idleTimeout != null ? opts.idleTimeout * 1000 : undefined,
    connectionTimeoutMillis:
      opts.connectionTimeout != null ? opts.connectionTimeout * 1000 : undefined,
    ssl,
  });
  return wrapPgPoolAsSqlClient(pool);
}

/**
 * TLS on by default verifies certificates (`rejectUnauthorized: true`).
 * Opt out explicitly with `tls: "insecure"` / `"no-verify"` or URI `sslmode=no-verify`.
 */
function resolveSslOption(
  option: boolean | string | undefined,
  parsed: { ssl?: boolean; searchParams?: Record<string, string> },
): { rejectUnauthorized: boolean } | undefined {
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
    sslmode === 'insecure';
  const enabled =
    option === true ||
    mode === 'true' ||
    mode === 'require' ||
    mode === 'insecure' ||
    mode === 'no-verify' ||
    Boolean(parsed.ssl);
  if (!enabled) return undefined;
  return { rejectUnauthorized: !insecure };
}
