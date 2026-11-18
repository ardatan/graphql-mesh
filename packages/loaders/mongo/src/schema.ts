import {
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  type GraphQLSchema,
} from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import { GraphQLDateTime, GraphQLJSON, GraphQLObjectID } from 'graphql-scalars';
import type { Model, Schema as MongooseSchema } from 'mongoose';
import { process as meshProcess } from '@graphql-mesh/cross-helpers';
import type { ImportFn } from '@graphql-mesh/types';
import { defaultImportFn, loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { MongoDirective, MongoKindEnum, TransportDirective } from './directives.js';
import { createDefaultNaming, type MongoNaming } from './naming.js';
import { GraphQLDecimal128 } from './scalars.js';
import { mapMongoPathToGraphQL } from './type-map.js';

const FEDERATION_LINK_URL = 'https://specs.apollo.dev/federation/v2.6';

export interface MongoModelConfig {
  name: string;
  path?: string;
  model?: Model<any>;
  schema?: MongooseSchema;
  collection?: string;
}

export interface LoadMongoSubgraphOpts {
  endpoint: string;
  models: MongoModelConfig[];
  cwd?: string;
  naming?: Partial<MongoNaming>;
  importFn?: ImportFn;
}

export async function loadGraphQLSchemaFromMongo(
  subgraphName: string,
  opts: LoadMongoSubgraphOpts,
): Promise<GraphQLSchema> {
  const naming: MongoNaming = { ...createDefaultNaming(), ...opts.naming };
  const cwd = opts.cwd || meshProcess.cwd();
  const importFn = opts.importFn || defaultImportFn;
  const schemaComposer = new SchemaComposer();

  schemaComposer.add(GraphQLObjectID);
  schemaComposer.add(GraphQLDateTime);
  schemaComposer.add(GraphQLJSON);
  schemaComposer.add(GraphQLDecimal128);
  schemaComposer.addDirective(TransportDirective);
  schemaComposer.addDirective(MongoDirective);
  schemaComposer.add(MongoKindEnum);

  ensureSharedFilterInputs(schemaComposer);
  ensurePageInfo(schemaComposer);
  ensureErrorInterface(schemaComposer);

  const modelMeta: Array<{
    typeName: string;
    collection: string;
    schema: MongooseSchema;
    paths: PathMeta[];
  }> = [];

  for (const modelConfig of opts.models) {
    const model = await resolveModel(modelConfig, cwd, importFn);
    const collection =
      modelConfig.collection ||
      (model as any).collection?.collectionName ||
      model.schema?.get('collection') ||
      pluralizeFallback(modelConfig.name);
    const typeName = naming.typeName(modelConfig.name);
    const paths = introspectPaths(model.schema);
    modelMeta.push({ typeName, collection, schema: model.schema, paths });
    emitModelObjectType(schemaComposer, {
      subgraphName,
      typeName,
      collection,
      paths,
      naming,
    });
  }

  for (const meta of modelMeta) {
    emitModelRootFields(schemaComposer, {
      subgraphName,
      typeName: meta.typeName,
      collection: meta.collection,
      paths: meta.paths,
      naming,
    });
    emitRefFields(schemaComposer, {
      subgraphName,
      typeName: meta.typeName,
      schema: meta.schema,
      naming,
      knownTypes: new Set(modelMeta.map(m => m.typeName)),
      collectionsByType: new Map(modelMeta.map(m => [m.typeName, m.collection])),
    });
  }

  const schema = schemaComposer.buildSchema();
  const extensions: Record<string, any> = (schema.extensions ||= {});
  extensions.directives ||= {};
  extensions.directives.transport = {
    subgraph: subgraphName,
    kind: 'mongo',
    location: opts.endpoint,
  };
  extensions.directives.link = [
    {
      url: FEDERATION_LINK_URL,
      import: ['@key'],
    },
  ];
  markMongoDirectiveStringsAsBlocks(schema);
  return schema;
}

async function resolveModel(
  config: MongoModelConfig,
  cwd: string,
  importFn: ImportFn,
): Promise<Model<any>> {
  if (config.model) return config.model;
  if (config.schema) {
    return {
      schema: config.schema,
      collection: { collectionName: config.collection || pluralizeFallback(config.name) },
    } as any;
  }
  if (!config.path) {
    throw new Error(`Model ${config.name} needs path, model, or schema`);
  }
  const model = await loadFromModuleExportExpression<Model<any>>(config.path, {
    defaultExportName: config.name,
    cwd,
    importFn,
  });
  if (!model) {
    throw new Error(`Model ${config.name} cannot be imported from ${config.path}`);
  }
  return model;
}

interface PathMeta {
  name: string;
  instance: string;
  isArray?: boolean;
  enumValues?: string[];
  ref?: string;
}

function introspectPaths(schema: MongooseSchema): PathMeta[] {
  const out: PathMeta[] = [];
  const paths = (schema as any).paths || {};
  for (const [name, schemaType] of Object.entries(paths) as [string, any][]) {
    const instance = schemaType.instance || schemaType.constructor?.name || 'Mixed';
    const enumValues = schemaType.enumValues || schemaType.options?.enum;
    const ref =
      schemaType.options?.ref || schemaType.caster?.options?.ref || schemaType.schema?.options?.ref;
    out.push({
      name,
      instance: String(instance),
      isArray: instance === 'Array' || Array.isArray(schemaType.options?.type),
      enumValues: Array.isArray(enumValues) ? enumValues.map(String) : undefined,
      ref: ref ? String(ref) : undefined,
    });
  }
  return out;
}

function selectionForPaths(paths: PathMeta[]): string {
  const lines = ['id: _id'];
  for (const path of paths) {
    if (path.name === '_id' || path.name === '__v' || path.name.includes('.')) continue;
    if (path.ref) {
      // Scalar id field kept; populated object is a sibling field.
      lines.push(`${path.name}: ${path.name}`);
      continue;
    }
    lines.push(`${path.name}: ${path.name}`);
  }
  return blockArg(lines.join('\n'));
}

function emitModelObjectType(
  schemaComposer: SchemaComposer,
  opts: {
    subgraphName: string;
    typeName: string;
    collection: string;
    paths: PathMeta[];
    naming: MongoNaming;
  },
) {
  const { subgraphName, typeName, collection, paths, naming } = opts;
  const otc = schemaComposer.createObjectTC({ name: typeName, fields: {} });
  const selection = selectionForPaths(paths);

  otc.setField('id', { type: new GraphQLNonNull(GraphQLID) });
  for (const path of paths) {
    if (path.name === '_id' || path.name === '__v' || path.name.includes('.')) continue;
    otc.setField(path.name, { type: mapPathToOutput(path) });
  }

  otc.setDirectives([
    { name: 'key', args: { fields: 'id' } },
    {
      name: 'mongo',
      args: {
        subgraph: subgraphName,
        collection,
        kind: 'FIND_ONE',
        where: blockArg('_id: $this.id'),
        selection,
      },
    },
  ]);

  createFilterSortAndInputs(schemaComposer, naming, typeName, paths);
  createConnectionTypes(schemaComposer, naming, typeName);
  createPayloadType(schemaComposer, naming, typeName);
}

function emitModelRootFields(
  schemaComposer: SchemaComposer,
  opts: {
    subgraphName: string;
    typeName: string;
    collection: string;
    paths: PathMeta[];
    naming: MongoNaming;
  },
) {
  const { subgraphName, typeName, collection, paths, naming } = opts;
  const selection = selectionForPaths(paths);
  const whereType = naming.whereInput(typeName);
  const orderByType = naming.orderByInput(typeName);
  const queryTC = schemaComposer.Query;
  const mutationTC = schemaComposer.Mutation;

  const mongo = (
    kind: string,
    extra: Record<string, unknown> = {},
  ): { name: string; args: Record<string, unknown> } => ({
    name: 'mongo',
    args: { subgraph: subgraphName, collection, kind, selection, ...extra },
  });

  queryTC.setField(naming.findByIdField(typeName), {
    type: typeName,
    args: { id: { type: new GraphQLNonNull(GraphQLID) } },
    directives: [mongo('FIND_ONE', { where: blockArg('_id: $args.id') })],
  });

  queryTC.setField(naming.findByIdsField(typeName), {
    type: `[${typeName}!]!`,
    args: {
      ids: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))) },
      limit: { type: GraphQLInt, defaultValue: 100 },
      orderBy: { type: orderByType },
    },
    directives: [
      mongo('FIND_MANY', {
        where: blockArg('_id: $args.ids'),
        limit: '$args.limit',
        orderBy: '$args.orderBy',
      }),
    ],
  });

  queryTC.setField(naming.findManyField(typeName), {
    type: `[${typeName}!]!`,
    args: {
      where: { type: whereType },
      limit: { type: GraphQLInt, defaultValue: 100 },
      skip: { type: GraphQLInt },
      orderBy: { type: orderByType },
    },
    directives: [
      mongo('FIND_MANY', {
        where: '$args.where',
        orderBy: '$args.orderBy',
        limit: '$args.limit',
        skip: '$args.skip',
      }),
    ],
  });

  queryTC.setField(naming.findOneField(typeName), {
    type: typeName,
    args: {
      where: { type: whereType },
      skip: { type: GraphQLInt },
      orderBy: { type: orderByType },
    },
    directives: [
      mongo('FIND_ONE', {
        where: '$args.where',
        orderBy: '$args.orderBy',
        skip: '$args.skip',
      }),
    ],
  });

  queryTC.setField(naming.countField(typeName), {
    type: new GraphQLNonNull(GraphQLInt),
    args: { where: { type: whereType } },
    directives: [mongo('COUNT', { where: '$args.where', selection: blockArg('$') })],
  });

  queryTC.setField(naming.aggregateField(typeName), {
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLJSON))),
    args: {
      where: { type: whereType },
      // JSON array of stages (`[{ $match }, { $group }, …]`) — `$` keys need variables.
      pipeline: { type: GraphQLJSON },
    },
    directives: [
      mongo('AGGREGATE', {
        where: '$args.where',
        pipeline: '$args.pipeline',
        selection: blockArg('$'),
      }),
    ],
  });

  queryTC.setField(naming.connectionField(typeName), {
    type: naming.connectionType(typeName),
    args: {
      where: { type: whereType },
      first: { type: GraphQLInt },
      after: { type: GraphQLString },
      orderBy: { type: orderByType },
    },
    directives: [
      mongo('CONNECTION', {
        where: '$args.where',
        orderBy: '$args.orderBy',
        first: '$args.first',
        after: '$args.after',
        selection: blockArg(`
nodes {
${indent(selectionForPaths(paths).replace(/^\n/, ''), 1)}
}
edges {
  cursor: $cursor
  node {
${indent(selectionForPaths(paths).replace(/^\n/, ''), 2)}
  }
}
pageInfo {
  hasNextPage: $hasNextPage
  hasPreviousPage: $hasPreviousPage
  startCursor: $startCursor
  endCursor: $endCursor
}
totalCount: $totalCount
`),
      }),
    ],
  });

  queryTC.setField(naming.paginationField(typeName), {
    type: naming.paginationType(typeName),
    args: {
      where: { type: whereType },
      page: { type: GraphQLInt },
      perPage: { type: GraphQLInt, defaultValue: 20 },
      orderBy: { type: orderByType },
    },
    directives: [
      mongo('PAGINATION', {
        where: '$args.where',
        orderBy: '$args.orderBy',
        page: '$args.page',
        perPage: '$args.perPage',
        selection: blockArg(`
count: $count
items {
${indent(selectionForPaths(paths).replace(/^\n/, ''), 1)}
}
pageInfo {
  currentPage: $currentPage
  perPage: $perPage
  pageCount: $pageCount
  itemCount: $itemCount
  hasNextPage: $hasNextPage
  hasPreviousPage: $hasPreviousPage
}
`),
      }),
    ],
  });

  const setBlock = blockArg(
    paths
      .filter(p => p.name !== '_id' && p.name !== '__v' && !p.name.includes('.'))
      .map(p => `${p.name}: $args.input.${p.name}`)
      .join('\n'),
  );
  const payloadSelection = blockArg(`
record {
${indent(selectionForPaths(paths).replace(/^\n/, ''), 1)}
}
recordId: $_id
`);

  mutationTC.setField(naming.createOneField(typeName), {
    type: naming.payloadType(typeName),
    args: { input: { type: `${naming.createInput(typeName)}!` } },
    directives: [mongo('INSERT_ONE', { set: setBlock, selection: payloadSelection })],
  });

  mutationTC.setField(naming.createManyField(typeName), {
    type: naming.payloadType(typeName),
    args: { inputs: { type: `[${naming.createInput(typeName)}!]!` } },
    directives: [
      mongo('INSERT_MANY', {
        set: blockArg('inputs: $args.inputs'),
        selection: blockArg(`
records {
${indent(selectionForPaths(paths).replace(/^\n/, ''), 1)}
}
recordIds: $recordIds
createdCount: $createdCount
`),
      }),
    ],
  });

  mutationTC.setField(naming.updateByIdField(typeName), {
    type: naming.payloadType(typeName),
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      input: { type: `${naming.updateInput(typeName)}!` },
    },
    directives: [
      mongo('UPDATE_ONE', {
        where: blockArg('_id: $args.id'),
        set: setBlock,
        selection: payloadSelection,
      }),
    ],
  });

  mutationTC.setField(naming.updateOneField(typeName), {
    type: naming.payloadType(typeName),
    args: {
      where: { type: whereType },
      input: { type: `${naming.updateInput(typeName)}!` },
    },
    directives: [
      mongo('UPDATE_ONE', {
        where: '$args.where',
        set: setBlock,
        selection: payloadSelection,
      }),
    ],
  });

  mutationTC.setField(naming.updateManyField(typeName), {
    type: naming.payloadType(typeName),
    args: {
      where: { type: whereType },
      input: { type: `${naming.updateInput(typeName)}!` },
    },
    directives: [
      mongo('UPDATE_MANY', {
        where: '$args.where',
        set: setBlock,
        selection: blockArg(`
modifiedCount: $modifiedCount
matchedCount: $matchedCount
`),
      }),
    ],
  });

  mutationTC.setField(naming.removeByIdField(typeName), {
    type: naming.payloadType(typeName),
    args: { id: { type: new GraphQLNonNull(GraphQLID) } },
    directives: [
      mongo('DELETE_ONE', {
        where: blockArg('_id: $args.id'),
        selection: payloadSelection,
      }),
    ],
  });

  mutationTC.setField(naming.removeOneField(typeName), {
    type: naming.payloadType(typeName),
    args: { where: { type: whereType } },
    directives: [
      mongo('DELETE_ONE', {
        where: '$args.where',
        selection: payloadSelection,
      }),
    ],
  });

  mutationTC.setField(naming.removeManyField(typeName), {
    type: naming.payloadType(typeName),
    args: { where: { type: `${whereType}!` } },
    directives: [
      mongo('DELETE_MANY', {
        where: '$args.where',
        selection: blockArg('deletedCount: $deletedCount'),
      }),
    ],
  });
}

