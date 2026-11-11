import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSchema, execute, parse, type GraphQLSchema } from 'graphql';
import { Response } from '@whatwg-node/fetch';
import { processConnectDirectives } from '../src/directives/connect.js';

/**
 * Directive SDL required by graphql-js `buildSchema` for Apollo Connectors examples
 * (community schemas only @link the specs; they don't inline the directive defs).
 */
const CONNECTOR_DIRECTIVES = /* GraphQL */ `
  directive @link(url: String!, import: [String]) repeatable on SCHEMA
  directive @key(fields: String!, resolvable: Boolean) repeatable on OBJECT | INTERFACE
  directive @shareable on FIELD_DEFINITION | OBJECT
  directive @external on FIELD_DEFINITION | OBJECT
  directive @source(
    name: String!
    http: SourceHTTP!
    errors: ConnectorErrors
    isSuccess: String
  ) repeatable on SCHEMA
  directive @connect(
    source: String
    http: ConnectHTTP
    selection: String!
    entity: Boolean
    errors: ConnectorErrors
    isSuccess: String
  ) repeatable on FIELD_DEFINITION

  input ConnectHTTP {
    GET: String
    HEAD: String
    POST: String
    PUT: String
    PATCH: String
    DELETE: String
    headers: [HTTPHeaderMapping!]
    body: String
    queryParams: String
  }

  input SourceHTTP {
    baseURL: String!
    headers: [HTTPHeaderMapping!]
    queryParams: String
    errors: ConnectorErrors
    isSuccess: String
  }

  input HTTPHeaderMapping {
    name: String!
    value: String
    from: String
  }

  input ConnectorErrors {
    message: String
    extensions: String
  }
`;

function loadApolloExample(relativePath: string): string {
  return readFileSync(join(__dirname, 'fixtures/apollo', relativePath), 'utf8');
}

/**
 * Community examples use `extend schema @link @source`. graphql-js needs a full
 * schema definition that keeps those schema directives (especially `@source`).
 */
