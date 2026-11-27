/* eslint-disable import/no-extraneous-dependencies */
import { buildSchema, parse, validateSchema } from 'graphql';
import { MemPubSub } from '@graphql-hive/pubsub';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import GraphQLHandler from '@graphql-mesh/graphql';
import JsonSchemaHandler from '@graphql-mesh/json-schema';
import BareMerger from '@graphql-mesh/merger-bare';
import FederationMerger from '@graphql-mesh/merger-federation';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { defaultImportFn } from '@graphql-mesh/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { dummyLogger as log } from '../../../testing/dummyLogger';
import { getMesh } from '../src/get-mesh.js';
import type { MeshResolvedSource } from '../src/types.js';

describe('getMesh', () => {
  const baseDir = __dirname;
  let cache: InMemoryLRUCache;
  let pubsub: MemPubSub;
  let store: MeshStore;
  let merger: FederationMerger;
  beforeEach(() => {
    cache = new InMemoryLRUCache();
    pubsub = new MemPubSub();
    store = new MeshStore('test', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    merger = new FederationMerger({
      store,
      cache,
      pubsub,
      log,
    });
    globalThis.process!.env!.NODE_ENV = 'test';
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
        log,
        async importFn(moduleId) {
          if (config.delayImport) {
            await new Promise(resolve => setTimeout(resolve, 1));
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
    // Distinct root field names per source: Federation rejects overlapping
    // Subscription fields (cannot be @shareable), so suffix field names.
    const mesh = await getMesh({
      cache,
      pubsub,
      log,
      sources: new Array(3).fill(0).map((_, i) =>
        createGraphQLSource({
          suffix: i.toString(),
          suffixRootTypeNames: true,
          suffixFieldNames: true,
          suffixResponses: true,
        }),
      ),
      merger,
    });

    expect(printSchemaWithDirectives(mesh.schema)).toMatchInlineSnapshot(`
schema {query:Query mutation:Mutation subscription:Subscription}
type Query {hello0:String hello1:String hello2:String}
type Mutation {bye0:String bye1:String bye2:String}
type Subscription {wave0:String wave1:String wave2:String}

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
  "data": {
    "hello0": "Hello from service0",
    "hello1": "Hello from service1",
    "hello2": "Hello from service2",
  },
}
`);
  });

  it('can stitch a mutation field to a query field', async () => {
    const mesh = await getMesh({
      cache,
      pubsub,
      log,
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
    globalThis.process!.env!.NODE_ENV = 'production';
    const errorLogSpy = jest.spyOn(log, 'error');
    const mesh = await getMesh({
      cache,
      pubsub,
      log,
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

    const firstErrorWithStack = String(errorLogSpy.mock.calls[0][0]);
    expect(firstErrorWithStack).toContain('This is an error');
    expect(firstErrorWithStack).toContain('at Object.throwMe (');
  });

  it('prints errors with stack traces of the original errors in development', async () => {
    globalThis.process!.env!.NODE_ENV = 'development';
    const mesh = await getMesh({
      cache,
      pubsub,
      log,
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
      log,
      sources,
      merger,
    });

    const mesh2 = await getMesh({
      cache,
      pubsub,
      log,
      sources,
      merger,
    });

    expect(printSchemaWithDirectives(mesh1.schema)).toEqual(
      printSchemaWithDirectives(mesh2.schema),
    );

    expect(printSchemaWithDirectives(mesh1.schema)).toMatchInlineSnapshot(`
schema {query:Query mutation:Mutation subscription:Subscription}
type Query {helloLarge:String hello0:String hello1:String}
type Mutation {byeLarge:String bye0:String bye1:String}
type Subscription {waveLarge:String wave0:String wave1:String}

`);
  });

  it('composes a supergraph under the hood for multi-source stitching', async () => {
    const mesh = await getMesh({
      cache,
      pubsub,
      log,
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
    });

    const supergraphSdl = (mesh.schema.extensions as { supergraphSdl?: string } | undefined)
      ?.supergraphSdl;
    expect(supergraphSdl).toEqual(expect.any(String));
    expect(supergraphSdl).toContain('join__Graph');
    expect(supergraphSdl).toContain('mesh://legacy/');

    const result = await mesh.execute(
      /* GraphQL */ `
        {
          helloFoo
          helloBar
        }
      `,
      {},
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "helloBar": "Hello from serviceBar",
          "helloFoo": "Hello from serviceFoo",
        },
      }
    `);

    await mesh.destroy();
  });

  it('resolves entity hops via under-the-hood supergraph type merging', async () => {
    const authorsSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          author(id: ID!): Author!
        }
        type Author {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          author: (_, { id }) => ({ id, name: `Author ${id}` }),
        },
      },
    });
    const booksSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          book(id: ID!): Book!
          author(id: ID!): Author!
        }
        type Book {
          id: ID!
          title: String!
          author: Author!
        }
        type Author {
          id: ID!
        }
      `,
      resolvers: {
        Query: {
          book: (_, { id }) => ({
            id,
            title: `Book ${id}`,
            author: { id: '1' },
          }),
          author: (_, { id }) => ({ id }),
        },
      },
    });

    const mesh = await getMesh({
      cache,
      pubsub,
      log,
      merger,
      sources: [
        {
          name: 'authors',
          handler: {
            getMeshSource: async () => ({ schema: authorsSchema }),
          } as MeshResolvedSource['handler'],
          transforms: [],
        },
        {
          name: 'books',
          handler: {
            getMeshSource: async () => ({ schema: booksSchema }),
          } as MeshResolvedSource['handler'],
          transforms: [],
        },
      ],
    });

    const supergraphSdl = (mesh.schema.extensions as { supergraphSdl?: string } | undefined)
      ?.supergraphSdl;
    expect(supergraphSdl).toEqual(expect.any(String));
    // Semantic conventions stamp Mesh @merge (join-rewritten). Federation Spec
    // @lookup/@is/@internal is preferred when the compose lookup work lands.
    expect(supergraphSdl).toMatch(/name:\s*"merge"|@merge/);

    const result = await mesh.execute(
      /* GraphQL */ `
        {
          book(id: "42") {
            id
            title
            author {
              id
              name
            }
          }
        }
      `,
      {},
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "book": {
            "author": {
              "id": "1",
              "name": "Author 1",
            },
            "id": "42",
            "title": "Book 42",
          },
        },
      }
    `);

    await mesh.destroy();
  });

  it('generates valid schema from multiple JSON Schema sources with bare merger', async () => {
    const mesh = await getMesh({
      cache,
      pubsub,
      log,
      sources: [
        {
          name: 'Foo',
          handler: new JsonSchemaHandler({
            baseDir,
            cache,
            pubsub,
            log,
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
            log,
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
        log,
        store,
      }),
    });
    const printedSchema = printSchemaWithDirectives(mesh.schema);
    // Connectors apps are stamped via extensions without `directive @connect`
    // defs (Apollo-like loader SDL). Round-trip with assumeValidSDL.
    const parsedSchema = buildSchema(printedSchema, {
      assumeValidSDL: true,
    });
    const validatedErrors = validateSchema(parsedSchema);
    expect(validatedErrors).toHaveLength(0);
  });
});
