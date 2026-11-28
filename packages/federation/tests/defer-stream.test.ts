import { setTimeout } from 'timers/promises';
import { inspect } from 'util';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { normalizedExecutor } from '@graphql-tools/executor';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { asArray, ExecutionResult, mergeDeep } from '@graphql-tools/utils';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import {
  assertAsyncIterable,
  composeLocalSchemasWithApollo,
} from './helpers';
import { AsyncDisposableStack } from '@whatwg-node/disposablestack';
import { GraphQLSchema, parse, print } from 'graphql';
import { createYoga } from 'graphql-yoga';
import _ from 'lodash';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

function mergeIncrementalResults(values: ExecutionResult[]) {
  const result: ExecutionResult = {};
  for (const value of values) {
    if (value.data) {
      if (!result.data) {
        result.data = value.data;
      } else {
        result.data = mergeDeep([result.data, value.data]);
      }
    }
    if (value.errors) {
      result.errors = result.errors || [];
      result.errors = [...result.errors, ...value.errors];
    }
    if (value.incremental) {
      for (const incremental of value.incremental) {
        if (incremental.path) {
          result.data = result.data || {};
          const incrementalItems = incremental.items
            ? asArray(incremental.items).filter((item) => item != null)
            : [];
          if (incremental.data != null) {
            incrementalItems.unshift(incremental.data);
          }
          for (const incrementalItem of incrementalItems) {
            if (!incremental.path.length) {
              result.data = mergeDeep([result.data, incrementalItem]);
            } else {
              const existingData = _.get(result.data, incremental.path);
              if (!existingData) {
                _.set(result.data, incremental.path, incrementalItem);
              } else {
                _.set(
                  result.data,
                  incremental.path,
                  mergeDeep([existingData, incrementalItem]),
                );
              }
            }
          }
        }
        if (incremental.errors) {
          result.errors = result.errors || [];
          result.errors = [...result.errors, ...incremental.errors];
        }
      }
    }
  }
  return result;
}

