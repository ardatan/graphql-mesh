import type { GraphQLFieldConfig, GraphQLSchema } from 'graphql';
import { createDefaultExecutor, type DisposableExecutor } from '@graphql-mesh/transport-common';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { createMongoClient } from './client.js';
import { buildMongoFilter, buildMongoSort } from './filter.js';
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
  where?: string;
  sort?: string;
  limit?: string;
  skip?: string;
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
  const location = transport?.location;
  const options = (transport?.options || {}) as MongoTransportOptions;
  const mongoClient =
    client ||
    createMongoClient({
      location: location!,
      ...options,
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

  fieldConfig.resolve = async function mongoResolver(parent, graphqlArgs) {
    const ctx = { args: graphqlArgs, parent };
    const filter = buildMongoFilter(directive.where, ctx);
    const sort = buildMongoSort(directive.sort, ctx);

    switch (directive.kind) {
      case 'FIND_ONE': {
        const doc = await client.findOne(directive.collection, filter, {
          projection: Object.keys(projection).length ? projection : undefined,
          sort,
        });
        return mapDocumentToGraphql(doc, selection);
      }
      case 'FIND_MANY': {
        const limit = resolveBinderNumber(directive.limit, ctx);
        const skip = resolveBinderNumber(directive.skip, ctx);
        const docs = await client.findMany(directive.collection, filter, {
          projection: Object.keys(projection).length ? projection : undefined,
          sort,
          limit,
          skip,
        });
        return docs.map(doc => mapDocumentToGraphql(doc, selection));
      }
      case 'COUNT': {
        return client.count(directive.collection, filter);
      }
      default:
        throw new Error(
          `@mongo kind ${directive.kind} is not implemented in the first slice (FIND_ONE / FIND_MANY / COUNT only)`,
        );
    }
  };

  return fieldConfig;
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
