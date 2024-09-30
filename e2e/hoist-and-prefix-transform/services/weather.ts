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
          here: Weather
        }

        type Weather {
          rain: Rain!
        }

        type Rain {
          chance: Float!
        }
      `,
      resolvers: {
        Query: {
          here: () => ({
            rain: { chance: 1 },
          }),
        },
      },
    }),
  }),
).listen(opts.getServicePort('weather'));
