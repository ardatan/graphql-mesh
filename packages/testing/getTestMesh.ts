/* eslint-disable import/no-extraneous-dependencies */
import { createServer } from '@graphql-yoga/node';
import { getMesh } from '@graphql-mesh/runtime';
import GraphQLHandler from '@graphql-mesh/graphql';
import LocalforageCache from '@graphql-mesh/cache-localforage';
import { PubSub, DefaultLogger, defaultImportFn } from '@graphql-mesh/utils';
import StitchingMerger from '@graphql-mesh/merger-stitching';
import { MeshStore, InMemoryStoreStorageAdapter } from '@graphql-mesh/store';
import { fetchFactory } from 'fetchache';
import { fetch, Request, Response } from 'cross-undici-fetch';

export async function getTestMesh() {
  const yoga = createServer({
    logging: false,
  });
  const cache = new LocalforageCache();
  const pubsub = new PubSub();
  const logger = new DefaultLogger('Test');
  const store = new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
    readonly: false,
    validate: false,
  });
  await yoga.start();
  const subId = pubsub.subscribe('destroy', async () => {
    pubsub.unsubscribe(subId);
    await yoga.stop();
  });
  const mesh = await getMesh({
    sources: [
      {
        name: 'Yoga',
        handler: new GraphQLHandler({
          name: 'Yoga',
          baseDir: __dirname,
          config: {
            endpoint: yoga.getServerUrl(),
            subscriptionsProtocol: 'SSE',
          },
          cache,
          pubsub,
          store: store.child('sources/Yoga'),
          logger,
          importFn: defaultImportFn,
          fetchFn: fetchFactory({
            cache,
            fetch,
            Request,
            Response,
          }),
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
