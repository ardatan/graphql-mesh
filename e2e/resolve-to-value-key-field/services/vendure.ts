import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

// Shop product-search hits — parent side of the join (keyField: sku).
const searchResults = [
  { id: 's-1', sku: 'sku-a' },
  { id: 's-2', sku: 'sku-missing' },
  { id: 's-3', sku: 'sku-b' },
];

const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        search: [SearchResult!]!
      }

      type SearchResult {
        id: ID!
        sku: String!
      }
    `,
    resolvers: {
      Query: {
        search: () => searchResults,
      },
    },
  }),
});

const port = Opts(process.argv).getServicePort('vendure', true);

createServer(yoga).listen(port, () => {
  console.log(`Vendure service listening on http://localhost:${port}`);
});
