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
import { GraphQLDateTime, GraphQLJSON, GraphQLObjectID } from 'graphql-scalars';
import type { Model, Schema as MongooseSchema } from 'mongoose';
import { process as meshProcess } from '@graphql-mesh/cross-helpers';
import type { ImportFn } from '@graphql-mesh/types';
import { defaultImportFn, loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { MongoOpDirectives, TransportDirective } from './directives.js';
import { createDefaultNaming, type MongoNaming } from './naming.js';
import { GraphQLDecimal128 } from './scalars.js';
import { mapMongoPathToGraphQL } from './type-map.js';

const FEDERATION_LINK_URL = 'https://specs.apollo.dev/federation/v2.6';

export interface MongoFieldRestrictions {
  only?: string[];
  remove?: string[];
  required?: string[];
}

export interface MongoModelConfig {
  name: string;
  path?: string;
  model?: Model<any>;
  schema?: MongooseSchema;
  collection?: string;
  /** Optional compose-style field restrictions (legacy mongoose handler `options.fields`). */
  options?: {
    fields?: MongoFieldRestrictions;
    /** Legacy compose resolver toggles; `false` omits the matching root field. */
    resolvers?: {
      removeMany?: boolean | Record<string, unknown>;
      removeOne?: boolean | Record<string, unknown>;
      removeById?: boolean | Record<string, unknown>;
      createOne?: boolean | Record<string, unknown>;
      createMany?: boolean | Record<string, unknown>;
      updateOne?: boolean | Record<string, unknown>;
      updateById?: boolean | Record<string, unknown>;
      updateMany?: boolean | Record<string, unknown>;
    };
  };
}

function resolverEnabled(
  resolvers: MongoModelConfig['options'] extends infer O
    ? O extends { resolvers?: infer R }
      ? R
      : undefined
    : undefined,
  key: keyof NonNullable<NonNullable<MongoModelConfig['options']>['resolvers']>,
): boolean {
  if (!resolvers) return true;
  const flag = resolvers[key];
  return flag !== false;
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
  for (const directive of MongoOpDirectives) {
    schemaComposer.addDirective(directive);
  }

  ensureSharedQueryOperatorInputs(schemaComposer);
  ensurePageInfo(schemaComposer);
  ensureErrorInterface(schemaComposer);

  const modelMeta: Array<{
    typeName: string;
    collection: string;
    schema: MongooseSchema;
    paths: PathMeta[];
    resolvers?: NonNullable<MongoModelConfig['options']>['resolvers'];
    fieldRestrictions?: MongoFieldRestrictions;
  }> = [];

  for (const modelConfig of opts.models) {
    const model = await resolveModel(modelConfig, cwd, importFn);
    const collection =
      modelConfig.collection ||
      (model as any).collection?.collectionName ||
      model.schema?.get('collection') ||
      pluralizeFallback(modelConfig.name);
    const typeName = naming.typeName(modelConfig.name);
    const fieldRestrictions = modelConfig.options?.fields;
    const paths = applyFieldRestrictions(
      introspectPaths(model.schema, typeName),
      fieldRestrictions,
    );
    modelMeta.push({
      typeName,
      collection,
      schema: model.schema,
      paths,
      resolvers: modelConfig.options?.resolvers,
      fieldRestrictions,
    });
    emitModelObjectType(schemaComposer, {
      subgraphName,
      typeName,
      collection,
      paths,
      naming,
      fieldRestrictions,
    });
  }

  const pathsByType = new Map(modelMeta.map(m => [m.typeName, m.paths]));
  for (const meta of modelMeta) {
    emitModelRootFields(schemaComposer, {
      subgraphName,
      typeName: meta.typeName,
      collection: meta.collection,
      paths: meta.paths,
      naming,
      resolvers: meta.resolvers,
      fieldRestrictions: meta.fieldRestrictions,
    });
    emitRefFields(schemaComposer, {
      subgraphName,
      typeName: meta.typeName,
      paths: meta.paths,
      naming,
      knownTypes: new Set(modelMeta.map(m => m.typeName)),
      collectionsByType: new Map(modelMeta.map(m => [m.typeName, m.collection])),
      pathsByType,
    });
  }

  const schema = schemaComposer.buildSchema();
  const extensions: Record<string, any> = (schema.extensions ||= {});
  extensions.directives ||= {};
  const objectIdFields = collectObjectIdFieldNames(modelMeta.map(m => m.paths));
  extensions.directives.transport = {
    subgraph: subgraphName,
    kind: 'mongo',
    location: opts.endpoint,
    options: objectIdFields.length ? { objectIdFields } : undefined,
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
    const collectionName =
      config.collection ||
      (typeof config.schema.get === 'function' ? config.schema.get('collection') : undefined) ||
      pluralizeFallback(config.name);
    return {
      schema: config.schema,
      collection: { collectionName },
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
  /** Primitive array element BSON/Mongoose instance (String, Number, …). */
  arrayElementInstance?: string;
  enumValues?: string[];
  /** GraphQL enum type name, e.g. EnumUserGender / EnumUserLanguagesSkill. */
  enumName?: string;
  ref?: string;
  description?: string;
  /** Nested object / document-array element fields. */
  nested?: PathMeta[];
  /** GraphQL object type for nested / grouped paths, e.g. UserAddress. */
  nestedTypeName?: string;
  /** Nested schema equals an ancestor — GraphQL type is that ancestor (`nestedTypeName`). */
  selfRef?: boolean;
}

function collectObjectIdFieldNames(pathLists: PathMeta[][]): string[] {
  const out = new Set<string>();
  const walk = (paths: PathMeta[]) => {
    for (const path of paths) {
      if (path.name === '_id' || path.name === 'id') continue;
      if (
        path.ref ||
        path.instance === 'ObjectID' ||
        path.instance === 'ObjectId' ||
        path.arrayElementInstance === 'ObjectID' ||
        path.arrayElementInstance === 'ObjectId'
      ) {
        out.add(path.name);
      }
      if (path.nested?.length) walk(path.nested);
    }
  };
  for (const paths of pathLists) walk(paths);
  return [...out];
}

function applyFieldRestrictions(paths: PathMeta[], fields?: MongoFieldRestrictions): PathMeta[] {
  if (!fields) return paths;
  let out = paths;
  if (fields.only?.length) {
    const only = new Set(fields.only);
    out = out.filter(p => only.has(p.name));
  }
  if (fields.remove?.length) {
    const remove = new Set(fields.remove);
    out = out.filter(p => !remove.has(p.name));
  }
  return out;
}

type SchemaAncestor = { schema: object; typeName: string };

function introspectPaths(schema: MongooseSchema, typeName: string): PathMeta[] {
  const root = schema as any;
  const ancestors: SchemaAncestor[] = root ? [{ schema: root, typeName }] : [];
  return collectPaths(root, typeName, [], ancestors);
}

function collectPaths(
  schema: any,
  rootTypeName: string,
  nameStack: string[],
  ancestors: SchemaAncestor[],
): PathMeta[] {
  const pathsObj = (schema?.paths || {}) as Record<string, any>;
  const direct = new Map<string, any>();
  const dottedGroups = new Map<string, Map<string, any>>();

  for (const [name, schemaType] of Object.entries(pathsObj)) {
    if (name === '__v') continue;
    // Top-level `_id` is exposed as GraphQL `id`; nested `_id` (e.g. address) stays.
    if (nameStack.length === 0 && name === '_id') continue;
    if (name.includes('.')) {
      const dot = name.indexOf('.');
      const head = name.slice(0, dot);
      const tail = name.slice(dot + 1);
      if (!dottedGroups.has(head)) dottedGroups.set(head, new Map());
      dottedGroups.get(head)!.set(tail, schemaType);
      continue;
    }
    direct.set(name, schemaType);
  }

  const out: PathMeta[] = [];
  for (const [name, schemaType] of direct) {
    out.push(toPathMeta(name, schemaType, rootTypeName, [...nameStack, name], ancestors));
  }
  for (const [groupName, tails] of dottedGroups) {
    if (direct.has(groupName)) continue;
    const nestedStack = [...nameStack, groupName];
    const parentPrefix = `${rootTypeName}${nameStack.map(pascalCase).join('')}`;
    out.push({
      name: groupName,
      instance: 'Embedded',
      nestedTypeName: `${parentPrefix}${pascalCase(groupName)}`,
      nested: pathsFromDottedTails(tails, rootTypeName, nestedStack, ancestors),
    });
  }
  return out;
}

function pathsFromDottedTails(
  tails: Map<string, any>,
  rootTypeName: string,
  nameStack: string[],
  ancestors: SchemaAncestor[],
): PathMeta[] {
  const direct = new Map<string, any>();
  const groups = new Map<string, Map<string, any>>();
  for (const [tail, schemaType] of tails) {
    if (tail.includes('.')) {
      const dot = tail.indexOf('.');
      const head = tail.slice(0, dot);
      const rest = tail.slice(dot + 1);
      if (!groups.has(head)) groups.set(head, new Map());
      groups.get(head)!.set(rest, schemaType);
      continue;
    }
    direct.set(tail, schemaType);
  }
  const out: PathMeta[] = [];
  for (const [name, schemaType] of direct) {
    out.push(toPathMeta(name, schemaType, rootTypeName, [...nameStack, name], ancestors));
  }
  for (const [groupName, sub] of groups) {
    const nestedStack = [...nameStack, groupName];
    const parentPrefix = `${rootTypeName}${nameStack.map(pascalCase).join('')}`;
    out.push({
      name: groupName,
      instance: 'Embedded',
      nestedTypeName: `${parentPrefix}${pascalCase(groupName)}`,
      nested: pathsFromDottedTails(sub, rootTypeName, nestedStack, ancestors),
    });
  }
  return out;
}

function toPathMeta(
  name: string,
  schemaType: any,
  rootTypeName: string,
  nameStack: string[],
  ancestors: SchemaAncestor[],
): PathMeta {
  const description = schemaType.options?.description
    ? String(schemaType.options.description)
    : undefined;
  const parentPrefix = `${rootTypeName}${nameStack.slice(0, -1).map(pascalCase).join('')}`;
  const nestedTypeName = `${parentPrefix}${pascalCase(name)}`;
  const enumName = `Enum${rootTypeName}${nameStack.map(pascalCase).join('')}`;

  if (isEmbedded(schemaType)) {
    // Ancestor stack distinguishes true recursion from sibling reuse of one child schema.
    const hit = schemaType.schema && ancestors.find(a => a.schema === schemaType.schema);
    if (hit) {
      return {
        name,
        instance: 'Embedded',
        description,
        nestedTypeName: hit.typeName,
        selfRef: true,
      };
    }
    const nextAncestors =
      schemaType.schema && typeof schemaType.schema === 'object'
        ? [...ancestors, { schema: schemaType.schema, typeName: nestedTypeName }]
        : ancestors;
    return {
      name,
      instance: 'Embedded',
      description,
      nestedTypeName,
      nested: collectPaths(schemaType.schema, rootTypeName, nameStack, nextAncestors),
    };
  }

  if (isDocumentArray(schemaType)) {
    const hit = schemaType.schema && ancestors.find(a => a.schema === schemaType.schema);
    if (hit) {
      return {
        name,
        instance: 'Array',
        isArray: true,
        description,
        nestedTypeName: hit.typeName,
        selfRef: true,
      };
    }
    const nextAncestors =
      schemaType.schema && typeof schemaType.schema === 'object'
        ? [...ancestors, { schema: schemaType.schema, typeName: nestedTypeName }]
        : ancestors;
    return {
      name,
      instance: 'Array',
      isArray: true,
      description,
      nestedTypeName,
      nested: collectPaths(schemaType.schema, rootTypeName, nameStack, nextAncestors),
    };
  }

  if (isPrimitiveArray(schemaType)) {
    const el = schemaType.embeddedSchemaType || schemaType.caster;
    const elInstance = el?.instance || 'Mixed';
    const enumRaw = el?.enumValues || el?.options?.enum;
    const enumValues = Array.isArray(enumRaw) && enumRaw.length ? enumRaw.map(String) : undefined;
    const ref =
      schemaType.options?.ref || el?.options?.ref || schemaType.caster?.options?.ref || undefined;
    return {
      name,
      instance: 'Array',
      isArray: true,
      arrayElementInstance: String(elInstance),
      enumValues,
      enumName: enumValues ? enumName : undefined,
      ref: ref ? String(ref) : undefined,
      description,
    };
  }

  const instance = schemaType.instance || schemaType.constructor?.name || 'Mixed';
  const enumRaw = schemaType.enumValues || schemaType.options?.enum;
  const enumValues = Array.isArray(enumRaw) && enumRaw.length ? enumRaw.map(String) : undefined;
  const ref =
    schemaType.options?.ref ||
    schemaType.caster?.options?.ref ||
    schemaType.embeddedSchemaType?.options?.ref ||
    schemaType.schema?.options?.ref;
  return {
    name,
    instance: String(instance),
    isArray: false,
    enumValues,
    enumName: enumValues ? enumName : undefined,
    ref: ref ? String(ref) : undefined,
    description,
  };
}

function isEmbedded(schemaType: any): boolean {
  return !!(
    schemaType?.schema &&
    (schemaType.instance === 'Embedded' ||
      schemaType.constructor?.name === 'SchemaSubdocument' ||
      schemaType.schemaName === 'Subdocument' ||
      schemaType.schemaName === 'Embedded')
  );
}

function isDocumentArray(schemaType: any): boolean {
  return !!(
    schemaType?.schema &&
    (schemaType.schemaName === 'DocumentArray' ||
      schemaType.constructor?.name === 'SchemaDocumentArray')
  );
}

function isPrimitiveArray(schemaType: any): boolean {
  if (schemaType?.schema) return false;
  return (
    schemaType?.instance === 'Array' ||
    schemaType?.schemaName === 'Array' ||
    schemaType?.constructor?.name === 'SchemaArray' ||
    Array.isArray(schemaType?.options?.type)
  );
}

function pascalCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
    .replace(/[^A-Za-z0-9]/g, '');
}

function selectionForPaths(paths: PathMeta[]): string {
  const lines = ['id: _id'];
  for (const path of paths) {
    if (path.name === '_id' || path.name === '__v') continue;
    // Nested subdocs / document arrays / grouped dotted objects pass through as a whole
    // column so GraphQL default field resolution reads matching keys on the sub-object.
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
    fieldRestrictions?: MongoFieldRestrictions;
  },
) {
  const { subgraphName, typeName, collection, paths, naming } = opts;
  const required = new Set(opts.fieldRestrictions?.required || []);
  const otc = schemaComposer.createObjectTC({ name: typeName, fields: {} });
  const selection = selectionForPaths(paths);

  otc.setField('id', { type: new GraphQLNonNull(GraphQLObjectID) });
  for (const path of paths) {
    if (path.name === '_id' || path.name === '__v') continue;
    let fieldType = mapPathToOutput(schemaComposer, path, typeName);
    if (required.has(path.name)) {
      fieldType = asNonNullType(fieldType);
    }
    otc.setField(path.name, {
      type: fieldType,
      description: path.description,
    });
  }

  otc.setDirectives([
    { name: 'key', args: { fields: 'id' } },
    {
      name: 'mongo__findOne',
      args: {
        subgraph: subgraphName,
        collection,
        query: blockArg('_id: $this.id'),
        selection,
      },
    },
  ]);

  createQuerySortAndDocumentInputs(schemaComposer, naming, typeName, paths, {
    requiredFields: opts.fieldRestrictions?.required,
    removedFields: opts.fieldRestrictions?.remove,
    restrictionsActive: Boolean(
      opts.fieldRestrictions?.only?.length || opts.fieldRestrictions?.remove?.length,
    ),
  });
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
    resolvers?: NonNullable<MongoModelConfig['options']>['resolvers'];
    fieldRestrictions?: MongoFieldRestrictions;
  },
) {
  const { subgraphName, typeName, collection, paths, naming, resolvers } = opts;
  const selection = selectionForPaths(paths);
  const queryTC = schemaComposer.Query;
  const mutationTC = schemaComposer.Mutation;
  const documentInput = naming.createInput(typeName);
  const queryType = naming.queryInput(typeName);
  const sortEnum = naming.sortEnum(typeName);
  const sortArgType = `[${sortEnum}!]`;

  const mongoDir = (
    name: string,
    extra: Record<string, unknown> = {},
  ): { name: string; args: Record<string, unknown> } => ({
    name,
    args: { subgraph: subgraphName, collection, selection, ...extra },
  });

  // db.collection.findOne({ _id }) convenience
  queryTC.setField(naming.findByIdField(typeName), {
    type: typeName,
    args: { id: { type: new GraphQLNonNull(GraphQLObjectID) } },
    directives: [mongoDir('mongo__findOne', { query: blockArg('_id: $args.id') })],
  });

  queryTC.setField(naming.findByIdsField(typeName), {
    type: `[${typeName}!]!`,
    args: {
      ids: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLObjectID))) },
      limit: { type: GraphQLInt, defaultValue: 100 },
      sort: { type: sortArgType },
    },
    directives: [
      mongoDir('mongo__find', {
        query: blockArg('_id: $args.ids'),
        limit: '$args.limit',
        sort: '$args.sort',
      }),
    ],
  });

  // db.collection.find(query, projection via selection, { sort, limit, skip })
  queryTC.setField(naming.findManyField(typeName), {
    type: `[${typeName}!]!`,
    args: {
      query: { type: queryType },
      sort: { type: sortArgType },
      limit: { type: GraphQLInt, defaultValue: 100 },
      skip: { type: GraphQLInt },
    },
    directives: [
      mongoDir('mongo__find', {
        query: '$args.query',
        sort: '$args.sort',
        limit: '$args.limit',
        skip: '$args.skip',
      }),
    ],
  });

  // db.collection.findOne(query, projection)
  queryTC.setField(naming.findOneField(typeName), {
    type: typeName,
    args: {
      query: { type: queryType },
      sort: { type: sortArgType },
      skip: { type: GraphQLInt },
    },
    directives: [
      mongoDir('mongo__findOne', {
        query: '$args.query',
        sort: '$args.sort',
        skip: '$args.skip',
      }),
    ],
  });

  // db.collection.countDocuments(query)
  queryTC.setField(naming.countField(typeName), {
    type: new GraphQLNonNull(GraphQLInt),
    args: { query: { type: queryType } },
    directives: [mongoDir('mongo__count', { query: '$args.query', selection: blockArg('$') })],
  });

  // db.collection.aggregate(pipeline)
  queryTC.setField(naming.aggregateField(typeName), {
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLJSON))),
    args: {
      query: { type: queryType },
      pipeline: { type: GraphQLJSON },
    },
    directives: [
      mongoDir('mongo__aggregate', {
        query: '$args.query',
        pipeline: '$args.pipeline',
        selection: blockArg('$'),
      }),
    ],
  });

  queryTC.setField(naming.connectionField(typeName), {
    type: naming.connectionType(typeName),
    args: {
      query: { type: queryType },
      sort: { type: sortArgType },
      first: { type: GraphQLInt },
      after: { type: GraphQLString },
    },
    directives: [
      mongoDir('mongo__connection', {
        query: '$args.query',
        sort: '$args.sort',
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
      query: { type: queryType },
      sort: { type: sortArgType },
      page: { type: GraphQLInt },
      perPage: { type: GraphQLInt, defaultValue: 20 },
    },
    directives: [
      mongoDir('mongo__pagination', {
        query: '$args.query',
        sort: '$args.sort',
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

  const documentSetBlock = blockArg(
    paths
      .filter(p => p.name !== '_id' && p.name !== '__v' && !p.name.includes('.'))
      .map(p => `${p.name}: $args.document.${p.name}`)
      .join('\n'),
  );
  const payloadSelection = blockArg(`
record {
${indent(selectionForPaths(paths).replace(/^\n/, ''), 1)}
}
recordId: $_id
`);

  // db.collection.insertOne(document)
  if (resolverEnabled(resolvers, 'createOne')) {
    mutationTC.setField(naming.createOneField(typeName), {
      type: naming.payloadType(typeName),
      args: { document: { type: `${documentInput}!` } },
      directives: [
        mongoDir('mongo__insertOne', { set: documentSetBlock, selection: payloadSelection }),
      ],
    });
  }

  // db.collection.insertMany(documents)
  if (resolverEnabled(resolvers, 'createMany')) {
    mutationTC.setField(naming.createManyField(typeName), {
      type: naming.payloadType(typeName),
      args: { documents: { type: `[${documentInput}!]!` } },
      directives: [
        mongoDir('mongo__insertMany', {
          set: blockArg('documents: $args.documents'),
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
  }

  const updateType = naming.updateInput(typeName);

  if (resolverEnabled(resolvers, 'updateById')) {
    mutationTC.setField(naming.updateByIdField(typeName), {
      type: naming.payloadType(typeName),
      args: {
        id: { type: new GraphQLNonNull(GraphQLObjectID) },
        // Typed update ops without `$` (`set` / `inc` / … → `$set` / `$inc`).
        update: { type: `${updateType}!` },
      },
      directives: [
        mongoDir('mongo__updateOne', {
          query: blockArg('_id: $args.id'),
          set: '$args.update',
          selection: payloadSelection,
        }),
      ],
    });
  }

  // db.collection.updateOne(query, update)
  if (resolverEnabled(resolvers, 'updateOne')) {
    mutationTC.setField(naming.updateOneField(typeName), {
      type: naming.payloadType(typeName),
      args: {
        query: { type: `${queryType}!` },
        update: { type: `${updateType}!` },
      },
      directives: [
        mongoDir('mongo__updateOne', {
          query: '$args.query',
          set: '$args.update',
          selection: payloadSelection,
        }),
      ],
    });
  }

  if (resolverEnabled(resolvers, 'updateMany')) {
    mutationTC.setField(naming.updateManyField(typeName), {
      type: naming.payloadType(typeName),
      args: {
        query: { type: `${queryType}!` },
        update: { type: `${updateType}!` },
      },
      directives: [
        mongoDir('mongo__updateMany', {
          query: '$args.query',
          set: '$args.update',
          selection: blockArg(`
modifiedCount: $modifiedCount
matchedCount: $matchedCount
`),
        }),
      ],
    });
  }

  if (resolverEnabled(resolvers, 'removeById')) {
    mutationTC.setField(naming.removeByIdField(typeName), {
      type: naming.payloadType(typeName),
      args: { id: { type: new GraphQLNonNull(GraphQLObjectID) } },
      directives: [
        mongoDir('mongo__deleteOne', {
          query: blockArg('_id: $args.id'),
          selection: payloadSelection,
        }),
      ],
    });
  }

  // db.collection.deleteOne(query)
  if (resolverEnabled(resolvers, 'removeOne')) {
    mutationTC.setField(naming.removeOneField(typeName), {
      type: naming.payloadType(typeName),
      args: { query: { type: `${queryType}!` } },
      directives: [
        mongoDir('mongo__deleteOne', {
          query: '$args.query',
          selection: payloadSelection,
        }),
      ],
    });
  }

  if (resolverEnabled(resolvers, 'removeMany')) {
    mutationTC.setField(naming.removeManyField(typeName), {
      type: naming.payloadType(typeName),
      args: { query: { type: `${queryType}!` } },
      directives: [
        mongoDir('mongo__deleteMany', {
          query: '$args.query',
          selection: blockArg('deletedCount: $deletedCount'),
        }),
      ],
    });
  }
}

function emitRefFields(
  schemaComposer: SchemaComposer,
  opts: {
    subgraphName: string;
    typeName: string;
    paths: PathMeta[];
    naming: MongoNaming;
    knownTypes: Set<string>;
    collectionsByType: Map<string, string>;
    pathsByType: Map<string, PathMeta[]>;
  },
) {
  // Use restricted model paths so removed source fields do not keep ref resolvers.
  const paths = opts.paths;
  const otc = schemaComposer.getOTC(opts.typeName);
  for (const path of paths) {
    if (!path.ref || !opts.knownTypes.has(path.ref)) continue;
    const refCollection = opts.collectionsByType.get(path.ref);
    if (!refCollection) continue;
    const fieldName = path.isArray
      ? pluralizeFallback(path.ref)
      : path.ref[0].toLowerCase() + path.ref.slice(1);
    // Prefer path name without Id suffix when present (authorId -> author)
    const pretty =
      path.name.endsWith('Id') || path.name.endsWith('Ids')
        ? path.name.replace(/Ids?$/, '')
        : path.name + 'Doc';
    let finalName = otc.hasField(pretty) ? fieldName : pretty;
    if (otc.hasField(finalName)) {
      finalName = `${pretty}Ref`;
      let n = 2;
      while (otc.hasField(finalName)) {
        finalName = `${pretty}Ref${n++}`;
      }
    }
    const refPaths = opts.pathsByType.get(path.ref) || [];
    const refSelection = selectionForPaths(refPaths);
    if (path.isArray) {
      otc.setField(finalName, {
        type: `[${path.ref}!]!`,
        directives: [
          {
            name: 'mongo__find',
            args: {
              subgraph: opts.subgraphName,
              collection: refCollection,
              query: blockArg(`_id: $this.${path.name}`),
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
            name: 'mongo__findOne',
            args: {
              subgraph: opts.subgraphName,
              collection: refCollection,
              query: blockArg(`_id: $this.${path.name}`),
              selection: refSelection,
            },
          },
        ],
      });
    }
  }
}

function safeEnumValueName(value: string, used: Set<string>): string {
  let raw = String(value).replace(/[^_A-Za-z0-9]/g, '_');
  if (!/^[_A-Za-z]/.test(raw)) raw = `_${raw}`;
  // GraphQL forbids enum names true/false/null and treats names starting with __ as reserved.
  // Prefix with a letter so `__foo` → `E__foo` (not `___foo`, which is still reserved).
  if (raw === 'true' || raw === 'false' || raw === 'null' || raw.startsWith('__')) {
    raw = `E${raw}`;
  }
  let candidate = raw;
  let i = 2;
  while (used.has(candidate)) {
    candidate = `${raw}_${i++}`;
  }
  used.add(candidate);
  return candidate;
}

function ensureEnumType(
  schemaComposer: SchemaComposer,
  enumName: string,
  values: string[],
): string {
  if (!schemaComposer.has(enumName)) {
    const used = new Set<string>();
    schemaComposer.createEnumTC({
      name: enumName,
      values: Object.fromEntries(
        values.map(v => [safeEnumValueName(String(v), used), { value: v }]),
      ),
    });
  }
  return enumName;
}

function ensureNestedObjectTypes(
  schemaComposer: SchemaComposer,
  path: PathMeta,
  rootTypeName: string,
): string {
  const typeName = path.nestedTypeName!;
  if (!schemaComposer.has(typeName)) {
    const otc = schemaComposer.createObjectTC({ name: typeName, fields: {} });
    for (const child of path.nested || []) {
      if (child.name === '__v') continue;
      otc.setField(child.name, {
        type: mapPathToOutput(schemaComposer, child, rootTypeName),
        description: child.description,
      });
    }
  }
  const inputName = `${typeName}Input`;
  if (!schemaComposer.has(inputName)) {
    const fields: Record<string, any> = {};
    for (const child of path.nested || []) {
      if (child.name === '__v') continue;
      fields[child.name] = {
        type: mapPathToInput(schemaComposer, child, rootTypeName),
        description: child.description,
      };
    }
    schemaComposer.createInputTC({ name: inputName, fields });
  }
  ensureNestedQueryInput(schemaComposer, path, rootTypeName);
  return typeName;
}

function ensureNestedQueryInput(
  schemaComposer: SchemaComposer,
  path: PathMeta,
  rootTypeName: string,
): string {
  const queryName = `${path.nestedTypeName}QueryInput`;
  if (!schemaComposer.has(queryName)) {
    const fields: Record<string, any> = {
      // Mongo `$and` / `$or` / `$not` without `$` (same rule as `gte`).
      and: { type: `[${queryName}!]` },
      or: { type: `[${queryName}!]` },
      not: { type: queryName },
    };
    for (const child of path.nested || []) {
      if (child.name === '__v') continue;
      fields[child.name] = {
        type: queryOperatorTypeForPath(schemaComposer, child, rootTypeName),
        description: child.description,
      };
    }
    schemaComposer.createInputTC({ name: queryName, fields });
  }
  return queryName;
}

function queryOperatorTypeForPath(
  schemaComposer: SchemaComposer,
  path: PathMeta,
  rootTypeName: string,
): string {
  if (path.selfRef) {
    return 'JSON';
  }
  if (path.nested?.length) {
    const nestedQuery = ensureNestedQueryInput(schemaComposer, path, rootTypeName);
    return path.isArray ? `[${nestedQuery}]` : nestedQuery;
  }
  if (path.enumValues?.length) {
    ensureEnumType(
      schemaComposer,
      path.enumName || `Enum${rootTypeName}${pascalCase(path.name)}`,
      path.enumValues,
    );
    return 'StringQueryOperators';
  }
  if (path.isArray && path.arrayElementInstance) {
    if (path.arrayElementInstance === 'Number') return '[Float]';
    if (path.arrayElementInstance === 'Boolean') return '[Boolean]';
    if (path.arrayElementInstance === 'ObjectID' || path.arrayElementInstance === 'ObjectId') {
      return '[ObjectID]';
    }
    return '[String]';
  }
  if (path.instance === 'Number' || path.instance === 'Int32' || path.instance === 'Double') {
    return 'FloatQueryOperators';
  }
  if (path.instance === 'Decimal128') return 'Decimal128QueryOperators';
  if (path.instance === 'Boolean') return 'BooleanQueryOperators';
  if (path.instance === 'Date') return 'DateTimeQueryOperators';
  if (path.ref || path.instance === 'ObjectID' || path.instance === 'ObjectId') {
    return 'ObjectIDQueryOperators';
  }
  if (path.instance === 'Embedded' || path.instance === 'Array' || path.instance === 'Mixed') {
    return 'JSON';
  }
  return 'StringQueryOperators';
}

function isSortablePath(path: PathMeta): boolean {
  if (path.name === '_id' || path.name === '__v') return false;
  if (path.nested?.length) return false;
  if (path.isArray) return false;
  if (path.instance === 'Mixed' || path.instance === 'Embedded' || path.instance === 'Array') {
    return false;
  }
  return true;
}

function mapPathToOutput(
  schemaComposer: SchemaComposer,
  path: PathMeta,
  rootTypeName: string,
): any {
  if (path.selfRef) {
    const t = path.nestedTypeName || rootTypeName;
    return path.isArray ? `[${t}]` : t;
  }
  if (path.nested?.length) {
    const nestedName = ensureNestedObjectTypes(schemaComposer, path, rootTypeName);
    return path.isArray ? `[${nestedName}]` : nestedName;
  }
  if (path.enumValues?.length) {
    const enumName = ensureEnumType(
      schemaComposer,
      path.enumName || `Enum${rootTypeName}${pascalCase(path.name)}`,
      path.enumValues,
    );
    return path.isArray ? `[${enumName}]` : enumName;
  }
  if (path.ref) {
    return path.isArray ? new GraphQLList(GraphQLObjectID) : GraphQLObjectID;
  }
  if (path.isArray) {
    const el = path.arrayElementInstance || path.instance;
    if (el === 'Array' || el === 'Mixed') {
      return GraphQLJSON;
    }
    return new GraphQLList(mapMongoPathToGraphQL(el));
  }
  return mapMongoPathToGraphQL(path.instance);
}

function mapPathToInput(schemaComposer: SchemaComposer, path: PathMeta, rootTypeName: string): any {
  if (path.selfRef) {
    // Avoid circular input types; recursive documents accept JSON on write.
    return path.isArray ? new GraphQLList(GraphQLJSON) : GraphQLJSON;
  }
  if (path.nested?.length) {
    ensureNestedObjectTypes(schemaComposer, path, rootTypeName);
    const inputName = `${path.nestedTypeName}Input`;
    return path.isArray ? `[${inputName}]` : inputName;
  }
  if (path.enumValues?.length) {
    const enumName = ensureEnumType(
      schemaComposer,
      path.enumName || `Enum${rootTypeName}${pascalCase(path.name)}`,
      path.enumValues,
    );
    return path.isArray ? `[${enumName}]` : enumName;
  }
  if (path.ref) {
    return path.isArray ? new GraphQLList(GraphQLObjectID) : GraphQLObjectID;
  }
  if (path.isArray) {
    const el = path.arrayElementInstance || path.instance;
    if (el === 'Array' || el === 'Mixed') {
      return GraphQLJSON;
    }
    return new GraphQLList(mapMongoPathToGraphQL(el));
  }
  return mapMongoPathToGraphQL(path.instance);
}

/** GraphQLNonNull needs a type object; compose-style type-name strings use `Type!`. */
function asNonNullType(fieldType: unknown): unknown {
  if (fieldType instanceof GraphQLNonNull) return fieldType;
  if (typeof fieldType === 'string') {
    return fieldType.endsWith('!') ? fieldType : `${fieldType}!`;
  }
  return new GraphQLNonNull(fieldType as any);
}

function createQuerySortAndDocumentInputs(
  schemaComposer: SchemaComposer,
  naming: MongoNaming,
  typeName: string,
  paths: PathMeta[],
  opts?: {
    requiredFields?: string[];
    removedFields?: string[];
    /** True when `fields.only` or `fields.remove` was configured (even if paths already filtered). */
    restrictionsActive?: boolean;
  },
) {
  const required = new Set(opts?.requiredFields || []);
  const restrictionsActive = Boolean(opts?.restrictionsActive || opts?.removedFields?.length);
  const queryName = naming.queryInput(typeName);
  if (!schemaComposer.has(queryName)) {
    schemaComposer.createInputTC({
      name: queryName,
      fields: {
        // Mongo `$and` / `$or` / `$not` without `$` (same rule as `gte`).
        and: { type: `[${queryName}!]` },
        or: { type: `[${queryName}!]` },
        not: { type: queryName },
        id: { type: 'ObjectIDQueryOperators' },
        ...Object.fromEntries(
          paths
            .filter(p => p.name !== '_id' && p.name !== '__v')
            .map(p => [
              p.name,
              {
                type: queryOperatorTypeForPath(schemaComposer, p, typeName),
                description: p.description,
              },
            ]),
        ),
      },
    });
  }

  // Client SDL: `id_asc` / `name_desc`. Directive binder still receives
  // `$args.sort`; transport maps enum values → `{ field: 1|-1 }`.
  const sortEnumName = naming.sortEnum(typeName);
  if (!schemaComposer.has(sortEnumName)) {
    const values: Record<string, { value: string }> = {
      id_asc: { value: 'id_asc' },
      id_desc: { value: 'id_desc' },
    };
    for (const path of paths.filter(isSortablePath)) {
      values[`${path.name}_asc`] = { value: `${path.name}_asc` };
      values[`${path.name}_desc`] = { value: `${path.name}_desc` };
    }
    schemaComposer.createEnumTC({ name: sortEnumName, values });
  }

  const createFields: Record<string, any> = {};
  const setFields: Record<string, any> = {};
  for (const path of paths) {
    if (path.name === '_id' || path.name === '__v') continue;
    const baseType = mapPathToInput(schemaComposer, path, typeName);
    setFields[path.name] = { type: baseType, description: path.description };
    let createType = baseType;
    if (required.has(path.name)) {
      createType = asNonNullType(baseType);
    }
    createFields[path.name] = { type: createType, description: path.description };
  }
  const documentInput = naming.createInput(typeName);
  const emptyInputPlaceholder = {
    _: {
      type: GraphQLJSON,
      description: 'Placeholder — model has no writable paths beyond id',
    },
  };
  if (!schemaComposer.has(documentInput)) {
    // GraphQL forbids empty input objects (id-only models).
    schemaComposer.createInputTC({
      name: documentInput,
      fields: Object.keys(createFields).length > 0 ? createFields : emptyInputPlaceholder,
    });
  }

  // Partial patch input for `$set` — required applies to create, not update.set.
  const setInputName = `${typeName}SetInput`;
  if (!schemaComposer.has(setInputName)) {
    schemaComposer.createInputTC({
      name: setInputName,
      fields: Object.keys(setFields).length > 0 ? setFields : emptyInputPlaceholder,
    });
  }

  // Update operators use Mongo names without `$` (`set` / `inc` → `$set` / `$inc`).
  const updateInput = naming.updateInput(typeName);
  if (!schemaComposer.has(updateInput)) {
    const unsetName = `${typeName}UnsetInput`;
    const unsetFields: Record<string, any> = {};
    for (const path of paths) {
      if (path.name === '_id' || path.name === '__v') continue;
      if (path.name.includes('.')) continue;
      unsetFields[path.name] = { type: 'Boolean', description: path.description };
    }

    const numericName = `${typeName}NumericUpdateInput`;
    const numericFields: Record<string, any> = {};
    for (const path of paths) {
      if (path.name === '_id' || path.name === '__v') continue;
      if (path.name.includes('.') || path.isArray || path.nested?.length) continue;
      if (path.instance === 'Number') {
        numericFields[path.name] = { type: GraphQLFloat, description: path.description };
      } else if (path.instance === 'Decimal128') {
        numericFields[path.name] = { type: 'Decimal128', description: path.description };
      }
    }

    const updateFields: Record<string, any> = {
      set: { type: setInputName },
    };
    // Omit operators with no permitted fields — never fall back to open GraphQLJSON.
    if (Object.keys(numericFields).length > 0) {
      if (!schemaComposer.has(numericName)) {
        schemaComposer.createInputTC({ name: numericName, fields: numericFields });
      }
      updateFields.inc = { type: numericName };
      updateFields.mul = { type: numericName };
      updateFields.min = { type: numericName };
      updateFields.max = { type: numericName };
    }
    if (Object.keys(unsetFields).length > 0) {
      if (!schemaComposer.has(unsetName)) {
        schemaComposer.createInputTC({ name: unsetName, fields: unsetFields });
      }
      updateFields.unset = { type: unsetName };
    }
    // Freeform JSON modifiers can bypass `only`/`remove`; omit whenever restrictions apply.
    if (!restrictionsActive) {
      updateFields.push = { type: GraphQLJSON };
      updateFields.pull = { type: GraphQLJSON };
      updateFields.pullAll = { type: GraphQLJSON };
      updateFields.addToSet = { type: GraphQLJSON };
      updateFields.pop = { type: GraphQLJSON };
      updateFields.rename = { type: GraphQLJSON };
      updateFields.currentDate = { type: GraphQLJSON };
      updateFields.bit = { type: GraphQLJSON };
    }
    schemaComposer.createInputTC({
      name: updateInput,
      fields: updateFields,
    });
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
        recordId: GraphQLObjectID,
        records: `[${typeName}!]`,
        recordIds: '[ObjectID!]',
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

function ensureSharedQueryOperatorInputs(schemaComposer: SchemaComposer) {
  // Mongo query-predicate names without `$` (GraphQL-legal); transport maps to `$gte` etc.
  // Also accept `_gte` aliases at runtime.
  const comparable = (scalar: any) => ({
    eq: scalar,
    ne: scalar,
    in: { type: new GraphQLList(new GraphQLNonNull(scalar)) },
    nin: { type: new GraphQLList(new GraphQLNonNull(scalar)) },
    gt: scalar,
    gte: scalar,
    lt: scalar,
    lte: scalar,
    exists: 'Boolean',
  });

  if (!schemaComposer.has('ObjectIDQueryOperators')) {
    schemaComposer.createInputTC({
      name: 'ObjectIDQueryOperators',
      fields: comparable(GraphQLObjectID),
    });
  }
  if (!schemaComposer.has('StringQueryOperators')) {
    schemaComposer.createInputTC({
      name: 'StringQueryOperators',
      fields: {
        ...comparable(GraphQLString),
        in: { type: '[String!]' },
        nin: { type: '[String!]' },
        regex: GraphQLString,
      },
    });
  }
  if (!schemaComposer.has('FloatQueryOperators')) {
    schemaComposer.createInputTC({
      name: 'FloatQueryOperators',
      fields: {
        ...comparable(GraphQLFloat),
        in: { type: '[Float!]' },
        nin: { type: '[Float!]' },
      },
    });
  }
  if (!schemaComposer.has('Decimal128QueryOperators')) {
    schemaComposer.createInputTC({
      name: 'Decimal128QueryOperators',
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
  if (!schemaComposer.has('BooleanQueryOperators')) {
    schemaComposer.createInputTC({
      name: 'BooleanQueryOperators',
      fields: { eq: 'Boolean', ne: 'Boolean', exists: 'Boolean' },
    });
  }
  if (!schemaComposer.has('DateTimeQueryOperators')) {
    schemaComposer.createInputTC({
      name: 'DateTimeQueryOperators',
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
      if (!directive.name.value.startsWith('mongo') || !directive.arguments) continue;
      for (const arg of directive.arguments) {
        if (arg.value.kind !== 'StringValue') continue;
        if (
          arg.name.value !== 'query' &&
          arg.name.value !== 'sort' &&
          arg.name.value !== 'set' &&
          arg.name.value !== 'selection' &&
          arg.name.value !== 'pipeline' &&
          arg.name.value !== 'limit' &&
          arg.name.value !== 'skip' &&
          arg.name.value !== 'first' &&
          arg.name.value !== 'after' &&
          arg.name.value !== 'page' &&
          arg.name.value !== 'perPage'
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
