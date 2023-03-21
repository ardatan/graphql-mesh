/* eslint-disable import/no-extraneous-dependencies */
import { parse } from 'graphql';
import LocalforageCache from '@graphql-mesh/cache-localforage';
import GraphQLHandler from '@graphql-mesh/graphql';
import StitchingMerger from '@graphql-mesh/merger-stitching';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { defaultImportFn, DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { getMesh } from '../src/get-mesh.js';
import { MeshResolvedSource } from '../src/types.js';

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

  interface CreateSchemaConfiguration {
    suffix: string;
    suffixRootTypeNames: boolean;
    suffixFieldNames: boolean;
    suffixResponses: boolean;
  }

  function createGraphQLSchema(config: CreateSchemaConfiguration) {
    const queryTypeName = config.suffixRootTypeNames ? `Query${config.suffix}` : 'Query';
    const mutationTypeName = config.suffixRootTypeNames ? `Mutation${config.suffix}` : 'Mutation';
    const subscriptionTypeName = config.suffixRootTypeNames
      ? `Subscription${config.suffix}`
      : 'Subscription';

    return makeExecutableSchema({
      typeDefs: `
          type ${queryTypeName} {
            hello${config.suffixFieldNames ? config.suffix : ''}: String
          }

          type ${mutationTypeName} {
            bye${config.suffixFieldNames ? config.suffix : ''}: String
          }

          type ${subscriptionTypeName} {
            wave${config.suffixFieldNames ? config.suffix : ''}: String
          }

          schema {
            query: ${queryTypeName}
            mutation: ${mutationTypeName}
            subscription: ${subscriptionTypeName}
          }
        `,
      resolvers: {
        [queryTypeName]: {
          [`hello${config.suffixFieldNames ? config.suffix : ''}`]: () =>
            `Hello from service${config.suffixResponses ? config.suffix : ''}`,
        },
        [mutationTypeName]: {
          [`bye${config.suffixFieldNames ? config.suffix : ''}`]: () =>
            `Bye from service${config.suffixResponses ? config.suffix : ''}schema`,
        },
      },
    });
  }

  function createGraphQLSource(config: CreateSchemaConfiguration): MeshResolvedSource {
    const name = `service${config.suffix}`;
    return {
      name,
      handler: new GraphQLHandler({
        baseDir,
        cache,
        pubsub,
        name,
        config: {
          source: `./schema${config.suffix}.ts`,
        },
        store,
        logger,
        async importFn(moduleId) {
          if (moduleId.endsWith(`schema${config.suffix}.ts`)) {
            return createGraphQLSchema(config);
          }
          return defaultImportFn(moduleId);
        },
      }),
      transforms: [],
    };
  }

  it('handle sources with different query type names', async () => {
    const mesh = await getMesh({
      cache,
      pubsub,
      logger,
      sources: new Array(3).fill(0).map((_, i) =>
        createGraphQLSource({
          suffix: i.toString(),
          suffixRootTypeNames: true,
          suffixFieldNames: false,
          suffixResponses: false,
        }),
      ),
      merger,
    });

    expect(printSchemaWithDirectives(mesh.schema)).toMatchInlineSnapshot(`
      "schema {
        query: Query
        mutation: Mutation
        subscription: Subscription
      }

      type Query {
        hello: String
      }

      type Mutation {
        bye: String
      }

      type Subscription {
        wave: String
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
      {},
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "data": {},
      }
    `);
  });

  it('can stitch a mutation field to a query field', async () => {
    const mesh = await getMesh({
      cache,
      pubsub,
      logger,
      merger,
      sources: [
        createGraphQLSource({
          suffix: 'Foo',
          suffixRootTypeNames: false,
          suffixFieldNames: true,
          suffixResponses: true,
        }),
        createGraphQLSource({
          suffix: 'Bar',
          suffixRootTypeNames: false,
          suffixFieldNames: true,
          suffixResponses: true,
        }),
      ],
      additionalTypeDefs: [
        parse(/* GraphQL */ `
          extend type Mutation {
            strikeBack: String
          }
        `),
      ],
      additionalResolvers: {
        Mutation: {
          strikeBack: (root, args, context, info) =>
            context.serviceFoo.Query.helloFoo({ root, args, context, info }),
        },
      },
    });

    const result = await mesh.execute(
      /* GraphQL */ `
        mutation {
          strikeBack
        }
      `,
      {},
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "strikeBack": "Hello from serviceFoo",
        },
      }
    `);
  });
});
