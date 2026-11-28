import { GraphQLSchema, parse, print } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { normalizedExecutor } from '@graphql-tools/executor';
import { ExecutionRequest } from '@graphql-tools/utils';
import { getStitchedSchemaFromLocalSchemas } from './getStitchedSchemaFromLocalSchemas';

async function execute(localSchemas: Record<string, GraphQLSchema>, query: string) {
  const subgraphCalls: { subgraph: string; query: string; variables?: any }[] = [];
  const schema = await getStitchedSchemaFromLocalSchemas({
    localSchemas,
    composeWith: 'guild',
    onSubgraphExecute(subgraph, executionRequest: ExecutionRequest) {
      subgraphCalls.push({
        subgraph,
        query: print(executionRequest.document),
        variables: executionRequest.variables,
      });
    },
  });
  const result = await normalizedExecutor({
    schema,
    document: parse(query),
  });
  return { result, subgraphCalls };
}

describe('@interfaceObject', () => {
  // https://github.com/graphql-hive/gateway/issues/2463
  it(
    'resolves fields from inline fragments nested in a named fragment on the interface',
    async () => {
      const a = buildSubgraphSchema([
        {
          typeDefs: parse(/* GraphQL */ `
            extend schema
              @link(
                url: "https://specs.apollo.dev/federation/v2.6"
                import: ["@key", "@interfaceObject"]
              )

            type Node @key(fields: "id", resolvable: false) @interfaceObject {
              id: ID!
            }

            type Query {
              node: Node
            }
          `),
          resolvers: {
            Query: {
              node: () => ({ id: 'leaf1' }),
            },
          },
        },
      ]);
      const b = buildSubgraphSchema([
        {
          typeDefs: parse(/* GraphQL */ `
            extend schema @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])

            interface Node @key(fields: "id") {
              id: ID!
            }

            type Leaf implements Node @key(fields: "id") {
              id: ID!
              extra: String!
            }

            type Query {
              bPing: String
            }
          `),
          resolvers: {
            Node: {
              __resolveReference: ({ id }: { id: string }) => ({
                __typename: 'Leaf',
                id,
              }),
            },
            Leaf: {
              __resolveReference: ({ id }: { id: string }) => ({ id }),
              extra: ({ id }: { id: string }) => `extra-${id}`,
            },
          },
        },
      ]);

      for (const query of [
        /* GraphQL */ `
          {
            node {
              ...NodeFields
              __typename
            }
          }

          fragment NodeFields on Node {
            ... on Leaf {
              extra
            }
          }
        `,
        /* GraphQL */ `
          {
            node {
              ...NodeFields
              __typename
            }
          }

          fragment NodeFields on Node {
            ...LeafFields
          }

          fragment LeafFields on Leaf {
            extra
          }
        `,
      ]) {
        const { result } = await execute({ a, b }, query);
        expect(result).toEqual({
          data: {
            node: {
              __typename: 'Leaf',
              extra: 'extra-leaf1',
            },
          },
        });
      }
    },
  );

  // https://github.com/graphql-hive/gateway/issues/2736
  it(
    'resolves the interface object field when another subgraph extends the implementation',
    async () => {
      const kinds: Record<string, string> = { store1: 'Store', spa1: 'Spa' };
      const owner = buildSubgraphSchema([
        {
          typeDefs: parse(/* GraphQL */ `
            extend schema @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])

            interface Location @key(fields: "id") {
              id: ID!
            }

            type Store implements Location @key(fields: "id") {
              id: ID!
            }

            type Spa implements Location @key(fields: "id") {
              id: ID!
            }

            type Query {
              location(id: ID!): Location
            }
          `),
          resolvers: {
            Query: {
              location: (_: unknown, { id }: { id: string }) => ({
                id,
                kind: kinds[id],
              }),
            },
            Location: {
              __resolveType: ({ kind }: { kind: string }) => kind,
            },
          },
        },
      ]);
      const contributor = buildSubgraphSchema([
        {
          typeDefs: parse(/* GraphQL */ `
            extend schema
              @link(
                url: "https://specs.apollo.dev/federation/v2.6"
                import: ["@key", "@interfaceObject"]
              )

            type Location @key(fields: "id") @interfaceObject {
              id: ID!
              plain: String
            }

            type Query {
              contributorPing: String
            }
          `),
          resolvers: {
            Location: {
              __resolveReference: (reference: unknown) => reference,
              plain: ({ id }: { id: string }) => `plain-${id}`,
            },
          },
        },
      ]);
      const extender = buildSubgraphSchema([
        {
          typeDefs: parse(/* GraphQL */ `
            extend schema @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])

            type Store @key(fields: "id") {
              id: ID!
              feed: String
            }

            type Query {
              extenderPing: String
            }
          `),
          resolvers: {
            Store: {
              __resolveReference: (reference: unknown) => reference,
              feed: ({ id }: { id: string }) => `feed-${id}`,
            },
          },
        },
      ]);
      // merge target of both the implementation and the interface
      const rater = buildSubgraphSchema([
        {
          typeDefs: parse(/* GraphQL */ `
            extend schema @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])

            interface Location @key(fields: "id") {
              id: ID!
              rating: Int
            }

            type Store implements Location @key(fields: "id") {
              id: ID!
              rating: Int
            }

            type Spa implements Location @key(fields: "id") {
              id: ID!
              rating: Int
            }

            type Query {
              raterPing: String
            }
          `),
          resolvers: {
            Location: {
              __resolveReference: ({ id }: { id: string }) => ({
                __typename: kinds[id],
                id,
              }),
            },
            Store: {
              __resolveReference: (reference: unknown) => reference,
              rating: () => 5,
            },
            Spa: {
              __resolveReference: (reference: unknown) => reference,
              rating: () => 5,
            },
          },
        },
      ]);

      for (const id of ['store1', 'spa1']) {
        const { result, subgraphCalls } = await execute(
          { owner, contributor, extender, rater },
          /* GraphQL */ `
          {
            location(id: "${id}") {
              __typename
              id
              plain
              rating
              ... on Store {
                feed
              }
            }
          }
        `,
        );
        expect(result).toEqual({
          data: {
            location: {
              __typename: kinds[id],
              id,
              plain: `plain-${id}`,
              rating: 5,
              ...(id === 'store1' && { feed: 'feed-store1' }),
            },
          },
        });
        expect(subgraphCalls.map(({ subgraph }) => subgraph).sort()).toEqual(
          id === 'store1'
            ? ['contributor', 'extender', 'owner', 'rater']
            : ['contributor', 'owner', 'rater'],
        );
      }
    },
  );

  // https://github.com/graphql-hive/gateway/issues/2737
  it(
    'sends the @requires fields to the interface object when selected through an inline fragment on the implementation',
    async () => {
      const owner = buildSubgraphSchema([
        {
          typeDefs: parse(/* GraphQL */ `
            extend schema @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])

            interface Location @key(fields: "id") {
              id: ID!
              code: String
            }

            type Store implements Location @key(fields: "id") {
              id: ID!
              code: String
            }

            type Query {
              location(id: ID!): Location
            }
          `),
          resolvers: {
            Query: {
              location: (_: unknown, { id }: { id: string }) => ({
                id,
                code: `code-${id}`,
              }),
            },
            Location: {
              __resolveType: () => 'Store',
            },
          },
        },
      ]);
      const contributor = buildSubgraphSchema([
        {
          typeDefs: parse(/* GraphQL */ `
            extend schema
              @link(
                url: "https://specs.apollo.dev/federation/v2.6"
                import: ["@key", "@interfaceObject", "@external", "@requires"]
              )

            type Location @key(fields: "id") @interfaceObject {
              id: ID!
              code: String @external
              events: [String!] @requires(fields: "code")
            }

            type Query {
              contributorPing: String
            }
          `),
          resolvers: {
            Location: {
              __resolveReference: (reference: unknown) => reference,
              events: ({ code }: { code?: string }) => (code ? [`event-at-${code}`] : []),
            },
          },
        },
      ]);

      for (const query of [
        /* GraphQL */ `
          {
            location(id: "store1") {
              id
              events
            }
          }
        `,
        /* GraphQL */ `
          {
            location(id: "store1") {
              id
              ... on Store {
                events
              }
            }
          }
        `,
      ]) {
        const { result } = await execute({ owner, contributor }, query);
        expect(result).toEqual({
          data: {
            location: {
              id: 'store1',
              events: ['event-at-code-store1'],
            },
          },
        });
      }
    },
  );
});
