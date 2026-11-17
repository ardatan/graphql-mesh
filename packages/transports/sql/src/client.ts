import { DatabaseSync } from 'node:sqlite';
import { resolveSqlitePath } from './dialect.js';
import type { SqlClient, SqlDialect } from './types.js';

export interface CreateSqlClientOptions {
  dialect: SqlDialect;
  location: string;
  cwd?: string;
}

export function createSqlClient(opts: CreateSqlClientOptions): SqlClient {
  switch (opts.dialect) {
    case 'sqlite':
      return createSqliteClient(opts.location, opts.cwd);
    case 'postgres':
      throw new Error(
        'Postgres SQL transport dialect is not implemented yet in this PR (sqlite first).',
      );
    case 'mysql':
      throw new Error(
        'MySQL SQL transport dialect is not implemented yet in this PR (sqlite first).',
      );
    default:
      throw new Error(`Unknown SQL dialect: ${opts.dialect as string}`);
  }
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
