import type { GraphQLFieldConfig, GraphQLResolveInfo, GraphQLSchema } from 'graphql';
import { createDefaultExecutor, type DisposableExecutor } from '@graphql-mesh/transport-common';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { createMongoClient } from './client.js';
import {
  buildMongoFilter,
  buildMongoSort,
  buildSetDocument,
  coerceDeep,
  coerceFilterValue,
  filterFromMapping,
  graphqlFilterToMongo,
  isObjectIdFieldKey,
  isUniversallyMatchingFilter,
  MATCH_NOTHING_FILTER,
  resolveUpdateDocument,
  runWithMongoFieldRuntime,
  stripInputPlaceholder,
  type MongoFieldRuntime,
} from './filter.js';
import {
  mapDocumentToGraphql,
  parseMongoMapping,
  projectionFromSelection,
  resolveMappingValue,
} from './mapping.js';
import type {
  MongoClientLike,
  MongoKind,
  MongoMappingEntry,
  MongoTransportOptions,
  ParsedMongoMapping,
} from './types.js';

/**
 * Options for {@link getMongoExecutor}.
 *
 * @example Default — open a driver client from `@transport(location:)`
 * ```ts
 * const executor = getMongoExecutor({ subgraph });
 * ```
 *
 * @example Inject a stub client (unit tests)
 * ```ts
 * const executor = getMongoExecutor({ subgraph, client: stubMongoClient });
 * ```
 *
 * @example Override connection string (legacy handler cache)
 * ```ts
 * const executor = getMongoExecutor({
 *   subgraph,
 *   location: process.env.MONGO_URL,
 * });
 * ```
 */
export interface GetMongoExecutorOpts {
  /** Subgraph schema with `@mongo__*` / `@transport(kind: "mongo")`. */
  subgraph: GraphQLSchema;
  /** When set, skip opening a real Mongo client. */
  client?: MongoClientLike;
  cwd?: string;
  /**
   * Override `@transport(location:)` — e.g. current handler `connectionString`
   * when the cached schema still carries a stale location.
   */
  location?: string;
}

interface MongoDirectiveArgs {
  collection: string;
  kind: MongoKind;
  query?: string;
  /** @deprecated prefer `query` */
  filter?: string;
  /** @deprecated prefer `query` */
  where?: string;
  sort?: string;
  /** @deprecated prefer `sort` */
  orderBy?: string;
  limit?: string;
  skip?: string;
  first?: string;
  after?: string;
  page?: string;
  perPage?: string;
  selection?: string;
  set?: string;
  pipeline?: string;
}

const MONGO_OP_DIRECTIVES: Array<{ name: string; kind: MongoKind }> = [
  { name: 'mongo__findOne', kind: 'FIND_ONE' },
  { name: 'mongo__find', kind: 'FIND_MANY' },
  { name: 'mongo__count', kind: 'COUNT' },
  { name: 'mongo__connection', kind: 'CONNECTION' },
  { name: 'mongo__pagination', kind: 'PAGINATION' },
  { name: 'mongo__aggregate', kind: 'AGGREGATE' },
  { name: 'mongo__insertOne', kind: 'INSERT_ONE' },
  { name: 'mongo__insertMany', kind: 'INSERT_MANY' },
  { name: 'mongo__updateOne', kind: 'UPDATE_ONE' },
  { name: 'mongo__updateMany', kind: 'UPDATE_MANY' },
  { name: 'mongo__deleteOne', kind: 'DELETE_ONE' },
  { name: 'mongo__deleteMany', kind: 'DELETE_MANY' },
];

function readMongoDirective(
  subgraph: GraphQLSchema,
  fieldConfig: GraphQLFieldConfig<any, any>,
): MongoDirectiveArgs | undefined {
  for (const { name, kind } of MONGO_OP_DIRECTIVES) {
    const dirs = getDirective(subgraph, fieldConfig, name) as
      Omit<MongoDirectiveArgs, 'kind'>[] | undefined;
    if (dirs?.length) {
      return { ...dirs[0], kind };
    }
  }
  return undefined;
}

/**
 * Build a Mesh executor for a mongo subgraph. Reads `@transport` options and
 * wraps fields that carry `@mongo__*` binders.
 *
 * Filter binders typically use `query: "$args.filter"` so client GraphQL
 * `filter: { name: { eq: "Ada" } }` becomes a Mongo filter document.
 */
