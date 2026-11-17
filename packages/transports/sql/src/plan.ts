import {
  getNamedType,
  isObjectType,
  Kind,
  type FieldNode,
  type FragmentDefinitionNode,
  type GraphQLField,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
  type SelectionNode,
} from 'graphql';
import { getDefDirectives } from '@graphql-mesh/utils';
import { batchableEqualityColumn } from './batch.js';
import { parseSqlMapping } from './mapping.js';
import type { ParsedSqlMapping, SqlKind } from './types.js';

/** Parent objects stamped with GraphQL field names already satisfied by a JOIN. */
export const SQL_JOINED_FIELDS = Symbol.for('mesh.sql.joinedFields');

export interface BelongsToJoin {
  fieldName: string;
  table: string;
  alias: string;
  /** Alias of the FROM / join this join hangs off (`t` or a parent join alias). */
  parentAlias: string;
  /** Column on the joined table (left of `where` equality). */
  joinColumn: string;
  /** Column on the parent alias (from `$this.<field>` → parent selection). */
  parentColumn: string;
  selection: ParsedSqlMapping;
  /** Nested belongs-to joins under this relation (multi-hop). */
  joins: BelongsToJoin[];
}

export interface HasManySubselect {
  fieldName: string;
  table: string;
  /** Column on the child table for the FK equality. */
  joinColumn: string;
  /** GraphQL field on parent → SQL column used in correlation. */
  parentGraphqlField: string;
  parentColumn: string;
  selection: ParsedSqlMapping;
  limit?: number;
}

export interface SelectionPlan {
  /** Root selection narrowed to requested scalar columns (+ FK keys for joins). */
  selection: ParsedSqlMapping;
  joins: BelongsToJoin[];
  hasMany: HasManySubselect[];
}

/**
 * Look ahead in `info` and build a Graphile-style selection plan:
 * - belongs-to (`ROW` + `$this`) → LEFT JOIN chain (including multi-hop)
 * - has-many (`ROWS` + `$this` + simple equality) → correlated JSON subselect
 *   (falls back to DataLoader when args/filters make folding unsafe)
 */
export function planSelection(
  schema: GraphQLSchema,
  info: GraphQLResolveInfo,
  fullSelection: ParsedSqlMapping,
): SelectionPlan {
  const parentType = resolveNodeObjectType(info.returnType);
  if (!parentType) {
    return { selection: fullSelection, joins: [], hasMany: [] };
  }

  const fieldNodes = collectObjectFieldNodes(info.fieldNodes, info.fragments, info.returnType);

  const aliasCounter = { n: 0 };
  const joins: BelongsToJoin[] = [];
  const hasMany: HasManySubselect[] = [];
  const neededRootKeys = new Set<string>();

  for (const fieldNode of fieldNodes) {
    if (fieldNode.name.value.startsWith('__')) continue;
    const planned = planChildField(
      schema,
      parentType,
      fieldNode,
      info.fragments,
      fullSelection,
      't',
      aliasCounter,
      0,
    );
    if (!planned) continue;
    if (planned.kind === 'belongsTo') {
      joins.push(planned.join);
      neededRootKeys.add(planned.parentGraphqlField);
    } else {
      hasMany.push(planned.subselect);
      neededRootKeys.add(planned.parentGraphqlField);
    }
  }

  const selection = narrowRootSelection(fullSelection, fieldNodes, info.fragments, neededRootKeys);

  return { selection, joins, hasMany };
}

/** @deprecated use planSelection */
export function collectBelongsToJoins(
  schema: GraphQLSchema,
  info: GraphQLResolveInfo,
  parentSelection: ParsedSqlMapping,
): BelongsToJoin[] {
  return planSelection(schema, info, parentSelection).joins;
}

type PlannedChild =
  | { kind: 'belongsTo'; join: BelongsToJoin; parentGraphqlField: string }
  | { kind: 'hasMany'; subselect: HasManySubselect; parentGraphqlField: string };

