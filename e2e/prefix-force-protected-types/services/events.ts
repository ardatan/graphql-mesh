import { createServer } from 'http';
import { GraphQLScalarType } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

const opts = Opts(process.argv);

const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  serialize: value => value,
  parseValue: value => value,
});

createServer(
  createYoga({
    maskedErrors: false,
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        scalar DateTime

        type Query {
          nextEvent: Event!
        }

        type Event {
          name: String!
          startsAt: DateTime!
        }
      `,
      resolvers: {
        DateTime,
        Query: {
          nextEvent: () => ({
            name: 'MeshConf',
            startsAt: '2030-01-01T00:00:00.000Z',
          }),
        },
      },
    }),
  }),
).listen(opts.getServicePort('events'));
