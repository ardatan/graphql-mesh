import { Decimal128, ObjectId } from 'mongodb';
import { parseMongoMapping, resolveMappingValue } from './mapping.js';
import type { ParsedMongoMapping } from './types.js';

/**
 * Build a MongoDB filter document from `@mongo(filter:)` mapping.
 */
export function buildMongoFilter(
  filterSource: string | null | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
): Record<string, unknown> {
  const parsed = parseMongoMapping(filterSource);
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
        Object.assign(filter, normalizeFilterDoc(spreadVal as Record<string, unknown>));
      }
      continue;
    }

    // Bare `$args.filter` (or legacy `$args.where`) binder
    if (
      entry.value?.kind === 'args' &&
      (entry.key.startsWith('$args') || entry.key === `$args.${entry.value.value}`)
    ) {
      const val = resolveMappingValue(entry.value, ctx);
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        Object.assign(filter, normalizeFilterDoc(val as Record<string, unknown>));
      }
      continue;
    }

    if (entry.children || !entry.value) continue;

    const resolved = resolveMappingValue(entry.value, ctx);
    if (resolved === undefined) continue;
    // `_id: $args.ids` (array) => `{ _id: { $in: [...] } }`
    if (Array.isArray(resolved)) {
      filter[entry.key] = { $in: resolved.map(coerceFilterValue) };
    } else {
      filter[entry.key] = coerceFilterValue(resolved);
    }
  }

  return filter;
}

/**
 * Accept either a native Mongo filter (`{ age: { $gte: 30 } }`) or the older
 * Mesh op-bag shape (`{ age: { gte: 30 } }` / nested WhereInput).
 */
export function normalizeFilterDoc(input: Record<string, unknown>): Record<string, unknown> {
  if (looksLikeNativeMongoFilter(input)) {
    return coerceDeep(input) as Record<string, unknown>;
  }
  return graphqlFilterToMongo(input);
}

function looksLikeNativeMongoFilter(input: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith('$')) return true;
    if (isPlainObject(value) && Object.keys(value).some(k => k.startsWith('$'))) return true;
  }
  return false;
}

function coerceDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(coerceDeep);
  if (!isPlainObject(value)) return coerceFilterValue(value);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = coerceDeep(v);
  }
  return out;
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
  // Optional underscore aliases (`_gte`) — GraphQL-legal Mongo-ish names
  '_eq',
  '_ne',
  '_in',
  '_nin',
  '_gt',
  '_gte',
  '_lt',
  '_lte',
  '_regex',
  '_exists',
]);

function normalizeOpKey(op: string): string {
  return op.startsWith('_') ? op.slice(1) : op;
}

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
 * Legacy Mesh/SQL-style `*WhereInput` → Mongo filter (kept for hand-written `@mongo`).
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
  for (const [rawOp, opVal] of Object.entries(ops)) {
    if (opVal === undefined) continue;
    const op = normalizeOpKey(rawOp);
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
    out[fullKey] = { $eq: out[fullKey], ...mongoOps };
  }
}

/** Build Mongo sort from `@mongo(sort:)` binder (e.g. `$args.sort`). */
export function buildMongoSort(
  sortSource: string | null | undefined,
  ctx: { args?: Record<string, unknown> },
): Record<string, 1 | -1> | undefined {
  if (!sortSource) return undefined;
  const parsed = parseMongoMapping(sortSource);
  if (parsed.entries.length === 1 && parsed.entries[0].value?.kind === 'args') {
    const val = resolveMappingValue(parsed.entries[0].value, ctx);
    return graphqlSortToMongo(val as Record<string, unknown> | string[] | null | undefined);
  }
  return undefined;
}

function sortFieldKey(field: string): string {
  return field === 'id' ? '_id' : field;
}

function parseSortToken(token: string): { field: string; dir: 1 | -1 } | undefined {
  const desc = token.match(/^(.*)_DESC$/i);
  if (desc) return { field: sortFieldKey(desc[1]), dir: -1 };
  const asc = token.match(/^(.*)_ASC$/i);
  if (asc) return { field: sortFieldKey(asc[1]), dir: 1 };
  return undefined;
}

/**
 * Accepts:
 * - Hasura-style enum list: `['age_DESC', 'name_ASC']` (generated SDL)
 * - Object map: `{ age: ASC|DESC|-1|1 }` (hand-written directive / legacy)
 */
export function graphqlSortToMongo(
  input: Record<string, unknown> | string[] | null | undefined,
): Record<string, 1 | -1> | undefined {
  if (input == null) return undefined;

  if (Array.isArray(input)) {
    const out: Record<string, 1 | -1> = {};
    for (const entry of input) {
      if (entry == null) continue;
      const parsed = parseSortToken(String(entry));
      if (parsed) out[parsed.field] = parsed.dir;
    }
    return Object.keys(out).length ? out : undefined;
  }

  if (typeof input !== 'object') return undefined;
  const out: Record<string, 1 | -1> = {};
  for (const [key, dir] of Object.entries(input)) {
    if (dir == null) continue;
    const mongoKey = sortFieldKey(key);
    if (typeof dir === 'number') {
      out[mongoKey] = dir < 0 ? -1 : 1;
      continue;
    }
    const d = String(dir).toUpperCase();
    const fromToken = parseSortToken(d);
    if (fromToken) {
      out[fromToken.field] = fromToken.dir;
      continue;
    }
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
    if ((entry.key === 'inputs' || entry.key === 'documents') && entry.value?.kind === 'args') {
      continue;
    }
    if (!entry.value) continue;
    const resolved = resolveMappingValue(entry.value, ctx);
    if (resolved === undefined) continue;
    doc[entry.key] = resolved;
  }
  return doc;
}

/** Resolve a Mongo update document from `@mongo(set:)` (`$args.update` or field map). */
export function resolveUpdateDocument(
  setSource: string | null | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
): Record<string, unknown> {
  const trimmed = setSource?.trim();
  if (trimmed === '$args.update') {
    const update = ctx.args?.update;
    if (update && typeof update === 'object' && !Array.isArray(update)) {
      const doc = update as Record<string, unknown>;
      if (Object.keys(doc).some(k => k.startsWith('$'))) {
        return coerceDeep(doc) as Record<string, unknown>;
      }
      return { $set: coerceDeep(doc) as Record<string, unknown> };
    }
    return { $set: {} };
  }
  return { $set: buildSetDocument(setSource, ctx) };
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
