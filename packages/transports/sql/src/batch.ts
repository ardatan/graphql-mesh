import DataLoader from 'dataloader';
import { parseSqlMapping, resolveMappingValue } from './mapping.js';
import { buildSelectByColumnIn, mapRowToGraphql, type SqlPlanners } from './sql-builder.js';
import type {
  ParsedSqlMapping,
  SqlClient,
  SqlQueryKind,
  SqlRelationFilterMeta,
  SqlSoftDeleteOptions,
  SqlMappingValue,
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

/** Stable JSON for loader keys — include every arg (custom mapped criteria, etc.). */
function stableArgsKey(args: Record<string, any> | undefined): string {
  if (!args) return '';
  return JSON.stringify(args, (_key, value) => {
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

const PLANNER_KEYS = new Set([
  'filter',
  'orderBy',
  'first',
  'after',
  'last',
  'before',
  'limit',
  'offset',
  'set',
  'where',
]);

/**
 * Detect a single equality column binder suitable for `WHERE col IN (...)` batching.
 */
export function batchableEqualityColumn(whereMapping: ParsedSqlMapping): string | undefined {
  const cols: string[] = [];
  for (const entry of whereMapping.entries) {
    if (
      entry.spread ||
      entry.key.startsWith('$') ||
      PLANNER_KEYS.has(entry.key) ||
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
  kind: 'ROW' | 'ROWS',
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
      const resolved = resolveMappingValue(
        parsePlannerBinderValue(String(binder)),
        { args: graphqlArgs },
      );
      if (resolved != null) return false;
    }
  }
  // ROW still defaults to LIMIT 1 in buildSelect; batching ROWs is fine without
  // client pagination. kind is retained for callers / future per-kind rules.
  void kind;
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
  const loaderKey = [
    opts.kind,
    opts.table,
    opts.column,
    stableArgsKey(opts.graphqlArgs),
    JSON.stringify(opts.planners ?? null),
    JSON.stringify(opts.whereMapping.entries.map(e => [e.key, e.value, e.spread])),
    JSON.stringify(opts.selection.entries.map(e => [e.key, e.value])),
    JSON.stringify(opts.softDelete ?? null),
    JSON.stringify(
      (opts.relationFilters || []).map(r => [r.field, r.relatedTable, r.localColumn, r.refColumn]),
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
  return loader.load(key);
}
