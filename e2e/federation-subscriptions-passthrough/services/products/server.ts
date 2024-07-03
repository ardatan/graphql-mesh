import { readFileSync } from 'fs';
import { createServer, Server } from 'http';
import { join } from 'path';
import express from 'express';
import { parse } from 'graphql';
import { useServer } from 'graphql-ws/lib/use/ws';
import { WebSocketServer } from 'ws';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Repeater } from '@repeaterjs/repeater';

export const TOKEN = 'wowmuchsecret';

const schema = buildSubgraphSchema([
  {
    typeDefs: parse(readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf8')),
    resolvers: {
      Product: {
        __resolveReference(object: any) {
          return {
            ...object,
            ...products.find(product => product.id === object.id),
          };
        },
      },
      Query: {
        topProducts(_: any, args: any) {
          return products.slice(0, args.first);
        },
      },
      Subscription: {
        productPriceChanged: {
          subscribe: () =>
            new Repeater(async (push, stop) => {
              let i = 0;
              const interval = setInterval(() => {
                const product = products[i];

                push({ productPriceChanged: { ...product, price: product.price * 2 } });

                i++;
                if (i >= products.length) {
                  i = 0;
                }
              }, 100);

              await stop;

              clearInterval(interval);
            }),
        },
      },
    },
  },
]);

const app = express();

const httpServer = createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/subscriptions',
});

const graphqlWsServer = useServer(
  {
    schema,
    onConnect({ connectionParams }) {
      // make sure the authorization header is propagated by the gateway
      if (connectionParams.token !== TOKEN) {
        return false;
      }
    },
  },
  wsServer,
);

const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await graphqlWsServer.dispose();
          },
        };
      },
    },
  ],
});

export async function start(port: number): Promise<Server> {
  await server.start();
  app.use('/graphql', express.json(), expressMiddleware(server));
  return new Promise(resolve => {
    httpServer.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}/graphql`);
      resolve(httpServer);
    });
  });
}

const products = [
  {
    id: '1',
    name: 'Table',
    price: 899,
  },
  {
    id: '2',
    name: 'Couch',
    price: 1299,
  },
  {
    id: '3',
    name: 'Chair',
    price: 54,
  },
];
