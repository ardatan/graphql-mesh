---
'@omnigraph/sql': major
'@graphql-mesh/transport-sql': major
'@graphql-mesh/fusion-composition': minor
---

## TL;DR

New SQL subgraph stack: loaders emit hand-writable `@sql__*` directives (not a black-box PostGraphile schema), and one transport `kind: "sql"` executes them. Dialects are `postgres` | `mysql` | `sqlite` via loader `type` / URI / `options.dialect` -- not separate `@mysql*` families.

Old `@omnigraph/mysql`, `@omnigraph/sqlite`, and legacy `@graphql-mesh/postgraphile` stay shipped; cutover is later.

## Why

Mesh already moved Thrift / Protobuf / REST toward explicit, AI-friendly mapping directives (`@thrift__rpc`, `@protobuf__rpc`, `@connect`). SQL was still either tuql (opaque resolvers), `@mysqlSelect` bags, or a full PostGraphile runtime. Authors could not read or hand-edit the SQL binding the way they edit Connectors.

## What changed

### Packages

- **`@omnigraph/sql`** (`loadSqlSubgraph`) -- introspect DB, emit GraphQL SDL with `@sql__query` / `@sql__mutation` / `@sql__relation`, slim `@transport(kind: "sql")`, Federation `@key` + `entity: true` ById fields. PostGraphile-inspired naming: PascalCase types, camelCase fields, `allX` connections, typed filters, CRUD mutations.
- **`@graphql-mesh/transport-sql`** -- parse mapping strings, generate dialect SQL, run queries. **Sqlite** is end-to-end in this release (`node:sqlite`). Postgres/MySQL drivers are stubbed for the next PR.
- **`@graphql-mesh/fusion-composition`** -- rename / naming-convention transforms rewrite `$args.*` and `$this.*` inside `@sql__*` the same way as `@connect`.

### Author surface

```graphql
schema @transport(
  subgraph: "chinook"
  kind: "sql"
  location: "file:./chinook.db"
  options: { dialect: "sqlite" }
) { query: Query mutation: Mutation }

type Query {
  album(id: ID!): Album @sql__query(
    table: "albums"
    kind: ROW
    args: """
    AlbumId: $args.id
    """
    selection: """
    id: AlbumId
    title: Title
    artistId: ArtistId
    """
    entity: true
  )
}
```

### Loader config

```ts
// before (sqlite / tuql)
loadSQLiteSubgraph('chinook', { db: 'chinook.db' })

// after
loadSqlSubgraph('chinook', { type: 'sqlite', db: 'chinook.db' })
```

## Non-goals (this release)

- No runtime PostGraphile dependency
- No deletion of old mysql/sqlite/postgraphile packages
- Postgres/MySQL execute + introspect land next (API surface is already shared)
