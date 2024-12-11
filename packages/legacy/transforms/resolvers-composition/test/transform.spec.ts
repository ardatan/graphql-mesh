import { join } from 'path';
import { parse } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { PubSub } from '@graphql-mesh/utils';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isAsyncIterable } from '@graphql-tools/utils';
import { dummyLogger as logger } from '../../../../testing/dummyLogger';
import ResolversCompositionTransform, { type ResolversComposition } from '../src/index.js';

describe('transform', () => {
  const baseDir: string = undefined;
  using cache = new InMemoryLRUCache();

  it('should handle composition functions from external modules', async () => {
    const transform = new ResolversCompositionTransform({
      cache,
      pubsub: new PubSub(),
      config: [
        {
          resolver: 'Query.foo',
          composer: join(__dirname, './fixtures/composer.js'),
        },
      ],
      baseDir,
      apiName: '',
      importFn: m => import(m),

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => 'BAR',
        },
      },
    });
    const transformedSchema = transform.transformSchema(schema);
    const result = await normalizedExecutor({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          foo
        }
      `),
    });
    if (isAsyncIterable(result)) {
      throw new Error('Unexpected AsyncIterable');
    }
    expect(result.data?.foo).toBe('FOO');
  });
  it('should handle composition functions from functions', async () => {
    const composer: ResolversComposition = next => (root, args, context, info) => 'FOO';
    const transform = new ResolversCompositionTransform({
      cache,
      pubsub: new PubSub(),
      config: [
        {
          resolver: 'Query.foo',
          composer,
        },
      ],
      baseDir,
      apiName: '',
      importFn: m => import(m),

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => 'BAR',
        },
      },
    });
    const transformedSchema = transform.transformSchema(schema);
    const result = await normalizedExecutor({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          foo
        }
      `),
    });
    if (isAsyncIterable(result)) {
      throw new Error('Unexpected AsyncIterable');
    }
    expect(result.data?.foo).toBe('FOO');
  });
});
