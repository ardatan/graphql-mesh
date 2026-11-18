---
'@graphql-mesh/fusion-composition': minor
---

Mesh auto type-merging for GraphQL ById fields now dual-emits Mesh `@merge` and a virtual `@connect(entity: true)` (requestless `$args` selection) on the same annotated subgraph so Mesh compose can serve both Mesh `@merge` entity planning and Connectors-style entity planning without a flag.

**Migration**

- No config flag. Recompose with Mesh composition for subgraphs that rely on semantic ById / auto `@merge` (for example `book(id:)`, `petById(id:)`).
- Expect annotated SDL to gain `connect/v0.4` `@link` and `@connect(selection: "…", entity: true)` next to existing `@merge` on Mesh-only entity lookups.
- Types that already had `@key` / `@interfaceObject` (or federation-transform keys) keep `@merge` + `@key` only — they do **not** get virtual `@connect` (avoids treating a GraphQL subgraph as Connectors-only during supergraph compose).
- When a connect `@link` is present, Mesh stitching `@source` is imported/aliased as `@meshSource` so Mesh `@source` is not read as Connectors SCHEMA `@source`.
- Field renames that remove the old GraphQL field do **not** emit `$this.old` virtual connect (the renamed-away field must still exist for `$this.<name>`); Mesh keeps `@meshSource` for those cases.
- Do not `@composeDirective` `@connect` for dual-emit GraphQL subgraphs (`@link` alone is enough).
