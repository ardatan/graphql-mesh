---
'@graphql-mesh/utils': minor
'@graphql-mesh/fusion-composition': minor
'@graphql-mesh/fusion-runtime': patch
'@graphql-mesh/compose-cli': patch
---

Prefer Federation Spec draft `@lookup` / `@is` / `@internal` alongside Mesh `@merge`

Compose semantic conventions and the Federation transform stamp Federation Spec draft `@lookup` (and `@is(field:)` when the argument name differs from the entity field) on **single-argument entity entry fields that return one object (not a list)**. List/batch entry fields, multi-argument `resolveReference` hops (multi-field keys, `@requires` extras), and nested `argsExpr` keep Mesh `@merge` — the draft requires that `@lookup` must not return a list, and Mesh does not extend `@lookup` for batch. `@merge` is kept (not deprecated); runtime still accepts hand-authored `@merge` and synthesizes stitching hop config from `@lookup` / `@is`.

Imports use the official Federation Spec `@link`:

```graphql
extend schema
  @link(
    url: "https://graphql.github.io/graphql-federation-spec/v0.0"
    import: ["@lookup", "@is", "@internal"]
  )
```

GraphQL.js directive defs are vendored from that draft (Apollo federation `@link` v2.6, which Mesh still uses for `@key` / `@shareable`, does not expose these elements; Guild composition also rejects Apollo federation `@link` v3.0 today). They are registered with `@composeDirective` under that federation-spec URL, not under Mesh `core` / `specs.graphql-mesh.dev`. Supergraph apps are carried as `@join__directive` like `@merge`.

**Migration:** new generated subgraphs use `@lookup` / `@is` for single-object entry and `@merge` for list/batch. Existing schemas with `@merge` need no change. Prefer `@lookup` for new hand-authored single-object SDL:

```graphql
type Query {
  userById(id: ID!): User @lookup
  user(userId: ID! @is(field: "id")): User @lookup
  users(ids: [ID!]!): [User!]! @merge(keyField: "id", keyArg: "ids")
}
type User @key(fields: "id") {
  id: ID!
}
```
