import PrefixTransform from '../src';
import { buildSchema, printSchema, GraphQLSchema, GraphQLObjectType } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from 'graphql-subscriptions';
import { wrapSchema } from '@graphql-tools/wrap';

describe('wrapPrefix', () => {
  let schema: GraphQLSchema;
  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;

  beforeEach(() => {
    schema = buildSchema(/* GraphQL */ `
      type Query {
        user: User!
        posts: [Post!]!
      }

      type User {
        id: ID!
      }

      type Post {
        id: ID!
        title: String!
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
          apiName: '',
          baseDir,
          cache,
          pubsub,
          syncImportFn: require,
        }),
      ],
    });

    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect((newSchema.getType('Query') as GraphQLObjectType).getFields()).not.toHaveProperty('T_user');
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
          apiName: '',
          baseDir,
          cache,
          pubsub,
          syncImportFn: require,
        }),
      ],
    });

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_Query')).toBeUndefined();
  });

  it('should not modify default scalar types', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new PrefixTransform({
          config: {
            value: 'T_',
          },
          apiName: '',
          baseDir,
          cache,
          pubsub,
          syncImportFn: require,
        }),
      ],
    });

    const postFields = (newSchema.getType('T_Post') as GraphQLObjectType).getFields();
    expect(postFields.id.type.toString()).toBe('ID!');
    expect(postFields.title.type.toString()).toBe('String!');
  });

  it('should use apiName when its available', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new PrefixTransform({
          config: {},
          apiName: 'MyApi',
          baseDir,
          cache,
          pubsub,
          syncImportFn: require,
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
          apiName: '',
          baseDir,
          cache,
          pubsub,
          syncImportFn: require,
        }),
      ],
    });

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('User')).toBeDefined();
  });

  it('should modify fields', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new PrefixTransform({
          config: {
            value: 'T_',
            includeRootOperations: true,
          },
          apiName: '',
          baseDir,
          cache,
          pubsub,
          syncImportFn: require,
        }),
      ],
    });

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect((newSchema.getType('Query') as GraphQLObjectType).getFields()).toHaveProperty('T_user');
  });

  it('should allow to ignore all fields in Type', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new PrefixTransform({
          config: {
            value: 'T_',
            includeRootOperations: true,
            ignore: ['Query'],
          },
          apiName: '',
          baseDir,
          cache,
          pubsub,
          syncImportFn: require,
        }),
      ],
    });

    const queryFields = (newSchema.getType('Query') as GraphQLObjectType).getFields();
    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect(newSchema.getType('User')).toBeUndefined();
    expect(queryFields).not.toHaveProperty('T_user');
    expect(queryFields).toHaveProperty('user');
    expect(queryFields).not.toHaveProperty('T_posts');
    expect(queryFields).toHaveProperty('posts');
  });

  it('should allow to ignore specific fields', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new PrefixTransform({
          config: {
            value: 'T_',
            includeRootOperations: true,
            ignore: ['Query.user'],
          },
          apiName: '',
          baseDir,
          cache,
          pubsub,
          syncImportFn: require,
        }),
      ],
    });

    const queryFields = (newSchema.getType('Query') as GraphQLObjectType).getFields();
    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect(newSchema.getType('User')).toBeUndefined();
    expect(queryFields).not.toHaveProperty('T_user');
    expect(queryFields).toHaveProperty('user');
    expect(queryFields).toHaveProperty('T_posts');
    expect(queryFields).not.toHaveProperty('posts');
  });
});
