import { createServer } from 'http';
import { setTimeout as delay } from 'timers/promises';
import { print } from 'graphql';
import { createSchema, createYoga, type Plugin } from 'graphql-yoga';
import { Opts } from '@e2e/opts';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';

const opts = Opts(process.argv);

/** Operations the gateway sent upstream - used to assert @defer was forwarded. */
const receivedQueries: string[] = [];
let blurbResolverCalls = 0;

const recordQueries: Plugin = {
  onParams({ params }) {
    if (typeof params.query === 'string') {
      receivedQueries.push(`onParams:${params.query}`);
    }
  },
  onExecute({ args }) {
    try {
      receivedQueries.push(`onExecute:${print(args.document)}`);
    } catch {
      // ignore
    }
  },
  onSubscribe({ args }) {
    try {
      receivedQueries.push(`onSubscribe:${print(args.document)}`);
    } catch {
      // ignore
    }
  },
};

/**
 * Nested slow field (`details.blurb`) is what mesh will hoist to `productBlurb`.
 * The subgraph speaks the original shape and supports incremental delivery.
 */
const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Product {
      id: ID!
      name: String!
      details: Details!
    }
    type Details {
      summary: String!
      blurb: String
      boom: String
    }
    type Query {
      product(id: ID!): Product
    }
  `,
  resolvers: {
    Query: {
      product: (_: unknown, { id }: { id: string }) => ({ id }),
    },
    Product: {
      name: () => 'Widget',
      details: () => ({}),
    },
    Details: {
      summary: () => 'In stock',
      blurb: async () => {
        blurbResolverCalls += 1;
        await delay(150);
        return 'A carefully deferred product blurb';
      },
      boom: async () => {
        await delay(50);
        throw new Error('deferred boom');
      },
    },
  },
});

const yoga = createYoga({
  schema,
  maskedErrors: false,
  plugins: [useDeferStream(), recordQueries],
});

const server = createServer((req, res) => {
  if (req.url === '/_queries') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        queries: receivedQueries,
        blurbResolverCalls,
      }),
    );
    return;
  }
  return yoga(req, res);
});

server.listen(opts.getServicePort('catalog'), () => {
  console.log(`Catalog subgraph on http://localhost:${opts.getServicePort('catalog')}/graphql`);
});