describe('Defer/Stream', () => {
  const users = [
    { id: '1', name: 'Ada Lovelace' },
    { id: '2', name: 'Alan Turing' },
  ];
  const posts = [
    { id: '1', title: 'Hello, World!', authorId: '1' },
    { id: '2', title: 'My Story', authorId: '2' },
  ];
  function resolveWithDelay<T>(value: () => T, delay: number): Promise<T> {
    return setTimeout(delay).then(() => value());
  }
  const usersSubgraph = buildSubgraphSchema([{
    typeDefs: parse(/* GraphQL */ `
      type Query {
        user(id: ID!): User
        users: [User]
        usersStream: [User]
      }

      type User @key(fields: "id") {
        id: ID!
        name: String!
      }
    `),
    resolvers: {
      User: {
        __resolveReference: (user: { id: string }) =>
          resolveWithDelay(() => users.find((u) => u.id === user.id), 500),
      },
      Query: {
        users: () => resolveWithDelay(() => users, 300),
        user: (_, { id }) =>
          resolveWithDelay(() => users.find((user) => user.id === id), 500),
        usersStream: async function* usersStream() {
          for (const user of users) {
            yield user;
            await setTimeout(500);
          }
        },
      },
    },
  }]);
  const usersServer = createYoga({
    logging: false,
    schema: usersSubgraph,
    plugins: [useDeferStream()],
  });
  const postsSubgraph = buildSubgraphSchema([{
    typeDefs: parse(/* GraphQL */ `
      type Query {
        post(id: ID!): Post
        posts: [Post]
      }

      type Post @key(fields: "id") {
        id: ID!
        title: String
        author: User!
      }

      extend type User @key(fields: "id") {
        id: ID! @external
        posts: [Post]
      }
    `),
    resolvers: {
      Post: {
        __resolveReference: (post: { id: string }) =>
          resolveWithDelay(() => posts.find((p) => p.id === post.id), 300),
        author: (post: { authorId: string }) =>
          resolveWithDelay(
            () => users.find((user) => user.id === post.authorId),
            300,
          ),
      },
      User: {
        __resolveReference: (user: { id: string }) =>
          resolveWithDelay(() => users.find((u) => u.id === user.id), 300),
        posts: (user: { id: string }) =>
          resolveWithDelay(
            () => posts.filter((post) => post.authorId === user.id),
            300,
          ),
      },
      Query: {
        post: (_, { id }) =>
          resolveWithDelay(() => posts.find((post) => post.id === id), 300),
        posts: () => resolveWithDelay(() => posts, 300),
        postsStream: async function* postsStream() {
          for (const post of posts) {
            yield post;
            await setTimeout(500);
          }
        },
      },
    },
  }]);
  const postsServer = createYoga({
    logging: false,
    schema: postsSubgraph,
    plugins: [useDeferStream()],
  });
  const disposableStack = new AsyncDisposableStack();
  let schema: GraphQLSchema;
  let finalResult: ExecutionResult;
  beforeAll(async () => {
    const supergraphSdl = await composeLocalSchemasWithApollo([
      { name: 'users', schema: usersSubgraph },
      { name: 'posts', schema: postsSubgraph },
    ]);
    schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onSubschemaConfig(subschemaConfig) {
        const subgraphName = subschemaConfig.name.toLowerCase();
        if (subgraphName === 'users') {
          const origExecutor = disposableStack.use(
            buildHTTPExecutor({
              endpoint: 'http://localhost:4001/graphql',
              fetch: usersServer.fetch,
            }),
          );
          subschemaConfig.executor = async function usersExecutor(execReq) {
            const result = await origExecutor(execReq);
            if (process.env['DEBUG']) {
              console.log({
                subgraphName,
                document: print(execReq.document),
                result: inspect(result, false, Infinity),
              });
            }
            return result;
          };
        } else if (subgraphName === 'posts') {
          const origExecutor = disposableStack.use(
            buildHTTPExecutor({
              endpoint: 'http://localhost:4002/graphql',
              fetch: postsServer.fetch,
            }),
          );
          subschemaConfig.executor = async function postsExecutor(execReq) {
            const result = await origExecutor(execReq);
            if (process.env['DEBUG']) {
              console.log({
                subgraphName,
                document: print(execReq.document),
                result: inspect(result, false, Infinity),
              });
            }
            return result;
          };
        } else {
          throw new Error(`Unknown subgraph: ${subgraphName}`);
        }
      },
    });
    finalResult = (await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          users {
            id
            name
            posts {
              id
              title
              author {
                id
                name
              }
            }
          }
          posts {
            id
            title
            author {
              id
              name
              posts {
                id
                title
              }
            }
          }
        }
      `),
    })) as ExecutionResult;
  });
  it('defers the root fields', async () => {
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          ... @defer {
            users {
              id
              name
              posts {
                id
                title
                author {
                  id
                  name
                }
              }
            }
          }
          ... @defer {
            posts {
              id
              title
              author {
                id
                name
                posts {
                  id
                  title
                }
              }
            }
          }
        }
      `),
    });
    assertAsyncIterable(result);
    const values = [];
    for await (const value of result) {
      if (value.incremental?.some((v) => v.errors?.length)) {
        throw new Error(
          `Unexpected on incremental response: ${inspect(value, false, Infinity)}`,
        );
      }
      if (value.errors) {
        throw new Error(`Unexpected error: ${value.errors}`);
      }
      values.push(value);
    }
    expect(values).toMatchSnapshot('defer-root-fields');
    const mergedResult = mergeIncrementalResults(values);
    expect(mergedResult).toEqual(finalResult);
  });
  it('defers the nested fields', async () => {
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          users {
            id
            name
            ... @defer {
              posts {
                id
                ... @defer {
                  title
                }
                author {
                  id
                  ... @defer {
                    name
                  }
                }
              }
            }
          }
          ... @defer {
            posts {
              id
              title
              author {
                id
                ... @defer {
                  name
                }
                posts {
                  id
                  title
                }
              }
            }
          }
        }
      `),
    });
    assertAsyncIterable(result);
    const values = [];
    for await (const value of result) {
      if (value.incremental?.some((v) => v.errors?.length)) {
        throw new Error(
          `Unexpected on incremental response: ${inspect(value, false, Infinity)}`,
        );
      }
      if (value.errors) {
        throw new Error(`Unexpected error: ${value.errors}`);
      }
      values.push(value);
    }
    expect(values).toMatchSnapshot('defer-nested-fields');
    const mergedResult = mergeIncrementalResults(values);
    expect(mergedResult).toEqual(finalResult);
  });
  it('streams', async () => {
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          usersStream @stream {
            id
            name
            posts {
              id
              title
              author {
                id
                name
              }
            }
          }
        }
      `),
    });
    assertAsyncIterable(result);
    const values = [];
    for await (const value of result) {
      if (value.incremental?.some((v) => v.errors?.length)) {
        throw new Error(
          `Unexpected on incremental response: ${inspect(value, false, Infinity)}`,
        );
      }
      if (value.errors) {
        throw new Error(`Unexpected error: ${value.errors}`);
      }
      values.push(value);
    }
    expect(values).toMatchSnapshot('stream');
    const mergedResult = mergeIncrementalResults(values);
    expect(mergedResult).toEqual({
      data: {
        usersStream: [
          {
            id: '1',
            name: 'Ada Lovelace',
            posts: [
              {
                id: '1',
                title: 'Hello, World!',
                author: {
                  id: '1',
                  name: 'Ada Lovelace',
                },
              },
            ],
          },
          {
            id: '2',
            name: 'Alan Turing',
            posts: [
              {
                id: '2',
                title: 'My Story',
                author: {
                  id: '2',
                  name: 'Alan Turing',
                },
              },
            ],
          },
        ],
      },
    });
  });

  afterAll(() => disposableStack.disposeAsync());
});

