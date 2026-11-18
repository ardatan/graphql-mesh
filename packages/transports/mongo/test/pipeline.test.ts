import { parse } from 'graphql';
import { Schema } from 'mongoose';
import { loadGraphQLSchemaFromMongo } from '@omnigraph/mongo';
import { getMongoExecutor } from '../src/execution.js';
import { buildMongoFilter } from '../src/filter.js';
import type { MongoClientLike } from '../src/types.js';

function stubClient(overrides: Partial<MongoClientLike> = {}): MongoClientLike {
  return {
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
      return { insertedId: '1' };
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
    async deleteOne() {
      return { deletedCount: 0 };
    },
    async deleteMany() {
      return { deletedCount: 0 };
    },
    async aggregate() {
      return [];
    },
    dispose() {},
    ...overrides,
  };
}

describe('AGGREGATE pipeline', () => {
  it('runs client pipeline stages and $match: $args.where rewrite', async () => {
    const userSchema = new Schema(
      {
        name: String,
        gender: String,
        salaryDecimal: { type: Schema.Types.Decimal128 },
      },
      { collection: 'user_users' },
    );
    const schema = await loadGraphQLSchemaFromMongo('users', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [{ name: 'User', schema: userSchema, collection: 'user_users' }],
    });

    let lastPipeline: Record<string, unknown>[] = [];
    const client = stubClient({
      async aggregate(_c, pipeline) {
        lastPipeline = pipeline;
        return [{ _id: 'female', count: 2 }];
      },
    });

    const executor = getMongoExecutor({ subgraph: schema, client });
    const result = await executor({
      document: parse(`
        query Agg($pipeline: JSON) {
          aggregateUsers(where: { gender: { eq: "female" } }, pipeline: $pipeline)
        }
      `),
      variables: {
        pipeline: [{ $group: { _id: '$gender', count: { $sum: 1 } } }],
      },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      aggregateUsers: [{ _id: 'female', count: 2 }],
    });
    expect(lastPipeline).toEqual([{ $group: { _id: '$gender', count: { $sum: 1 } } }]);

    await executor({
      document: parse(`
        query Agg($pipeline: JSON) {
          aggregateUsers(where: { gender: { eq: "female" } }, pipeline: $pipeline)
        }
      `),
      variables: {
        pipeline: [{ $match: '$args.where' }, { $group: { _id: '$gender', count: { $sum: 1 } } }],
      },
    });
    expect(lastPipeline[0]).toEqual({
      $match: buildMongoFilter(`$args.where`, {
        args: { where: { gender: { eq: 'female' } } },
      }),
    });
  });
});

describe('typed error payload', () => {
  it('returns error on payload when error field is selected', async () => {
    const userSchema = new Schema({ name: String }, { collection: 'user_users' });
    const schema = await loadGraphQLSchemaFromMongo('users', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [{ name: 'User', schema: userSchema, collection: 'user_users' }],
    });

    const client = stubClient({
      async insertOne() {
        throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
      },
    });

    const executor = getMongoExecutor({ subgraph: schema, client });
    const withError = await executor({
      document: parse(`
        mutation {
          createUser(input: { name: "Ada" }) {
            record { name }
            error { message }
          }
        }
      `),
    });
    expect(withError.errors).toBeUndefined();
    expect(withError.data).toEqual({
      createUser: {
        record: null,
        error: { message: 'E11000 duplicate key' },
      },
    });

    const withoutError = await executor({
      document: parse(`
        mutation {
          createUser(input: { name: "Ada" }) {
            record { name }
          }
        }
      `),
    });
    expect(withoutError.errors?.length).toBeGreaterThan(0);
  });
});
