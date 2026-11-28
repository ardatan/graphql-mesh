import { GraphQLSchema, parse, print } from 'graphql';
import { kebabCase } from 'lodash';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { ExecutionRequest, Executor } from '@graphql-tools/utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';
import { getServiceInputs, getSupergraph } from './fixtures/gateway/supergraph';
import {
  Aschema,
  Bschema,
  Cschema,
  Dschema,
  Eschema,
} from './fixtures/optimizations/awareness-of-other-fields';
import { getStitchedSchemaFromLocalSchemas } from './getStitchedSchemaFromLocalSchemas';
import { composeLocalSchemasWithApollo } from './helpers';

describe('Optimizations', () => {
  let serviceCallCnt: Record<string, number>;
  let schema: GraphQLSchema;
  beforeEach(async () => {
    serviceCallCnt = {};
    const serviceInputs = getServiceInputs();
    schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl: await getSupergraph(),
      onSubschemaConfig(subschemaConfig) {
        const subgraphName = subschemaConfig.name.toLowerCase();
        const serviceInput = serviceInputs.find(input => input.name === subgraphName);
        if (!serviceInput) {
          throw new Error(`Service ${subgraphName} not found`);
        }
        const executor = createDefaultExecutor(serviceInput.schema);
        serviceCallCnt[subgraphName] = 0;
        subschemaConfig.executor = args => {
          serviceCallCnt[subgraphName]!++;
          return executor(args);
        };
      },
    });
  });
  it('should not do extra calls with "@provides"', async () => {
    const query = /* GraphQL */ `
      query {
        topProducts {
          name
          reviews {
            body
            author {
              username
            }
          }
        }
      }
    `;
    await normalizedExecutor({
      schema,
      document: parse(query),
    });
    expect(serviceCallCnt['accounts']).toBe(0);
  });
  it('should do deduplication', async () => {
    const query = /* GraphQL */ `
      fragment User on User {
        id
        username
        name
      }

      fragment Review on Review {
        id
        body
      }

      fragment Product on Product {
        inStock
        name
        price
        shippingEstimate
        upc
        weight
      }

      query TestQuery {
        users {
          ...User
          reviews {
            ...Review
            product {
              ...Product
              reviews {
                ...Review
                author {
                  ...User
                  reviews {
                    ...Review
                    product {
                      ...Product
                    }
                  }
                }
              }
            }
          }
        }
        topProducts {
          ...Product
          reviews {
            ...Review
            author {
              ...User
              reviews {
                ...Review
                product {
                  ...Product
                }
              }
            }
          }
        }
      }
    `;
    await normalizedExecutor({
      schema,
      document: parse(query),
    });
    expect(serviceCallCnt).toMatchObject({
      accounts: 2,
      // Computed fields coalesce inventory @requires into one hop.
      inventory: 1,
      products: 2,
      // BatchFetch coalesces User.reviews + Product.reviews into one hop.
      reviews: 1,
    });
  });
});

