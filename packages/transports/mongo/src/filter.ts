// eslint-disable-next-line import/no-nodejs-modules -- per-executor field runtime isolation
import { AsyncLocalStorage } from 'node:async_hooks';
import { BSON, Decimal128, ObjectId } from 'mongodb';
import { parseMongoMapping, resolveMappingValue } from './mapping.js';
import type { ParsedMongoMapping } from './types.js';

/** Per-executor field metadata (avoids module-global clobber across subgraphs). */
export type MongoFieldRuntime = {
  objectIdFields: ReadonlySet<string>;
  /** ObjectId paths keyed by collection (preferred over flat `objectIdFields`). */
  objectIdFieldsByCollection?: ReadonlyMap<string, ReadonlySet<string>>;
  requiredFields: ReadonlySet<string>;
  /** Required fields keyed by collection (preferred over flat `requiredFields`). */
  requiredFieldsByCollection?: ReadonlyMap<string, ReadonlySet<string>>;
  /** GraphQL empty-input placeholder keys (e.g. `_`) — not real model paths. */
  placeholderFields: ReadonlySet<string>;
  /**
   * Placeholders scoped by collection so an id-only model's `_` does not strip a
   * real `_: String` field on another model in the same subgraph.
   */
  placeholderFieldsByCollection?: ReadonlyMap<string, ReadonlySet<string>>;
  /** Collections whose `_id` is BSON String — do not coerce `_id`/`id` to ObjectId. */
  stringIdCollections: ReadonlySet<string>;
};

const fieldRuntimeAls = new AsyncLocalStorage<MongoFieldRuntime>();

/** Run Mongo coerce/filter/update work under an executor-local field runtime. */
export function runWithMongoFieldRuntime<T>(runtime: MongoFieldRuntime, fn: () => T): T {
  return fieldRuntimeAls.run(runtime, fn);
}

/** Options for BSON coerce during filter / update builds. */
export interface CoerceFilterOptions {
  /** Convert 24-char hex strings to ObjectId (only for known ObjectId fields). */
  asObjectId?: boolean;
  /** Collection for `_id` BSON-type decisions (String `_id` collections skip ObjectId). */
  collection?: string;
}

/**
 * Build a MongoDB filter document from a directive binder string
 * (`@mongo__find(query: …)` / legacy `@mongo(filter:)`).
 *
 * Spreads `$args.filter` (or `$args.query` / `$args.where`) and merges fixed
 * clauses. GraphQL ops without `$` (`eq`, `gte`, `and`, …) map to `$eq` / `$gte` /
 * `$and`.
 *
 * @example
 * ```ts
 * buildMongoFilter('$args.filter', {
 *   args: { filter: { name: { eq: 'Ada' }, age: { gte: 30 } } },
 * });
 * // → { name: 'Ada', age: { $gte: 30 } }
 *
 * buildMongoFilter('kind: "Circle"\n$args.filter', {
 *   args: { filter: { name: { eq: 'Ada' } } },
 * });
 * // → { kind: 'Circle', name: 'Ada' }
 * ```
 */
export function buildMongoFilter(
  filterSource: string | null | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
  opts?: { collection?: string },
): Record<string, unknown> {
  const parsed = parseMongoMapping(filterSource);
  return filterFromMapping(parsed, ctx, opts);
}

export function filterFromMapping(
  parsed: ParsedMongoMapping,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
  opts?: { collection?: string },
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  const collection = opts?.collection;

  for (const entry of parsed.entries) {
    if (entry.spread && entry.value) {
      const spreadVal = resolveMappingValue(entry.value, ctx);
      if (spreadVal && typeof spreadVal === 'object' && !Array.isArray(spreadVal)) {
        mergeFilterFragment(
          filter,
          normalizeFilterDoc(spreadVal as Record<string, unknown>, collection),
        );
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
        mergeFilterFragment(filter, normalizeFilterDoc(val as Record<string, unknown>, collection));
      }
      continue;
    }

    if (entry.children || !entry.value) continue;

    const resolved = resolveMappingValue(entry.value, ctx);
    if (resolved === undefined) continue;
    const asObjectId = isObjectIdFieldKey(entry.key, collection);
    // `_id: $args.ids` (array) => `{ _id: { $in: [...] } }`
    if (Array.isArray(resolved)) {
      const next = {
        $in: resolved.map(v => coerceFilterValue(v, { asObjectId })),
      };
      mergeFilterFragment(filter, { [entry.key]: next });
    } else {
      mergeFilterFragment(filter, {
        [entry.key]: coerceFilterValue(resolved, { asObjectId }),
      });
    }
  }

  return filter;
}

