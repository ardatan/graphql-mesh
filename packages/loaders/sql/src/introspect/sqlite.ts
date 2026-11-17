import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { path as pathHelper } from '@graphql-mesh/cross-helpers';
import { resolveSqlitePath } from '@graphql-mesh/transport-sql';
import type { SqlColumnMeta, SqlForeignKeyMeta, SqlSchemaMeta, SqlTableMeta } from './types.js';

export interface IntrospectSqliteOpts {
  db?: string;
  /** SQL dump → in-memory database (legacy tuql infile). */
  infile?: string;
  cwd?: string;
  includeTables?: string[];
  excludeTables?: string[];
}

export function introspectSqlite(opts: IntrospectSqliteOpts): SqlSchemaMeta {
  const db = openSqlite(opts);
  try {
    const tableRows = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      )
      .all() as { name: string }[];

    let tableNames = tableRows.map(r => r.name);
    if (opts.includeTables?.length) {
      const allow = new Set(opts.includeTables);
      tableNames = tableNames.filter(n => allow.has(n));
    }
    if (opts.excludeTables?.length) {
      const deny = new Set(opts.excludeTables);
      tableNames = tableNames.filter(n => !deny.has(n));
    }

    const tables: SqlTableMeta[] = tableNames.map(name => {
      const cols = db.prepare(`PRAGMA table_info(${quote(name)})`).all() as {
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: unknown;
        pk: number;
      }[];
      const columns: SqlColumnMeta[] = cols.map(c => ({
        name: c.name,
        dataType: c.type || 'TEXT',
        notNull: Boolean(c.notnull) || Boolean(c.pk),
        primaryKey: Boolean(c.pk),
        autoIncrement: false,
      }));

      const solePk = columns.filter(c => c.primaryKey);
      if (solePk.length === 1 && /int/i.test(solePk[0].dataType)) {
        solePk[0].autoIncrement = true;
      }

      const fkRows = db.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all() as {
        id: number;
        seq: number;
        table: string;
        from: string;
        to: string;
      }[];
      const fkById = new Map<number, SqlForeignKeyMeta>();
      for (const fk of fkRows) {
        let meta = fkById.get(fk.id);
        if (!meta) {
          meta = { columns: [], refTable: fk.table, refColumns: [] };
          fkById.set(fk.id, meta);
        }
        meta.columns[fk.seq] = fk.from;
        meta.refColumns[fk.seq] = fk.to;
      }

      return {
        name,
        columns,
        foreignKeys: [...fkById.values()],
      };
    });

    return { dialect: 'sqlite', tables };
  } finally {
    db.close();
  }
}

function openSqlite(opts: IntrospectSqliteOpts): DatabaseSync {
  if (opts.infile) {
    const cwd = opts.cwd || process.cwd();
    const abs = pathHelper.isAbsolute(opts.infile)
      ? opts.infile
      : pathHelper.join(cwd, opts.infile);
    const dump = readFileSync(abs, 'utf8');
    const db = new DatabaseSync(':memory:');
    db.exec(dump);
    return db;
  }
  if (!opts.db) {
    throw new Error('introspectSqlite requires db or infile');
  }
  const dbPath = resolveSqlitePath(
    opts.db.startsWith('file:') ? opts.db : `file:${opts.db}`,
    opts.cwd,
  );
  return new DatabaseSync(dbPath);
}

function quote(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
