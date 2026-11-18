import type { Pool as PgPool } from 'pg';

/**
 * SQL dialect for introspection and runtime execution.
 *
 * @example 'postgres'
 * @example 'mysql'
 * @example 'sqlite'
 */
export type SqlAdapter = 'postgres' | 'mysql' | 'sqlite';

/**
 * Read-side `@sql(kind:)` values.
 *
 * @example 'ROWS'
 * @example 'CONNECTION'
 */
export type SqlQueryKind = 'ROW' | 'ROWS' | 'CONNECTION' | 'COUNT';

/**
 * Write-side `@sql(kind:)` values.
 *
 * @example 'INSERT'
 */
export type SqlMutationKind = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Combined `@sql` kind (reads + writes). Relations use ROW/ROWS with `$this` binders.
 *
 * @example 'ROW'
 */
export type SqlKind = SqlQueryKind | SqlMutationKind;

/**
 * Soft-delete: reads hide rows where `column IS NOT NULL`; `DELETE` becomes
 * `UPDATE … SET column = <now>` (still matching only live rows).
 *
 * @example
 * ```ts
 * softDelete: { column: 'deleted_at', tables: ['albums'] }
 * ```
 */
export interface SqlSoftDeleteOptions {
  /**
   * Timestamp / marker column set on soft delete (e.g. `deleted_at`). Reads add
   * `column IS NULL`; soft `DELETE` sets the column to the dialect's "now".
   *
   * @example 'deleted_at'
   */
  column: string;
  /**
   * Limit soft-delete to these SQL table names. When omitted, every `@sql` table
   * participates; a defined list (including `[]`) is an allowlist only.
   *
   * @example ['albums', 'tracks']
   */
  tables?: string[];
}

/**
 * Extra TLS details when `tls` / `mysqls://` enables SSL.
 *
 * @example
 * ```ts
 * ssl: { rejectUnauthorized: true, ca: fs.readFileSync('rds-ca.pem', 'utf8') }
 * ```
 */
export interface SqlSslOptions {
  /**
   * Verify TLS certificates when SSL is on. Set `false` (or use `tls: "insecure"` /
   * `"no-verify"` / URI `sslmode=no-verify`) only for trusted lab endpoints.
   *
   * @default true
   */
  rejectUnauthorized?: boolean;
  /**
   * PEM CA bundle / certificate string forwarded to `pg` / `mysql2` when the
   * server uses a private CA (e.g. RDS). Merged with URI `sslmode` when both set.
   *
   * @example '-----BEGIN CERTIFICATE-----\n…'
   */
  ca?: string;
}

/**
 * Connection / pool options stored on `@transport(options:)` (and accepted by
 * `loadSqlSubgraph` / `createSqlClient`).
 *
 * Pool / TLS field names honoured on Node (`pg` / `mysql2` / `node:sqlite`)
 * and on the optional `globalThis.Bun.SQL` client when present.
 *
 * @example
 * ```ts
 * // Mesh compose — options land on `@transport(kind: "sql", options: …)`
 * loadSqlSubgraph('shop', {
 *   endpoint: 'postgres://localhost/shop',
 *   schema: 'app',
 *   max: 20,
 *   softDelete: { column: 'deleted_at' },
 * })
 * ```
 */
export interface SqlTransportOptions {
  /**
   * Dialect override when the URI alone is ambiguous.
   *
   * @example 'postgres'
   */
  adapter?: SqlAdapter;
  /**
   * Max pool size. Maps to mysql2 `connectionLimit`, pg `max`, and the optional
   * `globalThis.Bun.SQL` `max` when Mesh opens the pool (`createSqlClient`).
   *
   * @default 10
   * @example 20
   */
  max?: number;
  /**
   * Idle connection lifetime in seconds (`0` = off). Forwarded as mysql2
   * `idleTimeout` / pg `idleTimeoutMillis` (seconds to ms on Node), and as
   * `idleTimeout` on `globalThis.Bun.SQL` when that client is used. When
   * omitted, the driver default applies.
   *
   * @example 30
   */
  idleTimeout?: number;
  /**
   * Seconds to wait for a new connection. Forwarded as mysql2 `connectTimeout` /
   * pg `connectionTimeoutMillis` (seconds to ms on Node), and as
   * `connectionTimeout` on `globalThis.Bun.SQL` when that client is used. When
   * omitted, the driver default applies.
   *
   * @example 10
   */
  connectionTimeout?: number;
  /**
   * Enable TLS / SSL. Accepts `true`, or mode strings such as `'require'` /
   * `'insecure'` / `'no-verify'`. URI schemes (`mysqls://`) and `sslmode=` query
   * params also enable SSL (merged with {@link SqlSslOptions}).
   *
   * @example 'require'
   */
  tls?: boolean | string;
  /**
   * Extra TLS details (`ca`, `rejectUnauthorized`) merged when SSL is enabled
   * by `tls` or the connection URI.
   *
   * @example { ca: process.env.DB_CA_PEM, rejectUnauthorized: true }
   */
  ssl?: SqlSslOptions;
  /**
   * Postgres schema / `search_path`. Used for introspection and `@dataplan/pg`
   * table identity (`schema.table`). Shared pools bind one schema only —
   * conflicting wrappers on the same pool are rejected.
   * When omitted, introspection still uses `public`; runtime `SET search_path`
   * runs only when this option is provided.
   *
   * @example 'app'
   */
  schema?: string;
  /**
   * Soft-delete column (+ optional table allowlist). Reads hide rows where
   * `column IS NOT NULL`; `DELETE` becomes `UPDATE … SET column = <now>`.
   *
   * @example { column: 'deleted_at' }
   */
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
  /** Primary join pair (first `$this` equality); prefer `joinPredicates` when present. */
  localColumn: string;
  refColumn: string;
  /**
   * All relation join equalities from `@sql(where:)` (`refCol: $this.localField`).
   * Multi-key relations must correlate every predicate in the EXISTS, not only the first.
   */
  joinPredicates?: Array<{ localColumn: string; refColumn: string }>;
  /** Related table GraphQL field → SQL column */
  columns: Map<string, string>;
  /**
   * Relation filters on the related type (track→album→artist nested `where`).
   * Collected at schema build so EXISTS compilation can recurse.
   */
  nestedRelationFilters?: SqlRelationFilterMeta[];
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

export interface SqlQueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  /** MySQL ResultSetHeader.insertId after INSERT (auto-increment). */
  insertId?: number | bigint;
}

export interface SqlClient {
  readonly adapter: SqlAdapter;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<SqlQueryResult<T>>;
  dispose(): void | Promise<void>;
  /**
   * Node `pg.Pool` when using the postgres adapter (required for the
   * Grafast / `@dataplan/pg` fast path). Absent for Bun.SQL / mysql / sqlite.
   */
  pgPool?: PgPool;
}
