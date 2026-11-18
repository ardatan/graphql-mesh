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

/**
 * Postgres computed-column function: `users_full_name(users)` → GraphQL `User.fullName`.
 * Only populated by Postgres introspection (PostGraphile-compatible naming rules).
 */
export interface SqlComputedColumnMeta {
  table: string;
  /** Qualified SQL call target, e.g. `public.users_full_name` */
  functionName: string;
  /** GraphQL field after stripping `table_` prefix (`users_full_name` → `fullName`) */
  fieldName: string;
  /** Postgres result type name (text, int4, …) */
  returnType: string;
}

export interface SqlSchemaMeta {
  adapter: SqlAdapter;
  tables: SqlTableMeta[];
  /** Postgres-only computed columns discovered from STABLE/IMMUTABLE table functions. */
  computedColumns?: SqlComputedColumnMeta[];
}
