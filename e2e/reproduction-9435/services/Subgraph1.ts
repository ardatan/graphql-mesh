import { createServer } from 'node:http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

const port = Opts(process.argv).getServicePort('Subgraph1');

const variants = {
  nullish: null,
  empty: {
    count: 0,
    items: [],
  },
  full: {
    count: 3,
    items: [
      { key: 'key1', value: 'value1' },
      { key: 'key2', value: 'value2' },
      { key: 'key3', value: 'value3' },
    ],
  },
};

createServer(
  createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type SubComplexDataFieldType {
          key: String
          value: String
        }

        type ComplexDataType {
          count: Int!
          items: [SubComplexDataFieldType!]!
        }

        type Query {
          complexData(id: String!): ComplexDataType
        }
      `,
      resolvers: {
        Query: {
          complexData: (_, { id }: { id: 'nullish' | 'empty' | 'full' }) => variants[id],
        },
      },
    }),
  }),
).listen(port, () => {
  console.log(`Subgraph1 running on http://localhost:${port}/graphql`);
});