function emitRefFields(
  schemaComposer: SchemaComposer,
  opts: {
    subgraphName: string;
    typeName: string;
    schema: MongooseSchema;
    naming: MongoNaming;
    knownTypes: Set<string>;
    collectionsByType: Map<string, string>;
  },
) {
  const paths = introspectPaths(opts.schema);
  const otc = schemaComposer.getOTC(opts.typeName);
  for (const path of paths) {
    if (!path.ref || !opts.knownTypes.has(path.ref)) continue;
    const refCollection = opts.collectionsByType.get(path.ref);
    if (!refCollection) continue;
    const refPaths = introspectPaths(
      // best-effort: empty selection of id only if we cannot re-introspect
      opts.schema,
    );
    void refPaths;
    const fieldName = path.isArray
      ? pluralizeFallback(path.ref)
      : path.ref[0].toLowerCase() + path.ref.slice(1);
    // Prefer path name without Id suffix when present (authorId -> author)
    const pretty =
      path.name.endsWith('Id') || path.name.endsWith('Ids')
        ? path.name.replace(/Ids?$/, '')
        : path.name + 'Doc';
    const finalName = otc.hasField(pretty) ? fieldName : pretty;
    if (otc.hasField(finalName) && finalName !== path.name) {
      // already set
    }
    const refSelection = blockArg('id: _id');
    if (path.isArray) {
      otc.setField(finalName, {
        type: `[${path.ref}!]!`,
        directives: [
          {
            name: 'mongo',
            args: {
              subgraph: opts.subgraphName,
              collection: refCollection,
              kind: 'FIND_MANY',
              where: blockArg(`_id: $this.${path.name}`),
              selection: refSelection,
            },
          },
        ],
      });
    } else {
      otc.setField(finalName, {
        type: path.ref,
        directives: [
          {
            name: 'mongo',
            args: {
              subgraph: opts.subgraphName,
              collection: refCollection,
              kind: 'FIND_ONE',
              where: blockArg(`_id: $this.${path.name}`),
              selection: refSelection,
            },
          },
        ],
      });
    }
  }
}

