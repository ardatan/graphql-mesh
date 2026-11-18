import type { SqlAdapter } from './types.js';

/**
 * Result of {@link parseSqlUri} — normalized connection parts Mesh uses for
 * drivers and `@transport(location)`.
 *
 * @example
 * ```ts
 * parseSqlUri('postgres://user@localhost:5432/shop?sslmode=require')
 * // → { adapter: 'postgres', host: 'localhost', database: 'shop', ssl: true, … }
 * ```
 */
export interface ParsedSqlUri {
  /**
   * Inferred dialect.
   *
   * @example 'postgres'
   */
  adapter: SqlAdapter;
  /** @example 'app' */
  user?: string;
  password?: string;
  /** @example 'localhost' */
  host?: string;
  /** @example 5432 */
  port?: number;
  /** @example 'shop' */
  database?: string;
  /**
   * Whether SSL should be enabled from the URI (`mysqls://`, `sslmode=…`).
   *
   * @example true
   */
  ssl?: boolean;
  /**
   * Absolute or relative file path for sqlite.
   *
   * @example './chinook.db'
   */
  filePath?: string;
  searchParams: Record<string, string>;
}

export type EnvLike = Record<string, string | undefined>;

/**
 * Bun-compatible connection URL env vars, in precedence order.
 * @see https://bun.com/docs/runtime/sql
 */
export const SQL_URL_ENV_VARS = [
  'DATABASE_URL',
  'TLS_DATABASE_URL',
  'POSTGRES_URL',
  'PGURL',
  'PG_URL',
  'TLS_POSTGRES_DATABASE_URL',
  'MYSQL_URL',
  'TLS_MYSQL_DATABASE_URL',
  'MARIADB_URL',
  'TLS_MARIADB_DATABASE_URL',
  'SQLITE_URL',
] as const;

/**
 * Resolve a connection string from the environment the way Bun SQL does:
 * URL vars first, then (when no URL) a postgres URL composed from `PG*` fields.
 *
 * `TLS_*` URLs get `sslmode=require` unless the URL already names an ssl mode.
 */
export function resolveConnectionStringFromEnv(
  env: EnvLike = typeof process !== 'undefined' ? process.env : {},
  opts?: { adapter?: SqlAdapter },
): string | undefined {
  for (const key of SQL_URL_ENV_VARS) {
    const value = env[key]?.trim();
    if (!value) continue;
    if (opts?.adapter) {
      try {
        if (inferAdapterFromConnectionString(value) !== opts.adapter) {
          // With an explicit adapter, skip URLs that name another adapter
          // (Bun does the same when `adapter` is set).
          if (key === 'DATABASE_URL' || key === 'TLS_DATABASE_URL') continue;
          if (opts.adapter === 'postgres' && !isPostgresUrlEnvKey(key)) continue;
          if (opts.adapter === 'mysql' && !isMysqlUrlEnvKey(key)) continue;
          if (opts.adapter === 'sqlite' && key !== 'SQLITE_URL') continue;
        }
      } catch {
        // unknown protocol — still return; caller / infer will throw
      }
    }
    if (key.startsWith('TLS_')) {
      return ensureSslModeRequire(value);
    }
    return value;
  }

  if (opts?.adapter === 'mysql' || (!opts?.adapter && env.MYSQL_HOST)) {
    const mysql = composeMysqlUrlFromEnv(env);
    if (mysql) return mysql;
  }
  if (opts?.adapter !== 'mysql' && opts?.adapter !== 'sqlite') {
    const pg = composePostgresUrlFromEnv(env);
    if (pg) return pg;
  }
  return undefined;
}

function isPostgresUrlEnvKey(key: string): boolean {
  return (
    key === 'POSTGRES_URL' ||
    key === 'PGURL' ||
    key === 'PG_URL' ||
    key === 'TLS_POSTGRES_DATABASE_URL'
  );
}