export function getMongoExecutor({
  subgraph,
  client,
  location,
}: GetMongoExecutorOpts): DisposableExecutor {
  const transportDirectives = getDirective(subgraph, subgraph, 'transport');
  if (!transportDirectives?.length && !client && !location) {
    throw new Error('No @transport directive found on schema definition');
  }
  const transport = transportDirectives?.[0] as
    { location?: string; options?: MongoTransportOptions } | undefined;
  /**
   * Decode entry-list or legacy Record maps. When `emptyAuthoritative` is set,
   * a present empty value yields an empty Map (no flat fallback); otherwise
   * empty/absent both yield `undefined`.
   */
  const toCollectionMap = (
    raw: MongoTransportOptions['objectIdFieldsByCollection'],
    opts?: { emptyAuthoritative?: boolean },
  ) => {
    if (raw === undefined || raw === null) return undefined;
    const entries = decodeCollectionFieldsEntries(raw);
    if (!entries.length) {
      return opts?.emptyAuthoritative ? new Map() : undefined;
    }
    return new Map(
      entries.map(
        ([collection, fields]) => [collection, new Set(fields)] as [string, ReadonlySet<string>],
      ),
    );
  };
  const fieldRuntime: MongoFieldRuntime = {
    objectIdFields: new Set(['_id', 'id', ...(transport?.options?.objectIdFields || [])]),
    // Present empty objectIdFieldsByCollection must not fall back to flat objectIdFields.
    objectIdFieldsByCollection: toCollectionMap(transport?.options?.objectIdFieldsByCollection, {
      emptyAuthoritative: true,
    }),
    requiredFields: new Set(transport?.options?.requiredFields || []),
    // Present empty requiredFieldsByCollection must not fall back to flat requiredFields.
    requiredFieldsByCollection: toCollectionMap(transport?.options?.requiredFieldsByCollection, {
      emptyAuthoritative: true,
    }),
    placeholderFields: new Set(
      transport?.options?.placeholderFields?.length ? transport.options.placeholderFields : ['_'],
    ),
    placeholderFieldsByCollection: toCollectionMap(
      transport?.options?.placeholderFieldsByCollection,
    ),
    stringIdCollections: new Set(transport?.options?.stringIdCollections || []),
  };
  const mongoClient =
    client ||
    createMongoClient({
      location: location || transport!.location!,
      ...(transport?.options || {}),
    });

  const executable = mapSchema(subgraph, {
    [MapperKind.OBJECT_FIELD](fieldConfig) {
      const directive = readMongoDirective(subgraph, fieldConfig);
      if (!directive) return fieldConfig;
      return attachMongoResolver(fieldConfig, directive, mongoClient, fieldRuntime);
    },
  });

  const defaultExecutor = createDefaultExecutor(executable);
  const disposable = defaultExecutor as DisposableExecutor;
  disposable[DisposableSymbols.asyncDispose] = async () => {
    await mongoClient.dispose();
  };
  return disposable;
}

