import { execute, parse, subscribe, type GraphQLObjectType } from 'graphql';
import { MemPubSub } from '@graphql-hive/pubsub';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import { buildSubgraphSchema } from '../src/index.js';
import {
  extractMeshSourceTransforms,
  getApolloConnectorsSourceDirectiveName,
  getMeshSourceDirectiveName,
  schemaHasMeshSourceTransforms,
} from '../src/source-transforms.js';

function linkExtensions(schema: { extensions?: unknown }) {
  return { directives: getDirectiveExtensions(schema as any) || {} };
}

const MESH_SOURCE_DIRECTIVES = /* GraphQL */ `
  directive @link(url: String!, import: [String]) repeatable on SCHEMA
  directive @source(
    name: String!
    type: String
    subgraph: String!
  ) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | INPUT_OBJECT | ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION | ENUM_VALUE
`;

const PUBSUB_DIRECTIVES = /* GraphQL */ `
  directive @link(url: String!, import: [String]) repeatable on SCHEMA
  directive @pubsubOperation(
    pubsubTopic: String!
    filterBy: String
    result: String
  ) on FIELD_DEFINITION
  directive @pubsubPublish(pubsubTopic: String!) on FIELD_DEFINITION
`;

describe('buildSubgraphSchema Mesh @source transforms', () => {
  it('detects Mesh stitching @source and ignores Apollo SCHEMA @source(http:)', async () => {
    const apolloOnly = await buildSubgraphSchema(
      /* GraphQL */ `
        directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
        input SourceHTTP {
          baseURL: String!
        }
        extend schema @source(name: "products", http: { baseURL: "https://example.com" })
        type Query {
          ping: String
        }
      `,
      { skipTransports: true },
    );
    expect(schemaHasMeshSourceTransforms(apolloOnly)).toBe(false);

    const meshStamped = /* GraphQL */ `
      ${MESH_SOURCE_DIRECTIVES}
      extend schema @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@source"])

      type Query {
        user: User! @source(name: "my_user", type: "MyUser!", subgraph: "TEST")
      }

      type User @source(name: "MyUser", subgraph: "TEST") {
        id: ID!
      }
    `;
    const { buildSchema } = await import('graphql');
    const raw = buildSchema(meshStamped, { assumeValid: true, assumeValidSDL: true });
    expect(schemaHasMeshSourceTransforms(raw)).toBe(true);
  });

  it('applies Mesh @source reverse-renames so public fields resolve via original resolvers', async () => {
    const typeDefs = /* GraphQL */ `
      ${MESH_SOURCE_DIRECTIVES}
      extend schema @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@source"])

      type Query {
        user: User! @source(name: "my_user", type: "MyUser!", subgraph: "TEST")
      }

      type User @source(name: "MyUser", subgraph: "TEST") {
        id: ID! @source(name: "user_id", type: "ID!", subgraph: "TEST")
      }
    `;

    // Resolvers are authored against the public stamped names (as a subgraph host would).
    const schema = await buildSubgraphSchema(typeDefs, {
      skipTransports: true,
      resolvers: {
        Query: {
          user: () => ({ user_id: 'u1' }),
        },
        User: {
          id: (parent: { user_id?: string; id?: string }) => parent.user_id ?? parent.id,
        },
      },
    });

    // Public surface keeps stamped names.
    expect(schema.getType('User')).toBeDefined();
    expect(schema.getType('MyUser')).toBeUndefined();
    expect(schema.getQueryType()!.getFields().user).toBeDefined();
    expect(schema.getQueryType()!.getFields().my_user).toBeUndefined();

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          user {
            id
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ user: { id: 'u1' } });

    // Reversing the stamped (unbuilt) schema yields original names + wrap transforms.
    const { buildSchema } = await import('graphql');
    const raw = buildSchema(typeDefs, { assumeValid: true, assumeValidSDL: true });
    const extracted = extractMeshSourceTransforms(raw);
    expect(extracted.transforms.length).toBeGreaterThan(0);
    expect(extracted.schema.getType('MyUser')).toBeDefined();
    expect(extracted.schema.getType('User')).toBeUndefined();
    expect(extracted.schema.getQueryType()!.getFields().my_user).toBeDefined();
  });

  it('does not treat Apollo Connectors @source as Mesh stitching transforms', async () => {
    const typeDefs = /* GraphQL */ `
      directive @link(url: String!, import: [link__Import]) repeatable on SCHEMA
      scalar link__Import
      directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
      directive @connect(source: String, http: ConnectHTTP, selection: String!) on FIELD_DEFINITION
      input SourceHTTP {
        baseURL: String!
      }
      input ConnectHTTP {
        GET: String
      }
      extend schema
        @link(url: "https://specs.apollo.dev/connect/v0.2", import: ["@connect", "@source"])
        @source(name: "api", http: { baseURL: "https://example.com" })
      type Query {
        hello: String @connect(source: "api", http: { GET: "/hello" }, selection: "$")
      }
    `;
    const raw = (await import('graphql')).buildSchema(typeDefs, {
      assumeValid: true,
      assumeValidSDL: true,
    });
    expect(schemaHasMeshSourceTransforms(raw)).toBe(false);
    const { transforms } = extractMeshSourceTransforms(raw);
    expect(transforms).toEqual([]);
    expect(getApolloConnectorsSourceDirectiveName(linkExtensions(raw))).toBe('source');
    expect(getMeshSourceDirectiveName(linkExtensions(raw))).toBeUndefined();
  });

  it('supports Mesh @meshSource and Apollo SCHEMA @source together via @link URLs', async () => {
    // Same clash-avoidance Compose uses: Mesh aliases `@source` → `@meshSource`
    // when Connectors own SCHEMA `@source`.
    const typeDefs = /* GraphQL */ `
      directive @link(url: String!, import: [link__Import]) repeatable on SCHEMA
      scalar link__Import
      directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
      directive @meshSource(
        name: String!
        type: String
        subgraph: String!
      ) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | INPUT_OBJECT | ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION | ENUM_VALUE
      directive @connect(source: String, http: ConnectHTTP, selection: String!) on FIELD_DEFINITION

      input SourceHTTP {
        baseURL: String!
      }
      input ConnectHTTP {
        GET: String
      }

      extend schema
        @link(url: "https://specs.apollo.dev/connect/v0.2", import: ["@connect", "@source"])
        @link(
          url: "https://specs.graphql-mesh.dev/core/v0.1"
          import: [{ name: "@source", as: "@meshSource" }]
        )
        @source(name: "api", http: { baseURL: "https://example.com" })

      type Query {
        user: User! @meshSource(name: "my_user", type: "MyUser!", subgraph: "TEST")
        hello: String @connect(source: "api", http: { GET: "/hello" }, selection: "$")
      }

      type User @meshSource(name: "MyUser", subgraph: "TEST") {
        id: ID! @meshSource(name: "user_id", type: "ID!", subgraph: "TEST")
      }
    `;

    const { buildSchema } = await import('graphql');
    const raw = buildSchema(typeDefs, { assumeValid: true, assumeValidSDL: true });
    expect(getMeshSourceDirectiveName(linkExtensions(raw))).toBe('meshSource');
    expect(getApolloConnectorsSourceDirectiveName(linkExtensions(raw))).toBe('source');
    expect(schemaHasMeshSourceTransforms(raw)).toBe(true);

    const schema = await buildSubgraphSchema(typeDefs, {
      skipTransports: true,
      resolvers: {
        Query: {
          user: () => ({ user_id: 'u1' }),
          hello: () => 'world',
        },
        User: {
          id: (parent: { user_id?: string; id?: string }) => parent.user_id ?? parent.id,
        },
      },
    });

    expect(schema.getType('User')).toBeDefined();
    expect(schema.getType('MyUser')).toBeUndefined();

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          user {
            id
          }
          hello
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ user: { id: 'u1' }, hello: 'world' });

    // Apollo SCHEMA `@source(http:)` stays on the schema for Connectors.
    const schemaDirs = getDirectiveExtensions(schema);
    expect(schemaDirs?.source?.some((s: { http?: unknown }) => s?.http != null)).toBe(true);
  });
});

