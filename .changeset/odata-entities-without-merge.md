---
'@omnigraph/odata': patch
'@graphql-mesh/odata': patch
'@graphql-mesh/fusion-composition': patch
'@graphql-mesh/transport-connector': patch
---

OData Federation entity resolution without Mesh `@merge`:

- Entity-set-backed types keep resolvable `@key` + type-level `@connect(entity: true)` so Hive `Query._entities` and Apollo Router entity fill both work from the same Connectors SDL.
- Nested-only (or ambiguous entity-set) types keep `@key` for Hive `$expand` heuristics but emit `@key(fields: "…", resolvable: false)` when there is no type-level entity `@connect`.
- `finalizeConnectorsSupergraph` attributes type-level `@connect` by `source` name before the first `@join__type`, so stub/extension graphs listed first no longer steal the owner connector.
- `transport-connector` repairs bare Federation-extracted `Query._entities` (no resolver) by installing `@apollo/subgraph`'s `entitiesResolver` (Connectors `resolveReference` recorded on `extensions.apollo.subgraph`). Without this, Hive planned `_entities` against Connectors subgraphs and hit `Cannot return null for non-nullable field Query._entities` whenever another GraphQL Federation subgraph stubbed the entity.
- Unit + e2e (`federation-connectors`, composition, OData handler, `e2e/odata-entities`) prove Airline stubs resolve Name across a catalog subgraph on Hive and Apollo Router with no `@merge`.
