import { MongoClient, type Db } from 'mongodb';
import type { MongoClientLike, MongoTransportOptions } from './types.js';

/**
 * Driver client factory options: connection string plus
 * {@link MongoTransportOptions} (pool size, field policy maps).
 *
 * @example
 * ```ts
 * const client = createMongoClient({
 *   location: 'mongodb://localhost:27017/app',
 *   maxPoolSize: 20,
 *   stringIdCollections: ['legacy_keys'],
 * });
 * ```
 */
export interface CreateMongoClientOptions extends MongoTransportOptions {
  /** MongoDB connection URI (`mongodb://…` / `mongodb+srv://…`). */
  location: string;
}

/** Open a pooled native MongoDB client implementing {@link MongoClientLike}. */
export function createMongoClient(opts: CreateMongoClientOptions): MongoClientLike {
  const client = new MongoClient(opts.location, {
    maxPoolSize: opts.maxPoolSize,
  });
  let dbPromise: Promise<Db> | undefined;

  async function getDb(): Promise<Db> {
    if (!dbPromise) {
      dbPromise = client.connect().then(
        () => client.db(),
        err => {
          dbPromise = undefined;
          throw err;
        },
      );
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
    async insertOne(collection, doc) {
      const db = await getDb();
      const result = await db.collection(collection).insertOne(doc);
      return { insertedId: result.insertedId };
    },
    async insertMany(collection, docs) {
      const db = await getDb();
      const result = await db.collection(collection).insertMany(docs);
      return {
        insertedIds: Object.values(result.insertedIds),
        insertedCount: result.insertedCount,
      };
    },
    async updateOne(collection, filter, update) {
      const db = await getDb();
      const result = await db.collection(collection).updateOne(filter, update);
      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedId: result.upsertedId ?? undefined,
      };
    },
    async updateMany(collection, filter, update) {
      const db = await getDb();
      const result = await db.collection(collection).updateMany(filter, update);
      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      };
    },
    async findOneAndUpdate(collection, filter, update) {
      const db = await getDb();
      // Driver 7 returns the document directly when includeResultMetadata is false.
      const value = (await db.collection(collection).findOneAndUpdate(filter, update, {
        returnDocument: 'after',
        includeResultMetadata: false,
      })) as Record<string, unknown> | null;
      // With includeResultMetadata:false we only know whether a post-image exists;
      // do not invent modifiedCount (noop updates still return the document).
      return {
        value,
        matchedCount: value ? 1 : 0,
      };
    },
    async deleteOne(collection, filter) {
      const db = await getDb();
      const result = await db.collection(collection).deleteOne(filter);
      return { deletedCount: result.deletedCount ?? 0 };
    },
    async deleteMany(collection, filter) {
      const db = await getDb();
      const result = await db.collection(collection).deleteMany(filter);
      return { deletedCount: result.deletedCount ?? 0 };
    },
    async findOneAndDelete(collection, filter) {
      const db = await getDb();
      const value = (await db.collection(collection).findOneAndDelete(filter, {
        includeResultMetadata: false,
      })) as Record<string, unknown> | null;
      return {
        value,
        deletedCount: value ? 1 : 0,
      };
    },
    async aggregate(collection, pipeline) {
      const db = await getDb();
      return db.collection(collection).aggregate(pipeline).toArray() as Promise<
        Record<string, unknown>[]
      >;
    },
    async dispose() {
      await client.close();
    },
  };
}
