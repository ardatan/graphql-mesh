import type { Pool as PgPool } from 'pg';

export type SqlAdapter = 'postgres' | 'mysql' | 'sqlite';

export type SqlQueryKind = 'ROW' | 'ROWS' | 'CONNECTION' | 'COUNT';

export type SqlMutationKind = 'INSERT' | 'UPDATE' | 'DELETE';

/** Combined ` @sql` kind (reads + writes). */
export type SqlKind = SqlQueryKind | SqlMutationKind;

/**
 * Bun SQL–inspired connection / pool options stored on `@transport(options:)`.
 * Only the fields we can honour on Node (`pg` / `mysql2` / `node:sqlite`) or
 * forward to `Bun.SQL` when present are included.
 */
/**
 * Soft-delete: reads hide rows where `column IS NOT NULL`; `DELETE` becomes
 * `UPDATE … SET column = <now>` (still matching only live rows).
 */
export interface SqlSoftDeleteOptions {
  /** Timestamp / marker column (e.g. `deleted_at`). */
  column: string;
  /** Limit to these SQL table names; omit = every `@sql` table. */
  tables?: string[];
}

export interface SqlTransportOptions {
  adapter?: SqlAdapter;
  /** Max pool size (default 10). Maps to Bun `max`, mysql2 `connectionLimit`, pg `max`. */
  max?: number;
  /** Idle connection lifetime in seconds (0 = off). Bun `idleTimeout`. */
  idleTimeout?: number;
  /** Seconds to wait for a new connection (default 30). Bun `connectionTimeout`. */
  connectionTimeout?: number;
  /** Enable TLS / SSL (`true` or Bun-style mode string). */
  tls?: boolean | string;
  /** Soft-delete column (+ optional table allowlist). */
  softDelete?: SqlSoftDeleteOptions;
}

export interface SqlMappingValue {
  kind: 'column' | 'pseudo' | 'args' | 'this' | 'literal' | 'fn';
  /** SQL column name, pseudo token ($cursor), path after $args/$this, or function name for `$fn.` */
  value: string;
  /** Nested path segments for $args.input.title -> ['input','title'] */
  path?: string[];
}

/** Belongs-to nested `where: { artist: { name: { eq: "X" } } }` → EXISTS subquery. */
export interface SqlRelationFilterMeta {
  /** GraphQL filter field (e.g. `artist`) */
  field: string;
  relatedTable: string;
  localColumn: string;
  refColumn: string;
  /** Related table GraphQL field → SQL column */
  columns: Map<string, string>;
  /**
   * When set, filter through a junction (M2M) instead of a direct FK:
   * `EXISTS (junction JOIN related …)`.
   */
  junction?: {
    table: string;
    localColumn: string;
    remoteColumn: string;
    targetColumn: string;
  };
}

export interface SqlMappingEntry {
  /** GraphQL field name, planner key (orderBy/...), or SQL column on the left of args */
  key: string;
  value?: SqlMappingValue;
  children?: SqlMappingEntry[];
  /**
   * Connectors-style spread (`...$args.where`): merge the resolved object into
   * the structured WHERE filter (null/undefined spread is a no-op).
   */
  spread?: boolean;
}

export interface ParsedSqlMapping {
  entries: SqlMappingEntry[];
}

export interface SqlClient {
  readonly adapter: SqlAdapter;
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }>;
  dispose(): void | Promise<void>;
  /**
   * Node `pg.Pool` when using the postgres adapter (required for the
   * Grafast / `@dataplan/pg` fast path). Absent for Bun.SQL / mysql / sqlite.
   */
  pgPool?: PgPool;
}
