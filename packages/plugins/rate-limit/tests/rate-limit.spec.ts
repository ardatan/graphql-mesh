/* eslint-disable import/no-extraneous-dependencies */
import { DefaultLogger, PubSub } from '@graphql-mesh/utils';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import useMeshRateLimit from '../src';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { envelop, useSchema } from '@envelop/core';
import { Logger } from '@graphql-mesh/types';

describe('Rate Limit Plugin', () => {
  let pubsub: PubSub;
  let cache: InMemoryLRUCache;
  let logger: Logger;

  beforeEach(() => {
    pubsub = new PubSub();
    cache = new InMemoryLRUCache();
    logger = new DefaultLogger('test-rate-limit');
  });

  afterEach(() => {
    pubsub.publish('destroy', {} as any);
  });

  it('should throw an error if the rate limit is exceeded', async () => {
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
    const getEnveloped = envelop({
      plugins: [
        useSchema(schema),
        useMeshRateLimit({
          config: [
            {
              type: 'Query',
              field: 'foo',
              max: 5,
              ttl: 5000,
              identifier: '{context.userId}',
            },
          ],
          logger,
          cache,
          pubsub,
        }),
      ],
    });
    const query = /* GraphQL */ `
      {
        foo
      }
    `;
    const executeQuery = async () => {
      const { schema, execute, parse, contextFactory } = getEnveloped({
        userId: '1',
      });
      return execute({
        schema,
        document: parse(query),
        contextValue: await contextFactory(),
      });
    };
    for (let i = 0; i < 5; i++) {
      const result = await executeQuery();

      expect(result).toEqual({
        data: {
          foo: 'bar',
        },
      });
    }
    const result = await executeQuery();

    // Resolver shouldn't be called
    expect(numberOfCalls).toBe(5);
    expect(result.data?.foo).toBeUndefined();
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
    const getEnveloped = envelop({
      plugins: [
        useSchema(schema),
        useMeshRateLimit({
          config: [
            {
              type: 'Query',
              field: 'foo',
              max: 5,
              ttl: 1000,
              identifier: '{context.userId}',
            },
          ],
          cache,
          pubsub,
          logger,
        }),
      ],
    });
    const query = /* GraphQL */ `
      {
        foo
      }
    `;
    const executeQuery = async () => {
      const { schema, execute, parse, contextFactory } = getEnveloped({
        userId: '1',
      });
      return execute({
        schema,
        document: parse(query),
        contextValue: await contextFactory(),
      });
    };
    for (let i = 0; i < 5; i++) {
      const result = await executeQuery();

      expect(result).toEqual({
        data: {
          foo: 'bar',
        },
      });
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    const result = await executeQuery();

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
    const getEnveloped = envelop({
      plugins: [
        useSchema(schema),
        useMeshRateLimit({
          config: [
            {
              type: 'Query',
              field: 'foo',
              max: 1,
              ttl: 1000,
              identifier: '{context.userId}',
            },
          ],
          cache,
          pubsub,
          logger,
        }),
      ],
    });
    const query = /* GraphQL */ `
      {
        foo
      }
    `;

    for (let i = 0; i < 2; i++) {
      const executeQuery = async () => {
        const { schema, execute, parse, contextFactory } = getEnveloped({
          userId: `User${i}`,
        });
        return execute({
          schema,
          document: parse(query),
          contextValue: await contextFactory(),
        });
      };
      const resultSuccessful = await executeQuery();

      expect(resultSuccessful).toEqual({
        data: {
          foo: 'bar',
        },
      });

      const { schema, execute, parse, contextFactory } = getEnveloped({
        userId: `User${i}`,
      });

      const resultFails = await execute({
        schema,
        document: parse(query),
        contextValue: await contextFactory(),
      });

      expect(resultFails.data?.foo).toBeUndefined();
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

    const getEnveloped = envelop({
      plugins: [
        useSchema(schema),
        useMeshRateLimit({
          config: [
            {
              type: 'Query',
              field: 'foo',
              max: 1,
              ttl: 1000,
              identifier: '{context.userId}',
            },
          ],
          cache,
          pubsub,
          logger,
        }),
      ],
    });

    const executeQuery = async () => {
      const { schema, execute, parse, contextFactory } = getEnveloped({
        userId: 'MYUSER',
      });
      return execute({
        schema,
        document: parse(/* GraphQL */ `
          query TestQuery {
            foo
            bar
          }
        `),
        contextValue: await contextFactory(),
      });
    };

    await executeQuery();
    const result = await executeQuery();
    expect(result.data.bar).toBe('BAR');
    expect(result.errors?.[0]?.message).toBe(`Rate limit of "Query.foo" exceeded for "MYUSER"`);
  });
});