function attachMongoResolver(
  fieldConfig: GraphQLFieldConfig<any, any>,
  directive: MongoDirectiveArgs,
  client: MongoClientLike,
  fieldRuntime: MongoFieldRuntime,
): GraphQLFieldConfig<any, any> {
  const selection = parseMongoMapping(directive.selection);
  const projection = projectionFromSelection(selection);
  fieldConfig.resolve = async function mongoResolver(
    parent,
    graphqlArgs,
    _context,
    info: GraphQLResolveInfo,
  ) {
    return runWithMongoFieldRuntime(fieldRuntime, async () => {
      const ctx = { args: graphqlArgs, parent };
      const proj = Object.keys(projection).length ? projection : undefined;
      const typedError = wantsTypedError(info);

      try {
        // Binder/filter conversion lives inside try so typed mutation payloads
        // catch invalid ObjectId/Decimal inputs the same way as driver errors.
        const filter = buildMongoFilter(
          directive.query ?? directive.filter ?? directive.where,
          ctx,
          { collection: directive.collection },
        );
        const sort = buildMongoSort(directive.sort ?? directive.orderBy, ctx, {
          collection: directive.collection,
        });
        switch (directive.kind) {
          case 'FIND_ONE': {
            const doc = await client.findOne(directive.collection, filter, {
              projection: proj,
              sort,
              skip: resolveBinderNumber(directive.skip, ctx),
            });
            return mapDocumentToGraphql(doc, selection);
          }
          case 'FIND_MANY': {
            const docs = await client.findMany(directive.collection, filter, {
              projection: proj,
              sort,
              limit: resolveBinderNumber(directive.limit, ctx),
              skip: resolveBinderNumber(directive.skip, ctx),
            });
            return docs.map(doc => mapDocumentToGraphql(doc, selection));
          }
          case 'COUNT':
            return await client.count(directive.collection, filter);
          case 'CONNECTION':
            return await resolveConnection(client, directive, filter, sort, proj, ctx, selection);
          case 'PAGINATION':
            return await resolvePagination(client, directive, filter, sort, proj, ctx, selection);
          case 'INSERT_ONE': {
            const doc = stripInputPlaceholder(
              buildSetDocument(directive.set, ctx, { collection: directive.collection }),
              directive.collection,
            );
            const { insertedId } = await client.insertOne(directive.collection, doc);
            const created = await client.findOne(directive.collection, { _id: insertedId });
            return mapPayload(created, insertedId, selection);
          }
          case 'INSERT_MANY': {
            const fromSet = buildSetDocument(directive.set, ctx, {
              collection: directive.collection,
            });
            const rawRecords = (fromSet.documents ||
              fromSet.inputs ||
              graphqlArgs.documents ||
              graphqlArgs.inputs ||
              []) as Record<string, unknown>[];
            // Sibling literals beside `documents:` (e.g. discriminator `__t: "Link"`)
            // are stamped onto every inserted doc — stamp wins over client values.
            const stamp: Record<string, unknown> = { ...fromSet };
            delete stamp.documents;
            delete stamp.inputs;
            const stringId = fieldRuntime.stringIdCollections.has(directive.collection);
            const records = (Array.isArray(rawRecords) ? rawRecords : []).map(doc => {
              const coerced = coerceDeep(doc, {
                collection: directive.collection,
              }) as Record<string, unknown>;
              if (stringId) {
                applyGraphqlStringIdInsertAliases(coerced);
              }
              return stripInputPlaceholder({ ...coerced, ...stamp }, directive.collection);
            });
            const { insertedIds, insertedCount } = await client.insertMany(
              directive.collection,
              records,
            );
            const docs = await client.findMany(directive.collection, {
              _id: { $in: insertedIds },
            });
            return {
              records: docs.map(d =>
                mapDocumentToGraphql(d, nestedSelection(selection, 'records')),
              ),
              recordIds: insertedIds.map(id => String(id)),
              createdCount: insertedCount,
            };
          }
          case 'UPDATE_ONE': {
            const updateDoc = resolveUpdateDocument(directive.set, ctx, {
              collection: directive.collection,
            });
            const { value: updated } = await client.findOneAndUpdate(
              directive.collection,
              filter,
              updateDoc,
            );
            return mapPayload(updated, updated?._id, selection);
          }
          case 'UPDATE_MANY': {
            const updateDoc = resolveUpdateDocument(directive.set, ctx, {
              collection: directive.collection,
            });
            // Empty `{}` (e.g. from `filter: { and: [] }`) would match the whole collection.
            const writeFilter = bulkWriteFilter(filter);
            const result = await client.updateMany(directive.collection, writeFilter, updateDoc);
            return {
              matchedCount: result.matchedCount,
              modifiedCount: result.modifiedCount,
            };
          }
          case 'DELETE_ONE': {
            const { value: existing } = await client.findOneAndDelete(directive.collection, filter);
            return mapPayload(existing, existing?._id, selection);
          }
          case 'DELETE_MANY': {
            const writeFilter = bulkWriteFilter(filter);
            const result = await client.deleteMany(directive.collection, writeFilter);
            return { deletedCount: result.deletedCount };
          }
          case 'AGGREGATE': {
            const pipeline = resolvePipeline(directive.pipeline, ctx, filter, directive.collection);
            const rows = await client.aggregate(directive.collection, pipeline);
            if (isRawSelection(selection)) {
              return rows.map(doc => coerceAggregateRow(doc));
            }
            return rows.map(doc => mapDocumentToGraphql(doc, selection));
          }
          default:
            throw new Error(`@mongo kind ${directive.kind as string} is not implemented`);
        }
      } catch (err) {
        if (typedError && isWriteKind(directive.kind)) {
          return {
            record: null,
            recordId: null,
            records: null,
            recordIds: null,
            createdCount: null,
            modifiedCount: null,
            matchedCount: null,
            deletedCount: null,
            error: toMongoError(err),
          };
        }
        throw err;
      }
    });
  };

  return fieldConfig;
}

