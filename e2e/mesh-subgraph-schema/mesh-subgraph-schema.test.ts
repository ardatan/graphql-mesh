import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@graphql-mesh/subgraph';
import { fetch } from '@whatwg-node/fetch';

const SDL = /* GraphQL */ `
  directive @link(url: String!, import: [String]) repeatable on SCHEMA
  directive @key(fields: String!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
  directive @lookup on FIELD_DEFINITION
  directive @is(field: String!) on ARGUMENT_DEFINITION
  directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
  directive @connect(
    source: String
    http: ConnectHTTP
    selection: String!
    entity: Boolean
  ) repeatable on FIELD_DEFINITION | OBJECT

  input ConnectHTTP {
    GET: String
  }
  input SourceHTTP {
    baseURL: String!
  }

  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])
    @link(
      url: "https://graphql.github.io/graphql-federation-spec/draft"
      import: ["@lookup", "@is"]
    )
    @link(url: "https://specs.apollo.dev/connect/v0.2", import: ["@connect", "@source"])
    @source(name: "api", http: { baseURL: "UPSTREAM" })

  type Query {
    product(sku: ID! @is(field: "id")): Product
      @lookup
      @connect(source: "api", http: { GET: "/products/{$args.sku}" }, selection: "id name")
  }

  type Product @key(fields: "id") {
    id: ID!
    name: String!
  }
`;

describe('buildSubgraphSchema e2e', () => {
  let upstreamPort: number;
  let subgraphPort: number;
  let upstreamServer: ReturnType<typeof createServer>;
  let subgraphServer: ReturnType<typeof createServer>;

  beforeAll(async () => {
    upstreamServer = createServer((req, res) => {
      const match = req.url?.match(/^\/products\/(.+)$/);
      if (!match) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: match[1], name: `Name ${match[1]}` }));
    });
    await new Promise<void>(resolve => upstreamServer.listen(0, '127.0.0.1', resolve));
    upstreamPort = (upstreamServer.address() as { port: number }).port;

    const typeDefs = SDL.replace('UPSTREAM', `http://127.0.0.1:${upstreamPort}`);
    const schema = await buildSubgraphSchema(typeDefs, { fetch });
    const yoga = createYoga({ schema, logging: false });
    subgraphServer = createServer(yoga);
    await new Promise<void>(resolve => subgraphServer.listen(0, '127.0.0.1', resolve));
    subgraphPort = (subgraphServer.address() as { port: number }).port;
  });

  afterAll(async () => {
    await Promise.all([
      new Promise<void>((resolve, reject) =>
        subgraphServer.close(err => (err ? reject(err) : resolve())),
      ),
      new Promise<void>((resolve, reject) =>
        upstreamServer.close(err => (err ? reject(err) : resolve())),
      ),
    ]);
  });

  async function gql(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<{ data?: any; errors?: readonly unknown[] }> {
    const res = await fetch(`http://127.0.0.1:${subgraphPort}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    return res.json() as Promise<{ data?: any; errors?: readonly unknown[] }>;
  }

  it('executes @connect Query fields on any GraphQL server', async () => {
    await expect(
      gql(/* GraphQL */ `
        {
          product(sku: "7") {
            id
            name
          }
        }
      `),
    ).resolves.toEqual({
      data: { product: { id: '7', name: 'Name 7' } },
    });
  });

  it('resolves Federation _entities via @lookup / @is', async () => {
    await expect(
      gql(
        /* GraphQL */ `
          query ($reps: [_Any!]!) {
            _entities(representations: $reps) {
              ... on Product {
                id
                name
              }
            }
          }
        `,
        { reps: [{ __typename: 'Product', id: '9' }] },
      ),
    ).resolves.toEqual({
      data: { _entities: [{ id: '9', name: 'Name 9' }] },
    });
  });

  it('serves _service { sdl } for subgraph polling', async () => {
    const result = await gql(/* GraphQL */ `
      {
        _service {
          sdl
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data._service.sdl).toContain('type Product');
    expect(result.data._service.sdl).toContain('@key');
  });
});
