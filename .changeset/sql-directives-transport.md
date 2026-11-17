---
'@omnigraph/sql': major
'@graphql-mesh/transport-sql': major
'@graphql-mesh/fusion-composition': minor
'@graphql-mesh/mysql': major
'@graphql-mesh/tuql': major
'@graphql-mesh/postgraphile': patch
---

## TL;DR (breaking)

New SQL subgraph stack: `@omnigraph/sql` + `@graphql-mesh/transport-sql` with hand-writable
`@sql__query` / `@sql__mutation` / `@sql__relation` and one transport `kind: "sql"`.

**Removed from the monorepo** (compose loaders / transports):

- `@omnigraph/mysql`, `@omnigraph/sqlite`
- `@graphql-mesh/transport-mysql`, `@graphql-mesh/transport-sqlite`

**Legacy v0 handlers:**

- `@graphql-mesh/postgraphile` — unchanged PostGraphile runtime
- `@graphql-mesh/mysql` / `@graphql-mesh/tuql` — same YAML entrypoints, now call `@omnigraph/sql` +
  `transport-sql` under the hood (emitted GraphQL is the new `@sql__*` surface, not
  `@mysqlSelect` / classic tuql)

Dialects are `postgres` | `mysql` | `sqlite` via loader `type` / URI / `options.dialect`. Sqlite +
MySQL are end-to-end; Postgres API is shared (introspect/execute still landing) except via the
kept PostGraphile handler.

## Migration (compose)

```ts
// before
loadSQLiteSubgraph('chinook', { db: 'chinook.db' })
loadMySQLSubgraph('employees', { endpoint: 'mysql://…' })

// after
loadSqlSubgraph('chinook', { type: 'sqlite', db: 'chinook.db' })
loadSqlSubgraph('employees', { type: 'mysql', endpoint: 'mysql://…' })
```

v0 `.meshrc` `handler.mysql` / `handler.tuql` keep working as shells; expect a new GraphQL schema
shape. `handler.mysql.pool` / `tableFields` and `handler.tuql.infile` are no longer supported.

`mesh-migrate-config` and public website docs are intentionally unchanged here.

## What else changed

- Fusion rename / naming-convention transforms rewrite `$args.*` and `$this.*` inside `@sql__*`
- e2e `sqlite-chinook` and `mysql-employees` use the new stack (snapshots updated)
