import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

const opts = Opts(process.argv);

createServer(
  createYoga({
    maskedErrors: false,
    schema: createSchema<any>({
      typeDefs: /* GraphQL */ `
        type Query {
          users(limit: Int!, page: Int): UserSearchResult
        }

        type UserSearchResult {
          page: Int!
          results: [User!]!
        }

        type User {
          id: ID!
        }
      `,
      resolvers: {
        Query: {
          users: () => ({
            page: 1,
            results: [{ id: '1' }, { id: '2' }, { id: '3' }],
          }),
        },
      },
    }),
  }),
).listen(opts.getServicePort('users'));
