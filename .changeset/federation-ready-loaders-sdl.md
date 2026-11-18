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
- Mesh-spec `@link` URLs start at **`https://specs.graphql-mesh.com/<name>/v0.1`**. Shared Mesh **core** directives (`@transport`, `@merge`, `@hoist`, `@resolveTo`, `@pubsubOperation`, `@pubsubPublish`, `@extraSchemaDefinitionDirective`, …) use **`core/v0.1`**. Protocol loaders use a separate protocol URL (e.g. `sql/v0.1` for `@sql` only) plus `core/v0.1` for `@transport`.
- **`@source` / `@meshSource`** are still stamped from **`https://the-guild.dev/graphql/mesh/spec/v1.0`** because Hive Gateway (`fusion-runtime`) only resolves Mesh stitching `@source` from that exact URL today (`MESH_GATEWAY_SOURCE_SPEC_URL`). TODO: move `@source` to `core/v0.1` once Gateway accepts it.
- **Spec contract:** `parseMeshSpecUrl` / `assertSupportedMeshSpec` (/`OnSchema`) — transports validate supported protocol/`core` versions when a matching `@link` is present; Compose asserts after stamping. Hive Gateway can reuse the same helpers later.
- Hand-written SDL: prefer **`subgraphs: [{ name?, schema }]`** where `schema` is `MaybePromise<GraphQLSchema | DocumentNode | string>` (inline SDL, path, or URL). **`name` is optional** when the schema has `@transport(subgraph: ...)` (conflict if both differ; error if neither). Or use **`loadSubgraphFromSDL(name?, schema, options?)`** (`loadSdlSubgraph` remains a deprecated alias). Mesh `@link` / `@composeDirective` belong in that SDL (or come from a loader).

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

**GM-41 (partial in this PR):** Compose runs `finalizeMeshJoinDirectives` after Guild composition — drops pure `kind: "http"` `@transport` when `location` matches `@join__graph(url:)`, and strips redundant `location` from other transports. Full Mesh field/type directive → `@join__directive` rewrite (and dropping `subgraph:` / unused defs) waits on Hive Gateway `fusion-runtime` reading those from `@join__directive` (today it keys transports by `@transport(subgraph:)` and matches `@hoist` / `@source` by name).
