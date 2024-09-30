import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

const opts = Opts(process.argv);

createServer(
  createYoga({
    maskedErrors: false,
    schema: createSchema<any>({
      typeDefs: /* GraphQL */ `
        scalar Upload # intentionally not "File" to test scalar name independence
        type Query {
          hello: String!
        }
        type Mutation {
          readFile(file: Upload!): String
        }
      `,
      resolvers: {
        Query: {
          hello: () => 'world',
        },
        Mutation: {
          readFile(_parent, { file }: { file: File }) {
            return file.text();
          },
        },
      },
    }),
  }),
).listen(opts.getServicePort('bucket'));
