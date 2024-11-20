import { parse, type ExecutionResult } from 'graphql';
import { createYoga } from 'graphql-yoga';
import jwt from 'jsonwebtoken';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { createGatewayRuntime, useCustomFetch } from '@graphql-hive/gateway-runtime';
import { composeWithApollo } from '../../../testing/composeWithApollo';
import useJWT, { createInlineSigningKeyProvider, type JWTExtendContextFields } from '../src/index';

describe('Auth Directives', () => {
  const users = [
    {
      id: '1',
      username: 'john.doe',
      email: 'john@doe.com',
      profileImage: 'https://example.com/john.jpg',
    },
    {
      id: '2',
      username: 'jane.doe',
      email: 'jane@doe.com',
      profileImage: 'https://example.com/jane.jpg',
    },
  ];
  const posts = [
    {
      id: '1',
      authorId: '1',
      title: 'Securing supergraphs',
      content: 'Supergraphs are the future!',
      views: 100,
      publishAt: '2021-01-01',
      allowedViewers: [users[0], users[1]],
    },
    {
      id: '2',
      authorId: '2',
      title: 'Running supergraphs',
      content: 'Supergraphs are the best!',
      views: 200,
      publishAt: '2021-01-02',
      allowedViewers: [users[1]],
    },
  ];
  describe('@requiresScopes', () => {
    it('works', async () => {
      const subgraphATypeDefs = /* GraphQL */ `
        extend schema
          @link(url: "https://specs.apollo.dev/federation/v2.5", import: ["@requiresScopes"])

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
      `;
      const subgraphASchema = buildSubgraphSchema({
        typeDefs: parse(subgraphATypeDefs),
        resolvers: {
          Query: {
            user: (_, { id }) => users.find(user => user.id === id),
            users: () => users,
            post: (_, { id }) => posts.find(post => post.id === id),
          },
          User: {
            posts: user => posts.filter(post => post.authorId === user.id),
          },
          Post: {
            author: post => users.find(user => user.id === post.authorId),
          },
        },
      });
      const subgraphAServer = createYoga({
        schema: subgraphASchema,
      });
      const signingKey = 'secret';
      await using serveRuntime = createGatewayRuntime({
        supergraph: () =>
          composeWithApollo([
            {
              name: 'subgraphA',
              schema: subgraphASchema,
              url: 'http://localhost:4001/graphql',
            },
          ]),
        genericAuth: {
          mode: 'protect-granular',
          resolveUserFn(context: { jwt?: JWTExtendContextFields }) {
            return context?.jwt?.payload;
          },
          rejectUnauthenticated: false,
        },
        plugins: () => [
          useCustomFetch(subgraphAServer.fetch),
          useJWT({
            signingKeyProviders: [createInlineSigningKeyProvider(signingKey)],
          }),
        ],
      });

      const token = jwt.sign({ sub: '123', scope: 'read:others' }, signingKey, {});
      const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              user(id: "1") {
                username
                profileImage
                email
              }
            }
          `,
        }),
      });
      const resJson: ExecutionResult = await response.json();
      expect(resJson).toEqual({
        data: {
          user: {
            username: 'john.doe',
            profileImage: 'https://example.com/john.jpg',
            email: null,
          },
        },
        errors: [
          {
            message: 'Unauthorized field or type',
            extensions: {
              code: 'UNAUTHORIZED_FIELD_OR_TYPE',
            },
            path: ['user', 'email'],
            locations: [
              {
                line: 6,
                column: 17,
              },
            ],
          },
        ],
      });
    });
  });
  describe('@authenticated', () => {
    it('works', async () => {
      const subgraphATypeDefs = /* GraphQL */ `
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
      `;
      const subgraphASchema = buildSubgraphSchema({
        typeDefs: parse(subgraphATypeDefs),
        resolvers: {
          Query: {
            me: () => users[0],
            post: (_, { id }) => posts.find(post => post.id === id),
          },
          User: {
            posts: user => posts.filter(post => post.authorId === user.id),
          },
          Post: {
            author: post => users.find(user => user.id === post.authorId),
          },
        },
      });
      const subgraphAServer = createYoga({
        schema: subgraphASchema,
      });
      await using serveRuntime = createGatewayRuntime({
        supergraph: () =>
          composeWithApollo([
            {
              name: 'subgraphA',
              schema: subgraphASchema,
              url: 'http://localhost:4001/graphql',
            },
          ]),
        genericAuth: {
          mode: 'protect-granular',
          resolveUserFn(context: { jwt?: JWTExtendContextFields }) {
            return context?.jwt?.payload;
          },
          rejectUnauthenticated: false,
        },
        plugins: () => [
          useCustomFetch(subgraphAServer.fetch),
          useJWT({
            signingKeyProviders: [createInlineSigningKeyProvider('secret')],
            reject: {
              invalidToken: false,
              missingToken: false,
            },
          }),
        ],
      });
      const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              me {
                username
              }
              post(id: "1") {
                title
                views
              }
            }
          `,
        }),
      });
      const resJson: ExecutionResult = await response.json();
      expect(resJson).toEqual({
        data: {
          me: null,
          post: {
            title: 'Securing supergraphs',
            views: null,
          },
        },
        errors: [
          {
            message: 'Unauthorized field or type',
            path: ['me'],
            locations: [
              {
                line: 3,
                column: 15,
              },
            ],
            extensions: {
              code: 'UNAUTHORIZED_FIELD_OR_TYPE',
            },
          },
          {
            message: 'Unauthorized field or type',
            path: ['post', 'views'],
            locations: [
              {
                line: 8,
                column: 17,
              },
            ],
            extensions: {
              code: 'UNAUTHORIZED_FIELD_OR_TYPE',
            },
          },
        ],
      });
    });
    describe('with @key', () => {
      const products = [
        {
          id: '1',
          name: 'Couch',
          price: 2598,
          inStock: true,
        },
        {
          id: '2',
          name: 'Chair',
          price: 108,
          inStock: false,
        },
      ];
      const productSchema = buildSubgraphSchema({
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.5"
              import: ["@key", "@authenticated"]
            )

          type Query {
            product: Product
          }

          type Product @key(fields: "id") {
            id: ID! @authenticated
            name: String!
            price: Int @authenticated
          }
        `),
        resolvers: {
          Query: {
            product: () => ({ id: '1', name: 'Couch', price: 2598 }),
          },
          Product: {
            __resolveReference: product => products.find(p => p.id === product.id),
          },
        },
      });
      const productServer = createYoga({
        schema: productSchema,
      });
      const inventorySchema = buildSubgraphSchema({
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.5"
              import: ["@key", "@authenticated"]
            )

          type Product @key(fields: "id") {
            id: ID! @authenticated
            inStock: Boolean!
          }
        `),
        resolvers: {
          Product: {
            __resolveReference: product => products.find(p => p.id === product.id),
          },
        },
      });
      const inventoryServer = createYoga({
        schema: inventorySchema,
      });
      const signingKey = 'secret';
      it('succeeds', async () => {
        await using serveRuntime = createGatewayRuntime({
          supergraph: () =>
            composeWithApollo([
              {
                name: 'product',
                schema: productSchema,
                url: 'http://localhost:4001/graphql',
              },
              {
                name: 'inventory',
                schema: inventorySchema,
                url: 'http://localhost:4002/graphql',
              },
            ]),
          genericAuth: {
            mode: 'protect-granular',
            resolveUserFn(context: { jwt?: JWTExtendContextFields }) {
              return context?.jwt?.payload;
            },
            rejectUnauthenticated: false,
          },
          plugins: () => [
            useCustomFetch(function (url, ...args) {
              if (url === 'http://localhost:4001/graphql') {
                return productServer.fetch(url, ...args);
              } else if (url === 'http://localhost:4002/graphql') {
                return inventoryServer.fetch(url, ...args);
              }
              return Response.error();
            }),
            useJWT({
              signingKeyProviders: [createInlineSigningKeyProvider(signingKey)],
              reject: {
                invalidToken: false,
                missingToken: false,
              },
            }),
          ],
        });
        const res = await serveRuntime.fetch('http://localhost:4000/graphql', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            query: /* GraphQL */ `
              query {
                product {
                  name
                  inStock
                }
              }
            `,
          }),
        });
        const resJson: ExecutionResult = await res.json();
        expect(resJson).toEqual({
          data: {
            product: {
              name: 'Couch',
              inStock: true,
            },
          },
        });
      });
      it('fails', async () => {
        await using serveRuntime = createGatewayRuntime({
          supergraph: () =>
            composeWithApollo([
              {
                name: 'product',
                schema: productSchema,
                url: 'http://localhost:4001/graphql',
              },
              {
                name: 'inventory',
                schema: inventorySchema,
                url: 'http://localhost:4002/graphql',
              },
            ]),
          genericAuth: {
            mode: 'protect-granular',
            resolveUserFn(context: { jwt?: JWTExtendContextFields }) {
              return context?.jwt?.payload;
            },
            rejectUnauthenticated: false,
          },
          plugins: () => [
            useCustomFetch(function (url, ...args) {
              if (url === 'http://localhost:4001/graphql') {
                return productServer.fetch(url, ...args);
              } else if (url === 'http://localhost:4002/graphql') {
                return inventoryServer.fetch(url, ...args);
              }
              return Response.error();
            }),
            useJWT({
              signingKeyProviders: [createInlineSigningKeyProvider(signingKey)],
              reject: {
                invalidToken: false,
                missingToken: false,
              },
            }),
          ],
        });
        const res = await serveRuntime.fetch('http://localhost:4000/graphql', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            query: /* GraphQL */ `
              query {
                product {
                  id
                  name
                }
              }
            `,
          }),
        });
        const resJson: ExecutionResult = await res.json();
        expect(resJson).toEqual({
          data: {
            product: {
              id: null,
              name: 'Couch',
            },
          },
          errors: [
            {
              message: 'Unauthorized field or type',
              path: ['product', 'id'],
              locations: [
                {
                  line: 4,
                  column: 19,
                },
              ],
              extensions: {
                code: 'UNAUTHORIZED_FIELD_OR_TYPE',
              },
            },
          ],
        });
      });
    });
    it('interfaces', async () => {
      const subgraphSchema = buildSubgraphSchema({
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/federation/v2.5", import: ["@authenticated"])

          type Query {
            posts: [Post!]!
          }

          type User {
            id: ID!
            username: String
            posts: [Post!]!
          }

          interface Post {
            id: ID!
            author: User!
            title: String!
            content: String!
          }

          type PrivateBlog implements Post @authenticated {
            id: ID!
            author: User!
            title: String!
            content: String!
            publishAt: String
            allowedViewers: [User!]!
          }
        `),
        resolvers: {
          Post: {
            __resolveType: () => 'PrivateBlog',
          },
          PrivateBlog: {
            author: post => users.find(user => user.id === post.authorId),
          },
          Query: {
            posts: () => posts,
          },
        },
      });
      const subgraphServer = createYoga({
        schema: subgraphSchema,
      });
      const signingKey = 'secret';
      await using serveRuntime = createGatewayRuntime({
        supergraph: () =>
          composeWithApollo([
            {
              name: 'subgraphA',
              schema: subgraphSchema,
              url: 'http://localhost:4001/graphql',
            },
          ]),
        genericAuth: {
          mode: 'protect-granular',
          resolveUserFn(context: { jwt?: JWTExtendContextFields }) {
            return context?.jwt?.payload;
          },
          rejectUnauthenticated: false,
        },
        plugins: () => [
          useCustomFetch(subgraphServer.fetch),
          useJWT({
            signingKeyProviders: [createInlineSigningKeyProvider(signingKey)],
            reject: {
              invalidToken: false,
              missingToken: false,
            },
          }),
        ],
      });
      const res = await serveRuntime.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              posts {
                id
                author {
                  username
                }
                title
                ... on PrivateBlog {
                  allowedViewers {
                    username
                  }
                }
              }
            }
          `,
        }),
      });
      const resJson: ExecutionResult = await res.json();
      expect(resJson).toEqual({
        data: {
          posts: [
            {
              id: '1',
              author: {
                username: 'john.doe',
              },
              title: 'Securing supergraphs',
              allowedViewers: null,
            },
            {
              id: '2',
              author: {
                username: 'jane.doe',
              },
              title: 'Running supergraphs',
              allowedViewers: null,
            },
          ],
        },
        errors: [
          {
            message: 'Unauthorized field or type',
            extensions: {
              code: 'UNAUTHORIZED_FIELD_OR_TYPE',
            },
            locations: [
              {
                column: 19,
                line: 10,
              },
            ],
            path: ['posts', 'allowedViewers'],
          },
        ],
      });
    });
  });
  describe('@policy', () => {
    it('works', async () => {
      const subgraph = buildSubgraphSchema({
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.6"
              import: ["@policy", "@authenticated", "@requiresScopes"]
            )

          type Query {
            me: User @authenticated @policy(policies: [["read_profile"]])
            post(id: ID!): Post
          }

          type User {
            id: ID!
            username: String
            email: String @requiresScopes(scopes: [["read:email"]])
            posts: [Post!]!
            credit_card: String @policy(policies: [["read_credit_card"]])
          }

          type Post {
            id: ID!
            author: User!
            title: String!
            content: String!
            views: Int @authenticated
          }
        `),
        resolvers: {
          Query: {
            me: () => ({
              id: '1',
              username: 'john.doe',
              email: 'john@doe.com',
              posts: posts.filter(post => post.authorId === '1'),
              credit_card: '1234-5678-9012-3456',
            }),
          },
        },
      });
      const subgraphServer = createYoga({
        schema: subgraph,
      });
      const signingKey = 'secret';
      await using serveRuntime = createGatewayRuntime({
        supergraph: () =>
          composeWithApollo([
            {
              name: 'subgraphA',
              schema: subgraph,
              url: 'http://localhost:4001/graphql',
            },
          ]),
        genericAuth: {
          mode: 'protect-granular',
          resolveUserFn(context: { jwt?: JWTExtendContextFields }) {
            return context?.jwt?.payload;
          },
          rejectUnauthenticated: false,
          extractPolicies: () => ['read_profile'],
        },
        plugins: () => [
          useCustomFetch(subgraphServer.fetch),
          useJWT({
            signingKeyProviders: [createInlineSigningKeyProvider(signingKey)],
            reject: {
              invalidToken: false,
              missingToken: false,
            },
          }),
        ],
      });
      const token = jwt.sign({ sub: '123', scope: 'read:email' }, signingKey, {});
      const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              me {
                username
                email
                credit_card
              }
            }
          `,
        }),
      });
      const resJson: ExecutionResult = await response.json();
      expect(resJson).toEqual({
        data: {
          me: {
            username: 'john.doe',
            email: 'john@doe.com',
            credit_card: null,
          },
        },
        errors: [
          {
            message: 'Unauthorized field or type',
            extensions: {
              code: 'UNAUTHORIZED_FIELD_OR_TYPE',
            },
            path: ['me', 'credit_card'],
            locations: [
              {
                line: 6,
                column: 17,
              },
            ],
          },
        ],
      });
    });
  });
});
