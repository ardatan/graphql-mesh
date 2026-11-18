import { parse } from 'graphql';
import { loadGraphQLSchemaFromMongo } from '@omnigraph/mongo';
import { Schema } from 'mongoose';
import { getMongoExecutor } from '../src/execution.js';
import type { MongoClientLike } from '../src/types.js';

describe('getMongoExecutor FIND_*', () => {
  it('runs findById / findMany / count via @mongo directives', async () => {
    const userSchema = new Schema(
      {
        name: { type: String, index: true },
        age: { type: Number, index: true },
        gender: { type: String, enum: ['male', 'female', 'not-specified'] },
      },
      { collection: 'user_users' },
    );

    const schema = await loadGraphQLSchemaFromMongo('users', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [{ name: 'User', schema: userSchema, collection: 'user_users' }],
    });

    const docs = [
      { _id: '1', name: 'Ada', age: 36, gender: 'female' },
      { _id: '2', name: 'Alan', age: 41, gender: 'male' },
    ];

    const client: MongoClientLike = {
      async findOne(collection, filter) {
        expect(collection).toBe('user_users');
        return docs.find(d => String(d._id) === String((filter as any)._id)) || null;
      },
      async findMany(collection, filter, options) {
        expect(collection).toBe('user_users');
        let rows = docs.slice();
        if ((filter as any).name) {
          rows = rows.filter(d => d.name === (filter as any).name);
        }
        if (options?.limit != null) rows = rows.slice(0, options.limit);
        return rows;
      },
      async count(collection, filter) {
        expect(collection).toBe('user_users');
        if ((filter as any).gender) {
          return docs.filter(d => d.gender === (filter as any).gender).length;
        }
        return docs.length;
      },
      dispose() {},
    };

    const executor = getMongoExecutor({ subgraph: schema, client });

    const byId = await executor({
      document: parse(`query { User_findById(_id: "1") { id name age } }`),
    });
    expect(byId.data).toEqual({
      User_findById: { id: '1', name: 'Ada', age: 36 },
    });

    const many = await executor({
      document: parse(`query { User_findMany(where: { name: { eq: "Alan" } }) { id name } }`),
    });
    expect(many.data).toEqual({
      User_findMany: [{ id: '2', name: 'Alan' }],
    });

    const count = await executor({
      document: parse(`query { User_count(where: { gender: { eq: "female" } }) }`),
    });
    expect(count.data).toEqual({ User_count: 1 });
  });
});
