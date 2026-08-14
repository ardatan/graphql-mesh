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

// Collection-style batched sources (Strapi/Hasura/SQL IN (...)) do not guarantee
// result order or one-row-per-key. valueKeyField matches results back by a field
// on each result instead of by array position.
describe('key-based (batch) additional resolver with valueKeyField', () => {
  function makeProductsBySku() {
    const products = [
      { id: 'p-2', sku: 'sku-b', title: 'Product B' },
      { id: 'p-1', sku: 'sku-a', title: 'Product A' },
      { id: 'p-3', sku: 'sku-a', title: 'Product A variant' },
    ];
    const productsBySkus = jest.fn((_root: unknown, { skus }: { skus?: string[] }) => {
      const requested = new Set(skus || []);
      // Intentionally return matches in collection order, not request order, and
      // allow gaps / multiples — the failure mode without valueKeyField.
      return products.filter(product => requested.has(product.sku));
    });
    const schema = makeExecutableSchema({
      typeDefs: parse(/* GraphQL */ `
        type Query {
          productsBySkus(skus: [String!]): [Product!]!
        }
        type Product {
          id: ID!
          sku: String!
          title: String!
        }
      `),
      resolvers: { Query: { productsBySkus } },
    });
    return { schema, productsBySkus };
  }

  function makeSearchResults() {
    return makeExecutableSchema({
      typeDefs: parse(/* GraphQL */ `
        type Query {
          searchResults: [SearchResult!]!
        }
        type SearchResult {
          id: ID!
          sku: String!
        }
      `),
      resolvers: {
        Query: {
          searchResults: () => [
            { id: 's-1', sku: 'sku-a' },
            { id: 's-2', sku: 'sku-missing' },
            { id: 's-3', sku: 'sku-b' },
          ],
        },
      },
    });
  }

  function buildScenario(fieldType: '[Product!]!' | 'Product') {
    const products = makeProductsBySku();
    const searchSchema = makeSearchResults();

    const productsRawSource: RawSourceOutput = {
      name: 'products',
      schema: products.schema,
      transforms: [],
      contextVariables: {},
      handler: {} as RawSourceOutput['handler'],
      batch: true,
      createProxyingResolver: () => undefined as any,
    };
    const inContextSDK = getInContextSDK(
      products.schema,
      [productsRawSource],
      new DefaultLogger('test'),
      [],
    );

    const additionalResolvers = resolveAdditionalResolversWithoutImport({
      targetTypeName: 'SearchResult',
      targetFieldName: 'products',
      requiredSelectionSet: '{ sku }',
      keyField: 'sku',
      keysArg: 'skus',
      valueKeyField: 'sku',
      sourceName: 'products',
      sourceTypeName: 'Query',
      sourceFieldName: 'productsBySkus',
    } as any);

    const stitched = stitchSchemas({
      subschemas: [{ schema: searchSchema }, { schema: products.schema }] as SubschemaConfig[],
      typeDefs: parse(/* GraphQL */ `
        extend type SearchResult {
          products: ${fieldType}
        }
      `),
      resolvers: additionalResolvers,
      typeMergingOptions: {
        validationSettings: { validationLevel: ValidationLevel.Off },
      },
    });

    return { stitched, contextValue: { ...inContextSDK }, products };
  }

  it('matches unordered collection results back to keys for list fields', async () => {
    const { stitched, contextValue, products } = buildScenario('[Product!]!');

    const result = (await execute({
      schema: stitched,
      document: parse(/* GraphQL */ `
        {
          searchResults {
            id
            products {
              id
              sku
              title
            }
          }
        }
      `),
      contextValue,
    })) as ExecutionResult;

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      searchResults: [
        {
          id: 's-1',
          products: [
            { id: 'p-1', sku: 'sku-a', title: 'Product A' },
            { id: 'p-3', sku: 'sku-a', title: 'Product A variant' },
          ],
        },
        {
          id: 's-2',
          products: [],
        },
        {
          id: 's-3',
          products: [{ id: 'p-2', sku: 'sku-b', title: 'Product B' }],
        },
      ],
    });
    expect(products.productsBySkus).toHaveBeenCalledTimes(1);
    expect(products.productsBySkus.mock.calls[0][1].skus).toEqual([
      'sku-a',
      'sku-missing',
      'sku-b',
    ]);
  });

  it('matches unordered collection results back to keys for singular fields', async () => {
    const { stitched, contextValue } = buildScenario('Product');

    const result = (await execute({
      schema: stitched,
      document: parse(/* GraphQL */ `
        {
          searchResults {
            id
            products {
              id
              sku
              title
            }
          }
        }
      `),
      contextValue,
    })) as ExecutionResult;

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      searchResults: [
        {
          id: 's-1',
          products: { id: 'p-1', sku: 'sku-a', title: 'Product A' },
        },
        {
          id: 's-2',
          products: null,
        },
        {
          id: 's-3',
          products: { id: 'p-2', sku: 'sku-b', title: 'Product B' },
        },
      ],
    });
  });

  it('requests valueKeyField even when the client selection omits it', async () => {
    const { stitched, contextValue, products } = buildScenario('[Product!]!');

    const result = (await execute({
      schema: stitched,
      document: parse(/* GraphQL */ `
        {
          searchResults {
            id
            products {
              title
            }
          }
        }
      `),
      contextValue,
    })) as ExecutionResult;

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      searchResults: [
        {
          id: 's-1',
          products: [{ title: 'Product A' }, { title: 'Product A variant' }],
        },
        {
          id: 's-2',
          products: [],
        },
        {
          id: 's-3',
          products: [{ title: 'Product B' }],
        },
      ],
    });
    // Matching still works, which means sku was fetched for correlation.
    expect(products.productsBySkus).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate valueKeyField when the client already selects it with directives', async () => {
    const { stitched, contextValue } = buildScenario('[Product!]!');

    const result = (await execute({
      schema: stitched,
      document: parse(/* GraphQL */ `
        query ($includeSku: Boolean!) {
          searchResults {
            id
            products {
              sku @include(if: $includeSku)
              title
            }
          }
        }
      `),
      variableValues: { includeSku: true },
      contextValue,
    })) as ExecutionResult;

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      searchResults: [
        {
          id: 's-1',
          products: [
            { sku: 'sku-a', title: 'Product A' },
            { sku: 'sku-a', title: 'Product A variant' },
          ],
        },
        {
          id: 's-2',
          products: [],
        },
        {
          id: 's-3',
          products: [{ sku: 'sku-b', title: 'Product B' }],
        },
      ],
    });
  });
});

