/* eslint-disable import/no-extraneous-dependencies */
import LocalforageCache from '@graphql-mesh/cache-localforage';
import BareMerger from '@graphql-mesh/merger-bare';
import { getMesh } from '@graphql-mesh/runtime';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import SupergraphHandler from '@graphql-mesh/supergraph';
import { MeshFetch } from '@graphql-mesh/types';
import { DefaultLogger, defaultImportFn as importFn, PubSub } from '@graphql-mesh/utils';
import {
  AUTH_HEADER as AUTHORS_AUTH_HEADER,
  server as authorsServer,
} from './fixtures/service-author/server';
import {
  AUTH_HEADER as BOOKS_AUTH_HEADER,
  server as booksServer,
} from './fixtures/service-book/server';

describe('Supergraph', () => {
  const baseDir = __dirname;
  const cache = new LocalforageCache();
  const store = new MeshStore('test', new InMemoryStoreStorageAdapter(), {
    validate: false,
    readonly: false,
  });
  const logger = new DefaultLogger('test');
  const pubsub = new PubSub();
  const merger = new BareMerger({ cache, pubsub, store, logger });
  const fetchFn: MeshFetch = async (url, options) => {
    if (url.includes('authors')) {
      return authorsServer.fetch(url, options);
    }
    if (url.includes('books')) {
      return booksServer.fetch(url, options);
    }
    throw new Error(`Unknown URL: ${url}`);
  };
  const baseHandlerConfig = {
    name: 'BooksAndAuthors',
    baseDir,
    cache,
    store,
    pubsub,
    logger,
    importFn,
  };
  const baseGetMeshConfig = {
    cache,
    fetchFn,
    merger,
  };
  it('supports individual headers for each subgraph with interpolation', async () => {
    const handler = new SupergraphHandler({
      ...baseHandlerConfig,
      config: {
        source: './fixtures/supergraph.graphql',
        subgraphs: [
          {
            name: 'authors',
            operationHeaders: {
              Authorization: AUTHORS_AUTH_HEADER,
            },
          },
          {
            name: 'books',
            operationHeaders: {
              Authorization: '{context.books_auth_header}',
            },
          },
        ],
      },
    });
    const meshRuntime = await getMesh({
      sources: [
        {
          name: 'supergraph',
          handler,
        },
      ],
      ...baseGetMeshConfig,
    });
    const result = await meshRuntime.execute(
      /* GraphQL */ `
        query {
          book(id: 1) {
            title
            author {
              name
            }
          }
        }
      `,
      {},
      {
        books_auth_header: BOOKS_AUTH_HEADER,
      },
    );
    expect(result.errors).toBeFalsy();
    expect(result.data).toMatchObject({
      book: {
        title: 'Awesome Book',
        author: {
          name: 'Jane Doe',
        },
      },
    });
  });
  it('supports custom endpoint for each subgraph', async () => {
    const handler = new SupergraphHandler({
      ...baseHandlerConfig,
      config: {
        source: './fixtures/supergraph.graphql',
        subgraphs: [
          {
            name: 'authors',
            operationHeaders: {
              Authorization: AUTHORS_AUTH_HEADER,
            },
          },
          {
            name: 'books',
            endpoint: 'http://books/graphql?skip-auth',
          },
        ],
      },
    });
    const meshRuntime = await getMesh({
      sources: [
        {
          name: 'supergraph',
          handler,
        },
      ],
      ...baseGetMeshConfig,
    });
    const result = await meshRuntime.execute(
      /* GraphQL */ `
        query {
          book(id: 1) {
            title
            author {
              name
            }
          }
        }
      `,
      {},
    );
    expect(result.errors).toBeFalsy();
    expect(result.data).toMatchObject({
      book: {
        title: 'Awesome Book',
        author: {
          name: 'Jane Doe',
        },
      },
    });
  });
  it('supports interpolation in custom endpoint for each subgraph', async () => {
    const handler = new SupergraphHandler({
      ...baseHandlerConfig,
      config: {
        source: './fixtures/supergraph.graphql',
        subgraphs: [
          {
            name: 'authors',
            operationHeaders: {
              Authorization: AUTHORS_AUTH_HEADER,
            },
          },
          {
            name: 'books',
            endpoint: 'http://{context.books_endpoint}',
          },
        ],
      },
    });
    const meshRuntime = await getMesh({
      sources: [
        {
          name: 'supergraph',
          handler,
        },
      ],
      ...baseGetMeshConfig,
    });
    const result = await meshRuntime.execute(
      /* GraphQL */ `
        query {
          book(id: 1) {
            title
            author {
              name
            }
          }
        }
      `,
      {},
      {
        books_endpoint: 'books/graphql?skip-auth',
      },
    );
    expect(result.errors).toBeFalsy();
    expect(result.data).toMatchObject({
      book: {
        title: 'Awesome Book',
        author: {
          name: 'Jane Doe',
        },
      },
    });
  });
});