function planChildField(
  schema: GraphQLSchema,
  parentType: GraphQLObjectType,
  fieldNode: FieldNode,
  fragments: Record<string, FragmentDefinitionNode>,
  parentSelection: ParsedSqlMapping,
  parentAlias: string,
  aliasCounter: { n: number },
  depth: number,
): PlannedChild | null {
  if (depth > 8) return null;
  const fieldName = fieldNode.name.value;
  const field = parentType.getFields()[fieldName];
  if (!field) return null;

  const sqlArgs = getSqlArgs(schema, field);
  if (!sqlArgs) return null;
  const kind = (sqlArgs.kind || 'ROWS') as SqlKind;
  const whereMapping = parseSqlMapping(sqlArgs.where as string | undefined);
  const relSelection = parseSqlMapping(sqlArgs.selection as string | undefined);

  const joinColumn = batchableEqualityColumn(whereMapping);
  if (!joinColumn) return null;
  const binder = whereMapping.entries.find(e => e.key === joinColumn);
  if (!binder?.value || binder.value.kind !== 'this') return null;

  const thisField = binder.value.path?.[0] || binder.value.value;
  if (!thisField) return null;

  const parentColEntry = parentSelection.entries.find(e => e.key === thisField);
  const parentColumn =
    parentColEntry?.value?.kind === 'column' ? parentColEntry.value.value : thisField;

  const childType = unwrapToObjectType(field.type);

  if (kind === 'ROW') {
    const alias = `j${aliasCounter.n++}`;
    const narrowed = narrowSelectionToFieldNodes(relSelection, fieldNode, fragments, childType);
    const nestedJoins: BelongsToJoin[] = [];
    const neededKeys = new Set<string>();

    if (fieldNode.selectionSet && childType) {
      const childFields = collectFieldNodesFromSelectionSet(fieldNode, fragments);
      for (const childFn of childFields) {
        if (childFn.name.value.startsWith('__')) continue;
        const nested = planChildField(
          schema,
          childType,
          childFn,
          fragments,
          relSelection,
          alias,
          aliasCounter,
          depth + 1,
        );
        if (nested?.kind === 'belongsTo') {
          nestedJoins.push(nested.join);
          neededKeys.add(nested.parentGraphqlField);
        }
        // Nested has-many under a joined ROW stays on DataLoader (short-circuit only ROW).
      }
    }

    // Keep FK columns required by nested joins even if the client didn't ask for them.
    let selection = narrowed.entries.length ? narrowed : relSelection;
    if (neededKeys.size) {
      selection = ensureSelectionKeys(relSelection, selection, neededKeys);
    }

    return {
      kind: 'belongsTo',
      parentGraphqlField: thisField,
      join: {
        fieldName,
        table: String(sqlArgs.table),
        alias,
        parentAlias,
        joinColumn,
        parentColumn,
        selection,
        joins: nestedJoins,
      },
    };
  }

  if (kind === 'ROWS') {
    // Only fold when the only non-planner binder is `$this` equality and args are
    // limited to limit/offset (no filter/orderBy — those stay on DataLoader).
    if (!isSimpleHasManyFoldable(whereMapping, fieldNode)) return null;
    const limit = readLimitArg(fieldNode);
    const narrowed = narrowSelectionToFieldNodes(relSelection, fieldNode, fragments, childType);
    return {
      kind: 'hasMany',
      parentGraphqlField: thisField,
      subselect: {
        fieldName,
        table: String(sqlArgs.table),
        joinColumn,
        parentGraphqlField: thisField,
        parentColumn,
        selection: narrowed.entries.length ? narrowed : relSelection,
        limit,
      },
    };
  }

  return null;
}

function getSqlArgs(schema: GraphQLSchema, field: GraphQLField<any, any>) {
  const sqlDirs = getDefDirectives(schema, field).filter(d => d.name === 'sql');
  return sqlDirs[0]?.args || null;
}

function isSimpleHasManyFoldable(_whereMapping: ParsedSqlMapping, fieldNode: FieldNode): boolean {
  // Loader always emits filter/orderBy binders; fold only when the operation
  // does not pass those args (limit/offset alone are fine).
  if (fieldNode.arguments?.length) {
    for (const arg of fieldNode.arguments) {
      if (arg.name.value !== 'limit' && arg.name.value !== 'offset') return false;
    }
  }
  return true;
}

