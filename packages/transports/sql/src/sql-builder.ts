import { placeholder, quoteIdent } from './adapter.js';
import { columnMapFromSelection, parseSqlMapping, resolveMappingValue } from './mapping.js';
import type { ParsedSqlMapping, SqlAdapter, SqlMappingEntry, SqlQueryKind } from './types.js';

export interface BuiltQuery {
  sql: string;
  params: unknown[];
}

export interface SelectPlan {
  table: string;
  kind: SqlQueryKind;
  selection: ParsedSqlMapping;
  argsMapping: ParsedSqlMapping;
  graphqlArgs: Record<string, any>;
  parent?: Record<string, any>;
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

export function buildSelect(adapter: SqlAdapter, plan: SelectPlan): BuiltQuery {
  const columns = columnMapFromSelection(plan.selection);
  const selectCols =
    columns.size === 0 ? ['*'] : [...new Set(columns.values())].map(c => quoteIdent(adapter, c));

  const params: unknown[] = [];
  const whereParts: string[] = [];

  // Equality / join predicates from args mapping (non-planner keys)
  for (const entry of plan.argsMapping.entries) {
    if (PLANNER_KEYS.has(entry.key) || entry.children) {
      continue;
    }
    const resolved = resolveMappingValue(entry.value, {
      args: plan.graphqlArgs,
      parent: plan.parent,
    });
    if (resolved === undefined) continue;
    params.push(resolved);
    whereParts.push(`${quoteIdent(adapter, entry.key)} = ${placeholder(adapter, params.length)}`);
  }

  // filter: $args.filter
  const filterEntry = plan.argsMapping.entries.find(e => e.key === 'filter');
  if (filterEntry) {
    const filterVal = resolveMappingValue(filterEntry.value, {
      args: plan.graphqlArgs,
      parent: plan.parent,
    });
    if (filterVal && typeof filterVal === 'object') {
      appendFilter(adapter, filterVal as Record<string, any>, columns, whereParts, params);
    }
  }

  // Also accept direct graphqlArgs.filter when mapping omitted the binder but arg exists
  if (!filterEntry && plan.graphqlArgs.filter) {
    appendFilter(adapter, plan.graphqlArgs.filter, columns, whereParts, params);
  }

  let sql = `SELECT ${selectCols.join(', ')} FROM ${quoteIdent(adapter, plan.table)}`;
  if (whereParts.length) {
    sql += ` WHERE ${whereParts.join(' AND ')}`;
  }

  if (plan.kind === 'COUNT') {
    sql = `SELECT COUNT(*) AS ${quoteIdent(adapter, 'count')} FROM ${quoteIdent(adapter, plan.table)}`;
    if (whereParts.length) {
      sql += ` WHERE ${whereParts.join(' AND ')}`;
    }
    return { sql, params };
  }

  const orderBy = resolvePlannerArg(plan, 'orderBy') as string[] | string | undefined;
  const orderSql = buildOrderBy(adapter, orderBy, columns);
  if (orderSql) {
    sql += ` ORDER BY ${orderSql}`;
  }

  if (plan.kind === 'CONNECTION') {
    const first = Number(resolvePlannerArg(plan, 'first') ?? 10);
    const after = resolvePlannerArg(plan, 'after');
    // Cursor = offset for phase 1 (opaque base64 of offset)
    let offset = 0;
    if (typeof after === 'string' && after.length) {
      offset = decodeCursor(after);
    }
    const limit = Math.max(0, first);
    // fetch one extra to detect hasNextPage
    params.push(limit + 1);
    sql += ` LIMIT ${placeholder(adapter, params.length)}`;
    params.push(offset);
    sql += ` OFFSET ${placeholder(adapter, params.length)}`;
    return { sql, params };
  }

  const limit = resolvePlannerArg(plan, 'limit');
  const offset = resolvePlannerArg(plan, 'offset');
  if (limit != null) {
    params.push(Number(limit));
    sql += ` LIMIT ${placeholder(adapter, params.length)}`;
  } else if (plan.kind === 'ROW') {
    params.push(1);
    sql += ` LIMIT ${placeholder(adapter, params.length)}`;
  }
  if (offset != null) {
    params.push(Number(offset));
    sql += ` OFFSET ${placeholder(adapter, params.length)}`;
  }

  return { sql, params };
}

/**
 * Batch helper: same filters/order/limit as `buildSelect`, but replace the single
 * equality binder for `column` with `WHERE column IN (...)`.
 */
export function buildSelectByColumnIn(
  adapter: SqlAdapter,
  plan: SelectPlan & { column: string; values: unknown[] },
): BuiltQuery {
  const columns = columnMapFromSelection(plan.selection);
  const selectCols =
    columns.size === 0 ? ['*'] : [...new Set(columns.values())].map(c => quoteIdent(adapter, c));

  const params: unknown[] = [];
  const whereParts: string[] = [];

  for (const entry of plan.argsMapping.entries) {
    if (PLANNER_KEYS.has(entry.key) || entry.children) continue;
    if (entry.key === plan.column) continue; // replaced by IN list
    const resolved = resolveMappingValue(entry.value, {
      args: plan.graphqlArgs,
      parent: plan.parent,
    });
    if (resolved === undefined) continue;
    params.push(resolved);
    whereParts.push(`${quoteIdent(adapter, entry.key)} = ${placeholder(adapter, params.length)}`);
  }

  const filterEntry = plan.argsMapping.entries.find(e => e.key === 'filter');
  if (filterEntry) {
    const filterVal = resolveMappingValue(filterEntry.value, {
      args: plan.graphqlArgs,
      parent: plan.parent,
    });
    if (filterVal && typeof filterVal === 'object') {
      appendFilter(adapter, filterVal as Record<string, any>, columns, whereParts, params);
    }
  } else if (plan.graphqlArgs.filter) {
    appendFilter(adapter, plan.graphqlArgs.filter, columns, whereParts, params);
  }

  const inPhs = plan.values.map(v => {
    params.push(v);
    return placeholder(adapter, params.length);
  });
  whereParts.push(
    `${quoteIdent(adapter, plan.column)} IN (${inPhs.join(', ')})`,
  );

  // Always include the batch column so we can regroup rows by key.
  const batchColSql = quoteIdent(adapter, plan.column);
  if (!selectCols.includes(batchColSql) && selectCols[0] !== '*') {
    selectCols.push(batchColSql);
  }

  let sql = `SELECT ${selectCols.join(', ')} FROM ${quoteIdent(adapter, plan.table)}`;
  if (whereParts.length) {
    sql += ` WHERE ${whereParts.join(' AND ')}`;
  }

  const orderBy = resolvePlannerArg(plan, 'orderBy') as string[] | string | undefined;
  const orderSql = buildOrderBy(adapter, orderBy, columns);
  if (orderSql) {
    sql += ` ORDER BY ${orderSql}`;
  }

  const limit = resolvePlannerArg(plan, 'limit');
  const offset = resolvePlannerArg(plan, 'offset');
  if (limit != null) {
    params.push(Number(limit));
    sql += ` LIMIT ${placeholder(adapter, params.length)}`;
  }
  if (offset != null) {
    params.push(Number(offset));
    sql += ` OFFSET ${placeholder(adapter, params.length)}`;
  }

  return { sql, params };
}

export function buildInsert(
  adapter: SqlAdapter,
  table: string,
  argsMapping: ParsedSqlMapping,
  graphqlArgs: Record<string, any>,
  returningColumns: string[],
): BuiltQuery {
  const cols: string[] = [];
  const params: unknown[] = [];
  for (const entry of argsMapping.entries) {
    if (entry.key === 'set' || entry.key === 'where' || entry.children) continue;
    const val = resolveMappingValue(entry.value, { args: graphqlArgs });
    if (val === undefined) continue;
    cols.push(entry.key);
    params.push(val);
  }
  if (!cols.length) {
    throw new Error(`@sql INSERT on ${table} has no column values`);
  }
  const colSql = cols.map(c => quoteIdent(adapter, c)).join(', ');
  const ph = cols.map((_, i) => placeholder(adapter, i + 1)).join(', ');
  let sql = `INSERT INTO ${quoteIdent(adapter, table)} (${colSql}) VALUES (${ph})`;
  if (returningColumns.length && (adapter === 'postgres' || adapter === 'sqlite')) {
    sql += ` RETURNING ${returningColumns.map(c => quoteIdent(adapter, c)).join(', ')}`;
  }
  return { sql, params };
}

export function buildUpdate(
  adapter: SqlAdapter,
  table: string,
  argsMapping: ParsedSqlMapping,
  graphqlArgs: Record<string, any>,
  returningColumns: string[],
): BuiltQuery {
  const setBlock = argsMapping.entries.find(e => e.key === 'set');
  const whereBlock = argsMapping.entries.find(e => e.key === 'where');
  const setEntries = setBlock?.children || [];
  const whereEntries = whereBlock?.children || argsMapping.entries.filter(e => e.key !== 'set');

  const params: unknown[] = [];
  const sets: string[] = [];
  for (const entry of setEntries) {
    const val = resolveMappingValue(entry.value, { args: graphqlArgs });
    if (val === undefined) continue;
    params.push(val);
    sets.push(`${quoteIdent(adapter, entry.key)} = ${placeholder(adapter, params.length)}`);
  }
  if (!sets.length) {
    throw new Error(`@sql UPDATE on ${table} has no SET columns`);
  }
  const whereParts: string[] = [];
  for (const entry of whereEntries) {
    if (entry.key === 'set' || entry.children) continue;
    const val = resolveMappingValue(entry.value, { args: graphqlArgs });
    if (val === undefined) continue;
    params.push(val);
    whereParts.push(`${quoteIdent(adapter, entry.key)} = ${placeholder(adapter, params.length)}`);
  }
  let sql = `UPDATE ${quoteIdent(adapter, table)} SET ${sets.join(', ')}`;
  if (whereParts.length) {
    sql += ` WHERE ${whereParts.join(' AND ')}`;
  }
  if (returningColumns.length && (adapter === 'postgres' || adapter === 'sqlite')) {
    sql += ` RETURNING ${returningColumns.map(c => quoteIdent(adapter, c)).join(', ')}`;
  }
  return { sql, params };
}

export function buildDelete(
  adapter: SqlAdapter,
  table: string,
  argsMapping: ParsedSqlMapping,
  graphqlArgs: Record<string, any>,
): BuiltQuery {
  const whereBlock = argsMapping.entries.find(e => e.key === 'where');
  const whereEntries = whereBlock?.children || argsMapping.entries;
  const params: unknown[] = [];
  const whereParts: string[] = [];
  for (const entry of whereEntries) {
    if (entry.children) continue;
    const val = resolveMappingValue(entry.value, { args: graphqlArgs });
    if (val === undefined) continue;
    params.push(val);
    whereParts.push(`${quoteIdent(adapter, entry.key)} = ${placeholder(adapter, params.length)}`);
  }
  let sql = `DELETE FROM ${quoteIdent(adapter, table)}`;
  if (whereParts.length) {
    sql += ` WHERE ${whereParts.join(' AND ')}`;
  }
  return { sql, params };
}

function resolvePlannerArg(plan: SelectPlan, key: string): unknown {
  const entry = plan.argsMapping.entries.find(e => e.key === key);
  if (entry) {
    return resolveMappingValue(entry.value, { args: plan.graphqlArgs, parent: plan.parent });
  }
  return plan.graphqlArgs[key];
}

function buildOrderBy(
  adapter: SqlAdapter,
  orderBy: string[] | string | undefined,
  columns: Map<string, string>,
): string {
  if (!orderBy) return '';
  const list = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const desc = item.endsWith('_DESC');
    const asc = item.endsWith('_ASC');
    if (!asc && !desc) continue;
    const fieldConst = item.replace(/_DESC$|_ASC$/, '');
    const graphqlField = constToCamel(fieldConst);
    const col = columns.get(graphqlField) || columns.get(fieldConst.toLowerCase());
    if (!col) {
      // fall back: try id
      if (graphqlField === 'id') {
        const idCol = columns.get('id');
        if (idCol) {
          parts.push(`${quoteIdent(adapter, idCol)} ${desc ? 'DESC' : 'ASC'}`);
        }
      }
      continue;
    }
    parts.push(`${quoteIdent(adapter, col)} ${desc ? 'DESC' : 'ASC'}`);
  }
  return parts.join(', ');
}

