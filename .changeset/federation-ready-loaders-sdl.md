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

Mesh Compose previously had to invent Mesh-spec `@link` imports and `@composeDirective` for every loader subgraph. That made loader/hand SDL incomplete for schema registries until after a Compose pass, and forced hand-written flows to copy-paste `buildASTSchema(parse(readFileSync(...)))`.

### What changed

- **`importMeshDirectives`** lives in **`@graphql-mesh/utils`** so protocol loaders do not depend on `@graphql-mesh/fusion-composition`. Fusion composition re-exports it for Compose.
- Loaders stamp Mesh `@link` + `@composeDirective` via `importMeshDirectives([...])` (explicit list). **Connectors loaders keep full `directive @connect` / `@source` defs** so printed subgraph SDL is GraphQL.js-valid, but **do not stamp `@composeDirective(name: "@connect")`**. Mesh Compose stamps composeDirective (+ any missing connect defs) **only on Guild input** (`prepareConnectorsBeforeGuild`), then `finalizeConnectorsSupergraph` emits `@join__directive` and drops composeDirective / native connect defs from the final supergraph.
- Mesh-spec `@link` URLs start at **`https://specs.graphql-mesh.dev/<name>/v0.1`**. Shared Mesh **core** directives (`@transport`, `@merge`, `@hoist`, `@source`/`@meshSource`, `@resolveTo`, `@pubsubOperation`, `@pubsubPublish`, `@extraSchemaDefinitionDirective`, …) use **`core/v0.1`**. Protocol loaders use a separate protocol URL (e.g. `sql/v0.1` for `@sql` only) plus `core/v0.1` for `@transport`. Older Mesh `@link` prefixes remain accepted when reading existing supergraphs; Compose only stamps `specs.graphql-mesh.dev`.
- **Spec contract:** `parseMeshSpecUrl` / `assertSupportedMeshSpec` (/`OnSchema`) - transports validate supported protocol/`core` versions when a matching `@link` is present; Compose asserts after stamping. Hive Gateway can reuse the same helpers later.
- Hand-written SDL: prefer **`subgraphs: [{ name?, schema }]`** where `schema` is `MaybePromise<GraphQLSchema | DocumentNode | string>` (inline SDL, path, or URL). **`name` is optional** when the schema has `@transport(subgraph: ...)` (conflict if both differ; error if neither). Or use **`loadSubgraphFromSDL(name?, schema, options?)`**. Mesh `@link` / `@composeDirective` belong in that SDL (or come from a loader).
- **GM-41:** after Guild composition, **`finalizeMeshJoinDirectives`** rewrites schema `@transport` to **`@join__directive(graphs:, name: "transport", args:)`** for protocol kinds (sql/thrift/protobuf/neo4j/…), dropping `subgraph` when it matches `@join__graph`. Pure `http` with matching location is dropped. **Connect:** bare connect omits transport (Gateway infers `kind: "connect"` from join connect/source). Remaining connect options/headers stay a **native** `@transport(kind: "connect", subgraph, location?, options/headers)` - Apollo Router Connectors reject Mesh `@transport` reconstituted from `@join__directive`. Join-carried protocol transport keeps `directive @transport` (+ `TransportOptions`) for Apollo reconstitution of non-connect kinds. Unused orphan transport artifacts are pruned when nothing remains.
- **SDL print (loaders/compose):** subgraph `@connect` / selection use GraphQL `"""` only when the value has newlines; omit empty thrift `args`; omit default `Accept` / `Content-Type: application/json` from connect header mappings (runtime still defaults Accept when unset). Supergraph join args stay dense (escaped `\n`, no prefer-`"""`).
- **GM-37 first slice:** **`validateMeshDirectives`** - Mesh `@link` version contract + `@transport` arg shapes at Compose ingest / hand SDL; soft on transports.
- **`convertSubgraphToFederationv2`:** skip type-level `@shareable` on `@key` entities; import only used Fed directives (+ `@shareable`).
- Hive Gateway **`@graphql-mesh/fusion-runtime` yarn patch:** read `join__directive(name: "transport")`, infer `kind: "connect"` from join connect/source (including selection-only / virtual connectors with empty `join__graph(url:)` and no SCHEMA `@source`), accept `@source` from core URL, reject unsupported Mesh `@link` versions.

Object-level `@shareable` / full Fed v2 conversion remains Compose-time (`convertSubgraphToFederationv2`) - loaders do not blanket-stamp `@shareable`.

### Migration

Printed loader SDL includes Mesh `@link` / `@composeDirective` for Mesh directives, plus full Connectors `@connect` / `@source` defs - **not** `@composeDirective(name: "@connect")`. Supergraph SDL carries protocol transports as `@join__directive(name: "transport")` (native `@transport` may remain for connect options). Update snapshots. Hive Gateway must read join transport (fusion-runtime yarn patch until upstreamed).

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
