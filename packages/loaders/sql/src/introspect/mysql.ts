import { createPool, type RowDataPacket } from 'mysql2/promise';
import { parseSqlUri } from '@graphql-mesh/transport-sql';
import type { SqlColumnMeta, SqlForeignKeyMeta, SqlSchemaMeta, SqlTableMeta } from './types.js';

export interface IntrospectMysqlOpts {
  connectionString: string;
  includeTables?: string[];
  excludeTables?: string[];
}

export async function introspectMysql(opts: IntrospectMysqlOpts): Promise<SqlSchemaMeta> {
  const parsed = parseSqlUri(opts.connectionString);
  if (parsed.dialect !== 'mysql' || !parsed.database) {
    throw new Error('MySQL introspection requires a mysql://…/database URI');
  }
  const pool = createPool({
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    ssl: parsed.ssl ? { rejectUnauthorized: false } : undefined,
  });
  try {
    const database = parsed.database;
    const [tableRows] = await pool.query<RowDataPacket[]>(
      `SELECT TABLE_NAME AS name
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [database],
    );
    let tableNames = tableRows.map(r => String(r.name));
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
      const [colRows] = await pool.query<RowDataPacket[]>(
        `SELECT
           COLUMN_NAME AS name,
           DATA_TYPE AS dataType,
           COLUMN_TYPE AS columnType,
           IS_NULLABLE AS isNullable,
           COLUMN_KEY AS columnKey,
           EXTRA AS extra
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [database, name],
      );
      const columns: SqlColumnMeta[] = colRows.map(c => ({
        name: String(c.name),
        dataType: String(c.columnType || c.dataType || 'TEXT'),
        notNull: String(c.isNullable).toUpperCase() === 'NO',
        primaryKey: String(c.columnKey).toUpperCase() === 'PRI',
        autoIncrement: String(c.extra || '')
          .toLowerCase()
          .includes('auto_increment'),
      }));

      const [fkRows] = await pool.query<RowDataPacket[]>(
        `SELECT
           CONSTRAINT_NAME AS constraintName,
           COLUMN_NAME AS columnName,
           REFERENCED_TABLE_NAME AS refTable,
           REFERENCED_COLUMN_NAME AS refColumn,
           ORDINAL_POSITION AS seq
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = ?
           AND TABLE_NAME = ?
           AND REFERENCED_TABLE_NAME IS NOT NULL
         ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION`,
        [database, name],
      );
      const fkByName = new Map<string, SqlForeignKeyMeta>();
      for (const fk of fkRows) {
        const constraintName = String(fk.constraintName);
        let meta = fkByName.get(constraintName);
        if (!meta) {
          meta = {
            columns: [],
            refTable: String(fk.refTable),
            refColumns: [],
          };
          fkByName.set(constraintName, meta);
        }
        const idx = Number(fk.seq) - 1;
        meta.columns[idx] = String(fk.columnName);
        meta.refColumns[idx] = String(fk.refColumn);
      }

      tables.push({
        name,
        columns,
        foreignKeys: [...fkByName.values()],
      });
    }

    return { dialect: 'mysql', tables };
  } finally {
    await pool.end();
  }
}