/**
 * Merge a filter fragment into `target`. Overlapping field keys become `$and`
 * so fixed binders (e.g. `gender: "female"`) are not overwritten by `$args.filter`.
 */
function mergeFilterFragment(
  target: Record<string, unknown>,
  fragment: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(fragment)) {
    if (key === '$and' && Array.isArray(value)) {
      appendAnd(target, value as Record<string, unknown>[]);
      continue;
    }
    if (key === '$or' || key === '$nor') {
      if (key in target) {
        appendAnd(target, [{ [key]: target[key] }, { [key]: value }]);
        delete target[key];
      } else {
        target[key] = value;
      }
      continue;
    }
    if (key in target) {
      const prev = target[key];
      delete target[key];
      appendAnd(target, [{ [key]: prev }, { [key]: value }]);
      continue;
    }
    target[key] = value;
  }
}

function appendAnd(out: Record<string, unknown>, clauses: Record<string, unknown>[]): void {
  if (!Array.isArray(out.$and)) {
    out.$and = [];
  }
  (out.$and as Record<string, unknown>[]).push(...clauses);
}

/**
 * Accept either a native Mongo filter (`{ age: { $gte: 30 } }`) or the older
 * Mesh op-bag shape (`{ age: { gte: 30 } }` / nested WhereInput).
 */
export function normalizeFilterDoc(
  input: Record<string, unknown>,
  collection?: string,
): Record<string, unknown> {
  if (looksLikeNativeMongoFilter(input)) {
    return coerceDeep(input, { collection }) as Record<string, unknown>;
  }
  return graphqlFilterToMongo(input, '', collection);
}

function looksLikeNativeMongoFilter(input: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith('$')) return true;
    if (isPlainObject(value) && Object.keys(value).some(k => k.startsWith('$'))) return true;
  }
  return false;
}

/** Canonical Extended JSON type wrappers (single-key) that must not be walked as filters. */
const EXTENDED_JSON_WRAPPER_KEYS = new Set([
  '$numberDecimal',
  '$oid',
  '$date',
  '$numberLong',
  '$numberInt',
  '$numberDouble',
  '$timestamp',
  '$minKey',
  '$maxKey',
  '$undefined',
]);

/**
 * Convert Extended JSON leaves (`{ $numberDecimal }`, `{ $oid }`, …) to BSON
 * *before* recursing — otherwise the `$…` key is treated as a nested document.
 */
/** Always-false predicate; safe inside `$elemMatch` (unlike `_id: { $exists: false }`). */
export const MATCH_NOTHING_FILTER: Record<string, unknown> = { $nor: [{}] };

function deserializeExtendedJson(value: Record<string, unknown>): unknown {
  // Canonical mode preserves `$numberLong` beyond JS safe-integer as BSON Long.
  return BSON.EJSON.deserialize(value, { relaxed: false });
}

