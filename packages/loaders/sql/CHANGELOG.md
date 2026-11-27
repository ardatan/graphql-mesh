# @omnigraph/sql

## 1.0.0

### Minor Changes

- [#9847](https://github.com/ardatan/graphql-mesh/pull/9847)
  [`f9b41bc`](https://github.com/ardatan/graphql-mesh/commit/f9b41bc23325f130e39244b1748ba4e7eecd2b4f)
  Thanks [@ardatan](https://github.com/ardatan)! - Loader-generated subgraphs are federation-ready
  at load time, and hand-written SDL gets a first-class Compose entry point.

  ### Why

  Mesh Compose previously had to invent Mesh-spec `@link` imports and `@composeDirective` for every
  loader subgraph. That made loader/hand SDL incomplete for schema registries until after a Compose
  pass, and forced hand-written flows to copy-paste `buildASTSchema(parse(readFileSync(...)))`.

  ### What changed
  - **`importMeshDirectives`** lives in **`@graphql-mesh/utils`** so protocol loaders do not depend
    on `@graphql-mesh/fusion-composition`. Fusion composition re-exports it for Compose.
  - Loaders stamp Mesh `@link` + `@composeDirective` via `importMeshDirectives([...])` (explicit
    list). **Connectors loaders keep full `directive @connect` / `@source` defs** so printed
    subgraph SDL is GraphQL.js-valid, but **do not stamp `@composeDirective(name: "@connect")`**.
    Mesh Compose stamps composeDirective (+ any missing connect defs) **only on Guild input**
    (`prepareConnectorsBeforeGuild`), then `finalizeConnectorsSupergraph` emits `@join__directive`
    and drops composeDirective / native connect defs from the final supergraph.
  - Mesh-spec `@link` URLs start at **`https://specs.graphql-mesh.dev/<name>/v0.1`**. Shared Mesh
    **core** directives (`@transport`, `@merge`, `@hoist`, `@source`/`@meshSource`, `@resolveTo`,
    `@pubsubOperation`, `@pubsubPublish`, `@extraSchemaDefinitionDirective`, …) use **`core/v0.1`**.
    Protocol loaders use a separate protocol URL (e.g. `sql/v0.1` for `@sql` only) plus `core/v0.1`
    for `@transport`. Older Mesh `@link` prefixes remain accepted when reading existing supergraphs;
    Compose only stamps `specs.graphql-mesh.dev`.
  - **Spec contract:** `parseMeshSpecUrl` / `assertSupportedMeshSpec` (/`OnSchema`) - transports
    validate supported protocol/`core` versions when a matching `@link` is present; Compose asserts
    after stamping. Hive Gateway can reuse the same helpers later.
  - Hand-written SDL: prefer **`subgraphs: [{ name?, schema }]`** where `schema` is
    `MaybePromise<GraphQLSchema | DocumentNode | string>` (inline SDL, path, or URL). **`name` is
    optional** when the schema has `@transport(subgraph: ...)` (conflict if both differ; error if
    neither). Or use **`loadSubgraphFromSDL(name?, schema, options?)`**. Mesh `@link` /
    `@composeDirective` belong in that SDL (or come from a loader).
  - **GM-41:** after Guild composition, **`finalizeMeshJoinDirectives`** rewrites schema
    `@transport` to **`@join__directive(graphs:, name: "transport", args:)`** for protocol kinds
    (sql/thrift/protobuf/neo4j/…), dropping `subgraph` when it matches `@join__graph`. Pure `http`
    with matching location is dropped. **Connect:** bare connect omits transport (Gateway infers
    `kind: "connect"` from join connect/source). Remaining connect options/headers stay a **native**
    `@transport(kind: "connect", subgraph, location?, options/headers)` - Apollo Router Connectors
    reject Mesh `@transport` reconstituted from `@join__directive`. Join-carried protocol transport
    keeps `directive @transport` (+ `TransportOptions`) for Apollo reconstitution of non-connect
    kinds. Unused orphan transport artifacts are pruned when nothing remains.
  - **SDL print (loaders/compose):** subgraph `@connect` / selection use GraphQL `"""` only when the
    value has newlines; omit empty thrift `args`; omit default `Accept` /
    `Content-Type: application/json` from connect header mappings (runtime still defaults Accept
    when unset). Supergraph join args stay dense (escaped `\n`, no prefer-`"""`).
  - **GM-37 first slice:** **`validateMeshDirectives`** - Mesh `@link` version contract +
    `@transport` arg shapes at Compose ingest / hand SDL; soft on transports.
  - **`convertSubgraphToFederationv2`:** skip type-level `@shareable` on `@key` entities; import
    only used Fed directives (+ `@shareable`).
  - Hive Gateway **`@graphql-mesh/fusion-runtime` yarn patch:** read
    `join__directive(name: "transport")`, infer `kind: "connect"` from join connect/source
    (including selection-only / virtual connectors with empty `join__graph(url:)` and no SCHEMA
    `@source`), accept `@source` from core URL, reject unsupported Mesh `@link` versions.

  Object-level `@shareable` / full Fed v2 conversion remains Compose-time
  (`convertSubgraphToFederationv2`) - loaders do not blanket-stamp `@shareable`.

  ### Migration

  Printed loader SDL includes Mesh `@link` / `@composeDirective` for Mesh directives, plus full
  Connectors `@connect` / `@source` defs - **not** `@composeDirective(name: "@connect")`. Supergraph
  SDL carries protocol transports as `@join__directive(name: "transport")` (native `@transport` may
  remain for connect options). Update snapshots. Hive Gateway must read join transport
  (fusion-runtime yarn patch until upstreamed).

  Hand-written Compose configs can replace custom file loaders:

  ```ts
  // Before
  sourceHandler: () => ({
    name: 'movies',
    schema$: buildASTSchema(parse(readFileSync('./movies.graphql', 'utf8')), {
      assumeValidSDL: true,
      assumeValid: true
    })
  })

  // After
  subgraphs: [
    {
      name: 'movies',
      schema: './movies.graphql' // or inline SDL / DocumentNode / GraphQLSchema / Promise
    }
  ]
  ```

  For registry publish, prefer `mesh-compose --subgraph <name>` (still adds `@shareable` / full Fed
  v2 object conversion) then Hive / GraphOS publish. Loader and hand-written SDL already carry Mesh
  `@link` / `@composeDirective` so Compose does not invent them.

  OpenAPI / RAML emit goes through `@omnigraph/json-schema`, so those subgraphs pick up the same
  federation-ready behavior without separate package bumps in this changeset.

  ### Follow-up (not in this PR)

  **GM-41 remainder:** Mesh field/type dirs (`@hoist`, `@merge`, `@source`, …) → `@join__directive`.
  Upstream Hive Gateway `fusion-runtime` should absorb the yarn patch (join transport read, connect
  infer, `@source` from core URL, Mesh `@link` version assert).

- [#9745](https://github.com/ardatan/graphql-mesh/pull/9745)
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d)
  Thanks [@ardatan](https://github.com/ardatan)! - ## Motivation

  Mesh still had its own logging, pubsub, and teardown model next to Yoga 6 / Hive Gateway:

  - Mesh `DefaultLogger` and Mesh PubSub / `HivePubSub` re-exports beside `@graphql-hive/logger` and
    `@graphql-hive/pubsub`
  - Shutdown via `pubsub.publish('destroy')`, with handlers and caches subscribing to that topic
    (easy to miss, leaks pools/clients/timers)
  - Node 18/20 engines and loose `graphql` peers that drift from Yoga 6 / GraphQL Tools

  This major aligns Mesh with that shared platform in one release.

  ## Design decisions
  1. **Node `>=22.18.0`**: matches current Yoga / Hive / WHATWG engines.
  2. **GraphQL peer `^16 || ^17`**: what Yoga 6 and `@graphql-tools/utils` / `schema` / `merge` /
     `executor` support (not `*`).
  3. **Request path prefers context**: use Yoga/Gateway `context.log` / `context.pubsub` when
     present. Constructor `log` / `pubsub` stay only where init-time wiring is required (for example
     live-query subscribe, New Relic agent missing).
  4. **Teardown via Explicit Resource Management**: Mesh tore down with `destroy` pubsub. Now
     components implement `[DisposableSymbols]` and `getMesh` registers them with
     `disposables.use(...)`. Handler/transform/plugin/cache constructors never took a `disposables`
     option; that is unchanged.
  5. **No Mesh re-exports** for Logger, PubSub, or promise helpers; import Hive/WHATWG packages
     directly.

  ## Shared platform changes ()
  - **Node.js `>=22.18.0`** (18/20 dropped).
  - **`graphql` peer `^16.0.0 || ^17.0.0`**.
  - **Logging**: Mesh `Logger` / `DefaultLogger` removed. Use `@graphql-hive/logger`. Prefer
    `context.log` on the request path. Option fields renamed from `logger` to `log` where they
    remain.
  - **PubSub**: Mesh PubSub re-exports removed. Use `@graphql-hive/pubsub`. The **`destroy` pubsub
    lifecycle event is removed**; tear down with the disposable stack / `mesh.destroy()` instead of
    `pubsub.publish('destroy')`.
  - **Lifecycle**: `getMesh` owns an `AsyncDisposableStack` and calls `disposables.use(...)` on
    disposable cache/handler/transform/plugin/pubsub instances. the change is destroy-pubsub
    subscribers replaced by `[DisposableSymbols]`, not "stop injecting disposables into options"
    (those options did not exist ).
  - **Promises**: `handleMaybePromise` / `fakePromise` / `fakeRejectPromise` /
    `Promise.withResolvers` from `@whatwg-node/promise-helpers` (no Mesh re-exports).

  ## Migration checklist

  ```bash
  node -v # >= 22.18.0
  yarn add graphql@^16 @graphql-hive/logger @graphql-hive/pubsub
  yarn add @whatwg-node/promise-helpers @whatwg-node/disposablestack
  ```

  ```ts
  import { Logger } from '@graphql-hive/logger'
  import { MemPubSub } from '@graphql-hive/pubsub'
  import { AsyncDisposableStack } from '@whatwg-node/disposablestack'
  import { fakePromise, handleMaybePromise } from '@whatwg-node/promise-helpers'

  // Before on before:
  // import { DefaultLogger, PubSub, handleMaybePromise } from '@graphql-mesh/utils'
  // await pubsub.publish('destroy', undefined)

  const log = new Logger()
  const pubsub = new MemPubSub()
  await using disposables = new AsyncDisposableStack()
  disposables.use(cache)
  disposables.use(handler)
  ```

  ### Import map (common breakages)

  | Before                                                | After                                                        |
  | ----------------------------------------------------- | ------------------------------------------------------------ |
  | `DefaultLogger` / Mesh `Logger`                       | `Logger` from `@graphql-hive/logger`                         |
  | Mesh `PubSub` / `MemPubSub` / `HivePubSub`            | `@graphql-hive/pubsub`                                       |
  | `handleMaybePromise` / `MaybePromise` from Mesh utils | `@whatwg-node/promise-helpers`                               |
  | `pubsub.publish('destroy')` + destroy subscribers     | `[DisposableSymbols]` + `disposables.use` / `mesh.destroy()` |
  | cache ctor `pubsub` (destroy subscribe)               | removed; dispose the cache instead                           |
  | option field `logger`                                 | `log`                                                        |

  Package-specific breaks (filter globs, cache `pubsub`, http-cache logging, Hive/live-query
  options, OpenAPI `futureLinks`, disposable handlers/transports, ...) are in each package's
  `*-node22-yoga6.md`.

- [#9840](https://github.com/ardatan/graphql-mesh/pull/9840)
  [`5c0e5e3`](https://github.com/ardatan/graphql-mesh/commit/5c0e5e3406618eab41a0515d7f1d12837cca2c45)
  Thanks [@ardatan](https://github.com/ardatan)! - ## TL;DR (breaking)

  New SQL subgraph stack: `@omnigraph/sql` + `@graphql-mesh/transport-sql` with hand-writable `@sql`
  and one transport `kind: "sql"`.

  One field directive `@sql` covers reads and writes via `kind` (`ROW` | `ROWS` | `CONNECTION` |
  `COUNT` | `INSERT` | `UPDATE` | `DELETE`). Relations use the same `@sql` with `$this` binders in
  `where`.

  **Removed from the monorepo** (compose loaders / transports):

  - `@omnigraph/mysql`, `@omnigraph/sqlite`
  - `@graphql-mesh/transport-mysql`, `@graphql-mesh/transport-sqlite`

  **Legacy v0 handlers** (same YAML entrypoints, now call `@omnigraph/sql` + `transport-sql`):

  - `@graphql-mesh/mysql` -- `pool` / `tableFields` supported
  - `@graphql-mesh/tuql` -- `infile` is materialized to a sqlite file inside the legacy handler (not
    a core loader/transport feature). The cache key is dump path + dump bytes: if the dump is
    unchanged, a later restart reuses the cached DB including any executor writes (the dump is no
    longer the sole source of truth once the cache has been mutated).
  - `@graphql-mesh/postgraphile` -- schema emit and execution use `@sql` / `transport-sql` only (no
    longer loads the previous embedded runtime). See migration notes below.

  Adapters are `postgres` | `mysql` | `sqlite` via loader `adapter` / URI / `options.adapter`. All
  three are end-to-end on the new stack.

  ## Migration (`@graphql-mesh/postgraphile`)

  Breaking for v0.minor: the handler no longer depends on the `postgraphile` / `postgraphile-core`
  packages.

  | Still supported                                                                     | Removed / ignored                      |
  | ----------------------------------------------------------------------------------- | -------------------------------------- |
  | `connectionString` (env interpolation; optional when `pool` is a real `pg.Pool`)    | `appendPlugins` / `skipPlugins`        |
  | `schemaName` (first entry only; default `public`)                                   | `options` (opaque library options bag) |
  | `pool` as an existing `pg.Pool` (or module export) -- used for introspect + execute | `pool` as plain settings object        |
  | `tables` / `tableFields` (new, mysql-parity)                                        | `subscriptions` / `live`               |
  |                                                                                     | `contextOptions` (pgSettings helpers)  |

  When the old `pool` settings object carried TLS/CA (or other options the URI cannot express),
  export a module that constructs a configured `pg.Pool` and point `pool` at that export. This YAML
  handler does not read compose `@transport` options -- those apply when migrating to
  `loadSqlSubgraph`.

  Emitted GraphQL is the shared Mesh SQL CRUD / connection / `where` surface (`allX` connections,
  filters, mutations) -- not the previous handler's plugin-shaped schema. Recompose and update
  clients. Prefer compose `loadSqlSubgraph` for new work; keep this handler only as a v0 YAML
  bridge.

  ## Migration (compose)

  ```ts
  // before
  loadSQLiteSubgraph('chinook', { db: 'chinook.db' })
  loadMySQLSubgraph('employees', { endpoint: 'mysql://…' })

  // after -- adapter from URI protocol (or env URL); `adapter` optional override
  loadSqlSubgraph('chinook', { endpoint: 'file:chinook.db' })
  loadSqlSubgraph('employees', { endpoint: 'mysql://…' })
  loadSqlSubgraph('shop', { endpoint: 'postgres://…' })
  loadSqlSubgraph('shop', { endpoint: 'localhost:5432/shop' }) // host-style -> postgres
  loadSqlSubgraph('shop', { adapter: 'postgres' }) // or from DATABASE_URL / PG*
  ```

  Emitted GraphQL uses the shared Mesh SQL naming. Old raw-table / String-where surfaces are gone --
  recompose and update client queries.

  `mesh-migrate-config` and public website docs are intentionally unchanged here.

  ## Migration (client args / `@sql`)

  Coming from the previous SQL packs, the client list/count filter arg renames `filter: AlbumFilter`
  -> `where: AlbumFilter` (input type name still `*Filter`).

  New hand-writable `@sql` binders: `where` (equality/joins and structured client filter), separate
  `orderBy` / `limit` / `offset` / `first` / `after`, `set` for INSERT/UPDATE, `selection`, and
  `through` for M2M. Object spread (`...$args.where`) is only needed when merging fixed predicates
  with the client `where` input; alone, use bare `$args.where`.

  ```graphql
  # sole client where
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

  ## What else changed
  - Mesh rename / naming-convention transforms rewrite `$args.*` and `$this.*` inside `@sql`
  - Type-level `@sql` on OBJECT (`$this` keys) wires `resolveReference` + Hive `Query._entities` --
    no Query `entity: true`
  - Transport DataLoader-batches ROW/ROWS equality lookups (`WHERE col IN (...)`)
  - Selection lookahead planner for mysql/sqlite: multi-hop belongs-to `LEFT JOIN`, has-many JSON
    subselects, column pruning, DataLoader fallback
  - Postgres plan path when a Node `pg.Pool` is available (registry from `@sql`, relation plans via
    `singleRelation` / `manyRelation`)
  - e2e `sqlite-chinook`, `mysql-employees`, and `postgres-geodb` (pinned `world.sql` seed) use the
    new stack (full table set; no artificial `includeTables` filter)
  - Optional `softDelete: { column, tables? }` on loader / `@transport(options)`: reads add
    `column IS NULL`; `DELETE` becomes `UPDATE … SET column = now` (plan path skipped when set).
    Omitted `tables` = all; defined `tables` (including `[]`) = allowlist only
  - Richer `where` filters: `like` / `ilike`, `BooleanFilter`, `BigIntFilter`, nested belongs-to
    (`where: { artist: { name: { eq: "X" } } }` -> `EXISTS`)
  - Postgres computed columns: `CREATE FUNCTION users_full_name(users)…STABLE` -> GraphQL `fullName`
    via `@sql(selection: "fullName: $fn.public.users_full_name")`
  - Many-to-many shortcuts: junction with two FKs -> `Playlist.tracks` / `Track.playlists` via
    `@sql(through:)` (junction type kept)
  - `CONNECTION` pagination uses **keyset** cursors (`after` = opaque order-column values), not SQL
    `OFFSET`
  - Filters / `orderBy` use a full column catalog so selection pruning cannot drop predicates
  - Sole-PK -> `id` alias skips when that name collides with another column's field name; sole-PK
    output nullability follows the database column; `@key` only when a PK exists
  - Generated columns omitted from create/update inputs and SET mappings
  - MySQL has-many JSON subselects cap children before `JSON_ARRAYAGG` (correlated rank)

  ## Reliability / review follow-ups (this PR)
  - Shared `pg.Pool`: one schema binding per pool (conflicting schema rejected); `SET search_path`
    fail-closed without double-release under `pool.query` (callback wait path covered)
  - Binary columns map to `GraphQLByte` by **base type** (not `enum('BINARY',…)` labels); wider
    MySQL `BIT(n)` maps to `Byte`; `BIT(1)` Buffer values coerce to boolean before GraphQL
    serialize; `int(n) unsigned` keeps UNSIGNED → BigInt; joined / has-many rows encode Buffer;
    SQLite skips JSON has-many folds that project `Byte`
  - MySQL generated columns: only `STORED` / `VIRTUAL GENERATED` (not `DEFAULT_GENERATED`)
  - tuql dump cache: per-uid tmp fallback; reject symlink / foreign owner / group-writable dirs
  - Batching: reject `$this` pagination binders; omit only the equality `$args` leaf (keep sibling
    filters such as `input.filter` in the loader identity); planner keys vs column bindings
    (`limit: $args.id` binds as a column)
  - Postgres: sequence defaults via real `nextval(` (not inside quoted literals); computed functions
    match argument relation **schema + name**; PK/FK introspect joins scoped to the source table;
    `is_generated` columns marked generated; FK introspect via `pg_catalog` (non-owner safe); pool
    config uses discrete URI fields so `sslmode` cannot override `ssl.ca`
  - `tableFields`: always keeps PK, FK, and NOT NULL insert-required columns; second FK to the same
    ref gets a column-stem relation field name instead of being skipped
  - Legacy mysql `ssl.ca` path -> PEM; MySQL FKs limited to the loaded schema; tuql: blank-path
    reject, explicit `adapter: 'sqlite'`, dump-bytes cache key under a trusted cache dir,
    create-if-absent publish (no live-DB overwrite)
  - Mutations: reject structured `where` that is `null` / non-object / empty, or that produces no
    SQL predicate; soft-delete marker alone is not enough to authorize DELETE/UPDATE
  - Empty `IN ()` -> FALSE; empty `nin: []` -> TRUE (so NOT/OR compose); mutations reject pure
    tautologies
  - LEFT JOIN presence via always-projected join column; cursor encode prefers SQL column keys
  - SQLite introspect: ASCII-fold FK match; INTEGER PK autoIncrement only when not WITHOUT ROWID /
    DESC PK
  - Nested relation filters keep finite self-referential paths (depth-bounded metadata)
  - Rename/naming: `$this` / through binders + single-pass selection key rewrite; **nested input
    binder walks, type-scoped flat / through rename maps, and bare inline selection rename walks
    remain deferred** (no further rename scope)

### Patch Changes

- [#9868](https://github.com/ardatan/graphql-mesh/pull/9868)
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^13.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/13.2.3)
    (from `^13.2.2`, in `dependencies`)
- Updated dependencies
  [[`06a77f4`](https://github.com/ardatan/graphql-mesh/commit/06a77f419a2574fa77b63b7ac84c3b446344d332),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`7d56c73`](https://github.com/ardatan/graphql-mesh/commit/7d56c73e9dd8a49cda188586af23ac56b9be9fae),
  [`6aac64d`](https://github.com/ardatan/graphql-mesh/commit/6aac64dd64ccd396285e52e3db9e2f07b07fbf21),
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`45265d4`](https://github.com/ardatan/graphql-mesh/commit/45265d49d17461c046759f24b927422dbb58fe7a),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`06a77f4`](https://github.com/ardatan/graphql-mesh/commit/06a77f419a2574fa77b63b7ac84c3b446344d332),
  [`493d5ff`](https://github.com/ardatan/graphql-mesh/commit/493d5ffa5bceeb1fc2ec0b4c6584ba66d8181183),
  [`20c6601`](https://github.com/ardatan/graphql-mesh/commit/20c6601c4eece0bc0eb99f7416516b3d705026ab),
  [`6aac64d`](https://github.com/ardatan/graphql-mesh/commit/6aac64dd64ccd396285e52e3db9e2f07b07fbf21),
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`d7d6055`](https://github.com/ardatan/graphql-mesh/commit/d7d605581f2324c563a0b0f4e998915528dacbae),
  [`45265d4`](https://github.com/ardatan/graphql-mesh/commit/45265d49d17461c046759f24b927422dbb58fe7a),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`720a8a5`](https://github.com/ardatan/graphql-mesh/commit/720a8a576a2467d2243b1ea81319cb3e815e3c28),
  [`d466ccc`](https://github.com/ardatan/graphql-mesh/commit/d466ccc4475c0973c4c8352db27bf1c3b92eb9fc),
  [`06a77f4`](https://github.com/ardatan/graphql-mesh/commit/06a77f419a2574fa77b63b7ac84c3b446344d332),
  [`493d5ff`](https://github.com/ardatan/graphql-mesh/commit/493d5ffa5bceeb1fc2ec0b4c6584ba66d8181183),
  [`20c6601`](https://github.com/ardatan/graphql-mesh/commit/20c6601c4eece0bc0eb99f7416516b3d705026ab),
  [`6aac64d`](https://github.com/ardatan/graphql-mesh/commit/6aac64dd64ccd396285e52e3db9e2f07b07fbf21),
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`d7d6055`](https://github.com/ardatan/graphql-mesh/commit/d7d605581f2324c563a0b0f4e998915528dacbae),
  [`61da679`](https://github.com/ardatan/graphql-mesh/commit/61da679fc946374cbb6e18c9de1f4b158df9cc88),
  [`f9b41bc`](https://github.com/ardatan/graphql-mesh/commit/f9b41bc23325f130e39244b1748ba4e7eecd2b4f),
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca),
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`dc79228`](https://github.com/ardatan/graphql-mesh/commit/dc792289aca741ff81449c996ea38d50a5cb22cf),
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca),
  [`1b57413`](https://github.com/ardatan/graphql-mesh/commit/1b574137cd68ab82e33a2ad51a7501c67c8cd8fd),
  [`5c0e5e3`](https://github.com/ardatan/graphql-mesh/commit/5c0e5e3406618eab41a0515d7f1d12837cca2c45)]:
  - @graphql-mesh/cross-helpers@0.4.19
  - @graphql-mesh/transport-sql@1.0.0
  - @graphql-mesh/types@1.0.0
  - @graphql-mesh/utils@1.0.0

## 0.1.0

### Major Changes

- Initial release: introspect postgres/mysql/sqlite (`type`) and emit hand-writable `@sql` SDL for
  `@graphql-mesh/transport-sql`. Type-level `@sql` on entities; dialects end-to-end.
