import Transform from '../src/index';
import { execute, parse, getIntrospectionQuery } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from 'graphql-subscriptions';
import { wrapSchema } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('encapsulate', () => {
  const baseDir: string = undefined;
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        getSomething: String
        getSomethingElse: String
      }

      type Mutation {
        doSomething: String
        doSomethingElse: String
      }

      type Subscription {
        notify: String!
      }
    `,
    resolvers: {
      Query: {
        getSomething: () => 'boop',
      },
      Mutation: {
        doSomething: () => 'noop',
      },
    },
  });
  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;

  beforeEach(() => {
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should wrap the schema and group Mutation correctly', async () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new Transform({
          config: {},
          cache,
          pubsub,
          baseDir,
          apiName: 'test',
        }),
      ],
    });

    expect(newSchema.getMutationType().getFields().test).toBeDefined();
    expect(newSchema.getMutationType().getFields().notify).not.toBeDefined();
    expect(newSchema.getMutationType().getFields().test.type.toString()).toBe('testMutation');
  });

  it('should wrap the schema and group Subscription correctly', async () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new Transform({
          config: {},
          cache,
          pubsub,
          baseDir,
          apiName: 'test',
        }),
      ],
    });

    expect(newSchema.getSubscriptionType().getFields().test).toBeDefined();
    expect(newSchema.getSubscriptionType().getFields().getSomething).not.toBeDefined();
    expect(newSchema.getSubscriptionType().getFields().test.type.toString()).toBe('testSubscription');
  });

  it('should wrap the schema and group Query correctly', async () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new Transform({
          config: {},
          cache,
          pubsub,
          baseDir,
          apiName: 'test',
        }),
      ],
    });

    expect(newSchema.getQueryType().getFields().test).toBeDefined();
    expect(newSchema.getQueryType().getFields().getSomething).not.toBeDefined();
    expect(newSchema.getQueryType().getFields().test.type.toString()).toBe('testQuery');
  });

  it('should execute queries the same way and preserve execution flow', async () => {
    const { data: resultBefore } = await execute({
      schema,
      document: parse(`{ getSomething }`),
    });
    expect(resultBefore.getSomething).toBe('boop');

    const newSchema = wrapSchema({
      schema,
      transforms: [
        new Transform({
          config: {},
          cache,
          pubsub,
          baseDir,
          apiName: 'test',
        }),
      ],
    });

    const { data: resultAfter } = await execute({
      schema: newSchema,
      document: parse(`{ test { getSomething } }`),
    });

    expect(resultAfter.test.getSomething).toBe('boop');
  });

  it('should execute mutations the same way and preserve execution flow', async () => {
    const { data: resultBefore } = await execute({
      schema,
      document: parse(`mutation { doSomething }`),
    });
    expect(resultBefore.doSomething).toBe('noop');

    const newSchema = wrapSchema({
      schema,
      transforms: [
        new Transform({
          config: {},
          cache,
          pubsub,
          baseDir,
          apiName: 'test',
        }),
      ],
    });

    const { data: resultAfter } = await execute({
      schema: newSchema,
      document: parse(`mutation { test { doSomething } }`),
    });

    expect(resultAfter.test.doSomething).toBe('noop');
  });

  it("should be able to introspect even it's partial", async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          getSomething: String
          getSomethingElse: String
        }
      `,
      resolvers: {
        Query: {
          getSomething: () => 'boop',
        },
      },
    });

    const newSchema = wrapSchema({
      schema,
      transforms: [
        new Transform({
          config: {},
          cache,
          pubsub,
          baseDir,
          apiName: 'test',
        }),
      ],
    });

    const { data } = await execute({
      schema: newSchema,
      document: parse(getIntrospectionQuery()),
    });

    expect(data).not.toBeNull();
  });
});
