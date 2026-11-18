import { ObjectId } from 'mongodb';
import { parseMongoMapping, resolveMappingValue } from './mapping.js';
import type { ParsedMongoMapping } from './types.js';

/**
 * Build a MongoDB filter document from `@mongo(where:)` mapping + GraphQL args/parent.
 */
export function buildMongoFilter(
  whereSource: string | null | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
): Record<string, unknown> {
  const parsed = parseMongoMapping(whereSource);
  return filterFromMapping(parsed, ctx);
}

export function filterFromMapping(
  parsed: ParsedMongoMapping,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  for (const entry of parsed.entries) {
    if (entry.spread && entry.value) {
      const spreadVal = resolveMappingValue(entry.value, ctx);
      if (spreadVal && typeof spreadVal === 'object' && !Array.isArray(spreadVal)) {
        Object.assign(filter, graphqlWhereToMongo(spreadVal as Record<string, unknown>));
      }
      continue;
    }

    // Bare `$args.where` binder
    if (
      entry.value?.kind === 'args' &&
      (entry.key.startsWith('$args') || entry.key === `$args.${entry.value.value}`)
    ) {
      const val = resolveMappingValue(entry.value, ctx);
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        Object.assign(filter, graphqlWhereToMongo(val as Record<string, unknown>));
      }
      continue;
    }

    if (entry.children || !entry.value) continue;

    const resolved = resolveMappingValue(entry.value, ctx);
    if (resolved === undefined) continue;
    filter[entry.key] = coerceFilterValue(resolved);
  }

  return filter;
}

/**
 * Convert typed GraphQL where input (`eq` / `gt` / `AND` / …) into a Mongo filter.
 */
export function graphqlWhereToMongo(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    if (key === 'AND' || key === 'and') {
      out.$and = (value as Record<string, unknown>[]).map(graphqlWhereToMongo);
      continue;
    }
    if (key === 'OR' || key === 'or') {
      out.$or = (value as Record<string, unknown>[]).map(graphqlWhereToMongo);
      continue;
    }
    if (key === 'NOT' || key === 'not') {
      out.$nor = [graphqlWhereToMongo(value as Record<string, unknown>)];
      continue;
    }

    const mongoKey = key === 'id' ? '_id' : key;
    if (typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
      out[mongoKey] = coerceFilterValue(value);
      continue;
    }

    const ops = value as Record<string, unknown>;
    const mongoOps: Record<string, unknown> = {};
    let hasOps = false;
    for (const [op, opVal] of Object.entries(ops)) {
      if (opVal === undefined) continue;
      hasOps = true;
      switch (op) {
        case 'eq':
          out[mongoKey] = coerceFilterValue(opVal);
          hasOps = false;
          break;
        case 'ne':
          mongoOps.$ne = coerceFilterValue(opVal);
          break;
        case 'in':
          mongoOps.$in = (opVal as unknown[]).map(coerceFilterValue);
          break;
        case 'nin':
          mongoOps.$nin = (opVal as unknown[]).map(coerceFilterValue);
          break;
        case 'gt':
          mongoOps.$gt = coerceFilterValue(opVal);
          break;
        case 'gte':
          mongoOps.$gte = coerceFilterValue(opVal);
          break;
        case 'lt':
          mongoOps.$lt = coerceFilterValue(opVal);
          break;
        case 'lte':
          mongoOps.$lte = coerceFilterValue(opVal);
          break;
        case 'regex':
          mongoOps.$regex = opVal;
          break;
        case 'exists':
          mongoOps.$exists = opVal;
          break;
        default:
          // nested relation filter — leave for later
          break;
      }
      if (!hasOps && op === 'eq') break;
    }
    if (hasOps && Object.keys(mongoOps).length) {
      out[mongoKey] = mongoOps;
    }
  }

  return out;
}

export function buildMongoSort(
  sortSource: string | null | undefined,
  ctx: { args?: Record<string, unknown> },
): Record<string, 1 | -1> | undefined {
  if (!sortSource) return undefined;
  const parsed = parseMongoMapping(sortSource);
  // Bare `$args.sort`
  if (parsed.entries.length === 1 && parsed.entries[0].value?.kind === 'args') {
    const val = resolveMappingValue(parsed.entries[0].value, ctx);
    return graphqlSortToMongo(val as Record<string, unknown> | null | undefined);
  }
  return undefined;
}

export function graphqlSortToMongo(
  input: Record<string, unknown> | null | undefined,
): Record<string, 1 | -1> | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const out: Record<string, 1 | -1> = {};
  for (const [key, dir] of Object.entries(input)) {
    if (dir == null) continue;
    const mongoKey = key === 'id' ? '_id' : key;
    const d = String(dir).toUpperCase();
    out[mongoKey] = d === 'DESC' || d === '-1' ? -1 : 1;
  }
  return Object.keys(out).length ? out : undefined;
}

function coerceFilterValue(value: unknown): unknown {
  if (typeof value === 'string' && ObjectId.isValid(value) && value.length === 24) {
    try {
      return new ObjectId(value);
    } catch {
      return value;
    }
  }
  return value;
}