describe('awareness-of-other-fields', () => {
  let supergraphSdl: string;
  let gwSchema: GraphQLSchema;
  let subgraphCalls: { [subgraph: string]: number } = {};
  function getTracedExecutor(subgraphName: string, schema: GraphQLSchema): Executor {
    const executor = createDefaultExecutor(schema);
    return function tracedExecutor(execReq: ExecutionRequest) {
      subgraphCalls[subgraphName] = (subgraphCalls[subgraphName] || 0) + 1;
      return executor(execReq);
    };
  }
  afterEach(() => {
    subgraphCalls = {};
  });
  beforeAll(async () => {
    supergraphSdl = await composeLocalSchemasWithApollo([
      {
        name: 'A',
        schema: Aschema,
      },
      {
        name: 'B',
        schema: Bschema,
      },
      {
        name: 'C',
        schema: Cschema,
      },
      {
        name: 'D',
        schema: Dschema,
      },
      {
        name: 'E',
        schema: Eschema,
      },
    ]);
    gwSchema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onSubschemaConfig(subschemaConfig) {
        const subgraphName = subschemaConfig.name;
        switch (subgraphName) {
          case 'A':
            subschemaConfig.executor = getTracedExecutor(subgraphName, Aschema);
            break;
          case 'B':
            subschemaConfig.executor = getTracedExecutor(subgraphName, Bschema);
            break;
          case 'C':
            subschemaConfig.executor = getTracedExecutor(subgraphName, Cschema);
            break;
          case 'D':
            subschemaConfig.executor = getTracedExecutor(subgraphName, Dschema);
            break;
          case 'E':
            subschemaConfig.executor = getTracedExecutor(subgraphName, Eschema);
            break;
          default:
            throw new Error(`Unknown subgraph ${subgraphName}`);
        }
      },
    });
  });
  it('do not call A subgraph as an extra', async () => {
    const result = await normalizedExecutor({
      schema: gwSchema,
      document: parse(/* GraphQL */ `
        query {
          user(id: 1) {
            nickname
            money
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        user: {
          nickname: 'Ali',
          money: '1000 USD',
        },
      },
    });
    expect(subgraphCalls).toEqual({
      B: 1,
      C: 1,
      D: 1,
      E: 1,
    });
  });
});

it('prevents recursively depending fields in case of multiple keys', async () => {
  const authors = [
    {
      __typename: 'Author',
      id: '1',
      name: 'John Doe',
    },
    {
      __typename: 'Author',
      id: '2',
      name: 'Jane Doe',
    },
    {
      __typename: 'Author',
      id: '3',
      name: 'Max Mustermann',
    },
  ];
  const books = [
    {
      __typename: 'Book',
      id: '1',
      upc: '1_upc',
      author: authors[0],
    },
    {
      __typename: 'Book',
      id: '2',
      upc: '2_upc',
      authorId: '2',
      author: authors[1],
    },
    {
      __typename: 'Book',
      id: '3',
      upc: '3_upc',
      author: authors[2],
    },
  ];
  const booksSchema = buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        type Book @key(fields: "id") @key(fields: "upc") {
          id: ID!
          upc: ID!
        }
      `),
      resolvers: {
        Book: {
          __resolveReference(reference: { id?: string; upc?: string }) {
            if (reference.id) {
              return books.find(book => book.id === reference.id);
            }
            if (reference.upc && reference.upc !== '3_upc') {
              return books.find(book => book.upc === reference.upc);
            }
            return null;
          },
        },
      },
    },
  ]);
  const multiLocationMgmt = buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        type BookContainer { # the type that is used in a collection
          id: ID!
          # ... other stuff here
          source: Book!
        }

        type Book @key(fields: "upc") {
          upc: ID!
        }

        type Query {
          viewer: Viewer
        }

        type Viewer {
          booksContainer: BooksContainerResult
        }

        type BooksContainerResult {
          edges: [BooksContainerEdge!]!
          pageInfo: PageInfo!
        }

        type BooksContainerEdge {
          node: BookContainer!
          cursor: String!
        }

        type PageInfo {
          endCursor: String
        }
      `),
      resolvers: {
        Query: {
          viewer() {
            return {
              booksContainer: {
                edges: [
                  {
                    node: {
                      id: '1',
                      source: {
                        upc: '1_upc',
                      },
                    },
                    cursor: '1',
                  },
                  {
                    node: {
                      id: '2',
                      source: {
                        upc: '2_upc',
                      },
                    },
                    cursor: '2',
                  },
                  {
                    node: {
                      id: '3',
                      source: {
                        upc: '3_upc',
                      },
                    },
                    cursor: '3',
                  },
                ],
                pageInfo: {
                  endCursor: '3',
                },
              },
            };
          },
        },
      },
    },
  ]);
  const authorsSchema = buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        type Author @key(fields: "id") {
          id: ID!
          name: String!
        }
        type Book @key(fields: "id") {
          id: ID!
          author: Author
        }
      `),
      resolvers: {
        Book: {
          __resolveReference(reference: { id?: string }) {
            if (!reference) {
              throw new Error('No reference');
            }
            if (!reference.id) {
              throw new Error('No id');
            }
            return books.find(book => book.id === reference.id);
          },
        },
      },
    },
  ]);

  const supergraphSdl = await composeLocalSchemasWithApollo([
    {
      name: 'books',
      schema: booksSchema,
    },
    {
      name: 'authors',
      schema: authorsSchema,
    },
    {
      name: 'other-service',
      schema: multiLocationMgmt,
    },
  ]);
  let subgraphCallsMap: Record<
    string,
    {
      query: string;
      variables: any;
    }[]
  > = {};
  function createTracedExecutor(subgraphName: string, schema: GraphQLSchema): Executor {
    const executor = createDefaultExecutor(schema);
    return function tracedExecutor(execReq) {
      subgraphCallsMap[subgraphName] ||= [];
      subgraphCallsMap[subgraphName].push({
        query: print(execReq.document),
        variables: execReq.variables,
      });
      return executor(execReq);
    };
  }
  const gwSchema = getStitchedSchemaFromSupergraphSdl({
    supergraphSdl,
    onSubschemaConfig(subschemaConfig) {
      const subgraphName = kebabCase(subschemaConfig.name);
      switch (subgraphName) {
        case 'books':
          subschemaConfig.executor = createTracedExecutor(subgraphName, booksSchema);
          break;
        case 'other-service':
          subschemaConfig.executor = createTracedExecutor(subgraphName, multiLocationMgmt);
          break;
        case 'authors':
          subschemaConfig.executor = createTracedExecutor(subgraphName, authorsSchema);
          break;
        default:
          throw new Error(`Unknown subgraph ${subgraphName}`);
      }
    },
  });
  const result = await normalizedExecutor({
    schema: gwSchema,
    document: parse(/* GraphQL */ `
      query {
        viewer {
          booksContainer(input: $input) {
            edges {
              cursor
              node {
                source {
                  # Book(upc=)
                  upc
                }
              }
            }
            pageInfo {
              endCursor
            }
          }
        }
      }
    `),
  });
  expect(result).toEqual({
    data: {
      viewer: {
        booksContainer: {
          edges: [
            { cursor: '1', node: { source: { upc: '1_upc' } } },
            { cursor: '2', node: { source: { upc: '2_upc' } } },
            { cursor: '3', node: { source: { upc: '3_upc' } } },
          ],
          pageInfo: { endCursor: '3' },
        },
      },
    },
  });
  expect(Object.keys(subgraphCallsMap)).toEqual(['other-service']);
  expect(subgraphCallsMap['other-service']?.length).toBe(1);
  subgraphCallsMap = {};
  const result2 = await normalizedExecutor({
    schema: gwSchema,
    document: parse(/* GraphQL */ `
      query {
        viewer {
          booksContainer(input: $input) {
            edges {
              cursor
              node {
                source {
                  # Book(upc=)
                  upc
                  author {
                    name
                  }
                }
              }
            }
            pageInfo {
              endCursor
            }
          }
        }
      }
    `),
  });
  expect(result2).toEqual({
    data: {
      viewer: {
        booksContainer: {
          edges: [
            {
              cursor: '1',
              node: { source: { upc: '1_upc', author: { name: 'John Doe' } } },
            },
            {
              cursor: '2',
              node: { source: { upc: '2_upc', author: { name: 'Jane Doe' } } },
            },
            { cursor: '3', node: { source: { upc: '3_upc', author: null } } },
          ],
          pageInfo: { endCursor: '3' },
        },
      },
    },
  });
});

