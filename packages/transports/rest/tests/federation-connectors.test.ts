import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSchema, execute, parse, type GraphQLSchema } from 'graphql';
import { Response } from '@whatwg-node/fetch';
import { processConnectDirectives } from '../src/directives/connect.js';

/**
 * Directive SDL required by graphql-js `buildSchema` for Federation Connectors examples
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
  ) repeatable on FIELD_DEFINITION | OBJECT

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

describe('Federation Connectors — Apollo community examples (executor)', () => {
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

describe('Federation Connectors error shape', () => {
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
          errors: { message: "error.message", extensions: "code: error.code status: $status" }
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

  it('emits Mesh-compatible default extensions on HTTP failure', async () => {
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
    expect(err.message).toBe('Upstream HTTP Error: 500, Could not invoke operation GET /products');
    expect(err.extensions).toMatchObject({
      code: 'CONNECTOR_FETCH',
      serviceName: 'ecomm',
      connector: { coordinate: 'ecomm:Query.products@connect[0]' },
      request: { method: 'GET' },
      response: { status: 500, body: { message: 'boom' } },
    });
    // Default shape uses `response.status` only — no duplicate top-level `status`.
    expect((err.extensions as any).status).toBeUndefined();
    // Yoga promotes `extensions.http.status` to the gateway HTTP status — omit it.
    expect((err.extensions as any).http?.status).toBeUndefined();
    expect((err.extensions as any).service).toBeUndefined();
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
      serviceName: 'ecomm',
      connector: { coordinate: 'ecomm:Query.users@connect[0]' },
      response: { status: 404 },
      // Mapped via `@connect(errors.extensions:)` — kept, not invented by default.
      status: 404,
    });
    expect((result.errors![0].extensions as any).http?.status).toBeUndefined();
    expect((result.errors![0].extensions as any).service).toBeUndefined();
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

describe('Federation Connectors queryParams / qs bake', () => {
  it('serializes deepObject query params as filter[name]=value', async () => {
    const urls: string[] = [];
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema @source(name: "api", http: { baseURL: "http://localhost:3000" }) {
        query: Query
      }

      type Query {
        search(created: CreatedInput): [Pet]
          @connect(
            source: "api"
            http: { GET: "/search", queryParams: "{ created: $args.created }" }
            selection: "name"
          )
      }

      input CreatedInput {
        gt: Int
        lt: Int
      }

      type Pet {
        name: String
      }
    `;
    // Nested object query values stringify as deepObject via qs defaults.
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json([{ name: 'Bob' }]);
      }) as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          search(created: { gt: 1, lt: 10 }) {
            name
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(urls[0]).toContain('created%5Bgt%5D=1');
    expect(urls[0]).toContain('created%5Blt%5D=10');
  });

  it('does not double-suffix baked ids[] when global arrayFormat is brackets', async () => {
    const urls: string[] = [];
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema @source(name: "api", http: { baseURL: "http://localhost:3000" }) {
        query: Query
      }

      type Query {
        search(ids: [String]): [Pet]
          @connect(
            source: "api"
            http: { GET: "/search", queryParams: "{ \\"ids[]\\": $args.ids }" }
            selection: "name"
          )
      }

      type Pet {
        name: String
      }
    `;
    const schema = processConnectDirectives(buildSchema(sdl), {
      queryStringOptions: { arrayFormat: 'brackets', indices: true },
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json([{ name: 'Bob' }]);
      }) as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          search(ids: ["a", "b"]) {
            name
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    // Decoded: ids[]=a&ids[]=b — not ids[][] / ids[][0]
    expect(urls[0]).toContain('ids%5B%5D=a');
    expect(urls[0]).toContain('ids%5B%5D=b');
    expect(urls[0]).not.toContain('ids%5B%5D%5B%5D');
    expect(urls[0]).not.toContain('ids%5B%5D%5B0%5D');
  });

  it('preserves qs charset for pre-bracketed keys', async () => {
    const urls: string[] = [];
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema @source(name: "api", http: { baseURL: "http://localhost:3000" }) {
        query: Query
      }

      type Query {
        search(tags: [String]): [Pet]
          @connect(
            source: "api"
            http: { GET: "/search", queryParams: "{ \\"tags[]\\": $args.tags }" }
            selection: "name"
          )
      }

      type Pet {
        name: String
      }
    `;
    const schema = processConnectDirectives(buildSchema(sdl), {
      queryStringOptions: {
        arrayFormat: 'brackets',
        indices: true,
        charset: 'iso-8859-1',
      },
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json([{ name: 'Bob' }]);
      }) as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          search(tags: ["æ"]) {
            name
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    // iso-8859-1 encodes æ as %E6 (not UTF-8 %C3%A6), without doubling [].
    expect(urls[0]).toContain('tags%5B%5D=%E6');
    expect(urls[0]).not.toContain('%C3%A6');
  });
});

describe('Federation Connectors HTTP / templates', () => {
  it('percent-encodes path template expression values', async () => {
    const urls: string[] = [];
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema @source(name: "Pets", http: { baseURL: "http://localhost:3000" }) {
        query: Query
      }

      type Query {
        pet(petId: String!): Pet
          @connect(source: "Pets", http: { GET: "/pet/{$args.petId}" }, selection: "name")
      }

      type Pet {
        name: String
      }
    `;
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json({ name: 'Bob' });
      }) as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          pet(petId: "1?admin=true") {
            name
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(urls).toEqual(['http://localhost:3000/pet/1%3Fadmin%3Dtrue']);
  });

  it('interpolates $context.headers bracket accessors with defaults in baseURL', async () => {
    const urls: string[] = [];
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema
        @source(
          name: "Pets"
          http: { baseURL: "http://localhost:{$context.headers['x-upstream-port']:4001}" }
        ) {
        query: Query
      }

      type Query {
        pet(petId: String!): Pet
          @connect(source: "Pets", http: { GET: "/pet/{$args.petId}" }, selection: "name")
      }

      type Pet {
        name: String
      }
    `;
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json({ name: 'Bob' });
      }) as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          pet(petId: "pet200") {
            name
          }
        }
      `),
      contextValue: {
        headers: {
          'x-upstream-port': '5555',
        },
      },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ pet: { name: 'Bob' } });
    expect(urls).toEqual(['http://localhost:5555/pet/pet200']);
  });

  it('preserves colons inside Mesh :default URL values', async () => {
    const urls: string[] = [];
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema
        @source(
          name: "Pets"
          http: { baseURL: "{$context.headers['x-upstream-origin']:https://example.com:8443}" }
        ) {
        query: Query
      }

      type Query {
        pet(petId: String!): Pet
          @connect(source: "Pets", http: { GET: "/pet/{$args.petId}" }, selection: "name")
      }

      type Pet {
        name: String
      }
    `;
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json({ name: 'Bob' });
      }) as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          pet(petId: "pet200") {
            name
          }
        }
      `),
      contextValue: { headers: {} },
    });
    expect(result.errors).toBeUndefined();
    expect(urls).toEqual(['https://example.com:8443/pet/pet200']);
  });

  it('uses Mesh :default when $context.headers bracket accessor is missing', async () => {
    const urls: string[] = [];
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema
        @source(
          name: "Pets"
          http: { baseURL: "http://localhost:{$context.headers['x-upstream-port']:4001}" }
        ) {
        query: Query
      }

      type Query {
        pet(petId: String!): Pet
          @connect(source: "Pets", http: { GET: "/pet/{$args.petId}" }, selection: "name")
      }

      type Pet {
        name: String
      }
    `;
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json({ name: 'Bob' });
      }) as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          pet(petId: "pet200") {
            name
          }
        }
      `),
      contextValue: { headers: {} },
    });
    expect(result.errors).toBeUndefined();
    expect(urls).toEqual(['http://localhost:4001/pet/pet200']);
  });

  it('evaluates multi-field virtual connector selections with $args', async () => {
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema {
        query: Query
      }

      type Query {
        rename(id: ID!): Renamed @connect(selection: "id: $args.id")
      }

      type Renamed {
        id: ID
      }
    `;
    const schema = processConnectDirectives(buildSchema(sdl), {});
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          rename(id: "abc") {
            id
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ rename: { id: 'abc' } });
  });

  it('applies selection methods on virtual $args paths (ids->first)', async () => {
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema {
        query: Query
      }

      type Query {
        firstId(ids: [ID!]!): Renamed @connect(selection: "id: $args.ids->first")
      }

      type Renamed {
        id: ID
      }
    `;
    const schema = processConnectDirectives(buildSchema(sdl), {});
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          firstId(ids: ["a", "b"]) {
            id
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ firstId: { id: 'a' } });
  });

  it('exposes Query._entities from entity:true and type-level @connect (Hive path)', async () => {
    const urls: string[] = [];
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema @source(name: "ecomm", http: { baseURL: "https://api.example.com" }) {
        query: Query
      }

      type Query {
        user(id: ID!): User
          @connect(
            source: "ecomm"
            http: { GET: "/users/{$args.id}" }
            selection: "id name"
            entity: true
          )
      }

      type User @key(fields: "id") {
        id: ID!
        name: String
      }

      type Product
        @key(fields: "id")
        @connect(source: "ecomm", http: { GET: "/products/{$this.id}" }, selection: "id title") {
        id: ID!
        title: String
      }
    `;
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        if (String(url).includes('/users/')) {
          return Response.json({ id: '5', name: 'Ada' });
        }
        return Response.json({ id: '9', title: 'Widget' });
      }) as any,
    });

    expect(schema.getQueryType()?.getFields()._entities).toBeDefined();
    expect(schema.getType('_Entity')).toBeDefined();

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query ($representations: [_Any!]!) {
          _entities(representations: $representations) {
            ... on User {
              id
              name
            }
            ... on Product {
              id
              title
            }
          }
        }
      `),
      variableValues: {
        representations: [
          { __typename: 'User', id: '5' },
          { __typename: 'Product', id: '9' },
        ],
      },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      _entities: [
        { id: '5', name: 'Ada' },
        { id: '9', title: 'Widget' },
      ],
    });
    expect(urls).toEqual(['https://api.example.com/users/5', 'https://api.example.com/products/9']);
  });

  it('fills missing fields on entity stubs via resolveReference (Hive same-subgraph path)', async () => {
    const urls: string[] = [];
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema @source(name: "billing", http: { baseURL: "https://api.example.com" }) {
        query: Query
      }

      type Query {
        getCustomer(id: ID!): Customer
          @connect(
            source: "billing"
            http: { GET: "/customers/{$args.id}" }
            selection: "id name"
            entity: true
          )
        getInvoice(id: ID!): Invoice
          @connect(
            source: "billing"
            http: { GET: "/invoices/{$args.id}" }
            selection: "id customerId customer: { __typename: $(\\"Customer\\") id: customerId }"
          )
      }

      type Customer @key(fields: "id") {
        id: ID!
        name: String
      }

      type Invoice {
        id: ID!
        customerId: ID!
        customer: Customer
      }
    `;
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        if (String(url).includes('/customers/')) {
          return Response.json({ id: 'c1', name: 'Ada Lovelace' });
        }
        return Response.json({ id: 'inv1', customerId: 'c1' });
      }) as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          getInvoice(id: "inv1") {
            id
            customerId
            customer {
              id
              name
            }
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      getInvoice: {
        id: 'inv1',
        customerId: 'c1',
        customer: { id: 'c1', name: 'Ada Lovelace' },
      },
    });
    expect(urls).toEqual([
      'https://api.example.com/invoices/inv1',
      'https://api.example.com/customers/c1',
    ]);
  });

  it('bakes Mesh _response with Apollo-portable selection + runtime url/statusText/headers', async () => {
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      scalar JSON
      schema @source(name: "meta", http: { baseURL: "https://api.example.com" }) {
        query: Query
      }
      type Query {
        thing: Thing
          @connect(
            source: "meta"
            http: { GET: "/thing" }
            selection: """
            $ _response: { method: $("GET") status: $status body: $ }
            """
          )
      }
      type Thing {
        id: ID
        _response: ResponseMetadata
      }
      type ResponseMetadata {
        url: String
        method: String
        status: Int
        statusText: String
        headers: JSON
        body: JSON
      }
    `;
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async () =>
        Response.json(
          { id: '1' },
          { status: 201, statusText: 'Created', headers: { 'x-trace': 'abc' } },
        )) as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          thing {
            id
            _response {
              url
              method
              status
              statusText
              headers
              body
            }
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      thing: {
        id: '1',
        _response: {
          url: 'https://api.example.com/thing',
          method: 'GET',
          status: 201,
          statusText: 'Created',
          headers: expect.objectContaining({ 'x-trace': 'abc' }),
          body: { id: '1' },
        },
      },
    });
  });

  it('merges baked requestBaseBody literals under $args.input in http.body', async () => {
    const bodies: string[] = [];
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema @source(name: "API", http: { baseURL: "http://localhost" }) {
        query: Query
      }

      type Query {
        create(input: CreateInput!): Ok
          @connect(
            source: "API"
            http: {
              POST: "/items"
              body: """
              {
                api_key: $("secret")
                ...$args.input
              }
              """
            }
            selection: "ok"
          )
      }

      input CreateInput {
        name: String
      }

      type Ok {
        ok: Boolean
      }
    `;
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (_url: string, init?: RequestInit) => {
        bodies.push(String(init?.body ?? ''));
        return Response.json({ ok: true });
      }) as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          create(input: { name: "Ada" }) {
            ok
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(JSON.parse(bodies[0])).toEqual({ api_key: 'secret', name: 'Ada' });
  });
});
