import { parse, type ExecutionResult } from 'graphql';
import { Schema } from 'mongoose';
import { loadGraphQLSchemaFromMongo } from '@omnigraph/mongo';
import { getMongoExecutor } from '../src/execution.js';
import type { MongoClientLike } from '../src/types.js';

async function execResult(
  executor: ReturnType<typeof getMongoExecutor>,
  args: Parameters<ReturnType<typeof getMongoExecutor>>[0],
): Promise<ExecutionResult> {
  return (await executor(args)) as ExecutionResult;
}

describe('getMongoExecutor FIND_* + writes', () => {
  it('runs find/count/create via @mongo directives', async () => {
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

    const adaId = '507f1f77bcf86cd799439011';
    const alanId = '507f1f77bcf86cd799439012';
    const docs: Array<Record<string, unknown>> = [
      { _id: adaId, name: 'Ada', age: 36, gender: 'female' },
      { _id: alanId, name: 'Alan', age: 41, gender: 'male' },
    ];

    const client: MongoClientLike = {
      async findOne(_c, filter) {
        return docs.find(d => String(d._id) === String((filter as any)._id)) || null;
      },
      async findMany(_c, filter, options) {
        let rows = docs.slice();
        if ((filter as any).name) rows = rows.filter(d => d.name === (filter as any).name);
        if ((filter as any)._id?.$in) {
          const ids = (filter as any)._id.$in.map(String);
          rows = rows.filter(d => ids.includes(String(d._id)));
        }
        if (options?.limit != null) rows = rows.slice(0, options.limit);
        return rows;
      },
      async count(_c, filter) {
        if ((filter as any).gender) {
          return docs.filter(d => d.gender === (filter as any).gender).length;
        }
        return docs.length;
      },
      async insertOne(_c, doc) {
        const insertedId = '507f1f77bcf86cd799439099';
        docs.push({ ...doc, _id: insertedId });
        return { insertedId };
      },
      async insertMany() {
        return { insertedIds: [], insertedCount: 0 };
      },
      async updateOne() {
        return { matchedCount: 1, modifiedCount: 1 };
      },
      async updateMany() {
        return { matchedCount: 0, modifiedCount: 0 };
      },
      async findOneAndUpdate(_c, filter, update) {
        const doc = docs.find(d => String(d._id) === String((filter as any)._id));
        if (!doc) return { value: null, matchedCount: 0, modifiedCount: 0 };
        const set = (update as any).$set || {};
        Object.assign(doc, set);
        return { value: { ...doc }, matchedCount: 1, modifiedCount: 1 };
      },
      async deleteOne() {
        return { deletedCount: 1 };
      },
      async deleteMany() {
        return { deletedCount: 0 };
      },
      async findOneAndDelete(_c, filter) {
        const idx = docs.findIndex(d => String(d._id) === String((filter as any)._id));
        if (idx < 0) return { value: null, deletedCount: 0 };
        const [value] = docs.splice(idx, 1);
        return { value, deletedCount: 1 };
      },
      async aggregate() {
        return [];
      },
      dispose() {},
    };

    const executor = getMongoExecutor({ subgraph: schema, client });

    const byId = await execResult(executor, {
      document: parse(`query { findUserById(id: "${adaId}") { id name age } }`),
    });
    expect(byId.errors).toBeUndefined();
    expect(byId.data).toEqual({
      findUserById: { id: adaId, name: 'Ada', age: 36 },
    });

    const many = await execResult(executor, {
      document: parse(`query { findUsers(query: { name: { eq: "Alan" } }) { id name } }`),
    });
    expect(many.data).toEqual({
      findUsers: [{ id: alanId, name: 'Alan' }],
    });

    const count = await execResult(executor, {
      document: parse(`query { countDocumentsUsers(query: { gender: { eq: "female" } }) }`),
    });
    expect(count.data).toEqual({ countDocumentsUsers: 1 });

    const created = await execResult(executor, {
      document: parse(
        `mutation { insertOneUser(document: { name: "Grace", age: 45 }) { recordId record { name } } }`,
      ),
    });
    expect(created.errors).toBeUndefined();
    expect(created.data).toEqual({
      insertOneUser: {
        recordId: '507f1f77bcf86cd799439099',
        record: { name: 'Grace' },
      },
    });
  });

  it('neutralizes nested empty and on UPDATE_MANY / DELETE_MANY', async () => {
    const userSchema = new Schema({ name: String }, { collection: 'user_users' });
    const schema = await loadGraphQLSchemaFromMongo('users', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [{ name: 'User', schema: userSchema, collection: 'user_users' }],
    });

    let lastUpdateFilter: Record<string, unknown> | undefined;
    let lastDeleteFilter: Record<string, unknown> | undefined;
    const client: MongoClientLike = {
      async findOne() {
        return null;
      },
      async findMany() {
        return [];
      },
      async count() {
        return 0;
      },
      async insertOne() {
        return { insertedId: 'x' };
      },
      async insertMany() {
        return { insertedIds: [], insertedCount: 0 };
      },
      async updateOne() {
        return { matchedCount: 0, modifiedCount: 0 };
      },
      async updateMany(_c, filter) {
        lastUpdateFilter = filter as Record<string, unknown>;
        return { matchedCount: 0, modifiedCount: 0 };
      },
      async findOneAndUpdate() {
        return { value: null, matchedCount: 0, modifiedCount: 0 };
      },
      async deleteOne() {
        return { deletedCount: 0 };
      },
      async deleteMany(_c, filter) {
        lastDeleteFilter = filter as Record<string, unknown>;
        return { deletedCount: 0 };
      },
      async findOneAndDelete() {
        return { value: null, deletedCount: 0 };
      },
      async aggregate() {
        return [];
      },
      dispose() {},
    };

    const executor = getMongoExecutor({ subgraph: schema, client });
    const nestedEmpty = '{ and: [{ and: [] }] }';

    await execResult(executor, {
      document: parse(
        `mutation { updateManyUsers(query: ${nestedEmpty}, update: { set: { name: "x" } }) { matchedCount } }`,
      ),
    });
    expect(lastUpdateFilter).toEqual({ $and: [{ $nor: [{}] }] });

    await execResult(executor, {
      document: parse(`mutation { deleteManyUsers(query: ${nestedEmpty}) { deletedCount } }`),
    });
    expect(lastDeleteFilter).toEqual({ $and: [{ $nor: [{}] }] });
  });
});

describe('connection cursor sort keys', () => {
  it('rejects array-backed sort keys including final-segment arrays', async () => {
    const { resolveSortKeyValueForCursor } = await import('../src/execution.js');
    expect(() => resolveSortKeyValueForCursor({ tags: ['a', 'b'] }, 'tags')).toThrow(
      /array-backed/,
    );
    expect(() =>
      resolveSortKeyValueForCursor({ items: { price: [10, 20] } }, 'items.price'),
    ).toThrow(/array-backed/);
    expect(() => resolveSortKeyValueForCursor({ items: [{ price: 10 }] }, 'items.price')).toThrow(
      /array-backed/,
    );
  });

  it('encodes scalar dotted-path sort values for multi-page cursors', async () => {
    const { resolveSortKeyValueForCursor } = await import('../src/execution.js');
    expect(resolveSortKeyValueForCursor({ address: { city: 'Austin' } }, 'address.city')).toBe(
      'Austin',
    );
    expect(
      resolveSortKeyValueForCursor({ address: { city: 'Boston' }, _id: '2' }, 'address.city'),
    ).toBe('Boston');
  });
});
