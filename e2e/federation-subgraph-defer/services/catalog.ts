import { createServer } from 'http';
import { setTimeout as delay } from 'timers/promises';
import { parse } from 'graphql';
import { createYoga, type Plugin } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';

const opts = Opts(process.argv);

/** Operations the gateway sent upstream - used to assert @defer was forwarded. */
const receivedQueries: string[] = [];

const recordQueries: Plugin = {
  onParams({ params }) {
    if (typeof params.query === 'string') {
      receivedQueries.push(params.query);
    }
  },
};

/**
 * One federated subgraph owning both fast and slow fields on the same type.
 * That is the case where `deferStream.subgraph` matters: the gateway can
 * forward `@defer` on the subgraph operation instead of omitting the slow
 * selection and refetching later (gateway-owned path).
 */
const schema = buildSubgraphSchema([
  {
    typeDefs: parse(/* GraphQL */ `
      type Product @key(fields: "id") {
        id: ID!
        name: String!
        """
        Slow field - client defers this so the subgraph can stream it back
        after the initial name payload.
        """
        description: String
      }
      type Query {
        product(id: ID!): Product
      }
    `),
    resolvers: {
      Query: {
        product: (_: unknown, { id }: { id: string }) => ({ id }),
      },
      Product: {
        __resolveReference: (ref: { id: string }) => ref,
        name: () => 'Widget',
        description: async () => {
          await delay(1000);
          return 'A carefully deferred product description';
        },
      },
    },
  },
]);

const yoga = createYoga({
  schema,
  plugins: [useDeferStream(), recordQueries],
});

const server = createServer((req, res) => {
  if (req.url === '/_queries') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(receivedQueries));
    return;
  }
  return yoga(req, res);
});

server.listen(opts.getServicePort('catalog'), () => {
  console.log(`Catalog subgraph on http://localhost:${opts.getServicePort('catalog')}/graphql`);
});
