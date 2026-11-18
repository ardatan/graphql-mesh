import { MongoClient, type Db } from 'mongodb';
import type { MongoClientLike, MongoTransportOptions } from './types.js';

export interface CreateMongoClientOptions extends MongoTransportOptions {
  location: string;
}

export function createMongoClient(opts: CreateMongoClientOptions): MongoClientLike {
  const client = new MongoClient(opts.location, {
    maxPoolSize: opts.maxPoolSize,
  });
  let dbPromise: Promise<Db> | undefined;

  async function getDb(): Promise<Db> {
    if (!dbPromise) {
      dbPromise = client.connect().then(() => client.db());
    }
    return dbPromise;
  }

  return {
    async findOne(collection, filter, options) {
      const db = await getDb();
      return db.collection(collection).findOne(filter, {
        projection: options?.projection,
        sort: options?.sort,
      }) as Promise<Record<string, unknown> | null>;
    },
    async findMany(collection, filter, options) {
      const db = await getDb();
      let cursor = db.collection(collection).find(filter, {
        projection: options?.projection,
        sort: options?.sort,
      });
      if (options?.skip != null) cursor = cursor.skip(options.skip);
      if (options?.limit != null) cursor = cursor.limit(options.limit);
      return cursor.toArray() as Promise<Record<string, unknown>[]>;
    },
    async count(collection, filter) {
      const db = await getDb();
      return db.collection(collection).countDocuments(filter);
    },
    async dispose() {
      await client.close();
    },
  };
}
