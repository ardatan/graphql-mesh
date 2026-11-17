import {
  getNamedType,
  isObjectType,
  Kind,
  type FieldNode,
  type FragmentDefinitionNode,
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
  /** Column on the joined table (left of `where` equality). */
  joinColumn: string;
  /** Column on the parent table (from `$this.<field>` → parent selection). */
  parentColumn: string;
  selection: ParsedSqlMapping;
}

/**
 * Look ahead in `info` for `@sql(kind: ROW)` children with a single `$this` equality
 * binder — Graphile-style planning without Grafast: fold belongs-to into one SQL JOIN.
 *
 * Has-many (`ROWS`) is left to DataLoader batching (row explosion / json_agg later).
 */
export function collectBelongsToJoins(
  schema: GraphQLSchema,
  info: GraphQLResolveInfo,
  parentSelection: ParsedSqlMapping,
): BelongsToJoin[] {
  const parentType = unwrapToObjectType(info.returnType);
  if (!parentType) return [];

  const fieldNodes = collectObjectFieldNodes(
    info.fieldNodes,
    parentType,
    info.fragments,
    info.returnType,
  );
  if (!fieldNodes.length) return [];

  const joins: BelongsToJoin[] = [];
  let aliasIdx = 0;

  for (const fieldNode of fieldNodes) {
    if (fieldNode.name.value.startsWith('__')) continue;
    const fieldName = fieldNode.name.value;
    const field = parentType.getFields()[fieldName];
    if (!field) continue;

    const sqlDirs = getDefDirectives(schema, field).filter(d => d.name === 'sql');
    if (!sqlDirs.length) continue;
    const sqlArgs = sqlDirs[0].args || {};
    const kind = (sqlArgs.kind || 'ROWS') as SqlKind;
    if (kind !== 'ROW') continue;

    const whereMapping = parseSqlMapping(sqlArgs.where as string | undefined);
    const relSelection = parseSqlMapping(sqlArgs.selection as string | undefined);

    // Only fold simple `$this` equality joins (one column).
    const joinColumn = batchableEqualityColumn(whereMapping);
    if (!joinColumn) continue;
    const binder = whereMapping.entries.find(e => e.key === joinColumn);
    if (!binder?.value || binder.value.kind !== 'this') continue;

    const thisField = binder.value.path?.[0] || binder.value.value;
    if (!thisField) continue;

    const parentColEntry = parentSelection.entries.find(e => e.key === thisField);
    const parentColumn =
      parentColEntry?.value?.kind === 'column'
        ? parentColEntry.value.value
        : /* fallback: same name as GraphQL field if emitted as column */ thisField;

    // Narrow joined selection to what the client asked for under this field.
    const narrowed = narrowSelectionToFieldNodes(
      relSelection,
      fieldNode,
      info.fragments,
      unwrapToObjectType(field.type),
    );

    joins.push({
      fieldName,
      table: String(sqlArgs.table),
      alias: `j${aliasIdx++}`,
      joinColumn,
      parentColumn,
      selection: narrowed.entries.length ? narrowed : relSelection,
    });
  }

  return joins;
}

function unwrapToObjectType(type: any): GraphQLObjectType | null {
  const named = getNamedType(type);
  return isObjectType(named) ? named : null;
}

/**
 * For list/object returns, use the field's selection set.
 * For Connection types, dig into `nodes` / `edges { node }`.
 */
function collectObjectFieldNodes(
  fieldNodes: readonly FieldNode[],
  parentType: GraphQLObjectType,
  fragments: Record<string, FragmentDefinitionNode>,
  returnType: any,
): FieldNode[] {
  const named = getNamedType(returnType);
  if (!isObjectType(named)) return [];

  // Connection heuristic
  if (
    named.name.endsWith('Connection') &&
    (named.getFields().nodes || named.getFields().edges)
  ) {
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
    entries: full.entries.filter(e => requested.has(e.key)),
  };
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
