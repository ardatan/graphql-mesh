import PrefixTransform from '../src';
import { printSchema, GraphQLSchema, GraphQLObjectType, execute, parse } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import { MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('barePrefix', () => {
  let schema: GraphQLSchema;
  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;

  beforeEach(() => {
    schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          user: User!
          posts: [Post!]!
          node(id: ID!): Node
        }

        union Node = User | Post

        type User {
          id: ID!
        }

        type Post {
          id: ID!
          title: String!
        }
      `,
      resolvers: {
        Query: {
          node(_, { id }) {
            return {
              id,
            };
          },
        },
        Node: {
          __resolveType(obj: any) {
            if (obj.title) {
              return 'Post';
            }
            return 'User';
          },
        },
      },
    });
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should prefix all schema types when prefix is specified explicitly', () => {
    const newSchema = new PrefixTransform({
      config: {
        mode: 'bare',
        value: 'T_',
      },
      apiName: '',
      baseDir,
      cache,
      pubsub,
      importFn: m => import(m),
    }).transformSchema(schema, { schema }, schema);

    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should not modify root types', () => {
    const newSchema = new PrefixTransform({
      config: {
        mode: 'bare',
        value: 'T_',
      },
      apiName: '',
      baseDir,
      cache,
      pubsub,
      importFn: m => import(m),
    }).transformSchema(schema, { schema }, schema);

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_Query')).toBeUndefined();
  });

  it('should not modify default scalar types', () => {
    const newSchema = new PrefixTransform({
      config: {
        mode: 'bare',
        value: 'T_',
      },
      apiName: '',
      baseDir,
      cache,
      pubsub,
      importFn: m => import(m),
    }).transformSchema(schema, { schema }, schema);

    const postFields = (newSchema.getType('T_Post') as GraphQLObjectType).getFields();
    expect(postFields.id.type.toString()).toBe('ID!');
    expect(postFields.title.type.toString()).toBe('String!');
  });

  it('should use apiName when its available', () => {
    const newSchema = new PrefixTransform({
      apiName: 'MyApi',
      config: { mode: 'bare' },
      baseDir,
      cache,
      pubsub,
      importFn: m => import(m),
    }).transformSchema(schema, { schema }, schema);

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('MyApi_User')).toBeDefined();
  });

  it('should allow to ignore types', () => {
    const newSchema = new PrefixTransform({
      config: {
        mode: 'bare',
        value: 'T_',
        ignore: ['User'],
      },
      apiName: '',
      baseDir,
      cache,
      pubsub,
      importFn: m => import(m),
    }).transformSchema(schema, { schema }, schema);

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('User')).toBeDefined();
  });

  it('should modify fields', () => {
    const newSchema = new PrefixTransform({
      config: {
        mode: 'bare',
        value: 'T_',
        includeRootOperations: true,
      },
      apiName: '',
      baseDir,
      cache,
      pubsub,
      importFn: m => import(m),
    }).transformSchema(schema, { schema }, schema);

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect((newSchema.getType('Query') as GraphQLObjectType).getFields()).toHaveProperty('T_user');
  });

  it('should allow to ignore all fields in Type', () => {
    const newSchema = new PrefixTransform({
      config: {
        mode: 'bare',
        value: 'T_',
        includeRootOperations: true,
        ignore: ['Query'],
      },
      apiName: '',
      baseDir,
      cache,
      pubsub,
      importFn: m => import(m),
    }).transformSchema(schema, { schema }, schema);

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
    const newSchema = new PrefixTransform({
      config: {
        mode: 'bare',
        value: 'T_',
        includeRootOperations: true,
        ignore: ['Query.user'],
      },
      apiName: '',
      baseDir,
      cache,
      pubsub,
      importFn: m => import(m),
    }).transformSchema(schema, { schema }, schema);

    const queryFields = (newSchema.getType('Query') as GraphQLObjectType).getFields();
    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect(newSchema.getType('User')).toBeUndefined();
    expect(queryFields).not.toHaveProperty('T_user');
    expect(queryFields).toHaveProperty('user');
    expect(queryFields).toHaveProperty('T_posts');
    expect(queryFields).not.toHaveProperty('posts');
  });
  it('should handle union type resolution', async () => {
    const newSchema = new PrefixTransform({
      config: {
        mode: 'bare',
        value: 'T_',
        includeRootOperations: true,
      },
      apiName: '',
      baseDir,
      cache,
      pubsub,
      importFn: m => import(m),
    }).transformSchema(schema, { schema }, schema);

    const result = await execute({
      schema: newSchema,
      document: parse(/* GraphQL */ `
        query {
          T_node(id: "1") {
            __typename
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        T_node: {
          __typename: 'T_User',
        },
      },
    });
  });
});