function readLimitArg(fieldNode: FieldNode): number | undefined {
  const arg = fieldNode.arguments?.find(a => a.name.value === 'limit');
  if (!arg) return undefined;
  if (arg.value.kind === Kind.INT) return Number(arg.value.value);
  return undefined;
}

function ensureSelectionKeys(
  full: ParsedSqlMapping,
  narrowed: ParsedSqlMapping,
  keys: Set<string>,
): ParsedSqlMapping {
  const have = new Set(narrowed.entries.map(e => e.key));
  const extra = full.entries.filter(e => keys.has(e.key) && !have.has(e.key));
  if (!extra.length) return narrowed;
  return { entries: [...narrowed.entries, ...extra] };
}

function narrowRootSelection(
  full: ParsedSqlMapping,
  fieldNodes: FieldNode[],
  fragments: Record<string, FragmentDefinitionNode>,
  neededKeys: Set<string>,
): ParsedSqlMapping {
  const requested = new Set<string>(neededKeys);
  for (const fn of fieldNodes) {
    if (fn.name.value.startsWith('__')) continue;
    // Scalar / enum fields on the object — relations are in neededKeys via FK.
    if (!fn.selectionSet) {
      requested.add(fn.name.value);
    } else {
      // Client asked for a relation field; FK may already be in neededKeys.
      // Also keep the GraphQL field if it maps to a column (unlikely for relations).
      requested.add(fn.name.value);
    }
  }
  if (!requested.size) return full;
  const entries = full.entries.filter(e => requested.has(e.key) && e.value?.kind === 'column');
  // If narrowing removed everything (only relations selected), keep needed FK columns.
  if (!entries.length) {
    return {
      entries: full.entries.filter(e => neededKeys.has(e.key) && e.value?.kind === 'column'),
    };
  }
  // Always keep needed FK keys
  return ensureSelectionKeys(full, { entries }, neededKeys);
}

function unwrapToObjectType(type: any): GraphQLObjectType | null {
  const named = getNamedType(type);
  return isObjectType(named) ? named : null;
}

/** Object type whose fields are planned (unwraps Relay Connection → node). */
function resolveNodeObjectType(returnType: any): GraphQLObjectType | null {
  const named = getNamedType(returnType);
  if (!isObjectType(named)) return null;
  if (named.name.endsWith('Connection')) {
    const nodes = named.getFields().nodes;
    if (nodes) return unwrapToObjectType(nodes.type);
    const edges = named.getFields().edges;
    if (edges) {
      const edgeType = unwrapToObjectType(edges.type);
      const node = edgeType?.getFields().node;
      if (node) return unwrapToObjectType(node.type);
    }
  }
  return named;
}

function collectObjectFieldNodes(
  fieldNodes: readonly FieldNode[],
  fragments: Record<string, FragmentDefinitionNode>,
  returnType: any,
): FieldNode[] {
  const named = getNamedType(returnType);
  if (!isObjectType(named)) return [];

  if (named.name.endsWith('Connection') && (named.getFields().nodes || named.getFields().edges)) {
    const out: FieldNode[] = [];
    for (const fn of fieldNodes) {
      if (!fn.selectionSet) continue;
      for (const sel of fn.selectionSet.selections) {
        collectConnectionNodeFields(sel, fragments, out);
      }
    }
    return out;
  }

  const out: FieldNode[] = [];
  for (const fn of fieldNodes) {
    if (!fn.selectionSet) continue;
    for (const sel of fn.selectionSet.selections) {
      collectFieldNodes(sel, fragments, out);
    }
  }
  return out;
}

