---
'@graphql-mesh/utils': minor
'@graphql-mesh/fusion-composition': minor
'@graphql-mesh/fusion-runtime': patch
'@graphql-mesh/compose-cli': patch
---

Prefer Federation Spec draft `@lookup` / `@is` / `@internal` for entity entry points

Compose semantic conventions and the Federation transform now stamp `@lookup` (and `@is(field:)` when the argument name differs from the entity field) instead of Mesh `@merge` for singular entity resolvers. Compose no longer emits `@merge`; runtime still accepts hand-authored / legacy `@merge` as a fallback and synthesizes stitching hop config from `@lookup` / `@is`.

List-returning / batch-arg fields are not auto-stamped (`@lookup` must not return a list per the Federation Spec draft). Use Connectors/`entity: true`, an explicit singular lookup field, or hand-authored `@merge` when batch hops are required.

Imports use the official Federation Spec `@link`:

```graphql
extend schema
  @link(
    url: "https://graphql.github.io/graphql-federation-spec/draft"
    import: ["@lookup", "@is", "@internal"]
  )
```

GraphQL.js directive defs are vendored from that draft (Apollo federation `@link` v2.6, which Mesh still uses for `@key` / `@shareable`, does not expose these elements; Guild composition also rejects Apollo federation `@link` v3.0 today). They are registered with `@composeDirective` under that federation-spec URL, not under Mesh `core` / `specs.graphql-mesh.dev`. Supergraph apps are carried as `@join__directive` like `@merge`.

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