function mapPathToOutput(path: PathMeta) {
  if (path.enumValues?.length) {
    return path.isArray ? new GraphQLList(GraphQLString) : GraphQLString;
  }
  if (path.ref) {
    const idType = GraphQLID;
    return path.isArray ? new GraphQLList(idType) : idType;
  }
  if (path.isArray && path.instance !== 'Array') {
    return new GraphQLList(mapMongoPathToGraphQL(path.instance));
  }
  return mapMongoPathToGraphQL(path.instance, { asId: path.name === '_id' });
}

function createFilterSortAndInputs(
  schemaComposer: SchemaComposer,
  naming: MongoNaming,
  typeName: string,
  paths: PathMeta[],
) {
  const whereName = naming.whereInput(typeName);
  if (!schemaComposer.has(whereName)) {
    schemaComposer.createInputTC({
      name: whereName,
      fields: {
        AND: { type: `[${whereName}!]` },
        OR: { type: `[${whereName}!]` },
        NOT: { type: whereName },
        id: { type: 'IDFilter' },
        ...Object.fromEntries(
          paths
            .filter(p => p.name !== '_id' && p.name !== '__v' && !p.name.includes('.'))
            .map(p => {
              let filterType = 'StringFilter';
              if (p.instance === 'Number') filterType = 'FloatFilter';
              else if (p.instance === 'Decimal128') filterType = 'Decimal128Filter';
              else if (p.instance === 'Boolean') filterType = 'BooleanFilter';
              else if (p.instance === 'Date') filterType = 'DateTimeFilter';
              else if (p.ref || p.instance === 'ObjectID' || p.instance === 'ObjectId')
                filterType = 'IDFilter';
              return [p.name, { type: filterType }];
            }),
        ),
      },
    });
  }

  const orderByName = naming.orderByInput(typeName);
  if (!schemaComposer.has(orderByName)) {
    if (!schemaComposer.has('SortDirection')) {
      schemaComposer.createEnumTC({
        name: 'SortDirection',
        values: { ASC: { value: 'ASC' }, DESC: { value: 'DESC' } },
      });
    }
    schemaComposer.createInputTC({
      name: orderByName,
      fields: {
        id: 'SortDirection',
        ...Object.fromEntries(
          paths
            .filter(p => p.name !== '_id' && p.name !== '__v' && !p.name.includes('.'))
            .map(p => [p.name, { type: 'SortDirection' }]),
        ),
      },
    });
  }

  const createFields: Record<string, any> = {};
  const updateFields: Record<string, any> = {};
  for (const path of paths) {
    if (path.name === '_id' || path.name === '__v' || path.name.includes('.')) continue;
    const gqlType = mapPathToOutput(path);
    createFields[path.name] = { type: gqlType };
    updateFields[path.name] = { type: gqlType };
  }
  if (!schemaComposer.has(naming.createInput(typeName))) {
    schemaComposer.createInputTC({ name: naming.createInput(typeName), fields: createFields });
  }
  if (!schemaComposer.has(naming.updateInput(typeName))) {
    schemaComposer.createInputTC({ name: naming.updateInput(typeName), fields: updateFields });
  }
}

