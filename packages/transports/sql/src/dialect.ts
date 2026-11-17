import { isAbsolute as pathIsAbsolute, join as pathJoin } from 'node:path';
import type { SqlDialect } from './types.js';

export function inferDialectFromLocation(location: string | undefined): SqlDialect | undefined {
  if (!location) return undefined;
  const lower = location.toLowerCase();
  if (lower.startsWith('postgres://') || lower.startsWith('postgresql://')) {
    return 'postgres';
  }
  if (lower.startsWith('mysql://') || lower.startsWith('mysqls://')) {
    return 'mysql';
  }
  if (
    lower.startsWith('file:') ||
    lower.startsWith('sqlite:') ||
    lower.endsWith('.db') ||
    lower.endsWith('.sqlite') ||
    lower.endsWith('.sqlite3')
  ) {
    return 'sqlite';
  }
  return undefined;
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
  } else if (path.startsWith('sqlite:')) {
    path = path.slice('sqlite:'.length);
  }
  if (path.startsWith('//')) {
    // file://absolute or file:///absolute
    path = path.replace(/^\/\/+/, '/');
  }
  if (!pathIsAbsolute(path) && cwd) {
    return pathJoin(cwd, path);
  }
  return path;
}
