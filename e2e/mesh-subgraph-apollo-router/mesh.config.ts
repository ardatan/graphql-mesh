import { Opts } from '@e2e/opts';
import {
  defineConfig as defineComposeConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);
const productsPort = opts.getServicePort('products', true);

/**
 * Federation-facing SDL for composition (no Mesh `@connect` / federation-spec
 * draft `@link`). Apollo Router must call the GraphQL subgraph URL; Mesh
 * directive execution stays inside `buildSubgraphSchema` on that server.
 */
const productsComposeSdl = /* GraphQL */ `
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key", "@composeDirective"])
    @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@transport"])
    @composeDirective(name: "@transport")
    @transport(
      subgraph: "products"
      kind: "http"
      location: "http://127.0.0.1:${productsPort}/graphql"
    )

  directive @link(url: String!, import: [String]) repeatable on SCHEMA
  directive @key(fields: String!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
  directive @composeDirective(name: String!) repeatable on SCHEMA
  directive @transport(
    subgraph: String!
    kind: String!
    location: String
  ) repeatable on SCHEMA

  type Query {
    product(id: ID!): Product
  }

  type Product @key(fields: "id") {
    id: ID!
    name: String!
  }
`;

export const composeConfig = defineComposeConfig({
  // Keep Federation `@key` entity hops only. Semantic ById `@merge` stamps are for
  // Hive stitching and leave join__directive(name: "merge") that Apollo Router rejects.
  ignoreSemanticConventions: true,
  subgraphs: [
    {
      name: 'products',
      schema: productsComposeSdl,
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('reviews', {
        endpoint: `http://127.0.0.1:${opts.getServicePort('reviews')}/graphql`,
      }),
    },
  ],
});
