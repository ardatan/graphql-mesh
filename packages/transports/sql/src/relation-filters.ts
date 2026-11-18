import {
  getNamedType,
  isListType,
  isNonNullType,
  isObjectType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type GraphQLType,
} from 'graphql';
import { getDirective } from '@graphql-tools/utils';
import { parseSqlMapping } from './mapping.js';
import { parseSqlThrough } from './through.js';
import type { SqlRelationFilterMeta } from './types.js';

/** Bound nesting for self-referential / cyclic relation filters (finite paths). */
export const MAX_RELATION_FILTER_DEPTH = 5;

/**
 * Build nested-filter metadata from `@sql` fields on a GraphQL object type.
 * - Belongs-to ROW: `where: { artist: { name: { eq: "X" } } }` → EXISTS
 * - M2M ROWS + through: `where: { tracks: { name: { eq: "X" } } }` → junction EXISTS
 *
 * Self-referential paths (`employee.employee.name`) keep nested metadata up to
 * {@link MAX_RELATION_FILTER_DEPTH}. Deeper input paths are rejected at filter
 * compile time (see sql-builder) rather than silently dropping predicates.
 */
export function collectRelationFilters(
  schema: GraphQLSchema,
  typeName: string,
  _visited: Set<string> = new Set(),
  depth = 0,
): SqlRelationFilterMeta[] {
  if (depth > MAX_RELATION_FILTER_DEPTH) return [];

  const type = schema.getType(typeName);
  if (!type || !isObjectType(type)) return [];

  const parentColumns = columnMapFromObjectType(schema, type);
  const out: SqlRelationFilterMeta[] = [];

  for (const field of Object.values(type.getFields())) {
    const dirs = getDirective(schema, field, 'sql') || [];
    for (const dir of dirs) {
      const relatedTable = dir.table as string | undefined;
      if (!relatedTable) continue;

      const relatedType = unwrapObjectType(field.type);
      if (!relatedType) continue;
      // Prefer relation selection; fill missing filter columns from the related type map.
      const relatedColumns = columnMapFromSelectionString(dir.selection as string | undefined);
      const fromType = columnMapFromObjectType(schema, relatedType);
      for (const [k, v] of fromType) {
        if (!relatedColumns.has(k)) relatedColumns.set(k, v);
      }

      const nestedRelationFilters = collectRelationFilters(
        schema,
        relatedType.name,
        _visited,
        depth + 1,
      );

      const through = parseSqlThrough(dir.through as string | undefined);
      if (through) {
        const localColumn =
          parentColumns.get(through.parentPath[0]) ||
          // Fallback: sole `$this.id` → PK column named in parent selection
          parentColumns.get('id');
        if (!localColumn) continue;
        out.push({
          field: field.name,
          relatedTable,
          localColumn,
          refColumn: through.targetColumn,
          joinPredicates: [{ localColumn, refColumn: through.targetColumn }],
          columns: relatedColumns,
          nestedRelationFilters: nestedRelationFilters.length ? nestedRelationFilters : undefined,
          junction: {
            table: through.table,
            localColumn: through.localColumn,
            remoteColumn: through.remoteColumn,
            targetColumn: through.targetColumn,
          },
        });
        continue;
      }

      if (String(dir.kind || 'ROWS') !== 'ROW') continue;
      const where = parseSqlMapping(dir.where as string | undefined);
      const joinPredicates: Array<{ localColumn: string; refColumn: string }> = [];
      for (const entry of where.entries) {
        if (entry.spread || entry.children || !entry.value || entry.value.kind !== 'this') {
          continue;
        }
        const localGql = entry.value.path?.[0] || entry.value.value;
        const localColumn = parentColumns.get(localGql!);
        if (!localColumn) continue;
        joinPredicates.push({ localColumn, refColumn: entry.key });
      }
      if (!joinPredicates.length) continue;

      out.push({
        field: field.name,
        relatedTable,
        localColumn: joinPredicates[0].localColumn,
        refColumn: joinPredicates[0].refColumn,
        joinPredicates,
        columns: relatedColumns,
        nestedRelationFilters: nestedRelationFilters.length ? nestedRelationFilters : undefined,
      });
    }
  }
  return out;
}

function unwrapObjectType(type: GraphQLType): GraphQLObjectType | null {
  let t: GraphQLType = type;
  while (isNonNullType(t) || isListType(t)) t = t.ofType;
  const named = getNamedType(t);
  return isObjectType(named) ? named : null;
}

function unwrapConnectionNodeType(connectionType: GraphQLObjectType): GraphQLObjectType | null {
  const nodes = connectionType.getFields().nodes;
  if (nodes) return unwrapObjectType(nodes.type);
  const edges = connectionType.getFields().edges;
  if (!edges) return null;
  const edgeType = unwrapObjectType(edges.type);
  const node = edgeType?.getFields().node;
  return node ? unwrapObjectType(node.type) : null;
}

function columnMapFromSelectionString(selection: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  const sel = parseSqlMapping(selection);
  const walk = (entries: typeof sel.entries) => {
    for (const e of entries) {
      if (e.children) {
        // CONNECTION / payload wrappers — dig for column leaves
        walk(e.children);
        continue;
      }
      if (e.value?.kind === 'column') map.set(e.key, e.value.value);
    }
  };
  walk(sel.entries);
  return map;
}

/**
 * GraphQL field → SQL column for a table object type.
 * Prefer type-level `@sql(selection:)`. Fall back to Query/Mutation fields that
 * return this type — never an outgoing relation field's selection (that describes
 * the related table).
 */
function columnMapFromObjectType(
  schema: GraphQLSchema,
  type: GraphQLObjectType,
): Map<string, string> {
  const typeDirs = getDirective(schema, type, 'sql') || [];
  for (const dir of typeDirs) {
    const map = columnMapFromSelectionString(dir.selection as string | undefined);
    if (map.size) return map;
  }

  for (const root of [schema.getQueryType(), schema.getMutationType()]) {
    if (!root) continue;
    for (const field of Object.values(root.getFields())) {
      const dirs = getDirective(schema, field, 'sql') || [];
      for (const dir of dirs) {
        const kind = String(dir.kind || 'ROWS');
        let nodeType = unwrapObjectType(field.type);
        if (kind === 'CONNECTION' && nodeType) {
          nodeType = unwrapConnectionNodeType(nodeType);
        }
        if (!nodeType || nodeType.name !== type.name) continue;
        const map = columnMapFromSelectionString(dir.selection as string | undefined);
        if (map.size) return map;
      }
    }
  }

  return new Map();
}
