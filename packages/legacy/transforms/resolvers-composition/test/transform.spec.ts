import { join } from 'path';
import { parse } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import type { Logger } from '@graphql-mesh/types';
import { DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isAsyncIterable } from '@graphql-tools/utils';
import ResolversCompositionTransform, { type ResolversComposition } from '../src/index.js';

describe('transform', () => {
  const logger: Logger = {
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: () => logger,
  };
  const baseDir: string = undefined;

  it('should handle composition functions from external modules', async () => {
    const transform = new ResolversCompositionTransform({
      cache: new InMemoryLRUCache(),
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
      cache: new InMemoryLRUCache(),
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
