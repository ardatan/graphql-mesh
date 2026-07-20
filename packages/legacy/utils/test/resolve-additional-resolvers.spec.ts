/* eslint-disable import/no-extraneous-dependencies */
import { parse, type ExecutionResult } from 'graphql';
import { MemPubSub } from '@graphql-hive/pubsub';
import type { RawSourceOutput } from '@graphql-mesh/types';
import {
  DefaultLogger,
  getInContextSDK,
  resolveAdditionalResolversWithoutImport,
} from '@graphql-mesh/utils';
import type { SubschemaConfig } from '@graphql-tools/delegate';
import { execute, subscribe } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas, ValidationLevel } from '@graphql-tools/stitch';
import { assertAsyncIterable } from '../../testing/utils';

function makeReviews() {
  const data = [
    { id: '1', content: 'Great vacuum!' },
    { id: '2', content: 'Does the job.' },
    { id: '3', content: 'Worth every penny.' },
  ];
  const schema = makeExecutableSchema({
    typeDefs: parse(/* GraphQL */ `
      type Query {
        reviewById(id: ID!): Review
      }
      type Review {
        id: ID!
        content: String
      }
    `),
    resolvers: {
      Query: {
        reviewById: (_, { id }) => data.find(r => r.id === id),
      },
    },
  });
  return {
    schema,
    subschemas: [
      {
        schema,
        merge: {
          Review: {
            selectionSet: '{ id }',
            fieldName: 'reviewById',
            args: ({ id }) => ({ id }),
          },
        },
      },
    ] as SubschemaConfig[],
  };
}

function makeProducts() {
  const data = [
    {
      id: '1',
      name: 'Roomba X',
      price: 100,
      review: { id: '1' },
    },
    {
      id: '2',
      name: 'Roomba Y',
      price: 200,
      review: { id: '2' },
    },
    {
      id: '3',
      name: 'Roomba Z',
      price: 300,
      review: { id: '3' },
    },
  ];
  const productPriceResolver = jest.fn((parent: { price: number }) => parent.price);
  const productByNameResolver = jest.fn((_, { name }) => data.find(p => p.name === name));
  const schema = makeExecutableSchema({
    typeDefs: parse(/* GraphQL */ `
      type Query {
        productById(id: ID!): Product
        productByName(name: String!): Product
      }
      type Product {
        id: ID!
        name: String!
        price: Float!
        review: Review
      }
      type Review {
        id: ID!
      }
    `),
    resolvers: {
      Query: {
        productById: (_, { id }) => data.find(p => p.id === id),
        productByName: productByNameResolver,
      },
      Product: {
        price: productPriceResolver,
      },
    },
  });
  return {
    schema,
    productByNameResolver,
    productPriceResolver,
    subschemas: [
      {
        schema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fieldName: 'productById',
            args: ({ id }) => ({ id }),
          },
        },
      },
      {
        schema,
        merge: {
          Product: {
            selectionSet: '{ name }',
            fieldName: 'productByName',
            args: ({ name }) => ({ name }),
          },
        },
      },
    ] as SubschemaConfig[],
  };
}

it('should not resolve from subgraphs when all fields are in the subscription event', async () => {
  await using pubsub = new MemPubSub();
  const additionalTypeDefs = parse(/* GraphQL */ `
    extend schema {
      subscription: Subscription
    }
    type Subscription {
      newProduct: Product!
    }
  `);
  const additionalResolvers = resolveAdditionalResolversWithoutImport(
    {
      targetTypeName: 'Subscription',
      targetFieldName: 'newProduct',
      pubsubTopic: 'new_product',
    },
    pubsub,
  );

  const products = makeProducts();
  const stitched = stitchSchemas({
    subschemas: products.subschemas,
    typeDefs: additionalTypeDefs,
    resolvers: additionalResolvers,
  });

  const result = await subscribe({
    schema: stitched,
    document: parse(/* GraphQL */ `
      subscription {
        newProduct {
          name
          price
        }
      }
    `),
  });
  assertAsyncIterable(result);
  const iter = result[Symbol.asyncIterator]();

  setTimeout(() => {
    pubsub.publish('new_product', { name: 'Roborock 80c', price: 999 });
  }, 0);

  await expect(iter.next()).resolves.toMatchInlineSnapshot(`
{
  "done": false,
  "value": {
    "data": {
      "newProduct": {
        "name": "Roborock 80c",
        "price": 999,
      },
    },
  },
}
`);

  expect(products.productByNameResolver).toHaveBeenCalledTimes(0);
  expect(products.productPriceResolver).toHaveBeenCalledTimes(0);
});

