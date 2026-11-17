import type { SqlAdapter } from '@graphql-mesh/transport-sql';

export type { SqlAdapter };

export interface SqlColumnMeta {
  name: string;
  dataType: string;
  notNull: boolean;
  primaryKey: boolean;
  autoIncrement?: boolean;
}

export interface SqlForeignKeyMeta {
  /** Local table column(s) */
  columns: string[];
  /** Referenced table */
  refTable: string;
  /** Referenced column(s) */
  refColumns: string[];
}

export interface SqlTableMeta {
  name: string;
  columns: SqlColumnMeta[];
  foreignKeys: SqlForeignKeyMeta[];
}

export interface SqlSchemaMeta {
  adapter: SqlAdapter;
  tables: SqlTableMeta[];
}
