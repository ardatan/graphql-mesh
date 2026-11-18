import DataLoader from 'dataloader';
import { parseSqlMapping, resolveMappingValue } from './mapping.js';
import {
  buildSelectByColumnIn,
  isLegacyPlannerEntry,
  mapRowToGraphql,
  type SqlPlanners,
} from './sql-builder.js';
import type {
  ParsedSqlMapping,
  SqlClient,
  SqlMappingValue,
  SqlQueryKind,
  SqlRelationFilterMeta,
  SqlSoftDeleteOptions,
} from './types.js';

const LOADERS = Symbol.for('mesh.sql.loaders');

type AnyLoader = DataLoader<unknown, unknown>;
type LoaderMap = Map<string, AnyLoader>;

function getLoaderMap(context: any): LoaderMap {
  if (!context || typeof context !== 'object') {
    throw new Error('SQL DataLoader batching requires a mutable GraphQL context object');
  }
  if (!context[LOADERS]) {
    context[LOADERS] = new Map();
  }
  return context[LOADERS] as LoaderMap;
}

const CLIENT_ID = Symbol.for('mesh.sql.clientId');
let nextClientId = 0;

/** Stable per-process id for a SqlClient instance (loader cache affinity). */
function clientCacheKey(client: SqlClient): string {
  const c = client as SqlClient & { [CLIENT_ID]?: string };
  if (!c[CLIENT_ID]) {
    c[CLIENT_ID] = `c${++nextClientId}`;
  }
  return c[CLIENT_ID]!;
}

/** Stable JSON for loader keys — include every arg (custom mapped criteria, etc.). */
function stableArgsKey(args: Record<string, any> | undefined): string {
  if (!args) return '';
  return JSON.stringify(args, (_key, value) => {
    if (typeof value === 'bigint') return value.toString();
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.keys(value as Record<string, unknown>)
          .sort()
          .map(k => [k, (value as Record<string, unknown>)[k]]),
      );
    }
    return value;
  });
}

/**
 * Loader identity must omit the batching equality binder's `$args` value so
 * `album(id: 1)` and `album(id: 2)` share one DataLoader (keys go in `IN (...)`).
 * Sibling predicates under the same root (`input.filter` beside `input.id`) and
 * other binders stay in the identity.
 */
function stableArgsKeyExcludingEquality(
  args: Record<string, any> | undefined,
  whereMapping: ParsedSqlMapping,
  equalityColumn: string,
): string {
  if (!args) return '';
  const entry = whereMapping.entries.find(e => e.key === equalityColumn);
  if (entry?.value?.kind !== 'args') {
    return stableArgsKey(args);
  }
  const path = entry.value.path?.length
    ? entry.value.path
    : entry.value.value
      ? entry.value.value.split('.').filter(Boolean)
      : [];
  if (!path.length || !(path[0] in args)) {
    return stableArgsKey(args);
  }
  return stableArgsKey(omitArgsPath(args, path));
}

/** Shallow-clone along `path`, dropping only the equality leaf (keep siblings). */
function omitArgsPath(args: Record<string, any>, path: string[]): Record<string, any> {
  if (path.length === 1) {
    const rest = { ...args };
    delete rest[path[0]];
    return rest;
  }
  const [head, ...tail] = path;
  const child = args[head];
  if (!child || typeof child !== 'object' || Array.isArray(child)) {
    const rest = { ...args };
    delete rest[head];
    return rest;
  }
  return { ...args, [head]: omitArgsPath(child as Record<string, any>, tail) };
}

/**
 * Detect a single equality column binder suitable for `WHERE col IN (...)` batching.
 * Pass `columnCatalog` (GraphQL → SQL) so planner-named physical columns
 * (`limit: $args.id`) stay batchable and stuffed planners (`limit: $args.take`)
 * are excluded.
 */
export function batchableEqualityColumn(
  whereMapping: ParsedSqlMapping,
  columnCatalog?: Map<string, string>,
): string | undefined {
  const cols: string[] = [];
  for (const entry of whereMapping.entries) {
    if (
      entry.spread ||
      entry.key.startsWith('$') ||
      isLegacyPlannerEntry(entry, columnCatalog) ||
      entry.children
    ) {
      continue;
    }
    cols.push(entry.key);
  }
  return cols.length === 1 ? cols[0] : undefined;
}

/**
 * Batching collapses parents into one `IN (...)` query without a parent row, so
 * extra `$this` binders / spreads cannot be resolved. Pagination (`limit` etc.)
 * also cannot be applied per-parent under a single LIMIT — check resolved planner
 * values, not only arg names present on the field.
 */
export function canBatchByEqualityColumn(
  whereMapping: ParsedSqlMapping,
  equalityColumn: string,
  _kind: 'ROW' | 'ROWS',
  graphqlArgs?: Record<string, any>,
  planners?: SqlPlanners,
): boolean {
  for (const entry of whereMapping.entries) {
    if (entry.key === equalityColumn) continue;
    if (entry.spread || entry.key.startsWith('$')) {
      if (entry.value?.kind === 'this') return false;
    } else if (entry.value?.kind === 'this') {
      return false;
    }
  }
  for (const key of ['limit', 'offset', 'first', 'after'] as const) {
    if (graphqlArgs?.[key] != null) return false;
    const binder = planners?.[key];
    if (binder != null && String(binder).trim()) {
      const parsed = parsePlannerBinderValue(String(binder));
      // Parent-dependent pagination cannot be applied under a shared IN batch.
      if (parsed?.kind === 'this' || /\$this\b/.test(String(binder))) {
        return false;
      }
      const resolved = resolveMappingValue(parsed, {
        args: graphqlArgs,
      });
      if (resolved != null) return false;
    }
  }
  // ROW still defaults to LIMIT 1 in buildSelect; batching ROWs is fine without
  // client pagination. `_kind` retained for callers / future per-kind rules.
  return true;
}

