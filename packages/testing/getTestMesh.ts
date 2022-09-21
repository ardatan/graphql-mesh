/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-extraneous-dependencies */
import { createServer } from 'http';
import { createYoga, createSchema, Repeater } from 'graphql-yoga';
import { getMesh } from '@graphql-mesh/runtime';
import GraphQLHandler from '@graphql-mesh/graphql';
import LocalforageCache from '@graphql-mesh/cache-localforage';
import { PubSub, DefaultLogger, defaultImportFn } from '@graphql-mesh/utils';
import StitchingMerger from '@graphql-mesh/merger-stitching';
import { MeshStore, InMemoryStoreStorageAdapter } from '@graphql-mesh/store';
import { AddressInfo } from 'net';

export async function getTestMesh() {
  const yoga = createYoga({
    logging: false,
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          greetings: String
        }
        type Subscription {
          time: String
        }
      `,
      resolvers: {
        Query: {
          greetings: () => 'This is the `greetings` field of the root `Query` type',
        },
        Subscription: {
          time: {
            subscribe: () =>
              new Repeater((push, stop) => {
                const interval = setInterval(() => push(new Date().toISOString()));
                return stop.then(() => clearInterval(interval));
              }),
            resolve: time => time,
          },
        },
      },
    }),
  });
  const cache = new LocalforageCache();
  const pubsub = new PubSub();
  const logger = new DefaultLogger('Test');
  const store = new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
    readonly: false,
    validate: false,
  });
  const server = createServer(yoga);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const subId = pubsub.subscribe('destroy', async () => {
    pubsub.unsubscribe(subId);
    await new Promise(resolve => server.close(resolve));
  });
  const mesh = await getMesh({
    sources: [
      {
        name: 'Yoga',
        handler: new GraphQLHandler({
          name: 'Yoga',
          baseDir: __dirname,
          config: {
            endpoint: `http://localhost:${port}/graphql`,
            subscriptionsProtocol: 'SSE',
          },
          cache,
          pubsub,
          store: store.child('sources/Yoga'),
          logger,
          importFn: defaultImportFn,
        }),
      },
    ],
    cache,
    pubsub,
    merger: new StitchingMerger({
      cache,
      pubsub,
      logger,
      store: store.child('Stitching'),
    }),
  });
  return mesh;
}