function isMysqlUrlEnvKey(key: string): boolean {
  return (
    key === 'MYSQL_URL' ||
    key === 'TLS_MYSQL_DATABASE_URL' ||
    key === 'MARIADB_URL' ||
    key === 'TLS_MARIADB_DATABASE_URL'
  );
}

function ensureSslModeRequire(url: string): string {
  if (/[?&](sslmode|ssl|tls)=/i.test(url)) return url;
  return url.includes('?') ? `${url}&sslmode=require` : `${url}?sslmode=require`;
}

function composePostgresUrlFromEnv(env: EnvLike): string | undefined {
  const host = env.PGHOST;
  const database = env.PGDATABASE;
  const user = env.PGUSERNAME || env.PGUSER || env.USER || env.USERNAME;
  const password = env.PGPASSWORD;
  const port = env.PGPORT;
  const sslmode = env.PGSSLMODE;
  if (!host && !database && !user && !password) return undefined;

  const auth =
    user != null && user !== ''
      ? password != null && password !== ''
        ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
        : `${encodeURIComponent(user)}@`
      : '';
  const hostPart = host || 'localhost';
  const portPart = port ? `:${port}` : '';
  const dbPart = database ? `/${encodeURIComponent(database)}` : '';
  const qs = sslmode ? `?sslmode=${encodeURIComponent(sslmode)}` : '';
  return `postgres://${auth}${hostPart}${portPart}${dbPart}${qs}`;
}

function composeMysqlUrlFromEnv(env: EnvLike): string | undefined {
  const host = env.MYSQL_HOST || env.MARIADB_HOST;
  const database = env.MYSQL_DATABASE || env.MARIADB_DATABASE;
  const user = env.MYSQL_USER || env.MARIADB_USER;
  const password = env.MYSQL_PASSWORD || env.MARIADB_PASSWORD;
  const port = env.MYSQL_PORT || env.MARIADB_PORT;
  if (!host && !database && !user && !password) return undefined;

  const auth =
    user != null && user !== ''
      ? password != null && password !== ''
        ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
        : `${encodeURIComponent(user)}@`
      : '';
  const hostPart = host || 'localhost';
  const portPart = port ? `:${port}` : '';
  const dbPart = database ? `/${encodeURIComponent(database)}` : '';
  return `mysql://${auth}${hostPart}${portPart}${dbPart}`;
}

/**
 * Detect adapter from a connection string protocol — Bun SQL–compatible.
 *
 * | Connection string | Adapter |
 * | --- | --- |
 * | `postgres://`, `postgresql://`, or host-style with no protocol | postgres |
 * | `mysql://`, `mysql2://`, `mysqls://`, `mariadb://` | mysql |
 * | `sqlite://`, `sqlite:`, `file://`, `file:`, `:memory:` | sqlite |
 *
 * Unknown protocols throw. Plain `*.db` / `*.sqlite` paths are treated as sqlite
 * (Mesh convenience; Bun would require an explicit adapter for bare filenames).
 */
export function inferAdapterFromConnectionString(location: string): SqlAdapter {
  const trimmed = location.trim();
  const lower = trimmed.toLowerCase();

  if (lower === ':memory:' || lower.startsWith('sqlite:') || lower.startsWith('file:')) {
    return 'sqlite';
  }
  if (
    lower.startsWith('mysql://') ||
    lower.startsWith('mysql2://') ||
    lower.startsWith('mysqls://') ||
    lower.startsWith('mariadb://')
  ) {
    return 'mysql';
  }
  if (lower.startsWith('postgres://') || lower.startsWith('postgresql://')) {
    return 'postgres';
  }

  // Explicit unknown scheme with :// (e.g. pg://, sqlite3://) — match Bun and throw.
  // Do not treat `localhost:5432/db` or `user:pass@host/db` as schemes.
  const schemeMatch = /^([a-z][a-z0-9+.-]*):\/\//i.exec(trimmed);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    throw new Error(
      `Unsupported SQL connection protocol "${scheme}:" in ${location}. Use postgres(ql)://, mysql(2|s)://, mariadb://, sqlite://, or file:.`,
    );
  }

  // No protocol: Bun defaults to postgres for host-style strings.
  // Mesh also accepts sqlite file paths (extension / relative path without host:port).
  if (looksLikeSqliteFile(trimmed)) {
    return 'sqlite';
  }
  return 'postgres';
}

