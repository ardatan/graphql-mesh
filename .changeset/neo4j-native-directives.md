---
'@omnigraph/neo4j': minor
'@graphql-mesh/transport-neo4j': minor
'@graphql-mesh/neo4j': patch
'@graphql-mesh/fusion-composition': minor
---

Neo4j subgraphs stay on **`@neo4j/graphql` directives** (`@node`, `@relationship`, `@cypher`, `@alias`, `@plural`, …) with Mesh **`subgraph:`** on those directives (no `@introspection`). The loader can introspect **or** take author `typeDefs`. Rename / naming-convention keep DB identity via `@node(labels:)` / `@plural(value:)` / `@alias(property:)` instead of Mesh `@source` / `@meshSource`.

### What changed

- **Loader** (`@omnigraph/neo4j`): optional `typeDefs`; stamps `subgraph:` when missing; public option TSDoc with real `@default`s.
- **Transport**: subgraph-scoped model extract (ownership, connection/aggregate shape, spatial retention, empty-iface scrub, implements conformance); strips Mesh-only args before `@neo4j/graphql`; closes only self-created drivers on dispose.
- **Composition**: Neo4j skips Mesh source stamps; neo4j-identity helpers for labels / plural / property alias / `$argName` rewrite.
- **Legacy handler**: `source:` goes through the same `typeDefs` path.

### Migration

1. Recompose Neo4j subgraphs after upgrade.
2. Drop Mesh `@introspection` from hand-written SDL; use `@node(subgraph:)` (loader stamps if omitted).
3. After rename transforms, expect `@node(labels:)` / `@plural(value:)` / `@alias(property:)` -- not `@source` / `@meshSource`.
4. Runtime package remains `@graphql-mesh/transport-neo4j`.
