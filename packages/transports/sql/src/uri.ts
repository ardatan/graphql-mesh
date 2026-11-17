import type { SqlDialect } from './types.js';

export interface ParsedSqlUri {
  dialect: SqlDialect;
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
  ssl?: boolean;
  /** Absolute or relative file path for sqlite */
  filePath?: string;
  searchParams: Record<string, string>;
}

/**
 * Detect dialect from a connection string protocol — Bun SQL–compatible.
 *
 * | Connection string | Dialect |
 * | --- | --- |
 * | `postgres://`, `postgresql://`, or host-style with no protocol | postgres |
 * | `mysql://`, `mysql2://`, `mysqls://`, `mariadb://` | mysql |
 * | `sqlite://`, `sqlite:`, `file://`, `file:`, `:memory:` | sqlite |
 *
 * Unknown protocols throw. Plain `*.db` / `*.sqlite` paths are treated as sqlite
 * (Mesh convenience; Bun would require an explicit adapter for bare filenames).
 */
export function inferDialectFromConnectionString(location: string): SqlDialect {
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
  const dialect = inferDialectFromConnectionString(location);

  if (dialect === 'sqlite') {
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
    return { dialect: 'sqlite', filePath, searchParams };
  }

  // URL parser needs a known scheme; normalize aliases Bun also accepts.
  let normalized = location.trim();
  const wantsMysqlSsl = /^mysqls:/i.test(normalized);
  normalized = normalized
    .replace(/^mysqls:/i, 'mysql:')
    .replace(/^mysql2:/i, 'mysql:')
    .replace(/^mariadb:/i, 'mysql:');

  // Host-style with no protocol → Bun treats as postgres
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized) && dialect === 'postgres') {
    normalized = `postgres://${normalized}`;
  }

  const url = new URL(normalized);
  url.searchParams.forEach((value, key) => {
    searchParams[key] = value;
  });
  const database = url.pathname.replace(/^\//, '') || undefined;

  if (dialect === 'postgres') {
    return {
      dialect: 'postgres',
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
    dialect: 'mysql',
    user: decode(url.username) || undefined,
    password: decode(url.password) || undefined,
    host: url.hostname || 'localhost',
    port: url.port ? Number(url.port) : 3306,
    database,
    ssl: wantsMysqlSsl || searchParams.ssl === 'true',
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