function normalizeCommunitySchema(sdl: string): string {
  const match = sdl.match(
    /extend\s+schema([\s\S]*?)(?=\n\s*(?:type|enum|interface|input|scalar)\b)/,
  );
  if (!match) {
    return sdl;
  }
  // Drop comment-only lines inside the schema extension so `@source` stays attached.
  const directives = match[1]
    .split('\n')
    .filter(line => !/^\s*#/.test(line))
    .join('\n')
    .trim();
  const rest = sdl.slice(match.index! + match[0].length);
  const rootOps = [/\btype\s+Query\b/.test(rest) ? '  query: Query' : null]
    .concat(/\btype\s+Mutation\b/.test(rest) ? ['  mutation: Mutation'] : [])
    .filter(Boolean)
    .join('\n');
  return `schema ${directives} {\n${rootOps}\n}\n${rest}`;
}

function buildConnectorsSchema(exampleSdl: string, fetchImpl: typeof fetch): GraphQLSchema {
  const sdl = `${CONNECTOR_DIRECTIVES}\n${normalizeCommunitySchema(exampleSdl)}`;
  const schema = buildSchema(sdl);
  return processConnectDirectives(schema, { globalFetch: fetchImpl as any });
}

describe('Apollo Connectors community examples (executor)', () => {
  it('runs apollo-ecomm-simple against a mocked ecommerce API', async () => {
    const example = loadApolloExample('ecomm-simple.graphql');
    const fetchImpl = async (url: string) => {
      expect(url).toBe('https://ecommerce.demo-api.apollo.dev/products');
      return Response.json({
        products: [
          { id: '1', name: 'Dune', description: 'A book' },
          { id: '2', name: 'Arrival', description: 'Another book' },
        ],
      });
    };
    const schema = buildConnectorsSchema(example, fetchImpl as any);
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          products {
            id
            name
            description
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        products: [
          { id: '1', name: 'Dune', description: 'A book' },
          { id: '2', name: 'Arrival', description: 'Another book' },
        ],
      },
    });
  });

  it('runs JSONPlaceholder users example with nested address/company selection', async () => {
    const example = loadApolloExample('jsonplaceholder-users.graphql');
    const fetchImpl = async (url: string) => {
      expect(url).toBe('https://jsonplaceholder.typicode.com/users/1');
      return Response.json({
        id: 1,
        name: 'Leanne Graham',
        username: 'Bret',
        email: 'Sincere@april.biz',
        address: {
          street: 'Kulas Light',
          suite: 'Apt. 556',
          city: 'Gwenborough',
          zipcode: '92998-3874',
          geo: { lat: '-37.3159', lng: '81.1496' },
        },
        phone: '1-770-736-8031 x56442',
        website: 'hildegard.org',
        company: {
          name: 'Romaguera-Crona',
          catchPhrase: 'Multi-layered client-server neural-net',
          bs: 'harness real-time e-markets',
        },
      });
    };
    const schema = buildConnectorsSchema(example, fetchImpl as any);
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          getUser(id: "1") {
            id
            name
            username
            email
            address {
              line1
              line2
              city
              zip
              geo {
                lat
                lng
              }
            }
            company {
              name
              catchPhrase
            }
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      getUser: {
        id: '1',
        name: 'Leanne Graham',
        username: 'Bret',
        email: 'Sincere@april.biz',
        address: {
          line1: 'Kulas Light',
          line2: 'Apt. 556',
          city: 'Gwenborough',
          zip: '92998-3874',
          geo: { lat: '-37.3159', lng: '81.1496' },
        },
        company: {
          name: 'Romaguera-Crona',
          catchPhrase: 'Multi-layered client-server neural-net',
        },
      },
    });
  });

  it('runs JSONPlaceholder posts example with $this entity link', async () => {
    const example = loadApolloExample('jsonplaceholder-posts.graphql');
    const fetchImpl = async (url: string) => {
      if (url.endsWith('/posts/1')) {
        return Response.json({
          id: 1,
          userId: 1,
          title: 'sunt aut facere',
          body: 'quia et suscipit',
        });
      }
      if (url.endsWith('/users/1/posts')) {
        return Response.json([
          { id: 1, userId: 1, title: 'sunt aut facere', body: 'quia et suscipit' },
          { id: 2, userId: 1, title: 'qui est esse', body: 'est rerum tempore' },
        ]);
      }
      throw new Error(`Unexpected URL ${url}`);
    };
    const schema = buildConnectorsSchema(example, fetchImpl as any);
    // Seed a User parent the same way a federation entity representation would.
    const userType = schema.getType('User') as any;
    const postsField = userType.getFields().posts;
    const posts = await postsField.resolve({ id: '1' }, {}, {}, {
      fieldName: 'posts',
      parentType: userType,
      path: { key: 'posts', prev: undefined },
    } as any);
    expect(posts).toEqual([
      { id: 1, userId: 1, title: 'sunt aut facere', body: 'quia et suscipit' },
      { id: 2, userId: 1, title: 'qui est esse', body: 'est rerum tempore' },
    ]);

    const postResult = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          getPost(id: "1") {
            id
            userId
            title
          }
        }
      `),
    });
    expect(postResult).toEqual({
      data: {
        getPost: {
          id: '1',
          userId: '1',
          title: 'sunt aut facere',
        },
      },
    });
  });
});

describe('Apollo Connectors error shape', () => {
  const errorSchemaSdl = /* GraphQL */ `
    ${CONNECTOR_DIRECTIVES}

    schema @source(name: "ecomm", http: { baseURL: "https://api.example.com" }) {
      query: Query
    }

    type Query {
      products: [Product]
        @connect(source: "ecomm", http: { GET: "/products" }, selection: "id name")
      users: [User]
        @connect(
          source: "ecomm"
          http: { GET: "/users" }
          selection: "id name"
          errors: { message: "error.message", extensions: "code: error.code" }
        )
      alwaysOk(id: ID!): Product
        @connect(
          source: "ecomm"
          http: { GET: "/maybe-404/{$args.id}" }
          selection: "id name"
          isSuccess: "$status->match([200, true], [404, true], [@, false])"
        )
    }

    type Product {
      id: ID
      name: String
    }

    type User {
      id: ID
      name: String
    }
  `;

  it('emits Apollo default CONNECTOR_FETCH extensions on HTTP failure', async () => {
    const schema = processConnectDirectives(buildSchema(errorSchemaSdl), {
      globalFetch: (async () => Response.json({ message: 'boom' }, { status: 500 })) as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          products {
            id
          }
        }
      `),
    });
    expect(result.data).toEqual({ products: null });
    expect(result.errors).toHaveLength(1);
    const err = result.errors![0];
    expect(err.message).toBe('Request failed');
    expect(err.extensions).toMatchObject({
      code: 'CONNECTOR_FETCH',
      service: 'ecomm',
      http: { status: 500 },
      connector: { coordinate: 'ecomm:Query.products@connect[0]' },
      request: { method: 'GET' },
    });
    expect((err.extensions as any).request.url).toContain('/products');
  });

  it('applies errors.message / errors.extensions customizations', async () => {
    const schema = processConnectDirectives(buildSchema(errorSchemaSdl), {
      globalFetch: (async () =>
        Response.json({ error: { message: 'Nope!', code: 'USER_GONE' } }, { status: 404 })) as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          users {
            id
          }
        }
      `),
    });
    expect(result.errors![0].message).toBe('Nope!');
    expect(result.errors![0].extensions).toMatchObject({
      code: 'USER_GONE',
      service: 'ecomm',
      http: { status: 404 },
      connector: { coordinate: 'ecomm:Query.users@connect[0]' },
    });
  });

  it('honors isSuccess for selected status codes', async () => {
    const schema = processConnectDirectives(buildSchema(errorSchemaSdl), {
      globalFetch: (async () =>
        Response.json({ id: 'missing', name: null }, { status: 404 })) as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          alwaysOk(id: "x") {
            id
            name
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      alwaysOk: { id: 'missing', name: null },
    });
  });
});