describe('buildSubgraphSchema pubsub option', () => {
  const typeDefs = /* GraphQL */ `
    ${PUBSUB_DIRECTIVES}
    extend schema
      @link(
        url: "https://specs.graphql-mesh.dev/core/v0.1"
        import: ["@pubsubOperation", "@pubsubPublish"]
      )

    type Query {
      hello: String!
    }

    type Mutation {
      createProduct(name: String!): Product! @pubsubPublish(pubsubTopic: "new_product")
    }

    type Subscription {
      newProduct: Product! @pubsubOperation(pubsubTopic: "new_product")
    }

    type Product {
      id: ID!
      name: String!
    }
  `;

  it('no-ops @pubsubOperation / @pubsubPublish when pubsub is omitted', async () => {
    const schema = await buildSubgraphSchema(typeDefs, {
      skipTransports: true,
      resolvers: {
        Query: { hello: () => 'world' },
        Mutation: {
          createProduct: (_r, { name }) => ({ id: '1', name }),
        },
      },
    });

    const subscriptionType = schema.getSubscriptionType() as GraphQLObjectType;
    const newProduct = subscriptionType.getFields().newProduct;
    expect(newProduct.subscribe).toBeUndefined();

    const mutation = await execute({
      schema,
      document: parse(/* GraphQL */ `
        mutation {
          createProduct(name: "Desk") {
            id
            name
          }
        }
      `),
    });
    expect(mutation.errors).toBeUndefined();
    expect(mutation.data).toEqual({
      createProduct: { id: '1', name: 'Desk' },
    });
  });

  it('wires @pubsubPublish and @pubsubOperation when pubsub is provided', async () => {
    await using pubsub = new MemPubSub();
    const schema = await buildSubgraphSchema(typeDefs, {
      skipTransports: true,
      pubsub,
      resolvers: {
        Query: { hello: () => 'world' },
        Mutation: {
          createProduct: (_r, { name }) => ({ id: '9', name }),
        },
      },
    });

    const subscriptionType = schema.getSubscriptionType() as GraphQLObjectType;
    expect(subscriptionType.getFields().newProduct.subscribe).toBeDefined();

    const subResult = await subscribe({
      schema,
      document: parse(/* GraphQL */ `
        subscription {
          newProduct {
            id
            name
          }
        }
      `),
    });
    expect(Symbol.asyncIterator in Object(subResult)).toBe(true);
    const iter = (subResult as AsyncIterableIterator<any>)[Symbol.asyncIterator]();
    const nextPromise = iter.next();

    // Let the subscriber attach before publishing.
    await new Promise(resolve => setTimeout(resolve, 20));

    const mutation = await execute({
      schema,
      document: parse(/* GraphQL */ `
        mutation {
          createProduct(name: "Lamp") {
            id
            name
          }
        }
      `),
    });
    expect(mutation.errors).toBeUndefined();
    expect(mutation.data).toEqual({
      createProduct: { id: '9', name: 'Lamp' },
    });

    const next = await nextPromise;
    expect(next.done).toBe(false);
    expect(next.value.data).toEqual({
      newProduct: { id: '9', name: 'Lamp' },
    });
  }, 15_000);
});
