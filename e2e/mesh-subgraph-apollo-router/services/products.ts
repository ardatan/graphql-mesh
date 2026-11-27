/**
 * Mesh subgraph hosted as a normal GraphQL HTTP server via
 * `@graphql-mesh/subgraph` `buildSubgraphSchema`. Apollo Router federates to
 * this endpoint; Mesh `@connect` / `@lookup` execute here (not as Router-native
 * Connectors).
 */
import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';
import { buildSubgraphSchema } from '@graphql-mesh/subgraph';
import { fetch } from '@whatwg-node/fetch';

const opts = Opts(process.argv);
const restPort = opts.getServicePort('rest', true);
const port = opts.getServicePort('products', true);

/** Incremented on every GraphQL HTTP hit so the e2e can prove Router delegated here. */
let graphqlHits = 0;

const typeDefs = /* GraphQL */ `
  directive @link(url: String!, import: [String]) repeatable on SCHEMA
  directive @key(fields: String!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
  directive @lookup on FIELD_DEFINITION
  directive @is(field: String!) on ARGUMENT_DEFINITION
  directive @transport(
    subgraph: String
    kind: String
    location: String
    options: String
  ) repeatable on SCHEMA
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
    @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@transport"])
    @transport(
      subgraph: "products"
      kind: "connect"
      location: "http://127.0.0.1:${restPort}"
    )
    @source(name: "api", http: { baseURL: "http://127.0.0.1:${restPort}" })

  type Query {
    product(id: ID! @is(field: "id")): Product
      @lookup
      @connect(
        source: "api"
        http: { GET: "/products/{$args.id}" }
        selection: "id name"
      )
  }

  type Product @key(fields: "id") {
    id: ID!
    name: String!
  }
`;

async function main() {
  const schema = await buildSubgraphSchema(typeDefs, { fetch });

  const yoga = createYoga({
    schema,
    logging: false,
    graphqlEndpoint: '/graphql',
  });

  const server = createServer((req, res) => {
    if (req.url === '/_hits') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ graphqlHits }));
      return;
    }
    if (req.method === 'POST' && (req.url === '/graphql' || req.url?.startsWith('/graphql?'))) {
      graphqlHits += 1;
    }
    return yoga(req, res);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Mesh products subgraph at http://127.0.0.1:${port}/graphql`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
