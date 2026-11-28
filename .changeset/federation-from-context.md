---
'@graphql-tools/federation': minor
'@graphql-tools/stitch': minor
'@graphql-tools/delegate': patch
---

Support Federation `@context` / `@fromContext` (join v0.5 `contextArguments`) on the stitch backbone path.

When a supergraph field carries `@join__field(contextArguments: ...)`, Mesh reconstructs the hidden subgraph argument, plans a separate entity hop after the nearest `@context` ancestor is fetched, and injects the context value as a variable (grouping entities by distinct context tuples). Contextual arguments stay off the public API schema.

**Migration:** no action for schemas without `@context` / `@fromContext`. Supergraphs composed with Federation join v0.5 `contextArguments` now resolve those fields on the Mesh stitch backbone. Clients must not pass contextual arguments (they are not part of the public schema).
