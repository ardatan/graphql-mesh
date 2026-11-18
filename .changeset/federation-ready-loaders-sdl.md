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
- Hand-written SDL: prefer **`subgraphs: [{ name?, schema }]`** where `schema` is `MaybePromise<GraphQLSchema | DocumentNode | string>` (inline SDL, path, or URL). **`name` is optional** when the schema has `@transport(subgraph: ...)` (conflict if both differ; error if neither). Or use **`loadSubgraphFromSDL(name?, schema, options?)`**. Mesh `@link` / `@composeDirective` belong in that SDL (or come from a loader).
- **GM-41:** after Guild composition, **`finalizeMeshJoinDirectives`** rewrites schema `@transport` to **`@join__directive(graphs:, name: "transport", args:)`**, dropping `subgraph` / `location` when they match `@join__graph`, keeping `kind` / `options` / override `location` / non-empty `headers`. Pure `http` with matching location is dropped. **Connect loaders never emit `@transport`** (zero transport responsibility). Compose may invent options-only join transport args from `schema.extensions.meshConnectOptions` (qs / odata / …); Gateway otherwise infers `kind: "connect"` from join connect/source. Unused `@transport` definition / `TransportOptions` / core `@link` import of `@transport` are pruned.
- **`@source`** stamps under **`core/v0.1`** (Gateway yarn patch accepts core + legacy Guild URL).
- **GM-37 first slice:** **`validateMeshDirectives`** — Mesh `@link` version contract + `@transport` arg shapes at Compose ingest / hand SDL; soft on transports.
- **`convertSubgraphToFederationv2`:** skip type-level `@shareable` on `@key` entities; import only used Fed directives (+ `@shareable`).
- Hive Gateway **`@graphql-mesh/fusion-runtime` yarn patch:** read `join__directive(name: "transport")`, infer `kind: "connect"` from join connect/source, accept `@source` from core URL, reject unsupported Mesh `@link` versions.

Object-level `@shareable` / full Fed v2 conversion remains Compose-time (`convertSubgraphToFederationv2`) — loaders do not blanket-stamp `@shareable`.

### Migration

Printed loader SDL now includes Mesh `@link` / `@composeDirective` (and Connectors include `@composeDirective(name: "@connect")`). Supergraph SDL carries transports as `@join__directive(name: "transport")` instead of schema `@transport` — update snapshots. Hive Gateway must read that form (fusion-runtime gap until patched).

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

**GM-41 remainder:** Mesh field/type dirs (`@hoist`, `@merge`, `@source`, …) → `@join__directive`. Upstream Hive Gateway `fusion-runtime` should absorb the yarn patch (join transport read, connect infer, `@source` from core URL, Mesh `@link` version assert).