function isWriteKind(kind: MongoKind): boolean {
  return (
    kind === 'INSERT_ONE' ||
    kind === 'INSERT_MANY' ||
    kind === 'UPDATE_ONE' ||
    kind === 'UPDATE_MANY' ||
    kind === 'DELETE_ONE' ||
    kind === 'DELETE_MANY'
  );
}

/**
 * Map GraphQL String-`_id` DocumentInput aliases onto BSON keys for bulk insert.
 * Applies only to generated GraphQL shapes (no `_id` yet). Hand-written BSON
 * `{ _id, storedId }` keeps a real `storedId` path — do not rewrite to `id`.
 */
export function applyGraphqlStringIdInsertAliases(doc: Record<string, unknown>): void {
  // BSON already named — leave keys alone (incl. a real `storedId` field).
  if (Object.prototype.hasOwnProperty.call(doc, '_id')) return;
  // GraphQL `id` → Mongo `_id` (include null).
  if (Object.prototype.hasOwnProperty.call(doc, 'id')) {
    doc._id = doc.id;
    delete doc.id;
  }
  // GraphQL `storedId` → mongoose path `id` (include null); keep explicit BSON `id`.
  if (Object.prototype.hasOwnProperty.call(doc, 'storedId')) {
    if (!Object.prototype.hasOwnProperty.call(doc, 'id')) {
      doc.id = doc.storedId;
    }
    delete doc.storedId;
  }
}

/** v0 compose parity: selecting `error` on the payload opts into typed errors. */
function wantsTypedError(info: GraphQLResolveInfo | undefined): boolean {
  if (!info?.fieldNodes?.length) return false;
  for (const fieldNode of info.fieldNodes) {
    const selections = fieldNode.selectionSet?.selections || [];
    for (const sel of selections) {
      if (sel.kind === 'Field' && sel.name.value === 'error') return true;
      if (sel.kind === 'InlineFragment') {
        for (const inner of sel.selectionSet?.selections || []) {
          if (inner.kind === 'Field' && inner.name.value === 'error') return true;
        }
      }
    }
  }
  return false;
}

function toMongoError(err: unknown): { __typename: string; message: string; code?: string } {
  const message = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: unknown }).code)
      : undefined;
  return { __typename: 'MongoError', message, code };
}

async function resolveConnection(
  client: MongoClientLike,
  directive: MongoDirectiveArgs,
  filter: Record<string, unknown>,
  sort: Record<string, 1 | -1> | undefined,
  projection: Record<string, 0 | 1> | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
  selection: ReturnType<typeof parseMongoMapping>,
) {
  const firstRaw = resolveBinderNumber(directive.first, ctx) ?? 10;
  if (firstRaw < 0) {
    throw new Error('@mongo__connection first must be >= 0');
  }
  const first = firstRaw;
  const after = resolveBinderString(directive.after, ctx);
  const effectiveSort = ensureIdTiebreaker(sort || { _id: 1 });
  const connFilter = after
    ? mergeCursorFilter(filter, after, effectiveSort, directive.collection)
    : { ...filter };
  const connProjection = projectionWithSortKeys(projection, effectiveSort);
  const docs = await client.findMany(directive.collection, connFilter, {
    projection: connProjection,
    sort: effectiveSort,
    limit: first + 1,
  });
  const hasNextPage = docs.length > first;
  const pageDocs = hasNextPage ? docs.slice(0, first) : docs;
  const totalCount = await client.count(directive.collection, filter);
  const nodesSel = nestedSelection(selection, 'nodes');
  const nodes = pageDocs.map(d => mapDocumentToGraphql(d, nodesSel));
  const edges = pageDocs.map(d => ({
    cursor: encodeConnectionCursor(d, effectiveSort),
    node: mapDocumentToGraphql(d, nestedSelection(nestedSelection(selection, 'edges'), 'node')),
  }));
  return {
    nodes,
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: Boolean(after),
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
    totalCount,
  };
}

