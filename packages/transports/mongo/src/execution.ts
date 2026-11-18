import type { GraphQLFieldConfig, GraphQLSchema } from 'graphql';
import { createDefaultExecutor, type DisposableExecutor } from '@graphql-mesh/transport-common';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { createMongoClient } from './client.js';
import {
  buildMongoFilter,
  buildMongoSort,
  buildSetDocument,
  coerceFilterValue,
} from './filter.js';
import {
  mapDocumentToGraphql,
  parseMongoMapping,
  projectionFromSelection,
  resolveMappingValue,
} from './mapping.js';
import type { MongoClientLike, MongoKind, MongoTransportOptions } from './types.js';

export interface GetMongoExecutorOpts {
  subgraph: GraphQLSchema;
  client?: MongoClientLike;
  cwd?: string;
}

interface MongoDirectiveArgs {
  collection: string;
  kind: MongoKind;
  filter?: string;
  where?: string;
  sort?: string;
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
    | { location?: string; options?: MongoTransportOptions }
    | undefined;
  const mongoClient =
    client ||
    createMongoClient({
      location: transport!.location!,
      ...(transport?.options || {}),
    });

  const executable = mapSchema(subgraph, {
    [MapperKind.OBJECT_FIELD](fieldConfig) {
      const mongoDirs = getDirective(subgraph, fieldConfig, 'mongo') as
        | MongoDirectiveArgs[]
        | undefined;
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
  const filterSource = directive.filter ?? directive.where;

  fieldConfig.resolve = async function mongoResolver(parent, graphqlArgs) {
    const ctx = { args: graphqlArgs, parent };
    const filter = buildMongoFilter(filterSource, ctx);
    const sort = buildMongoSort(directive.sort, ctx);
    const proj = Object.keys(projection).length ? projection : undefined;

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
        const records = (graphqlArgs.records || []) as Record<string, unknown>[];
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
        const setDoc = buildSetDocument(directive.set, ctx);
        await client.updateOne(directive.collection, filter, { $set: setDoc });
        const updated = await client.findOne(directive.collection, filter);
        return mapPayload(updated, updated?._id, selection);
      }
      case 'UPDATE_MANY': {
        const setDoc = buildSetDocument(directive.set, ctx);
        const result = await client.updateMany(directive.collection, filter, { $set: setDoc });
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
        return rows.map(doc => mapDocumentToGraphql(doc, selection));
      }
      default:
        throw new Error(`@mongo kind ${directive.kind as string} is not implemented`);
    }
  };

  return fieldConfig;
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
  if (!pipelineSource || !pipelineSource.trim()) {
    return Object.keys(filter).length ? [{ $match: filter }] : [];
  }
  const trimmed = pipelineSource.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>[];
      return parsed.map(stage => {
        if (stage.$match === '$args.filter' || stage.$match === '$filter') {
          return { $match: filter };
        }
        return stage;
      });
    } catch {
      // fall through
    }
  }
  // Mapping-style: treat as match binder only
  const fromMapping = buildMongoFilter(pipelineSource, ctx);
  return Object.keys(fromMapping).length ? [{ $match: fromMapping }] : [{ $match: filter }];
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
