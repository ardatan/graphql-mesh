// eslint-disable-next-line import/no-nodejs-modules
import { DatabaseSync } from 'node:sqlite';
import { resolveSqlitePath } from '@graphql-mesh/transport-sql';
import type { SqlColumnMeta, SqlForeignKeyMeta, SqlSchemaMeta, SqlTableMeta } from './types.js';

/**
 * Options for SQLite schema introspection (used by {@link loadGraphQLSchemaFromSql}).
 *
 * @example
 * ```ts
 * introspectSqlite({ db: 'file:./chinook.db', cwd: process.cwd() })
 * ```
 */
export interface IntrospectSqliteOpts {
  /**
   * Sqlite path / URI (`file:…`, `sqlite:…`, `:memory:`, or `*.db`).
   *
   * @example 'file:./chinook.db'
   * @example ':memory:'
   */
  db: string;
  /**
   * Base directory joined onto relative `db` paths before opening the file.
   * When omitted, relative values stay as given (Node resolves them from the
   * process cwd).
   *
   * @example process.cwd()
   */
  cwd?: string;
  /**
   * Only introspect these tables (others omitted from the result).
   *
   * @example ['albums', 'artists']
   */
  includeTables?: string[];
  /**
   * Drop these tables from the result even when otherwise included
   * (e.g. `sqlite_sequence`).
   *
   * @example ['sqlite_sequence']
   */
  excludeTables?: string[];
}

export function introspectSqlite(opts: IntrospectSqliteOpts): SqlSchemaMeta {
  // Pass endpoints through as-is (`sqlite:./x.db`, `file:…`, bare paths).
  // Prefixing `file:` onto a `sqlite:` URI leaves `sqlite:` in the filesystem path.
  const dbPath = resolveSqlitePath(opts.db, opts.cwd);
  const db = new DatabaseSync(dbPath);
  try {
    // Escape `_` so `sqlitefoo` is not excluded (`LIKE 'sqlite_%'` treats `_` as any char).
    const tableRows = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY name`,
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

    // WITHOUT ROWID from catalog when available (SQLite 3.37+ pragma_table_list).
    const withoutRowidByName = new Map<string, boolean>();
    try {
      const list = db.prepare(`SELECT name, wr FROM pragma_table_list`).all() as {
        name: string;
        wr: number;
      }[];
      for (const row of list) {
        withoutRowidByName.set(row.name, Boolean(row.wr));
      }
    } catch {
      // Older SQLite — fall back per-table below.
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

      const withoutRowid =
        withoutRowidByName.get(name) ??
        /\bWITHOUT\s+ROWID\b/i.test(
          (
            db
              .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`)
              .get(name) as { sql?: string } | undefined
          )?.sql || '',
        );
      // INTEGER PRIMARY KEY DESC is not a rowid alias — detect via PK index column desc.
      const descPk = soleIntegerPkIsDescending(db, name, columns);
      const solePk = columns.filter(c => c.primaryKey);
      // Only INTEGER PRIMARY KEY on a rowid table is a generated alias.
      if (
        solePk.length === 1 &&
        /^\s*INTEGER\s*$/i.test(solePk[0].dataType) &&
        !withoutRowid &&
        !descPk
      ) {
        solePk[0].autoIncrement = true;
        solePk[0].notNull = true;
      }

      const fkRows = db.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all() as {
        id: number;
        seq: number;
        table: string;
        from: string;
        to: string | null;
      }[];
      const fkById = new Map<number, SqlForeignKeyMeta>();
      for (const fk of fkRows) {
        let meta = fkById.get(fk.id);
        if (!meta) {
          meta = { columns: [], refTable: fk.table, refColumns: [] };
          fkById.set(fk.id, meta);
        }
        meta.columns[fk.seq] = fk.from;
        // PRAGMA leaves `to` NULL when the referenced PK is implicit — filled below.
        meta.refColumns[fk.seq] = fk.to as string;
      }

      return {
        name,
        columns,
        foreignKeys: [...fkById.values()],
      };
    });

    // Resolve omitted FK target columns from the referenced table's PK ordinal order.
    // SQLite folds only ASCII letters for identifier matching — keep declared names.
    const byName = new Map(tables.map(t => [t.name, t] as const));
    const byFolded = new Map(tables.map(t => [asciiFold(t.name), t] as const));
    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        const ref = byName.get(fk.refTable) || byFolded.get(asciiFold(fk.refTable));
        if (!ref) continue;
        fk.refTable = ref.name;
        const pkNames = orderedPrimaryKeyColumns(db, ref.name);
        const refByFolded = new Map(ref.columns.map(c => [asciiFold(c.name), c.name]));
        for (let i = 0; i < fk.columns.length; i++) {
          if (fk.refColumns[i] == null || fk.refColumns[i] === '') {
            fk.refColumns[i] = pkNames[i] || pkNames[0];
          } else {
            fk.refColumns[i] = refByFolded.get(asciiFold(fk.refColumns[i])) || fk.refColumns[i];
          }
        }
      }
    }

    return { adapter: 'sqlite', tables };
  } finally {
    db.close();
  }
}

/** SQLite identifier match folds ASCII letters only (sqlite3_stricmp). */
function asciiFold(name: string): string {
  return name.replace(/[A-Z]/g, c => c.toLowerCase());
}

function quote(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Primary-key column names in `PRAGMA table_info.pk` ordinal order (1-based). */
function orderedPrimaryKeyColumns(db: DatabaseSync, table: string): string[] {
  const cols = db.prepare(`PRAGMA table_info(${quote(table)})`).all() as {
    name: string;
    pk: number;
  }[];
  return cols
    .filter(c => c.pk > 0)
    .sort((a, b) => a.pk - b.pk)
    .map(c => c.name);
}

/**
 * True when the sole INTEGER PK is declared DESC (not a rowid alias).
 * Uses the PK index from `PRAGMA index_list` / `index_xinfo` when present.
 */
function soleIntegerPkIsDescending(
  db: DatabaseSync,
  table: string,
  columns: SqlColumnMeta[],
): boolean {
  const solePk = columns.filter(c => c.primaryKey);
  if (solePk.length !== 1 || !/^\s*INTEGER\s*$/i.test(solePk[0].dataType)) return false;
  try {
    const indexes = db.prepare(`PRAGMA index_list(${quote(table)})`).all() as {
      name: string;
      origin: string;
    }[];
    const pkIndex = indexes.find(i => String(i.origin).toLowerCase() === 'pk');
    if (!pkIndex) return false;
    const xinfo = db.prepare(`PRAGMA index_xinfo(${quote(pkIndex.name)})`).all() as {
      cid: number;
      name: string | null;
      desc: number;
    }[];
    const pkCol = xinfo.find(x => x.name === solePk[0].name || x.cid >= 0);
    return Boolean(pkCol?.desc);
  } catch {
    return false;
  }
}
