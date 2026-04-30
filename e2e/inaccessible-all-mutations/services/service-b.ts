import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

const opts = Opts(process.argv);

const users = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
];

createServer(
  createYoga({
    maskedErrors: false,
    schema: createSchema<any>({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
        }

        type Mutation {
          addUser(name: String!): User!
        }
      `,
      resolvers: {
        Query: {
          users: () => users,
        },
        Mutation: {
          addUser(_: any, { name }: { name: string }) {
            const newUser = { id: String(users.length + 1), name };
            users.push(newUser);
            return newUser;
          },
        },
      },
    }),
  }),
).listen(opts.getServicePort('service-b'));
