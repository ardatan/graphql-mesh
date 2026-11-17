import { createPool, type Pool as Mysql2Pool, type Pool } from 'mysql2/promise';
import { DatabaseSync } from 'node:sqlite';
import { resolveSqlitePath } from './dialect.js';
import type { SqlClient, SqlDialect } from './types.js';
import { parseSqlUri } from './uri.js';

export interface CreateSqlClientOptions {
  dialect: SqlDialect;
  location: string;
  cwd?: string;
}

export function createSqlClient(opts: CreateSqlClientOptions): SqlClient {
  switch (opts.dialect) {
    case 'sqlite':
      return createSqliteClient(opts.location, opts.cwd);
    case 'mysql':
      return createMysqlClient(opts.location);
    case 'postgres':
      throw new Error(
        'Postgres SQL transport dialect is not implemented yet (sqlite/mysql first).',
      );
    default:
      throw new Error(`Unknown SQL dialect: ${opts.dialect as string}`);
  }
}

/**
 * Wrap an existing `mysql` / `mysql2` pool (legacy handler `pool` config) as SqlClient.
 */
export function wrapMysqlPoolAsSqlClient(pool: {
  query: (...args: any[]) => any;
  end?: (...args: any[]) => any;
  promise?: () => { query: (...args: any[]) => any; end?: (...args: any[]) => any };
}): SqlClient {
  // mysql (non-promise) exposes .promise(); mysql2/promise is already thenable
  const p = typeof pool.promise === 'function' ? pool.promise() : (pool as unknown as Mysql2Pool);

  return {
    dialect: 'mysql',
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

function createSqliteClient(location: string, cwd?: string): SqlClient {
  const dbPath = resolveSqlitePath(location, cwd);
  const db = new DatabaseSync(dbPath);
  return {
    dialect: 'sqlite',
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const stmt = db.prepare(sql);
      const bind = params as Array<null | number | bigint | string | Uint8Array>;
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

function createMysqlClient(location: string): SqlClient {
  const parsed = parseSqlUri(location);
  if (parsed.dialect !== 'mysql') {
    throw new Error(`Expected mysql URI, got ${parsed.dialect}`);
  }
  const pool: Pool = createPool({
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    ssl: parsed.ssl ? { rejectUnauthorized: false } : undefined,
    supportBigNumbers: true,
    bigNumberStrings: true,
    connectionLimit: 10,
  });
  return wrapMysqlPoolAsSqlClient(pool);
}
