// eslint-disable-next-line import/no-nodejs-modules
import { DatabaseSync } from 'node:sqlite';
import { resolveSqlitePath } from '@graphql-mesh/transport-sql';
import type { SqlColumnMeta, SqlForeignKeyMeta, SqlSchemaMeta, SqlTableMeta } from './types.js';

export interface IntrospectSqliteOpts {
  db: string;
  cwd?: string;
  includeTables?: string[];
  excludeTables?: string[];
}

export function introspectSqlite(opts: IntrospectSqliteOpts): SqlSchemaMeta {
  // Pass endpoints through as-is (`sqlite:./x.db`, `file:…`, bare paths).
  // Prefixing `file:` onto a `sqlite:` URI leaves `sqlite:` in the filesystem path.
  const dbPath = resolveSqlitePath(opts.db, opts.cwd);
  const db = new DatabaseSync(dbPath);
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
        // Do not OR `pk`: composite PRIMARY KEY columns may still be NULL in
        // ordinary rowid tables unless NOT NULL was declared.
        notNull: Boolean(c.notnull),
        primaryKey: Boolean(c.pk),
        autoIncrement: false,
        hasDefault: c.dflt_value != null,
      }));

      const solePk = columns.filter(c => c.primaryKey);
      // INTEGER PRIMARY KEY is a rowid alias — never null, autoincrements.
      if (solePk.length === 1 && /int/i.test(solePk[0].dataType)) {
        solePk[0].autoIncrement = true;
        solePk[0].notNull = true;
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

    return { adapter: 'sqlite', tables };
  } finally {
    db.close();
  }
}

function quote(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
