import { Decimal128, ObjectId } from 'mongodb';
import { parseMongoMapping, resolveMappingValue } from './mapping.js';
import type { ParsedMongoMapping } from './types.js';

/**
 * Build a MongoDB filter document from `@mongo(where:)` mapping.
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
        Object.assign(filter, graphqlFilterToMongo(spreadVal as Record<string, unknown>));
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
        Object.assign(filter, graphqlFilterToMongo(val as Record<string, unknown>));
      }
      continue;
    }

    if (entry.children || !entry.value) continue;

    const resolved = resolveMappingValue(entry.value, ctx);
    if (resolved === undefined) continue;
    // `_id: $args._ids` (array) => `{ _id: { $in: [...] } }`
    if (Array.isArray(resolved)) {
      filter[entry.key] = { $in: resolved.map(coerceFilterValue) };
    } else {
      filter[entry.key] = coerceFilterValue(resolved);
    }
  }

  return filter;
}

const FILTER_OP_KEYS = new Set([
  'eq',
  'ne',
  'in',
  'nin',
  'gt',
  'gte',
  'lt',
  'lte',
  'regex',
  'exists',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
  );
}

/** True when every own key is a known GraphQL filter operator (`eq` / `gt` / …). */
function isOperatorBag(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every(k => FILTER_OP_KEYS.has(k));
}

/**
 * Map Mesh/SQL-style `*WhereInput` objects to a MongoDB filter document.
 *
 * - Scalar ops: `{ name: { eq: "Ada" }, age: { gte: 30 } }`
 * - Embedded nested where: `{ address: { street: { eq: "Main" } } }` → `{ "address.street": "Main" }`
 * - Document-array where (v0 `languages: [...]`): `{ languages: [{ language: { eq: "en" } }] }`
 *   → `{ languages: { $elemMatch: { language: "en" } } }` (AND of several → `$and` of `$elemMatch`)
 */
export function graphqlFilterToMongo(
  input: Record<string, unknown>,
  pathPrefix = '',
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    if (key === 'AND' || key === 'and') {
      out.$and = (value as Record<string, unknown>[]).map(v => graphqlFilterToMongo(v, pathPrefix));
      continue;
    }
    if (key === 'OR' || key === 'or') {
      out.$or = (value as Record<string, unknown>[]).map(v => graphqlFilterToMongo(v, pathPrefix));
      continue;
    }
    if (key === 'NOT' || key === 'not') {
      out.$nor = [graphqlFilterToMongo(value as Record<string, unknown>, pathPrefix)];
      continue;
    }

    const mongoKey = key === 'id' ? '_id' : key;
    const fullKey = pathPrefix ? `${pathPrefix}.${mongoKey}` : mongoKey;

    // Document-array filters: list of nested where objects → $elemMatch (v0 languages: [...]).
    if (Array.isArray(value) && value.length > 0 && value.every(isPlainObject)) {
      const elemMatches = (value as Record<string, unknown>[]).map(item => ({
        $elemMatch: graphqlFilterToMongo(item),
      }));
      if (elemMatches.length === 1) {
        out[fullKey] = elemMatches[0];
      } else {
        out.$and = elemMatches.map(em => ({ [fullKey]: em }));
      }
      continue;
    }

    if (typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
      out[fullKey] = Array.isArray(value) ? value.map(coerceFilterValue) : coerceFilterValue(value);
      continue;
    }

    if (!isPlainObject(value)) {
      out[fullKey] = coerceFilterValue(value);
      continue;
    }

    if (isOperatorBag(value)) {
      applyOperatorBag(out, fullKey, value);
      continue;
    }

    // Embedded / grouped nested WhereInput → flatten with dotted paths.
    Object.assign(out, graphqlFilterToMongo(value, fullKey));
  }

  return out;
}

function applyOperatorBag(
  out: Record<string, unknown>,
  fullKey: string,
  ops: Record<string, unknown>,
): void {
  const mongoOps: Record<string, unknown> = {};
  let wroteEq = false;
  for (const [op, opVal] of Object.entries(ops)) {
    if (opVal === undefined) continue;
    switch (op) {
      case 'eq':
        out[fullKey] = coerceFilterValue(opVal);
        wroteEq = true;
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
        break;
    }
  }
  if (!wroteEq && Object.keys(mongoOps).length) {
    out[fullKey] = mongoOps;
  } else if (wroteEq && Object.keys(mongoOps).length) {
    // Rare: eq + other ops on same field — prefer ops object including $eq.
    out[fullKey] = { $eq: out[fullKey], ...mongoOps };
  }
}

/** Build Mongo sort from `@mongo(orderBy:)` binder (e.g. `$args.orderBy`). */
export function buildMongoSort(
  orderBySource: string | null | undefined,
  ctx: { args?: Record<string, unknown> },
): Record<string, 1 | -1> | undefined {
  if (!orderBySource) return undefined;
  const parsed = parseMongoMapping(orderBySource);
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

export function buildSetDocument(
  setSource: string | null | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
): Record<string, unknown> {
  const parsed = parseMongoMapping(setSource);
  const doc: Record<string, unknown> = {};
  for (const entry of parsed.entries) {
    if (entry.key === 'inputs' && entry.value?.kind === 'args') {
      continue;
    }
    if (!entry.value) continue;
    const resolved = resolveMappingValue(entry.value, ctx);
    if (resolved === undefined) continue;
    doc[entry.key] = resolved;
  }
  return doc;
}

export function coerceFilterValue(value: unknown): unknown {
  // Already BSON Decimal128 from GraphQLDecimal128.parseValue (Mongoose-aligned cast).
  if (value instanceof Decimal128) {
    return value;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { $numberDecimal?: string }).$numberDecimal === 'string'
  ) {
    try {
      return Decimal128.fromString((value as { $numberDecimal: string }).$numberDecimal);
    } catch {
      return value;
    }
  }
  if (typeof value === 'string' && ObjectId.isValid(value) && value.length === 24) {
    try {
      return new ObjectId(value);
    } catch {
      return value;
    }
  }
  return value;
}