function createConnectionTypes(
  schemaComposer: SchemaComposer,
  naming: MongoNaming,
  typeName: string,
) {
  if (!schemaComposer.has(naming.edgeType(typeName))) {
    schemaComposer.createObjectTC({
      name: naming.edgeType(typeName),
      fields: { cursor: 'String!', node: `${typeName}!` },
    });
  }
  if (!schemaComposer.has(naming.connectionType(typeName))) {
    schemaComposer.createObjectTC({
      name: naming.connectionType(typeName),
      fields: {
        edges: `[${naming.edgeType(typeName)}!]!`,
        nodes: `[${typeName}!]!`,
        pageInfo: 'PageInfo!',
        totalCount: 'Int!',
      },
    });
  }
  if (!schemaComposer.has(naming.paginationType(typeName))) {
    schemaComposer.createObjectTC({
      name: naming.paginationType(typeName),
      fields: {
        count: 'Int',
        items: `[${typeName}]`,
        pageInfo: 'PaginationInfo',
      },
    });
  }
}

function createPayloadType(schemaComposer: SchemaComposer, naming: MongoNaming, typeName: string) {
  if (!schemaComposer.has(naming.payloadType(typeName))) {
    schemaComposer.createObjectTC({
      name: naming.payloadType(typeName),
      fields: {
        record: typeName,
        recordId: GraphQLID,
        records: `[${typeName}!]`,
        recordIds: '[ID!]',
        createdCount: GraphQLInt,
        modifiedCount: GraphQLInt,
        matchedCount: GraphQLInt,
        deletedCount: GraphQLInt,
        /**
         * v0 graphql-compose-mongoose parity: if the client selects `error`,
         * operation failures are returned here instead of GraphQL `errors`.
         */
        error: 'MongoError',
      },
    });
  }
}

