---
'@omnigraph/sql': major
'@graphql-mesh/transport-sql': major
'@graphql-mesh/fusion-composition': minor
---

## TL;DR (breaking)

New SQL subgraph stack: `@omnigraph/sql` + `@graphql-mesh/transport-sql` with hand-writable
`@sql__query` / `@sql__mutation` / `@sql__relation` and one transport `kind: "sql"`.

**Removed** (no dual-read / no deprecation period):

- `@omnigraph/mysql`, `@omnigraph/sqlite`
- `@graphql-mesh/transport-mysql`, `@graphql-mesh/transport-sqlite`
- Legacy handlers `@graphql-mesh/mysql`, `@graphql-mesh/tuql`, `@graphql-mesh/postgraphile`

Dialects are `postgres` | `mysql` | `sqlite` via loader `type` / URI / `options.dialect` -- not
separate `@mysql*` directive families. Sqlite + MySQL are end-to-end; Postgres API is shared
(introspect/execute still landing).

## Why

Mesh already moved Thrift / Protobuf / REST toward explicit mapping directives. SQL was still either
tuql (opaque resolvers), `@mysqlSelect` bags, or a full PostGraphile runtime. Authors could not
read or hand-edit the SQL binding the way they edit Connectors. Keeping the old packages beside the
new stack would freeze a second composition path; this major deletes them.

## Migration

```ts
// before
loadSQLiteSubgraph('chinook', { db: 'chinook.db' })
loadMySQLSubgraph('employees', { endpoint: 'mysql://…' })

// after
loadSqlSubgraph('chinook', { type: 'sqlite', db: 'chinook.db' })
loadSqlSubgraph('employees', { type: 'mysql', endpoint: 'mysql://…' })
```

Emitted GraphQL naming is PostGraphile-inspired (PascalCase types, camelCase fields, `id` for sole
PKs, typed filters, `allX` connections, CRUD mutations). Old raw-table / String-where surfaces are
gone -- recompose and update client queries.

`mesh-migrate-config` and public website docs are intentionally unchanged here; those land in
follow-up PRs once the surface is ready to announce.

## What else changed

- Fusion rename / naming-convention transforms rewrite `$args.*` and `$this.*` inside `@sql__*`
- e2e `sqlite-chinook` and `mysql-employees` use the new stack (snapshots updated)
