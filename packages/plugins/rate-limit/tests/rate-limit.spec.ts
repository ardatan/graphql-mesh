/* eslint-disable import/no-extraneous-dependencies */
import { setTimeout } from 'timers/promises';
import { parse, specifiedRules, validate } from 'graphql';
import { envelop, useEngine, useSchema } from '@envelop/core';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import useMeshRateLimit from '../src/index.js';

describe('Rate Limit Plugin', () => {
  const graphQLEnginePlugin = useEngine({
    parse,
    validate,
    execute: normalizedExecutor,
    subscribe: normalizedExecutor,
    specifiedRules,
  });

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
    const getEnveloped = envelop({
      plugins: [
        graphQLEnginePlugin,
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
          cache,
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
    expect(result.data?.foo).toBeFalsy();
    const firstError = result.errors?.[0];
    expect(firstError.message).toBe('Rate limit of "Query.foo" exceeded for "1"');
    expect(firstError.path).toEqual(['foo']);
  });
  it('should reset tokens when the ttl is expired', async () => {
    using cache = new InMemoryLRUCache();
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
        graphQLEnginePlugin,
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
    await setTimeout(1000);
    const result = await executeQuery();

    expect(result.errors?.length).toBeFalsy();
    expect(result.data?.foo).toBe('bar');
  });
  it('should provide different tokens for different identifiers', async () => {
    using cache = new InMemoryLRUCache();
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
        graphQLEnginePlugin,
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

      expect(resultFails.data?.foo).toBeFalsy();
      const firstError = resultFails.errors?.[0];
      expect(firstError.message).toBe(`Rate limit of "Query.foo" exceeded for "User${i}"`);
      expect(firstError.path).toEqual(['foo']);
    }

    expect.assertions(8);
  });
  it('should return other fields even if one of them has fails', async () => {
    using cache = new InMemoryLRUCache();
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
        graphQLEnginePlugin,
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
