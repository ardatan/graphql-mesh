/* eslint-disable import/no-extraneous-dependencies */
import LocalforageCache from '@graphql-mesh/cache-localforage';
import GraphQLHandler from '@graphql-mesh/graphql';
import StitchingMerger from '@graphql-mesh/merger-stitching';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { defaultImportFn, DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { getMesh } from '../src/get-mesh';
import { MeshResolvedSource } from '../src/types';

describe('getMesh', () => {
  const baseDir = __dirname;
  let cache: LocalforageCache;
  let pubsub: PubSub;
  let store: MeshStore;
  let logger: DefaultLogger;
  let merger: StitchingMerger;
  beforeEach(() => {
    cache = new LocalforageCache();
    pubsub = new PubSub();
    store = new MeshStore('test', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    logger = new DefaultLogger('Mesh Test');
    merger = new StitchingMerger({
      store,
      cache,
      pubsub,
      logger,
    });
  });

  it('handle sources with different query type names', async () => {
    function createServiceWithPrefix(prefix: string) {
      return makeExecutableSchema({
        typeDefs: `
          type Query${prefix} {
            hello${prefix}: String
          }

          schema {
            query: Query${prefix}
          }
        `,
        resolvers: {
          [`Query${prefix}`]: {
            [`hello${prefix}`]: () => `Hello from ${prefix}`,
          },
        },
      });
    }

    function createSourceWithPrefix(prefix: string): MeshResolvedSource {
      const name = `service${prefix}`;
      return {
        name,
        handler: new GraphQLHandler({
          baseDir,
          cache,
          pubsub,
          name,
          config: {
            schema: `./schema${prefix}.ts`,
          },
          store,
          logger,
          async importFn(moduleId) {
            if (moduleId.endsWith(`schema${prefix}.ts`)) {
              return createServiceWithPrefix(prefix);
            }
            return defaultImportFn(moduleId);
          },
        }),
        transforms: [],
      };
    }

    const mesh = await getMesh({
      cache,
      pubsub,
      logger,
      sources: new Array(3).fill(0).map((_, i) => createSourceWithPrefix(i.toString())),
      merger,
    });

    expect(printSchemaWithDirectives(mesh.schema)).toMatchInlineSnapshot(`
      "schema {
        query: Query
      }

      type Query {
        hello0: String
        hello1: String
        hello2: String
      }"
    `);

    const result = await mesh.execute(
      `
      {
        hello0
        hello1
        hello2
      }
    `,
      {}
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "hello0": "Hello from 0",
          "hello1": "Hello from 1",
          "hello2": "Hello from 2",
        },
      }
    `);
  });
});