it('should not resolve from subgraphs with fragments when all fields are in the subscription event', async () => {
  await using pubsub = new MemPubSub();
  const additionalTypeDefs = parse(/* GraphQL */ `
    extend schema {
      subscription: Subscription
    }
    type Subscription {
      newProduct: Product!
    }
  `);
  const additionalResolvers = resolveAdditionalResolversWithoutImport(
    {
      targetTypeName: 'Subscription',
      targetFieldName: 'newProduct',
      pubsubTopic: 'new_product',
    },
    pubsub,
  );

  const products = makeProducts();
  const stitched = stitchSchemas({
    subschemas: products.subschemas,
    typeDefs: additionalTypeDefs,
    resolvers: additionalResolvers,
  });

  const result = await subscribe({
    schema: stitched,
    document: parse(/* GraphQL */ `
      subscription {
        newProduct {
          ...P
        }
      }
      fragment P on Product {
        price
      }
    `),
  });
  assertAsyncIterable(result);
  const iter = result[Symbol.asyncIterator]();

  setTimeout(() => {
    pubsub.publish('new_product', { id: '3', price: 999 });
  }, 0);

  await expect(iter.next()).resolves.toMatchInlineSnapshot(`
{
  "done": false,
  "value": {
    "data": {
      "newProduct": {
        "price": 999,
      },
    },
  },
}
`);

  expect(products.productPriceResolver).toHaveBeenCalledTimes(0);
});

// End-to-end regression for a key-based (batch) additional resolver whose parent
// key is null. Before the fix, a null key fell through to a keyless delegation:
// an arg-less query to the source whose list result was projected onto the
// singular target field, surfacing as a non-null-field error.
describe('key-based (batch) additional resolver with a null parent key', () => {
  // Source subgraph: `ids` is optional, so an arg-less call would be accepted and
  // return a list; `name` is a non-null leaf.
  function makeUsers() {
    const usersByIds = jest.fn((_root: unknown, { ids }: { ids?: string[] }) =>
      (ids || []).map(id => ({ id, name: `User ${id}` })),
    );
    const schema = makeExecutableSchema({
      typeDefs: parse(/* GraphQL */ `
        type Query {
          usersByIds(ids: [ID!]): [User]!
        }
        type User {
          id: ID!
          name: String!
        }
      `),
      resolvers: { Query: { usersByIds } },
    });
    return { schema, usersByIds };
  }

  // Parent subgraph: a post with a nullable `authorId` foreign key.
  function makePosts(authorId: string | null) {
    return makeExecutableSchema({
      typeDefs: parse(/* GraphQL */ `
        type Query {
          posts: [Post!]!
        }
        type Post {
          id: ID!
          authorId: ID
        }
      `),
      resolvers: {
        Query: { posts: () => [{ id: 'post-1', authorId }] },
      },
    });
  }

  function buildScenario(authorId: string | null) {
    const users = makeUsers();
    const postsSchema = makePosts(authorId);

    const usersRawSource: RawSourceOutput = {
      name: 'users',
      schema: users.schema,
      transforms: [],
      contextVariables: {},
      handler: {} as RawSourceOutput['handler'],
      batch: true,
      createProxyingResolver: () => undefined as any,
    };
    const inContextSDK = getInContextSDK(
      users.schema,
      [usersRawSource],
      new DefaultLogger('test'),
      [],
    );

    const additionalResolvers = resolveAdditionalResolversWithoutImport({
      targetTypeName: 'Post',
      targetFieldName: 'author',
      requiredSelectionSet: '{ authorId }',
      keyField: 'authorId',
      keysArg: 'ids',
      sourceName: 'users',
      sourceTypeName: 'Query',
      sourceFieldName: 'usersByIds',
    } as any);

    const stitched = stitchSchemas({
      subschemas: [{ schema: postsSchema }, { schema: users.schema }] as SubschemaConfig[],
      typeDefs: parse(/* GraphQL */ `
        extend type Post {
          author: User
        }
      `),
      resolvers: additionalResolvers,
    });

    return { stitched, contextValue: { ...inContextSDK }, users };
  }

  it('resolves the relation to null without delegating or a non-null error', async () => {
    const { stitched, contextValue, users } = buildScenario(null);

    const result = (await execute({
      schema: stitched,
      document: parse(/* GraphQL */ `
        {
          posts {
            id
            author {
              name
            }
          }
        }
      `),
      contextValue,
    })) as ExecutionResult;

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ posts: [{ id: 'post-1', author: null }] });
    // A null key must not trigger an (arg-less) delegation to the source.
    expect(users.usersByIds).not.toHaveBeenCalled();
  });

  it('still resolves the relation via batch delegation when the key is present', async () => {
    const { stitched, contextValue, users } = buildScenario('user-1');

    const result = (await execute({
      schema: stitched,
      document: parse(/* GraphQL */ `
        {
          posts {
            id
            author {
              id
              name
            }
          }
        }
      `),
      contextValue,
    })) as ExecutionResult;

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      posts: [{ id: 'post-1', author: { id: 'user-1', name: 'User user-1' } }],
    });
    expect(users.usersByIds).toHaveBeenCalledTimes(1);
    expect(users.usersByIds.mock.calls[0][1]).toEqual({ ids: ['user-1'] });
  });
});
