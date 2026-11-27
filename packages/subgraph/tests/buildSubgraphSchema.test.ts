import { buildSchema, execute, parse, type GraphQLSchema } from 'graphql';
import { buildSubgraphSchema } from '../src/index.js';

const FEDERATION_AND_LOOKUP_DIRECTIVES = /* GraphQL */ `
  directive @link(url: String!, import: [String]) repeatable on SCHEMA
  directive @key(fields: String!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
  directive @shareable on FIELD_DEFINITION | OBJECT
  directive @lookup on FIELD_DEFINITION
  directive @is(field: String!) on ARGUMENT_DEFINITION
  directive @internal on FIELD_DEFINITION | ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION
`;

const CONNECT_DIRECTIVES = /* GraphQL */ `
  directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
  directive @connect(
    source: String
    http: ConnectHTTP
    selection: String!
    entity: Boolean
  ) repeatable on FIELD_DEFINITION | OBJECT

  input ConnectHTTP {
    GET: String
    POST: String
    headers: [HTTPHeaderMapping!]
    body: String
    queryParams: String
  }

  input SourceHTTP {
    baseURL: String!
    headers: [HTTPHeaderMapping!]
  }

  input HTTPHeaderMapping {
    name: String!
    value: String
    from: String
  }
`;

describe('buildSubgraphSchema', () => {
  it('accepts hand-written SDL and wires @lookup / @is into _entities', async () => {
    const typeDefs = /* GraphQL */ `
      ${FEDERATION_AND_LOOKUP_DIRECTIVES}

      extend schema
        @link(
          url: "https://graphql.github.io/graphql-federation-spec/draft"
          import: ["@lookup", "@is", "@internal"]
        )
        @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])

      type Query {
        product(sku: ID! @is(field: "id")): Product @lookup
      }

      type Product @key(fields: "id") {
        id: ID!
        name: String!
      }
    `;

    const schema = await buildSubgraphSchema(typeDefs, {
      skipTransports: true,
      resolvers: {
        Query: {
          product: (_root, { sku }) => ({ id: sku, name: `Product ${sku}` }),
        },
      },
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query ($reps: [_Any!]!) {
          _entities(representations: $reps) {
            ... on Product {
              id
              name
            }
          }
        }
      `),
      variableValues: {
        reps: [{ __typename: 'Product', id: 'abc' }],
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      _entities: [{ id: 'abc', name: 'Product abc' }],
    });
  });

  it('exposes _service { sdl } and omits @internal fields from printed SDL', async () => {
    const typeDefs = /* GraphQL */ `
      ${FEDERATION_AND_LOOKUP_DIRECTIVES}

      type Query {
        hello: String!
        secret: String @internal
      }
    `;

    const schema = await buildSubgraphSchema(typeDefs, {
      skipTransports: true,
      resolvers: {
        Query: {
          hello: () => 'world',
          secret: () => 'nope',
        },
      },
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          _service {
            sdl
          }
          hello
          secret
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({
      hello: 'world',
      secret: 'nope',
    });
    const sdl = (result.data as any)._service.sdl as string;
    expect(sdl).toContain('hello');
    expect(sdl).not.toContain('secret');
    expect(sdl).not.toContain('_entities');
    expect(sdl).not.toContain('_service');
  });

  it('accepts generated-style Connectors SDL and executes @connect via transport', async () => {
    const typeDefs = /* GraphQL */ `
      ${FEDERATION_AND_LOOKUP_DIRECTIVES}
      ${CONNECT_DIRECTIVES}

      extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])
        @link(url: "https://specs.apollo.dev/connect/v0.2", import: ["@connect", "@source"])
        @source(name: "products", http: { baseURL: "https://example.com" })

      type Query {
        product(id: ID!): Product
          @connect(
            source: "products"
            http: { GET: "/products/{$args.id}" }
            selection: "id name"
            entity: true
          )
      }

      type Product @key(fields: "id") {
        id: ID!
        name: String!
      }
    `;

    const fetchImpl = (async (url: string) => {
      expect(String(url)).toBe('https://example.com/products/42');
      return new Response(JSON.stringify({ id: '42', name: 'Widget' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as any;

    const schema = await buildSubgraphSchema(typeDefs, {
      fetch: fetchImpl,
    });

    const productResult = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          product(id: "42") {
            id
            name
          }
        }
      `),
    });
    expect(productResult.errors).toBeUndefined();
    expect(productResult.data).toEqual({
      product: { id: '42', name: 'Widget' },
    });

    const entitiesResult = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query ($reps: [_Any!]!) {
          _entities(representations: $reps) {
            ... on Product {
              id
              name
            }
          }
        }
      `),
      variableValues: {
        reps: [{ __typename: 'Product', id: '42' }],
      },
    });
    expect(entitiesResult.errors).toBeUndefined();
    expect(entitiesResult.data).toEqual({
      _entities: [{ id: '42', name: 'Widget' }],
    });
  });

  it('accepts an existing GraphQLSchema (generate-then-edit path)', async () => {
    const schemaIn: GraphQLSchema = buildSchema(/* GraphQL */ `
      ${FEDERATION_AND_LOOKUP_DIRECTIVES}
      type Query {
        ping: String!
      }
    `);

    const schema = await buildSubgraphSchema(schemaIn, {
      skipTransports: true,
      resolvers: {
        Query: {
          ping: () => 'pong',
        },
      },
    });

    const result = await execute({
      schema,
      document: parse(`{ ping _service { sdl } }`),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({ ping: 'pong' });
  });

  it('skips list-returning @lookup fields (Mesh @merge territory)', async () => {
    const typeDefs = /* GraphQL */ `
      ${FEDERATION_AND_LOOKUP_DIRECTIVES}

      type Query {
        products(ids: [ID!]!): [Product!]! @lookup
      }

      type Product @key(fields: "id") {
        id: ID!
      }
    `;

    const schema = await buildSubgraphSchema(typeDefs, {
      skipTransports: true,
      resolvers: {
        Query: {
          products: () => [{ id: '1' }],
        },
      },
    });

    // No resolveReference → _entities should not be installed (or return empty path).
    const query = schema.getQueryType()!;
    expect(query.getFields()._entities).toBeUndefined();
  });
});
