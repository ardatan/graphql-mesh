---
'@graphql-mesh/transport-rest': minor
'@omnigraph/odata': minor
'@graphql-mesh/fusion-composition': patch
---

OData subgraphs now emit Federation Connectors (`@source` / `@connect` / `@key`) instead of Mesh `@transport(kind: "odata")` + `@entitySet*`.

- Loader sets `Accept: application/json;odata.metadata=minimal` on `@source` (dual-runtime signal).
- Hive `transport-rest` detects that Accept value and appends `$select` / `$expand` from the GraphQL selection.
- Apollo Router runs the same SDL as plain Connectors (fuller payloads, same GraphQL results).
- **BREAKING:** `@graphql-mesh/transport-odata` is removed. OData runs on `@graphql-mesh/transport-rest` only (Gateway resolves `kind: "rest"`).

`@abstractType` → `resolveType` (from `@odata.type`) is wired inside `transport-rest` `processDirectives`, so Hive rehydration no longer needs a separate OData residual pass (`processODataResidualDirectives` removed).

Shared Connectors defs use spec scalars `JSONSelection` / `URLPathTemplate`; composition strips them from the finalized supergraph so they do not leak as `scalar … @join__type` (Router owns them via `@link(connect/v0.4)`).

Also hardens MS Graph `$metadata` load / compose: safe enum member names (`null` → `_null`), resilient base-type field merges, no shared interface/object directive bags (so `@connect` / `@shareable` stay off interfaces), empty Input placeholders, and `e2e/odata-msgraph` (fixture metadata + mock Graph, hive + apollo-router GetMe in CI; live `$metadata`/`me` remains in the unit suite with a token).