function constToCamel(constant: string): string {
  const lower = constant.toLowerCase();
  return lower.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function appendFilter(
  adapter: SqlAdapter,
  filter: Record<string, any>,
  columns: Map<string, string>,
  whereParts: string[],
  params: unknown[],
): void {
  if (!filter || typeof filter !== 'object') return;

  if (Array.isArray(filter.and)) {
    const parts: string[] = [];
    for (const sub of filter.and) {
      const inner: string[] = [];
      appendFilter(adapter, sub, columns, inner, params);
      if (inner.length) parts.push(`(${inner.join(' AND ')})`);
    }
    if (parts.length) whereParts.push(`(${parts.join(' AND ')})`);
  }
  if (Array.isArray(filter.or)) {
    const parts: string[] = [];
    for (const sub of filter.or) {
      const inner: string[] = [];
      appendFilter(adapter, sub, columns, inner, params);
      if (inner.length) parts.push(`(${inner.join(' AND ')})`);
    }
    if (parts.length) whereParts.push(`(${parts.join(' OR ')})`);
  }
  if (filter.not && typeof filter.not === 'object') {
    const inner: string[] = [];
    appendFilter(adapter, filter.not, columns, inner, params);
    if (inner.length) whereParts.push(`NOT (${inner.join(' AND ')})`);
  }

  for (const [field, ops] of Object.entries(filter)) {
    if (field === 'and' || field === 'or' || field === 'not') continue;
    if (ops == null || typeof ops !== 'object') continue;
    const col = columns.get(field);
    if (!col) continue;
    const q = quoteIdent(adapter, col);
    const o = ops as Record<string, any>;
    if ('eq' in o) {
      params.push(o.eq);
      whereParts.push(`${q} = ${placeholder(adapter, params.length)}`);
    }
    if ('ne' in o) {
      params.push(o.ne);
      whereParts.push(`${q} <> ${placeholder(adapter, params.length)}`);
    }
    if ('lt' in o) {
      params.push(o.lt);
      whereParts.push(`${q} < ${placeholder(adapter, params.length)}`);
    }
    if ('lte' in o) {
      params.push(o.lte);
      whereParts.push(`${q} <= ${placeholder(adapter, params.length)}`);
    }
    if ('gt' in o) {
      params.push(o.gt);
      whereParts.push(`${q} > ${placeholder(adapter, params.length)}`);
    }
    if ('gte' in o) {
      params.push(o.gte);
      whereParts.push(`${q} >= ${placeholder(adapter, params.length)}`);
    }
    if ('in' in o && Array.isArray(o.in)) {
      const phs = o.in.map((v: unknown) => {
        params.push(v);
        return placeholder(adapter, params.length);
      });
      whereParts.push(`${q} IN (${phs.join(', ')})`);
    }
    if ('nin' in o && Array.isArray(o.nin)) {
      const phs = o.nin.map((v: unknown) => {
        params.push(v);
        return placeholder(adapter, params.length);
      });
      whereParts.push(`${q} NOT IN (${phs.join(', ')})`);
    }
    if ('includes' in o) {
      params.push(`%${o.includes}%`);
      whereParts.push(`${q} LIKE ${placeholder(adapter, params.length)}`);
    }
    if ('startsWith' in o) {
      params.push(`${o.startsWith}%`);
      whereParts.push(`${q} LIKE ${placeholder(adapter, params.length)}`);
    }
    if ('endsWith' in o) {
      params.push(`%${o.endsWith}`);
      whereParts.push(`${q} LIKE ${placeholder(adapter, params.length)}`);
    }
    if ('isNull' in o) {
      whereParts.push(o.isNull ? `${q} IS NULL` : `${q} IS NOT NULL`);
    }
  }
}

export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64');
}

