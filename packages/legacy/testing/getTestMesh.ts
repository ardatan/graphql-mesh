/* eslint-disable import/no-nodejs-modules */

/* eslint-disable import/no-extraneous-dependencies */
import { createSchema, createYoga, Repeater } from 'graphql-yoga';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import GraphQLHandler from '@graphql-mesh/graphql';
import StitchingMerger from '@graphql-mesh/merger-stitching';
import { getMesh, type GetMeshOptions } from '@graphql-mesh/runtime';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { defaultImportFn, DefaultLogger, PubSub } from '@graphql-mesh/utils';

export function getTestMesh(extraOptions?: Partial<GetMeshOptions>) {
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
  const cache = new InMemoryLRUCache();
  const pubsub = new PubSub();
  const logger = new DefaultLogger('Test');
  const store = new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
    readonly: false,
    validate: false,
  });
  return getMesh({
    fetchFn: yoga.fetch as any,
    sources: [
      {
        name: 'Yoga',
        handler: new GraphQLHandler({
          name: 'Yoga',
          baseDir: __dirname,
          config: {
            endpoint: `http://localhost:3000/graphql`,
            subscriptionsProtocol: 'SSE',
          },
          cache,
          pubsub,
          store: store.child('sources/Yoga'),
          logger,
          importFn: defaultImportFn,
        }),
      },
      ...(extraOptions?.sources || []),
    ],
    cache,
    pubsub,
    merger: new StitchingMerger({
      cache,
      pubsub,
      logger,
      store: store.child('Stitching'),
    }),
    ...extraOptions,
  });
}
