---
'@omnigraph/neo4j': minor
'@graphql-mesh/transport-neo4j': minor
'@graphql-mesh/neo4j': patch
'@graphql-mesh/fusion-composition': minor
---

### TL;DR

Neo4j subgraphs stay on **`@neo4j/graphql` directives** (`@node`, `@relationship`, `@cypher`, `@alias`, …). The loader can introspect **or** take author `typeDefs`. Rename / naming-convention transforms use `@node(labels:)` / `@alias(property:)` instead of Mesh `@source` / `@meshSource`.

### Why

Neo4j already has a first-class GraphQL mapping dialect. Inventing Mesh `@sql__*` / `@mongo`-style stamps would duplicate `@neo4j/graphql` and break hand-authored SDL. Transforms previously stamped Mesh `@source` for any non-Connectors subgraph with transforms, which Neo4j runtime does not use for property/label identity.

### What changed

- **Loader** (`@omnigraph/neo4j`): optional `typeDefs` (string | DocumentNode). Omitting it keeps `@neo4j/introspector`. Directive defs include `@node(labels:)`, `@alias`, `@cypher`, `@plural`.
- **Transport**: re-augment keeps `@node` / `@relationshipProperties` model types (not only `@introspection` field stamps). Strips Mesh `@source` / `@meshSource` / `@merge` before `@neo4j/graphql`.
- **Composition**: `isNeo4jSubgraph` / `skipsMeshSourceStamps` -- Neo4j skips Mesh source stamps. Rename / naming-convention stamp Neo4j identity directives; `@cypher` arg renames rewrite `$argName` (not Connectors `$args.`).
- **Legacy handler**: `source:` file loads through the same `typeDefs` augment path.

### Migration

1. Recompose Neo4j subgraphs after upgrade.
2. Hand-authored schemas: pass `typeDefs` (or legacy `source`) using Neo4j GraphQL directives; no Mesh mapping dialect required.
3. After rename transforms, expect `@node(labels:)` / `@alias(property:)` on Neo4j types/fields -- not `@source` / `@meshSource`.
4. Runtime package remains `@graphql-mesh/transport-neo4j`.
