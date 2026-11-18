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

export interface MongoTransportOptions {
  maxPoolSize?: number;
  /** Declared BSON ObjectId field names for hex→ObjectId coercion (not String refs). */
  objectIdFields?: string[];
  /**
   * ObjectId paths keyed by collection so the same bare field name can be ObjectId
   * on one model and String on another in the same subgraph.
   */
  objectIdFieldsByCollection?: Record<string, string[]>;
  /** Fields that may be omitted on patch but reject explicit `null` on `$set`. */
  requiredFields?: string[];
  /**
   * Required fields keyed by collection — avoids cross-model bleed of `required`
   * when two models share a field name.
   */
  requiredFieldsByCollection?: Record<string, string[]>;
  /** Empty-input placeholder keys (e.g. `_`) — stripped on write; not real paths. */
  placeholderFields?: string[];
  /**
   * Placeholders keyed by collection so an id-only model's `_` does not strip a
   * real writable `_` on another model in the same subgraph.
   */
  placeholderFieldsByCollection?: Record<string, string[]>;
  /** Collections whose `_id` is BSON String (not ObjectId) — keep hex as string. */
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
