import { placeholder, quoteIdent } from './adapter.js';
import { columnMapFromSelection, parseSqlMapping, resolveMappingValue } from './mapping.js';
import {
  flattenJoins,
  stampJoinedFields,
  type BelongsToJoin,
  type HasManySubselect,
} from './plan.js';
import {
  resolveThroughParentValue,
  type SqlThroughJoin,
} from './through.js';
import type {
  ParsedSqlMapping,
  SqlAdapter,
  SqlMappingEntry,
  SqlQueryKind,
  SqlRelationFilterMeta,
  SqlSoftDeleteOptions,
} from './types.js';

export interface BuiltQuery {
  sql: string;
  params: unknown[];
}

/** Resolve soft-delete column for a table, or `undefined` if not applicable. */
export function softDeleteColumnFor(
  softDelete: SqlSoftDeleteOptions | undefined,
  table: string,
): string | undefined {
  if (!softDelete?.column) return undefined;
  if (softDelete.tables?.length && !softDelete.tables.includes(table)) return undefined;
  return softDelete.column;
}

export function softDeleteNowSql(adapter: SqlAdapter): string {
  switch (adapter) {
    case 'postgres':
      return 'NOW()';
    case 'mysql':
      return 'CURRENT_TIMESTAMP';
    case 'sqlite':
      return `datetime('now')`;
  }
}

export type SqlPlannerKey =
  'filter' | 'orderBy' | 'limit' | 'offset' | 'first' | 'after' | 'last' | 'before';

export type SqlPlanners = Partial<Record<SqlPlannerKey, string>>;

export interface SelectPlan {
  table: string;
  kind: SqlQueryKind;
  selection: ParsedSqlMapping;
  whereMapping: ParsedSqlMapping;
  graphqlArgs: Record<string, any>;
  parent?: Record<string, any>;
  /**
   * Explicit `@sql` planner binders (`orderBy: "$args.orderBy"`, …).
   * Structured filters prefer Connectors-style `...$args.where` spreads in `where`.
   * Legacy `filter: "$args.filter"` binders remain for older SDL.
   */
  planners?: SqlPlanners;
  /** Belongs-to joins folded from GraphQL selection lookahead. */
  joins?: BelongsToJoin[];
  /** Has-many folded as correlated JSON subselects. */
  hasMany?: HasManySubselect[];
  /** Soft-delete config from `@transport(options.softDelete)`. */
  softDelete?: SqlSoftDeleteOptions;
  /** Belongs-to nested filters (`where.artist.name`). */
  relationFilters?: SqlRelationFilterMeta[];
  /** Many-to-many junction (`@sql(through:)`). */
  through?: SqlThroughJoin;
}

const PLANNER_KEYS = new Set<string>([
  'filter',
  'where',
  'orderBy',
  'first',
  'after',
  'last',
  'before',
  'limit',
  'offset',
]);

