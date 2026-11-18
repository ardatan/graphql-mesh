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
      const result = await db.collection(collection).findOneAndUpdate(filter, update, {
        returnDocument: 'after',
      });
      const value =
        result && typeof result === 'object' && 'value' in result
          ? ((result as { value: Record<string, unknown> | null }).value ?? null)
          : ((result as Record<string, unknown> | null) ?? null);
      return {
        value,
        matchedCount: value ? 1 : 0,
        modifiedCount: value ? 1 : 0,
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
      const result = await db.collection(collection).findOneAndDelete(filter);
      const value =
        result && typeof result === 'object' && 'value' in result
          ? ((result as { value: Record<string, unknown> | null }).value ?? null)
          : ((result as Record<string, unknown> | null) ?? null);
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
