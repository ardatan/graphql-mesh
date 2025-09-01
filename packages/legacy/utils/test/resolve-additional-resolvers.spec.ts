import { parse } from 'graphql';
import { MemPubSub } from '@graphql-hive/pubsub';
import { resolveAdditionalResolversWithoutImport } from '@graphql-mesh/utils';
import type { SubschemaConfig } from '@graphql-tools/delegate';
import { execute, subscribe } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas, ValidationLevel } from '@graphql-tools/stitch';
import { assertAsyncIterable } from '../../testing/utils';

function makeProducts() {
  const data = [
    {
      id: '1',
      name: 'Roomba X',
      price: 100,
    },
    {
      id: '2',
      name: 'Roomba Y',
      price: 200,
    },
    {
      id: '3',
      name: 'Roomba Z',
      price: 300,
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

it('should resolve fields from subgraphs on subscription event', async () => {
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
    pubsub.publish('new_product', { id: '1' });
  }, 0);

  await expect(iter.next()).resolves.toMatchInlineSnapshot(`
{
  "done": false,
  "value": {
    "data": {
      "newProduct": {
        "name": "Roomba X",
        "price": 100,
      },
    },
  },
}
`);

  setTimeout(() => {
    pubsub.publish('new_product', { name: 'Roomba Z' });
  }, 0);

  await expect(iter.next()).resolves.toMatchInlineSnapshot(`
{
  "done": false,
  "value": {
    "data": {
      "newProduct": {
        "name": "Roomba Z",
        "price": 300,
      },
    },
  },
}
`);
});

it('should resolve only missing fields from subgraphs on subscription event', async () => {
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
    pubsub.publish('new_product', { id: '2', price: 999 });
  }, 0);

  await expect(iter.next()).resolves.toMatchInlineSnapshot(`
{
  "done": false,
  "value": {
    "data": {
      "newProduct": {
        "name": "Roomba Y",
        "price": 999,
      },
    },
  },
}
`);

  expect(products.productPriceResolver).toHaveBeenCalledTimes(0);
});

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

it('should resolve from subgraph when fragments are present even if all fields are in the subscription event', async () => {
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
        "price": 300,
      },
    },
  },
}
`);

  expect(products.productPriceResolver).toHaveBeenCalled();
});
