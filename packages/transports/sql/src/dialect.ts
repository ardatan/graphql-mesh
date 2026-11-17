import { isAbsolute as pathIsAbsolute, join as pathJoin } from 'node:path';
import type { SqlDialect } from './types.js';
import { inferDialectFromConnectionString } from './uri.js';

/**
 * Infer dialect from a transport `location` / connection URI.
 * Prefer {@link inferDialectFromConnectionString} for full Bun-compatible rules.
 */
export function inferDialectFromLocation(location: string | undefined): SqlDialect | undefined {
  if (!location) return undefined;
  try {
    return inferDialectFromConnectionString(location);
  } catch {
    return undefined;
  }
}

export function quoteIdent(dialect: SqlDialect, name: string): string {
  switch (dialect) {
    case 'mysql':
      return `\`${name.replace(/`/g, '``')}\``;
    case 'postgres':
    case 'sqlite':
    default:
      return `"${name.replace(/"/g, '""')}"`;
  }
}

export function placeholder(dialect: SqlDialect, index: number): string {
  // index is 1-based for postgres
  if (dialect === 'postgres') {
    return `$${index}`;
  }
  return '?';
}

export function resolveSqlitePath(location: string, cwd?: string): string {
  let path = location;
  if (path.startsWith('file:')) {
    path = path.slice('file:'.length);
  } else if (path.toLowerCase().startsWith('sqlite:')) {
    path = path.slice(path.indexOf(':') + 1);
  }
  if (path.startsWith('//')) {
    // file://absolute or file:///absolute
    path = path.replace(/^\/\/+/, '/');
  }
  const qIdx = path.indexOf('?');
  if (qIdx !== -1) {
    path = path.slice(0, qIdx);
  }
  if (!pathIsAbsolute(path) && cwd && path !== ':memory:') {
    return pathJoin(cwd, path);
  }
  return path;
}
