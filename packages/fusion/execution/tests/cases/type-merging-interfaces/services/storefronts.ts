import { GraphQLError, print } from 'graphql';
import { createSchema } from 'graphql-yoga';

// data fixtures
const storefronts = [
  {
    id: '1',
    name: 'eShoppe',
    productOfferKeys: ['Product:1', 'ProductDeal:1', 'Product:2'],
  },
  {
    id: '2',
    name: 'BestBooks Online',
    productOfferKeys: ['Product:3', 'Product:4', 'ProductDeal:2', 'Product:5'],
  },
];

const productDeals = [
  { id: '1', name: 'iPhone + Survival Guide', price: 679.99, productIds: ['1', '5'] },
  { id: '2', name: 'Best Sellers', price: 19.99, productIds: ['3', '4'] },
];

export const storefrontsSchema = createSchema({
  typeDefs: /* GraphQL */ `
    interface ProductOffering {
      id: ID!
    }

    type Product implements ProductOffering {
      id: ID!
    }

    type ProductDeal implements ProductOffering {
      id: ID!
      name: String!
      price: Float!
      products: [Product]!
    }

    type Storefront {
      id: ID!
      name: String!
      productOfferings: [ProductOffering]!
    }

    type Query {
      storefront(id: ID!): Storefront
    }
  `,
  resolvers: {
    Query: {
      storefront: (_root, { id }) =>
        storefronts.find(s => s.id === id) ||
        new GraphQLError('Record not found', {
          extensions: {
            code: 'NOT_FOUND',
          },
        }),
    },
    Storefront: {
      productOfferings(storefront, _args, _ctx, info) {
        return storefront.productOfferKeys.map(key => {
          const [__typename, id] = key.split(':');
          const obj = __typename === 'Product' ? { id } : productDeals.find(d => d.id === id);
          return obj
            ? { __typename, ...obj }
            : new GraphQLError('Record not found', {
                extensions: {
                  code: 'NOT_FOUND',
                },
              });
        });
      },
    },
    ProductDeal: {
      products: deal => deal.productIds.map(id => ({ id })),
    },
  },
});