it('nested recursive requirements', async () => {
  const inventory = buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        type Query {
          colos: [Colo]
        }

        type Colo @key(fields: "id") {
          id: ID!
          cages: Cages
        }

        type Cages @key(fields: "id") @key(fields: "spatialId") {
          id: ID!
          spatialId: String
          number: Int!
          cabinets: [Cabinet]
        }

        type Cabinet @key(fields: "id") @key(fields: "spatialId") {
          id: ID!
          spatialId: String
          number: Int!
        }
      `),
      resolvers: {
        Query: {
          colos() {
            return [
              {
                id: '1',
              },
            ];
          },
        },
        Colo: {
          cages() {
            return {
              id: '1',
              number: 1,
              cabinets: [
                {
                  id: '1',
                  spatialId: '1',
                  number: 1,
                },
              ],
            };
          },
        },
      },
    },
  ]);

  const spatial = buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        type Cabinet @key(fields: "spatialId") {
          id: ID
          spatialId: String
          spatialCabinet: SpatialCabinet
        }

        type SpatialCabinet {
          spatialId: String
        }
      `),
      resolvers: {
        Cabinet: {
          spatialCabinet() {
            return {
              spatialId: '1',
            };
          },
        },
      },
    },
  ]);

  const subgraphCalls: Record<string, number> = {};

  const schema = await getStitchedSchemaFromLocalSchemas({
    localSchemas: {
      inventory,
      spatial,
    },
    onSubgraphExecute: subgraph => {
      subgraphCalls[subgraph] = (subgraphCalls[subgraph] || 0) + 1;
    },
  });

  expect(
    await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          colos {
            cages {
              id
              number
              cabinets {
                id
                number
                spatialCabinet {
                  spatialId
                }
              }
            }
          }
        }
      `),
    }),
  ).toEqual({
    data: {
      colos: [
        {
          cages: {
            cabinets: [
              {
                id: '1',
                number: 1,
                spatialCabinet: {
                  spatialId: '1',
                },
              },
            ],
            id: '1',
            number: 1,
          },
        },
      ],
    },
  });

  expect(subgraphCalls).toEqual({
    inventory: 1,
    spatial: 1,
  });
});

it('deduplicates the required fields from @key if they exists in the original query', async () => {
  const SUBGRAPHA = buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        type Query {
          _: Boolean
        }
        type Book @key(fields: "upc otherUpc shop { id }") {
          upc: ID!
          otherUpc: ID!
          shop: Shop!
        }

        type Shop @key(fields: "id") {
          id: ID!
          name: String!
          location: Location!
        }

        type Location {
          address1: String
          city: String
          state: String
        }
      `),
      resolvers: {
        Book: {
          __resolveReference(reference: { upc: string; otherUpc: string; shop: { id: string } }) {
            return {
              upc: reference.upc,
              otherUpc: reference.otherUpc,
              shop: {
                id: reference.shop.id,
                name: 'The Great Shop',
                location: {
                  address1: 'Address 1',
                  city: 'City',
                  state: 'State',
                },
              },
            };
          },
        },
        Shop: {
          __resolveReference(reference: { id: string }) {
            return {
              id: reference.id,
              name: 'The Great Shop',
              location: {
                address1: 'Address 1',
                city: 'City',
                state: 'State',
              },
            };
          },
        },
      },
    },
  ]);

  const SUBGRAPHB = buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        type Mutation {
          buyBook(input: BuyBookInput!): BuyBookPayload
        }

        input BuyBookInput {
          bookUpc: ID!
        }

        type BuyBookPayload {
          book: Book!
        }

        type Book @key(fields: "upc otherUpc shop { id }") {
          upc: ID!
          otherUpc: ID!
          shop: Shop!
        }

        type Shop @key(fields: "id") {
          id: ID!
        }
      `),
      resolvers: {
        Mutation: {
          buyBook(_, __) {
            return {
              book: {
                upc: 'order-upc',
                otherUpc: 'check-upc',
                shop: {
                  id: 'shop-id',
                },
              },
            };
          },
        },
      },
    },
  ]);

  const document = parse(/* GraphQL */ `
    mutation {
      buyBook(input: { bookUpc: "test" }) {
        book {
          upc
          otherUpc
          shop {
            id
            name
            location {
              address1
              city
              state
            }
          }
        }
      }
    }
  `);

  const subgraphCalls: {
    subgraphName: string;
    query: string;
  }[] = [];

  const schema = await getStitchedSchemaFromLocalSchemas({
    localSchemas: {
      SUBGRAPHA,
      SUBGRAPHB,
    },
    onSubgraphExecute(subgraphName, executionRequest) {
      subgraphCalls.push({
        subgraphName,
        query: print(executionRequest.document),
      });
    },
  });

  const result = await normalizedExecutor({
    schema,
    document,
  });

  expect(result).toEqual({
    data: {
      buyBook: {
        book: {
          upc: 'order-upc',
          otherUpc: 'check-upc',
          shop: {
            id: 'shop-id',
            name: 'The Great Shop',
            location: {
              address1: 'Address 1',
              city: 'City',
              state: 'State',
            },
          },
        },
      },
    },
  });

  // NOTE: we spread out snapshot testing because bun test vs vitest are fighting over formatting

  expect(subgraphCalls.length).toBe(2);

  expect(subgraphCalls[0]?.subgraphName).toBe('SUBGRAPHB');
  expect(subgraphCalls[0]?.query).toMatchInlineSnapshot(`
    "mutation {
      buyBook(input: { bookUpc: \"test\" }) {
        book {
          __typename
          upc
          otherUpc
          shop {
            __typename
            id
          }
        }
      }
    }"
  `);

  expect(subgraphCalls[1]?.subgraphName).toBe('SUBGRAPHA');
  expect(subgraphCalls[1]?.query).toMatchInlineSnapshot(`
    "query ($representations: [_Any!]!) {
      _entities(representations: $representations) {
        __typename
        ... on Shop {
          name
          location {
            address1
            city
            state
          }
        }
      }
    }"
  `);
});

it('does not add extra key fields', async () => {
  const guest = buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        type Guest @key(fields: "id") @key(fields: "authenticatedPhoneNumber") {
          id: ID!
          authenticatedPhoneNumber: String!
          # other fields...
        }

        type Query {
          guest(id: ID!): Guest
        }

        type Mutation {
          confirmGuest(input: ConfirmGuestInput!): ConfirmGuestPayload
        }

        union ConfirmGuestPayload = ConfirmGuestSuccess | ConfirmGuestFailure

        input ConfirmGuestInput {
          id: ID!
        }

        type ConfirmGuestSuccess {
          guest: Guest!
        }

        type ConfirmGuestFailure {
          reason: String!
        }
      `),
      resolvers: {
        Mutation: {
          confirmGuest(_, { input }: { input: { id: string } }) {
            return {
              __typename: 'ConfirmGuestSuccess',
              guest: {
                id: input.id,
                authenticatedPhoneNumber: new Error('Should not be called'),
              },
            };
          },
        },
      },
    },
  ]);
  const schema = await getStitchedSchemaFromLocalSchemas({
    localSchemas: {
      guest,
    },
  });

  const document = parse(/* GraphQL */ `
    mutation confirmGuest($input: ConfirmGuestInput!) {
      confirmGuest(input: $input) {
        ... on ConfirmGuestSuccess {
          guest {
            id # Only requesting 'id'
            __typename
          }
        }
      }
    }
  `);
  const result = await normalizedExecutor({
    schema,
    document,
    variableValues: {
      input: {
        id: 'guest-id',
      },
    },
  });

  expect(result).toEqual({
    data: {
      confirmGuest: {
        guest: {
          id: 'guest-id',
          __typename: 'Guest',
        },
      },
    },
  });
});

