import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { EventEmitter } from 'events';
import { join } from 'path';
import ResolversCompositionTransform, { ResolversComposition } from '../src';
import { applySchemaTransforms } from '@graphql-tools/utils';
import { execute, parse } from 'graphql';

describe('transform', () => {
  it('should handle composition functions from external modules', async () => {
    const transform = new ResolversCompositionTransform({
      cache: new InMemoryLRUCache(),
      hooks: new EventEmitter() as any,
      config: [
        {
          resolver: 'Query.foo',
          composer: join(__dirname, './fixtures/composer.js'),
        },
      ],
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
    const transformedSchema = applySchemaTransforms(schema, [transform]);
    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          foo
        }
      `),
    });
    expect(result.data?.foo).toBe('FOO');
  });
  it('should handle composition functions from functions', async () => {
    const composer: ResolversComposition = next => (root, args, context, info) => 'FOO';
    const transform = new ResolversCompositionTransform({
      cache: new InMemoryLRUCache(),
      hooks: new EventEmitter() as any,
      config: [
        {
          resolver: 'Query.foo',
          composer,
        },
      ],
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
    const transformedSchema = applySchemaTransforms(schema, [transform]);
    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          foo
        }
      `),
    });
    expect(result.data?.foo).toBe('FOO');
  });
});
