import PrefixTransform from '../src';
import { buildSchema, printSchema, GraphQLSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from 'graphql-subscriptions';
import { wrapSchema } from '@graphql-tools/wrap';

describe('prefix', () => {
  let schema: GraphQLSchema;
  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;

  beforeEach(() => {
    schema = buildSchema(/* GraphQL */ `
      type Query {
        user: User!
      }

      type User {
        id: ID!
      }
    `);
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should prefix all schema types when prefix is specified explicitly', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new PrefixTransform({
          config: {
            value: 'T_',
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should not modify root types', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new PrefixTransform({
          config: {
            value: 'T_',
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_Query')).toBeUndefined();
  });

  it('should use apiName when its available', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new PrefixTransform({
          apiName: 'MyApi',
          config: {},
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('MyApi_User')).toBeDefined();
  });

  it('should allow to ignore types', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new PrefixTransform({
          config: {
            value: 'T_',
            ignore: ['User'],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('User')).toBeDefined();
  });
});
