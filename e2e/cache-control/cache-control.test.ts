import { setTimeout } from 'node:timers/promises';
import { createTenv, type Serve } from '@e2e/tenv';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { authors, books, comments } from './services/data';

const env = createTenv(__dirname);
async function createServices() {
  const services = await Promise.all([
    // Authors -> Yoga Server w/ Response Caching plugin enabled
    // This checks ETag
    env.service('authors'),
    // Books -> Apollo Server w/ Response Caching plugin enabled
    env.service('books'),
    // Comments -> Apollo Server w/ HTTP Caching plugin enabled
    // w/o @cacheControl directive but default TTL set
    env.service('comments'),
  ]);
  return {
    services,
    async [DisposableSymbols.asyncDispose]() {
      await Promise.all(services.map(service => service[DisposableSymbols.asyncDispose]()));
    },
  };
}
const composition = {
  async ['Mesh Compose'](maskServicePorts: boolean) {
    const servicesContainer = await createServices();
    const composition = await env.compose({
      services: servicesContainer.services,
      maskServicePorts,
      output: 'graphql',
      env: {
        MESH_COMPOSE: '1',
      },
    });
    return {
      services: servicesContainer.services,
      supergraphPath: composition.output,
      supergraphSdl: composition.result,
      async [DisposableSymbols.asyncDispose]() {
        await Promise.all([
          servicesContainer[DisposableSymbols.asyncDispose](),
          composition[DisposableSymbols.asyncDispose](),
        ]);
      },
    };
  },
  async ['Apollo Rover'](maskServicePorts: boolean) {
    const servicesContainer = await createServices();
    const composition = await env.composeWithApollo({
      services: servicesContainer.services,
      maskServicePorts,
    });
    return {
      services: servicesContainer.services,
      supergraphPath: composition.output,
      supergraphSdl: composition.result,
      async [DisposableSymbols.asyncDispose]() {
        await servicesContainer[DisposableSymbols.asyncDispose]();
      },
    };
  },
};
const cachePlugins = ['HTTP Caching', 'Response Caching'];
const cacheStorages: Record<
  string,
  () => Promise<AsyncDisposable & { env: Record<string, string | number> }>
> = {
  async redis() {
    const redis = await env.container({
      name: 'redis',
      image: 'redis/redis-stack',
      containerPort: 6379,
      healthcheck: ['CMD', 'redis-cli', '--raw', 'incr', 'ping'],
    });
    return {
      env: {
        CACHE_STORAGE: 'redis',
        REDIS_PORT: redis.port,
      },
      async [DisposableSymbols.asyncDispose]() {
        await redis[DisposableSymbols.asyncDispose]();
      },
    };
  },
  async ['upstash-redis']() {
    const redis = await env.container({
      name: 'redis',
      image: 'redis/redis-stack',
      containerPort: 6379,
      healthcheck: ['CMD', 'redis-cli', '--raw', 'incr', 'ping'],
    });
    const srh = await env.container({
      name: 'srh',
      image: 'hiett/serverless-redis-http',
      containerPort: 80,
      env: {
        SRH_CONNECTION_STRING: `redis://172.17.0.1:${redis.port}`,
        SRH_TOKEN: 'example_token',
        SRH_MODE: 'env',
      },
      healthcheck: ['CMD-SHELL', 'wget --spider http://0.0.0.0'],
    });
    return {
      env: {
        CACHE_STORAGE: 'upstash-redis',
        UPSTASH_REDIS_REST_URL: `http://localhost:${srh.port}`,
        UPSTASH_REDIS_REST_TOKEN: 'example_token',
      },
      async [DisposableSymbols.asyncDispose]() {
        await redis[DisposableSymbols.asyncDispose]();
        await srh[DisposableSymbols.asyncDispose]();
      },
    };
  },
  async ['inmemory-lru']() {
    return {
      env: {
        CACHE_STORAGE: 'inmemory-lru',
      },
      async [DisposableSymbols.asyncDispose]() {
        // Do nothing
      },
    };
  },
};

