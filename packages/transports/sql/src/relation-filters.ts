import {
  getNamedType,
  isObjectType,
  type GraphQLSchema,
  type GraphQLObjectType,
} from 'graphql';
import { getDirective } from '@graphql-tools/utils';
import { parseSqlMapping } from './mapping.js';
import type { SqlRelationFilterMeta } from './types.js';

/**
 * Build belongs-to nested-filter metadata from `@sql` ROW fields on a GraphQL object type.
 * Used for `where: { artist: { name: { eq: "X" } } }` → EXISTS subquery.
 */
export function collectRelationFilters(
  schema: GraphQLSchema,
  typeName: string,
): SqlRelationFilterMeta[] {
  const type = schema.getType(typeName);
  if (!type || !isObjectType(type)) return [];

  const parentColumns = columnMapFromObjectType(schema, type);
  const out: SqlRelationFilterMeta[] = [];

  for (const field of Object.values(type.getFields())) {
    const dirs = getDirective(schema, field, 'sql') || [];
    for (const dir of dirs) {
      if (String(dir.kind || 'ROWS') !== 'ROW') continue;
      const relatedTable = dir.table as string | undefined;
      if (!relatedTable) continue;
      const where = parseSqlMapping(dir.where as string | undefined);
      const eq = where.entries.find(
        e =>
          !e.spread &&
          e.value &&
          (e.value.kind === 'this' || e.value.kind === 'args') &&
          !e.children,
      );
      if (!eq?.value || eq.value.kind !== 'this') continue;
      const localGql = eq.value.path?.[0] || eq.value.value;
      const localColumn = parentColumns.get(localGql);
      if (!localColumn) continue;

      const relatedType = getNamedType(field.type);
      if (!isObjectType(relatedType)) continue;
      const relatedColumns = columnMapFromObjectType(schema, relatedType);

      out.push({
        field: field.name,
        relatedTable,
        localColumn,
        refColumn: eq.key,
        columns: relatedColumns,
      });
    }
  }
  return out;
}

function columnMapFromObjectType(
  schema: GraphQLSchema,
  type: GraphQLObjectType,
): Map<string, string> {
  const map = new Map<string, string>();
  // Prefer type-level @sql selection when present
  const typeDirs = getDirective(schema, type, 'sql') || [];
  for (const dir of typeDirs) {
    const sel = parseSqlMapping(dir.selection as string | undefined);
    for (const e of sel.entries) {
      if (e.value?.kind === 'column') map.set(e.key, e.value.value);
    }
  }
  if (map.size) return map;

  // Fallback: any ROW field selection on the type that looks like identity columns
  for (const field of Object.values(type.getFields())) {
    const dirs = getDirective(schema, field, 'sql') || [];
    for (const dir of dirs) {
      const sel = parseSqlMapping(dir.selection as string | undefined);
      for (const e of sel.entries) {
        if (e.value?.kind === 'column') map.set(e.key, e.value.value);
      }
    }
    if (map.size) break;
  }
  return map;
}
