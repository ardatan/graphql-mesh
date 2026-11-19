import type { JSONSchemaObject } from 'json-machete';
import type { JSONSchemaOperationConfig, SchemaFieldFilter } from './types.js';

function mergeFieldFilters(
  ...filters: Array<SchemaFieldFilter | undefined>
): SchemaFieldFilter | undefined {
  const out: Record<string, Set<string>> = {};
  let any = false;
  for (const filter of filters) {
    if (!filter) continue;
    for (const [typeName, fields] of Object.entries(filter)) {
      if (!fields?.length) continue;
      any = true;
      const set = out[typeName] || (out[typeName] = new Set());
      for (const field of fields) {
        set.add(field);
      }
    }
  }
  if (!any) return undefined;
  const merged: SchemaFieldFilter = {};
  for (const [typeName, set] of Object.entries(out)) {
    merged[typeName] = [...set];
  }
  return merged;
}

function resolveFilters(
  operations: JSONSchemaOperationConfig[],
  loaderInclude?: SchemaFieldFilter,
  loaderExclude?: SchemaFieldFilter,
): { include?: SchemaFieldFilter; exclude?: SchemaFieldFilter } {
  const opIncludes: Array<SchemaFieldFilter | undefined> = [loaderInclude];
  const opExcludes: Array<SchemaFieldFilter | undefined> = [loaderExclude];
  for (const operation of operations) {
    if ('include' in operation) opIncludes.push(operation.include);
    if ('exclude' in operation) opExcludes.push(operation.exclude);
  }
  return {
    include: mergeFieldFilters(...opIncludes),
    exclude: mergeFieldFilters(...opExcludes),
  };
}

/**
 * Restrict object `properties` by explicit type→fields `include` / `exclude`.
 *
 * - `include[Type]`: whitelist — only those properties remain on titled objects
 * - `exclude[Type]`: blacklist — listed properties are removed (ignored for a
 *   type that also appears in `include`)
 *
 * Untitled objects are left unchanged. `required` is kept in sync with kept
 * properties. Unreachable types are never visited by the composer.
 *
 * Connect `selection` is intentionally ignored (runtime map only).
 */
export function pruneJsonSchemaByFieldFilter(
  schema: JSONSchemaObject,
  operations: JSONSchemaOperationConfig[],
  loaderInclude?: SchemaFieldFilter,
  loaderExclude?: SchemaFieldFilter,
): void {
  const { include, exclude } = resolveFilters(operations, loaderInclude, loaderExclude);
  if (!include && !exclude) {
    return;
  }
  applyFieldFilters(schema, include, exclude, new WeakSet());
}

function applyFieldFilters(
  schema: unknown,
  include: SchemaFieldFilter | undefined,
  exclude: SchemaFieldFilter | undefined,
  seen: WeakSet<object>,
): void {
  if (!schema || typeof schema !== 'object' || seen.has(schema as object)) {
    return;
  }
  seen.add(schema as object);
  const node = schema as JSONSchemaObject;
  const title = typeof node.title === 'string' ? node.title : undefined;
  if (title && node.properties && typeof node.properties === 'object') {
    const includeFields = include?.[title];
    const excludeFields = exclude?.[title];
    if (includeFields) {
      const allowed = new Set(includeFields);
      for (const key of Object.keys(node.properties)) {
        if (!allowed.has(key)) {
          delete node.properties[key];
        }
      }
      if (Array.isArray(node.required)) {
        node.required = node.required.filter(name => allowed.has(String(name)));
      }
    } else if (excludeFields?.length) {
      const blocked = new Set(excludeFields);
      for (const key of Object.keys(node.properties)) {
        if (blocked.has(key)) {
          delete node.properties[key];
        }
      }
      if (Array.isArray(node.required)) {
        node.required = node.required.filter(name => !blocked.has(String(name)));
      }
    }
  }
  if (node.properties) {
    for (const value of Object.values(node.properties)) {
      applyFieldFilters(value, include, exclude, seen);
    }
  }
  if (node.items) {
    applyFieldFilters(node.items, include, exclude, seen);
  }
  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
    const list = node[key];
    if (Array.isArray(list)) {
      for (const item of list) {
        applyFieldFilters(item, include, exclude, seen);
      }
    }
  }
}