function ensureErrorInterface(schemaComposer: SchemaComposer) {
  if (!schemaComposer.has('ErrorInterface')) {
    schemaComposer.createInterfaceTC({
      name: 'ErrorInterface',
      fields: {
        message: 'String',
      },
      resolveType: () => 'MongoError',
    });
  }
  if (!schemaComposer.has('MongoError')) {
    schemaComposer.createObjectTC({
      name: 'MongoError',
      interfaces: ['ErrorInterface'],
      fields: {
        message: 'String',
        code: 'String',
      },
    });
  }
}

function ensurePageInfo(schemaComposer: SchemaComposer) {
  if (!schemaComposer.has('PageInfo')) {
    schemaComposer.createObjectTC({
      name: 'PageInfo',
      fields: {
        hasNextPage: 'Boolean!',
        hasPreviousPage: 'Boolean!',
        startCursor: 'String',
        endCursor: 'String',
      },
    });
  }
  if (!schemaComposer.has('PaginationInfo')) {
    schemaComposer.createObjectTC({
      name: 'PaginationInfo',
      fields: {
        currentPage: 'Int!',
        perPage: 'Int!',
        pageCount: 'Int',
        itemCount: 'Int',
        hasNextPage: 'Boolean',
        hasPreviousPage: 'Boolean',
      },
    });
  }
}

