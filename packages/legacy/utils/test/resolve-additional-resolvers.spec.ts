import { parse } from 'graphql';
import { MemPubSub } from '@graphql-hive/pubsub';
import { resolveAdditionalResolversWithoutImport } from '@graphql-mesh/utils';
import { execute, subscribe } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas, ValidationLevel } from '@graphql-tools/stitch';
import { assertAsyncIterable } from '../../testing/utils';

it('should resolve missing fields from subgraphs on subscription event', async () => {
  const products = makeExecutableSchema({
    typeDefs: parse(/* GraphQL */ `
      type Query {
        productById(id: ID!): Product
      }
      type Product {
        id: ID!
        name: String!
        price: Float!
      }
    `),
    resolvers: {
      Query: {
        productById: (_, { id }) => ({
          id,
          name: `Roomba X${id}`,
          price: 100,
        }),
      },
    },
  });

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

  const stitched = stitchSchemas({
    subschemas: [
      {
        schema: products,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fieldName: 'productById',
            args: ({ id }) => ({ id }),
          },
        },
      },
    ],
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
    pubsub.publish('new_product', { id: '60' });
  }, 0);

  await expect(iter.next()).resolves.toMatchInlineSnapshot(`
{
  "done": false,
  "value": {
    "data": {
      "newProduct": {
        "name": "Roomba X60",
        "price": 100,
      },
    },
  },
}
`);
});
