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

/**
 * Compose-style field policy for one model’s GraphQL surface.
 *
 * @example
 * ```ts
 * fields: {
 *   only: ['name', 'email'],      // whitelist paths
 *   remove: ['passwordHash'],     // or blacklist
 *   required: ['email'],          // non-null on create; reject null `$set`
 * }
 * ```
 */
export interface MongoFieldRestrictions {
  /** When set, only these path names are emitted (plus `_id`). */
  only?: string[];
  /** Path names omitted from the GraphQL type / inputs. */
  remove?: string[];
  /**
   * Paths that stay optional on patch but reject explicit `null` on `$set`
   * (and `$unset` / `$rename` of the path). Marked non-null on create input.
   */
  required?: string[];
}

/**
 * Discriminator subtype stamp/filter (`schema.discriminatorMapping`, `isRoot: false`).
 * Auto-read by the loader — not a user config field.
 */
export interface MongoDiscriminatorInfo {
  key: string;
  /** Original BSON-ish value (string or number); binders preserve the type. */
  value: string | number;
}

/**
 * Opt out of individual Query/Mutation roots.
 * Keys follow MongoDB collection method names (plus ById / connection helpers).
 * GraphQL field names still come from {@link MongoNaming}
 * (e.g. `insertOne: false` drops `insertOneUser`).
 *
 * @default Every key defaults to `true` (emit) when omitted; only `false` omits.
 */
export type MongoQueryAndMutations = {
  /** Emit `find*ById` (`db.collection.findOne({ _id })`). @default true */
  findById?: boolean;
  /** Emit `find*ByIds` (`find({ _id: { $in } })`). @default true */
  findByIds?: boolean;
  /** Emit `findOne*` (`db.collection.findOne(filter)`). @default true */
  findOne?: boolean;
  /** Emit `find*` list (`db.collection.find(filter)`). @default true */
  findMany?: boolean;
  /** Emit `countDocuments*` (`db.collection.countDocuments`). @default true */
  countDocuments?: boolean;
  /** Emit `aggregate*` (`db.collection.aggregate`). @default true */
  aggregate?: boolean;
  /** Emit Relay-style `*Connection` root. @default true */
  connection?: boolean;
  /** Emit page/`perPage` `*Pagination` root. @default true */
  pagination?: boolean;
  /** Emit `insertOne*` (`db.collection.insertOne`). @default true */
  insertOne?: boolean;
  /** Emit `insertMany*` (`db.collection.insertMany`). @default true */
  insertMany?: boolean;
  /** Emit `update*ById` convenience mutation. @default true */
  updateById?: boolean;
  /** Emit `updateOne*` (`db.collection.updateOne`). @default true */
  updateOne?: boolean;
  /** Emit `updateMany*` (`db.collection.updateMany`). @default true */
  updateMany?: boolean;
  /** Emit `delete*ById` convenience mutation. @default true */
  deleteById?: boolean;
  /** Emit `deleteOne*` (`db.collection.deleteOne`). @default true */
  deleteOne?: boolean;
  /** Emit `deleteMany*` (`db.collection.deleteMany`). @default true */
  deleteMany?: boolean;
};

function isOpEnabled(
  ops: MongoQueryAndMutations | undefined,
  key: keyof MongoQueryAndMutations,
): boolean {
  if (!ops) return true;
  return ops[key] !== false;
}

type MongoModelConfigBase = {
  /**
   * GraphQL type / root-field stem.
   * @example `"User"` → `findUserById`, `insertOneUser`, `UserFilterInput`, …
   */
  name: string;
  /**
   * Mongo collection name used in `@mongo__*` binders and transport maps.
   * @default Mongoose model/schema `collection`, else a pluralized {@link name}
   */
  collection?: string;
  /**
   * Field whitelist / blacklist / required policy (`only` / `remove` / `required`).
   * When unset, every introspected path is emitted.
   */
  fields?: MongoFieldRestrictions;
  /**
   * Which Query/Mutation roots to emit for this model (`false` omits a root).
   * @default All roots enabled (every {@link MongoQueryAndMutations} key `true`)
   */
  queryAndMutations?: MongoQueryAndMutations;
};

/**
 * One Mongoose model in the subgraph. Supply **exactly one** of `model` | `schema` |
 * `path` for the shape; shared options live on every variant.
 *
 * Emitted roots use client arg `filter: *FilterInput`; directive binders keep
 * `query: "$args.filter"` (Mongo find filter). Discriminator subtypes are
 * auto-detected from `schema.discriminatorMapping`.
 *
 * @example With a live Mongoose model
 * ```ts
 * { name: 'User', model: UserModel, fields: { required: ['email'] } }
 * ```
 *
 * @example With a schema only (no connection needed at compose time)
 * ```ts
 * {
 *   name: 'Post',
 *   schema: new Schema({ title: String }, { collection: 'posts' }),
 *   collection: 'posts',
 *   queryAndMutations: { aggregate: false },
 * }
 * ```
 *
 * @example With a module path (lazy import)
 * ```ts
 * { name: 'User', path: './models#User' }
 * ```
 */
export type MongoModelConfig =
  | (MongoModelConfigBase & {
      /** Live Mongoose model instance. */
      model: Model<any>;
      schema?: never;
      path?: never;
    })
  | (MongoModelConfigBase & {
      /** Mongoose schema (model is synthesized with {@link collection}). */
      schema: MongooseSchema;
      model?: never;
      path?: never;
    })
  | (MongoModelConfigBase & {
      /**
       * Module export expression loaded via Mesh `importFn`
       * (e.g. `./models#User` or `./models.js`).
       */
      path: string;
      model?: never;
      schema?: never;
    });

