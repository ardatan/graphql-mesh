import prefixTransform from '../src';
import { buildSchema, printSchema, GraphQLSchema } from 'graphql';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { Hooks } from '@graphql-mesh/types';
import { EventEmitter } from 'events';

describe('prefix', () => {
  let schema: GraphQLSchema;
  let cache: InMemoryLRUCache;
  let hooks: Hooks;

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
    hooks = new EventEmitter() as Hooks;
  });

  it('should prefix all schema types when prefix is specified explicitly', async () => {
    const newSchema = await prefixTransform({
      schema,
      config: {
        value: 'T_',
      },
      cache,
      hooks,
    });

    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should not modify root types', async () => {
    const newSchema = await prefixTransform({
      schema,
      config: {
        value: 'T_',
      },
      cache,
      hooks,
    });

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_Query')).toBeUndefined();
  });

  it('should use apiName when its available', async () => {
    const newSchema = await prefixTransform({
      schema,
      apiName: 'MyApi',
      config: {},
      cache,
      hooks,
    });

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('MyApi_User')).toBeDefined();
  });

  it('should allow to ignore types', async () => {
    const newSchema = await prefixTransform({
      schema,
      config: {
        value: 'T_',
        ignore: ['User'],
      },
      cache,
      hooks,
    });

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('User')).toBeDefined();
  });
});
