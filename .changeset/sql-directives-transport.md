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
`@sql` and one transport `kind: "sql"`.

One field directive `@sql` covers reads and writes via `kind`
(`ROW` | `ROWS` | `CONNECTION` | `COUNT` | `INSERT` | `UPDATE` | `DELETE`). Relations stay on
Relations use the same `@sql` with `$this` in `args`.

**Removed from the monorepo** (compose loaders / transports):

- `@omnigraph/mysql`, `@omnigraph/sqlite`
- `@graphql-mesh/transport-mysql`, `@graphql-mesh/transport-sqlite`

**Legacy v0 handlers:**

- `@graphql-mesh/postgraphile` — unchanged PostGraphile runtime
- `@graphql-mesh/mysql` / `@graphql-mesh/tuql` — same YAML entrypoints, now call `@omnigraph/sql` +
  `transport-sql` under the hood (`pool` / `tableFields` supported; tuql `infile` is materialized
  to a sqlite file inside the legacy handler — not a core loader/transport feature)

Dialects are `postgres` | `mysql` | `sqlite` via loader `type` / URI / `options.dialect`. All
three are end-to-end on the new stack. Legacy PostGraphile handler remains for the full
PostGraphile runtime.

## Migration (compose)

```ts
// before
loadSQLiteSubgraph('chinook', { db: 'chinook.db' })
loadMySQLSubgraph('employees', { endpoint: 'mysql://…' })

// after — dialect from URI protocol (Bun-compatible); `type` optional override
loadSqlSubgraph('chinook', { endpoint: 'file:chinook.db' })
loadSqlSubgraph('employees', { endpoint: 'mysql://…' })
loadSqlSubgraph('shop', { endpoint: 'postgres://…' })
loadSqlSubgraph('shop', { endpoint: 'localhost:5432/shop' }) // host-style → postgres
```

Emitted GraphQL naming is PostGraphile-inspired. Old raw-table / String-where surfaces are gone —
recompose and update client queries.

`mesh-migrate-config` and public website docs are intentionally unchanged here.

## What else changed

- Fusion rename / naming-convention transforms rewrite `$args.*` and `$this.*` inside `@sql`
- Type-level `@sql` on OBJECT (Connectors-style `$this` keys) wires `resolveReference` + Hive
  `Query._entities` — no Query `entity: true`
- Transport DataLoader-batches ROW/ROWS equality lookups (`WHERE col IN (...)`)
- e2e `sqlite-chinook` and `mysql-employees` use the new stack (full table set; no artificial
  `includeTables` filter)
