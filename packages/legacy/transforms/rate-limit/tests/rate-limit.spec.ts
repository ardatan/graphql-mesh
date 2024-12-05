import { setTimeout } from 'timers/promises';
import { parse } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { defaultImportFn, PubSub } from '@graphql-mesh/utils';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isAsyncIterable } from '@graphql-tools/utils';
import { wrapSchema } from '@graphql-tools/wrap';
import { dummyLogger as logger } from '../../../../testing/dummyLogger';
import RateLimitTransform from '../src/index.js';

describe('Rate Limit Transform', () => {
  let pubsub: PubSub;
  let cache: InMemoryLRUCache;

  beforeEach(() => {
    pubsub = new PubSub();
  });

  afterEach(() => {
    pubsub.publish('destroy', {} as any);
  });

  const baseDir = process.cwd();
  const importFn = defaultImportFn;
  const apiName = 'rate-limit-test';
  it('should throw an error if the rate limit is exceeded', async () => {
    using cache = new InMemoryLRUCache();
    let numberOfCalls = 0;
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => {
            numberOfCalls++;
            return 'bar';
          },
        },
      },
    });
    const rateLimitTransform = new RateLimitTransform({
      apiName,
      config: [
        {
          type: 'Query',
          field: 'foo',
          max: 5,
          ttl: 5000,
          identifier: '{context.userId}',
        },
      ],
      baseDir,
      cache,
      pubsub,
      importFn,
      logger,
    });
    const wrappedSchema = wrapSchema({
      schema,
      transforms: [rateLimitTransform],
    });
    const query = /* GraphQL */ `
      {
        foo
      }
    `;
    const executeQuery = () =>
      normalizedExecutor({
        schema: wrappedSchema,
        document: parse(query),
        contextValue: {
          userId: '1',
        },
      });
    for (let i = 0; i < 5; i++) {
      const result = await executeQuery();

      expect(result).toEqual({
        data: {
          foo: 'bar',
        },
      });
    }
    const result = await executeQuery();
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }

    // Resolver shouldn't be called
    expect(numberOfCalls).toBe(5);
    expect(result.data?.foo).toBeNull();
    const firstError = result.errors?.[0];
    expect(firstError.message).toBe('Rate limit of "Query.foo" exceeded for "1"');
    expect(firstError.path).toEqual(['foo']);
  });
  it('should reset tokens when the ttl is expired', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => 'bar',
        },
      },
    });
    using cache = new InMemoryLRUCache();
    const rateLimitTransform = new RateLimitTransform({
      apiName,
      config: [
        {
          type: 'Query',
          field: 'foo',
          max: 5,
          ttl: 1000,
          identifier: '{context.userId}',
        },
      ],
      baseDir,
      cache,
      pubsub,
      importFn,
      logger,
    });
    const wrappedSchema = wrapSchema({
      schema,
      transforms: [rateLimitTransform],
    });
    const query = /* GraphQL */ `
      {
        foo
      }
    `;
    const executeQuery = () =>
      normalizedExecutor({
        schema: wrappedSchema,
        document: parse(query),
        contextValue: {
          userId: '1',
        },
      });
    for (let i = 0; i < 5; i++) {
      const result = await executeQuery();

      expect(result).toEqual({
        data: {
          foo: 'bar',
        },
      });
    }
    await setTimeout(1000);
    const result = await executeQuery();

    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(result.errors?.length).toBeFalsy();
    expect(result.data?.foo).toBe('bar');
  });
  it('should provide different tokens for different identifiers', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => 'bar',
        },
      },
    });
    using cache = new InMemoryLRUCache();
    const rateLimitTransform = new RateLimitTransform({
      apiName,
      config: [
        {
          type: 'Query',
          field: 'foo',
          max: 1,
          ttl: 1000,
          identifier: '{context.userId}',
        },
      ],
      baseDir,
      cache,
      pubsub,
      importFn,
      logger,
    });
    const wrappedSchema = wrapSchema({
      schema,
      transforms: [rateLimitTransform],
    });
    const query = /* GraphQL */ `
      {
        foo
      }
    `;

    for (let i = 0; i < 2; i++) {
      const executeQuery = () =>
        normalizedExecutor({
          schema: wrappedSchema,
          document: parse(query),
          contextValue: {
            userId: `User${i}`,
          },
        });
      const resultSuccessful = await executeQuery();

      expect(resultSuccessful).toEqual({
        data: {
          foo: 'bar',
        },
      });

      const resultFails = await normalizedExecutor({
        schema: wrappedSchema,
        document: parse(query),
        contextValue: {
          userId: `User${i}`,
        },
      });
      if (isAsyncIterable(resultFails)) {
        throw new Error('Result should not be an async iterable');
      }

      expect(resultFails.data?.foo).toBeNull();
      const firstError = resultFails.errors?.[0];
      expect(firstError.message).toBe(`Rate limit of "Query.foo" exceeded for "User${i}"`);
      expect(firstError.path).toEqual(['foo']);
    }

    expect.assertions(8);
  });
  it('should return other fields even if one of them has fails', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
          bar: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => 'FOO',
          bar: () => 'BAR',
        },
      },
    });

    using cache = new InMemoryLRUCache();
    const rateLimitTransform = new RateLimitTransform({
      apiName,
      config: [
        {
          type: 'Query',
          field: 'foo',
          max: 1,
          ttl: 1000,
          identifier: '{context.userId}',
        },
      ],
      baseDir,
      cache,
      pubsub,
      importFn,
      logger,
    });

    const wrappedSchema = wrapSchema({
      schema,
      transforms: [rateLimitTransform],
    });

    const executeQuery = () =>
      normalizedExecutor({
        schema: wrappedSchema,
        document: parse(/* GraphQL */ `
          query TestQuery {
            foo
            bar
          }
        `),
        contextValue: {
          userId: 'MYUSER',
        },
      });

    await executeQuery();
    const result = await executeQuery();
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(result.data.bar).toBe('BAR');
    expect(result.errors?.[0]?.message).toBe(`Rate limit of "Query.foo" exceeded for "MYUSER"`);
  });
});
