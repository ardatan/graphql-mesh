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
(`ROW` | `ROWS` | `CONNECTION` | `COUNT` | `INSERT` | `UPDATE` | `DELETE`).
Relations use the same `@sql` with `$this` binders in `where`.

**Removed from the monorepo** (compose loaders / transports):

- `@omnigraph/mysql`, `@omnigraph/sqlite`
- `@graphql-mesh/transport-mysql`, `@graphql-mesh/transport-sqlite`

**Legacy v0 handlers:**

- `@graphql-mesh/postgraphile` — unchanged PostGraphile runtime
- `@graphql-mesh/mysql` / `@graphql-mesh/tuql` — same YAML entrypoints, now call `@omnigraph/sql` +
  `transport-sql` under the hood (`pool` / `tableFields` supported; tuql `infile` is materialized
  to a sqlite file inside the legacy handler — not a core loader/transport feature)

Adapters are `postgres` | `mysql` | `sqlite` via loader `adapter` / URI / `options.adapter`. All
three are end-to-end on the new stack. Legacy PostGraphile handler remains for the full
PostGraphile runtime.

## Migration (compose)

```ts
// before
loadSQLiteSubgraph('chinook', { db: 'chinook.db' })
loadMySQLSubgraph('employees', { endpoint: 'mysql://…' })

// after — adapter from URI protocol (Bun-compatible); `adapter` optional override
loadSqlSubgraph('chinook', { endpoint: 'file:chinook.db' })
loadSqlSubgraph('employees', { endpoint: 'mysql://…' })
loadSqlSubgraph('shop', { endpoint: 'postgres://…' })
loadSqlSubgraph('shop', { endpoint: 'localhost:5432/shop' }) // host-style → postgres
loadSqlSubgraph('shop', { adapter: 'postgres' }) // or from DATABASE_URL / PG*
```

Emitted GraphQL naming is PostGraphile-inspired. Old raw-table / String-where surfaces are gone —
recompose and update client queries.

`mesh-migrate-config` and public website docs are intentionally unchanged here.

## Migration (`@sql` / client args)

Directive mapping no longer uses a catch-all `args` bag or a separate `@sql(filter:)` binder.

| Surface | Before (early drafts / old packs) | After |
| --- | --- | --- |
| Client list/count arg | `filter: AlbumFilter` | `where: AlbumFilter` (input type still `*Filter`) |
| Equality / joins | `@sql(args: """AlbumId: $args.id""")` | `@sql(where: """AlbumId: $args.id""")` |
| Structured filter alone | `@sql(filter: "$args.filter")` | `@sql(where: "$args.where")` |
| Join + client filter | stuffed into `args` / separate `filter` | `@sql(where: """ArtistId: $this.id\n...$args.where""")` |
| Pagination / sort binders | inside `args` or under `where` | separate `@sql(orderBy/limit/offset/first/after: "$args.…")` |
| Mutations | values in `args` | `@sql(set: …)` + `where` for UPDATE/DELETE |

Connectors-style object spread (`...$args.where`) is only needed when merging fixed predicates
with the client `where` input. When the binder stands alone, use bare `$args.where`.

```graphql
# sole filter
albums(where: AlbumFilter, orderBy: [AlbumOrderBy!], limit: Int, offset: Int): [Album!]!
  @sql(
    table: "albums"
    kind: ROWS
    where: "$args.where"
    orderBy: "$args.orderBy"
    limit: "$args.limit"
    offset: "$args.offset"
    selection: """
      id: AlbumId
      title: Title
    """
  )

# join + client where
albums(where: AlbumFilter, orderBy: [AlbumOrderBy!], limit: Int, offset: Int): [Album!]!
  @sql(
    table: "albums"
    kind: ROWS
    where: """
      ArtistId: $this.id
      ...$args.where
    """
    orderBy: "$args.orderBy"
    limit: "$args.limit"
    offset: "$args.offset"
    selection: """
      id: AlbumId
      title: Title
    """
  )
```

Hand-authored SDL that still has `@sql(filter: "$args.filter")` or `filter: $args.filter`
stuffed into `where` keeps working at runtime; new emit does not produce it.

## What else changed

- Mesh rename / naming-convention transforms rewrite `$args.*` and `$this.*` inside `@sql`
- Type-level `@sql` on OBJECT (Connectors-style `$this` keys) wires `resolveReference` + Hive
  `Query._entities` — no Query `entity: true`
- Transport DataLoader-batches ROW/ROWS equality lookups (`WHERE col IN (...)`)
- Selection lookahead planner for mysql/sqlite: multi-hop belongs-to `LEFT JOIN`,
  has-many JSON subselects, column pruning, DataLoader fallback
- Postgres fast path: Grafast + `@dataplan/pg` (registry from `@sql`, relation
  plans via `singleRelation` / `manyRelation`) when a Node `pg.Pool` is available
- e2e `sqlite-chinook` and `mysql-employees` use the new stack (full table set; no artificial
  `includeTables` filter)
- Optional `softDelete: { column, tables? }` on loader / `@transport(options)`: reads add
  `column IS NULL`; `DELETE` becomes `UPDATE … SET column = now` (Grafast path skipped when set)
- Richer `where` filters: `like` / `ilike`, `BooleanFilter`, nested belongs-to
  (`where: { artist: { name: { eq: "X" } } }` → `EXISTS`)
- Postgres computed columns (PostGraphile-style): `CREATE FUNCTION users_full_name(users)…STABLE`
  → GraphQL `fullName` via `@sql(selection: "fullName: $fn.public.users_full_name")`
