import { parse, type ExecutionResult } from 'graphql';
import { Schema } from 'mongoose';
import { loadGraphQLSchemaFromMongo } from '@omnigraph/mongo';
import { getMongoExecutor } from '../src/execution.js';
import { buildMongoFilter } from '../src/filter.js';
import type { MongoClientLike } from '../src/types.js';

async function execResult(
  executor: ReturnType<typeof getMongoExecutor>,
  args: Parameters<ReturnType<typeof getMongoExecutor>>[0],
): Promise<ExecutionResult> {
  return (await executor(args)) as ExecutionResult;
}

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
    ...overrides,
  };
}

describe('AGGREGATE pipeline', () => {
  it('runs client pipeline stages and $match: $args.filter rewrite', async () => {
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
    const result = await execResult(executor, {
      document: parse(`
        query Agg($pipeline: JSON) {
          aggregateUsers(filter: { gender: { eq: "female" } }, pipeline: $pipeline)
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
    expect(lastPipeline).toEqual([
      { $match: { gender: 'female' } },
      { $group: { _id: '$gender', count: { $sum: 1 } } },
    ]);

    lastPipeline = [];
    const rewritten = await execResult(executor, {
      document: parse(`
        query Agg($pipeline: JSON) {
          aggregateUsers(filter: { gender: { eq: "female" } }, pipeline: $pipeline)
        }
      `),
      variables: {
        pipeline: [{ $match: '$args.filter' }, { $group: { _id: '$gender', count: { $sum: 1 } } }],
      },
    });
    expect(rewritten.errors).toBeUndefined();
    expect(lastPipeline).toEqual([
      {
        $match: buildMongoFilter(`$args.filter`, {
          args: { filter: { gender: { eq: 'female' } } },
        }),
      },
      { $group: { _id: '$gender', count: { $sum: 1 } } },
    ]);

    const rejected = await execResult(executor, {
      document: parse(`
        query Agg($pipeline: JSON) {
          aggregateUsers(pipeline: $pipeline)
        }
      `),
      variables: {
        pipeline: [{ $merge: { into: 'other' } }],
      },
    });
    expect(rejected.errors?.[0]?.message).toMatch(/\$merge|\$out/);
  });
});

describe('write failures', () => {
  it('surfaces driver failures as GraphQL errors (no payload error field)', async () => {
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
    const result = await execResult(executor, {
      document: parse(`
        mutation {
          insertOneUser(document: { name: "Ada" }) {
            name
          }
        }
      `),
    });
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.errors?.[0]?.message).toMatch(/E11000/);
    expect(result.errors?.[0]?.extensions?.code).toBe('DOWNSTREAM_SERVICE_ERROR');
    expect((result.errors?.[0]?.extensions as any)?.mongo?.code).toBe(11000);
    expect(result.data?.insertOneUser).toBeNull();
  });
});
