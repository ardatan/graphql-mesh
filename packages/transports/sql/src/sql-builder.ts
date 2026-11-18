import { placeholder, quoteIdent } from './adapter.js';
import { columnMapFromSelection, parseSqlMapping, resolveMappingValue } from './mapping.js';
import {
  flattenJoins,
  stampJoinedFields,
  type BelongsToJoin,
  type HasManySubselect,
} from './plan.js';
import { resolveThroughParentValue, type SqlThroughJoin } from './through.js';
import type {
  ParsedSqlMapping,
  SqlAdapter,
  SqlMappingEntry,
  SqlQueryKind,
  SqlRelationFilterMeta,
  SqlSoftDeleteOptions,
} from './types.js';

export interface OrderSpec {
  graphqlField: string;
  sqlColumn: string;
  dir: 'ASC' | 'DESC';
}

export interface BuiltQuery {
  sql: string;
  params: unknown[];
  /** Present for CONNECTION — used to encode keyset edge cursors. */
  orderSpecs?: OrderSpec[];
  /** CONNECTION: planner-resolved page size (default 10). */
  resolvedFirst?: number;
  /** CONNECTION: planner-resolved `after` cursor string. */
  resolvedAfter?: string;
}

/** Resolve soft-delete column for a table, or `undefined` if not applicable. */
export function softDeleteColumnFor(
  softDelete: SqlSoftDeleteOptions | undefined,
  table: string,
): string | undefined {
  if (!softDelete?.column) return undefined;
  // Omitted `tables` → all tables; defined allowlist (including `[]`) → only listed.
  if (softDelete.tables != null && !softDelete.tables.includes(table)) return undefined;
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
  /**
   * Full GraphQL field → SQL column map for filters / orderBy (not pruned by
   * selection lookahead). Falls back to `selection` when omitted.
   */
  columnCatalog?: Map<string, string>;
  /**
   * Stable unique key columns (from Federation `@key` / sole `id`) used as
   * CONNECTION default order and keyset tie-breakers.
   */
  uniqueKeys?: Array<{ graphqlField: string; sqlColumn: string }>;
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
  'set',
]);

/**
 * `columnCatalog` maps GraphQL field → SQL column (`id` → `limit`). Where /
 * planner binders use the **physical** SQL name as the entry key, so lookups
 * must check catalog values (and keys when gql name equals sql name).
 */
export function catalogHasPhysicalColumn(
  catalog: Map<string, string> | undefined,
  physical: string,
): boolean {
  if (!catalog?.size) return false;
  if (catalog.has(physical)) return true;
  for (const sql of catalog.values()) {
    if (sql === physical) return true;
  }
  return false;
}

/**
 * Legacy stuffed planner entry (`limit: $args.limit` / `limit: $args.take`) vs a
 * physical column that shares a planner name (`limit: $args.id` for a column
 * named `limit`).
 *
 * When `columnCatalog` is provided, a planner-named key that exists as a
 * physical SQL column is never treated as a planner. Otherwise any `$args` /
 * `$this` binder on that key is a stuffed planner (so `limit: $args.take`
 * paginates). Without a catalog, only the classic `leaf === key` form counts.
 */
export function isLegacyPlannerEntry(
  entry: SqlMappingEntry,
  columnCatalog?: Map<string, string>,
): boolean {
  if (entry.spread || entry.children || entry.key.startsWith('$')) return false;
  if (!PLANNER_KEYS.has(entry.key)) return false;
  const v = entry.value;
  if (!v || (v.kind !== 'args' && v.kind !== 'this')) return false;
  if (catalogHasPhysicalColumn(columnCatalog, entry.key)) return false;
  if (columnCatalog?.size) {
    // Catalog known and key is not a physical column → stuffed planner.
    return true;
  }
  const path = v.path?.length ? v.path : v.value ? v.value.split('.').filter(Boolean) : [];
  const leaf = path[path.length - 1];
  return leaf === entry.key;
}

