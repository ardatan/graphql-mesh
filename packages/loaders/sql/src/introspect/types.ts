import type { SqlAdapter } from '@graphql-mesh/transport-sql';

export type { SqlAdapter };

/**
 * Introspected column metadata used when emitting `@sql(selection:)` / filters.
 */
export interface SqlColumnMeta {
  /** @example 'AlbumId' */
  name: string;
  /** @example 'int4' */
  dataType: string;
  notNull: boolean;
  primaryKey: boolean;
  /** @example true */
  autoIncrement?: boolean;
  /** Column has a DB default (including runtime defaults like CURRENT_TIMESTAMP). */
  hasDefault?: boolean;
  /**
   * Stored/virtual generated column (`GENERATED ALWAYS` / MySQL `GENERATED`).
   * Omitted from create/update inputs — the database assigns the value.
   */
  generated?: boolean;
}

/**
 * Foreign-key edge discovered during introspection.
 *
 * @example { columns: ['ArtistId'], refTable: 'artists', refColumns: ['ArtistId'] }
 */
export interface SqlForeignKeyMeta {
  /** Local table column(s) */
  columns: string[];
  /** Referenced table */
  refTable: string;
  /** Referenced column(s) */
  refColumns: string[];
}

/**
 * Introspected table (columns + FKs).
 *
 * @example { name: 'albums', columns: […], foreignKeys: […] }
 */
export interface SqlTableMeta {
  /** @example 'albums' */
  name: string;
  columns: SqlColumnMeta[];
  foreignKeys: SqlForeignKeyMeta[];
}

/**
 * Postgres computed-column function: `users_full_name(users)` → GraphQL `User.fullName`.
 * Only populated by Postgres introspection (PostGraphile-compatible naming rules).
 *
 * @example
 * ```ts
 * { table: 'users', functionName: 'public.users_full_name', fieldName: 'fullName', returnType: 'text' }
 * ```
 */
export interface SqlComputedColumnMeta {
  /** @example 'users' */
  table: string;
  /**
   * Qualified SQL call target.
   *
   * @example 'public.users_full_name'
   */
  functionName: string;
  /**
   * GraphQL field after stripping `table_` prefix (`users_full_name` → `fullName`).
   *
   * @example 'fullName'
   */
  fieldName: string;
  /**
   * Postgres result type name.
   *
   * @example 'text'
   */
  returnType: string;
}

/**
 * Full introspection result consumed by schema emit.
 *
 * @example
 * ```ts
 * const meta = await introspectPostgres({ connectionString: 'postgres://localhost/shop' });
 * // meta.adapter === 'postgres'; meta.tables[0].name === 'albums'
 * ```
 */
export interface SqlSchemaMeta {
  adapter: SqlAdapter;
  tables: SqlTableMeta[];
  /** Postgres-only computed columns discovered from STABLE/IMMUTABLE table functions. */
  computedColumns?: SqlComputedColumnMeta[];
}
