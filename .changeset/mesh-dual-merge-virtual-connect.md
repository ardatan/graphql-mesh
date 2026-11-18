---
'@graphql-mesh/fusion-composition': minor
---

Mesh auto type-merging for GraphQL ById fields now dual-emits Mesh `@merge` and a virtual Apollo Connectors `@connect(entity: true)` (requestless `$args` selection) so Hive Gateway and Apollo Router can both plan entity fetches from the same annotated subgraph.

**Migration**

- No config flag. Recompose with Mesh composition for subgraphs that rely on semantic ById / auto `@merge` (for example `book(id:)`, `petById(id:)`).
- Expect annotated SDL to gain `connect/v0.4` `@link` and `@connect(selection: "…", entity: true)` next to existing `@merge` on Mesh-only entity lookups.
- Types that already had Federation `@key` / `@interfaceObject` (or federation-transform keys) keep `@merge` + `@key` only — they do **not** get virtual `@connect` (avoids flipping a GraphQL subgraph into Connectors-only Rover mode).
- When a connect `@link` is present, Mesh stitching `@source` is imported/aliased as `@meshSource` so Apollo Router does not treat Mesh `@source` as Connectors `@source`.
- Field renames that remove the old GraphQL field do **not** emit `$this.old` virtual connect (Router requires that field to still exist); Hive continues to use `@meshSource`.
- Do not `@composeDirective` `@connect` for dual-emit GraphQL subgraphs (Apollo-like `@link` only).