function projectionWithSortKeys(
  projection: Record<string, 0 | 1> | undefined,
  sort: Record<string, 1 | -1>,
): Record<string, 0 | 1> | undefined {
  if (!projection || Object.keys(projection).length === 0) return projection;
  const out = { ...projection };
  for (const key of Object.keys(sort)) {
    out[key] = 1;
  }
  return collapseOverlappingProjection(out);
}

/**
 * Mongo rejects projections that include both a path and a descendant
 * (`address` + `address.city`). Prefer the ancestor (covers sort-key needs).
 */
function collapseOverlappingProjection(projection: Record<string, 0 | 1>): Record<string, 0 | 1> {
  const included = Object.keys(projection).filter(k => projection[k] === 1);
  const out = { ...projection };
  for (const key of included) {
    const parts = key.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('.');
      if (out[parent] === 1) {
        delete out[key];
        break;
      }
    }
  }
  return out;
}

function ensureIdTiebreaker(sort: Record<string, 1 | -1>): Record<string, 1 | -1> {
  if (Object.prototype.hasOwnProperty.call(sort, '_id')) return sort;
  return { ...sort, _id: 1 };
}

function encodeCursorValue(value: unknown): unknown {
  if (value instanceof Date) {
    return { __mongoCursor: 'date', value: value.toISOString() };
  }
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toHexString?: () => string }).toHexString === 'function'
  ) {
    return {
      __mongoCursor: 'objectId',
      value: (value as { toHexString: () => string }).toHexString(),
    };
  }
  return value ?? null;
}

function decodeCursorValue(value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as { __mongoCursor?: string }).__mongoCursor === 'date' &&
    typeof (value as { value?: unknown }).value === 'string'
  ) {
    return new Date((value as { value: string }).value);
  }
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as { __mongoCursor?: string }).__mongoCursor === 'objectId' &&
    typeof (value as { value?: unknown }).value === 'string'
  ) {
    return coerceFilterValue((value as { value: string }).value, { asObjectId: true });
  }
  return value;
}

/** Resolve a sort key for cursor encoding; reject array-backed values at any depth. */
export function resolveSortKeyValueForCursor(doc: Record<string, unknown>, key: string): unknown {
  if (key === '_id') return assertScalarSortValue(doc._id, key);
  if (!key.includes('.')) {
    return assertScalarSortValue(doc[key], key);
  }
  let cur: unknown = doc;
  for (const seg of key.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    if (Array.isArray(cur)) {
      throw new Error(
        `@mongo__connection cannot encode array-backed sort key "${key}" for cursors`,
      );
    }
    cur = (cur as Record<string, unknown>)[seg];
  }
  return assertScalarSortValue(cur, key);
}

function assertScalarSortValue(value: unknown, key: string): unknown {
  if (Array.isArray(value)) {
    throw new Error(`@mongo__connection cannot encode array-backed sort key "${key}" for cursors`);
  }
  return value;
}

/** Vacuous / empty filters match every document — never use them for bulk writes. */
function bulkWriteFilter(filter: Record<string, unknown>): Record<string, unknown> {
  return isUniversallyMatchingFilter(filter) ? MATCH_NOTHING_FILTER : filter;
}

function encodeConnectionCursor(
  doc: Record<string, unknown>,
  sort: Record<string, 1 | -1>,
): string {
  const values: unknown[] = [];
  for (const key of Object.keys(sort)) {
    values.push(encodeCursorValue(resolveSortKeyValueForCursor(doc, key)));
  }
  return Buffer.from(JSON.stringify(values), 'utf8').toString('base64url');
}

function decodeConnectionCursor(cursor: string): unknown[] | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(decodeCursorValue) : null;
  } catch {
    // Legacy cursors were plain `_id` strings.
    return [cursor];
  }
}

/**
 * Keyset continuation: combine the original filter with a sort-aware boundary via `$and`
 * so an existing `_id` (or other) constraint is never overwritten.
 */
