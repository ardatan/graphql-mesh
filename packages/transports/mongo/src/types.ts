/**
 * Operation kinds for legacy `@mongo(kind:)` and internal executor dispatch.
 * Prefer op-specific `@mongo__find` / `@mongo__updateOne` / … directives.
 */
export type MongoKind =
  | 'FIND_ONE'
  | 'FIND_MANY'
  | 'COUNT'
  | 'CONNECTION'
  | 'PAGINATION'
  | 'AGGREGATE'
  | 'INSERT_ONE'
  | 'INSERT_MANY'
  | 'UPDATE_ONE'
  | 'UPDATE_MANY'
  | 'DELETE_ONE'
  | 'DELETE_MANY';

/**
 * One collection’s field list — encoded as entries so hyphenated collection
 * names survive printed GraphQL SDL (object keys cannot hold `-`).
 *
 * @example
 * ```ts
 * { collection: 'user-accounts', fields: ['ownerId', 'orgId'] }
 * ```
 */
export interface MongoCollectionFieldsEntry {
  collection: string;
  fields: string[];
}

/**
 * `@transport(kind: "mongo", options: { … })` / {@link createMongoClient} options.
 *
 * The loader writes these from model introspection. Hand-written SDL can set them
 * the same way. Client GraphQL still uses `filter: *FilterInput`; binders pass
 * `$args.filter` into the directive `query:` argument.
 *
 * @example
 * ```graphql
 * schema @transport(
 *   kind: "mongo"
 *   location: "mongodb://localhost:27017/app"
 *   options: {
 *     maxPoolSize: 10
 *     objectIdFieldsByCollection: [
 *       { collection: "users", fields: ["orgId"] }
 *     ]
 *     stringIdCollections: ["external_ids"]
 *   }
 * ) { query: Query mutation: Mutation }
 * ```
 */
export interface MongoTransportOptions {
  /** MongoDB driver pool size for {@link createMongoClient}. */
  maxPoolSize?: number;
  /**
   * Declared BSON ObjectId field names for hex→ObjectId coercion (flat /
   * subgraph-wide). Prefer {@link objectIdFieldsByCollection} when the same
   * bare field name differs across collections.
   */
  objectIdFields?: string[];
  /**
   * ObjectId paths per collection (entry list encoding; legacy
   * `Record<collection, fields>` still accepted at runtime).
   */
  objectIdFieldsByCollection?: MongoCollectionFieldsEntry[] | Record<string, string[]>;
  /**
   * Fields that may be omitted on patch but reject explicit `null` on `$set`
   * (flat / subgraph-wide). Prefer {@link requiredFieldsByCollection}.
   */
  requiredFields?: string[];
  /**
   * Required fields per collection (entry list encoding; legacy Record accepted).
   * A present empty list is authoritative (no flat `requiredFields` fallback).
   */
  requiredFieldsByCollection?: MongoCollectionFieldsEntry[] | Record<string, string[]>;
  /**
   * Empty-input placeholder keys (e.g. `_`) — stripped on write; not real paths.
   * Flat / subgraph-wide; prefer {@link placeholderFieldsByCollection}.
   */
  placeholderFields?: string[];
  /**
   * Placeholders per collection (entry list encoding; legacy Record accepted).
   */
  placeholderFieldsByCollection?: MongoCollectionFieldsEntry[] | Record<string, string[]>;
  /**
   * Collections whose `_id` is BSON String (not ObjectId) — keep 24-hex as string
   * for inserts, filters, cursors, and payload `recordId`.
   */
  stringIdCollections?: string[];
}

export interface MongoMappingValue {
  kind: 'column' | 'pseudo' | 'args' | 'this' | 'literal';
  value: string;
  path?: string[];
}

export interface MongoMappingEntry {
  key: string;
  value?: MongoMappingValue;
  children?: MongoMappingEntry[];
  spread?: boolean;
}

export interface ParsedMongoMapping {
  entries: MongoMappingEntry[];
}

export interface MongoFindOptions {
  projection?: Record<string, 0 | 1>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

/**
 * Minimal Mongo driver surface used by the transport executor.
 * {@link createMongoClient} returns this; tests inject stubs.
 */
export interface MongoClientLike {
  findOne(
    collection: string,
    filter: Record<string, unknown>,
    options?: MongoFindOptions,
  ): Promise<Record<string, unknown> | null>;
  findMany(
    collection: string,
    filter: Record<string, unknown>,
    options?: MongoFindOptions,
  ): Promise<Record<string, unknown>[]>;
  count(collection: string, filter: Record<string, unknown>): Promise<number>;
  insertOne(collection: string, doc: Record<string, unknown>): Promise<{ insertedId: unknown }>;
  insertMany(
    collection: string,
    docs: Record<string, unknown>[],
  ): Promise<{ insertedIds: unknown[]; insertedCount: number }>;
  updateOne(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<{ matchedCount: number; modifiedCount: number; upsertedId?: unknown }>;
  updateMany(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<{ matchedCount: number; modifiedCount: number }>;
  /** Atomic update + return the post-image document (or null if unmatched). */
  findOneAndUpdate(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<{
    value: Record<string, unknown> | null;
    matchedCount: number;
    /** Omitted when the driver post-image path cannot measure modification. */
    modifiedCount?: number;
  }>;
  deleteOne(collection: string, filter: Record<string, unknown>): Promise<{ deletedCount: number }>;
  deleteMany(
    collection: string,
    filter: Record<string, unknown>,
  ): Promise<{ deletedCount: number }>;
  /** Atomic delete + return the deleted document (or null if unmatched). */
  findOneAndDelete(
    collection: string,
    filter: Record<string, unknown>,
  ): Promise<{ value: Record<string, unknown> | null; deletedCount: number }>;
  aggregate(
    collection: string,
    pipeline: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]>;
  dispose(): void | Promise<void>;
}