// Encapsulate hides the real source field as `_encapsulated_<name>_<field>` with
// @inaccessible; federation then strips it from the supergraph (`info.schema`).
// `@resolveTo` with a `result` path must still wrap the client selection set
// (e.g. `items[0]` → `{ items { ... } }`) without looking that field up.
describe('@resolveTo result path when the source field is missing from the gateway schema', () => {
  it('infers sourceSelectionSet from result without crashing', async () => {
    const variants: Record<
      string,
      { count: number; items: { key: string; value: string }[] } | null
    > = {
      nullish: null,
      empty: { count: 0, items: [] },
      full: {
        count: 3,
        items: [
          { key: 'key1', value: 'value1' },
          { key: 'key2', value: 'value2' },
          { key: 'key3', value: 'value3' },
        ],
      },
    };

    const sourceSchema = makeExecutableSchema({
      typeDefs: parse(/* GraphQL */ `
        type SubComplexDataFieldType {
          key: String
          value: String
        }
        type ComplexDataType {
          count: Int!
          items: [SubComplexDataFieldType!]!
        }
        type Query {
          _encapsulated_Subgraph1_complexData(id: String!): ComplexDataType
        }
      `),
      resolvers: {
        Query: {
          _encapsulated_Subgraph1_complexData: (_: unknown, { id }: { id: string }) => variants[id],
        },
      },
    });

    const parentSchema = makeExecutableSchema({
      typeDefs: parse(/* GraphQL */ `
        type TargetType {
          id: String
        }
        type TargetQuery {
          targets: [TargetType]
        }
        type Query {
          targetQuery: TargetQuery
        }
      `),
      resolvers: {
        Query: {
          targetQuery: () => ({}),
        },
        TargetQuery: {
          targets: () => [{ id: 'nullish' }, { id: 'empty' }, { id: 'full' }],
        },
      },
    });

    const sourceRaw: RawSourceOutput = {
      name: 'Subgraph1',
      schema: sourceSchema,
      transforms: [],
      contextVariables: {},
      handler: {} as RawSourceOutput['handler'],
      batch: true,
      createProxyingResolver: () => undefined as any,
    };
    const inContextSDK = getInContextSDK(sourceSchema, [sourceRaw], new DefaultLogger('test'), []);

    const additionalResolvers = resolveAdditionalResolversWithoutImport({
      targetTypeName: 'TargetType',
      targetFieldName: 'complexDataItem',
      requiredSelectionSet: '{ id }',
      sourceName: 'Subgraph1',
      sourceTypeName: 'Query',
      sourceFieldName: '_encapsulated_Subgraph1_complexData',
      sourceArgs: { id: '{root.id}' },
      result: 'items[0]',
    });

    // Supergraph does not expose the inaccessible encapsulated field.
    const stitched = stitchSchemas({
      subschemas: [{ schema: parentSchema }] as SubschemaConfig[],
      typeDefs: parse(/* GraphQL */ `
        type SubComplexDataFieldType {
          key: String
          value: String
        }
        extend type TargetType {
          complexDataItem: SubComplexDataFieldType
        }
      `),
      resolvers: additionalResolvers,
    });

    const result = (await execute({
      schema: stitched,
      document: parse(/* GraphQL */ `
        {
          targetQuery {
            targets {
              id
              complexDataItem {
                key
                value
              }
            }
          }
        }
      `),
      contextValue: { ...inContextSDK },
    })) as ExecutionResult;

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      targetQuery: {
        targets: [
          { id: 'nullish', complexDataItem: null },
          { id: 'empty', complexDataItem: null },
          { id: 'full', complexDataItem: { key: 'key1', value: 'value1' } },
        ],
      },
    });
  });
});
