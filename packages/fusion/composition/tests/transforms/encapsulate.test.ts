import { parse, type GraphQLSchema } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isAsyncIterable } from '@graphql-tools/utils';
import { Repeater } from '@repeaterjs/repeater';
import {
  createEncapsulateTransform,
  createFederationTransform,
  createRenameTypeTransform,
} from '../../src/transforms';
import {
  composeAndGetExecutor,
  composeAndGetPublicSchema,
  printSortedSchemaWithDirectives,
} from './utils';

describe('encapsulate', () => {
  let schema: GraphQLSchema;
  beforeEach(() => {
    schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          getSomething: String
          getSomethingElse: String
        }

        type Mutation {
          doSomething: String
          doSomethingElse: String
        }

        type Subscription {
          notify: String!
        }
      `,
      resolvers: {
        Query: {
          getSomething: () => 'boop',
        },
        Mutation: {
          doSomething: () => 'noop',
        },
        Subscription: {
          notify: {
            subscribe: () =>
              new Repeater((push, stop) => {
                const interval = setInterval(
                  () =>
                    push({
                      notify: 'boop',
                    }),
                  1000,
                );
                return stop.then(() => clearInterval(interval));
              }),
          },
        },
      },
    });
  });

  it('groups Mutation correctly', async () => {
    const transform = createEncapsulateTransform();
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);
    expect(newSchema.getMutationType().getFields().TEST).toBeDefined();
    expect(newSchema.getMutationType().getFields().notify).not.toBeDefined();
    expect(newSchema.getMutationType().getFields().TEST.type.toString()).toBe('TESTMutation!');
  });
  it('groups Subscription correctly', async () => {
    const transform = createEncapsulateTransform();
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);
    expect(newSchema.getSubscriptionType().getFields().TEST).toBeDefined();
    expect(newSchema.getSubscriptionType().getFields().getSomething).not.toBeDefined();
    expect(newSchema.getSubscriptionType().getFields().TEST.type.toString()).toBe(
      'TESTSubscription!',
    );
  });
  it('groups Query correctly', async () => {
    const transform = createEncapsulateTransform();
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);
    expect(newSchema.getQueryType().getFields().TEST).toBeDefined();
    expect(newSchema.getQueryType().getFields().TEST.type.toString()).toBe('TESTQuery!');
    expect(newSchema.getQueryType().getFields().getSomething).not.toBeDefined();
  });
  it('executes queries the same way and preserves the execution flow', async () => {
    const resultBefore = await normalizedExecutor({
      schema,
      document: parse(`{ getSomething }`),
    });
    if (isAsyncIterable(resultBefore)) {
      throw new Error('Expected a result, but got an async iterable');
    }
    expect(resultBefore.data.getSomething).toBe('boop');
    const transform = createEncapsulateTransform();
    const executor = composeAndGetExecutor([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);

    const resultAfter = await executor({
      query: `{ TEST { getSomething } }`,
    });

    expect(resultAfter.TEST.getSomething).toBe('boop');
  });
  it('works with federation transform', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Book {
          id: ID!
          name: String!
        }

        type Query {
          getBookHere(id: ID!): Book
        }
      `,
    });
    const encapsulationTransform = createEncapsulateTransform();
    const federationTransform = createFederationTransform({
      Book: {
        key: [
          {
            fields: 'id',
            resolveReference: {
              fieldName: 'getBookHere',
            },
          },
        ],
      },
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [federationTransform, encapsulationTransform],
        name: 'TEST',
      },
    ]);
    expect(printSortedSchemaWithDirectives(newSchema)).toMatchSnapshot();
  });
  it('forwards field arguments via sourceArgs', async () => {
    const schemaWithArgs = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Item {
          id: ID!
          name: String!
        }

        type Query {
          itemById(id: ID!, options: [String]): Item
        }
      `,
      resolvers: {
        Query: {
          itemById: (_: any, args: { id: string; options?: string[] }) => ({
            id: args.id,
            name: `Item ${args.id}`,
          }),
        },
      },
    });
    const transform = createEncapsulateTransform();
    const executor = composeAndGetExecutor([
      {
        schema: schemaWithArgs,
        transforms: [transform],
        name: 'items',
      },
    ]);

    const result = await executor({
      query: `query ($id: ID!, $options: [String]) { items { itemById(id: $id, options: $options) { id name } } }`,
      variables: { id: '123', options: ['opt1', 'opt2'] },
    });

    expect(result.items.itemById).toEqual({
      id: '123',
      name: 'Item 123',
    });
  });
  it('does not conflict with other subgraphs having the same root field', async () => {
    const subgraphA = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          getItems: [Item]
        }
        type Item {
          id: ID!
        }
      `,
      resolvers: {
        Query: {
          getItems: () => [{ id: '1' }, { id: '2' }],
        },
      },
    });
    const subgraphB = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          getItems: [Item]
        }
        type Item {
          id: ID!
        }
      `,
      resolvers: {
        Query: {
          getItems: () => [{ id: '3' }, { id: '4' }],
        },
      },
    });
    const renameItemTransform = createRenameTypeTransform(({ typeName, subgraphConfig }) => {
      if (typeName === 'Item') {
        return `${subgraphConfig.name}_Item`;
      }
      return typeName;
    });
    const encapsulateTransform = createEncapsulateTransform();

    const executor = composeAndGetExecutor([
      {
        schema: subgraphA,
        transforms: [renameItemTransform, encapsulateTransform],
        name: 'A',
      },
      {
        schema: subgraphB,
        transforms: [renameItemTransform, encapsulateTransform],
        name: 'B',
      },
    ]);

    const result = await executor({
      query: `query { A { getItems { id } } B { getItems { id } } }`,
    });

    expect(result).toEqual({
      A: {
        getItems: [{ id: '1' }, { id: '2' }],
      },
      B: {
        getItems: [{ id: '3' }, { id: '4' }],
      },
    });
  });

  it('keeps interface implementors queryable (#8382)', async () => {
    const subgraph = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        interface Greeting {
          message: String!
        }

        type HelloGreeting implements Greeting {
          message: String!
          iconName: String!
        }

        type Query {
          hello: Greeting
        }
      `,
      resolvers: {
        Query: {
          hello: () => ({
            __typename: 'HelloGreeting',
            message: 'Hello world!',
            iconName: 'wave',
          }),
        },
        Greeting: {
          __resolveType: () => 'HelloGreeting',
        },
      },
    });
    const transform = createEncapsulateTransform({ name: 'api' });
    const publicSchema = await composeAndGetPublicSchema([
      {
        schema: subgraph,
        transforms: [transform],
        name: 'api',
      },
    ]);
    expect(publicSchema.getType('HelloGreeting')).toBeDefined();
    expect(publicSchema.getType('Greeting')).toBeDefined();

    const executor = composeAndGetExecutor([
      {
        schema: subgraph,
        transforms: [transform],
        name: 'api',
      },
    ]);
    const result = await executor({
      query: /* GraphQL */ `
        query {
          api {
            hello {
              message
              __typename
              ... on HelloGreeting {
                iconName
              }
            }
          }
        }
      `,
    });
    expect(result).toEqual({
      api: {
        hello: {
          message: 'Hello world!',
          __typename: 'HelloGreeting',
          iconName: 'wave',
        },
      },
    });
  });

  it('keeps union members queryable after encapsulate', async () => {
    const subgraph = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Cat {
          meow: String!
        }
        type Dog {
          bark: String!
        }
        union Pet = Cat | Dog
        type Query {
          pet: Pet
        }
      `,
      resolvers: {
        Query: {
          pet: () => ({ __typename: 'Dog', bark: 'woof' }),
        },
        Pet: {
          __resolveType: obj => obj.__typename,
        },
      },
    });
    const transform = createEncapsulateTransform({ name: 'api' });
    const executor = composeAndGetExecutor([
      {
        schema: subgraph,
        transforms: [transform],
        name: 'api',
      },
    ]);
    const result = await executor({
      query: /* GraphQL */ `
        query {
          api {
            pet {
              __typename
              ... on Dog {
                bark
              }
            }
          }
        }
      `,
    });
    expect(result).toEqual({
      api: {
        pet: {
          __typename: 'Dog',
          bark: 'woof',
        },
      },
    });
  });

  it('merges two subgraphs encapsulated under the same name (#4962)', async () => {
    const books = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          heartbeat: String!
        }
      `,
      resolvers: {
        Query: {
          heartbeat: () => 'books-ok',
        },
      },
    });
    const animals = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          heartbeat: String!
        }
      `,
      resolvers: {
        Query: {
          heartbeat: () => 'animals-ok',
        },
      },
    });
    const executor = composeAndGetExecutor([
      {
        schema: books,
        transforms: [
          createEncapsulateTransform({ name: 'library' }),
          createEncapsulateTransform({ name: 'platform' }),
        ],
        name: 'BooksService',
      },
      {
        schema: animals,
        transforms: [
          createEncapsulateTransform({ name: 'pets' }),
          createEncapsulateTransform({ name: 'platform' }),
        ],
        name: 'AnimalsService',
      },
    ]);
    const result = await executor({
      query: /* GraphQL */ `
        query {
          platform {
            library {
              heartbeat
            }
            pets {
              heartbeat
            }
          }
        }
      `,
    });
    expect(result).toEqual({
      platform: {
        library: { heartbeat: 'books-ok' },
        pets: { heartbeat: 'animals-ok' },
      },
    });
  });
});
