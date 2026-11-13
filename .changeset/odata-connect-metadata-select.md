---
'@graphql-mesh/transport-rest': minor
'@omnigraph/odata': minor
'@graphql-mesh/transport-odata': minor
---

OData subgraphs now emit Federation Connectors (`@source` / `@connect` / `@key`) instead of Mesh `@transport(kind: "odata")` + `@entitySet*`.

- Loader sets `Accept: application/json;odata.metadata=minimal` on `@source` (dual-runtime signal).
- Hive `transport-rest` detects that Accept value and appends `$select` / `$expand` from the GraphQL selection.
- Apollo Router runs the same SDL as plain Connectors (fuller payloads, same GraphQL results).
- `@graphql-mesh/transport-odata` is a thin alias to `transport-rest` for older `kind: "odata"` entries.

Bound function/action Mesh directives are still emitted for a follow-up Connectors mapping.
