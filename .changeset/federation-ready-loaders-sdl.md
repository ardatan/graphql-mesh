---
'@graphql-mesh/utils': minor
'@graphql-mesh/fusion-composition': minor
'@graphql-mesh/compose-cli': minor
'@omnigraph/sql': minor
'@omnigraph/mongo': minor
'@omnigraph/thrift': minor
'@omnigraph/protobuf': minor
'@omnigraph/neo4j': minor
'@omnigraph/soap': minor
'@omnigraph/odata': minor
'@omnigraph/json-schema': minor
---

Loader-generated subgraphs are federation-ready at load time, and hand-written SDL gets a first-class Compose entry point.

### Why

Mesh Compose previously had to invent Mesh-spec `@link` imports and `@composeDirective` for every loader subgraph (and for Connectors, `@composeDirective(name: "@connect")`). That made loader/hand SDL incomplete for schema registries until after a Compose pass, and forced hand-written flows to copy-paste `buildASTSchema(parse(readFileSync(...)))`.

### What changed

- **`importMeshDirectives`** / **`addConnectComposeDirective`** live in **`@graphql-mesh/utils`** so protocol loaders do not depend on `@graphql-mesh/fusion-composition`. Fusion composition re-exports them for Compose.
- Loaders stamp Mesh `@link` + `@composeDirective` themselves via `importMeshDirectives([...])` with an **explicit** directive list (no auto-scan). Connectors loaders also call `addConnectComposeDirective`.
- Mesh-spec `@link` URLs are per-protocol, starting at **`https://specs.graphql-mesh.com/<protocol>/v0.1`** (e.g. `thrift`, `sql`, `mesh` for Compose `@merge`/`@source`). Federation composition requires `vX.Y`; legacy Guild / `graphql-mesh.com/spec` / `spec.graphql-mesh.dev` links are still recognized.
- Hand-written SDL: prefer **`subgraphs: [{ name, schema }]`** where `schema` is `MaybePromise<GraphQLSchema | DocumentNode | string>` (inline SDL, path, or URL). Or use **`loadSubgraphFromSDL(name, schema, options?)`** (`loadSdlSubgraph` remains a deprecated alias). Mesh `@link` / `@composeDirective` belong in that SDL (or come from a loader).

Object-level `@shareable` / full Fed v2 conversion remains Compose-time (`convertSubgraphToFederationv2`) — loaders do not blanket-stamp `@shareable`.

### Migration

Printed loader SDL now includes Mesh `@link` / `@composeDirective` (and Connectors include `@composeDirective(name: "@connect")`). Update snapshots and any consumers that asserted the previous thinner schema extensions.

Hand-written Compose configs can replace custom file loaders:

```ts
// Before
sourceHandler: () => ({
  name: 'movies',
  schema$: buildASTSchema(parse(readFileSync('./movies.graphql', 'utf8')), {
    assumeValidSDL: true,
    assumeValid: true,
  }),
})

// After
subgraphs: [
  {
    name: 'movies',
    schema: './movies.graphql', // or inline SDL / DocumentNode / GraphQLSchema / Promise
  },
]
```

For registry publish, prefer `mesh-compose --subgraph <name>` (still adds `@shareable` / full Fed v2 object conversion) then Hive / GraphOS publish. Loader and hand-written SDL already carry Mesh `@link` / `@composeDirective` so Compose does not invent them.

OpenAPI / RAML emit goes through `@omnigraph/json-schema`, so those subgraphs pick up the same federation-ready behavior without separate package bumps in this changeset.

### Follow-up (not in this PR)

Connectors-based loaders still emit Mesh `@transport` alongside `@connect` as a Gateway safety net. Once Hive Gateway resolves `@connect` natively, drop `@transport` emit from `@connect`-based loaders (OpenAPI / JSON Schema / RAML / SOAP / OData / Thrift-connect).
