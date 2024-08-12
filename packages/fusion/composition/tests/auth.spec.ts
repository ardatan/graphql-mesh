import { stripIgnoredCharacters } from 'graphql';
import { composeSubgraphs } from '@graphql-mesh/fusion-composition';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('Composition with Auth', () => {
  it('@authenticated', () => {
    const aSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        extend schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.5"
            import: ["@authenticated", "@requiresScopes"]
          )

        type Query {
          me: User @authenticated
          post(id: ID!): Post
        }

        type User {
          id: ID!
          username: String
          email: String @requiresScopes(scopes: [["read:email"]])
          posts: [Post!]!
        }

        type Post {
          id: ID!
          author: User!
          title: String!
          content: String!
          views: Int @authenticated
        }
      `,
      assumeValid: true,
      assumeValidSDL: true,
      noLocation: true,
    });

    const supergraph = composeSubgraphs([
      {
        name: 'A',
        schema: aSchema,
      },
    ]);

    expect(supergraph.errors?.length).toBeFalsy();
    expect(supergraph.supergraphSdl).toMatchSnapshot();
  });
  it('@requiresScopes', () => {
    const aSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        extend schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.5"
            import: ["@authenticated", "@requiresScopes"]
          )

        type Query {
          user(id: ID!): User @requiresScopes(scopes: [["read:others"]])
          users: [User!]! @requiresScopes(scopes: [["read:others"]])
          post(id: ID!): Post
        }

        type User {
          id: ID!
          username: String
          email: String @requiresScopes(scopes: [["read:email"]])
          profileImage: String
          posts: [Post!]!
        }

        type Post {
          id: ID!
          author: User!
          title: String!
          content: String!
        }
      `,
      assumeValid: true,
      assumeValidSDL: true,
      noLocation: true,
    });

    const supergraph = composeSubgraphs([
      {
        name: 'A',
        schema: aSchema,
      },
    ]);

    expect(supergraph.errors?.length).toBeFalsy();
    expect(supergraph.supergraphSdl).toMatchSnapshot();
  });
});