async function makeQueries(gw: Serve) {
  const queries = {
    AUTHORS_TEST_1: {
      query: /* GraphQL */ `
        query AUTHORS_TEST_1 {
          authors {
            id
            name
          }
        }
      `,
      expected: {
        authors: authors.map(({ id, name }) => ({ id, name })),
      },
    },
    // We make 2 queries to the same field to ensure that the cache is working
    // seperately for each query
    AUTHORS_TEST_2: {
      query: /* GraphQL */ `
        query AUTHORS_TEST_2 {
          authors {
            id
            name
            age
          }
        }
      `,
      expected: {
        authors: authors.map(({ id, name, age }) => ({ id, name, age })),
      },
    },
    BOOKS_TEST_1: {
      query: /* GraphQL */ `
        query BOOKS_TEST_1 {
          books {
            id
            title
          }
        }
      `,
      expected: {
        books: books.map(({ id, title }) => ({ id, title })),
      },
    },
    COMMENTS_TEST_1: {
      query: /* GraphQL */ `
        query COMMENTS_TEST_1 {
          comments {
            id
            content
          }
        }
      `,
      expected: {
        comments: comments.map(({ id, content }) => ({ id, content })),
      },
    },
  };
  for (const operationName in queries) {
    const { query, expected } = queries[operationName];
    const { data } = await gw.execute({ query, operationName });
    expect(data).toEqual(expected);
  }
}

describe('Cache Control', () => {
  for (const COMPOSITION_TOOL in composition) {
    describe(`Composition via ${COMPOSITION_TOOL}`, () => {
      const compose = composition[COMPOSITION_TOOL];
      it('composes', async () => {
        await using composition = await compose(true);
        expect(composition.supergraphSdl).toMatchSnapshot();
      });
      for (const CACHE_PLUGIN of cachePlugins) {
        describe(`Plugin ${CACHE_PLUGIN}`, () => {
          for (const CACHE_STORAGE in cacheStorages) {
            it(`stores via ${CACHE_STORAGE}`, async () => {
              await using cacheStorage = await cacheStorages[CACHE_STORAGE]();
              await using composition = await compose(false);
              await using gw = await env.serve({
                supergraph: composition.supergraphPath,
                env: {
                  CACHE_PLUGIN,
                  CACHE_STORAGE,
                  ...cacheStorage.env,
                },
              });
              const [authorsService, booksService, commentsService] = composition.services;
              // Store the results to the cache that will take 10s
              await makeQueries(gw);
              expect(authorsService.getStd('both')).toContain('AUTHORS_TEST_1: 1');
              expect(authorsService.getStd('both')).toContain('AUTHORS_TEST_2: 1');
              expect(booksService.getStd('both')).toContain('BOOKS_TEST_1: 1');
              expect(commentsService.getStd('both')).toContain('COMMENTS_TEST_1: 1');
              await makeQueries(gw);
              // Results did not expire yet
              expect(authorsService.getStd('both')).not.toContain('AUTHORS_TEST_1: 2');
              expect(authorsService.getStd('both')).not.toContain('AUTHORS_TEST_2: 2');
              expect(booksService.getStd('both')).not.toContain('BOOKS_TEST_1: 2');
              expect(commentsService.getStd('both')).not.toContain('COMMENTS_TEST_1: 2');
              // Comment has been expired
              await setTimeout(5_000);
              await makeQueries(gw);
              expect(authorsService.getStd('both')).not.toContain('AUTHORS_TEST_1: 2');
              expect(authorsService.getStd('both')).not.toContain('AUTHORS_TEST_2: 2');
              expect(booksService.getStd('both')).not.toContain('BOOKS_TEST_1: 2');
              expect(commentsService.getStd('both')).toContain('COMMENTS_TEST_1: 2');
              // All results have been expired
              await setTimeout(5_000);
              await makeQueries(gw);
              expect(authorsService.getStd('both')).toContain('AUTHORS_TEST_1: 2');
              expect(authorsService.getStd('both')).toContain('AUTHORS_TEST_2: 2');
              expect(booksService.getStd('both')).toContain('BOOKS_TEST_1: 2');
              expect(commentsService.getStd('both')).toContain('COMMENTS_TEST_1: 3');
            });
          }
        });
      }
    });
  }
});