function coerceExtendedJsonWrapper(value: Record<string, unknown>): unknown | undefined {
  const keys = Object.keys(value);
  if (keys.length === 1 && EXTENDED_JSON_WRAPPER_KEYS.has(keys[0]!)) {
    try {
      return deserializeExtendedJson(value);
    } catch {
      return undefined;
    }
  }
  // Canonical binary: `{ $binary: { base64: "…", subType: "00" } }`
  if (
    keys.length === 1 &&
    keys[0] === '$binary' &&
    isPlainObject(value.$binary as Record<string, unknown>)
  ) {
    try {
      return deserializeExtendedJson(value);
    } catch {
      return undefined;
    }
  }
  // Legacy binary: `{ $binary: "…", $type: "00" }`
  if (keys.length === 2 && keys.includes('$binary') && keys.includes('$type')) {
    try {
      return deserializeExtendedJson(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function coerceDeep(value: unknown, opts?: CoerceFilterOptions): unknown {
  if (Array.isArray(value)) return value.map(v => coerceDeep(v, opts));
  if (isBsonValue(value)) return value;
  if (isPlainObject(value)) {
    const ext = coerceExtendedJsonWrapper(value);
    if (ext !== undefined) return ext;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = coerceDeep(v, {
        collection: opts?.collection,
        asObjectId: opts?.asObjectId || isObjectIdFieldKey(k, opts?.collection),
      });
    }
    return out;
  }
  return coerceFilterValue(value, opts);
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

function isBsonValue(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false;
  if (value instanceof Date || value instanceof Decimal128 || value instanceof ObjectId)
    return true;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return true;
  if (typeof Uint8Array !== 'undefined' && value instanceof Uint8Array) return true;
  const bsontype = (value as { _bsontype?: string })._bsontype;
  return typeof bsontype === 'string' && bsontype.length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && !isBsonValue(value)
  );
}

/** Declared ObjectId field keys from subgraph transport options (plus `id`/`_id`). */
let declaredObjectIdFields = new Set<string>(['_id', 'id']);
/** Fields that may be omitted on patch but must not be explicitly set to null. */
let declaredRequiredFields = new Set<string>();
/** Default empty-input placeholder keys when no executor runtime is active. */
let declaredPlaceholderFields = new Set<string>(['_']);

/** Configure ObjectId coercion from loader-declared BSON ObjectId paths (tests / fallback). */
export function configureObjectIdFields(fields: Iterable<string> | undefined): void {
  declaredObjectIdFields = new Set(['_id', 'id']);
  if (!fields) return;
  for (const f of fields) {
    if (f) declaredObjectIdFields.add(f);
  }
}

/** Configure fields that reject explicit `null` on update `$set` (omit still OK). */
export function configureRequiredFields(fields: Iterable<string> | undefined): void {
  declaredRequiredFields = new Set();
  if (!fields) return;
  for (const f of fields) {
    if (f) declaredRequiredFields.add(f);
  }
}

/** Configure empty-input placeholder keys that must not be persisted. */
export function configurePlaceholderFields(fields: Iterable<string> | undefined): void {
  declaredPlaceholderFields = new Set();
  if (!fields) {
    declaredPlaceholderFields.add('_');
    return;
  }
  for (const f of fields) {
    if (f) declaredPlaceholderFields.add(f);
  }
}

const EMPTY_STRING_SET: ReadonlySet<string> = new Set();

function activeObjectIdFields(collection?: string): ReadonlySet<string> {
  const store = fieldRuntimeAls.getStore();
  if (store?.objectIdFieldsByCollection && collection) {
    return store.objectIdFieldsByCollection.get(collection) ?? EMPTY_STRING_SET;
  }
  return store?.objectIdFields ?? declaredObjectIdFields;
}

function activeRequiredFields(collection?: string): ReadonlySet<string> {
  const store = fieldRuntimeAls.getStore();
  if (store?.requiredFieldsByCollection && collection) {
    return store.requiredFieldsByCollection.get(collection) ?? EMPTY_STRING_SET;
  }
  return store?.requiredFields ?? declaredRequiredFields;
}

function activePlaceholderFields(collection?: string): ReadonlySet<string> {
  const store = fieldRuntimeAls.getStore();
  if (store?.placeholderFieldsByCollection && collection) {
    return store.placeholderFieldsByCollection.get(collection) ?? EMPTY_STRING_SET;
  }
  return store?.placeholderFields ?? declaredPlaceholderFields;
}

function activeStringIdCollections(): ReadonlySet<string> {
  return fieldRuntimeAls.getStore()?.stringIdCollections ?? EMPTY_STRING_SET;
}

/**
 * Whether a field key should coerce hex strings to ObjectId.
 * `_id`/`id` default to ObjectId unless the target collection uses a String `_id`.
 */
export function isObjectIdFieldKey(key: string, collection?: string): boolean {
  if (key === 'id' || key === '_id') {
    if (collection && activeStringIdCollections().has(collection)) return false;
    return true;
  }
  return activeObjectIdFields(collection).has(key);
}

/** Required-field set for the active collection (or flat fallback). */
export function getActiveRequiredFields(collection?: string): ReadonlySet<string> {
  return activeRequiredFields(collection);
}

function isPlainFilterObject(c: unknown): c is Record<string, unknown> {
  return c != null && typeof c === 'object' && !Array.isArray(c);
}

/** True when a filter matches no documents (`{ $nor: [{}] }` or `$and`/`$or` of those). */
export function isMatchNothingFilter(filter: Record<string, unknown> | null | undefined): boolean {
  if (!filter) return false;
  const keys = Object.keys(filter);
  if (keys.length === 1 && keys[0] === '$nor' && Array.isArray(filter.$nor)) {
    const clauses = filter.$nor as unknown[];
    return (
      clauses.length === 1 && isUniversallyMatchingFilter(clauses[0] as Record<string, unknown>)
    );
  }
  // One impossible `$and` clause makes the whole conjunction match-nothing.
  if (keys.length === 1 && keys[0] === '$and' && Array.isArray(filter.$and)) {
    const clauses = filter.$and as Record<string, unknown>[];
    return (
      clauses.length > 0 && clauses.some(c => isPlainFilterObject(c) && isMatchNothingFilter(c))
    );
  }
  // Nonempty `$or` of only match-nothing branches is still match-nothing
  // (`not` of that becomes match-all and must be caught by the bulk guard).
  if (keys.length === 1 && keys[0] === '$or' && Array.isArray(filter.$or)) {
    const clauses = filter.$or as Record<string, unknown>[];
    return (
      clauses.length > 0 && clauses.every(c => isPlainFilterObject(c) && isMatchNothingFilter(c))
    );
  }
  return false;
}

/**
 * True when a filter matches every document (`{}`, vacuous `$and`, vacuous `$or`,
 * or `$nor` of a match-nothing predicate). Used to neutralize bulk writes.
 *
 * Multi-key filters are a conjunction: universal only when every sibling
 * predicate is universal (a restrictive sibling keeps the write safe).
 */
export function isUniversallyMatchingFilter(
  filter: Record<string, unknown> | null | undefined,
): boolean {
  if (!filter) return true;
  const keys = Object.keys(filter);
  if (keys.length === 0) return true;

  const predicateIsUniversal = (key: string, value: unknown): boolean => {
    if (key === '$and' && Array.isArray(value)) {
      const clauses = value as Record<string, unknown>[];
      if (clauses.length === 0) return true;
      return clauses.every(c => isPlainFilterObject(c) && isUniversallyMatchingFilter(c));
    }
    if (key === '$or' && Array.isArray(value)) {
      const clauses = value as Record<string, unknown>[];
      if (clauses.length === 0) return true;
      return clauses.some(c => isPlainFilterObject(c) && isUniversallyMatchingFilter(c));
    }
    if (key === '$nor' && Array.isArray(value)) {
      const clauses = value as Record<string, unknown>[];
      return (
        clauses.length === 1 && isPlainFilterObject(clauses[0]) && isMatchNothingFilter(clauses[0])
      );
    }
    // Non-logical field predicates restrict the match set.
    return false;
  };

  if (keys.length === 1) {
    return predicateIsUniversal(keys[0], filter[keys[0]]);
  }
  // Top-level conjunction of several keys — all must be universal.
  return keys.every(k => predicateIsUniversal(k, filter[k]));
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
  collection?: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    if (key === 'AND' || key === 'and') {
      const clauses = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      // Empty `$and: []` is invalid Mongo; omit and keep sibling predicates.
      if (clauses.length === 0) continue;
      const mapped = clauses.map(v => graphqlFilterToMongo(v, pathPrefix, collection));
      // Nested `{ and: [{ and: [] }] }` → `[{}]` would match everything; drop vacuous
      // clauses and require MATCH_NOTHING when nothing meaningful remains.
      const meaningful = mapped.filter(c => !isUniversallyMatchingFilter(c));
      if (meaningful.length === 0) {
        appendAnd(out, [MATCH_NOTHING_FILTER]);
      } else {
        appendAnd(out, meaningful);
      }
      continue;
    }
    if (key === 'OR' || key === 'or') {
      const clauses = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      // Empty `$or: []` is invalid and must not broaden writes — match nothing
      // (also inside `$elemMatch`, where `_id: { $exists: false }` can match).
      if (clauses.length === 0) {
        appendAnd(out, [MATCH_NOTHING_FILTER]);
        continue;
      }
      const mapped = clauses.map(v => graphqlFilterToMongo(v, pathPrefix, collection));
      // Do not prune vacuous branches here: `or: [{}, { name }]` is match-all, and
      // `not: { or: [{}, { name }] }` must stay match-nothing. Bulk writes catch
      // match-all via `isUniversallyMatchingFilter`. All-contradiction ORs → MATCH_NOTHING.
      if (mapped.length > 0 && mapped.every(c => isMatchNothingFilter(c))) {
        appendAnd(out, [MATCH_NOTHING_FILTER]);
      } else {
        mergeFilterFragment(out, { $or: mapped });
      }
      continue;
    }
    if (key === 'NOT' || key === 'not') {
      mergeFilterFragment(out, {
        $nor: [graphqlFilterToMongo(value as Record<string, unknown>, pathPrefix, collection)],
      });
      continue;
    }

    // GraphQL `id` → Mongo `_id`; `storedId` → mongoose path `id` only on String `_id` models.
    const mongoKey =
      key === 'id'
        ? '_id'
        : key === 'storedId' && collection && activeStringIdCollections().has(collection)
          ? 'id'
          : key;
    const fullKey = pathPrefix ? `${pathPrefix}.${mongoKey}` : mongoKey;
    // Prefer full BSON path so nested ObjectId fields coerce correctly.
    const asObjectId = isObjectIdFieldKey(fullKey, collection);

    if (Array.isArray(value) && value.length > 0 && value.every(isPlainObject)) {
      const elemMatches = (value as Record<string, unknown>[]).map(item => ({
        $elemMatch: graphqlFilterToMongo(item, '', collection),
      }));
      if (elemMatches.length === 1) {
        out[fullKey] = elemMatches[0];
      } else {
        appendAnd(
          out,
          elemMatches.map(em => ({ [fullKey]: em })),
        );
      }
      continue;
    }

    if (typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
      out[fullKey] = Array.isArray(value)
        ? value.map(v => coerceFilterValue(v, { asObjectId }))
        : coerceFilterValue(value, { asObjectId });
      continue;
    }

    if (!isPlainObject(value)) {
      out[fullKey] = coerceFilterValue(value, { asObjectId });
      continue;
    }

    // Extended JSON leaves (`{ $numberDecimal }`) before flatten/operator walk.
    const ext = coerceExtendedJsonWrapper(value);
    if (ext !== undefined) {
      out[fullKey] = ext;
      continue;
    }

    if (isOperatorBag(value)) {
      applyOperatorBag(out, fullKey, value, asObjectId);
      continue;
    }

    mergeFilterFragment(out, graphqlFilterToMongo(value, fullKey, collection));
  }

  return out;
}

function applyOperatorBag(
  out: Record<string, unknown>,
  fullKey: string,
  ops: Record<string, unknown>,
  asObjectId = false,
): void {
  const mongoOps: Record<string, unknown> = {};
  let wroteEq = false;
  for (const [rawOp, opVal] of Object.entries(ops)) {
    if (opVal === undefined) continue;
    const op = normalizeOpKey(rawOp);
    switch (op) {
      case 'eq':
        out[fullKey] = coerceFilterValue(opVal, { asObjectId });
        wroteEq = true;
        break;
      case 'ne':
        mongoOps.$ne = coerceFilterValue(opVal, { asObjectId });
        break;
      case 'in':
        mongoOps.$in = (opVal as unknown[]).map(v => coerceFilterValue(v, { asObjectId }));
        break;
      case 'nin':
        mongoOps.$nin = (opVal as unknown[]).map(v => coerceFilterValue(v, { asObjectId }));
        break;
      case 'gt':
        mongoOps.$gt = coerceFilterValue(opVal, { asObjectId });
        break;
      case 'gte':
        mongoOps.$gte = coerceFilterValue(opVal, { asObjectId });
        break;
      case 'lt':
        mongoOps.$lt = coerceFilterValue(opVal, { asObjectId });
        break;
      case 'lte':
        mongoOps.$lte = coerceFilterValue(opVal, { asObjectId });
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
  if (field === 'id') return '_id';
  if (field === 'storedId') return 'id';
  return field;
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
 * - Enum list: `['age_desc', 'name_asc']` (generated SDL; case-insensitive)
 * - Object map: `{ age: asc|desc|-1|1 }` (hand-written directive / legacy)
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
  opts?: { collection?: string },
): Record<string, unknown> {
  const parsed = parseMongoMapping(setSource);
  const collection = opts?.collection;
  const required = activeRequiredFields(collection);
  const doc: Record<string, unknown> = {};
  for (const entry of parsed.entries) {
    if (!entry.value) continue;
    const resolved = resolveMappingValue(entry.value, ctx);
    if (resolved === undefined) continue;
    const coerced = coerceDeep(resolved, {
      collection,
      asObjectId: isObjectIdFieldKey(entry.key, collection),
    });
    // Same post-coerce required check as `$args.update` / `remapUpdateFields`.
    if (coerced === null && required.has(entry.key === '_id' ? 'id' : entry.key)) {
      throw new Error(
        `Cannot set required field "${entry.key === '_id' ? 'id' : entry.key}" to null`,
      );
    }
    if (coerced === null && required.has(entry.key)) {
      throw new Error(`Cannot set required field "${entry.key}" to null`);
    }
    doc[entry.key] = coerced;
  }
  return doc as Record<string, unknown>;
}

/** Mongo update operators without `$` (GraphQL-legal); transport maps to `$set` / `$inc` / … */
const UPDATE_OP_KEYS = new Set([
  'set',
  'inc',
  'unset',
  'push',
  'pull',
  'pullAll',
  'addToSet',
  'pop',
  'rename',
  'min',
  'max',
  'mul',
  'currentDate',
  'bit',
]);

function remapUpdateFieldKey(key: string, collection?: string): string {
  if (key === 'id') return '_id';
  if (key === 'storedId' && collection && activeStringIdCollections().has(collection)) {
    return 'id';
  }
  return key;
}

function remapUpdateFields(value: unknown, collection?: string): unknown {
  if (!isPlainObject(value)) return coerceDeep(value, { collection });
  const placeholders = activePlaceholderFields(collection);
  const required = activeRequiredFields(collection);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    // Only strip configured empty-input placeholders — never a real `_` path.
    if (placeholders.has(k)) continue;
    const remapped = remapUpdateFieldKey(k, collection);
    const coerced = coerceDeep(v, {
      collection,
      asObjectId: isObjectIdFieldKey(remapped, collection) || isObjectIdFieldKey(k, collection),
    });
    // Check GraphQL key and remapped BSON key after coerce (EJSON nulls).
    if (coerced === null && (required.has(k) || required.has(remapped))) {
      throw new Error(`Cannot set required field "${k}" to null`);
    }
    out[remapped] = coerced;
  }
  return out;
}

/** Drop GraphQL empty-input placeholder keys before insert/write. */
export function stripInputPlaceholder(
  doc: Record<string, unknown>,
  collection?: string,
): Record<string, unknown> {
  const placeholders = activePlaceholderFields(collection);
  if (!placeholders.size) return doc;
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (placeholders.has(k)) {
      changed = true;
      continue;
    }
    out[k] = v;
  }
  return changed ? out : doc;
}

/**
 * Typed update input (`set` / `inc` / …) → Mongo update doc (`$set` / `$inc` / …).
 * Also accepts `_set` aliases and native `$set` keys; bare field maps become `$set`.
 */
export function graphqlUpdateToMongo(
  input: Record<string, unknown>,
  opts?: { collection?: string },
): Record<string, unknown> {
  const collection = opts?.collection;
  const out: Record<string, unknown> = {};
  let sawOp = false;
  const required = activeRequiredFields(collection);

  for (const [rawKey, value] of Object.entries(input)) {
    if (value == null) continue;

    if (rawKey.startsWith('$')) {
      if (rawKey === '$rename' && isPlainObject(value)) {
        for (const src of Object.keys(value)) {
          if (required.has(src) || required.has(remapUpdateFieldKey(src, collection))) {
            throw new Error(`Cannot rename required field "${src}"`);
          }
        }
      }
      if (rawKey === '$unset' && isPlainObject(value)) {
        for (const field of Object.keys(value)) {
          if (required.has(field) || required.has(remapUpdateFieldKey(field, collection))) {
            throw new Error(`Cannot unset required field "${field}"`);
          }
        }
      }
      out[rawKey] = remapUpdateFields(value, collection);
      sawOp = true;
      continue;
    }

    const key = rawKey.startsWith('_') ? rawKey.slice(1) : rawKey;
    if (!UPDATE_OP_KEYS.has(key)) continue;

    sawOp = true;
    const mongoOp = `$${key}`;
    if (key === 'unset' && isPlainObject(value)) {
      const unsetDoc: Record<string, string | number | boolean> = {};
      for (const [field, flag] of Object.entries(value)) {
        if (!flag) continue;
        if (required.has(field) || required.has(remapUpdateFieldKey(field, collection))) {
          throw new Error(`Cannot unset required field "${field}"`);
        }
        unsetDoc[remapUpdateFieldKey(field, collection)] = '';
      }
      out.$unset = unsetDoc;
      continue;
    }
    if (key === 'rename' && isPlainObject(value)) {
      for (const src of Object.keys(value)) {
        if (required.has(src) || required.has(remapUpdateFieldKey(src, collection))) {
          throw new Error(`Cannot rename required field "${src}"`);
        }
      }
    }
    out[mongoOp] = remapUpdateFields(value, collection);
  }

  if (sawOp) return out;

  // Legacy / shorthand: plain field map → `$set`
  return { $set: remapUpdateFields(input, collection) as Record<string, unknown> };
}

/** Resolve a Mongo update document from `@mongo__update*(set:)` (`$args.update` or field map). */
export function resolveUpdateDocument(
  setSource: string | null | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
  opts?: { collection?: string },
): Record<string, unknown> {
  const trimmed = setSource?.trim();
  const argsBinder = trimmed?.match(/^\$args\.([\w$]+)$/);
  if (argsBinder) {
    const update = ctx.args?.[argsBinder[1]];
    if (update && typeof update === 'object' && !Array.isArray(update)) {
      return graphqlUpdateToMongo(update as Record<string, unknown>, opts);
    }
    return { $set: {} };
  }
  return { $set: buildSetDocument(setSource, ctx, opts) };
}

export function coerceFilterValue(value: unknown, opts?: CoerceFilterOptions): unknown {
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
  // Preserve BSON instances (ObjectId / Decimal128 across package copies).
  if (isBsonValue(value)) {
    return value;
  }
  if (typeof value === 'string') {
    if (opts?.asObjectId && ObjectId.isValid(value) && value.length === 24) {
      try {
        return new ObjectId(value);
      } catch {
        return value;
      }
    }
    // Do not infer Decimal128 from numeric-looking strings — that breaks String
    // fields. Accept Extended JSON / BSON instances above; gateway rebuilds should
    // keep Decimal128 parseValue or pass `{ $numberDecimal }`.
  }
  return value;
}