function parsePlannerBinderValue(binder: string): SqlMappingValue | undefined {
  const trimmed = binder.trim();
  if (trimmed.startsWith('$')) {
    return parseSqlMapping(`_: ${trimmed}`).entries[0]?.value;
  }
  return parseSqlMapping(trimmed).entries[0]?.value;
}

export function resolveEqualityKey(
  whereMapping: ParsedSqlMapping,
  column: string,
  graphqlArgs: Record<string, any>,
  parent: any,
): unknown {
  const entry = whereMapping.entries.find(e => e.key === column);
  if (!entry) return undefined;
  return resolveMappingValue(entry.value, { args: graphqlArgs, parent });
}

export interface BatchSelectOpts {
  client: SqlClient;
  table: string;
  kind: 'ROW' | 'ROWS';
  selection: ParsedSqlMapping;
  whereMapping: ParsedSqlMapping;
  planners?: SqlPlanners;
  columnCatalog?: Map<string, string>;
  column: string;
  graphqlArgs?: Record<string, any>;
  softDelete?: SqlSoftDeleteOptions;
  relationFilters?: SqlRelationFilterMeta[];
}

/**
 * Per-request DataLoader that batches ROW/ROWS lookups sharing the same table/column/args.
 */
export function loadBatchedByColumn(
  context: any,
  opts: BatchSelectOpts,
  key: unknown,
): Promise<any> {
  // Include columnCatalog: two directives can share table/args/pruned selection
  // while mapping the same GraphQL filter field to different SQL columns.
  const catalogKey = opts.columnCatalog?.size
    ? JSON.stringify([...opts.columnCatalog.entries()].sort(([a], [b]) => a.localeCompare(b)))
    : '';
  const loaderKey = [
    clientCacheKey(opts.client),
    opts.kind,
    opts.table,
    opts.column,
    stableArgsKeyExcludingEquality(opts.graphqlArgs, opts.whereMapping, opts.column),
    JSON.stringify(opts.planners ?? null),
    JSON.stringify(opts.whereMapping.entries.map(e => [e.key, e.value, e.spread])),
    JSON.stringify(opts.selection.entries.map(e => [e.key, e.value])),
    catalogKey,
    JSON.stringify(opts.softDelete ?? null),
    JSON.stringify(
      (opts.relationFilters || []).map(r => [
        r.field,
        r.relatedTable,
        r.localColumn,
        r.refColumn,
        (r.joinPredicates || []).map(p => [p.localColumn, p.refColumn]),
        r.columns?.size ? [...r.columns.entries()].sort(([a], [b]) => a.localeCompare(b)) : null,
        r.junction
          ? [
              r.junction.table,
              r.junction.localColumn,
              r.junction.remoteColumn,
              r.junction.targetColumn,
            ]
          : null,
      ]),
    ),
  ].join('\0');

  const map = getLoaderMap(context);
  let loader = map.get(loaderKey);
  if (!loader) {
    loader = new DataLoader<unknown, unknown>(
      async (keys: readonly unknown[]): Promise<unknown[]> => {
        const unique = [...new Set(keys.filter(k => k !== undefined && k !== null))];
        if (!unique.length) {
          return keys.map(() => (opts.kind === 'ROWS' ? [] : null));
        }

        const query = buildSelectByColumnIn(opts.client.adapter, {
          table: opts.table,
          kind: 'ROWS' as SqlQueryKind,
          selection: opts.selection,
          whereMapping: opts.whereMapping,
          planners: opts.planners,
          graphqlArgs: opts.graphqlArgs || {},
          column: opts.column,
          values: unique,
          softDelete: opts.softDelete,
          relationFilters: opts.relationFilters,
          columnCatalog: opts.columnCatalog,
        });
        const result = await opts.client.query(query.sql, query.params);
        const rows = result.rows as Record<string, unknown>[];

        const byKey = new Map<string, Record<string, unknown>[]>();
        for (const row of rows) {
          const raw =
            row[opts.column] ?? row[opts.column.toLowerCase()] ?? row[opts.column.toUpperCase()];
          const k = String(raw);
          let list = byKey.get(k);
          if (!list) {
            list = [];
            byKey.set(k, list);
          }
          list.push(row);
        }

        return keys.map(k => {
          if (k === undefined || k === null) {
            return opts.kind === 'ROWS' ? [] : null;
          }
          const matched = byKey.get(String(k)) || [];
          if (opts.kind === 'ROW') {
            const row = matched[0];
            return row ? mapRowToGraphql(row, opts.selection) : null;
          }
          return matched.map(r => mapRowToGraphql(r, opts.selection));
        });
      },
      { cache: true },
    );
    map.set(loaderKey, loader);
  }
  // DataLoader rejects null/undefined keys before the batch function runs.
  if (key === undefined || key === null) {
    return opts.kind === 'ROWS' ? Promise.resolve([]) : Promise.resolve(null);
  }
  return loader.load(key);
}
