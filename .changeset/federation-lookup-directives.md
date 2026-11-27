---
'@graphql-mesh/utils': minor
'@graphql-mesh/fusion-composition': minor
'@graphql-mesh/fusion-runtime': patch
'@graphql-mesh/compose-cli': patch
---

Prefer Federation Spec draft `@lookup` / `@is` / `@internal` for entity entry points

Compose semantic conventions and the Federation transform now stamp `@lookup` (and `@is(field:)` when the argument name differs from the entity field) instead of Mesh `@merge` for singular entity resolvers.

Imports use the official Federation Spec `@link`:

```graphql
extend schema
  @link(
    url: "https://graphql.github.io/graphql-federation-spec/draft"
    import: ["@lookup", "@is", "@internal"]
  )
```

GraphQL.js directive defs are vendored from that draft (Apollo federation `@link` v2.6, which Mesh still uses for `@key` / `@shareable`, does not expose these elements; Guild composition also rejects Apollo federation `@link` v3.0 today). They are registered with `@composeDirective` under that federation-spec URL, not under Mesh `core` / `specs.graphql-mesh.dev`.

Runtime still accepts legacy `@merge` and synthesizes stitching hop config from `@lookup` / `@is`. List-returning batch entry points still emit `@merge` until the Federation Spec covers list-shaped lookups.

**Migration:** new generated subgraphs use `@lookup` / `@is`. Existing schemas with `@merge` need no change. Prefer `@lookup` for new hand-authored SDL:

```graphql
type Query {
  userById(id: ID!): User @lookup
  user(userId: ID! @is(field: "id")): User @lookup
}
type User @key(fields: "id") {
  id: ID!
}
```