export function buildSelect(adapter: SqlAdapter, plan: SelectPlan): BuiltQuery {
  const columns = columnMapFromSelection(plan.selection);
  // Filters / orderBy must see the full catalog — selection may be pruned.
  const catalog = plan.columnCatalog?.size ? plan.columnCatalog : columns;
  const joins = plan.joins?.length ? plan.joins : undefined;
  const hasMany = plan.hasMany?.length ? plan.hasMany : undefined;
  // Alias root when joins/has-many/relation EXISTS/through/computed $fn need a row ref.
  const needsAlias = Boolean(
    joins?.length ||
    hasMany?.length ||
    plan.relationFilters?.length ||
    plan.through ||
    selectionHasComputedFn(plan.selection),
  );
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
    if (
      entry.spread ||
      isBareVarPath(entry) ||
      isLegacyPlannerEntry(entry, catalog) ||
      entry.children
    ) {
      continue;
    }
    const resolved = resolveMappingValue(entry.value, {
      args: plan.graphqlArgs,
      parent: plan.parent,
    });
    if (resolved === undefined) {
      // Unresolved `$this` / parent binder must not drop relation scope (would return other parents' rows).
      if (entry.value?.kind === 'this') {
        whereParts.push(adapter === 'sqlite' ? '0' : 'FALSE');
      }
      continue;
    }
    params.push(resolved);
    whereParts.push(`${qualify(entry.key)} = ${placeholder(adapter, params.length)}`);
  }

  appendStructuredFilters(adapter, plan, catalog, whereParts, params, {
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

  const orderBy = resolvePlannerArg(plan, 'orderBy') as string[] | string | undefined;
  let orderSpecs = resolveOrderSpecs(orderBy, catalog);
  if (plan.kind === 'CONNECTION') {
    orderSpecs = ensureConnectionOrderSpecs(orderSpecs, catalog, columns, plan.uniqueKeys);
  } else if (!orderSpecs.length) {
    // ROWS/ROW with limit/offset: keep a stable default so LIMIT is deterministic.
    const idCol = catalog.get('id') || columns.get('id');
    if (idCol) {
      orderSpecs = [{ graphqlField: 'id', sqlColumn: idCol, dir: 'ASC' }];
    }
  }

  if (plan.kind === 'CONNECTION') {
    const after = resolvePlannerArg(plan, 'after');
    if (typeof after === 'string' && after.length) {
      appendKeysetPredicate(
        adapter,
        orderSpecs,
        after,
        whereParts,
        params,
        rootAlias ? qualify : undefined,
      );
    }
  }

  // Keyset cursors need order columns present on each row even if the client
  // did not select them (encode from SQL aliases / GraphQL field names).
  let selectionForSelect = plan.selection;
  if (plan.kind === 'CONNECTION' && orderSpecs.length) {
    selectionForSelect = ensureOrderColumnsInSelection(plan.selection, orderSpecs);
  }

  const selectCols = buildSelectList(
    adapter,
    selectionForSelect,
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
      const joinSoft = softDeleteColumnFor(plan.softDelete, join.table);
      if (joinSoft) {
        sql += ` AND ${quoteIdent(adapter, join.alias)}.${quoteIdent(adapter, joinSoft)} IS NULL`;
      }
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

  const orderSql = formatOrderBySql(adapter, orderSpecs, rootAlias ? qualify : undefined);
  if (orderSql) {
    sql += ` ORDER BY ${orderSql}`;
  }

  if (plan.kind === 'CONNECTION') {
    const first = Number(resolvePlannerArg(plan, 'first') ?? 10);
    const limit = Math.max(0, first);
    const afterRaw = resolvePlannerArg(plan, 'after');
    const resolvedAfter = typeof afterRaw === 'string' && afterRaw.length ? afterRaw : undefined;
    // fetch one extra to detect hasNextPage
    params.push(limit + 1);
    sql += ` LIMIT ${placeholder(adapter, params.length)}`;
    return { sql, params, orderSpecs, resolvedFirst: limit, resolvedAfter };
  }

  const limit = resolvePlannerArg(plan, 'limit');
  const offset = resolvePlannerArg(plan, 'offset');
  if (limit != null) {
    params.push(Number(limit));
    sql += ` LIMIT ${placeholder(adapter, params.length)}`;
  } else if (plan.kind === 'ROW') {
    params.push(1);
    sql += ` LIMIT ${placeholder(adapter, params.length)}`;
  } else if (offset != null && (adapter === 'mysql' || adapter === 'sqlite')) {
    // MySQL rejects OFFSET without LIMIT; SQLite needs a LIMIT before OFFSET too.
    params.push(Number.MAX_SAFE_INTEGER);
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
    // Always project the join equality column as a presence marker for mapJoinedObject
    // (matched row with all-NULL selected fields vs unmatched LEFT JOIN).
    {
      const key = `${join.alias}:${join.joinColumn}`;
      if (!seen.has(key)) {
        seen.add(key);
        cols.push(
          `${quoteIdent(adapter, join.alias)}.${quoteIdent(adapter, join.joinColumn)} AS ${quoteIdent(adapter, `${join.alias}__${join.joinColumn}`)}`,
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
    for (const fnSel of computedFnSelects(adapter, join.selection, join.alias, join.alias)) {
      cols.push(fnSel);
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
    const colSelects = relCols.map(
      ([gql, sqlCol]) =>
        `${quoteIdent(adapter, innerAlias)}.${quoteIdent(adapter, sqlCol)} AS ${quoteIdent(adapter, gql)}`,
    );
    const fnSelects = computedFnSelects(adapter, hm.selection, innerAlias);
    const selectList = [...colSelects, ...fnSelects].join(', ') || '*';
    return `(SELECT COALESCE(json_agg(row_to_json(${quoteIdent(adapter, 'x')})), '[]'::json) FROM (SELECT ${selectList} FROM ${quoteIdent(adapter, hm.table)} AS ${quoteIdent(adapter, innerAlias)} WHERE ${whereSql}${limitSql}) AS ${quoteIdent(adapter, 'x')})`;
  }

  if (adapter === 'mysql') {
    // MySQL rejects outer-refs in derived tables in the SELECT list, so we cannot
    // `FROM (SELECT … LIMIT n)`. Cap children before JSON_ARRAYAGG with a correlated
    // rank predicate (ORDER BY first projected col / join col).
    const objArgs = relCols
      .flatMap(([gql, sqlCol]) => [
        `'${escapeSqlStringLiteral(gql, 'mysql')}'`,
        `${quoteIdent(adapter, innerAlias)}.${quoteIdent(adapter, sqlCol)}`,
      ])
      .join(', ');
    let limitPred = '';
    if (hm.limit != null) {
      // Unique ranking key (PK / id), not the first client-projected column —
      // duplicate titles would otherwise exclude every sibling.
      const orderCol =
        hm.rankColumn || relCols.find(([, c]) => c !== hm.joinColumn)?.[1] || hm.joinColumn;
      const limAlias = '_hmc';
      const limSoft = softCol
        ? ` AND ${quoteIdent(adapter, limAlias)}.${quoteIdent(adapter, softCol)} IS NULL`
        : '';
      limitPred = ` AND (SELECT COUNT(*) FROM ${quoteIdent(adapter, hm.table)} AS ${quoteIdent(adapter, limAlias)} WHERE ${quoteIdent(adapter, limAlias)}.${quoteIdent(adapter, hm.joinColumn)} = ${quoteIdent(adapter, rootAlias)}.${quoteIdent(adapter, hm.parentColumn)}${limSoft} AND ${quoteIdent(adapter, limAlias)}.${quoteIdent(adapter, orderCol)} <= ${quoteIdent(adapter, innerAlias)}.${quoteIdent(adapter, orderCol)}) <= ${Number(hm.limit)}`;
    }
    return `(SELECT COALESCE(json_arrayagg(json_object(${objArgs})), json_array()) FROM ${quoteIdent(adapter, hm.table)} AS ${quoteIdent(adapter, innerAlias)} WHERE ${whereSql}${limitPred})`;
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
  const catalog = plan.columnCatalog?.size ? plan.columnCatalog : columns;
  // Alias the batch root so relation-filter EXISTS / `$fn(t)` correlate on `t`.
  const batchRootAlias =
    plan.relationFilters?.length || selectionHasComputedFn(plan.selection) ? 't' : undefined;
  const qualifyBatch = (col: string) =>
    batchRootAlias
      ? `${quoteIdent(adapter, batchRootAlias)}.${quoteIdent(adapter, col)}`
      : quoteIdent(adapter, col);
  const selectCols =
    columns.size === 0
      ? ['*']
      : [...new Set(columns.values())].map(c =>
          batchRootAlias
            ? `${qualifyBatch(c)} AS ${quoteIdent(adapter, c)}`
            : quoteIdent(adapter, c),
        );
  // Match buildSelect: include Postgres computed `$fn` columns in the batch projection.
  selectCols.push(...computedFnSelects(adapter, plan.selection, batchRootAlias));

  const params: unknown[] = [];
  const whereParts: string[] = [];

  for (const entry of plan.whereMapping.entries) {
    if (
      entry.spread ||
      isBareVarPath(entry) ||
      isLegacyPlannerEntry(entry, catalog) ||
      entry.children
    ) {
      continue;
    }
    if (entry.key === plan.column) continue; // replaced by IN list
    const resolved = resolveMappingValue(entry.value, {
      args: plan.graphqlArgs,
      parent: plan.parent,
    });
    if (resolved === undefined) {
      if (entry.value?.kind === 'this') {
        whereParts.push(adapter === 'sqlite' ? '0' : 'FALSE');
      }
      continue;
    }
    params.push(resolved);
    whereParts.push(`${qualifyBatch(entry.key)} = ${placeholder(adapter, params.length)}`);
  }

  appendStructuredFilters(adapter, plan, catalog, whereParts, params, {
    qualifyColumn: batchRootAlias ? qualifyBatch : undefined,
    rootAlias: batchRootAlias,
    relationFilters: plan.relationFilters,
    softDelete: plan.softDelete,
  });

  const softColIn = softDeleteColumnFor(plan.softDelete, plan.table);
  if (softColIn) {
    whereParts.push(`${qualifyBatch(softColIn)} IS NULL`);
  }

  if (!plan.values.length) {
    whereParts.push(adapter === 'sqlite' ? '0' : 'FALSE');
  } else {
    const inPhs = plan.values.map(v => {
      params.push(v);
      return placeholder(adapter, params.length);
    });
    whereParts.push(`${qualifyBatch(plan.column)} IN (${inPhs.join(', ')})`);
  }

  // Always include the batch column so we can regroup rows by key.
  const batchColSql = quoteIdent(adapter, plan.column);
  const batchColSelect = batchRootAlias
    ? `${qualifyBatch(plan.column)} AS ${batchColSql}`
    : batchColSql;
  if (
    !selectCols.includes(batchColSelect) &&
    !selectCols.includes(batchColSql) &&
    selectCols[0] !== '*'
  ) {
    selectCols.push(batchColSelect);
  }

  let sql = `SELECT ${selectCols.join(', ')} FROM ${quoteIdent(adapter, plan.table)}`;
  if (batchRootAlias) {
    sql += ` AS ${quoteIdent(adapter, batchRootAlias)}`;
  }
  if (whereParts.length) {
    sql += ` WHERE ${whereParts.join(' AND ')}`;
  }

  const orderBy = resolvePlannerArg(plan, 'orderBy') as string[] | string | undefined;
  let orderSpecs = resolveOrderSpecs(orderBy, catalog);
  // Match buildSelect: stable default so ROW matched[0] / ROWS lists match unbatched ORDER BY.
  if (!orderSpecs.length) {
    const idCol = catalog.get('id') || columns.get('id');
    if (idCol) {
      orderSpecs = [{ graphqlField: 'id', sqlColumn: idCol, dir: 'ASC' }];
    }
  }
  const orderSql = formatOrderBySql(adapter, orderSpecs);
  if (orderSql) {
    sql += ` ORDER BY ${orderSql}`;
  }

  const limit = resolvePlannerArg(plan, 'limit');
  const offset = resolvePlannerArg(plan, 'offset');
  if (limit != null) {
    params.push(Number(limit));
    sql += ` LIMIT ${placeholder(adapter, params.length)}`;
  } else if (offset != null && (adapter === 'mysql' || adapter === 'sqlite')) {
    params.push(Number.MAX_SAFE_INTEGER);
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
  const qTable = quoteIdent(adapter, table);
  let sql: string;
  if (!cols.length) {
    // All-default row: SQLite/Postgres `DEFAULT VALUES`; MySQL empty column list.
    sql =
      adapter === 'mysql'
        ? `INSERT INTO ${qTable} () VALUES ()`
        : `INSERT INTO ${qTable} DEFAULT VALUES`;
  } else {
    const colSql = cols.map(c => quoteIdent(adapter, c)).join(', ');
    const ph = cols.map((_, i) => placeholder(adapter, i + 1)).join(', ');
    sql = `INSERT INTO ${qTable} (${colSql}) VALUES (${ph})`;
  }
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
  filterColumns?: Map<string, string>,
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
  appendMutationWhere(adapter, table, whereMapping, graphqlArgs, whereParts, params, filterColumns);
  if (!whereParts.length) {
    throw new Error(
      `@sql mutation on ${table}: UPDATE requires a where predicate (refusing unscoped write)`,
    );
  }
  const softColUpd = softDeleteColumnFor(softDelete, table);
  if (softColUpd) {
    whereParts.push(`${quoteIdent(adapter, softColUpd)} IS NULL`);
  }
  let sql = `UPDATE ${quoteIdent(adapter, table)} SET ${sets.join(', ')} WHERE ${whereParts.join(' AND ')}`;
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
  filterColumns?: Map<string, string>,
): BuiltQuery {
  const params: unknown[] = [];
  const whereParts: string[] = [];
  appendMutationWhere(adapter, table, whereMapping, graphqlArgs, whereParts, params, filterColumns);
  // Soft-delete marker alone must not authorize a write — require real mapping predicates first.
  if (!whereParts.length) {
    throw new Error(
      `@sql mutation on ${table}: DELETE requires a where predicate (refusing unscoped write)`,
    );
  }
  const softCol = softDeleteColumnFor(softDelete, table);
  if (softCol) {
    // Soft-delete: UPDATE marker; only touch rows that are still live.
    whereParts.push(`${quoteIdent(adapter, softCol)} IS NULL`);
    const sql = `UPDATE ${quoteIdent(adapter, table)} SET ${quoteIdent(adapter, softCol)} = ${softDeleteNowSql(adapter)} WHERE ${whereParts.join(' AND ')}`;
    return { sql, params };
  }
  return {
    sql: `DELETE FROM ${quoteIdent(adapter, table)} WHERE ${whereParts.join(' AND ')}`,
    params,
  };
}

/**
 * Mutation WHERE: column equalities + structured `$args.where` / spreads.
 * Unresolved binders throw — skipping them would UPDATE/DELETE unconstrained rows.
 */
function appendMutationWhere(
  adapter: SqlAdapter,
  table: string,
  whereMapping: ParsedSqlMapping,
  graphqlArgs: Record<string, any>,
  whereParts: string[],
  params: unknown[],
  filterColumns?: Map<string, string>,
): void {
  const columns = filterColumns ?? new Map<string, string>();
  const ctx = { args: graphqlArgs };
  for (const entry of whereMapping.entries) {
    if (entry.children || isLegacyPlannerEntry(entry)) continue;
    if (entry.spread || isBareVarPath(entry)) {
      const resolved = resolveMappingValue(entry.value, ctx);
      if (resolved === undefined) {
        throw new Error(
          `@sql mutation on ${table}: where binder "${entry.key || entry.value?.value || '?'}" resolved to undefined`,
        );
      }
      // `null` / arrays / scalars bypass object checks and would skip predicates → unscoped write.
      if (resolved === null || typeof resolved !== 'object' || Array.isArray(resolved)) {
        throw new Error(
          `@sql mutation on ${table}: where filter must be a non-null object (refusing unscoped write)`,
        );
      }
      {
        const before = whereParts.length;
        appendFilter(adapter, resolved as Record<string, any>, columns, whereParts, params);
        const added = whereParts.slice(before);
        // Empty filter, or only tautologies (`nin: []` → TRUE), must not authorize writes.
        if (!added.length || added.every(isSqlTautology)) {
          throw new Error(
            `@sql mutation on ${table}: where filter produced no SQL predicate (refusing unscoped write)`,
          );
        }
      }
      continue;
    }
    const val = resolveMappingValue(entry.value, ctx);
    if (val === undefined) {
      throw new Error(
        `@sql mutation on ${table}: where column "${entry.key}" resolved to undefined`,
      );
    }
    params.push(val);
    whereParts.push(`${quoteIdent(adapter, entry.key)} = ${placeholder(adapter, params.length)}`);
  }
}

function resolvePlannerArg(plan: SelectPlan, key: SqlPlannerKey): unknown {
  const ctx = { args: plan.graphqlArgs, parent: plan.parent };
  const binder = plan.planners?.[key];
  if (binder != null && String(binder).trim()) {
    const fromBinder = resolvePlannerBinder(String(binder), ctx);
    if (fromBinder !== undefined) return fromBinder;
  }
  const catalog = plan.columnCatalog?.size
    ? plan.columnCatalog
    : columnMapFromSelection(plan.selection);
  // Compat: planner keys stuffed into `where` before the split (`limit: $args.take`).
  const stuffed = plan.whereMapping.entries.find(
    e => e.key === key && isLegacyPlannerEntry(e, catalog),
  );
  if (stuffed) {
    return resolveMappingValue(stuffed.value, ctx);
  }
  // Physical column sharing the planner name: do not fall back to graphqlArgs.limit.
  const physical = plan.whereMapping.entries.find(
    e =>
      e.key === key &&
      !e.spread &&
      !e.children &&
      !isBareVarPath(e) &&
      !isLegacyPlannerEntry(e, catalog),
  );
  if (physical && catalogHasPhysicalColumn(catalog, key)) {
    return undefined;
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
  /** Nesting depth for distinct EXISTS aliases (`_rf0`, `_rf1`, …). */
  relationDepth?: number;
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
      appendFilter(
        adapter,
        resolved as Record<string, any>,
        columns,
        whereParts,
        params,
        filterOpts,
      );
    } else if (entry.value?.kind === 'this') {
      // Structured `$this` binder with missing parent → fail closed (no rows).
      // Omitted client `$args.where` stays valid for unfiltered lists.
      whereParts.push(sqlFalse(adapter));
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
  /** When set (join folds), alias as `prefix__field` for mapJoinedObject. */
  asPrefix?: string,
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
    const asName = asPrefix ? `${asPrefix}__${entry.key}` : entry.key;
    out.push(`${fn}(${rowRef}) AS ${quoteIdent(adapter, asName)}`);
  }
  return out;
}

function selectionHasComputedFn(selection: ParsedSqlMapping): boolean {
  return selection.entries.some(e => e.value?.kind === 'fn');
}

function ensureOrderColumnsInSelection(
  selection: ParsedSqlMapping,
  orderSpecs: OrderSpec[],
): ParsedSqlMapping {
  const have = new Set(selection.entries.map(e => e.key));
  const extra = orderSpecs
    .filter(s => !have.has(s.graphqlField))
    .map(s => ({
      key: s.graphqlField,
      value: { kind: 'column' as const, value: s.sqlColumn },
    }));
  if (!extra.length) return selection;
  return { entries: [...selection.entries, ...extra] };
}

export function resolveOrderSpecs(
  orderBy: string[] | string | undefined,
  columns: Map<string, string>,
): OrderSpec[] {
  if (!orderBy) return [];
  const list = Array.isArray(orderBy) ? orderBy : [orderBy];
  const specs: OrderSpec[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const desc = item.endsWith('_DESC');
    const asc = item.endsWith('_ASC');
    if (!asc && !desc) continue;
    const fieldConst = item.replace(/_DESC$|_ASC$/, '');
    const graphqlField = constToCamel(fieldConst);
    const col =
      columns.get(graphqlField) ||
      columns.get(fieldConst.toLowerCase()) ||
      (graphqlField === 'id' ? columns.get('id') : undefined);
    if (!col) continue;
    specs.push({ graphqlField, sqlColumn: col, dir: desc ? 'DESC' : 'ASC' });
  }
  return specs;
}

function formatOrderBySql(
  adapter: SqlAdapter,
  specs: OrderSpec[],
  qualifyColumn?: (col: string) => string,
): string {
  return specs
    .map(s => {
      const q = qualifyColumn ? qualifyColumn(s.sqlColumn) : quoteIdent(adapter, s.sqlColumn);
      return `${q} ${s.dir}`;
    })
    .join(', ');
}

function constToCamel(constant: string): string {
  const lower = constant.toLowerCase();
  return lower.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Keyset cursor payload: ordered values matching `orderSpecs`. */
export interface KeysetCursorPayload {
  v: unknown[];
}

export function encodeKeysetCursor(specs: OrderSpec[], row: Record<string, unknown>): string {
  const values = specs.map(s => {
    // Prefer the projected SQL column / folded alias before GraphQL field names
    // (`id: UserId` + `legacyId: id` must not pick `row.id` when ordering by UserId).
    const sqlKeys = [
      s.sqlColumn,
      `t__${s.sqlColumn}`,
      s.sqlColumn.toLowerCase(),
      s.sqlColumn.toUpperCase(),
      `t__${s.sqlColumn.toLowerCase()}`,
    ];
    for (const key of sqlKeys) {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        const raw = row[key];
        return raw === undefined ? null : raw;
      }
    }
    if (Object.prototype.hasOwnProperty.call(row, s.graphqlField)) {
      const raw = row[s.graphqlField];
      return raw === undefined ? null : raw;
    }
    return null;
  });
  return Buffer.from(JSON.stringify({ v: values } satisfies KeysetCursorPayload), 'utf8').toString(
    'base64url',
  );
}

export function decodeKeysetCursor(cursor: string): KeysetCursorPayload | undefined {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as KeysetCursorPayload;
    if (!parsed || !Array.isArray(parsed.v)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/**
 * Default CONNECTION order + unique tie-breaker so non-unique client order
 * (e.g. TITLE_ASC) cannot skip sibling rows with the same title.
 */
export function ensureConnectionOrderSpecs(
  specs: OrderSpec[],
  catalog: Map<string, string>,
  selectionColumns: Map<string, string>,
  uniqueKeys?: Array<{ graphqlField: string; sqlColumn: string }>,
): OrderSpec[] {
  const tieKeys = uniqueKeys?.length
    ? uniqueKeys
    : (() => {
        const idCol = catalog.get('id') || selectionColumns.get('id');
        return idCol ? [{ graphqlField: 'id', sqlColumn: idCol }] : [];
      })();

  let out = [...specs];
  if (!out.length) {
    out = tieKeys.map(k => ({ graphqlField: k.graphqlField, sqlColumn: k.sqlColumn, dir: 'ASC' }));
  }
  const covered = new Set(out.map(s => s.sqlColumn));
  for (const k of tieKeys) {
    if (covered.has(k.sqlColumn)) continue;
    out.push({ graphqlField: k.graphqlField, sqlColumn: k.sqlColumn, dir: 'ASC' });
    covered.add(k.sqlColumn);
  }
  return out;
}

/** SQLite / MySQL sort NULL before non-NULL in ASC; Postgres defaults to NULLS LAST. */
function nullsSortFirst(adapter: SqlAdapter): boolean {
  return adapter !== 'postgres';
}

function keysetEq(adapter: SqlAdapter, colSql: string, val: unknown, params: unknown[]): string {
  if (val === null || val === undefined) {
    return `${colSql} IS NULL`;
  }
  params.push(val);
  return `${colSql} = ${placeholder(adapter, params.length)}`;
}

function keysetCmp(
  adapter: SqlAdapter,
  colSql: string,
  dir: 'ASC' | 'DESC',
  val: unknown,
  params: unknown[],
): string {
  const asc = dir === 'ASC';
  // ASC: SQLite/MySQL NULLS FIRST, Postgres NULLS LAST.
  // DESC flips that (SQLite/MySQL NULLS LAST, Postgres NULLS FIRST).
  const nullsFirst = asc ? nullsSortFirst(adapter) : !nullsSortFirst(adapter);
  if (val === null || val === undefined) {
    // After a NULL cursor: take remaining non-NULLs only when NULLs sorted first.
    return nullsFirst ? `${colSql} IS NOT NULL` : '1 = 0';
  }
  params.push(val);
  const ph = placeholder(adapter, params.length);
  if (asc) {
    // Greater values; when NULLS LAST also include trailing NULLs.
    return nullsFirst ? `${colSql} > ${ph}` : `(${colSql} > ${ph} OR ${colSql} IS NULL)`;
  }
  // DESC: smaller values; when NULLS LAST include trailing NULLs.
  return nullsFirst ? `${colSql} < ${ph}` : `(${colSql} < ${ph} OR ${colSql} IS NULL)`;
}

/**
 * Append direction-aware keyset predicate. Always expands to OR-of-ANDs so NULL
 * cursor values match adapter NULL ordering (tuple `> NULL` is never true).
 */
function appendKeysetPredicate(
  adapter: SqlAdapter,
  specs: OrderSpec[],
  cursor: string,
  whereParts: string[],
  params: unknown[],
  qualifyColumn?: (col: string) => string,
): void {
  if (!specs.length) return;
  const payload = decodeKeysetCursor(cursor);
  if (!payload || payload.v.length !== specs.length) return;

  const q = (col: string) => (qualifyColumn ? qualifyColumn(col) : quoteIdent(adapter, col));

  // (c0 ? v0) OR (c0 = v0 AND c1 ? v1) OR …
  const orParts: string[] = [];
  for (let i = 0; i < specs.length; i++) {
    const andParts: string[] = [];
    for (let j = 0; j < i; j++) {
      andParts.push(keysetEq(adapter, q(specs[j].sqlColumn), payload.v[j], params));
    }
    andParts.push(keysetCmp(adapter, q(specs[i].sqlColumn), specs[i].dir, payload.v[i], params));
    orParts.push(`(${andParts.join(' AND ')})`);
  }
  if (orParts.length) whereParts.push(`(${orParts.join(' OR ')})`);
}

/** @deprecated Prefer encodeKeysetCursor — kept for tests that still pass numeric offsets. */
export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64');
}

/** @deprecated Prefer decodeKeysetCursor. */
export function decodeCursor(cursor: string): number {
  const n = Number(Buffer.from(cursor, 'base64').toString('utf8'));
  return Number.isFinite(n) ? n : 0;
}

/** True when a WHERE fragment is always-true (`TRUE` / sqlite `1`, optionally parenthesized). */
function isSqlTautology(part: string): boolean {
  const t = part.replace(/[()\s]/g, '');
  return t === 'TRUE' || t === '1';
}

/** True when a WHERE fragment is always-false (`FALSE` / sqlite `0`, optionally parenthesized). */
function isSqlContradiction(part: string): boolean {
  const t = part.replace(/[()\s]/g, '');
  return t === 'FALSE' || t === '0';
}

function sqlTrue(adapter: SqlAdapter): string {
  return adapter === 'sqlite' ? '1' : 'TRUE';
}

function sqlFalse(adapter: SqlAdapter): string {
  return adapter === 'sqlite' ? '0' : 'FALSE';
}

/** Fold a list of AND-joined fragments to a single truth class when possible. */
function andTruth(parts: string[]): 'true' | 'false' | 'maybe' {
  if (!parts.length) return 'true';
  if (parts.some(isSqlContradiction)) return 'false';
  if (parts.every(isSqlTautology)) return 'true';
  return 'maybe';
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
    let contradiction = false;
    let sawBranch = false;
    const groupStart = params.length;
    for (const sub of filter.and) {
      const branchStart = params.length;
      const inner: string[] = [];
      appendFilter(adapter, sub, columns, inner, params, opts);
      if (!inner.length) {
        params.length = branchStart;
        continue;
      }
      sawBranch = true;
      const truth = andTruth(inner);
      if (truth === 'false') {
        params.length = groupStart;
        contradiction = true;
        break;
      }
      if (truth === 'true') {
        params.length = branchStart; // AND-identity: drop params
        continue;
      }
      parts.push(`(${inner.join(' AND ')})`);
    }
    if (contradiction) {
      whereParts.push(sqlFalse(adapter));
    } else if (parts.length) {
      whereParts.push(`(${parts.join(' AND ')})`);
    } else if (sawBranch) {
      // Every branch was a tautology.
      whereParts.push(sqlTrue(adapter));
    }
  }
  if (Array.isArray(filter.or)) {
    const parts: string[] = [];
    let tautology = false;
    let sawBranch = false;
    const groupStart = params.length;
    for (const sub of filter.or) {
      const branchStart = params.length;
      const inner: string[] = [];
      appendFilter(adapter, sub, columns, inner, params, opts);
      if (!inner.length) {
        params.length = branchStart;
        continue;
      }
      sawBranch = true;
      const truth = andTruth(inner);
      if (truth === 'true') {
        params.length = groupStart; // OR short-circuit: drop all branch params
        tautology = true;
        break;
      }
      if (truth === 'false') {
        params.length = branchStart; // OR-identity: drop params
        continue;
      }
      parts.push(`(${inner.join(' AND ')})`);
    }
    if (tautology) {
      whereParts.push(sqlTrue(adapter));
    } else if (parts.length) {
      whereParts.push(`(${parts.join(' OR ')})`);
    } else if (sawBranch) {
      // Every branch was a contradiction.
      whereParts.push(sqlFalse(adapter));
    }
  }
  if (filter.not && typeof filter.not === 'object') {
    const branchStart = params.length;
    const inner: string[] = [];
    appendFilter(adapter, filter.not, columns, inner, params, opts);
    if (inner.length) {
      const truth = andTruth(inner);
      if (truth === 'true') {
        params.length = branchStart;
        whereParts.push(sqlFalse(adapter));
      } else if (truth === 'false') {
        params.length = branchStart;
        whereParts.push(sqlTrue(adapter));
      } else {
        whereParts.push(`NOT (${inner.join(' AND ')})`);
      }
    }
  }

  for (const [field, ops] of Object.entries(filter)) {
    if (field === 'and' || field === 'or' || field === 'not') continue;
    if (ops == null || typeof ops !== 'object') continue;
    const o = ops as Record<string, any>;

    // Nested belongs-to / M2M: prefer relation metadata before scalar-op heuristics
    // so related columns named like `eq` / `in` still compile inside EXISTS.
    const rel = opts?.relationFilters?.find(r => r.field === field);
    if (rel) {
      const depth = opts?.relationDepth ?? 0;
      const alias = `_rf${depth}`;
      const inner: string[] = [];
      appendFilter(adapter, o, rel.columns, inner, params, {
        qualifyColumn: col => `${quoteIdent(adapter, alias)}.${quoteIdent(adapter, col)}`,
        relationFilters: rel.nestedRelationFilters,
        relationDepth: depth + 1,
        softDelete: opts?.softDelete,
      });
      const softCol = softDeleteColumnFor(opts?.softDelete, rel.relatedTable);
      if (softCol) {
        inner.push(`${quoteIdent(adapter, alias)}.${quoteIdent(adapter, softCol)} IS NULL`);
      }
      if (!inner.length) continue;
      const qualifyRoot = (col: string) =>
        opts?.qualifyColumn
          ? opts.qualifyColumn(col)
          : opts?.rootAlias
            ? `${quoteIdent(adapter, opts.rootAlias)}.${quoteIdent(adapter, col)}`
            : quoteIdent(adapter, col);
      const joinPairs =
        rel.joinPredicates && rel.joinPredicates.length > 0
          ? rel.joinPredicates
          : [{ localColumn: rel.localColumn, refColumn: rel.refColumn }];

      if (rel.junction) {
        const jAlias = `_j${depth}`;
        const jSoft = softDeleteColumnFor(opts?.softDelete, rel.junction.table);
        const jSoftSql = jSoft
          ? ` AND ${quoteIdent(adapter, jAlias)}.${quoteIdent(adapter, jSoft)} IS NULL`
          : '';
        const rootCol = qualifyRoot(rel.localColumn);
        whereParts.push(
          `EXISTS (SELECT 1 FROM ${quoteIdent(adapter, rel.junction.table)} AS ${quoteIdent(adapter, jAlias)} INNER JOIN ${quoteIdent(adapter, rel.relatedTable)} AS ${quoteIdent(adapter, alias)} ON ${quoteIdent(adapter, alias)}.${quoteIdent(adapter, rel.junction.targetColumn)} = ${quoteIdent(adapter, jAlias)}.${quoteIdent(adapter, rel.junction.remoteColumn)} WHERE ${quoteIdent(adapter, jAlias)}.${quoteIdent(adapter, rel.junction.localColumn)} = ${rootCol}${jSoftSql} AND ${inner.join(' AND ')})`,
        );
      } else {
        const joinSql = joinPairs
          .map(
            p =>
              `${quoteIdent(adapter, alias)}.${quoteIdent(adapter, p.refColumn)} = ${qualifyRoot(p.localColumn)}`,
          )
          .join(' AND ');
        whereParts.push(
          `EXISTS (SELECT 1 FROM ${quoteIdent(adapter, rel.relatedTable)} AS ${quoteIdent(adapter, alias)} WHERE ${joinSql} AND ${inner.join(' AND ')})`,
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
      if (o.in.length === 0) {
        // Empty IN () is invalid SQL; force no rows.
        whereParts.push(sqlFalse(adapter));
      } else {
        const phs = o.in.map((v: unknown) => {
          params.push(v);
          return placeholder(adapter, params.length);
        });
        whereParts.push(`${q} IN (${phs.join(', ')})`);
      }
    }
    if ('nin' in o && Array.isArray(o.nin)) {
      if (o.nin.length === 0) {
        // Empty NOT IN () is invalid SQL. `nin: []` means "exclude nothing" (= TRUE)
        // so NOT/OR composition stays correct; mutation builders reject pure tautologies.
        whereParts.push(sqlTrue(adapter));
      } else {
        const phs = o.nin.map((v: unknown) => {
          params.push(v);
          return placeholder(adapter, params.length);
        });
        whereParts.push(`${q} NOT IN (${phs.join(', ')})`);
      }
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
  // Unresolved parent must not silently drop the junction predicate (would widen to all rows).
  if (parentVal === undefined) {
    whereParts.push('1 = 0');
    return;
  }
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

/** Normalize driver binary values for GraphQLByte (Buffer / base64). */
function encodeBinaryForGraphql(raw: unknown): unknown {
  if (raw == null) return raw;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) {
    return typeof Buffer !== 'undefined' ? Buffer.from(raw) : raw;
  }
  return raw;
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
      const value = raw != null && entry.key === 'id' ? String(raw) : encodeBinaryForGraphql(raw);
      out[entry.key] = value;
      continue;
    }
    if (entry.value.kind === 'fn') {
      const raw = row[entry.key] ?? row[entry.key.toLowerCase()];
      out[entry.key] = encodeBinaryForGraphql(raw);
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
  // Presence: join equality column (always projected) distinguishes unmatched LEFT JOIN
  // from a matched row whose selected fields are all SQL NULL.
  const presenceKey = `${join.alias}__${join.joinColumn}`;
  const matched =
    Object.prototype.hasOwnProperty.call(row, presenceKey) &&
    row[presenceKey] !== undefined &&
    row[presenceKey] !== null;
  for (const entry of join.selection.entries) {
    if (!entry.value) continue;
    if (entry.value.kind === 'column') {
      const raw = row[`${join.alias}__${entry.value.value}`];
      nested[entry.key] =
        raw != null && entry.key === 'id' ? String(raw) : encodeBinaryForGraphql(raw);
      continue;
    }
    if (entry.value.kind === 'fn') {
      // Prefer prefixed alias when present (even if null) so a null joined
      // computed field is not overwritten by a non-null root column of the same name.
      const prefixed = `${join.alias}__${entry.key}`;
      const raw = Object.prototype.hasOwnProperty.call(row, prefixed)
        ? row[prefixed]
        : row[entry.key];
      nested[entry.key] = encodeBinaryForGraphql(raw);
    }
  }
  if (!matched) return null;
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
      if (!entry.value) continue;
      if (entry.value.kind === 'column') {
        const v = item[entry.key] ?? item[entry.value.value];
        out[entry.key] = v != null && entry.key === 'id' ? String(v) : encodeBinaryForGraphql(v);
        continue;
      }
      if (entry.value.kind === 'fn') {
        out[entry.key] = encodeBinaryForGraphql(item[entry.key]);
      }
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

/**
 * MySQL lacks RETURNING — build a follow-up SELECT for the written row.
 * INSERT: prefer `insertId` against an `id` / first returning column.
 * UPDATE: reuse mutation where equalities.
 */
export function buildMysqlMutationReadback(
  table: string,
  returningColumns: string[],
  opts: {
    insertId?: number | bigint;
    whereMapping?: ParsedSqlMapping;
    graphqlArgs?: Record<string, any>;
    filterColumns?: Map<string, string>;
  },
): BuiltQuery | undefined {
  if (!returningColumns.length) return undefined;
  const adapter: SqlAdapter = 'mysql';
  const selectList = returningColumns.map(c => quoteIdent(adapter, c)).join(', ');
  const params: unknown[] = [];
  const whereParts: string[] = [];

  if (opts.insertId != null && Number(opts.insertId) !== 0) {
    const idCol =
      opts.filterColumns?.get('id') ||
      returningColumns.find(c => c === 'id' || /Id$/i.test(c)) ||
      returningColumns[0];
    params.push(opts.insertId);
    whereParts.push(`${quoteIdent(adapter, idCol)} = ${placeholder(adapter, params.length)}`);
  } else if (opts.whereMapping) {
    appendMutationWhere(
      adapter,
      table,
      opts.whereMapping,
      opts.graphqlArgs || {},
      whereParts,
      params,
      opts.filterColumns,
    );
  }
  if (!whereParts.length) return undefined;
  return {
    sql: `SELECT ${selectList} FROM ${quoteIdent(adapter, table)} WHERE ${whereParts.join(' AND ')} LIMIT 1`,
    params,
  };
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
