---
'@omnigraph/neo4j': minor
'@graphql-mesh/transport-neo4j': minor
'@graphql-mesh/neo4j': patch
'@graphql-mesh/fusion-composition': minor
---

### TL;DR

Neo4j subgraphs stay on **`@neo4j/graphql` directives** (`@node`, `@relationship`, `@cypher`, `@alias`, `@plural`, …) with Mesh **`subgraph:`** on those directives (no `@introspection`). The loader can introspect **or** take author `typeDefs`. Rename / naming-convention use `@node(labels:)` / `@plural(value:)` / `@alias(property:)` instead of Mesh `@source` / `@meshSource`.

### Why

Neo4j already has a first-class GraphQL mapping dialect. A separate Mesh `@introspection` stamp was only a round-trip filter; multi-Neo4j compose needs subgraph attribution on the real Neo4j directives (same idea as `@sql__*` / `@mongo`). Transforms previously stamped Mesh `@source`, which Neo4j runtime does not use for property/label identity.

### What changed

- **Loader** (`@omnigraph/neo4j`): optional `typeDefs`. Stamps `subgraph:` onto `@node` / `@relationship` / `@cypher` / … when missing. No `@introspection`.
- **Transport**: re-augment keeps model types by Neo4j directives scoped to `@transport(subgraph:)`. Strips Mesh `subgraph` args (and `@source` / `@meshSource` / `@merge`) before `@neo4j/graphql`.
- **Composition**: Neo4j skips Mesh source stamps. Rename / naming-convention stamp Neo4j identity directives (`@node(labels:)`, `@plural(value:)` for the original root family, `@alias(property:)`); `@cypher` arg renames rewrite `$argName`.
- **Legacy handler**: `source:` goes through the same `typeDefs` path.

### Migration

1. Recompose Neo4j subgraphs after upgrade.
2. Drop Mesh `@introspection` from hand-written SDL; use `@node(subgraph:)` (loader stamps if omitted).
3. After rename transforms, expect `@node(labels:)` / `@plural(value:)` / `@alias(property:)` -- not `@source` / `@meshSource`.
4. Runtime package remains `@graphql-mesh/transport-neo4j`.