function mergeCursorFilter(
  filter: Record<string, unknown>,
  after: string,
  sort: Record<string, 1 | -1>,
  collection?: string,
): Record<string, unknown> {
  const values = decodeConnectionCursor(after);
  const keys = Object.keys(sort);
  if (!values || (values.length !== keys.length && values.length !== 1)) {
    return { ...filter };
  }
  const idAsObjectId = isObjectIdFieldKey('_id', collection);
  // Legacy single-_id cursor when sort is only `_id` or values length is 1.
  if (values.length === 1 && keys.length === 1 && keys[0] === '_id') {
    const op = sort._id < 0 ? '$lt' : '$gt';
    return andFilters(filter, {
      _id: { [op]: coerceFilterValue(values[0], { asObjectId: idAsObjectId }) },
    });
  }
  if (values.length === 1 && keys.length > 1) {
    // Ambiguous legacy cursor under multi-field sort — fall back to `_id` tie-breaker only.
    const idDir = sort._id ?? 1;
    const op = idDir < 0 ? '$lt' : '$gt';
    return andFilters(filter, {
      _id: { [op]: coerceFilterValue(values[0], { asObjectId: idAsObjectId }) },
    });
  }

  const orClauses: Record<string, unknown>[] = [];
  for (let i = 0; i < keys.length; i++) {
    const prefix: Record<string, unknown> = {};
    for (let j = 0; j < i; j++) {
      prefix[keys[j]] = coerceCursorValue(keys[j], values[j], collection);
    }
    orClauses.push(
      ...fieldContinuationClauses(prefix, keys[i], sort[keys[i]], values[i], collection),
    );
  }
  return andFilters(filter, { $or: orClauses });
}

/**
 * Build continuation clause(s) for one sort field. Null/missing cannot use `$gt: null`
 * (BSON type brackets); ascending continues into non-null values, descending stays on nulls.
 */
function fieldContinuationClauses(
  prefix: Record<string, unknown>,
  field: string,
  dir: 1 | -1,
  rawValue: unknown,
  collection?: string,
): Record<string, unknown>[] {
  const value = coerceCursorValue(field, rawValue, collection);
  if (value == null) {
    // Equal-null rows continue via later sort keys (usually `_id`). For ascending
    // sorts (nulls first), also jump to the first non-null values.
    if (dir > 0) {
      return [{ ...prefix, [field]: { $exists: true, $nin: [null] } }];
    }
    return [];
  }
  const op = dir < 0 ? '$lt' : '$gt';
  const clauses: Record<string, unknown>[] = [{ ...prefix, [field]: { [op]: value } }];
  // Descending sorts place null/missing after numbers; `$lt` alone cannot cross BSON types.
  if (dir < 0) {
    clauses.push({ ...prefix, [field]: null });
  }
  return clauses;
}

function coerceCursorValue(field: string, value: unknown, collection?: string): unknown {
  return coerceFilterValue(value, { asObjectId: isObjectIdFieldKey(field, collection) });
}

function andFilters(
  base: Record<string, unknown>,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  if (!base || Object.keys(base).length === 0) return { ...extra };
  if (!extra || Object.keys(extra).length === 0) return { ...base };
  // Keep the full base document (including siblings beside `$and`).
  return { $and: [base, extra] };
}

async function resolvePagination(
  client: MongoClientLike,
  directive: MongoDirectiveArgs,
  filter: Record<string, unknown>,
  sort: Record<string, 1 | -1> | undefined,
  projection: Record<string, 0 | 1> | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
  selection: ReturnType<typeof parseMongoMapping>,
) {
  const page = Math.max(1, resolveBinderNumber(directive.page, ctx) ?? 1);
  const perPage = Math.max(1, resolveBinderNumber(directive.perPage, ctx) ?? 20);
  const itemCount = await client.count(directive.collection, filter);
  const pageCount = Math.ceil(itemCount / perPage) || 0;
  const docs = await client.findMany(directive.collection, filter, {
    projection,
    sort,
    skip: (page - 1) * perPage,
    limit: perPage,
  });
  const itemsSel = nestedSelection(selection, 'items');
  return {
    count: docs.length,
    items: docs.map(d => mapDocumentToGraphql(d, itemsSel)),
    pageInfo: {
      currentPage: page,
      perPage,
      pageCount,
      itemCount,
      hasNextPage: page < pageCount,
      hasPreviousPage: page > 1,
    },
  };
}

