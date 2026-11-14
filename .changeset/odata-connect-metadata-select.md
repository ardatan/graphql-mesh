---
'@omnigraph/odata': minor
'@graphql-mesh/odata': minor
'@graphql-mesh/transport-rest': minor
'@graphql-mesh/fusion-composition': minor
'@graphql-mesh/utils': patch
'@omnigraph/json-schema': patch
---

**Breaking (0.x):** OData subgraphs emit Federation Connectors (`@source` / `@connect` / `@key`) and run on `@graphql-mesh/transport-rest` (`kind: "rest"`). `@graphql-mesh/transport-odata` and Mesh OData field/HTTP resolvers (`@entitySet*`, `@pluralNav`, `@boundFunction`, …) are removed.

- `@source` sets `Accept: application/json;odata.metadata=minimal`. Hive appends `$select` / `$expand` from the GraphQL selection; Apollo Router runs the same SDL as plain Connectors.
- Entity-set nav: `/EntitySet/{$this.key}/Nav`; nested-only: `{$this._odataId}/Nav` (`_odataId` from `@odata.id`, `@inaccessible`).
- Abstract types: no `@abstractType` — `processDirectives` resolveType reads `@odata.type` (plus `__typename` / structural fallback).
- No public Mesh OData directives and no `DirectiveArgsMap` / `odataEntityInfo`. Loader stamps emit-time `extensions.odata` hints, then drops them after `@connect` emit. `$select` / `$expand` uses `@key` + `@connect` heuristics.
- Mesh `@transport` only when `options.odata` is set (`batch` / `expandNavProps`); otherwise `@source` alone and compose injects a minimal `kind: rest` entry.
- Shared connect/v0.4 defs (`JSONSelection` / `URLPathTemplate`) live in `transport-rest`; composition strips those scalars from the finalized supergraph.
- MS Graph: safer enum names, resilient base-type merges, `e2e/odata-msgraph` (fixture + hive/apollo-router); TripPin e2e covers entity-set nav on both runners.
