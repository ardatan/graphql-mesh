import { defaultImportFn, PubSub } from '@graphql-mesh/utils';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import RateLimitTransform from '../src';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { wrapSchema } from '@graphql-tools/wrap';
import { execute, parse } from 'graphql';

describe('Rate Limit Transform', () => {
  it('should throw an error if the rate limit is exceeded', async () => {
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
    const rateLimitTransform = new RateLimitTransform({
      apiName: 'TEST',
      config: [
        {
          type: 'Query',
          field: 'foo',
          max: 5,
          ttl: 5000,
          identifier: '{context.userId}',
        },
      ],
      baseDir: process.cwd(),
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      importFn: defaultImportFn,
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
      execute({
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

    expect(result.data?.foo).toBeNull();
    const firstError = result.errors?.[0];
    expect(firstError.message).toBe('Rate limit of exceeded for "1"');
    expect(firstError.path).toEqual(['Query', 'foo']);
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
    const rateLimitTransform = new RateLimitTransform({
      apiName: 'TEST',
      config: [
        {
          type: 'Query',
          field: 'foo',
          max: 5,
          ttl: 1000,
          identifier: '{context.userId}',
        },
      ],
      baseDir: process.cwd(),
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      importFn: defaultImportFn,
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
      execute({
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
    const rateLimitTransform = new RateLimitTransform({
      apiName: 'TEST',
      config: [
        {
          type: 'Query',
          field: 'foo',
          max: 1,
          ttl: 1000,
          identifier: '{context.userId}',
        },
      ],
      baseDir: process.cwd(),
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      importFn: defaultImportFn,
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
        execute({
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

      const resultFails = await execute({
        schema: wrappedSchema,
        document: parse(query),
        contextValue: {
          userId: `User${i}`,
        },
      });

      expect(resultFails.data?.foo).toBeNull();
      const firstError = resultFails.errors?.[0];
      expect(firstError.message).toBe(`Rate limit of exceeded for "User${i}"`);
      expect(firstError.path).toEqual(['Query', 'foo']);
    }

    expect.assertions(8);
  });
});
