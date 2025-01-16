/* eslint-disable import/no-extraneous-dependencies */
import { useServer } from 'graphql-ws/use/ws';
import type { YogaServerInstance } from 'graphql-yoga';
import { WebSocketServer } from 'ws';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import BareMerger from '@graphql-mesh/merger-bare';
import { getMesh } from '@graphql-mesh/runtime';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import SupergraphHandler from '@graphql-mesh/supergraph';
import type { MeshFetch } from '@graphql-mesh/types';
import { defaultImportFn as importFn, PubSub } from '@graphql-mesh/utils';
import { fetch as defaultFetchFn } from '@whatwg-node/fetch';
import { createDisposableServer } from '../../../../testing/createDisposableServer.js';
import { dummyLogger as logger } from '../../../../testing/dummyLogger.js';
import {
  AUTH_HEADER as AUTHORS_AUTH_HEADER,
  server as authorsServer,
} from './fixtures/service-author/server';
import {
  AUTH_HEADER as BOOKS_AUTH_HEADER,
  server as booksServer,
} from './fixtures/service-book/server';

describe('Supergraph', () => {
  let baseHandlerConfig;
  let baseGetMeshConfig;
  const libcurl = globalThis.libcurl;
  beforeEach(() => {
    globalThis.libcurl = null;
    const baseDir = __dirname;
    const cache = new InMemoryLRUCache();
    const store = new MeshStore('test', new InMemoryStoreStorageAdapter(), {
      validate: false,
      readonly: false,
    });
    const pubsub = new PubSub();
    const merger = new BareMerger({ cache, pubsub, store, logger });
    const fetchFn: MeshFetch = async (url, options) => {
      if (url.includes('authors')) {
        return authorsServer.fetch(url, options);
      }
      if (url.includes('books')) {
        return booksServer.fetch(url, options);
      }
      return defaultFetchFn(url, options);
    };
    baseHandlerConfig = {
      name: 'BooksAndAuthors',
      baseDir,
      cache,
      store,
      pubsub,
      logger,
      importFn,
    };
    baseGetMeshConfig = {
      cache,
      logger,
      fetchFn,
      merger,
    };
    jest.clearAllMocks();
  });
  afterEach(() => {
    globalThis.libcurl = libcurl;
  });
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
    await using meshRuntime = await getMesh({
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
    await using meshRuntime = await getMesh({
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
    await using meshRuntime = await getMesh({
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
  it('throws a helpful error when the supergraph is an invalid SDL', async () => {
    const handler = new SupergraphHandler({
      ...baseHandlerConfig,
      config: {
        source: './fixtures/supergraph-invalid.graphql',
      },
    });
    await expect(
      getMesh({
        sources: [
          {
            name: 'supergraph',
            handler,
          },
        ],
        ...baseGetMeshConfig,
      }),
    ).rejects.toThrow();
    expect(logger.error.mock.calls[0][0].toString())
      .toBe(`Failed to generate the schema for the source
 Supergraph source must be a valid GraphQL SDL string or a parsed DocumentNode, but got an invalid result from ./fixtures/supergraph-invalid.graphql instead.
 Got result: type Query {

 Got error: Syntax Error: Expected Name, found <EOF>.`);
  });
  it('throws a helpful error when the source is down', async () => {
    const handler = new SupergraphHandler({
      ...baseHandlerConfig,
      config: {
        source: 'http://down-sdl-source.com/my-sdl.graphql',
      },
    });
    await expect(
      getMesh({
        sources: [
          {
            name: 'supergraph',
            handler,
          },
        ],
        ...baseGetMeshConfig,
      }),
    ).rejects.toThrow();
    expect(logger.error.mock.calls[0][0].toString())
      .toBe(`Failed to generate the schema for the source
 Failed to load supergraph SDL from http://down-sdl-source.com/my-sdl.graphql:
 getaddrinfo ENOTFOUND down-sdl-source.com`);
  });
  it('configures WebSockets for subscriptions correctly', async () => {
    await using authorsHttpServer = await createDisposableServer(authorsServer);
    useServer(
      getGraphQLWSOptionsForYoga(authorsServer),
      new WebSocketServer({
        server: authorsHttpServer.server,
        path: authorsServer.graphqlEndpoint,
      }),
    );
    await using booksHttpServer = await createDisposableServer(booksServer);
    useServer(
      getGraphQLWSOptionsForYoga(booksServer),
      new WebSocketServer({
        server: booksHttpServer.server,
        path: booksServer.graphqlEndpoint,
      }),
    );

    const handler = new SupergraphHandler({
      ...baseHandlerConfig,
      config: {
        source: './fixtures/supergraph.graphql',
        subgraphs: [
          {
            name: 'authors',
            endpoint: `http://localhost:${authorsHttpServer.address().port}${authorsServer.graphqlEndpoint}`,
            operationHeaders: {
              Authorization: AUTHORS_AUTH_HEADER,
            },
            subscriptionsProtocol: 'WS',
          },
          {
            name: 'books',
            endpoint: `http://localhost:${booksHttpServer.address().port}${booksServer.graphqlEndpoint}`,
            operationHeaders: {
              Authorization: BOOKS_AUTH_HEADER,
            },
            subscriptionsProtocol: 'WS',
          },
        ],
      },
    });
    await using meshRuntime = await getMesh({
      sources: [
        {
          name: 'supergraph',
          handler,
        },
      ],
      ...baseGetMeshConfig,
    });
    const subscriptionResult = await meshRuntime.subscribe(
      /* GraphQL */ `
        subscription {
          bookCreated {
            title
            author {
              name
            }
          }
        }
      `,
      {},
    );
    if (!(Symbol.asyncIterator in subscriptionResult)) {
      throw new Error('Subscription result is not an async iterable');
    }
    const subscriptionAsyncIterator = subscriptionResult[Symbol.asyncIterator]();
    const subscriptionIterationResult$ = subscriptionAsyncIterator.next();
    // Wait for the subscription to be ready
    await new Promise<void>(resolve => setTimeout(resolve, 30));
    const mutationResult = await meshRuntime.execute(
      /* GraphQL */ `
        mutation {
          createBook(title: "New Book", authorId: 1) {
            title
            author {
              name
            }
          }
        }
      `,
      {},
    );
    const subscriptionIterationResult = await subscriptionIterationResult$;
    expect(subscriptionIterationResult.value.data).toEqual({
      bookCreated: mutationResult?.data?.createBook,
    });
    await subscriptionAsyncIterator.return();
  });
});

function getGraphQLWSOptionsForYoga(yogaApp: YogaServerInstance<any, any>) {
  return {
    execute: (args: any) => args.rootValue.execute(args),
    subscribe: (args: any) => args.rootValue.subscribe(args),
    onSubscribe: async (ctx, _id, params) => {
      const { schema, execute, subscribe, contextFactory, parse, validate } = yogaApp.getEnveloped({
        ...ctx,
        req: ctx.extra.request,
        socket: ctx.extra.socket,
        params,
      });

      const args = {
        schema,
        operationName: params.operationName,
        document: parse(params.query),
        variableValues: params.variables,
        contextValue: await contextFactory(),
        rootValue: {
          execute,
          subscribe,
        },
      };

      const errors = validate(args.schema, args.document);
      if (errors.length) return errors;
      return args;
    },
  };
}
