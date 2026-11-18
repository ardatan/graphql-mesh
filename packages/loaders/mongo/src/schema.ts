import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  type GraphQLSchema,
} from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import { GraphQLJSON } from 'graphql-scalars';
import type { Model, Schema as MongooseSchema } from 'mongoose';
import { process as meshProcess } from '@graphql-mesh/cross-helpers';
import type { ImportFn } from '@graphql-mesh/types';
import { GraphQLMongoID } from '@graphql-mesh/transport-mongo';
import { defaultImportFn, loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { MongoDirective, MongoKindEnum, TransportDirective } from './directives.js';
import { createDefaultNaming, type MongoNaming } from './naming.js';
import { mapMongoPathToGraphQL } from './type-map.js';

const FEDERATION_LINK_URL = 'https://specs.apollo.dev/federation/v2.6';

export interface MongoModelConfig {
  name: string;
  /** Module path like `./models#User` (compose-time only). */
  path?: string;
  /** Inline mongoose Model (tests / programmatic). */
  model?: Model<any>;
  /** Inline mongoose Schema when model is not provided. */
  schema?: MongooseSchema;
  /** Override collection name. */
  collection?: string;
}

export interface LoadMongoSubgraphOpts {
  endpoint: string;
  models: MongoModelConfig[];
  cwd?: string;
  naming?: Partial<MongoNaming>;
  /** Module loader for `models[].path` (legacy handler passes Mesh `importFn`). */
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

  schemaComposer.add(GraphQLMongoID);
  schemaComposer.add(GraphQLJSON);
  schemaComposer.addDirective(TransportDirective);
  schemaComposer.addDirective(MongoDirective);
  schemaComposer.add(MongoKindEnum);

  ensureSharedWhereInputs(schemaComposer);

  for (const modelConfig of opts.models) {
    const model = await resolveModel(modelConfig, cwd, importFn);
    const collection =
      modelConfig.collection ||
      (model as any).collection?.collectionName ||
      model.schema?.get('collection') ||
      pluralizeFallback(modelConfig.name);
    const typeName = naming.typeName(modelConfig.name);
    emitModelTypes(schemaComposer, {
      subgraphName,
      typeName,
      collection,
      schema: model.schema,
      naming,
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
    // Minimal stand-in: callers that only pass schema still need a model-shaped object.
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

function emitModelTypes(
  schemaComposer: SchemaComposer,
  opts: {
    subgraphName: string;
    typeName: string;
    collection: string;
    schema: MongooseSchema;
    naming: MongoNaming;
  },
) {
  const { subgraphName, typeName, collection, schema, naming } = opts;
  const paths = introspectPaths(schema);

  const otc = schemaComposer.createObjectTC({
    name: typeName,
    fields: {},
  });

  const selectionLines: string[] = ['id: _id'];
  otc.setField('id', { type: new GraphQLNonNull(GraphQLMongoID) });

  for (const path of paths) {
    if (path.name === '_id' || path.name === '__v') continue;
    // Skip deeply nested path keys that are covered by parent object fields.
    if (path.name.includes('.')) continue;
    const gqlType = mapPathToOutput(path);
    otc.setField(path.name, { type: gqlType });
    selectionLines.push(`${path.name}: ${path.name}`);
  }

  const selection = blockArg(selectionLines.join('\n'));

  otc.setDirectives([
    {
      name: 'key',
      args: { fields: 'id' },
    },
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

  createWhereAndSort(schemaComposer, naming, typeName, paths);

  const queryTC = schemaComposer.Query;
  queryTC.setField(naming.findByIdField(typeName), {
    type: typeName,
    args: {
      _id: { type: new GraphQLNonNull(GraphQLMongoID) },
    },
    directives: [
      {
        name: 'mongo',
        args: {
          subgraph: subgraphName,
          collection,
          kind: 'FIND_ONE',
          where: blockArg('_id: $args._id'),
          selection,
        },
      },
    ],
  });

  queryTC.setField(naming.findManyField(typeName), {
    type: `[${typeName}!]!`,
    args: {
      where: { type: naming.whereInput(typeName) },
      limit: { type: GraphQLInt, defaultValue: 100 },
      skip: { type: GraphQLInt },
      sort: { type: naming.sortInput(typeName) },
    },
    directives: [
      {
        name: 'mongo',
        args: {
          subgraph: subgraphName,
          collection,
          kind: 'FIND_MANY',
          where: '$args.where',
          sort: '$args.sort',
          limit: '$args.limit',
          skip: '$args.skip',
          selection,
        },
      },
    ],
  });

  queryTC.setField(naming.findOneField(typeName), {
    type: typeName,
    args: {
      where: { type: naming.whereInput(typeName) },
      skip: { type: GraphQLInt },
      sort: { type: naming.sortInput(typeName) },
    },
    directives: [
      {
        name: 'mongo',
        args: {
          subgraph: subgraphName,
          collection,
          kind: 'FIND_ONE',
          where: '$args.where',
          sort: '$args.sort',
          skip: '$args.skip',
          selection,
        },
      },
    ],
  });

  queryTC.setField(naming.countField(typeName), {
    type: new GraphQLNonNull(GraphQLInt),
    args: {
      where: { type: naming.whereInput(typeName) },
    },
    directives: [
      {
        name: 'mongo',
        args: {
          subgraph: subgraphName,
          collection,
          kind: 'COUNT',
          where: '$args.where',
          selection: blockArg('$'),
        },
      },
    ],
  });
}

interface PathMeta {
  name: string;
  instance: string;
  isArray?: boolean;
  enumValues?: string[];
}

function introspectPaths(schema: MongooseSchema): PathMeta[] {
  const out: PathMeta[] = [];
  const paths = (schema as any).paths || {};
  for (const [name, schemaType] of Object.entries(paths) as [string, any][]) {
    const instance = schemaType.instance || schemaType.constructor?.name || 'Mixed';
    const enumValues = schemaType.enumValues || schemaType.options?.enum;
    out.push({
      name,
      instance: String(instance),
      isArray: instance === 'Array' || Array.isArray(schemaType.options?.type),
      enumValues: Array.isArray(enumValues) ? enumValues.map(String) : undefined,
    });
  }
  return out;
}

function mapPathToOutput(path: PathMeta) {
  if (path.enumValues?.length) {
    // Enums: first slice emits String; loader can grow Enum types later.
    return path.isArray ? new GraphQLList(GraphQLString) : GraphQLString;
  }
  if (path.isArray && path.instance !== 'Array') {
    return new GraphQLList(mapMongoPathToGraphQL(path.instance));
  }
  return mapMongoPathToGraphQL(path.instance, { asId: path.name === '_id' });
}

function createWhereAndSort(
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
        id: { type: 'MongoIDWhere' },
        ...Object.fromEntries(
          paths
            .filter(p => p.name !== '_id' && p.name !== '__v' && !p.name.includes('.'))
            .map(p => {
              const whereType =
                p.instance === 'Number' || p.instance === 'Decimal128'
                  ? 'FloatWhere'
                  : p.instance === 'Boolean'
                    ? 'BooleanWhere'
                    : 'StringWhere';
              return [p.name, { type: whereType }];
            }),
        ),
      },
    });
  }

  const sortName = naming.sortInput(typeName);
  if (!schemaComposer.has(sortName)) {
    if (!schemaComposer.has('SortDirection')) {
      schemaComposer.createEnumTC({
        name: 'SortDirection',
        values: {
          ASC: { value: 'ASC' },
          DESC: { value: 'DESC' },
        },
      });
    }
    schemaComposer.createInputTC({
      name: sortName,
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
}

function ensureSharedWhereInputs(schemaComposer: SchemaComposer) {
  if (!schemaComposer.has('MongoIDWhere')) {
    schemaComposer.createInputTC({
      name: 'MongoIDWhere',
      fields: {
        eq: GraphQLMongoID,
        ne: GraphQLMongoID,
        in: { type: new GraphQLList(new GraphQLNonNull(GraphQLMongoID)) },
        nin: { type: new GraphQLList(new GraphQLNonNull(GraphQLMongoID)) },
        exists: 'Boolean',
      },
    });
  }
  if (!schemaComposer.has('StringWhere')) {
    schemaComposer.createInputTC({
      name: 'StringWhere',
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
  if (!schemaComposer.has('FloatWhere')) {
    schemaComposer.createInputTC({
      name: 'FloatWhere',
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
  if (!schemaComposer.has('BooleanWhere')) {
    schemaComposer.createInputTC({
      name: 'BooleanWhere',
      fields: {
        eq: 'Boolean',
        ne: 'Boolean',
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
      const ok =
        (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 95;
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

function pluralizeFallback(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('s')) return lower;
  return `${lower}s`;
}