/**
 * Options for {@link loadGraphQLSchemaFromMongo} / {@link loadMongoSubgraph}.
 *
 * @example
 * ```ts
 * await loadGraphQLSchemaFromMongo('users', {
 *   endpoint: 'mongodb://localhost:27017/app',
 *   models: [{ name: 'User', model: UserModel }],
 *   naming: { findManyField: t => `list${t}s` },
 * });
 * ```
 */
export interface LoadMongoSubgraphOpts {
  /**
   * Mongo connection string written to `@transport(location:)` and used when the
   * executor opens a driver client.
   */
  endpoint: string;
  /** One entry per GraphQL object type / collection slice. */
  models: MongoModelConfig[];
  /**
   * Base directory for `path` model imports (`./models#User`, relative modules).
   * @default `process.cwd()`
   */
  cwd?: string;
  /**
   * Override default GraphQL type / field naming ({@link createDefaultNaming}).
   * Partial merge — only replace the helpers you need (e.g. `findManyField`).
   * @default {@link createDefaultNaming}()
   */
  naming?: Partial<MongoNaming>;
  /**
   * Custom module loader for `path` models (tests / non-Node runtimes).
   * @default Mesh `defaultImportFn`
   */
  importFn?: ImportFn;
}

/**
 * Build a subgraph SDL from Mongoose models: object types, `*FilterInput`,
 * `@mongo__*` binders, and `@transport(kind: "mongo")`.
 */
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

  const modelMeta: Array<{
    /** Original model config `name` (Mongoose `ref` target). */
    modelName: string;
    typeName: string;
    collection: string;
    schema: MongooseSchema;
    paths: PathMeta[];
    fieldRestrictions?: MongoFieldRestrictions;
    queryAndMutations?: MongoQueryAndMutations;
    placeholderFields?: string[];
    /** True when mongoose `_id` is BSON String (not ObjectId). */
    stringId?: boolean;
    discriminator?: MongoDiscriminatorInfo;
  }> = [];

  for (const modelConfig of opts.models) {
    const model = await resolveModel(modelConfig, cwd, importFn);
    const collection =
      modelConfig.collection ||
      (model as any).collection?.collectionName ||
      model.schema?.get('collection') ||
      pluralizeFallback(modelConfig.name);
    const typeName = naming.typeName(modelConfig.name);
    const fieldRestrictions = modelConfig.fields;
    // Subtype models: mongoose sets `discriminatorMapping` (`isRoot: false`).
    const discriminator = readDiscriminatorMapping(model.schema);
    let paths = applyFieldRestrictions(introspectPaths(model.schema, typeName), fieldRestrictions);
    // Discriminator key is stamped by binders — not a client-writable GraphQL field.
    if (discriminator?.key) {
      paths = paths.filter(p => p.name !== discriminator.key);
    }
    const placeholderFields: string[] = [];
    const stringId = isStringIdSchema(model.schema);
    if (stringId && paths.some(p => p.name === 'storedId')) {
      throw new Error(
        `Model "${modelConfig.name}": path "storedId" collides with the String-_id alias for mongoose "id"`,
      );
    }
    if (discriminator && (discriminator.key === 'documents' || discriminator.key === 'inputs')) {
      throw new Error(
        `Model "${modelConfig.name}": discriminator key "${discriminator.key}" collides with insertMany binder`,
      );
    }
    assertNoReservedFilterPathNames(paths, modelConfig.name);
    modelMeta.push({
      modelName: modelConfig.name,
      typeName,
      collection,
      schema: model.schema,
      paths,
      fieldRestrictions,
      queryAndMutations: modelConfig.queryAndMutations,
      placeholderFields,
      stringId,
      discriminator,
    });
    emitModelObjectType(schemaComposer, {
      subgraphName,
      typeName,
      collection,
      paths,
      naming,
      fieldRestrictions,
      placeholderFieldsOut: placeholderFields,
      stringId,
      discriminator,
    });
  }

  // Any model with only/remove → omit raw aggregate subgraph-wide (blocks $unionWith leaks).
  const omitAggregateSubgraphWide = modelMeta.some(
    m => m.fieldRestrictions?.only?.length || m.fieldRestrictions?.remove?.length,
  );

  // Mongoose `ref: 'User'` must resolve via original model name before GraphQL naming.
  const typeNameByModelName = new Map(modelMeta.map(m => [m.modelName, m.typeName]));
  const pathsByType = new Map(modelMeta.map(m => [m.typeName, m.paths]));
  const collectionsByType = new Map(modelMeta.map(m => [m.typeName, m.collection]));
  for (const meta of modelMeta) {
    // Subtypes: prepended `$match` is bypassable via `$unionWith` — omit raw aggregate
    // until the transport can enforce discriminator scope across client stages.
    const omitAggregate = omitAggregateSubgraphWide || Boolean(meta.discriminator);
    emitModelRootFields(schemaComposer, {
      subgraphName,
      typeName: meta.typeName,
      collection: meta.collection,
      paths: meta.paths,
      naming,
      fieldRestrictions: meta.fieldRestrictions,
      queryAndMutations: meta.queryAndMutations,
      omitAggregate,
      stringId: meta.stringId,
      discriminator: meta.discriminator,
    });
    emitRefFields(schemaComposer, {
      subgraphName,
      typeName: meta.typeName,
      paths: meta.paths,
      naming,
      typeNameByModelName,
      collectionsByType,
      pathsByType,
    });
  }

  // GraphQL requires a non-empty Query type — mutation-only configs get a placeholder.
  if (schemaComposer.Query.getFieldNames().length === 0) {
    if (schemaComposer.Mutation.getFieldNames().length === 0) {
      throw new Error(
        `Mongo subgraph "${subgraphName}": queryAndMutations disabled every Query and Mutation root`,
      );
    }
    schemaComposer.Query.setField('_empty', {
      type: GraphQLString,
      resolve: () => null,
    });
  }

  const schema = schemaComposer.buildSchema();
  const extensions: Record<string, any> = (schema.extensions ||= {});
  extensions.directives ||= {};
  const objectIdFields = collectObjectIdFieldNames(modelMeta.map(m => m.paths));
  // Null-prototype maps so collection names like `__proto__` stay own keys.
  const objectIdFieldsByCollection: Record<string, string[]> = Object.create(null);
  // Field → ObjectId? per collection — reject ObjectId vs non-ObjectId conflicts.
  const objectIdPolicyByCollection: Record<string, Map<string, boolean>> = Object.create(null);
  for (const m of modelMeta) {
    if (!m.collection) continue;
    const policy =
      objectIdPolicyByCollection[m.collection] ||
      (objectIdPolicyByCollection[m.collection] = new Map());
    for (const field of collectFieldObjectIdFlags(m.paths)) {
      const prev = policy.get(field.name);
      if (prev != null && prev !== field.isObjectId) {
        throw new Error(
          `Conflicting BSON ObjectId declarations for "${field.name}" on collection "${m.collection}"`,
        );
      }
      policy.set(field.name, field.isObjectId);
    }
    // Always emit an entry (possibly `[]`) so empty scoped maps stay authoritative.
    objectIdFieldsByCollection[m.collection] = [...policy.entries()]
      .filter(([, isOid]) => isOid)
      .map(([name]) => name);
  }
  const requiredFields = [
    ...new Set(
      modelMeta.flatMap(m => m.fieldRestrictions?.required || []).filter(Boolean) as string[],
    ),
  ];
  // Explicit `fields.required` policies must agree across views of one collection.
  const requiredFieldsByCollection: Record<string, string[]> = Object.create(null);
  const requiredPolicyByCollection: Record<string, string> = Object.create(null);
  for (const m of modelMeta) {
    if (!m.collection || m.fieldRestrictions?.required === undefined) continue;
    const req = [
      ...new Set((m.fieldRestrictions.required || []).filter(Boolean) as string[]),
    ].sort();
    const key = req.join('\0');
    const prev = requiredPolicyByCollection[m.collection];
    if (prev != null && prev !== key) {
      throw new Error(
        `Conflicting required-field policies for collection "${m.collection}": ` +
          `[${prev.split('\0').filter(Boolean).join(', ')}] vs [${req.join(', ')}]`,
      );
    }
    requiredPolicyByCollection[m.collection] = key;
    requiredFieldsByCollection[m.collection] = req;
  }
  const placeholderFields = [
    ...new Set(modelMeta.flatMap(m => m.placeholderFields || []).filter(Boolean) as string[]),
  ];
  // Always emit an entry per collection (possibly `[]`) so the executor does not
  // fall back to a global `_` strip for models that never registered a placeholder.
  const placeholderFieldsByCollection: Record<string, string[]> = Object.create(null);
  for (const m of modelMeta) {
    if (!m.collection) continue;
    const existing = placeholderFieldsByCollection[m.collection] || [];
    placeholderFieldsByCollection[m.collection] = [
      ...new Set([...existing, ...(m.placeholderFields || [])]),
    ];
  }
  const stringIdCollections = modelMeta
    .filter(m => m.stringId)
    .map(m => m.collection)
    .filter(Boolean);
  const transportOptions: Record<string, unknown> = {};
  if (objectIdFields.length) transportOptions.objectIdFields = objectIdFields;
  // Always encode scoped ObjectId map (incl. empty entries) — no flat fallback at runtime.
  if (Object.keys(objectIdFieldsByCollection).length) {
    transportOptions.objectIdFieldsByCollection = encodeCollectionFieldsMap(
      objectIdFieldsByCollection,
    );
  }
  if (requiredFields.length) transportOptions.requiredFields = requiredFields;
  if (Object.keys(requiredFieldsByCollection).length) {
    transportOptions.requiredFieldsByCollection = encodeCollectionFieldsMap(
      requiredFieldsByCollection,
    );
  }
  if (placeholderFields.length) transportOptions.placeholderFields = placeholderFields;
  if (Object.keys(placeholderFieldsByCollection).length) {
    transportOptions.placeholderFieldsByCollection = encodeCollectionFieldsMap(
      placeholderFieldsByCollection,
    );
  }
  if (stringIdCollections.length) transportOptions.stringIdCollections = stringIdCollections;
  extensions.directives.transport = {
    subgraph: subgraphName,
    kind: 'mongo',
    location: opts.endpoint,
    options: Object.keys(transportOptions).length ? transportOptions : undefined,
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

const RESERVED_FILTER_PATH_NAMES = new Set(['and', 'or', 'not', 'AND', 'OR', 'NOT']);

/** Reject model paths that would overwrite filter logical operators on `*FilterInput`. */
function assertNoReservedFilterPathNames(paths: PathMeta[], modelName: string): void {
  const walk = (list: PathMeta[], prefix: string) => {
    for (const p of list) {
      if (RESERVED_FILTER_PATH_NAMES.has(p.name)) {
        const full = prefix ? `${prefix}.${p.name}` : p.name;
        throw new Error(
          `Model "${modelName}": path "${full}" collides with filter logical operator`,
        );
      }
      if (p.nested?.length) walk(p.nested, prefix ? `${prefix}.${p.name}` : p.name);
    }
  };
  walk(paths, '');
}

function assertExactlyOneModelSource(config: MongoModelConfig): void {
  const hasModel = 'model' in config && config.model != null;
  const hasSchema = 'schema' in config && config.schema != null;
  const hasPath = 'path' in config && Boolean(config.path);
  const count = Number(hasModel) + Number(hasSchema) + Number(hasPath);
  if (count !== 1) {
    throw new Error(
      `Model "${config.name}" needs exactly one of model, schema, or path (got ${count})`,
    );
  }
}

function assertMongooseModelLike(model: unknown, label: string): asserts model is Model<any> {
  // Mongoose models are functions (`typeof === 'function'`) with a `.schema` property.
  const schema = model != null ? (model as Model<any>).schema : undefined;
  if (schema == null || typeof schema !== 'object') {
    throw new Error(`${label} did not resolve to a Mongoose model (missing schema)`);
  }
}

async function resolveModel(
  config: MongoModelConfig,
  cwd: string,
  importFn: ImportFn,
): Promise<Model<any>> {
  assertExactlyOneModelSource(config);
  if ('model' in config && config.model) {
    assertMongooseModelLike(config.model, `Model "${config.name}"`);
    return config.model;
  }
  if ('schema' in config && config.schema) {
    const collectionName =
      config.collection ||
      (typeof config.schema.get === 'function' ? config.schema.get('collection') : undefined) ||
      pluralizeFallback(config.name);
    return {
      schema: config.schema,
      collection: { collectionName },
    } as any;
  }
  if ('path' in config && config.path) {
    const model = await loadFromModuleExportExpression<Model<any>>(config.path, {
      defaultExportName: config.name,
      cwd,
      importFn,
    });
    if (!model) {
      throw new Error(`Model ${config.name} cannot be imported from ${config.path}`);
    }
    assertMongooseModelLike(model, `Model "${config.name}" import from ${config.path}`);
    return model;
  }
  throw new Error(`Model ${config.name} needs exactly one of model, schema, or path`);
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

function isBsonObjectIdPath(path: PathMeta): boolean {
  return (
    path.instance === 'ObjectID' ||
    path.instance === 'ObjectId' ||
    path.arrayElementInstance === 'ObjectID' ||
    path.arrayElementInstance === 'ObjectId'
  );
}

/** Mongoose models with `_id: String` (or equivalent) — not BSON ObjectId. */
function isStringIdSchema(schema: MongooseSchema): boolean {
  const idPath = (schema as any)?.paths?._id;
  const instance = idPath?.instance || idPath?.caster?.instance;
  return instance === 'String';
}

/** Subtype models expose `discriminatorMapping.isRoot === false`. */
function readDiscriminatorMapping(schema: MongooseSchema): MongoDiscriminatorInfo | undefined {
  const mapping = (schema as any)?.discriminatorMapping;
  if (!mapping || mapping.isRoot !== false) return undefined;
  const key = mapping.key != null ? String(mapping.key) : '';
  if (!key || mapping.value == null || mapping.value === '') return undefined;
  // Preserve Number discriminators as numbers; stringify only non-number values.
  const value =
    typeof mapping.value === 'number' && Number.isFinite(mapping.value)
      ? mapping.value
      : String(mapping.value);
  if (value === '') return undefined;
  return { key, value };
}

/** Escape a string discriminator value for embedding in a Mongo mapping binder. */
function escapeMappingLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Binder literal for a discriminator value — numbers unquoted, strings quoted. */
function discriminatorValueLiteral(value: string | number): string {
  if (typeof value === 'number') return String(value);
  return `"${escapeMappingLiteral(value)}"`;
}

/**
 * Prefix a filter/query binder with a fixed discriminator clause.
 * `$args.filter` and `_id: $args.id` both merge via transport `mergeFilterFragment`.
 */
function filterWithDiscriminator(filter: string, disc?: MongoDiscriminatorInfo): string {
  if (!disc) return filter;
  const clause = `${disc.key}: ${discriminatorValueLiteral(disc.value)}`;
  if (filter === '$args.filter') {
    return blockArg(`${clause}\n$args.filter`);
  }
  // Already a block / multi-line binder body.
  const body = trimNewlines(filter).replace(/^ {2}/gm, '');
  return blockArg(`${clause}\n${body}`);
}

/** Full BSON ObjectId paths (incl. nested `profile.reviewer`) — String refs stay strings. */
function collectObjectIdFieldNames(pathLists: PathMeta[][]): string[] {
  const out = new Set<string>();
  const walk = (paths: PathMeta[], prefix: string) => {
    for (const path of paths) {
      const full = prefix ? `${prefix}.${path.name}` : path.name;
      if (path.name !== '_id' && path.name !== 'id' && isBsonObjectIdPath(path)) {
        out.add(full);
      }
      if (path.nested?.length) walk(path.nested, full);
    }
  };
  for (const paths of pathLists) walk(paths, '');
  return [...out];
}

/**
 * ObjectId vs non-ObjectId flags keyed by full BSON path (for multi-view conflict checks).
 * Nested paths use dotted names so `profile.reviewer` ≠ a top-level `reviewer`.
 */
function collectFieldObjectIdFlags(
  paths: PathMeta[],
): Array<{ name: string; isObjectId: boolean }> {
  const out: Array<{ name: string; isObjectId: boolean }> = [];
  const walk = (list: PathMeta[], prefix: string) => {
    for (const path of list) {
      const full = prefix ? `${prefix}.${path.name}` : path.name;
      if (path.name !== '_id' && path.name !== 'id') {
        out.push({ name: full, isObjectId: isBsonObjectIdPath(path) });
      }
      if (path.nested?.length) walk(path.nested, full);
    }
  };
  walk(paths, '');
  return out;
}

/** Encode collection→fields as an entry list (hyphenated names are string values, not keys). */
function encodeCollectionFieldsMap(
  map: Record<string, string[]>,
): Array<{ collection: string; fields: string[] }> {
  return Object.keys(map).map(collection => ({
    collection,
    fields: map[collection],
  }));
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

function selectionForPaths(paths: PathMeta[], opts?: { stringId?: boolean }): string {
  const lines = ['id: _id'];
  for (const path of paths) {
    if (path.name === '_id' || path.name === '__v') continue;
    // GraphQL `id` is `_id`; a stored mongoose `id` path is exposed as `storedId`.
    if (opts?.stringId && path.name === 'id') {
      lines.push('storedId: id');
      continue;
    }
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
    placeholderFieldsOut?: string[];
    stringId?: boolean;
    discriminator?: MongoDiscriminatorInfo;
  },
) {
  const { subgraphName, typeName, collection, paths, naming } = opts;
  const required = new Set(opts.fieldRestrictions?.required || []);
  const otc = schemaComposer.createObjectTC({ name: typeName, fields: {} });
  const selection = selectionForPaths(paths, { stringId: opts.stringId });

  // String `_id` models keep GraphQL String ids so lookups do not coerce hex→ObjectId.
  otc.setField('id', {
    type: new GraphQLNonNull(opts.stringId ? GraphQLString : GraphQLObjectID),
  });
  for (const path of paths) {
    if (path.name === '_id' || path.name === '__v') continue;
    let fieldType = mapPathToOutput(schemaComposer, path, typeName);
    if (required.has(path.name)) {
      fieldType = asNonNullType(fieldType);
    }
    // Reserve GraphQL `id` for `_id` — expose a stored mongoose `id` as `storedId`.
    const fieldName = opts.stringId && path.name === 'id' ? 'storedId' : path.name;
    otc.setField(fieldName, {
      type: fieldType,
      description:
        fieldName === 'storedId'
          ? path.description || 'Stored `id` path (GraphQL `id` is reserved for `_id`)'
          : path.description,
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
    placeholderFieldsOut: opts.placeholderFieldsOut,
    stringId: opts.stringId,
    // Subtype updates must not `$rename` the discriminator key.
    omitRename: Boolean(opts.discriminator),
  });
  createConnectionTypes(schemaComposer, naming, typeName);
  createPayloadType(schemaComposer, naming, typeName, opts.stringId);
}

function emitModelRootFields(
  schemaComposer: SchemaComposer,
  opts: {
    subgraphName: string;
    typeName: string;
    collection: string;
    paths: PathMeta[];
    naming: MongoNaming;
    fieldRestrictions?: MongoFieldRestrictions;
    queryAndMutations?: MongoQueryAndMutations;
    /** When true, omit raw aggregate for every model in this subgraph. */
    omitAggregate?: boolean;
    stringId?: boolean;
    discriminator?: MongoDiscriminatorInfo;
  },
) {
  const { subgraphName, typeName, collection, paths, naming } = opts;
  const ops = opts.queryAndMutations;
  const disc = opts.discriminator;
  const selection = selectionForPaths(paths, { stringId: opts.stringId });
  const queryTC = schemaComposer.Query;
  const mutationTC = schemaComposer.Mutation;
  const documentInput = naming.documentInput(typeName);
  const filterType = naming.filterInput(typeName);
  const sortEnum = naming.sortEnum(typeName);
  const sortArgType = `[${sortEnum}!]`;
  const idScalar = opts.stringId ? GraphQLString : GraphQLObjectID;
  // Client arg is `filter`; directive binder key stays `query` (Mongo find filter).
  const argsFilter = filterWithDiscriminator('$args.filter', disc);

  const mongoDir = (
    name: string,
    extra: Record<string, unknown> = {},
  ): { name: string; args: Record<string, unknown> } => ({
    name,
    args: { subgraph: subgraphName, collection, selection, ...extra },
  });

  // db.collection.findOne({ _id }) convenience
  if (isOpEnabled(ops, 'findById')) {
    queryTC.setField(naming.findByIdField(typeName), {
      type: typeName,
      args: { id: { type: new GraphQLNonNull(idScalar) } },
      directives: [
        mongoDir('mongo__findOne', {
          query: filterWithDiscriminator(blockArg('_id: $args.id'), disc),
        }),
      ],
    });
  }

  if (isOpEnabled(ops, 'findByIds')) {
    queryTC.setField(naming.findByIdsField(typeName), {
      type: `[${typeName}!]!`,
      args: {
        ids: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(idScalar))) },
        limit: { type: GraphQLInt, defaultValue: 100 },
        sort: { type: sortArgType },
      },
      directives: [
        mongoDir('mongo__find', {
          query: filterWithDiscriminator(blockArg('_id: $args.ids'), disc),
          limit: '$args.limit',
          sort: '$args.sort',
        }),
      ],
    });
  }

  // db.collection.find(filter, projection via selection, { sort, limit, skip })
  if (isOpEnabled(ops, 'findMany')) {
    queryTC.setField(naming.findManyField(typeName), {
      type: `[${typeName}!]!`,
      args: {
        filter: { type: filterType },
        sort: { type: sortArgType },
        limit: { type: GraphQLInt, defaultValue: 100 },
        skip: { type: GraphQLInt },
      },
      directives: [
        mongoDir('mongo__find', {
          query: argsFilter,
          sort: '$args.sort',
          limit: '$args.limit',
          skip: '$args.skip',
        }),
      ],
    });
  }

  // db.collection.findOne(filter, projection)
  if (isOpEnabled(ops, 'findOne')) {
    queryTC.setField(naming.findOneField(typeName), {
      type: typeName,
      args: {
        filter: { type: filterType },
        sort: { type: sortArgType },
        skip: { type: GraphQLInt },
      },
      directives: [
        mongoDir('mongo__findOne', {
          query: argsFilter,
          sort: '$args.sort',
          skip: '$args.skip',
        }),
      ],
    });
  }

  // db.collection.countDocuments(filter)
  if (isOpEnabled(ops, 'countDocuments')) {
    queryTC.setField(naming.countDocumentsField(typeName), {
      type: new GraphQLNonNull(GraphQLInt),
      args: { filter: { type: filterType } },
      directives: [mongoDir('mongo__count', { query: argsFilter, selection: blockArg('$') })],
    });
  }

  // Raw aggregate can `$project` / `$unionWith` past field restrictions or a
  // prepended subtype `$match` — omitted when `omitAggregate` (restricted subgraph
  // and/or discriminator subtype models).
  if (!opts.omitAggregate && isOpEnabled(ops, 'aggregate')) {
    queryTC.setField(naming.aggregateField(typeName), {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLJSON))),
      args: {
        filter: { type: filterType },
        pipeline: { type: GraphQLJSON },
      },
      directives: [
        mongoDir('mongo__aggregate', {
          query: argsFilter,
          pipeline: '$args.pipeline',
          selection: blockArg('$'),
        }),
      ],
    });
  }

  if (isOpEnabled(ops, 'connection')) {
    queryTC.setField(naming.connectionField(typeName), {
      type: naming.connectionType(typeName),
      args: {
        filter: { type: filterType },
        sort: { type: sortArgType },
        first: { type: GraphQLInt },
        after: { type: GraphQLString },
      },
      directives: [
        mongoDir('mongo__connection', {
          query: argsFilter,
          sort: '$args.sort',
          first: '$args.first',
          after: '$args.after',
          selection: blockArg(`
nodes {
${indent(selection.replace(/^\n/, ''), 1)}
}
edges {
  cursor: $cursor
  node {
${indent(selection.replace(/^\n/, ''), 2)}
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
  }

  if (isOpEnabled(ops, 'pagination')) {
    queryTC.setField(naming.paginationField(typeName), {
      type: naming.paginationType(typeName),
      args: {
        filter: { type: filterType },
        sort: { type: sortArgType },
        page: { type: GraphQLInt },
        perPage: { type: GraphQLInt, defaultValue: 20 },
      },
      directives: [
        mongoDir('mongo__pagination', {
          query: argsFilter,
          sort: '$args.sort',
          page: '$args.page',
          perPage: '$args.perPage',
          selection: blockArg(`
count: $count
items {
${indent(selection.replace(/^\n/, ''), 1)}
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
  }

  const documentFieldBinds = paths
    .filter(p => p.name !== '_id' && p.name !== '__v' && !p.name.includes('.'))
    .map(p => {
      // GraphQL `id` is reserved for String `_id`; stored mongoose `id` → `storedId`.
      if (opts.stringId && p.name === 'id') {
        return `id: $args.document.storedId`;
      }
      return `${p.name}: $args.document.${p.name}`;
    });
  if (opts.stringId) {
    documentFieldBinds.unshift('_id: $args.document.id');
  }
  // Stamp discriminator key on create so inserts land as the subtype.
  if (disc) {
    documentFieldBinds.unshift(`${disc.key}: ${discriminatorValueLiteral(disc.value)}`);
  }
  const documentSetBlock = blockArg(documentFieldBinds.join('\n'));
  const payloadSelection = blockArg(`
record {
${indent(selection.replace(/^\n/, ''), 1)}
}
recordId: $_id
`);

  // db.collection.insertOne(document)
  if (isOpEnabled(ops, 'insertOne')) {
    mutationTC.setField(naming.insertOneField(typeName), {
      type: naming.payloadType(typeName),
      args: { document: { type: `${documentInput}!` } },
      directives: [
        mongoDir('mongo__insertOne', { set: documentSetBlock, selection: payloadSelection }),
      ],
    });
  }

  // db.collection.insertMany(documents)
  if (isOpEnabled(ops, 'insertMany')) {
    const insertManySetLines = ['documents: $args.documents'];
    if (disc) {
      // Sibling literals are stamped onto each document by the transport.
      insertManySetLines.push(`${disc.key}: ${discriminatorValueLiteral(disc.value)}`);
    }
    mutationTC.setField(naming.insertManyField(typeName), {
      type: naming.payloadType(typeName),
      args: { documents: { type: `[${documentInput}!]!` } },
      directives: [
        mongoDir('mongo__insertMany', {
          set: blockArg(insertManySetLines.join('\n')),
          selection: blockArg(`
records {
${indent(selection.replace(/^\n/, ''), 1)}
}
recordIds: $recordIds
createdCount: $createdCount
`),
        }),
      ],
    });
  }

  const updateType = naming.updateInput(typeName);

  const idArgScalar = opts.stringId ? GraphQLString : GraphQLObjectID;

  if (isOpEnabled(ops, 'updateById')) {
    mutationTC.setField(naming.updateByIdField(typeName), {
      type: naming.payloadType(typeName),
      args: {
        id: { type: new GraphQLNonNull(idArgScalar) },
        // Typed update ops: bare names (`set` / `inc` / … → `$set` / `$inc`).
        update: { type: `${updateType}!` },
      },
      directives: [
        mongoDir('mongo__updateOne', {
          query: filterWithDiscriminator(blockArg('_id: $args.id'), disc),
          set: '$args.update',
          selection: payloadSelection,
        }),
      ],
    });
  }

  // db.collection.updateOne(filter, update)
  if (isOpEnabled(ops, 'updateOne')) {
    mutationTC.setField(naming.updateOneField(typeName), {
      type: naming.payloadType(typeName),
      args: {
        filter: { type: `${filterType}!` },
        update: { type: `${updateType}!` },
      },
      directives: [
        mongoDir('mongo__updateOne', {
          query: argsFilter,
          set: '$args.update',
          selection: payloadSelection,
        }),
      ],
    });
  }

  if (isOpEnabled(ops, 'updateMany')) {
    mutationTC.setField(naming.updateManyField(typeName), {
      type: naming.payloadType(typeName),
      args: {
        filter: { type: `${filterType}!` },
        update: { type: `${updateType}!` },
      },
      directives: [
        mongoDir('mongo__updateMany', {
          query: argsFilter,
          set: '$args.update',
          selection: blockArg(`
modifiedCount: $modifiedCount
matchedCount: $matchedCount
`),
        }),
      ],
    });
  }

  if (isOpEnabled(ops, 'deleteById')) {
    mutationTC.setField(naming.deleteByIdField(typeName), {
      type: naming.payloadType(typeName),
      args: { id: { type: new GraphQLNonNull(idArgScalar) } },
      directives: [
        mongoDir('mongo__deleteOne', {
          query: filterWithDiscriminator(blockArg('_id: $args.id'), disc),
          selection: payloadSelection,
        }),
      ],
    });
  }

  // db.collection.deleteOne(filter)
  if (isOpEnabled(ops, 'deleteOne')) {
    mutationTC.setField(naming.deleteOneField(typeName), {
      type: naming.payloadType(typeName),
      args: { filter: { type: `${filterType}!` } },
      directives: [
        mongoDir('mongo__deleteOne', {
          query: argsFilter,
          selection: payloadSelection,
        }),
      ],
    });
  }

  if (isOpEnabled(ops, 'deleteMany')) {
    mutationTC.setField(naming.deleteManyField(typeName), {
      type: naming.payloadType(typeName),
      args: { filter: { type: `${filterType}!` } },
      directives: [
        mongoDir('mongo__deleteMany', {
          query: argsFilter,
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
    /** Mongoose model name → emitted GraphQL type (naming.typeName). */
    typeNameByModelName: Map<string, string>;
    collectionsByType: Map<string, string>;
    pathsByType: Map<string, PathMeta[]>;
  },
) {
  // Use restricted model paths so removed source fields do not keep ref resolvers.
  const paths = opts.paths;
  const otc = schemaComposer.getOTC(opts.typeName);
  for (const path of paths) {
    if (!path.ref) continue;
    // `ref` is the original Mongoose model name — map to GraphQL type after naming.
    const refTypeName = opts.typeNameByModelName.get(path.ref);
    if (!refTypeName) continue;
    const refCollection = opts.collectionsByType.get(refTypeName);
    if (!refCollection) continue;
    const fieldName = path.isArray
      ? pluralizeFallback(refTypeName)
      : refTypeName[0].toLowerCase() + refTypeName.slice(1);
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
    const refPaths = opts.pathsByType.get(refTypeName) || [];
    const refSelection = selectionForPaths(refPaths);
    if (path.isArray) {
      otc.setField(finalName, {
        type: `[${refTypeName}!]!`,
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
        type: refTypeName,
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
  ensureNestedFilterInput(schemaComposer, path, rootTypeName);
  return typeName;
}

function ensureNestedFilterInput(
  schemaComposer: SchemaComposer,
  path: PathMeta,
  rootTypeName: string,
): string {
  const filterName = `${path.nestedTypeName}FilterInput`;
  if (!schemaComposer.has(filterName)) {
    const fields: Record<string, any> = {
      // GraphQL-legal bare combinators (`and` / `or` / `not` → `$and` / `$or` / `$not`).
      and: { type: `[${filterName}!]` },
      or: { type: `[${filterName}!]` },
      not: { type: filterName },
    };
    for (const child of path.nested || []) {
      if (child.name === '__v') continue;
      fields[child.name] = {
        type: filterOperatorTypeForPath(schemaComposer, child, rootTypeName),
        description: child.description,
      };
    }
    schemaComposer.createInputTC({ name: filterName, fields });
  }
  return filterName;
}

function filterOperatorTypeForPath(
  schemaComposer: SchemaComposer,
  path: PathMeta,
  rootTypeName: string,
): string {
  if (path.selfRef) {
    return 'JSON';
  }
  if (path.nested?.length) {
    const nestedFilter = ensureNestedFilterInput(schemaComposer, path, rootTypeName);
    return path.isArray ? `[${nestedFilter}]` : nestedFilter;
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
  if (isBsonObjectIdPath(path)) {
    return 'ObjectIDQueryOperators';
  }
  if (path.ref) {
    // String (or non-ObjectId) refs use string operators — keep 24-hex as strings.
    return 'StringQueryOperators';
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
  if (path.ref && isBsonObjectIdPath(path)) {
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
  if (path.ref && isBsonObjectIdPath(path)) {
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
    placeholderFieldsOut?: string[];
    stringId?: boolean;
    /** Discriminator subtypes: omit freeform `rename` so the key cannot move. */
    omitRename?: boolean;
  },
) {
  const required = new Set(opts?.requiredFields || []);
  // Freeform JSON ops (rename/push/…) can bypass required/only/remove — omit them.
  const restrictionsActive = Boolean(
    opts?.restrictionsActive || opts?.removedFields?.length || required.size > 0,
  );
  const filterName = naming.filterInput(typeName);
  if (!schemaComposer.has(filterName)) {
    schemaComposer.createInputTC({
      name: filterName,
      fields: {
        // GraphQL-legal bare combinators (`and` / `or` / `not` → `$and` / `$or` / `$not`).
        and: { type: `[${filterName}!]` },
        or: { type: `[${filterName}!]` },
        not: { type: filterName },
        id: { type: opts?.stringId ? 'StringQueryOperators' : 'ObjectIDQueryOperators' },
        ...Object.fromEntries(
          paths
            .filter(p => p.name !== '_id' && p.name !== '__v')
            .map(p => {
              const fieldName = opts?.stringId && p.name === 'id' ? 'storedId' : p.name;
              return [
                fieldName,
                {
                  type: filterOperatorTypeForPath(schemaComposer, p, typeName),
                  description:
                    fieldName === 'storedId'
                      ? p.description || 'Stored `id` path (GraphQL `id` is reserved for `_id`)'
                      : p.description,
                },
              ];
            }),
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
      // GraphQL sort enums use `storedId_*` for a reserved mongoose `id` path.
      const sortName = opts?.stringId && path.name === 'id' ? 'storedId' : path.name;
      values[`${sortName}_asc`] = { value: `${sortName}_asc` };
      values[`${sortName}_desc`] = { value: `${sortName}_desc` };
    }
    schemaComposer.createEnumTC({ name: sortEnumName, values });
  }

  const createFields: Record<string, any> = {};
  const setFields: Record<string, any> = {};
  // String `_id` models must supply the id on create — Mongo would otherwise insert ObjectId.
  if (opts?.stringId) {
    createFields.id = {
      type: asNonNullType(GraphQLString),
      description: 'String document id (BSON String `_id`)',
    };
  }
  for (const path of paths) {
    if (path.name === '_id' || path.name === '__v') continue;
    // Reserve GraphQL `id` for `_id` — a stored mongoose `id` path must not overwrite it.
    if (opts?.stringId && path.name === 'id') {
      const baseType = mapPathToInput(schemaComposer, path, typeName);
      const storedDesc =
        path.description || 'Stored `id` path (GraphQL `id` is reserved for `_id`)';
      setFields.storedId = { type: baseType, description: storedDesc };
      let createType = baseType;
      if (required.has(path.name)) {
        createType = asNonNullType(baseType);
      }
      createFields.storedId = { type: createType, description: storedDesc };
      continue;
    }
    const baseType = mapPathToInput(schemaComposer, path, typeName);
    setFields[path.name] = { type: baseType, description: path.description };
    let createType = baseType;
    if (required.has(path.name)) {
      createType = asNonNullType(baseType);
    }
    createFields[path.name] = { type: createType, description: path.description };
  }
  const documentInput = naming.documentInput(typeName);
  // Prefer `_` as placeholder unless the model already has a writable `_` path.
  const placeholderKey = paths.some(p => p.name === '_') ? '__empty' : '_';
  const emptyInputPlaceholder = {
    [placeholderKey]: {
      type: GraphQLJSON,
      description: 'Placeholder — model has no writable paths beyond id',
    },
  };
  if (!schemaComposer.has(documentInput)) {
    // GraphQL forbids empty input objects (id-only models).
    if (Object.keys(createFields).length > 0) {
      schemaComposer.createInputTC({
        name: documentInput,
        fields: createFields,
      });
    } else {
      schemaComposer.createInputTC({
        name: documentInput,
        fields: emptyInputPlaceholder,
      });
      opts?.placeholderFieldsOut?.push(placeholderKey);
    }
  }

  // Partial patch input for `$set` — required applies to create, not update.set.
  // Id-only models: omit SetInput/`set` rather than exposing placeholder `_` as writable.
  const setInputName = `${typeName}SetInput`;
  const hasWritableSetFields = Object.keys(setFields).length > 0;
  if (hasWritableSetFields && !schemaComposer.has(setInputName)) {
    schemaComposer.createInputTC({
      name: setInputName,
      fields: setFields,
    });
  }

  // Update operators: bare Mongo names (`set` / `inc` → `$set` / `$inc`).
  const updateInput = naming.updateInput(typeName);
  if (!schemaComposer.has(updateInput)) {
    const unsetName = `${typeName}UnsetInput`;
    const unsetFields: Record<string, any> = {};
    for (const path of paths) {
      if (path.name === '_id' || path.name === '__v') continue;
      if (path.name.includes('.')) continue;
      if (required.has(path.name)) continue;
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

    const updateFields: Record<string, any> = {};
    if (hasWritableSetFields) {
      updateFields.set = { type: setInputName };
    }
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
      if (!opts?.omitRename) {
        updateFields.rename = { type: GraphQLJSON };
      }
      updateFields.currentDate = { type: GraphQLJSON };
      updateFields.bit = { type: GraphQLJSON };
    }
    if (Object.keys(updateFields).length > 0) {
      schemaComposer.createInputTC({
        name: updateInput,
        fields: updateFields,
      });
    } else {
      schemaComposer.createInputTC({
        name: updateInput,
        fields: {
          [placeholderKey]: {
            type: GraphQLJSON,
            description: 'No writable update operators for this model',
          },
        },
      });
      if (!opts?.placeholderFieldsOut?.includes(placeholderKey)) {
        opts?.placeholderFieldsOut?.push(placeholderKey);
      }
    }
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

function createPayloadType(
  schemaComposer: SchemaComposer,
  naming: MongoNaming,
  typeName: string,
  stringId?: boolean,
) {
  if (!schemaComposer.has(naming.payloadType(typeName))) {
    const idScalar = stringId ? GraphQLString : GraphQLObjectID;
    schemaComposer.createObjectTC({
      name: naming.payloadType(typeName),
      fields: {
        record: typeName,
        recordId: idScalar,
        records: `[${typeName}!]`,
        recordIds: stringId ? '[String!]' : '[ObjectID!]',
        createdCount: GraphQLInt,
        modifiedCount: GraphQLInt,
        matchedCount: GraphQLInt,
        deletedCount: GraphQLInt,
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
  // `$` is illegal in GraphQL names — generated ops use bare Mongo names (`gte`);
  // transport maps to `$gte` and also accepts `_gte` aliases at runtime.
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

/** Trim leading/trailing newlines without an alternation regex (CodeQL ReDoS). */
function trimNewlines(body: string): string {
  let start = 0;
  let end = body.length;
  while (start < end && body.charCodeAt(start) === 10) start++;
  while (end > start && body.charCodeAt(end - 1) === 10) end--;
  return start === 0 && end === body.length ? body : body.slice(start, end);
}

function blockArg(body: string): string {
  const trimmed = trimNewlines(body);
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