it('does not resolve stub types', async () => {
  const usersSubgraph = buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        extend schema
          @link(url: "https://specs.apollo.dev/federation/v2.7", import: ["@key", "@shareable"])

        type Query {
          getUsers(userIds: [ID!]!): GetUsersResult!
        }

        union GetUsersResult = GetUsersSuccess | UserDoesNotExistError | UnexpectedError

        type GetUsersSuccess {
          users: [User!]!
        }

        type UserDoesNotExistError {
          message: String!
        }

        type UnexpectedError @shareable {
          message: String!
        }

        enum UserVisibility {
          PUBLIC
          PRIVATE
        }

        type User @key(fields: "id") {
          id: ID!
          name: String!
          isMe: Boolean!
          userVisibility: UserVisibility!
        }
      `),
      resolvers: {
        Query: {
          getUsers: (_: unknown, args: { userIds: string[] }) => {
            return {
              __typename: 'GetUsersSuccess',
              users: args.userIds.map(id => ({
                id,
                name: `User ${id}`,
                isMe: false,
                userVisibility: 'PUBLIC',
              })),
            };
          },
        },
        GetUsersResult: {
          __resolveType: (obj: { __typename?: string }) => obj.__typename,
        },
        User: {
          __resolveReference: (ref: { id: string }) => {
            return {
              id: ref.id,
              name: `User ${ref.id}`,
              isMe: false,
              userVisibility: 'PUBLIC',
            };
          },
        },
      },
    },
  ]);
  const reviewsSubgraph = buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        extend schema @link(url: "https://specs.apollo.dev/federation/v2.7", import: ["@key"])

        type Query {
          _reviewsPlaceholder: String
        }

        type Rating @key(fields: "id") {
          id: ID!
          score: Int!
          maxScore: Int!
        }

        type Comment @key(fields: "id") {
          id: ID!
          text: String!
        }
      `),
      resolvers: {
        Query: { _reviewsPlaceholder: () => null },
        Rating: {
          __resolveReference: (ref: { id: string }) => {
            return { id: ref.id, score: 4, maxScore: 5 };
          },
        },
        Comment: {
          __resolveReference: (ref: { id: string }) => {
            return { id: ref.id, text: 'Great post!' };
          },
        },
      },
    },
  ]);
  const postsSubgraph = buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        extend schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.7"
            import: ["@key", "@external", "@shareable", "@requires"]
          )

        type Query {
          _postsPlaceholder: String
        }

        enum UserVisibility {
          PUBLIC
          PRIVATE
        }

        type User @key(fields: "id") {
          id: ID!
          isMe: Boolean! @external
          userVisibility: UserVisibility! @external
          posts(input: PageInput): PostPage @requires(fields: "isMe userVisibility")
        }

        input PageInput {
          limit: Int
          cursor: String
        }

        type PostPage {
          items: [Post!]!
          currentPageToken: String
          nextPageToken: String
        }

        type Post @key(fields: "id") {
          id: ID!
          visibility: String!
          content: PostContent!
        }

        type PostContent {
          text: String
          createdAt: String
          meta: PostMeta
        }

        type PostMeta {
          rating: Rating
          commentWrapper: CommentWrapper
        }

        type CommentWrapper {
          comment: Comment
        }

        # WORKAROUND: Add "resolvable: false" to prevent the bug:
        #   @key(fields: "id", resolvable: false)

        type Rating @key(fields: "id") {
          id: ID!
        }

        type Comment @key(fields: "id") {
          id: ID!
        }

        type UnexpectedError @shareable {
          message: String!
        }
      `),
      resolvers: {
        Query: { _postsPlaceholder: () => null },
        User: {
          posts: () => {
            return {
              items: [
                {
                  id: 'post-1',
                  visibility: 'PUBLIC',
                  content: {
                    text: 'Hello world!',
                    createdAt: '2024-01-15',
                    meta: {
                      rating: { id: 'rating-1' },
                      commentWrapper: { comment: { id: 'comment-1' } },
                    },
                  },
                },
              ],
              currentPageToken: 'token-1',
              nextPageToken: null,
            };
          },
        },
      },
    },
  ]);
  const subgraphs = {
    users: usersSubgraph,
    reviews: reviewsSubgraph,
    posts: postsSubgraph,
  };
  const schema = await getStitchedSchemaFromLocalSchemas({
    localSchemas: subgraphs,
  });

  const document = parse(/* GraphQL */ `
    query getPosts($forUser: ID!, $page: PageInput) {
      getUsers(userIds: [$forUser]) {
        __typename
        ... on GetUsersSuccess {
          users {
            __typename
            posts(input: $page) {
              __typename
              ...PostPageFragment
            }
          }
        }
        ...UserDoesNotExistErrorFragment
        ...UnexpectedErrorFragment
      }
    }

    fragment PostPageFragment on PostPage {
      __typename
      items {
        __typename
        ...PostFragment
      }
      currentPageToken
      nextPageToken
    }

    fragment PostFragment on Post {
      __typename
      id
      visibility
      content {
        __typename
        ...PostContentFragment
      }
    }

    fragment PostContentFragment on PostContent {
      __typename
      text
      createdAt
      meta {
        __typename
        rating {
          ...RatingFragment
        }
        commentWrapper {
          __typename
          comment {
            ...CommentFragment
          }
        }
      }
    }

    fragment RatingFragment on Rating {
      __typename
      id
      score
      maxScore
    }

    fragment CommentFragment on Comment {
      __typename
      id
      text
    }

    fragment UserDoesNotExistErrorFragment on UserDoesNotExistError {
      __typename
      message
    }

    fragment UnexpectedErrorFragment on UnexpectedError {
      __typename
      message
    }
  `);
  const variables = { forUser: 'user-123', page: { limit: 10 } };
  const result = await normalizedExecutor({
    schema,
    document,
    variableValues: variables,
  });

  expect(result).toEqual({
    data: {
      getUsers: {
        __typename: 'GetUsersSuccess',
        users: [
          {
            __typename: 'User',
            posts: {
              __typename: 'PostPage',
              currentPageToken: 'token-1',
              nextPageToken: null,
              items: [
                {
                  __typename: 'Post',
                  id: 'post-1',
                  visibility: 'PUBLIC',
                  content: {
                    __typename: 'PostContent',
                    text: 'Hello world!',
                    createdAt: '2024-01-15',
                    meta: {
                      __typename: 'PostMeta',
                      rating: {
                        __typename: 'Rating',
                        id: 'rating-1',
                        score: 4,
                        maxScore: 5,
                      },
                      commentWrapper: {
                        __typename: 'CommentWrapper',
                        comment: {
                          __typename: 'Comment',
                          id: 'comment-1',
                          text: 'Great post!',
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });
});
