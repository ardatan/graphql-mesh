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
  deleteOne(collection: string, filter: Record<string, unknown>): Promise<{ deletedCount: number }>;
  deleteMany(
    collection: string,
    filter: Record<string, unknown>,
  ): Promise<{ deletedCount: number }>;
  aggregate(
    collection: string,
    pipeline: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]>;
  dispose(): void | Promise<void>;
}