function mapPayload(
  doc: Record<string, unknown> | null | undefined,
  id: unknown,
  selection: ReturnType<typeof parseMongoMapping>,
) {
  const recordSel = nestedSelection(selection, 'record');
  return {
    record: mapDocumentToGraphql(doc, recordSel.entries.length ? recordSel : selection),
    recordId: id != null ? String(id) : null,
  };
}

function nestedSelection(
  selection: ReturnType<typeof parseMongoMapping>,
  key: string,
): ReturnType<typeof parseMongoMapping> {
  const entry = selection.entries.find(e => e.key === key);
  return { entries: entry?.children || [] };
}

function assertNoWriteAggregateStages(pipeline: Record<string, unknown>[]): void {
  for (const stage of pipeline) {
    if (!stage || typeof stage !== 'object') continue;
    if ('$merge' in stage || '$out' in stage) {
      throw new Error('@mongo__aggregate rejects client $merge / $out stages');
    }
  }
}

/** Prepend binder filter (incl. discriminator) when the client supplies stages. */
function withEnforcedMatch(
  stages: Record<string, unknown>[],
  filter: Record<string, unknown>,
): Record<string, unknown>[] {
  if (!Object.keys(filter).length) return stages;
  const first = stages[0];
  if (
    first &&
    typeof first === 'object' &&
    first.$match &&
    JSON.stringify(first.$match) === JSON.stringify(filter)
  ) {
    return stages;
  }
  return [{ $match: filter }, ...stages];
}

function resolvePipeline(
  pipelineSource: string | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
  filter: Record<string, unknown>,
  collection?: string,
): Record<string, unknown>[] {
  const pipeline = buildPipelineStages(pipelineSource, ctx, filter, collection);
  assertNoWriteAggregateStages(pipeline);
  return pipeline;
}

function buildPipelineStages(
  pipelineSource: string | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
  filter: Record<string, unknown>,
  collection?: string,
): Record<string, unknown>[] {
  // Client-supplied stages: `@mongo(pipeline: "$args.pipeline")`
  if (pipelineSource?.trim() === '$args.pipeline' || pipelineSource?.trim() === '$pipeline') {
    const fromArgs = ctx.args?.pipeline;
    if (Array.isArray(fromArgs) && fromArgs.length) {
      return withEnforcedMatch(
        fromArgs.map(stage => rewritePipelineStage(stage, filter)) as Record<string, unknown>[],
        filter,
      );
    }
    return Object.keys(filter).length ? [{ $match: filter }] : [];
  }

  if (!pipelineSource || !pipelineSource.trim()) {
    return Object.keys(filter).length ? [{ $match: filter }] : [];
  }

  const trimmed = pipelineSource.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown[];
      return withEnforcedMatch(
        parsed.map(stage => rewritePipelineStage(stage, filter)) as Record<string, unknown>[],
        filter,
      );
    } catch {
      // fall through to mapping dialect
    }
  }

  const parsed = parseMongoMapping(pipelineSource);
  const stageEntries = parsed.entries.filter(e => e.key.startsWith('$') && !e.spread);
  if (stageEntries.length) {
    return withEnforcedMatch(
      stageEntries.map(entry => mappingEntryToStage(entry, ctx, filter, collection)),
      filter,
    );
  }

  // Single match binder / structured where — honor collection-scoped ObjectId/required.
  const fromMapping = buildMongoFilter(pipelineSource, ctx, { collection });
  return Object.keys(fromMapping).length ? [{ $match: fromMapping }] : [{ $match: filter }];
}

/** Decode entry-list encoding or legacy Record keyed by collection name. */
function decodeCollectionFieldsEntries(
  raw: MongoTransportOptions['objectIdFieldsByCollection'],
): Array<[string, string[]]> {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter(
        (e): e is { collection: string; fields: string[] } =>
          e != null &&
          typeof e === 'object' &&
          typeof (e as { collection?: unknown }).collection === 'string' &&
          Array.isArray((e as { fields?: unknown }).fields),
      )
      .map(e => [e.collection, e.fields.map(String)]);
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, string[]>).map(([collection, fields]) => [
      collection,
      Array.isArray(fields) ? fields.map(String) : [],
    ]);
  }
  return [];
}

