import type { GraphQLFieldConfig, GraphQLResolveInfo, GraphQLSchema } from 'graphql';
import { createDefaultExecutor, type DisposableExecutor } from '@graphql-mesh/transport-common';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { createMongoClient } from './client.js';
import {
  buildMongoFilter,
  buildMongoSort,
  buildSetDocument,
  coerceFilterValue,
  filterFromMapping,
  resolveUpdateDocument,
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

export interface GetMongoExecutorOpts {
  subgraph: GraphQLSchema;
  client?: MongoClientLike;
  cwd?: string;
}

interface MongoDirectiveArgs {
  collection: string;
  kind: MongoKind;
  filter?: string;
  /** @deprecated legacy binder name; prefer `filter` */
  where?: string;
  sort?: string;
  /** @deprecated legacy binder name; prefer `sort` */
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

export function getMongoExecutor({ subgraph, client }: GetMongoExecutorOpts): DisposableExecutor {
  const transportDirectives = getDirective(subgraph, subgraph, 'transport');
  if (!transportDirectives?.length && !client) {
    throw new Error('No @transport directive found on schema definition');
  }
  const transport = transportDirectives?.[0] as
    { location?: string; options?: MongoTransportOptions } | undefined;
  const mongoClient =
    client ||
    createMongoClient({
      location: transport!.location!,
      ...(transport?.options || {}),
    });

  const executable = mapSchema(subgraph, {
    [MapperKind.OBJECT_FIELD](fieldConfig) {
      const mongoDirs = getDirective(subgraph, fieldConfig, 'mongo') as
        MongoDirectiveArgs[] | undefined;
      if (!mongoDirs?.length) return fieldConfig;
      return attachMongoResolver(fieldConfig, mongoDirs[0], mongoClient);
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
): GraphQLFieldConfig<any, any> {
  const selection = parseMongoMapping(directive.selection);
  const projection = projectionFromSelection(selection);
  fieldConfig.resolve = async function mongoResolver(
    parent,
    graphqlArgs,
    _context,
    info: GraphQLResolveInfo,
  ) {
    const ctx = { args: graphqlArgs, parent };
    const filter = buildMongoFilter(directive.filter ?? directive.where, ctx);
    const sort = buildMongoSort(directive.sort ?? directive.orderBy, ctx);
    const proj = Object.keys(projection).length ? projection : undefined;
    const typedError = wantsTypedError(info);

    try {
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
          return client.count(directive.collection, filter);
        case 'CONNECTION':
          return resolveConnection(client, directive, filter, sort, proj, ctx, selection);
        case 'PAGINATION':
          return resolvePagination(client, directive, filter, sort, proj, ctx, selection);
        case 'INSERT_ONE': {
          const doc = buildSetDocument(directive.set, ctx);
          const { insertedId } = await client.insertOne(directive.collection, doc);
          const created = await client.findOne(directive.collection, { _id: insertedId });
          return mapPayload(created, insertedId, selection);
        }
        case 'INSERT_MANY': {
          const records = (graphqlArgs.documents || graphqlArgs.inputs || []) as Record<
            string,
            unknown
          >[];
          const { insertedIds, insertedCount } = await client.insertMany(
            directive.collection,
            records,
          );
          const docs = await client.findMany(directive.collection, {
            _id: { $in: insertedIds },
          });
          return {
            records: docs.map(d => mapDocumentToGraphql(d, nestedSelection(selection, 'records'))),
            recordIds: insertedIds.map(id => String(id)),
            createdCount: insertedCount,
          };
        }
        case 'UPDATE_ONE': {
          const updateDoc = resolveUpdateDocument(directive.set, ctx);
          await client.updateOne(directive.collection, filter, updateDoc);
          const updated = await client.findOne(directive.collection, filter);
          return mapPayload(updated, updated?._id, selection);
        }
        case 'UPDATE_MANY': {
          const updateDoc = resolveUpdateDocument(directive.set, ctx);
          const result = await client.updateMany(directive.collection, filter, updateDoc);
          return {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
          };
        }
        case 'DELETE_ONE': {
          const existing = await client.findOne(directive.collection, filter);
          await client.deleteOne(directive.collection, filter);
          return mapPayload(existing, existing?._id, selection);
        }
        case 'DELETE_MANY': {
          const result = await client.deleteMany(directive.collection, filter);
          return { deletedCount: result.deletedCount };
        }
        case 'AGGREGATE': {
          const pipeline = resolvePipeline(directive.pipeline, ctx, filter);
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
  const first = resolveBinderNumber(directive.first, ctx) ?? 10;
  const after = resolveBinderString(directive.after, ctx);
  const connFilter = { ...filter };
  if (after) {
    connFilter._id = {
      ...(typeof connFilter._id === 'object' && connFilter._id ? (connFilter._id as object) : {}),
      $gt: coerceFilterValue(after),
    };
  }
  const docs = await client.findMany(directive.collection, connFilter, {
    projection,
    sort: sort || { _id: 1 },
    limit: first + 1,
  });
  const hasNextPage = docs.length > first;
  const pageDocs = hasNextPage ? docs.slice(0, first) : docs;
  const totalCount = await client.count(directive.collection, filter);
  const nodesSel = nestedSelection(selection, 'nodes');
  const nodes = pageDocs.map(d => mapDocumentToGraphql(d, nodesSel));
  const edges = pageDocs.map(d => ({
    cursor: String(d._id),
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

function resolvePipeline(
  pipelineSource: string | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
  filter: Record<string, unknown>,
): Record<string, unknown>[] {
  // Client-supplied stages: `@mongo(pipeline: "$args.pipeline")`
  if (pipelineSource?.trim() === '$args.pipeline' || pipelineSource?.trim() === '$pipeline') {
    const fromArgs = ctx.args?.pipeline;
    if (Array.isArray(fromArgs) && fromArgs.length) {
      return fromArgs.map(stage => rewritePipelineStage(stage, filter)) as Record<
        string,
        unknown
      >[];
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
      return parsed.map(stage => rewritePipelineStage(stage, filter)) as Record<string, unknown>[];
    } catch {
      // fall through to mapping dialect
    }
  }

  const parsed = parseMongoMapping(pipelineSource);
  const stageEntries = parsed.entries.filter(e => e.key.startsWith('$') && !e.spread);
  if (stageEntries.length) {
    return stageEntries.map(entry => mappingEntryToStage(entry, ctx, filter));
  }

  // Single match binder / structured where
  const fromMapping = buildMongoFilter(pipelineSource, ctx);
  return Object.keys(fromMapping).length ? [{ $match: fromMapping }] : [{ $match: filter }];
}

function mappingEntryToStage(
  entry: MongoMappingEntry,
  ctx: { args?: Record<string, unknown>; parent?: unknown },
  filter: Record<string, unknown>,
): Record<string, unknown> {
  if (entry.key === '$match') {
    if (
      entry.value?.kind === 'args' &&
      (entry.value.value === 'where' || entry.value.value === 'filter')
    ) {
      return { $match: filter };
    }
    if (entry.children?.length) {
      return { $match: filterFromMapping({ entries: entry.children }, ctx) };
    }
    const resolved = resolveMappingValue(entry.value, ctx);
    if (resolved && typeof resolved === 'object' && !Array.isArray(resolved)) {
      return { $match: resolved as Record<string, unknown> };
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
  if (stage === '$args.where' || stage === '$where' || stage === '$args.filter') {
    return filter;
  }
  if (Array.isArray(stage)) {
    return stage.map(s => rewritePipelineStage(s, filter));
  }
  if (stage && typeof stage === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(stage as Record<string, unknown>)) {
      if (k === '$match' && (v === '$args.where' || v === '$where' || v === '$args.filter')) {
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
