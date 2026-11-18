---
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

- **`ensureFederationReadySubgraph(schema)`** in `@graphql-mesh/fusion-composition` (idempotent): Mesh-spec `@link` + `@composeDirective` for Mesh directives; Connectors also get `@composeDirective(name: "@connect")`.
- Protocol loaders call it on emit: SQL, Mongo, Thrift, Protobuf, Neo4j, SOAP, OData, OpenAPI / JSON Schema / RAML.
- Compose still calls the same helper as a safety net for older loaders / raw SDL.
- **`loadSdlSubgraph(name, { source | typeDefs, transport?, federationReady? })`** in `@graphql-mesh/compose-cli` for hand-written or generated-then-edited SDL (default `federationReady: true`).

Object-level `@shareable` / full Fed v2 conversion remains Compose-time (`convertSubgraphToFederationv2`).

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
import { loadSdlSubgraph } from '@graphql-mesh/compose-cli'

sourceHandler: loadSdlSubgraph('movies', {
  source: './movies.graphql',
})
```

For registry publish, prefer `mesh-compose --subgraph <name>` (still adds `@shareable` / full Fed v2 object conversion) then Hive / GraphOS publish. Loader and `loadSdlSubgraph` output already carry Mesh `@link` / `@composeDirective` applications so Compose does not invent them. Include directive definitions in hand-written SDL (or start from loader emit) so Mesh can register `@composeDirective` for those directives.

OpenAPI / RAML emit goes through `@omnigraph/json-schema`, so those subgraphs pick up the same federation-ready behavior without separate package bumps in this changeset.
