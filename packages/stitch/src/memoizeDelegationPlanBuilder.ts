import type { DelegationPlanBuilder } from '@graphql-tools/delegate';

/**
 * Memoize a delegation plan builder on (schema, sourceSubschema, variables,
 * fragments, fieldNodes) plus an optional parent-seed key.
 *
 * `seedKeyForParent` should return a stable string capturing only the parent
 * field presence that can change the plan. For types that ignore parent, pass
 * `() => ''` so all calls share one cached plan.
 */
export function memoizeDelegationPlanBuilder(
  fn: DelegationPlanBuilder,
  seedKeyForParent: (parent: any) => string,
): DelegationPlanBuilder {
  const cache1: WeakMap<object, any> = new WeakMap();
  return function memoized(
    schema,
    sourceSubschema,
    variableValues,
    fragments,
    fieldNodes,
    context,
    info,
    parent,
  ) {
    let cache2 = cache1.get(schema as object);
    if (!cache2) {
      cache2 = new WeakMap();
      cache1.set(schema as object, cache2);
    }

    let cache3 = cache2.get(sourceSubschema as object);
    if (!cache3) {
      cache3 = new WeakMap();
      cache2.set(sourceSubschema as object, cache3);
    }

    let cache4 = cache3.get(variableValues as object);
    if (!cache4) {
      cache4 = new WeakMap();
      cache3.set(variableValues as object, cache4);
    }

    let cache5 = cache4.get(fragments as object);
    if (!cache5) {
      cache5 = new WeakMap();
      cache4.set(fragments as object, cache5);
    }

    let seedCache: Map<string, any> | undefined = cache5.get(fieldNodes as object);
    if (!seedCache) {
      seedCache = new Map();
      cache5.set(fieldNodes as object, seedCache);
    }

    const seedKey = seedKeyForParent(parent);
    const cached = seedCache.get(seedKey);
    if (cached !== undefined) {
      return cached;
    }

    const value = fn(
      schema,
      sourceSubschema,
      variableValues,
      fragments,
      fieldNodes,
      context,
      info,
      parent,
    );
    seedCache.set(seedKey, value);
    return value;
  };
}

/**
 * Shallow+nested field-presence fingerprint for parent seeding.
 * Values are ignored - only which keys exist (and nested object shapes).
 * Lists use the first object item only - fingerprinting every item would
 * hurt plan-cache hits on large homogeneous federation result sets.
 */
export function parentFieldPresenceKey(parent: any, depth = 0): string {
  if (parent == null || typeof parent !== 'object' || depth > 4) {
    return '';
  }
  const keys: string[] = [];
  for (const key of Object.keys(parent) as string[]) {
    if (key.startsWith('_') && key !== '__typename') {
      continue;
    }
    keys.push(key);
  }
  keys.sort();
  const parts: string[] = [];
  for (const key of keys) {
    const value = parent[key];
    if (value != null && typeof value === 'object') {
      if (Array.isArray(value)) {
        let childKey = '';
        for (const item of value) {
          if (item != null && typeof item === 'object') {
            childKey = parentFieldPresenceKey(item, depth + 1);
            break;
          }
        }
        parts.push(childKey ? `${key}:[${childKey}]` : key);
      } else {
        const childKey = parentFieldPresenceKey(value, depth + 1);
        parts.push(childKey ? `${key}:{${childKey}}` : key);
      }
    } else {
      parts.push(key);
    }
  }
  return parts.join(',');
}