function ensureSharedFilterInputs(schemaComposer: SchemaComposer) {
  if (!schemaComposer.has('IDFilter')) {
    schemaComposer.createInputTC({
      name: 'IDFilter',
      fields: {
        eq: GraphQLID,
        ne: GraphQLID,
        in: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
        nin: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
        exists: 'Boolean',
      },
    });
  }
  if (!schemaComposer.has('StringFilter')) {
    schemaComposer.createInputTC({
      name: 'StringFilter',
      fields: {
        eq: GraphQLString,
        ne: GraphQLString,
        in: { type: '[String!]' },
        nin: { type: '[String!]' },
        regex: GraphQLString,
        exists: 'Boolean',
      },
    });
  }
  if (!schemaComposer.has('FloatFilter')) {
    schemaComposer.createInputTC({
      name: 'FloatFilter',
      fields: {
        eq: GraphQLFloat,
        ne: GraphQLFloat,
        in: { type: '[Float!]' },
        nin: { type: '[Float!]' },
        gt: GraphQLFloat,
        gte: GraphQLFloat,
        lt: GraphQLFloat,
        lte: GraphQLFloat,
        exists: 'Boolean',
      },
    });
  }
  if (!schemaComposer.has('Decimal128Filter')) {
    schemaComposer.createInputTC({
      name: 'Decimal128Filter',
      fields: {
        eq: GraphQLDecimal128,
        ne: GraphQLDecimal128,
        in: { type: '[Decimal128!]' },
        nin: { type: '[Decimal128!]' },
        gt: GraphQLDecimal128,
        gte: GraphQLDecimal128,
        lt: GraphQLDecimal128,
        lte: GraphQLDecimal128,
        exists: 'Boolean',
      },
    });
  }
  if (!schemaComposer.has('BooleanFilter')) {
    schemaComposer.createInputTC({
      name: 'BooleanFilter',
      fields: { eq: 'Boolean', ne: 'Boolean', exists: 'Boolean' },
    });
  }
  if (!schemaComposer.has('DateTimeFilter')) {
    schemaComposer.createInputTC({
      name: 'DateTimeFilter',
      fields: {
        eq: 'DateTime',
        ne: 'DateTime',
        in: { type: '[DateTime!]' },
        nin: { type: '[DateTime!]' },
        gt: 'DateTime',
        gte: 'DateTime',
        lt: 'DateTime',
        lte: 'DateTime',
        exists: 'Boolean',
      },
    });
  }
}

