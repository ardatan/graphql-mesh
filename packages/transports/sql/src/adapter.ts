// eslint-disable-next-line import/no-nodejs-modules
import { isAbsolute as pathIsAbsolute, join as pathJoin } from 'node:path';
import type { SqlAdapter } from './types.js';
import { inferAdapterFromConnectionString } from './uri.js';

/**
 * Infer adapter from a transport `location` / connection URI.
 * Prefer {@link inferAdapterFromConnectionString} for full Bun-compatible rules.
 */
export function inferAdapterFromLocation(location: string | undefined): SqlAdapter | undefined {
  if (!location) return undefined;
  try {
    return inferAdapterFromConnectionString(location);
  } catch {
    return undefined;
  }
}

export function quoteIdent(adapter: SqlAdapter, name: string): string {
  switch (adapter) {
    case 'mysql':
      return `\`${name.replace(/`/g, '``')}\``;
    case 'postgres':
    case 'sqlite':
    default:
      return `"${name.replace(/"/g, '""')}"`;
  }
}

export function placeholder(adapter: SqlAdapter, index: number): string {
  // index is 1-based for postgres
  if (adapter === 'postgres') {
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
