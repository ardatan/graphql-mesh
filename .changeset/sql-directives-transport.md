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
`@sql__` / `@sql__relation` and one transport `kind: "sql"`.

One field directive `@sql__` covers reads and writes via `kind`
(`ROW` | `ROWS` | `CONNECTION` | `COUNT` | `INSERT` | `UPDATE` | `DELETE`). Relations stay on
`@sql__relation`.

**Removed from the monorepo** (compose loaders / transports):

- `@omnigraph/mysql`, `@omnigraph/sqlite`
- `@graphql-mesh/transport-mysql`, `@graphql-mesh/transport-sqlite`

**Legacy v0 handlers:**

- `@graphql-mesh/postgraphile` — unchanged PostGraphile runtime
- `@graphql-mesh/mysql` / `@graphql-mesh/tuql` — same YAML entrypoints, now call `@omnigraph/sql` +
  `transport-sql` under the hood (including `pool` / `tableFields` / `infile`)

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

Emitted GraphQL naming is PostGraphile-inspired. Old raw-table / String-where surfaces are gone —
recompose and update client queries.

`mesh-migrate-config` and public website docs are intentionally unchanged here.

## What else changed

- Fusion rename / naming-convention transforms rewrite `$args.*` and `$this.*` inside `@sql__*`
- e2e `sqlite-chinook` and `mysql-employees` use the new stack (full table set; no artificial
  `includeTables` filter)
