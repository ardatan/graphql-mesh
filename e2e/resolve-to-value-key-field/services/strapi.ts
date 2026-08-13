import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

// CMS products stored in collection order (by id), not request order.
// sku-a has two rows; sku-missing has none — the failure mode for positional mapping.
const products = [
  { id: 'p-2', SKU: 'sku-b', title: 'Product B' },
  { id: 'p-1', SKU: 'sku-a', title: 'Product A' },
  { id: 'p-3', SKU: 'sku-a', title: 'Product A variant' },
];

const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        products(filters: ProductFiltersInput): [Product!]!
      }

      input ProductFiltersInput {
        SKU: StringFilterInput
      }

      input StringFilterInput {
        in: [String!]
      }

      type Product {
        id: ID!
        SKU: String!
        title: String!
      }
    `,
    resolvers: {
      Query: {
        products: (_, { filters }) => {
          const requested = new Set(filters?.SKU?.in ?? []);
          return products.filter(product => requested.has(product.SKU));
        },
      },
    },
  }),
});

const port = Opts(process.argv).getServicePort('strapi', true);

createServer(yoga).listen(port, () => {
  console.log(`Strapi service listening on http://localhost:${port}`);
});
