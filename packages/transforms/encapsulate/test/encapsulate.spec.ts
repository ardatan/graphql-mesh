import { execute, getIntrospectionQuery, parse } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import { ImportFn, MeshPubSub } from '@graphql-mesh/types';
import { DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { wrapSchema } from '@graphql-tools/wrap';
import Transform from '../src/index.js';

describe('encapsulate', () => {
  const baseDir: string = undefined;
  const importFn: ImportFn = m => import(m);
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
          importFn,
          logger: new DefaultLogger(),
        }),
      ],
    });

    expect(newSchema.getMutationType().getFields().test).toBeDefined();
    expect(newSchema.getMutationType().getFields().notify).not.toBeDefined();
    expect(newSchema.getMutationType().getFields().test.type.toString()).toBe('testMutation!');
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
          importFn,
          logger: new DefaultLogger(),
        }),
      ],
    });

    expect(newSchema.getSubscriptionType().getFields().test).toBeDefined();
    expect(newSchema.getSubscriptionType().getFields().getSomething).not.toBeDefined();
    expect(newSchema.getSubscriptionType().getFields().test.type.toString()).toBe(
      'testSubscription!',
    );
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
          importFn,
          logger: new DefaultLogger(),
        }),
      ],
    });

    expect(newSchema.getQueryType().getFields().test).toBeDefined();
    expect(newSchema.getQueryType().getFields().getSomething).not.toBeDefined();
    expect(newSchema.getQueryType().getFields().test.type.toString()).toBe('testQuery!');
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
          importFn,
          logger: new DefaultLogger(),
        }),
      ],
    });

    const { data: resultAfter }: any = await execute({
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
          importFn,
          logger: new DefaultLogger(),
        }),
      ],
    });

    const { data: resultAfter }: any = await execute({
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
          importFn,
          logger: new DefaultLogger(),
        }),
      ],
    });

    const { data } = await execute({
      schema: newSchema,
      document: parse(getIntrospectionQuery()),
    });

    expect(data).not.toBeNull();
  });

  const customSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      schema {
        query: CustomQuery
        mutation: CustomMutation
        subscription: CustomSubscription
      }

      type CustomQuery {
        retrieveSomething: String!
      }

      type CustomMutation {
        doSomething: String!
      }

      type CustomSubscription {
        notifySomething: String!
      }
    `,
    resolvers: {
      CustomQuery: {
        retrieveSomething: () => 'something retrieved',
      },
      CustomMutation: {
        doSomething: () => 'something done',
      },
      CustomSubscription: {
        notifySomething: () => 'something notified',
      },
    },
  });

  it('should be able to encapsulate schema root types with custom names', async () => {
    const newCustomSchema = wrapSchema({
      schema: customSchema,
      transforms: [
        new Transform({
          config: {
            name: 'MyCustomSchema',
          },
          cache,
          pubsub,
          baseDir,
          apiName: undefined,
          importFn,
          logger: new DefaultLogger(),
        }),
      ],
    });

    expect(newCustomSchema.getQueryType().getFields().MyCustomSchema).toBeDefined();
    expect(newCustomSchema.getQueryType().getFields().MyCustomSchema.type.toString()).toBe(
      'MyCustomSchemaQuery!',
    );
    expect(
      (newCustomSchema.getQueryType().getFields().MyCustomSchema.type as any).ofType._fields
        .retrieveSomething,
    ).toBeDefined();
    expect(newCustomSchema.getMutationType().getFields().MyCustomSchema).toBeDefined();
    expect(newCustomSchema.getMutationType().getFields().MyCustomSchema.type.toString()).toBe(
      'MyCustomSchemaMutation!',
    );
    expect(
      (newCustomSchema.getMutationType().getFields().MyCustomSchema.type as any).ofType._fields
        .doSomething,
    ).toBeDefined();
    expect(newCustomSchema.getSubscriptionType().getFields().MyCustomSchema).toBeDefined();
    expect(newCustomSchema.getSubscriptionType().getFields().MyCustomSchema.type.toString()).toBe(
      'MyCustomSchemaSubscription!',
    );
    expect(
      (newCustomSchema.getSubscriptionType().getFields().MyCustomSchema.type as any).ofType._fields
        .notifySomething,
    ).toBeDefined();
  });

  it('should respect the settings in applyTo', async () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new Transform({
          config: {
            applyTo: {
              subscription: false,
              mutation: false,
            },
          },
          cache,
          pubsub,
          baseDir,
          apiName: 'test',
          importFn,
          logger: new DefaultLogger(),
        }),
      ],
    });
    expect(newSchema.getMutationType().getFields().test).not.toBeDefined();
    expect(newSchema.getMutationType().getFields().doSomething).toBeDefined();
    expect(newSchema.getSubscriptionType().getFields().test).not.toBeDefined();
    expect(newSchema.getSubscriptionType().getFields().notify).toBeDefined();
    expect(newSchema.getQueryType().getFields().test).toBeDefined();
    expect(newSchema.getQueryType().getFields().getSomething).not.toBeDefined();
    expect(newSchema.getQueryType().getFields().test.type.toString()).toBe('testQuery!');
  });
});