function mappingEntryToStage(
  entry: MongoMappingEntry,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
  filter: Record<string, unknown>,
  collection?: string,
): Record<string, unknown> {
  if (entry.key === '$match') {
    if (
      entry.value?.kind === 'args' &&
      (entry.value.value === 'where' ||
        entry.value.value === 'filter' ||
        entry.value.value === 'query')
    ) {
      // Prefer the already-built directive filter (coercion + discriminator).
      return { $match: filter };
    }
    if (entry.children?.length) {
      return { $match: filterFromMapping({ entries: entry.children }, ctx, { collection }) };
    }
    const resolved = resolveMappingValue(entry.value, ctx);
    if (resolved && typeof resolved === 'object' && !Array.isArray(resolved)) {
      // Raw GraphQL filter input — normalize operators + ObjectId coerce.
      return {
        $match: graphqlFilterToMongo(resolved as Record<string, unknown>, '', collection),
      };
    }
    return { $match: filter };
  }

  if (entry.children?.length) {
    return { [entry.key]: mappingChildrenToObject(entry.children, ctx, filter) };
  }
  const resolved = resolveMappingValue(entry.value, ctx);
  return { [entry.key]: rewritePipelineStage(resolved, filter) };
}

function mappingChildrenToObject(
  children: MongoMappingEntry[],
  ctx: { args?: Record<string, unknown>; parent?: unknown },
  filter: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const child of children) {
    if (child.spread) {
      const spreadVal = resolveMappingValue(child.value, ctx);
      if (spreadVal && typeof spreadVal === 'object' && !Array.isArray(spreadVal)) {
        Object.assign(out, spreadVal);
      }
      continue;
    }
    if (child.children?.length) {
      out[child.key] = mappingChildrenToObject(child.children, ctx, filter);
      continue;
    }
    out[child.key] = rewritePipelineStage(resolveMappingValue(child.value, ctx), filter);
  }
  return out;
}

function rewritePipelineStage(stage: unknown, filter: Record<string, unknown>): unknown {
  if (
    stage === '$args.query' ||
    stage === '$args.filter' ||
    stage === '$args.where' ||
    stage === '$where'
  ) {
    return filter;
  }
  if (Array.isArray(stage)) {
    return stage.map(s => rewritePipelineStage(s, filter));
  }
  if (stage && typeof stage === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(stage as Record<string, unknown>)) {
      if (
        k === '$match' &&
        (v === '$args.query' || v === '$args.filter' || v === '$args.where' || v === '$where')
      ) {
        out.$match = filter;
      } else {
        out[k] = rewritePipelineStage(v, filter);
      }
    }
    return out;
  }
  return stage;
}

function isRawSelection(selection: ParsedMongoMapping): boolean {
  return (
    selection.entries.length === 0 ||
    (selection.entries.length === 1 &&
      (selection.entries[0].key === '$' || selection.entries[0].value?.kind === 'pseudo'))
  );
}

function coerceAggregateRow(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    out[k] = coerceFilterValue(v);
    if (
      out[k] &&
      typeof out[k] === 'object' &&
      out[k] !== null &&
      'toHexString' in (out[k] as object)
    ) {
      out[k] = String(out[k]);
    } else if (
      out[k] &&
      typeof out[k] === 'object' &&
      out[k] !== null &&
      (out[k] as { _bsontype?: string })._bsontype === 'Decimal128'
    ) {
      out[k] = String(out[k]);
    } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      // nested group _id objects etc. — stringify ObjectId/Decimal128 leaves
      out[k] = coerceAggregateRow(v as Record<string, unknown>);
    }
  }
  return out;
}

function resolveBinderNumber(
  source: string | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
): number | undefined {
  if (!source) return undefined;
  const parsed = parseMongoMapping(source);
  if (parsed.entries.length === 1 && parsed.entries[0].value) {
    const val = resolveMappingValue(parsed.entries[0].value, ctx);
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && val.trim() !== '') return Number(val);
  }
  return undefined;
}

function resolveBinderString(
  source: string | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
): string | undefined {
  if (!source) return undefined;
  const parsed = parseMongoMapping(source);
  if (parsed.entries.length === 1 && parsed.entries[0].value) {
    const val = resolveMappingValue(parsed.entries[0].value, ctx);
    if (typeof val === 'string') return val;
  }
  return undefined;
}
