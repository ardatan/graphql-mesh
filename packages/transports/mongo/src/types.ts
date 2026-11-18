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
  /** Max pool size forwarded to MongoClient. */
  maxPoolSize?: number;
}

export interface MongoMappingValue {
  kind: 'column' | 'pseudo' | 'args' | 'this' | 'literal';
  /** Mongo path, pseudo token, path after $args/$this, or literal */
  value: string;
  /** Nested path segments for $args.record.name -> ['record','name'] */
  path?: string[];
}

export interface MongoMappingEntry {
  key: string;
  value?: MongoMappingValue;
  children?: MongoMappingEntry[];
  /**
   * Connectors-style spread (`...$args.where`): merge the resolved object into
   * the structured WHERE filter (null/undefined spread is a no-op).
   */
  spread?: boolean;
}

export interface ParsedMongoMapping {
  entries: MongoMappingEntry[];
}

export interface MongoClientLike {
  findOne(
    collection: string,
    filter: Record<string, unknown>,
    options?: { projection?: Record<string, 0 | 1>; sort?: Record<string, 1 | -1> },
  ): Promise<Record<string, unknown> | null>;
  findMany(
    collection: string,
    filter: Record<string, unknown>,
    options?: {
      projection?: Record<string, 0 | 1>;
      sort?: Record<string, 1 | -1>;
      limit?: number;
      skip?: number;
    },
  ): Promise<Record<string, unknown>[]>;
  count(collection: string, filter: Record<string, unknown>): Promise<number>;
  dispose(): void | Promise<void>;
}
