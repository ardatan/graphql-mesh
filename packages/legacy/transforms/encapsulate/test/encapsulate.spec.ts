import { getIntrospectionQuery, parse } from 'graphql';
import { envelop, useEngine, useSchema } from '@envelop/core';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import type { ImportFn, MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isAsyncIterable } from '@graphql-tools/utils';
import { wrapSchema } from '@graphql-tools/wrap';
import { Repeater } from '@repeaterjs/repeater';
import { dummyLogger as logger } from '../../../../testing/dummyLogger';
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
      Subscription: {
        notify: {
          subscribe: () =>
            new Repeater((push, stop) => {
              const interval = setInterval(
                () =>
                  push({
                    notify: 'boop',
                  }),
                1000,
              );
              return stop.then(() => clearInterval(interval));
            }),
        },
      },
    },
  });
  let pubsub: MeshPubSub;

  beforeEach(() => {
    pubsub = new PubSub();
  });

  it('should wrap the schema and group Mutation correctly', async () => {
    using cache = new InMemoryLRUCache();
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
          logger,
        }),
      ],
    });

    expect(newSchema.getMutationType().getFields().test).toBeDefined();
    expect(newSchema.getMutationType().getFields().notify).not.toBeDefined();
    expect(newSchema.getMutationType().getFields().test.type.toString()).toBe('testMutation!');
  });

  it('should wrap the schema and group Subscription correctly', async () => {
    using cache = new InMemoryLRUCache();
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
          logger,
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
    using cache = new InMemoryLRUCache();
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
          logger,
        }),
      ],
    });

    expect(newSchema.getQueryType().getFields().test).toBeDefined();
    expect(newSchema.getQueryType().getFields().getSomething).not.toBeDefined();
    expect(newSchema.getQueryType().getFields().test.type.toString()).toBe('testQuery!');
  });

  it('should execute queries the same way and preserve execution flow', async () => {
    const resultBefore = await normalizedExecutor({
      schema,
      document: parse(`{ getSomething }`),
    });
    if (isAsyncIterable(resultBefore)) {
      throw new Error('Query did not return ExecutionResult');
    }
    expect(resultBefore.data.getSomething).toBe('boop');

    using cache = new InMemoryLRUCache();
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
          logger,
        }),
      ],
    });

    const resultAfter = await normalizedExecutor({
      schema: newSchema,
      document: parse(`{ test { getSomething } }`),
    });

    if (isAsyncIterable(resultAfter)) {
      throw new Error('Query did not return ExecutionResult');
    }

    expect(resultAfter.data.test.getSomething).toBe('boop');
  });

  it('should execute mutations the same way and preserve execution flow', async () => {
    const resultBefore = await normalizedExecutor({
      schema,
      document: parse(`mutation { doSomething }`),
    });
    if (isAsyncIterable(resultBefore)) {
      throw new Error('Query did not return ExecutionResult');
    }
    expect(resultBefore.data.doSomething).toBe('noop');

    using cache = new InMemoryLRUCache();
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
          logger,
        }),
      ],
    });

    const { data: resultAfter }: any = await normalizedExecutor({
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

    using cache = new InMemoryLRUCache();
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
          logger,
        }),
      ],
    });

    const result = await normalizedExecutor({
      schema: newSchema,
      document: parse(getIntrospectionQuery()),
    });

    if (isAsyncIterable(result)) {
      throw new Error('Query did not return ExecutionResult');
    }
    expect(result.data).not.toBeNull();
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
    using cache = new InMemoryLRUCache();
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
          logger,
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
    using cache = new InMemoryLRUCache();
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
          logger,
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

  it('should handle subscriptions', async () => {
    using cache = new InMemoryLRUCache();
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new Transform({
          config: {
            applyTo: {
              query: true,
              mutation: true,
              subscription: true,
            },
          },
          cache,
          pubsub,
          baseDir,
          apiName: 'test',
          importFn,
          logger,
        }),
      ],
    });

    const result = await normalizedExecutor({
      schema: newSchema,
      document: parse(/* GraphQL */ `
        subscription {
          test {
            notify
          }
        }
      `),
    });

    if (!isAsyncIterable<any>(result)) {
      throw new Error('Subscription did not return AsyncIterable');
    }

    // eslint-disable-next-line no-unreachable-loop
    for await (const value of result) {
      expect(value.data.test.notify).toBe('boop');
      break;
    }
  });

  it('should handle subscriptions', async () => {
    using cache = new InMemoryLRUCache();
    const getEnveloped = envelop({
      plugins: [
        useEngine({
          execute: normalizedExecutor,
          subscribe: normalizedExecutor,
        }),
        useSchema(
          wrapSchema({
            schema,
            transforms: [
              new Transform({
                config: {
                  applyTo: {
                    query: true,
                    mutation: true,
                    subscription: true,
                  },
                },
                cache,
                pubsub,
                baseDir,
                apiName: 'test',
                importFn,

                logger,
              }),
            ],
          }),
        ),
      ],
    });
    const { schema: newSchema, subscribe } = getEnveloped();
    const result = (await subscribe({
      schema: newSchema,
      document: parse(/* GraphQL */ `
        subscription {
          test {
            notify
          }
        }
      `),
    })) as AsyncIterable<any>;

    if (!isAsyncIterable<any>(result)) {
      throw new Error('Subscription did not return AsyncIterable');
    }

    // eslint-disable-next-line no-unreachable-loop
    for await (const value of result) {
      expect(value.data.test.notify).toBe('boop');
      break;
    }
  });
});
