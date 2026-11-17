import pg from 'pg';
import { parseSqlUri } from '@graphql-mesh/transport-sql';
import type { SqlColumnMeta, SqlForeignKeyMeta, SqlSchemaMeta, SqlTableMeta } from './types.js';

export interface IntrospectPostgresOpts {
  connectionString: string;
  includeTables?: string[];
  excludeTables?: string[];
  /** Defaults to `public` */
  schema?: string;
}

export async function introspectPostgres(opts: IntrospectPostgresOpts): Promise<SqlSchemaMeta> {
  const parsed = parseSqlUri(opts.connectionString);
  if (parsed.dialect !== 'postgres') {
    throw new Error('Postgres introspection requires a postgres(ql)://… URI');
  }
  const schemaName = opts.schema || 'public';
  const pool = new pg.Pool({
    connectionString: opts.connectionString,
  });
  try {
    const tableRes = await pool.query<{ name: string }>(
      `SELECT table_name AS name
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      [schemaName],
    );
    let tableNames = tableRes.rows.map(r => String(r.name));
    if (opts.includeTables?.length) {
      const allow = new Set(opts.includeTables);
      tableNames = tableNames.filter(n => allow.has(n));
    }
    if (opts.excludeTables?.length) {
      const deny = new Set(opts.excludeTables);
      tableNames = tableNames.filter(n => !deny.has(n));
    }

    const tables: SqlTableMeta[] = [];
    for (const name of tableNames) {
      const colRes = await pool.query<{
        name: string;
        data_type: string;
        udt_name: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT
           column_name AS name,
           data_type,
           udt_name,
           is_nullable,
           column_default
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schemaName, name],
      );

      const pkRes = await pool.query<{ column_name: string }>(
        `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
         WHERE tc.table_schema = $1
           AND tc.table_name = $2
           AND tc.constraint_type = 'PRIMARY KEY'
         ORDER BY kcu.ordinal_position`,
        [schemaName, name],
      );
      const pkCols = new Set(pkRes.rows.map(r => String(r.column_name)));

      const columns: SqlColumnMeta[] = colRes.rows.map(c => {
        const dataType = String(c.udt_name || c.data_type || 'text');
        const def = c.column_default != null ? String(c.column_default) : '';
        return {
          name: String(c.name),
          dataType,
          notNull: String(c.is_nullable).toUpperCase() === 'NO',
          primaryKey: pkCols.has(String(c.name)),
          autoIncrement: /nextval\(/i.test(def) || /identity/i.test(def),
        };
      });

      const fkRes = await pool.query<{
        constraint_name: string;
        column_name: string;
        foreign_table_name: string;
        foreign_column_name: string;
        ordinal_position: number;
      }>(
        `SELECT
           tc.constraint_name,
           kcu.column_name,
           ccu.table_name AS foreign_table_name,
           ccu.column_name AS foreign_column_name,
           kcu.ordinal_position
         FROM information_schema.table_constraints AS tc
         JOIN information_schema.key_column_usage AS kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage AS ccu
           ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_schema = $1
           AND tc.table_name = $2
         ORDER BY tc.constraint_name, kcu.ordinal_position`,
        [schemaName, name],
      );

      const fkByName = new Map<string, SqlForeignKeyMeta>();
      for (const fk of fkRes.rows) {
        const constraintName = String(fk.constraint_name);
        let meta = fkByName.get(constraintName);
        if (!meta) {
          meta = {
            columns: [],
            refTable: String(fk.foreign_table_name),
            refColumns: [],
          };
          fkByName.set(constraintName, meta);
        }
        const idx = Number(fk.ordinal_position) - 1;
        meta.columns[idx] = String(fk.column_name);
        meta.refColumns[idx] = String(fk.foreign_column_name);
      }

      tables.push({
        name,
        columns,
        foreignKeys: [...fkByName.values()],
      });
    }

    return { dialect: 'postgres', tables };
  } finally {
    await pool.end();
  }
}
