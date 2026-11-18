import { createPool, type RowDataPacket } from 'mysql2/promise';
import { parseSqlUri, resolveSslOption } from '@graphql-mesh/transport-sql';
import type { SqlColumnMeta, SqlForeignKeyMeta, SqlSchemaMeta, SqlTableMeta } from './types.js';

/**
 * Options for MySQL schema introspection (used by {@link loadGraphQLSchemaFromSql}).
 *
 * @example
 * ```ts
 * await introspectMysql({
 *   connectionString: 'mysql://root@127.0.0.1:3306/employees',
 *   includeTables: ['employees', 'departments'],
 * })
 * ```
 */
export interface IntrospectMysqlOpts {
  /**
   * MySQL URI including database name (`mysql://…/db` or `mysqls://…`).
   *
   * @example 'mysql://root@127.0.0.1:3306/employees'
   */
  connectionString: string;
  /**
   * Only introspect these tables (others omitted from the result).
   *
   * @example ['employees', 'departments']
   */
  includeTables?: string[];
  /**
   * Drop these tables from the result even when otherwise included.
   *
   * @example ['flyway_schema_history']
   */
  excludeTables?: string[];
  /**
   * Enable TLS (`true` or mode strings such as `require` / `insecure` /
   * `no-verify`). `mysqls://` and URI `sslmode=` also turn SSL on via the shared
   * SSL resolver.
   *
   * @example true
   */
  tls?: boolean | string;
  /**
   * Extra TLS details (`ca`, `rejectUnauthorized`) when SSL is enabled.
   *
   * @example { rejectUnauthorized: true, ca: pem }
   */
  ssl?: { rejectUnauthorized?: boolean; ca?: string };
}

export async function introspectMysql(opts: IntrospectMysqlOpts): Promise<SqlSchemaMeta> {
  const parsed = parseSqlUri(opts.connectionString);
  if (parsed.adapter !== 'mysql' || !parsed.database) {
    throw new Error('MySQL introspection requires a mysql://…/database URI');
  }
  const ssl = resolveSslOption(opts.tls, parsed, opts.ssl);
  // mysql2 `ssl` is `string | SslOptions` only; omit when disabled (`false`).
  const pool = createPool({
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    ...(ssl ? { ssl } : {}),
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
           COLUMN_DEFAULT AS columnDefault,
           EXTRA AS extra
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [database, name],
      );
      const columns: SqlColumnMeta[] = colRows.map(c => {
        const extra = String(c.extra || '').toLowerCase();
        // Only real generated columns — `DEFAULT_GENERATED` is an expression default.
        const generated = extra.includes('stored generated') || extra.includes('virtual generated');
        return {
          name: String(c.name),
          dataType: String(c.columnType || c.dataType || 'TEXT'),
          notNull: String(c.isNullable).toUpperCase() === 'NO',
          primaryKey: String(c.columnKey).toUpperCase() === 'PRI',
          autoIncrement: extra.includes('auto_increment'),
          hasDefault:
            c.columnDefault != null ||
            generated ||
            extra.includes('default_generated') ||
            extra.includes('on update'),
          generated,
        };
      });

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
           AND REFERENCED_TABLE_SCHEMA = ?
         ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION`,
        [database, name, database],
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

    return { adapter: 'mysql', tables };
  } finally {
    await pool.end();
  }
}
