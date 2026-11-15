---
'@graphql-mesh/transport-rest': patch
'@graphql-mesh/fusion-composition': patch
---

Federation Connectors entity stubs from a GraphQL peer no longer need Mesh `@merge`.

`transport-rest` repairs bare Federation-extracted `Query._entities` (field present, no resolver) so Hive can plan `_entities` against a Connectors owner when a GraphQL catalog only returns a key stub. `finalizeConnectorsSupergraph` attributes type-level `@connect` by `source` name before the first `@join__type`, so extension graphs listed first do not steal the owner connector.

E2E `graphql-virtual-connectors`: GraphQL Federation catalog stubs `Product` + `isFeatured`; OpenAPI Connectors owns `getProduct(id:)` with `entity: true` + JSONSelection; Hive and Apollo Router both fill `name` / `price` with no Mesh `@merge`.