export function decodeCursor(cursor: string): number {
  const n = Number(Buffer.from(cursor, 'base64').toString('utf8'));
  return Number.isFinite(n) ? n : 0;
}

export function mapRowToGraphql(
  row: Record<string, unknown>,
  selection: ParsedSqlMapping,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const entry of selection.entries) {
    if (entry.children) continue;
    if (!entry.value || entry.value.kind !== 'column') continue;
    const raw = row[entry.value.value];
    out[entry.key] = raw != null && entry.key === 'id' ? String(raw) : raw;
  }
  return out;
}

export function selectionHasNested(selection: ParsedSqlMapping, key: string): boolean {
  return selection.entries.some(e => e.key === key && e.children);
}

export function nestedSelection(selection: ParsedSqlMapping, key: string): ParsedSqlMapping {
  const entry = selection.entries.find(e => e.key === key);
  return { entries: entry?.children || [] };
}

export function collectReturningColumns(selection: ParsedSqlMapping): string[] {
  // Prefer nested payload object (album { ... })
  for (const entry of selection.entries) {
    if (entry.children?.length) {
      return [...columnMapFromSelection({ entries: entry.children }).values()];
    }
  }
  return [...columnMapFromSelection(selection).values()];
}

export function parseArgsAndSelection(argsStr?: string | null, selectionStr?: string | null) {
  return {
    argsMapping: parseSqlMapping(argsStr),
    selection: parseSqlMapping(selectionStr),
  };
}

export type { SqlMappingEntry };
