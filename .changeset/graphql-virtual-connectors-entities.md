---
'@graphql-mesh/fusion-composition': patch
---

GraphQL virtual-connect entity transforms and dual-run e2es without Mesh `@merge`.

`createFederationTransform` accepts `resolveReference.virtualConnect: true` to emit an Apollo virtual `@connect(entity: true)` (selection from `$args` only, no `http:`) instead of Mesh `@merge`. Compose re-detects connect/v0.4 after transforms and stamps rest transport. Virtual connect cannot call a GraphQL HTTP upstream; use real Federation `_entities` or an HTTP-backed `@connect` when entity fields must be fetched.

E2E:
- `graphql-virtual-connectors`: GraphQL catalog stub + OpenAPI Connectors owner (dual-run, no `@merge`).
- `graphql-virtual-transforms`: type-merging without `additionalTypeDefs`/`@resolveTo` — virtualConnect vs Federation authors.
