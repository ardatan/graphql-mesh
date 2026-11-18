---
'@omnigraph/sql': major
'@graphql-mesh/transport-sql': major
'@graphql-mesh/fusion-composition': minor
'@graphql-mesh/mysql': major
'@graphql-mesh/tuql': major
'@graphql-mesh/postgraphile': major
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

**Legacy v0 handlers** (same YAML entrypoints, now call `@omnigraph/sql` + `transport-sql`):

- `@graphql-mesh/mysql` — `pool` / `tableFields` supported
- `@graphql-mesh/tuql` — `infile` is materialized to a sqlite file inside the legacy handler
  (not a core loader/transport feature)
- `@graphql-mesh/postgraphile` — schema emit and execution use `@sql` / `transport-sql` only
  (no longer loads the previous embedded runtime). See migration notes below.

Adapters are `postgres` | `mysql` | `sqlite` via loader `adapter` / URI / `options.adapter`. All
three are end-to-end on the new stack.

## Migration (`@graphql-mesh/postgraphile`)

Breaking for v0.minor: the handler no longer depends on the `postgraphile` /
`postgraphile-core` packages.

| Still supported | Removed / ignored |
| --- | --- |
| `connectionString` (env interpolation; optional when `pool` is a real `pg.Pool`) | `appendPlugins` / `skipPlugins` |
| `schemaName` (first entry only; default `public`) | `options` (opaque library options bag) |
| `pool` as an existing `pg.Pool` (or module export) — used for introspect + execute | `pool` as plain settings object |
| `tables` / `tableFields` (new, mysql-parity) | `subscriptions` / `live` |
| | `contextOptions` (pgSettings helpers) |

When the old `pool` settings object carried TLS/CA (or other options the URI cannot
express), export a module that constructs a configured `pg.Pool` and point
`pool` at that export. This YAML handler does not read compose `@transport`
options — those apply when migrating to `loadSqlSubgraph`.

Emitted GraphQL is the shared Mesh SQL CRUD / connection / `where` surface
(`allX` connections, filters, mutations) — not the previous handler’s plugin-shaped
schema. Recompose and update clients. Prefer compose `loadSqlSubgraph` for new work;
keep this handler only as a v0 YAML bridge.

## Migration (compose)

```ts
// before
loadSQLiteSubgraph('chinook', { db: 'chinook.db' })
loadMySQLSubgraph('employees', { endpoint: 'mysql://…' })

// after — adapter from URI protocol (or env URL); `adapter` optional override
loadSqlSubgraph('chinook', { endpoint: 'file:chinook.db' })
loadSqlSubgraph('employees', { endpoint: 'mysql://…' })
loadSqlSubgraph('shop', { endpoint: 'postgres://…' })
loadSqlSubgraph('shop', { endpoint: 'localhost:5432/shop' }) // host-style → postgres
loadSqlSubgraph('shop', { adapter: 'postgres' }) // or from DATABASE_URL / PG*
```

Emitted GraphQL uses the shared Mesh SQL naming. Old raw-table / String-where surfaces are
gone — recompose and update client queries.

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

Object spread (`...$args.where`) is only needed when merging fixed predicates with the client
`where` input. When the binder stands alone, use bare `$args.where`.

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
- Type-level `@sql` on OBJECT (`$this` keys) wires `resolveReference` + Hive `Query._entities`
  — no Query `entity: true`
- Transport DataLoader-batches ROW/ROWS equality lookups (`WHERE col IN (...)`)
- Selection lookahead planner for mysql/sqlite: multi-hop belongs-to `LEFT JOIN`,
  has-many JSON subselects, column pruning, DataLoader fallback
- Postgres plan path when a Node `pg.Pool` is available (registry from `@sql`, relation
  plans via `singleRelation` / `manyRelation`)
- e2e `sqlite-chinook`, `mysql-employees`, and `postgres-geodb` (world.sql seed) use the new stack
  (full table set; no artificial `includeTables` filter)
- Optional `softDelete: { column, tables? }` on loader / `@transport(options)`: reads add
  `column IS NULL`; `DELETE` becomes `UPDATE … SET column = now` (plan path skipped when set)
- Richer `where` filters: `like` / `ilike`, `BooleanFilter`, nested belongs-to
  (`where: { artist: { name: { eq: "X" } } }` → `EXISTS`)
- Postgres computed columns: `CREATE FUNCTION users_full_name(users)…STABLE`
  → GraphQL `fullName` via `@sql(selection: "fullName: $fn.public.users_full_name")`
- Many-to-many shortcuts: junction with two FKs → `Playlist.tracks` / `Track.playlists` via
  `@sql(through:)` (junction type kept)
- `CONNECTION` pagination uses **keyset** cursors (`after` = opaque order-column values), not
  SQL `OFFSET`
- Filters / `orderBy` use a full column catalog so selection pruning cannot drop predicates
- Sole-PK → `id` alias skips when another column already camelCases to `id`
- MySQL has-many JSON subselects cap children before `JSON_ARRAYAGG` (correlated rank)

## Reliability / review follow-ups (this tip)

- Shared `pg.Pool`: one schema binding per pool (conflicting schema rejected); `SET search_path`
  fail-closed without double-release under `pool.query` (callback wait path covered)
- Binary columns map to `GraphQLByte` by **base type** (not `enum('BINARY',…)` labels); joined /
  has-many rows encode Buffer; SQLite skips JSON has-many folds that project `Byte`
- Batching: reject `$this` pagination binders; omit only the equality `$args` leaf (keep sibling
  filters such as `input.filter` in the loader identity)
- Postgres: sequence defaults via real `nextval(` (not inside quoted literals); computed functions
  match argument relation **schema + name**
- Legacy mysql `ssl.ca` path → PEM; tuql: blank-path reject, explicit `adapter: 'sqlite'`,
  dump-bytes cache key under a trusted cache dir, create-if-absent publish (no live-DB overwrite)
- Mutations: reject structured `where` that is `null` / non-object / empty, or that produces no
  SQL predicate; soft-delete marker alone is not enough to authorize DELETE/UPDATE
- Empty `IN ()` → FALSE; empty `nin` is a no-op (not a TRUE tautology)
- Planner vs column bindings: leaf of `$args.limit` matching a planner key stays planner;
  `limit: $args.id`-style entries bind as columns
- LEFT JOIN presence via always-projected join column; cursor encode prefers SQL column keys
- softDelete: omitted `tables` = all tables; defined `tables` (including `[]`) = allowlist only
- SQLite introspect: ASCII-fold FK match; INTEGER PK autoIncrement only when not WITHOUT ROWID /
  DESC PK
- `@sql` / `SqlKind` GraphQL `description` props stripped (lean SDL); TypeScript comments / TSDoc kept
- Nested relation filters keep finite self-referential paths (depth-bounded metadata)
- Rename/naming: `$this` / through binders + single-pass selection key rewrite; **nested input
  binder walks, type-scoped flat / through rename maps, and bare inline selection rename walks
  remain deferred** (no further rename scope)