function collectConnectionNodeFields(
  sel: SelectionNode,
  fragments: Record<string, FragmentDefinitionNode>,
  out: FieldNode[],
): void {
  if (sel.kind === Kind.FIELD) {
    if (sel.name.value === 'nodes' && sel.selectionSet) {
      for (const s of sel.selectionSet.selections) collectFieldNodes(s, fragments, out);
    } else if (sel.name.value === 'edges' && sel.selectionSet) {
      for (const edgeSel of sel.selectionSet.selections) {
        if (edgeSel.kind === Kind.FIELD && edgeSel.name.value === 'node' && edgeSel.selectionSet) {
          for (const s of edgeSel.selectionSet.selections) collectFieldNodes(s, fragments, out);
        } else if (edgeSel.kind === Kind.FRAGMENT_SPREAD || edgeSel.kind === Kind.INLINE_FRAGMENT) {
          collectConnectionNodeFields(edgeSel, fragments, out);
        }
      }
    } else if (sel.name.value === 'node' && sel.selectionSet) {
      for (const s of sel.selectionSet.selections) collectFieldNodes(s, fragments, out);
    }
    return;
  }
  if (sel.kind === Kind.INLINE_FRAGMENT && sel.selectionSet) {
    for (const s of sel.selectionSet.selections) collectConnectionNodeFields(s, fragments, out);
    return;
  }
  if (sel.kind === Kind.FRAGMENT_SPREAD) {
    const frag = fragments[sel.name.value];
    if (frag?.selectionSet) {
      for (const s of frag.selectionSet.selections) collectConnectionNodeFields(s, fragments, out);
    }
  }
}

function collectFieldNodes(
  sel: SelectionNode,
  fragments: Record<string, FragmentDefinitionNode>,
  out: FieldNode[],
): void {
  if (sel.kind === Kind.FIELD) {
    out.push(sel);
    return;
  }
  if (sel.kind === Kind.INLINE_FRAGMENT && sel.selectionSet) {
    for (const s of sel.selectionSet.selections) collectFieldNodes(s, fragments, out);
    return;
  }
  if (sel.kind === Kind.FRAGMENT_SPREAD) {
    const frag = fragments[sel.name.value];
    if (frag?.selectionSet) {
      for (const s of frag.selectionSet.selections) collectFieldNodes(s, fragments, out);
    }
  }
}

function collectFieldNodesFromSelectionSet(
  fieldNode: FieldNode,
  fragments: Record<string, FragmentDefinitionNode>,
): FieldNode[] {
  const out: FieldNode[] = [];
  if (!fieldNode.selectionSet) return out;
  for (const sel of fieldNode.selectionSet.selections) {
    collectFieldNodes(sel, fragments, out);
  }
  return out;
}

function narrowSelectionToFieldNodes(
  full: ParsedSqlMapping,
  fieldNode: FieldNode,
  fragments: Record<string, FragmentDefinitionNode>,
  objectType: GraphQLObjectType | null,
): ParsedSqlMapping {
  if (!fieldNode.selectionSet || !objectType) return full;
  const requested = new Set<string>();
  const stack: SelectionNode[] = [...fieldNode.selectionSet.selections];
  while (stack.length) {
    const sel = stack.pop()!;
    if (sel.kind === Kind.FIELD) {
      if (!sel.name.value.startsWith('__')) requested.add(sel.name.value);
      continue;
    }
    if (sel.kind === Kind.INLINE_FRAGMENT && sel.selectionSet) {
      stack.push(...sel.selectionSet.selections);
      continue;
    }
    if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const frag = fragments[sel.name.value];
      if (frag?.selectionSet) stack.push(...frag.selectionSet.selections);
    }
  }
  if (!requested.size) return full;
  return {
    entries: full.entries.filter(e => requested.has(e.key) && e.value?.kind === 'column'),
  };
}

export function flattenJoins(joins: BelongsToJoin[]): BelongsToJoin[] {
  const out: BelongsToJoin[] = [];
  const walk = (list: BelongsToJoin[]) => {
    for (const j of list) {
      out.push(j);
      if (j.joins?.length) walk(j.joins);
    }
  };
  walk(joins);
  return out;
}

export function stampJoinedFields<T extends Record<string, any>>(
  obj: T,
  joins: BelongsToJoin[],
): T {
  const names = new Set(joins.map(j => j.fieldName));
  Object.defineProperty(obj, SQL_JOINED_FIELDS, {
    value: names,
    enumerable: false,
    configurable: true,
  });
  return obj;
}

export function hasJoinedField(parent: any, fieldName: string): boolean {
  const set = parent?.[SQL_JOINED_FIELDS] as Set<string> | undefined;
  return Boolean(set?.has(fieldName));
}
