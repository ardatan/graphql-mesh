---
'@graphql-mesh/transport-rest': patch
'@graphql-mesh/fusion-composition': patch
---

Federation Connectors entity stubs and GraphQL virtual-connect entity transforms.

`transport-rest` repairs bare Federation-extracted `Query._entities` so Hive can plan against a Connectors owner when a GraphQL catalog only returns a key stub.

`createFederationTransform` accepts `resolveReference.virtualConnect: true` to emit an Apollo virtual `@connect(entity: true)` (selection from `$args` only, no `http:`) instead of Mesh `@merge`. Compose re-detects connect/v0.4 after transforms and stamps rest transport. Virtual connect cannot call a GraphQL HTTP upstream; use real Federation `_entities` or an HTTP-backed `@connect` when entity fields must be fetched.

E2E:
- `graphql-virtual-connectors`: GraphQL catalog stub + OpenAPI Connectors owner (dual-run, no `@merge`).
- `graphql-virtual-transforms`: type-merging without `additionalTypeDefs`/`@resolveTo` — virtualConnect vs Federation authors.
