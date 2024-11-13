import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import { createPrefixTransform } from '@graphql-mesh/fusion-composition';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { composeAndGetExecutor, composeAndGetPublicSchema, expectTheSchemaSDLToBe } from './utils';

describe('Prefix', () => {
  let schema: GraphQLSchema;
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
  });
  it('prefixes all schema types when the prefix is specified explicitly', async () => {
    const transform = createPrefixTransform({
      value: 'T_',
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);
    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect((newSchema.getType('Query') as GraphQLObjectType).getFields()).not.toHaveProperty(
      'T_user',
    );
    expectTheSchemaSDLToBe(
      newSchema,
      /* GraphQL */ `
        type Query {
          user: T_User!
          posts: [T_Post!]!
          node(id: ID!): T_Node
        }

        union T_Node = T_User | T_Post

        type T_User {
          id: ID!
        }

        type T_Post {
          id: ID!
          title: String!
        }
      `,
    );
  });
  it('does not modify the root types', async () => {
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [
          createPrefixTransform({
            value: 'T_',
          }),
        ],
      },
    ]);
    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_Query')).toBeUndefined();
  });
  it('does not modify default scalar types', async () => {
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [
          createPrefixTransform({
            value: 'T_',
          }),
        ],
      },
    ]);
    const postFields = (newSchema.getType('T_Post') as GraphQLObjectType).getFields();
    expect(postFields.id.type.toString()).toBe('ID!');
    expect(postFields.title.type.toString()).toBe('String!');
  });
  it('uses the name of the subgraph when it is available', async () => {
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'MyApi',
        schema,
        transforms: [createPrefixTransform()],
      },
    ]);

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('MyApi_User')).toBeDefined();
  });
  it('allows to ignore types', async () => {
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [
          createPrefixTransform({
            value: 'T_',
            ignore: ['User'],
          }),
        ],
      },
    ]);
    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('User')).toBeDefined();
  });
  it('modifies fields', async () => {
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [
          createPrefixTransform({
            value: 'T_',
            includeRootOperations: true,
          }),
        ],
      },
    ]);
    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect((newSchema.getType('Query') as GraphQLObjectType).getFields()).toHaveProperty('T_user');
  });
  it('allows to ignore all fields in a type', async () => {
    const transform = createPrefixTransform({
      value: 'T_',
      includeRootOperations: true,
      ignore: ['Query'],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    const queryFields = (newSchema.getType('Query') as GraphQLObjectType).getFields();
    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect(newSchema.getType('User')).toBeUndefined();
    expect(queryFields).not.toHaveProperty('T_user');
    expect(queryFields).toHaveProperty('user');
    expect(queryFields).not.toHaveProperty('T_posts');
    expect(queryFields).toHaveProperty('posts');
  });
  it('allows to ignore specific fields', async () => {
    const transform = createPrefixTransform({
      value: 'T_',
      includeRootOperations: true,
      ignore: ['Query.user'],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    const queryFields = (newSchema.getType('Query') as GraphQLObjectType).getFields();
    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect(newSchema.getType('User')).toBeUndefined();
    expect(queryFields).not.toHaveProperty('T_user');
    expect(queryFields).toHaveProperty('user');
    expect(queryFields).toHaveProperty('T_posts');
    expect(queryFields).not.toHaveProperty('posts');
  });
  it('allows to ignore types', async () => {
    const transform = createPrefixTransform({
      value: 'T_',
      includeRootOperations: true,
      includeTypes: false,
    });

    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_User')).toBeUndefined();
    expect(newSchema.getType('User')).toBeDefined();
  });
  it('handles union type resolution', async () => {
    const transform = createPrefixTransform({
      value: 'T_',
      includeRootOperations: true,
    });

    const executor = composeAndGetExecutor([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    const result = await executor({
      query: /* GraphQL */ `
        query {
          T_node(id: "1") {
            __typename
          }
        }
      `,
    });
    expect(result).toEqual({
      T_node: {
        __typename: 'T_User',
      },
    });
  });
});