function looksLikeSqliteFile(location: string): boolean {
  const lower = location.toLowerCase();
  if (
    lower.endsWith('.db') ||
    lower.endsWith('.sqlite') ||
    lower.endsWith('.sqlite3') ||
    lower === ':memory:'
  ) {
    return true;
  }
  // Relative/absolute path without a host:port authority
  if (location.startsWith('./') || location.startsWith('../') || location.startsWith('/')) {
    return true;
  }
  // Windows drive path
  if (/^[a-zA-Z]:[\\/]/.test(location)) {
    return true;
  }
  return false;
}

export function parseSqlUri(location: string): ParsedSqlUri {
  const searchParams: Record<string, string> = {};
  const adapter = inferAdapterFromConnectionString(location);

  if (adapter === 'sqlite') {
    let filePath = location.trim();
    if (filePath.toLowerCase().startsWith('file:')) filePath = filePath.slice('file:'.length);
    else if (filePath.toLowerCase().startsWith('sqlite:')) {
      filePath = filePath.slice('sqlite:'.length);
      // sqlite://path vs sqlite:path
      if (filePath.startsWith('//')) {
        // sqlite:///abs → /abs ; sqlite://rel → keep //rel then strip one slash pair for URL form
        if (filePath.startsWith('///')) {
          filePath = filePath.slice(2); // ///abs → /abs
        } else {
          filePath = filePath.slice(2); // //rel.db → rel.db
        }
      }
    }
    if (filePath.startsWith('//') && !filePath.startsWith('///')) {
      // file://absolute leftover
      filePath = filePath.replace(/^\/\/+/, '/');
    }
    // Query string on sqlite URLs (mode=ro etc.) — strip for path, keep in searchParams
    const qIdx = filePath.indexOf('?');
    if (qIdx !== -1) {
      const qs = new URLSearchParams(filePath.slice(qIdx + 1));
      qs.forEach((value, key) => {
        searchParams[key] = value;
      });
      filePath = filePath.slice(0, qIdx);
    }
    return { adapter: 'sqlite', filePath, searchParams };
  }

  // URL parser needs a known scheme; normalize aliases Bun also accepts.
  let normalized = location.trim();
  const wantsMysqlSsl = /^mysqls:/i.test(normalized);
  normalized = normalized
    .replace(/^mysqls:/i, 'mysql:')
    .replace(/^mysql2:/i, 'mysql:')
    .replace(/^mariadb:/i, 'mysql:');

  // Host-style with no protocol → Bun treats as postgres
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized) && adapter === 'postgres') {
    normalized = `postgres://${normalized}`;
  }

  const url = new URL(normalized);
  url.searchParams.forEach((value, key) => {
    searchParams[key] = value;
  });
  const database = decode(url.pathname.replace(/^\//, '')) || undefined;

  if (adapter === 'postgres') {
    return {
      adapter: 'postgres',
      user: decode(url.username) || undefined,
      password: decode(url.password) || undefined,
      host: url.hostname || 'localhost',
      port: url.port ? Number(url.port) : 5432,
      database,
      ssl: searchParams.ssl === 'true' || searchParams.sslmode === 'require',
      searchParams,
    };
  }

  // mysql / mysql2 / mariadb / mysqls
  return {
    adapter: 'mysql',
    user: decode(url.username) || undefined,
    password: decode(url.password) || undefined,
    host: url.hostname || 'localhost',
    port: url.port ? Number(url.port) : 3306,
    database,
    ssl:
      wantsMysqlSsl ||
      searchParams.ssl === 'true' ||
      searchParams.sslmode === 'require' ||
      searchParams.sslmode === 'no-verify',
    searchParams,
  };
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