export function buildSelect(adapter: SqlAdapter, plan: SelectPlan): BuiltQuery {
  const columns = columnMapFromSelection(plan.selection);
  const joins = plan.joins?.length ? plan.joins : undefined;
  const hasMany = plan.hasMany?.length ? plan.hasMany : undefined;
  const needsAlias = Boolean(joins?.length || hasMany?.length);
  const rootAlias = needsAlias ? 't' : undefined;
  const flatJoins = joins?.length ? flattenJoins(joins) : [];

  const params: unknown[] = [];
  const whereParts: string[] = [];

  const qualify = (col: string) =>
    rootAlias
      ? `${quoteIdent(adapter, rootAlias)}.${quoteIdent(adapter, col)}`
      : quoteIdent(adapter, col);

  // Equality / join predicates from `where` mapping (non-planner, non-spread)
  for (const entry of plan.whereMapping.entries) {
    if (entry.spread || isBareVarPath(entry) || PLANNER_KEYS.has(entry.key) || entry.children) {
      continue;
    }
    const resolved = resolveMappingValue(entry.value, {
      args: plan.graphqlArgs,
      parent: plan.parent,
    });
    if (resolved === undefined) continue;
    params.push(resolved);
    whereParts.push(`${qualify(entry.key)} = ${placeholder(adapter, params.length)}`);
  }

  appendStructuredFilters(adapter, plan, columns, whereParts, params, {
    qualifyColumn: rootAlias ? qualify : undefined,
    relationFilters: plan.relationFilters,
    rootAlias,
    softDelete: plan.softDelete,
  });

  if (plan.through) {
    appendThroughExists(adapter, plan.through, plan.parent, whereParts, params, {
      qualifyColumn: qualify,
      softDelete: plan.softDelete,
    });
  }

  const softCol = softDeleteColumnFor(plan.softDelete, plan.table);
  if (softCol) {
    whereParts.push(`${qualify(softCol)} IS NULL`);
  }

  const selectCols = buildSelectList(
    adapter,
    plan.selection,
    joins,
    hasMany,
    rootAlias,
    plan.softDelete,
  );

  let sql = `SELECT ${selectCols.join(', ')} FROM ${quoteIdent(adapter, plan.table)}`;
  if (rootAlias) {
    sql += ` AS ${quoteIdent(adapter, rootAlias)}`;
    for (const join of flatJoins) {
      const parentAlias = join.parentAlias || rootAlias;
      sql += ` LEFT JOIN ${quoteIdent(adapter, join.table)} AS ${quoteIdent(adapter, join.alias)}`;
      sql += ` ON ${quoteIdent(adapter, join.alias)}.${quoteIdent(adapter, join.joinColumn)}`;
      sql += ` = ${quoteIdent(adapter, parentAlias)}.${quoteIdent(adapter, join.parentColumn)}`;
    }
  }
  if (whereParts.length) {
    sql += ` WHERE ${whereParts.join(' AND ')}`;
  }

  if (plan.kind === 'COUNT') {
    // Joins must not multiply COUNT — count root table only.
    sql = `SELECT COUNT(*) AS ${quoteIdent(adapter, 'count')} FROM ${quoteIdent(adapter, plan.table)}`;
    if (rootAlias) {
      sql = `SELECT COUNT(*) AS ${quoteIdent(adapter, 'count')} FROM ${quoteIdent(adapter, plan.table)} AS ${quoteIdent(adapter, rootAlias)}`;
    }
    if (whereParts.length) {
      sql += ` WHERE ${whereParts.join(' AND ')}`;
    }
    return { sql, params };
  }

  const orderBy = resolvePlannerArg(plan, 'orderBy') as string[] | string | undefined;
  let orderSql = buildOrderBy(adapter, orderBy, columns, rootAlias ? qualify : undefined);
  // Stable pagination: JOINs / JSON subselects can reshuffle unordered LIMIT results.
  if (!orderSql) {
    const idCol = columns.get('id');
    if (idCol) {
      orderSql = rootAlias ? qualify(idCol) : quoteIdent(adapter, idCol);
    }
  }
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

function buildSelectList(
  adapter: SqlAdapter,
  selection: ParsedSqlMapping,
  joins: BelongsToJoin[] | undefined,
  hasMany: HasManySubselect[] | undefined,
  rootAlias: string | undefined,
  softDelete?: SqlSoftDeleteOptions,
): string[] {
  const columns = columnMapFromSelection(selection);
  const fnSelects = computedFnSelects(adapter, selection, rootAlias);
  if ((!joins?.length && !hasMany?.length) || !rootAlias) {
    if (columns.size === 0 && !fnSelects.length) return ['*'];
    const cols = [...new Set(columns.values())].map(c => quoteIdent(adapter, c));
    return [...cols, ...fnSelects];
  }

  const cols: string[] = [];
  const seen = new Set<string>();
  const pushRoot = (sqlCol: string) => {
    if (seen.has(`t:${sqlCol}`)) return;
    seen.add(`t:${sqlCol}`);
    cols.push(
      `${quoteIdent(adapter, rootAlias)}.${quoteIdent(adapter, sqlCol)} AS ${quoteIdent(adapter, `t__${sqlCol}`)}`,
    );
  };
  for (const sqlCol of columns.values()) pushRoot(sqlCol);
  for (const fnSel of computedFnSelects(adapter, selection, rootAlias)) {
    cols.push(fnSel);
  }

  const flat = flattenJoins(joins || []);
  for (const join of flat) {
    if (join.parentAlias === rootAlias) {
      pushRoot(join.parentColumn);
    } else {
      // Nested hop: ensure the FK column is selected from the parent join alias.
      const key = `${join.parentAlias}:${join.parentColumn}`;
      if (!seen.has(key)) {
        seen.add(key);
        cols.push(
          `${quoteIdent(adapter, join.parentAlias)}.${quoteIdent(adapter, join.parentColumn)} AS ${quoteIdent(adapter, `${join.parentAlias}__${join.parentColumn}`)}`,
        );
      }
    }
    const relCols = columnMapFromSelection(join.selection);
    for (const sqlCol of relCols.values()) {
      const key = `${join.alias}:${sqlCol}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cols.push(
        `${quoteIdent(adapter, join.alias)}.${quoteIdent(adapter, sqlCol)} AS ${quoteIdent(adapter, `${join.alias}__${sqlCol}`)}`,
      );
    }
  }

  for (const hm of hasMany || []) {
    pushRoot(hm.parentColumn);
    cols.push(
      `${buildHasManyJsonSubselect(adapter, hm, rootAlias, softDelete)} AS ${quoteIdent(adapter, `hm__${hm.fieldName}`)}`,
    );
  }

  if (!cols.length) {
    throw new Error('SQL join plan requires a column selection mapping on the root table');
  }
  return cols;
}

/**
 * Escape a value embedded in a single-quoted SQL string literal.
 * Backslashes must be escaped before quotes (CodeQL js/incomplete-sanitization).
 */
export function escapeSqlStringLiteral(
  value: string,
  style: 'mysql' | 'sqlite' = 'sqlite',
): string {
  // Always escape `\` first so later quote escapes cannot be undone by a trailing `\`.
  let out = value.replace(/\\/g, '\\\\');
  if (style === 'mysql') {
    out = out.replace(/'/g, "\\'");
  } else {
    out = out.replace(/'/g, "''");
  }
  return out;
}

function buildHasManyJsonSubselect(
  adapter: SqlAdapter,
  hm: HasManySubselect,
  rootAlias: string,
  softDelete?: SqlSoftDeleteOptions,
): string {
  const relCols = [...columnMapFromSelection(hm.selection).entries()];
  const innerAlias = 'hm';
  const limitSql = hm.limit != null ? ` LIMIT ${Number(hm.limit)}` : '';
  const joinPred = `${quoteIdent(adapter, innerAlias)}.${quoteIdent(adapter, hm.joinColumn)} = ${quoteIdent(adapter, rootAlias)}.${quoteIdent(adapter, hm.parentColumn)}`;
  const softCol = softDeleteColumnFor(softDelete, hm.table);
  const softPred = softCol
    ? ` AND ${quoteIdent(adapter, innerAlias)}.${quoteIdent(adapter, softCol)} IS NULL`
    : '';
  const whereSql = `${joinPred}${softPred}`;

  if (adapter === 'postgres') {
    const selectList = relCols
      .map(
        ([gql, sqlCol]) =>
          `${quoteIdent(adapter, innerAlias)}.${quoteIdent(adapter, sqlCol)} AS ${quoteIdent(adapter, gql)}`,
      )
      .join(', ');
    return `(SELECT COALESCE(json_agg(row_to_json(${quoteIdent(adapter, 'x')})), '[]'::json) FROM (SELECT ${selectList} FROM ${quoteIdent(adapter, hm.table)} AS ${quoteIdent(adapter, innerAlias)} WHERE ${whereSql}${limitSql}) AS ${quoteIdent(adapter, 'x')})`;
  }

  if (adapter === 'mysql') {
    // MySQL rejects outer-refs inside derived tables in the SELECT list, so do not
    // wrap the scan in `(SELECT … LIMIT n) AS hm`. Correlate directly; LIMIT (when
    // present) applies to the aggregate subquery as a whole — prefer client-side
    // limits on has-many args when strict row caps are required.
    const objArgs = relCols
      .flatMap(([gql, sqlCol]) => [
        `'${escapeSqlStringLiteral(gql, 'mysql')}'`,
        `${quoteIdent(adapter, innerAlias)}.${quoteIdent(adapter, sqlCol)}`,
      ])
      .join(', ');
    return `(SELECT COALESCE(json_arrayagg(json_object(${objArgs})), json_array()) FROM ${quoteIdent(adapter, hm.table)} AS ${quoteIdent(adapter, innerAlias)} WHERE ${whereSql}${limitSql})`;
  }

  // sqlite — aggregate over a limited inner select; json_object reads projected column names.
  const objArgs = relCols
    .flatMap(([gql, sqlCol]) => [
      `'${escapeSqlStringLiteral(gql, 'sqlite')}'`,
      quoteIdent(adapter, sqlCol),
    ])
    .join(', ');
  const innerSelect = relCols.map(([, c]) => quoteIdent(adapter, c)).join(', ');
  return `(SELECT COALESCE(json_group_array(json_object(${objArgs})), json_array()) FROM (SELECT ${innerSelect} FROM ${quoteIdent(adapter, hm.table)} AS ${quoteIdent(adapter, innerAlias)} WHERE ${whereSql}${limitSql}))`;
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

  for (const entry of plan.whereMapping.entries) {
    if (entry.spread || isBareVarPath(entry) || PLANNER_KEYS.has(entry.key) || entry.children) {
      continue;
    }
    if (entry.key === plan.column) continue; // replaced by IN list
    const resolved = resolveMappingValue(entry.value, {
      args: plan.graphqlArgs,
      parent: plan.parent,
    });
    if (resolved === undefined) continue;
    params.push(resolved);
    whereParts.push(`${quoteIdent(adapter, entry.key)} = ${placeholder(adapter, params.length)}`);
  }

  appendStructuredFilters(adapter, plan, columns, whereParts, params);

  const softColIn = softDeleteColumnFor(plan.softDelete, plan.table);
  if (softColIn) {
    whereParts.push(`${quoteIdent(adapter, softColIn)} IS NULL`);
  }

  const inPhs = plan.values.map(v => {
    params.push(v);
    return placeholder(adapter, params.length);
  });
  whereParts.push(`${quoteIdent(adapter, plan.column)} IN (${inPhs.join(', ')})`);

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
  setMapping: ParsedSqlMapping,
  graphqlArgs: Record<string, any>,
  returningColumns: string[],
): BuiltQuery {
  const cols: string[] = [];
  const params: unknown[] = [];
  for (const entry of setMapping.entries) {
    if (entry.children) continue;
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
  setMapping: ParsedSqlMapping,
  whereMapping: ParsedSqlMapping,
  graphqlArgs: Record<string, any>,
  returningColumns: string[],
  softDelete?: SqlSoftDeleteOptions,
): BuiltQuery {
  const params: unknown[] = [];
  const sets: string[] = [];
  for (const entry of setMapping.entries) {
    if (entry.children) continue;
    const val = resolveMappingValue(entry.value, { args: graphqlArgs });
    if (val === undefined) continue;
    params.push(val);
    sets.push(`${quoteIdent(adapter, entry.key)} = ${placeholder(adapter, params.length)}`);
  }
  if (!sets.length) {
    throw new Error(`@sql UPDATE on ${table} has no SET columns`);
  }
  const whereParts: string[] = [];
  for (const entry of whereMapping.entries) {
    if (entry.spread || isBareVarPath(entry) || entry.children || PLANNER_KEYS.has(entry.key)) {
      continue;
    }
    const val = resolveMappingValue(entry.value, { args: graphqlArgs });
    if (val === undefined) continue;
    params.push(val);
    whereParts.push(`${quoteIdent(adapter, entry.key)} = ${placeholder(adapter, params.length)}`);
  }
  const softColUpd = softDeleteColumnFor(softDelete, table);
  if (softColUpd) {
    whereParts.push(`${quoteIdent(adapter, softColUpd)} IS NULL`);
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
  whereMapping: ParsedSqlMapping,
  graphqlArgs: Record<string, any>,
  softDelete?: SqlSoftDeleteOptions,
): BuiltQuery {
  const params: unknown[] = [];
  const whereParts: string[] = [];
  for (const entry of whereMapping.entries) {
    if (entry.spread || isBareVarPath(entry) || entry.children || PLANNER_KEYS.has(entry.key)) {
      continue;
    }
    const val = resolveMappingValue(entry.value, { args: graphqlArgs });
    if (val === undefined) continue;
    params.push(val);
    whereParts.push(`${quoteIdent(adapter, entry.key)} = ${placeholder(adapter, params.length)}`);
  }
  const softCol = softDeleteColumnFor(softDelete, table);
  if (softCol) {
    // Soft-delete: UPDATE marker; only touch rows that are still live.
    whereParts.push(`${quoteIdent(adapter, softCol)} IS NULL`);
    let sql = `UPDATE ${quoteIdent(adapter, table)} SET ${quoteIdent(adapter, softCol)} = ${softDeleteNowSql(adapter)}`;
    if (whereParts.length) {
      sql += ` WHERE ${whereParts.join(' AND ')}`;
    }
    return { sql, params };
  }
  let sql = `DELETE FROM ${quoteIdent(adapter, table)}`;
  if (whereParts.length) {
    sql += ` WHERE ${whereParts.join(' AND ')}`;
  }
  return { sql, params };
}

function resolvePlannerArg(plan: SelectPlan, key: SqlPlannerKey): unknown {
  const ctx = { args: plan.graphqlArgs, parent: plan.parent };
  const binder = plan.planners?.[key];
  if (binder != null && String(binder).trim()) {
    const fromBinder = resolvePlannerBinder(String(binder), ctx);
    if (fromBinder !== undefined) return fromBinder;
  }
  // Compat: planner keys stuffed into `where` before the split.
  const entry = plan.whereMapping.entries.find(e => e.key === key);
  if (entry) {
    return resolveMappingValue(entry.value, ctx);
  }
  return plan.graphqlArgs[key];
}

/**
 * Resolve `@sql(orderBy: "$args.orderBy")` style binders.
 * Also accepts a one-line mapping (`orderBy: $args.orderBy`) for symmetry with `where`.
 */
function resolvePlannerBinder(
  binder: string,
  ctx: { args?: Record<string, any>; parent?: any },
): unknown {
  const trimmed = binder.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('$')) {
    const mapping = parseSqlMapping(`_: ${trimmed}`);
    return resolveMappingValue(mapping.entries[0]?.value, ctx);
  }
  const mapping = parseSqlMapping(trimmed);
  if (mapping.entries.length === 1 && !mapping.entries[0].spread) {
    return resolveMappingValue(mapping.entries[0].value, ctx);
  }
  return undefined;
}

/** Bare `$args.where` / `$this.x` path entry (whole-value binder, not `col: $args.x`). */
function isBareVarPath(entry: SqlMappingEntry): boolean {
  return Boolean(
    entry.key.startsWith('$') &&
    entry.value &&
    (entry.value.kind === 'args' || entry.value.kind === 'this'),
  );
}

/**
 * Apply structured filters from:
 * - Connectors-style spreads (`...$args.where`) when merging with fixed keys
 * - bare whole-value binders (`$args.where`) when where is only the client filter
 * - legacy `@sql(filter:)` / stuffed `filter: $args.filter`
 */
type AppendFilterOpts = {
  qualifyColumn?: (col: string) => string;
  relationFilters?: SqlRelationFilterMeta[];
  rootAlias?: string;
  softDelete?: SqlSoftDeleteOptions;
};

function appendStructuredFilters(
  adapter: SqlAdapter,
  plan: SelectPlan,
  columns: Map<string, string>,
  whereParts: string[],
  params: unknown[],
  opts?: AppendFilterOpts,
): void {
  const ctx = { args: plan.graphqlArgs, parent: plan.parent };
  const filterOpts: AppendFilterOpts = {
    ...opts,
    relationFilters: opts?.relationFilters ?? plan.relationFilters,
    softDelete: opts?.softDelete ?? plan.softDelete,
  };
  for (const entry of plan.whereMapping.entries) {
    if (!entry.spread && !isBareVarPath(entry)) continue;
    const resolved = resolveMappingValue(entry.value, ctx);
    if (resolved && typeof resolved === 'object' && !Array.isArray(resolved)) {
      appendFilter(adapter, resolved as Record<string, any>, columns, whereParts, params, filterOpts);
    }
  }

  // Legacy: `@sql(filter: "$args.filter")` or `filter: $args.filter` stuffed in where.
  const legacyFilter = resolvePlannerArg(plan, 'filter');
  if (legacyFilter && typeof legacyFilter === 'object') {
    appendFilter(
      adapter,
      legacyFilter as Record<string, any>,
      columns,
      whereParts,
      params,
      filterOpts,
    );
  }
}

/** Postgres computed-column selects: `fullName: $fn.public.users_full_name` */
function computedFnSelects(
  adapter: SqlAdapter,
  selection: ParsedSqlMapping,
  rootAlias: string | undefined,
): string[] {
  if (adapter !== 'postgres') return [];
  const out: string[] = [];
  for (const entry of selection.entries) {
    if (!entry.value || entry.value.kind !== 'fn' || !entry.value.value) continue;
    const fn = entry.value.value.includes('.')
      ? entry.value.value
          .split('.')
          .map(p => quoteIdent(adapter, p))
          .join('.')
      : quoteIdent(adapter, entry.value.value);
    const rowRef = rootAlias ? quoteIdent(adapter, rootAlias) : quoteIdent(adapter, 't');
    // Alias with GraphQL field name so mapRowToGraphql can find it.
    out.push(`${fn}(${rowRef}) AS ${quoteIdent(adapter, entry.key)}`);
  }
  return out;
}

function buildOrderBy(
  adapter: SqlAdapter,
  orderBy: string[] | string | undefined,
  columns: Map<string, string>,
  qualifyColumn?: (col: string) => string,
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
          const q = qualifyColumn ? qualifyColumn(idCol) : quoteIdent(adapter, idCol);
          parts.push(`${q} ${desc ? 'DESC' : 'ASC'}`);
        }
      }
      continue;
    }
    const q = qualifyColumn ? qualifyColumn(col) : quoteIdent(adapter, col);
    parts.push(`${q} ${desc ? 'DESC' : 'ASC'}`);
  }
  return parts.join(', ');
}

function constToCamel(constant: string): string {
  const lower = constant.toLowerCase();
  return lower.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

const SCALAR_FILTER_KEYS = new Set([
  'eq',
  'ne',
  'lt',
  'lte',
  'gt',
  'gte',
  'in',
  'nin',
  'includes',
  'startsWith',
  'endsWith',
  'like',
  'ilike',
  'isNull',
]);

function isScalarFilterOps(ops: Record<string, any>): boolean {
  return Object.keys(ops).some(k => SCALAR_FILTER_KEYS.has(k));
}

function appendFilter(
  adapter: SqlAdapter,
  filter: Record<string, any>,
  columns: Map<string, string>,
  whereParts: string[],
  params: unknown[],
  opts?: AppendFilterOpts,
): void {
  if (!filter || typeof filter !== 'object') return;
  const qualify = opts?.qualifyColumn;

  if (Array.isArray(filter.and)) {
    const parts: string[] = [];
    for (const sub of filter.and) {
      const inner: string[] = [];
      appendFilter(adapter, sub, columns, inner, params, opts);
      if (inner.length) parts.push(`(${inner.join(' AND ')})`);
    }
    if (parts.length) whereParts.push(`(${parts.join(' AND ')})`);
  }
  if (Array.isArray(filter.or)) {
    const parts: string[] = [];
    for (const sub of filter.or) {
      const inner: string[] = [];
      appendFilter(adapter, sub, columns, inner, params, opts);
      if (inner.length) parts.push(`(${inner.join(' AND ')})`);
    }
    if (parts.length) whereParts.push(`(${parts.join(' OR ')})`);
  }
  if (filter.not && typeof filter.not === 'object') {
    const inner: string[] = [];
    appendFilter(adapter, filter.not, columns, inner, params, opts);
    if (inner.length) whereParts.push(`NOT (${inner.join(' AND ')})`);
  }

  for (const [field, ops] of Object.entries(filter)) {
    if (field === 'and' || field === 'or' || field === 'not') continue;
    if (ops == null || typeof ops !== 'object') continue;
    const o = ops as Record<string, any>;

    // Nested belongs-to / M2M: `where: { artist: { name: { eq: "X" } } }`
    const rel = opts?.relationFilters?.find(r => r.field === field);
    if (rel && !isScalarFilterOps(o)) {
      const alias = '_rf';
      const inner: string[] = [];
      appendFilter(adapter, o, rel.columns, inner, params, {
        qualifyColumn: col => `${quoteIdent(adapter, alias)}.${quoteIdent(adapter, col)}`,
      });
      const softCol = softDeleteColumnFor(opts?.softDelete, rel.relatedTable);
      if (softCol) {
        inner.push(`${quoteIdent(adapter, alias)}.${quoteIdent(adapter, softCol)} IS NULL`);
      }
      if (!inner.length) continue;
      const rootCol = opts?.qualifyColumn
        ? opts.qualifyColumn(rel.localColumn)
        : opts?.rootAlias
          ? `${quoteIdent(adapter, opts.rootAlias)}.${quoteIdent(adapter, rel.localColumn)}`
          : quoteIdent(adapter, rel.localColumn);

      if (rel.junction) {
        const jAlias = '_j';
        const jSoft = softDeleteColumnFor(opts?.softDelete, rel.junction.table);
        const jSoftSql = jSoft
          ? ` AND ${quoteIdent(adapter, jAlias)}.${quoteIdent(adapter, jSoft)} IS NULL`
          : '';
        whereParts.push(
          `EXISTS (SELECT 1 FROM ${quoteIdent(adapter, rel.junction.table)} AS ${quoteIdent(adapter, jAlias)} INNER JOIN ${quoteIdent(adapter, rel.relatedTable)} AS ${quoteIdent(adapter, alias)} ON ${quoteIdent(adapter, alias)}.${quoteIdent(adapter, rel.junction.targetColumn)} = ${quoteIdent(adapter, jAlias)}.${quoteIdent(adapter, rel.junction.remoteColumn)} WHERE ${quoteIdent(adapter, jAlias)}.${quoteIdent(adapter, rel.junction.localColumn)} = ${rootCol}${jSoftSql} AND ${inner.join(' AND ')})`,
        );
      } else {
        whereParts.push(
          `EXISTS (SELECT 1 FROM ${quoteIdent(adapter, rel.relatedTable)} AS ${quoteIdent(adapter, alias)} WHERE ${quoteIdent(adapter, alias)}.${quoteIdent(adapter, rel.refColumn)} = ${rootCol} AND ${inner.join(' AND ')})`,
        );
      }
      continue;
    }

    const col = columns.get(field);
    if (!col) continue;
    const q = qualify ? qualify(col) : quoteIdent(adapter, col);
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
    if ('like' in o) {
      params.push(o.like);
      whereParts.push(`${q} LIKE ${placeholder(adapter, params.length)}`);
    }
    if ('ilike' in o) {
      params.push(o.ilike);
      if (adapter === 'postgres') {
        whereParts.push(`${q} ILIKE ${placeholder(adapter, params.length)}`);
      } else {
        whereParts.push(`LOWER(${q}) LIKE LOWER(${placeholder(adapter, params.length)})`);
      }
    }
    if ('isNull' in o) {
      whereParts.push(o.isNull ? `${q} IS NULL` : `${q} IS NOT NULL`);
    }
  }
}

function appendThroughExists(
  adapter: SqlAdapter,
  through: SqlThroughJoin,
  parent: Record<string, any> | undefined,
  whereParts: string[],
  params: unknown[],
  opts: {
    qualifyColumn: (col: string) => string;
    softDelete?: SqlSoftDeleteOptions;
  },
): void {
  const parentVal = resolveThroughParentValue(through, parent);
  if (parentVal === undefined) return;
  params.push(parentVal);
  const jAlias = '_m2m';
  const softCol = softDeleteColumnFor(opts.softDelete, through.table);
  const softSql = softCol
    ? ` AND ${quoteIdent(adapter, jAlias)}.${quoteIdent(adapter, softCol)} IS NULL`
    : '';
  whereParts.push(
    `EXISTS (SELECT 1 FROM ${quoteIdent(adapter, through.table)} AS ${quoteIdent(adapter, jAlias)} WHERE ${quoteIdent(adapter, jAlias)}.${quoteIdent(adapter, through.localColumn)} = ${placeholder(adapter, params.length)} AND ${quoteIdent(adapter, jAlias)}.${quoteIdent(adapter, through.remoteColumn)} = ${opts.qualifyColumn(through.targetColumn)}${softSql})`,
  );
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
    if (!entry.value) continue;
    if (entry.value.kind === 'column') {
      const raw = row[entry.value.value] ?? row[`t__${entry.value.value}`];
      out[entry.key] = raw != null && entry.key === 'id' ? String(raw) : raw;
      continue;
    }
    if (entry.value.kind === 'fn') {
      const raw = row[entry.key] ?? row[entry.key.toLowerCase()];
      out[entry.key] = raw;
    }
  }
  return out;
}

export function mapRowToGraphqlWithJoins(
  row: Record<string, unknown>,
  selection: ParsedSqlMapping,
  joins: BelongsToJoin[],
  hasMany: HasManySubselect[] = [],
): Record<string, unknown> {
  const out = mapRowToGraphql(row, selection);
  for (const join of joins) {
    out[join.fieldName] = mapJoinedObject(row, join);
  }
  const stamped = stampJoinedFields(out, joins);
  for (const hm of hasMany) {
    stamped[hm.fieldName] = parseHasManyJson(row[`hm__${hm.fieldName}`], hm);
  }
  if (hasMany.length) {
    const existing = (stamped as any)[Symbol.for('mesh.sql.joinedFields')] as
      Set<string> | undefined;
    const names = new Set(existing ? [...existing] : []);
    for (const hm of hasMany) names.add(hm.fieldName);
    Object.defineProperty(stamped, Symbol.for('mesh.sql.joinedFields'), {
      value: names,
      enumerable: false,
      configurable: true,
    });
  }
  return stamped;
}

function mapJoinedObject(
  row: Record<string, unknown>,
  join: BelongsToJoin,
): Record<string, unknown> | null {
  const nested: Record<string, unknown> = {};
  let any = false;
  for (const entry of join.selection.entries) {
    if (!entry.value || entry.value.kind !== 'column') continue;
    const raw = row[`${join.alias}__${entry.value.value}`];
    if (raw !== undefined && raw !== null) any = true;
    nested[entry.key] = raw != null && entry.key === 'id' ? String(raw) : raw;
  }
  if (!any) return null;
  if (join.joins?.length) {
    for (const child of join.joins) {
      nested[child.fieldName] = mapJoinedObject(row, child);
    }
    stampJoinedFields(nested, join.joins);
  }
  return nested;
}

function parseHasManyJson(raw: unknown, hm: HasManySubselect): Record<string, unknown>[] {
  if (raw == null) return [];
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item: any) => {
    if (!item || typeof item !== 'object') return {};
    const out: Record<string, unknown> = {};
    for (const entry of hm.selection.entries) {
      if (!entry.value || entry.value.kind !== 'column') continue;
      const v = item[entry.key] ?? item[entry.value.value];
      out[entry.key] = v != null && entry.key === 'id' ? String(v) : v;
    }
    return out;
  });
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

export function parseSqlDirectiveMappings(opts: {
  where?: string | null;
  set?: string | null;
  selection?: string | null;
  filter?: string | null;
  orderBy?: string | null;
  limit?: string | null;
  offset?: string | null;
  first?: string | null;
  after?: string | null;
  last?: string | null;
  before?: string | null;
}) {
  const planners: SqlPlanners = {};
  for (const key of [
    'filter',
    'orderBy',
    'limit',
    'offset',
    'first',
    'after',
    'last',
    'before',
  ] as const) {
    const v = opts[key];
    if (v != null && String(v).trim()) planners[key] = String(v);
  }
  return {
    whereMapping: parseSqlMapping(opts.where),
    setMapping: parseSqlMapping(opts.set),
    selection: parseSqlMapping(opts.selection),
    planners,
  };
}

/** @deprecated use parseSqlDirectiveMappings */
export function parseArgsAndSelection(argsStr?: string | null, selectionStr?: string | null) {
  return parseSqlDirectiveMappings({ where: argsStr, selection: selectionStr });
}

export type { SqlMappingEntry };
