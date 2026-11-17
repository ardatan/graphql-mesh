import DataLoader from 'dataloader';
import { resolveMappingValue } from './mapping.js';
import { buildSelectByColumnIn, mapRowToGraphql, type SqlPlanners } from './sql-builder.js';
import type { ParsedSqlMapping, SqlClient, SqlQueryKind } from './types.js';

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

function stableArgsKey(args: Record<string, any> | undefined): string {
  if (!args) return '';
  const { filter, orderBy, limit, offset, first, after } = args;
  return JSON.stringify({ filter, orderBy, limit, offset, first, after });
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
    if (PLANNER_KEYS.has(entry.key) || entry.children) continue;
    cols.push(entry.key);
  }
  return cols.length === 1 ? cols[0] : undefined;
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
  column: string;
  graphqlArgs?: Record<string, any>;
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
    JSON.stringify(opts.selection.entries.map(e => [e.key, e.value])),
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
