export type SqlDialect = 'postgres' | 'mysql' | 'sqlite';

export type SqlQueryKind = 'ROW' | 'ROWS' | 'CONNECTION' | 'COUNT';

export type SqlMutationKind = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SqlTransportOptions {
  dialect?: SqlDialect;
}

export interface SqlMappingValue {
  kind: 'column' | 'pseudo' | 'args' | 'this' | 'literal';
  /** SQL column name, pseudo token ($cursor), or path after $args / $this */
  value: string;
  /** Nested path segments for $args.input.title -> ['input','title'] */
  path?: string[];
}

export interface SqlMappingEntry {
  /** GraphQL field name, planner key (filter/orderBy/...), or SQL column on the left of args */
  key: string;
  value?: SqlMappingValue;
  children?: SqlMappingEntry[];
}

export interface ParsedSqlMapping {
  entries: SqlMappingEntry[];
}

export interface SqlClient {
  readonly dialect: SqlDialect;
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }>;
  dispose(): void | Promise<void>;
}
