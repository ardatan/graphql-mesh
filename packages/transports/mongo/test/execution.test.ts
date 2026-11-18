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

    // Vacuous `$or` branch is match-all — bulk guard must neutralize (not prune→Ada-only).
    const vacuousOr = '{ or: [{ and: [] }, { name: { eq: "Ada" } }] }';
    await execResult(executor, {
      document: parse(`mutation { deleteManyUsers(query: ${vacuousOr}) { deletedCount } }`),
    });
    expect(lastDeleteFilter).toEqual({ $nor: [{}] });

    // `not` of vacuous OR must stay match-nothing (pruning would delete non-Ada rows).
    const notVacuousOr = '{ not: { or: [{}, { name: { eq: "Ada" } }] } }';
    await execResult(executor, {
      document: parse(`mutation { deleteManyUsers(query: ${notVacuousOr}) { deletedCount } }`),
    });
    // Shape is `$nor: [{ $or: [{}, { name }] }]` — universally matching inner OR → match-nothing.
    expect(lastDeleteFilter).toEqual({
      $nor: [{ $or: [{}, { name: 'Ada' }] }],
    });
    const { isMatchNothingFilter, isUniversallyMatchingFilter } = await import('../src/filter.js');
    expect(isMatchNothingFilter(lastDeleteFilter!)).toBe(true);
    expect(isUniversallyMatchingFilter(lastDeleteFilter!)).toBe(false);

    const notNestedEmpty = '{ not: { and: [{ and: [] }] } }';
    await execResult(executor, {
      document: parse(`mutation { deleteManyUsers(query: ${notNestedEmpty}) { deletedCount } }`),
    });
    expect(lastDeleteFilter).toEqual({ $nor: [{}] });
  });

  it('inserts String _id as string and pages connection cursors without ObjectId coerce', async () => {
    const externalSchema = new Schema(
      { _id: String, name: String },
      { collection: 'external_users' },
    );
    const schema = await loadGraphQLSchemaFromMongo('externals', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'ExternalUser',
          schema: externalSchema,
          collection: 'external_users',
        },
      ],
    });

    const docs: Array<Record<string, unknown>> = [
      { _id: '507f1f77bcf86cd799439011', name: 'Ada' },
      { _id: '507f1f77bcf86cd799439012', name: 'Alan' },
      { _id: '507f1f77bcf86cd799439013', name: 'Grace' },
    ];
    let inserted: Record<string, unknown> | undefined;
    let lastFindFilter: Record<string, unknown> | undefined;
    const client: MongoClientLike = {
      async findOne(_c, filter) {
        return docs.find(d => String(d._id) === String((filter as any)._id)) || null;
      },
      async findMany(_c, filter, options) {
        lastFindFilter = filter as Record<string, unknown>;
        let rows = docs.slice().sort((a, b) => String(a._id).localeCompare(String(b._id)));
        const idOp = (filter as any)._id;
        if (idOp && typeof idOp === 'object' && idOp.$gt != null) {
          expect(typeof idOp.$gt).toBe('string');
          expect(idOp.$gt).not.toBeInstanceOf((await import('mongodb')).ObjectId);
          rows = rows.filter(d => String(d._id) > String(idOp.$gt));
        }
        if (options?.limit != null) rows = rows.slice(0, options.limit);
        return rows;
      },
      async count() {
        return docs.length;
      },
      async insertOne(_c, doc) {
        inserted = doc;
        docs.push(doc);
        return { insertedId: doc._id };
      },
      async insertMany() {
        return { insertedIds: [], insertedCount: 0 };
      },
      async updateOne() {
        return { matchedCount: 0, modifiedCount: 0 };
      },
      async updateMany() {
        return { matchedCount: 0, modifiedCount: 0 };
      },
      async findOneAndUpdate() {
        return { value: null, matchedCount: 0, modifiedCount: 0 };
      },
      async deleteOne() {
        return { deletedCount: 0 };
      },
      async deleteMany() {
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
    const created = await execResult(executor, {
      document: parse(
        `mutation { insertOneExternalUser(document: { id: "507f1f77bcf86cd799439099", name: "Lin" }) { recordId record { id name } } }`,
      ),
    });
    expect(created.errors).toBeUndefined();
    expect(typeof inserted?._id).toBe('string');
    expect(inserted?._id).toBe('507f1f77bcf86cd799439099');
    expect(created.data).toEqual({
      insertOneExternalUser: {
        recordId: '507f1f77bcf86cd799439099',
        record: { id: '507f1f77bcf86cd799439099', name: 'Lin' },
      },
    });

    const page1 = await execResult(executor, {
      document: parse(
        `query { findExternalUsersConnection(first: 1, sort: [id_asc]) { edges { cursor node { id } } pageInfo { hasNextPage } } }`,
      ),
    });
    expect(page1.errors).toBeUndefined();
    const cursor = (page1.data as any).findExternalUsersConnection.edges[0].cursor as string;
    expect((page1.data as any).findExternalUsersConnection.pageInfo.hasNextPage).toBe(true);

    const page2 = await execResult(executor, {
      document: parse(
        `query { findExternalUsersConnection(first: 1, after: "${cursor}", sort: [id_asc]) { edges { node { id } } } }`,
      ),
    });
    expect(page2.errors).toBeUndefined();
    expect((page2.data as any).findExternalUsersConnection.edges[0].node.id).toBe(
      '507f1f77bcf86cd799439012',
    );
    expect(lastFindFilter).toBeDefined();
  });

  it('maps bulk-create GraphQL id to Mongo _id for String _id models', async () => {
    const externalSchema = new Schema(
      { _id: String, name: String },
      { collection: 'external_users' },
    );
    const schema = await loadGraphQLSchemaFromMongo('externals', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'ExternalUser',
          schema: externalSchema,
          collection: 'external_users',
        },
      ],
    });

    let insertedDocs: Record<string, unknown>[] = [];
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
      async insertMany(_c, docs) {
        insertedDocs = docs as Record<string, unknown>[];
        return {
          insertedIds: docs.map(d => d._id),
          insertedCount: docs.length,
        };
      },
      async updateOne() {
        return { matchedCount: 0, modifiedCount: 0 };
      },
      async updateMany() {
        return { matchedCount: 0, modifiedCount: 0 };
      },
      async findOneAndUpdate() {
        return { value: null, matchedCount: 0, modifiedCount: 0 };
      },
      async deleteOne() {
        return { deletedCount: 0 };
      },
      async deleteMany() {
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
    const result = await execResult(executor, {
      document: parse(
        `mutation {
          insertManyExternalUsers(documents: [
            { id: "bulk-1", name: "Ada" }
            { id: "bulk-2", name: "Alan" }
          ]) { createdCount recordIds }
        }`,
      ),
    });
    expect(result.errors).toBeUndefined();
    expect(insertedDocs).toEqual([
      { _id: 'bulk-1', name: 'Ada' },
      { _id: 'bulk-2', name: 'Alan' },
    ]);
    expect(insertedDocs.every(d => d.id === undefined)).toBe(true);
  });

  it('treats present empty requiredFieldsByCollection as authoritative', async () => {
    const userSchema = new Schema({ title: String }, { collection: 'user_users' });
    const schema = await loadGraphQLSchemaFromMongo('users', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'User',
          schema: userSchema,
          collection: 'user_users',
          options: { fields: { required: ['title'] } },
        },
      ],
    });
    // Present empty scoped map must not fall back to flat requiredFields.
    const transport = (schema.extensions as any).directives.transport;
    transport.options.requiredFieldsByCollection = [];
    transport.options.requiredFields = ['title'];

    const docId = '507f1f77bcf86cd799439011';
    let lastUpdate: Record<string, unknown> | undefined;
    const client: MongoClientLike = {
      async findOne() {
        return { _id: docId, title: null };
      },
      async findMany() {
        return [];
      },
      async count() {
        return 0;
      },
      async insertOne() {
        return { insertedId: docId };
      },
      async insertMany() {
        return { insertedIds: [], insertedCount: 0 };
      },
      async updateOne() {
        return { matchedCount: 0, modifiedCount: 0 };
      },
      async updateMany() {
        return { matchedCount: 0, modifiedCount: 0 };
      },
      async findOneAndUpdate(_c, _f, update) {
        lastUpdate = update as Record<string, unknown>;
        return { value: { _id: docId, title: null }, matchedCount: 1, modifiedCount: 1 };
      },
      async deleteOne() {
        return { deletedCount: 0 };
      },
      async deleteMany() {
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
    const result = await execResult(executor, {
      document: parse(
        `mutation { updateOneUser(query: { title: { eq: "x" } }, update: { set: { title: null } }) { recordId } }`,
      ),
    });
    expect(result.errors).toBeUndefined();
    expect(lastUpdate).toEqual({ $set: { title: null } });
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