describe('Defer/Stream - entity-level defer on merged types', () => {
  const slowSubgraphDelayMs = 1000;
  const menuItems = [
    { id: '1', name: 'Item 1', prepSequenceMultiLocationId: 'p1' },
    { id: '2', name: 'Item 2', prepSequenceMultiLocationId: 'p2' },
  ];
  const menusSubgraph = buildSubgraphSchema([{
    typeDefs: parse(/* GraphQL */ `
      type Query {
        menuItems: [MenuItem]
      }

      type MenuItem @key(fields: "id") {
        id: ID!
        name: String!
        prepSequenceMultiLocationId: ID
      }
    `),
    resolvers: {
      Query: {
        menuItems: () => menuItems,
      },
    },
  }]);
  const kitchenSubgraph = buildSubgraphSchema([{
    typeDefs: parse(/* GraphQL */ `
      type PrepSequence {
        id: ID!
      }

      type MenuItem @key(fields: "id") {
        id: ID!
        prepSequenceMultiLocationId: ID @external
        prepSequence: PrepSequence
          @requires(fields: "prepSequenceMultiLocationId")
      }
    `),
    resolvers: {
      MenuItem: {
        __resolveReference: (ref: { id: string }) => ref,
        prepSequence: async (ref: { prepSequenceMultiLocationId: string }) => {
          await setTimeout(slowSubgraphDelayMs);
          return { id: `seq-${ref.prepSequenceMultiLocationId}` };
        },
      },
    },
  }]);
  const menusServer = createYoga({
    logging: false,
    schema: menusSubgraph,
    plugins: [useDeferStream()],
  });
  const kitchenServer = createYoga({
    logging: false,
    schema: kitchenSubgraph,
    plugins: [useDeferStream()],
  });
  const disposableStack = new AsyncDisposableStack();
  let schema: GraphQLSchema;
  let supergraphSdl: string;
  beforeAll(async () => {
    supergraphSdl = await composeLocalSchemasWithApollo([
      { name: 'menus', schema: menusSubgraph },
      { name: 'kitchen', schema: kitchenSubgraph },
    ]);
    schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onSubschemaConfig(subschemaConfig) {
        const server =
          subschemaConfig.name.toLowerCase() === 'kitchen'
            ? kitchenServer
            : menusServer;
        subschemaConfig.executor = disposableStack.use(
          buildHTTPExecutor({
            endpoint: 'http://localhost:4003/graphql',
            fetch: server.fetch,
          }),
        );
      },
    });
  });
  afterAll(() => disposableStack.disposeAsync());
  it('flushes the initial payload before deferred merged fields resolve', async () => {
    const start = Date.now();
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          menuItems {
            ... on MenuItem {
              id
              name
            }
            ... on MenuItem @defer {
              prepSequence {
                id
              }
            }
          }
        }
      `),
    });
    assertAsyncIterable(result);
    const values: ExecutionResult[] = [];
    let initialPayload: ExecutionResult | undefined;
    for await (const value of result) {
      if (!initialPayload) {
        initialPayload = value;
        // the initial payload must not wait for the deferred merged fields
        expect(Date.now() - start).toBeLessThan(slowSubgraphDelayMs);
      }
      values.push(value);
    }
    expect(initialPayload).toEqual({
      data: {
        menuItems: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ],
      },
      hasNext: true,
    });
    const mergedResult = mergeIncrementalResults(values);
    expect(mergedResult).toEqual({
      data: {
        menuItems: [
          { id: '1', name: 'Item 1', prepSequence: { id: 'seq-p1' } },
          { id: '2', name: 'Item 2', prepSequence: { id: 'seq-p2' } },
        ],
      },
    });
  });

  it('entity-level @defer stays gateway-owned even when the owning subgraph has defer: true', async () => {
    // Type-merge plans collect FieldNodes only, so the owning subgraph still
    // sees a plain `_entities` follow-up (no `@defer` on that selection).
    // `SubschemaConfig.defer` must not change that flush path.
    const kitchenQueries: string[] = [];
    const menusFetch = menusServer.fetch.bind(menusServer);
    const kitchenFetch = kitchenServer.fetch.bind(kitchenServer);
    await using menusExecutor = buildHTTPExecutor({
      endpoint: 'http://localhost:4003/graphql',
      fetch: menusFetch,
    });
    await using kitchenExecutor = buildHTTPExecutor({
      endpoint: 'http://localhost:4003/graphql',
      fetch: async (url, init) => {
        if (typeof init?.body === 'string') {
          kitchenQueries.push(init.body);
        }
        return kitchenFetch(url as any, init as any);
      },
    });
    const forwardedSchema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onSubschemaConfig(subschemaConfig) {
        const isKitchen = subschemaConfig.name.toLowerCase() === 'kitchen';
        subschemaConfig.executor = isKitchen ? kitchenExecutor : menusExecutor;
        if (isKitchen) {
          subschemaConfig.defer = true;
        }
      },
    });

    const start = Date.now();
    const result = await normalizedExecutor({
      schema: forwardedSchema,
      document: parse(/* GraphQL */ `
        query {
          menuItems {
            id
            name
            ... on MenuItem @defer(label: "prep") {
              prepSequence {
                id
              }
            }
          }
        }
      `),
    });
    assertAsyncIterable(result);
    const values: ExecutionResult[] = [];
    let initialPayload: ExecutionResult | undefined;
    for await (const value of result) {
      if (!initialPayload) {
        initialPayload = value;
        expect(Date.now() - start).toBeLessThan(slowSubgraphDelayMs);
      }
      values.push(value);
    }
    expect(initialPayload).toMatchObject({
      data: {
        menuItems: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ],
      },
      hasNext: true,
    });
    expect(kitchenQueries.length).toBeGreaterThan(0);
    if (!kitchenQueries.some((body) => body.includes('prepSequence'))) {
      throw new Error(
        `expected kitchen _entities to request prepSequence, got:\n${kitchenQueries.join('\n')}`,
      );
    }
    // Entity follow-ups are not subgraph-forwarded.
    expect(kitchenQueries.some((body) => body.includes('@defer'))).toBe(false);
    expect(mergeIncrementalResults(values)).toEqual({
      data: {
        menuItems: [
          { id: '1', name: 'Item 1', prepSequence: { id: 'seq-p1' } },
          { id: '2', name: 'Item 2', prepSequence: { id: 'seq-p2' } },
        ],
      },
    });
  });
});

describe('Defer/Stream - scalar streaming via HTTP', () => {
  const letters = ['a', 'b', 'c', 'd', 'e'];

  // A minimal subgraph that exposes a [String!]! stream field - mirrors the
  // issue reproduction where `alphabet: [String!]!` is streamed via @stream.
  const alphabetSubgraph = buildSubgraphSchema([{
    typeDefs: parse(/* GraphQL */ `
      type Query {
        alphabet: [String!]!
      }
    `),
    resolvers: {
      Query: {
        alphabet: async function* alphabet() {
          for (const letter of letters) {
            yield letter;
          }
        },
      },
    },
  }]);

  const alphabetServer = createYoga({
    logging: false,
    schema: alphabetSubgraph,
    plugins: [useDeferStream()],
  });

  const disposableStack = new AsyncDisposableStack();
  let schema: GraphQLSchema;

  beforeAll(async () => {
    const supergraphSdl = await composeLocalSchemasWithApollo([
      { name: 'alphabet', schema: alphabetSubgraph },
    ]);
    schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onSubschemaConfig(subschemaConfig) {
        const origExecutor = disposableStack.use(
          buildHTTPExecutor({
            endpoint: 'http://localhost:4010/graphql',
            fetch: alphabetServer.fetch,
          }),
        );
        subschemaConfig.executor = async function alphabetExecutor(execReq) {
          const result = await origExecutor(execReq);
          if (process.env['DEBUG']) {
            console.log({
              document: print(execReq.document),
              result: inspect(result, false, Infinity),
            });
          }
          return result;
        };
      },
    });
  });

  afterAll(() => disposableStack.disposeAsync());

  it('streams [String!]! scalar list via @stream over HTTP', async () => {
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          alphabet @stream(initialCount: 1)
        }
      `),
    });
    assertAsyncIterable(result);
    const values = [];
    for await (const value of result) {
      if (value.incremental?.some((v) => v.errors?.length)) {
        throw new Error(
          `Unexpected on incremental response: ${inspect(value, false, Infinity)}`,
        );
      }
      if (value.errors) {
        throw new Error(
          `Unexpected error: ${inspect(value.errors, false, Infinity)}`,
        );
      }
      values.push(value);
    }
    const mergedResult = mergeIncrementalResults(values);
    expect(mergedResult).toEqual({
      data: {
        alphabet: letters,
      },
    });
  });
});
