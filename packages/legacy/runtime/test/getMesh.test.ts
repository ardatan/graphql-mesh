/* eslint-disable import/no-extraneous-dependencies */
import { buildSchema, parse, validateSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import GraphQLHandler from '@graphql-mesh/graphql';
import JsonSchemaHandler from '@graphql-mesh/json-schema';
import BareMerger from '@graphql-mesh/merger-bare';
import StitchingMerger from '@graphql-mesh/merger-stitching';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { defaultImportFn, PubSub } from '@graphql-mesh/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { dummyLogger as logger } from '../../../testing/dummyLogger';
import { getMesh } from '../src/get-mesh.js';
import type { MeshResolvedSource } from '../src/types.js';

describe('getMesh', () => {
  const baseDir = __dirname;
  let cache: InMemoryLRUCache;
  let pubsub: PubSub;
  let store: MeshStore;
  let merger: StitchingMerger;
  beforeEach(() => {
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
    store = new MeshStore('test', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    merger = new StitchingMerger({
      store,
      cache,
      pubsub,
      logger,
    });
    process.env.NODE_ENV = 'test';
  });

  interface CreateSchemaConfiguration {
    suffix: string;
    suffixRootTypeNames: boolean;
    suffixFieldNames: boolean;
    suffixResponses: boolean;
    delayImport?: boolean;
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
          if (config.delayImport) {
            await new Promise(r => setTimeout(r, 1));
          }
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

  it('logs the unexpected errors with stack traces in production', async () => {
    process.env.NODE_ENV = 'production';
    const errorLogSpy = jest.spyOn(logger, 'error');
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
      ],
      additionalTypeDefs: [
        parse(/* GraphQL */ `
          extend type Query {
            throwMe: String
          }
        `),
      ],
      additionalResolvers: {
        Query: {
          throwMe: () => {
            throw new Error('This is an error');
          },
        },
      },
    });

    const result = await mesh.execute(
      /* GraphQL */ `
        query {
          throwMe
        }
      `,
      {},
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "throwMe": null,
        },
        "errors": [
          [GraphQLError: This is an error],
        ],
      }
    `);

    const firstErrorWithStack = errorLogSpy.mock.calls[0][0].stack;
    expect(firstErrorWithStack).toContain('This is an error');
    expect(firstErrorWithStack).toContain('at Object.throwMe (');
  });

  it('prints errors with stack traces of the original errors in development', async () => {
    process.env.NODE_ENV = 'development';
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
      ],
      additionalTypeDefs: [
        parse(/* GraphQL */ `
          extend type Query {
            throwMe: String
          }
        `),
      ],
      additionalResolvers: {
        Query: {
          throwMe: () => {
            throw new Error('This is an error');
          },
        },
      },
    });

    const result = await mesh.execute(
      /* GraphQL */ `
        query {
          throwMe
        }
      `,
      {},
    );

    const error = result.errors[0];
    expect(error.message).toContain('This is an error');
    const serializedOriginalError = error.extensions?.originalError as {
      name: string;
      message: string;
      stack: string[];
    };
    expect(serializedOriginalError?.message).toContain('This is an error');
    expect(serializedOriginalError?.stack).toContain('at Object.throwMe (');
  });

  it('generated consistent schema', async () => {
    const sources = [
      createGraphQLSource({
        suffix: 'Large',
        suffixRootTypeNames: true,
        suffixFieldNames: true,
        suffixResponses: true,
        delayImport: true,
      }),
      ...new Array(2).fill(0).map((_, i) =>
        createGraphQLSource({
          suffix: i.toString(),
          suffixRootTypeNames: true,
          suffixFieldNames: true,
          suffixResponses: true,
        }),
      ),
    ];
    const mesh1 = await getMesh({
      cache,
      pubsub,
      logger,
      sources,
      merger,
    });

    const mesh2 = await getMesh({
      cache,
      pubsub,
      logger,
      sources,
      merger,
    });

    expect(printSchemaWithDirectives(mesh1.schema)).toEqual(
      printSchemaWithDirectives(mesh2.schema),
    );

    expect(printSchemaWithDirectives(mesh1.schema)).toMatchInlineSnapshot(`
      "schema {
        query: Query
        mutation: Mutation
        subscription: Subscription
      }

      type Query {
        helloLarge: String
        hello0: String
        hello1: String
      }

      type Mutation {
        byeLarge: String
        bye0: String
        bye1: String
      }

      type Subscription {
        waveLarge: String
        wave0: String
        wave1: String
      }"
    `);
  });

  it('generates valid schema from multiple JSON Schema sources with bare merger', async () => {
    const mesh = await getMesh({
      cache,
      pubsub,
      logger,
      sources: [
        {
          name: 'Foo',
          handler: new JsonSchemaHandler({
            baseDir,
            cache,
            pubsub,
            logger,
            store,
            importFn: defaultImportFn,
            name: 'Foo',
            config: {
              operations: [
                {
                  type: 'Query',
                  field: 'foo',
                  path: '/foo',
                  responseSample: {
                    bar: 'baz',
                  },
                },
              ],
            },
          }),
        },
        {
          name: 'Bar',
          handler: new JsonSchemaHandler({
            baseDir,
            cache,
            pubsub,
            logger,
            store,
            importFn: defaultImportFn,
            name: 'Bar',
            config: {
              operations: [
                {
                  type: 'Query',
                  field: 'bar',
                  path: '/bar',
                  responseSample: {
                    baz: 'qux',
                  },
                },
              ],
            },
          }),
        },
      ],
      merger: new BareMerger({
        cache,
        pubsub,
        logger,
        store,
      }),
    });
    const printedSchema = printSchemaWithDirectives(mesh.schema);
    const parsedSchema = buildSchema(printedSchema);
    const validatedErrors = validateSchema(parsedSchema);
    expect(validatedErrors).toHaveLength(0);
  });
});