function markMongoDirectiveStringsAsBlocks(schema: GraphQLSchema): void {
  const markNode = (astNode: { directives?: readonly any[] } | null | undefined) => {
    const directives = astNode?.directives;
    if (!directives) return;
    for (const directive of directives) {
      if (directive.name.value !== 'mongo' || !directive.arguments) continue;
      for (const arg of directive.arguments) {
        if (arg.value.kind !== 'StringValue') continue;
        if (
          arg.name.value !== 'where' &&
          arg.name.value !== 'orderBy' &&
          arg.name.value !== 'set' &&
          arg.name.value !== 'selection' &&
          arg.name.value !== 'pipeline'
        ) {
          continue;
        }
        if (isBareBinder(arg.value.value)) continue;
        (arg.value as { block?: boolean }).block = true;
      }
    }
  };
  for (const type of Object.values(schema.getTypeMap())) {
    if (!(type instanceof GraphQLObjectType)) continue;
    markNode(type.astNode);
    for (const field of Object.values(type.getFields())) {
      markNode(field.astNode);
    }
  }
}

function isBareBinder(value: string): boolean {
  const trimmed = value.trim();
  if (
    !trimmed.startsWith('$') ||
    trimmed.includes('\n') ||
    trimmed.includes(':') ||
    trimmed.includes(' ')
  ) {
    return false;
  }
  if (trimmed.includes('...')) return false;
  const segments = trimmed.slice(1).split('.');
  if (!segments.length || segments.some(s => !s)) return false;
  for (const seg of segments) {
    const c0 = seg.charCodeAt(0);
    const okStart = (c0 >= 65 && c0 <= 90) || (c0 >= 97 && c0 <= 122) || c0 === 95;
    if (!okStart) return false;
    for (let i = 1; i < seg.length; i++) {
      const c = seg.charCodeAt(i);
      const ok = (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 95;
      if (!ok) return false;
    }
  }
  return true;
}

function blockArg(body: string): string {
  const trimmed = body.replace(/^\n+|\n+$/g, '');
  const indented = trimmed
    .split('\n')
    .map(line => (line.length ? `  ${line}` : line))
    .join('\n');
  return indented.includes('\n') ? indented : `\n${indented}`;
}

function indent(body: string, levels: number): string {
  const pad = '  '.repeat(levels);
  return body
    .split('\n')
    .map(line => (line.length ? pad + line : line))
    .join('\n');
}

function pluralizeFallback(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('s')) return lower;
  return `${lower}s`;
}
