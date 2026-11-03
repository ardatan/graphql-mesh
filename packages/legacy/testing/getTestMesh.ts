/* eslint-disable import/no-nodejs-modules */

/* eslint-disable import/no-extraneous-dependencies */
import { createSchema, createYoga, Repeater } from 'graphql-yoga';
import { Logger } from '@graphql-hive/logger';
import { MemPubSub } from '@graphql-hive/pubsub';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import GraphQLHandler from '@graphql-mesh/graphql';
import StitchingMerger from '@graphql-mesh/merger-stitching';
import { getMesh, type GetMeshOptions } from '@graphql-mesh/runtime';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { defaultImportFn } from '@graphql-mesh/utils';
import { AsyncDisposableStack } from '@whatwg-node/disposablestack';

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
  const cache = extraOptions?.cache || new InMemoryLRUCache();
  const pubsub = extraOptions?.pubsub || new MemPubSub();
  const log = extraOptions?.log || new Logger({ prefix: 'Test' });
  const store = new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
    readonly: false,
    validate: false,
  });
  const disposables = extraOptions?.disposables || new AsyncDisposableStack();
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
          log,
          importFn: defaultImportFn,
          disposables,
        }),
      },
      ...(extraOptions?.sources || []),
    ],
    cache,
    pubsub,
    merger: new StitchingMerger({
      cache,
      pubsub,
      log,
      store: store.child('Stitching'),
      disposables,
    }),
    disposables,
    ...extraOptions,
  });
}
