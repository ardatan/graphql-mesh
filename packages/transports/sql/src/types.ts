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
}

export interface SqlMappingValue {
  kind: 'column' | 'pseudo' | 'args' | 'this' | 'literal';
  /** SQL column name, pseudo token ($cursor), or path after $args / $this */
  value: string;
  /** Nested path segments for $args.input.title -> ['input','title'] */
  path?: string[];
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
