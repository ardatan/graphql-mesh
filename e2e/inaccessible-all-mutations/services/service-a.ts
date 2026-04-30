import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

const opts = Opts(process.argv);

const todos = [
  { id: '1', title: 'Buy milk' },
  { id: '2', title: 'Walk the dog' },
];

createServer(
  createYoga({
    maskedErrors: false,
    schema: createSchema<any>({
      typeDefs: /* GraphQL */ `
        type Query {
          todos: [Todo!]!
        }

        type Todo {
          id: ID!
          title: String!
        }

        type Mutation {
          createTodo(title: String!): Todo!
        }
      `,
      resolvers: {
        Query: {
          todos: () => todos,
        },
        Mutation: {
          createTodo(_: any, { title }: { title: string }) {
            const newTodo = { id: String(todos.length + 1), title };
            todos.push(newTodo);
            return newTodo;
          },
        },
      },
    }),
  }),
).listen(opts.getServicePort('service-a'));
