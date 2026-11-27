# @graphql-mesh/fusion-composition

## 1.0.0

### Minor Changes

- [#9807](https://github.com/ardatan/graphql-mesh/pull/9807)
  [`c472c2f`](https://github.com/ardatan/graphql-mesh/commit/c472c2f0f57655cefcafcd82ec448500895b982c)
  Thanks [@ardatan](https://github.com/ardatan)! - Breaking (0.x): REST subgraphs emit Federation
  Connectors `connect/v0.4` (`@source` / `@connect`) instead of Mesh `@transport` /
  `@httpOperation`. `transport-connect` executes `@connect` for Hive Gateway
  (path/queryParams/selection, form-urlencoded bodies, Mesh interpolators including `|base64`, Hive
  qs options). Mesh composition skips Mesh `@transport` and stitching `@source` for Connectors
  subgraphs.

- [#9877](https://github.com/ardatan/graphql-mesh/pull/9877)
  [`61da679`](https://github.com/ardatan/graphql-mesh/commit/61da679fc946374cbb6e18c9de1f4b158df9cc88)
  Thanks [@ardatan](https://github.com/ardatan)! - Prefer Federation Spec draft `@lookup` / `@is` /
  `@internal` alongside Mesh `@merge`

  Compose semantic conventions and the Federation transform stamp Federation Spec draft `@lookup`
  (and `@is(field:)` when the argument name differs from the entity field) on **Query-reachable
  single-argument entity entry fields that return one object (not a list)**. List/batch entry
  fields, multi-argument hops (multi-field keys, `@requires` extras / defaults), nested `argsExpr`,
  and Mutation/Subscription `resolveReference` keep Mesh `@merge` — the draft requires that
  `@lookup` must not return a list and must be Query-reachable, and Mesh does not extend `@lookup`
  for batch. `@merge` is kept (not deprecated); runtime still accepts hand-authored `@merge` and
  synthesizes stitching hop config from `@lookup` / `@is` (including dotted `keyField` paths and
  graph-filtered argument `@is` joins). `@internal` is also stamped as Federation `@inaccessible` so
  client/API schemas hide internal members while entity recall still sees them.

  Imports use the official Federation Spec `@link`:

  ```graphql
  extend schema
    @link(
      url: "https://graphql.github.io/graphql-federation-spec/v0.0"
      import: ["@lookup", "@is", "@internal"]
    )
  ```

  GraphQL.js directive defs are vendored from that draft (Apollo federation `@link` v2.6, which Mesh
  still uses for `@key` / `@shareable`, does not expose these elements; Guild composition also
  rejects Apollo federation `@link` v3.0 today). They are registered with `@composeDirective` under
  that federation-spec URL, not under Mesh `core` / `specs.graphql-mesh.dev`. Supergraph apps are
  carried as `@join__directive` like `@merge`.

  **Migration:** new generated subgraphs use `@lookup` / `@is` for single-object entry and `@merge`
  for list/batch. Existing schemas with `@merge` need no change. Prefer `@lookup` for new
  hand-authored single-object SDL:

  ```graphql
  type Query {
    userById(id: ID!): User @lookup
    user(userId: ID! @is(field: "id")): User @lookup
    users(ids: [ID!]!): [User!]! @merge(keyField: "id", keyArg: "ids")
  }
  type User @key(fields: "id") {
    id: ID!
  }
  ```

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
  Thanks [@ardatan](https://github.com/ardatan)! - See `.changeset/node22-yoga6-shared.md` for the
  shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub
  replaced by disposables, promise helpers).

  ## Motivation

  Same ambiguous type-only filter globs as legacy filter-schema . Compose should not silently drop
  the wrong types.

  ## What changed ()
  - `createFilterTransform` rejects type-only globs like `!User`; use `Type.!User`

  ## How to migrate

  Update fusion/composition filters the same way as `@graphql-mesh/transform-filter-schema`.

  #### Example

  ```ts
  import { createFilterTransform } from '@graphql-mesh/fusion-composition'

  createFilterTransform({
    filters: [
      // before: '!User'
      'Type.!User',
      'Query.user.!pk'
    ]
  })
  ```

- [#9842](https://github.com/ardatan/graphql-mesh/pull/9842)
  [`f9e5ab0`](https://github.com/ardatan/graphql-mesh/commit/f9e5ab0ef31d21d8973b61e8f25417e763a1fca7)
  Thanks [@ardatan](https://github.com/ardatan)! - Neo4j subgraphs stay on **`@neo4j/graphql`
  directives** (`@node`, `@relationship`, `@cypher`, `@alias`, `@plural`, …) with Mesh
  **`subgraph:`** on those directives (no `@introspection`). The loader can introspect **or** take
  author `typeDefs`. Rename / naming-convention keep DB identity via `@node(labels:)` /
  `@plural(value:)` / `@alias(property:)` instead of Mesh `@source` / `@meshSource`.

  ### What changed
  - **Loader** (`@omnigraph/neo4j`): optional `typeDefs`; stamps `subgraph:` when missing; public
    option TSDoc with real `@default`s.
  - **Transport**: subgraph-scoped model extract (ownership, connection/aggregate shape, spatial
    retention, empty-iface scrub, implements conformance); strips Mesh-only args before
    `@neo4j/graphql`; closes only self-created drivers on dispose.
  - **Composition**: Neo4j skips Mesh source stamps; neo4j-identity helpers for labels / plural /
    property alias / `$argName` rewrite.
  - **Legacy handler**: `source:` goes through the same `typeDefs` path.

  ### Migration
  1. Recompose Neo4j subgraphs after upgrade.
  2. Drop Mesh `@introspection` from hand-written SDL; use `@node(subgraph:)` (loader stamps if
     omitted).
  3. After rename transforms, expect `@node(labels:)` / `@plural(value:)` / `@alias(property:)` --
     not `@source` / `@meshSource`.
  4. Runtime package remains `@graphql-mesh/transport-neo4j`.

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

- [#9818](https://github.com/ardatan/graphql-mesh/pull/9818)
  [`dc79228`](https://github.com/ardatan/graphql-mesh/commit/dc792289aca741ff81449c996ea38d50a5cb22cf)
  Thanks [@ardatan](https://github.com/ardatan)! - **Breaking (0.x):** OData subgraphs emit
  Federation Connectors (`@source` / `@connect` / `@key`) and run on
  `@graphql-mesh/transport-connect` (`kind: "connect"`). Package `@graphql-mesh/transport-odata` is
  removed, as are Mesh OData HTTP resolvers and public Mesh OData directives (`@entitySet*`,
  `@pluralNav`, `@boundFunction`, `@entityInfo`, `@abstractType`, …).

  - `@source` sets `Accept: application/json;odata.metadata=minimal`. Hive appends `$select` /
    `$expand` from the GraphQL selection; Apollo Router runs the same SDL as plain Connectors.
  - Entity-set nav: `/EntitySet/{$this.key}/Nav`; nested-only: `{$this._odataId}/Nav` (`_odataId`
    from `@odata.id`, `@inaccessible`).
  - Abstract resolveType in `transport-connect` reads `@odata.type` (plus `__typename` / structural
    fallback).
  - Loader uses private emit-time `extensions.odata` hints, then drops them after `@connect` emit.
    `$select` / `$expand` uses `@key` + `@connect` heuristics.
  - Mesh `@transport` only when `options.odata` is set (`batch` / `expandNavProps`); otherwise
    `@source` alone and compose injects a minimal `kind: connect` entry.
  - Shared connect/v0.4 defs (`JSONSelection` / `URLPathTemplate`) live in `transport-connect`;
    composition strips those scalars from the finalized supergraph.
  - MS Graph load/compose hardening + `e2e/odata-msgraph`; TripPin e2e covers entity-set nav on Hive
    and Apollo Router.

- [#9837](https://github.com/ardatan/graphql-mesh/pull/9837)
  [`bb7fdc4`](https://github.com/ardatan/graphql-mesh/commit/bb7fdc4d4a9dbd188dbb4e0b0a3d42e8b575288b)
  Thanks [@ardatan](https://github.com/ardatan)! - Breaking cutover: gRPC author/loader/transport
  surface replaced by a generic protobuf RPC stack that matches Mesh’s other typed-RPC author
  surfaces.

  ### Why

  Hand-written and AI-authored SDL should describe protobuf RPCs without opaque `roots` /
  FileDescriptorSet bags on `@transport`. One transport kind covers gRPC dial today and HTTP unary
  via `http(s)://` locations. Field wire layout lives in typed `args` / `selection` mapping strings
  (field id + protobuf type), not in embedded descriptors.

  ### Packages / entrypoints

  | Before                                 | After                                          |
  | -------------------------------------- | ---------------------------------------------- |
  | `@omnigraph/grpc` / `loadGrpcSubgraph` | `@omnigraph/protobuf` / `loadProtobufSubgraph` |
  | `@graphql-mesh/transport-grpc`         | `@graphql-mesh/transport-protobuf`             |
  | `@transport(kind: "grpc")`             | `@transport(kind: "protobuf")`                 |

  Legacy Mesh handler package `@graphql-mesh/grpc` still exists but depends on the new transport
  name.

  ### Author surface
  - Directive: `@protobuf__rpc(service, method, args, selection, stream, entity)`
  - `args` encodes GraphQL field arguments into the request message
  - `selection` decodes the response message into GraphQL fields
  - Mapping dialect uses **id + type** (e.g. `2(int64): year`); loader emits indented multiline
    strings with `#` comments (GraphQL `"""` block strings)
  - Recursive messages use cycle-aware `message&` / `message&N`; mutual request recursion emits
    relative binds so nested scopes do not reuse root `input.*` field lists
  - Package folders are `packages/loaders/protobuf` and `packages/transports/protobuf`
  - No `@grpcMethod`, `@grpcConnectivityState`, `@enum` stamps, or synthetic connectivity fields
  - No `options.roots` on `@transport`

  ### Transforms (Mesh composition, `packages/fusion/composition`)

  Rename / naming-convention rewrite `@protobuf__rpc(args|selection)` binds to the public GraphQL
  names (no Mesh `@source` / `@meshSource`). ById semantic conventions stamp `@key` + `entity: true`
  instead of Mesh `@merge`.

  - Field renames are **type-scoped** (e.g. `Review.year` does not rewrite `Movie.year`; a root
    field rename does not rewrite the same name on an unrelated input/object type)
  - `#` comment lines are ignored while rewriting binds
  - When a parent field rename and an argument rename diverge, the transform emits dual
    `$this.<parentPath>|$args.<argsPath>`. Runtime prefers a present parent key, then the explicit
    args path. Single-form `$this.path` still means parent-or-args with the same path
  - `createNamingConventionTransform({ fieldArgumentNames })` feeds arg renames into that protobuf
    pass even when no fields are renamed

  ### Loader config

  ```ts
  import { loadProtobufSubgraph } from '@omnigraph/protobuf'

  loadProtobufSubgraph('movies', {
    type: 'grpc', // reserved for future HTTP-oriented emit conventions
    endpoint: 'localhost:50051',
    source: { file: './service.proto' }
  })
  ```

  Same `.proto` / reflection parse for all `type` values. Day one emit targets gRPC dial
  (`host:port`). HTTP unary can be hand-authored now via HTTPS `location`; loader emit for
  additional dial shapes can land later without a new package.

  ### Dial
  - Non-HTTP `location` (e.g. `localhost:50051`) → gRPC channel + length-prefixed frames
  - `http(s)://…` → unary HTTP POST to `{location}/{Service}/{Method}`
  - Default HTTP `Content-Type` is `application/proto`; override via `@transport(headers:)` when a
    server expects `application/protobuf`
  - HTTP path uses Mesh fetch: `context.fetch` / transport `fetch` / `@whatwg-node/fetch` (same as
    REST), not bare global `fetch`

  E2E: `e2e/protobuf-http` runs hand `@protobuf__rpc` SDL against HTTP protobuf upstreams (flat hand
  args use `$args.*`; loader Input RPCs use `input.<field>`).

  ### Migration
  1. Replace dependency `@omnigraph/grpc` → `@omnigraph/protobuf` and `@graphql-mesh/transport-grpc`
     → `@graphql-mesh/transport-protobuf`.
  2. Replace `loadGrpcSubgraph` with `loadProtobufSubgraph` and set `type: 'grpc'`.
  3. Recompose: expect `kind: "protobuf"` and `@protobuf__rpc` instead of `kind: "grpc"` /
     `@grpcMethod` / `@enum` / connectivity fields / `options.roots`.
  4. Hand-written subgraphs: rewrite field directives to `@protobuf__rpc` with explicit `args` /
     `selection` mappings; drop connectivity Query fields.
  5. Flat hand GraphQL args should bind with `$args.<name>` (or `$this…|$args…` after divergent
     renames). Loader-emitted Input RPCs keep `input.<field>` paths; nested input field renames are
     type-scoped and do not follow argument rename maps.
  6. Gateway: register `transports.protobuf` (or rely on `@graphql-mesh/transport-protobuf`
     resolution by kind).
  7. Snapshot / e2e updates: composed SDL and any tests asserting old directive names, roots JSON,
     Mesh `@source` / `@merge` on protobuf RPC, or non-dual `$this` after divergent renames will
     break on purpose.

  Hand HTTP protobuf SDL examples: `packages/loaders/protobuf/examples/movies-connect.graphql`,
  `movies-twirp.graphql`.

- [#9827](https://github.com/ardatan/graphql-mesh/pull/9827)
  [`1b57413`](https://github.com/ardatan/graphql-mesh/commit/1b574137cd68ab82e33a2ad51a7501c67c8cd8fd)
  Thanks [@ardatan](https://github.com/ardatan)! - **Breaking (0.x) migration:**
  `@graphql-mesh/transport-rest` + `@transport(kind: "rest")` → `@graphql-mesh/transport-connect` +
  `@transport(kind: "connect")`. Cut over package name, imports, and `kind` together (no compat
  shim).

  Types rename: `RESTTransportOptions` / `RESTTransportDirectiveOptions` → `ConnectTransportOptions`
  / `ConnectTransportDirectiveOptions`.

  Hive Gateway loads transports as `@graphql-mesh/transport-${kind}`. This package runs Federation
  Connectors (`@connect` / `@source`, Apollo `connect/v0.4`) for OpenAPI/JSON Schema/RAML, OData,
  and SOAP, so `connect` matches the Apollo Connect spec name. Apollo Router ignores Mesh
  `@transport` and only runs `@connect` / `@source`.

  ### Before

  ```ts
  import rest from '@graphql-mesh/transport-rest'

  defineGatewayConfig({
    transports: { rest }
  })
  ```

  ```graphql
  schema @transport(subgraph: "API", kind: "rest", location: "https://api.example.com") {
    query: Query
  }
  ```

  ### After

  ```ts
  import connect from '@graphql-mesh/transport-connect'

  defineGatewayConfig({
    transports: { connect }
  })
  ```

  ```graphql
  schema @transport(subgraph: "API", kind: "connect", location: "https://api.example.com") {
    query: Query
  }
  ```

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

- [#9716](https://github.com/ardatan/graphql-mesh/pull/9716)
  [`45265d4`](https://github.com/ardatan/graphql-mesh/commit/45265d49d17461c046759f24b927422dbb58fe7a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^12.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.1.0)
    (from `^12.0.4`, in `dependencies`)

- [#9731](https://github.com/ardatan/graphql-mesh/pull/9731)
  [`a7d4506`](https://github.com/ardatan/graphql-mesh/commit/a7d4506630217bd9e7ab2b594609698e7e5e1649)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`graphql-scalars@^2.0.1` ↗︎](https://www.npmjs.com/package/graphql-scalars/v/2.0.1) (from
    `^1.23.0`, in `dependencies`)

- [#9738](https://github.com/ardatan/graphql-mesh/pull/9738)
  [`f11db6b`](https://github.com/ardatan/graphql-mesh/commit/f11db6b013ae9af4cf3a201d75b3cdc4a3f328be)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`minimatch@^11.0.1` ↗︎](https://www.npmjs.com/package/minimatch/v/11.0.1)
    (from `^10.2.6`, in `dependencies`)

- [#9745](https://github.com/ardatan/graphql-mesh/pull/9745)
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^11.0.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/11.0.8)
    (from `^10.1.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.1.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.1.4)
    (from `^4.1.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^13.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/13.2.1)
    (from `^12.1.0`, in `dependencies`)
  - Updated dependency
    [`graphql@^16.0.0 || ^17.0.0` ↗︎](https://www.npmjs.com/package/graphql/v/16.0.0) (from
    `^14.0.0 || ^15.0.0 || ^16.0.0 || ^17.0.0`, in `peerDependencies`)

- [#9756](https://github.com/ardatan/graphql-mesh/pull/9756)
  [`d6ee910`](https://github.com/ardatan/graphql-mesh/commit/d6ee910842f9f80867a69abe9180a081240e2173)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.27.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.27.0)
    (from `^0.22.2`, in `dependencies`)

- [#9804](https://github.com/ardatan/graphql-mesh/pull/9804)
  [`06a77f4`](https://github.com/ardatan/graphql-mesh/commit/06a77f419a2574fa77b63b7ac84c3b446344d332)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^13.2.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/13.2.2)
    (from `^13.2.1`, in `dependencies`)

- [#9820](https://github.com/ardatan/graphql-mesh/pull/9820)
  [`493d5ff`](https://github.com/ardatan/graphql-mesh/commit/493d5ffa5bceeb1fc2ec0b4c6584ba66d8181183)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^11.0.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/11.0.9)
    (from `^11.0.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.1.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.1.5)
    (from `^4.1.4`, in `dependencies`)

- [#9856](https://github.com/ardatan/graphql-mesh/pull/9856)
  [`6aac64d`](https://github.com/ardatan/graphql-mesh/commit/6aac64dd64ccd396285e52e3db9e2f07b07fbf21)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.1.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.1.7)
    (from `^4.1.5`, in `dependencies`)

- [#9861](https://github.com/ardatan/graphql-mesh/pull/9861)
  [`89668a4`](https://github.com/ardatan/graphql-mesh/commit/89668a42097950f88d6e5cc9e4f14d533a0d741b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`graphql@^16.12.0 || ^17.0.0` ↗︎](https://www.npmjs.com/package/graphql/v/16.12.0) (from
    `^16.0.0 || ^17.0.0`, in `peerDependencies`)

- [#9868](https://github.com/ardatan/graphql-mesh/pull/9868)
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^13.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/13.2.3)
    (from `^13.2.2`, in `dependencies`)

- [#9861](https://github.com/ardatan/graphql-mesh/pull/9861)
  [`89668a4`](https://github.com/ardatan/graphql-mesh/commit/89668a42097950f88d6e5cc9e4f14d533a0d741b)
  Thanks [@ardatan](https://github.com/ardatan)! - Federation transform config keys are parsed as
  Spec Schema Coordinates (`Type` or `Type.field`) via `parseSchemaCoordinate` (requires `graphql`
  `^16.12.0 || ^17.0.0`). Argument and directive coordinates are rejected with a clear error.
  Validation and `@key` resolveReference errors cite Spec coordinates (e.g. `Query.fooById`).
  Hoist-field missing-path errors use `Type.field`. Mesh filter selectors and globs are unchanged.

- [#9847](https://github.com/ardatan/graphql-mesh/pull/9847)
  [`f9b41bc`](https://github.com/ardatan/graphql-mesh/commit/f9b41bc23325f130e39244b1748ba4e7eecd2b4f)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix Connectors reprocess / multipart / entity-key
  edge cases and finalize type-level `@connect` attribution.

  - Compose entity stamp: name-only single-arg fallback only for `String` arg + JSON-Schema `string`
    key
  - `processDirectives({ preserveExistingFieldResolvers })` skips already-wired `@connect` fields
    (legacy `additionalTypeDefs` reprocess keeps rename proxies)
  - Multipart takes precedence over raw-binary when a File arg is named `input`; `recoverInput`
    keeps live uploads (no `structuredClone` on File / `createReadStream`); multipart buffers
    `createReadStream` into `File` parts
  - Empty unsupported-MIME body fallback only after a successful 0-byte drain; nonempty unsupported
    MIME (e.g. Wiki `image/png`) drains via `arrayBuffer` then maps `$` → `null` (Apollo Connectors
    parity)
  - Finalize type-level `@connect` prefers the sole keyed `@join__type` when a value-type sibling is
    present
  - Opt-in JSON Schema `scalarMap` (title → scalar) for pattern scalars; FHIR e2e force-maps
    date/DateTime/URL/UUID/String/ID (incl. `oid`→`ID`) for a cleaner SG
  - healJSONSchema: untitled enums (and array-item enums) under `$resolvedRef` get
    `{Definition}_{property}` titles so shared FHIR types (Duration, Extension, Timing_Repeat, ...)
    stay identical across subgraphs - not operation-path names; skip `type: boolean` (FHIR
    `deceasedBoolean` pattern) so Boolean cleanup still removes the pattern; prefer shared FHIR
    primitive titles (`valueCanonical` -> `canonical`, `status` -> `code`, `id` via `$resolvedRef`)
    for scalarMap/`ID`; collapse single-literal `resourceType` to plain string (no
    `Parent_resourceType` enum)
  - Compose finalize: strip Mesh codegen `@typescript`/`@example` apps from the lean SG (Router
    rejects duplicate `@typescript`); **keep `@regexp`** for Connect `processScalarType` runtime
    validation (Gateway execute match/reject covered in transport-connect; composition has no
    transport-connect dep)
  - `fusion-composition` / `@graphql-mesh/runtime` do not depend on `transport-connect` (inline
    Guild connect SDL stubs; optional dynamic import for additionalTypeDefs reprocess)
  - JSON Schema `@connect(selection:)`: when passthrough visit-budget truncates mid-type, rebuild
    with soft-depth `leavesOnly` before `$`; cycle-only omission keeps sibling nests (no rebuild)
  - Connect path templates: default Apollo `encodeURIComponent`; opt-in `|preEncoded` (OpenAPI path
    params whose docs say URI-encoded, e.g. Wiki titles) keeps valid `%XX` and avoids `%253F`
    double-encode
  - Legacy FHIR example: `.meshrc.yml` inline `scalarMap: { id: ID, oid: ID }` (JSON Schema handler
    resolves type-name strings; omnigraph takes scalar instances; module path still optional for
    custom scalars)
  - Connect XML: sniff `<?xml` on `text/plain` responses (Node `Response(string)` defaults
    Content-Type) before treating body as Apollo plain text
  - Compose entity stamp: `String` path arg + `ID` key field (FHIR `scalarMap.id → GraphQLID`) gets
    `@connect(entity: true)` / `@key` like the `string` pattern-scalar case
  - FHIR e2e: pin schema download to HL7 **R4** zip
    (`https://hl7.org/fhir/R4/fhir.schema.json.zip`); invalidate cache unless `Patient.id` →
    `#/definitions/id` **and** `Observation.status` is an inline enum; extract via system `unzip`
    (avoid `unzip-stream` SIGSEGV on Node 26)
  - FHIR e2e: full emit; `process.env.FHIR_BASE` at compose; inline `scalarMap`; hive + Router HAPI
    execution. Join-only `./reference-resource.graphql`. Legacy `.meshrc.yml` keeps Mesh
    `@resolveTo` with `sourceArgs` split via `{root.reference|path_head}` /
    `{root.reference|path_rest}`; endpoint `{env.FHIR_BASE}`
  - string-interpolation: `path_head` / `path_rest` modifiers for `Type/id` refs in Mesh
    `sourceArgs`
  - `processDirectives({ preserveExistingFieldResolvers })`: mark Mesh-generated abstract
    `resolveType` callbacks; rebuild when union/interface members change; leave application-provided
    callbacks unchanged

- [#9862](https://github.com/ardatan/graphql-mesh/pull/9862)
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca)
  Thanks [@ardatan](https://github.com/ardatan)! - CI dual GraphQL 16/17 matrix
  (`yarn match-graphql`). Printed-schema Jest snapshots are canonicalized (whitespace / optional
  commas) so one snap file works on both majors — no per-version snap forks.

- [#9841](https://github.com/ardatan/graphql-mesh/pull/9841)
  [`5c9bcea`](https://github.com/ardatan/graphql-mesh/commit/5c9bceafc25f6a039b26323f64934f22a7cb88f4)
  Thanks [@ardatan](https://github.com/ardatan)! - ## TL;DR

  New Mongo subgraph stack: `@omnigraph/mongo` + `@graphql-mesh/transport-mongo` with hand-writable
  op-specific `@mongo__*` directives and transport `kind: "mongo"`.

  Mongoose is compose/bootstrap only. Runtime uses the native MongoDB driver.

  **Legacy v0 handler:** `@graphql-mesh/mongoose` keeps the same YAML entrypoint and shells into the
  new stack (like mysql/tuql -> SQL).

  ## Decisions
  - GraphQL roots mirror MongoDB collection methods: `findOneUser` / `findUsers` /
    `countDocumentsUsers` / `insertOneUser` / `updateOneUser` / `deleteManyUsers` / `aggregateUsers`
    ([method reference](https://www.mongodb.com/docs/manual/reference/method/))
  - Op directives: `@mongo__findOne` / `@mongo__find` / `@mongo__count` / `@mongo__connection` /
    `@mongo__pagination` / `@mongo__aggregate` / `@mongo__insertOne|insertMany` /
    `@mongo__updateOne|updateMany` / `@mongo__deleteOne|deleteMany` (SDL client API != directive
    binders)
  - Client args: typed `filter: *FilterInput` (`and` / `or` / `not` + field ops). Binder stays
    `query: "$args.filter"`. `$` is illegal in GraphQL names, so generated ops use bare Mongo names
    (`gte`, `in`, …); transport also accepts `_gte` aliases and native `{ $gte }` in hand-written
    binders
  - `sort: [*Sort!]` (`id_asc` / `age_desc`; transport maps to `{ field: 1|-1 }`)
  - Directive binders: `query` / `selection` / `sort` / `set` / `pipeline`
  - `update: *UpdateInput`: same rule - bare op names (`set` / `inc` / `unset`) map to `$set` /
    `$inc` / `$unset`; `_set` aliases + native `$set` still accepted; array mods JSON
  - `document` / `documents` for insertOne / insertMany
  - BSON ObjectId (GraphQL field `id` ← `_id`, ById args, refs, `recordId`) uses `ObjectID` scalar +
    `ObjectIDQueryOperators` (not opaque GraphQL `ID`)
  - Scalars: `graphql-scalars` (`ObjectID`, `DateTime`, `Byte`, `JSON`) + local `Decimal128`
  - Mutation write failures always surface as GraphQL `errors` (`DOWNSTREAM_SERVICE_ERROR`);
    generated and handwritten mutations both throw before applying `selection` (no error-payload
    mapping)
  - Generated mutations default to document-only results (`User` / `[User!]!`) via
    `returnDocumentOnlyInMutationResult` (default `true`). Set `false` for Connectors-style
    `*Payload` (`record: $record { … }`, `recordId: $_id`, counts). `updateMany` / `deleteMany`
    always return the payload (counts)
  - Nested Mongoose paths emit Embedded / DocumentArray object types + enums; `ref` paths emit
    nested `@mongo__findOne` / `@mongo__find` populate fields
  - Mesh composition rewrites `$args` / `$this` in all `mongo__*` binders; `$this` renames are
    one-shot (no cascade), `#` comments are quote-safe, and selection rewrites skip quoted literals
  - Bulk writes reject vacuous `$or` / `not` of match-nothing filters; required fields reject null
    after BSON coerce, `$unset`, and `$rename`
  - String `_id` models require `id: String!` on create, keep BSON string inserts/cursors/payloads,
    and scope empty-input placeholders per collection
  - GraphQL `storedId` → mongoose `id` aliases are collection-aware; bulk insert applies them only
    when `@mongo__insertMany(graphqlDocumentInputs: true)` (loader sets this on generated
    DocumentInput roots). Hand-written binders omit the flag so BSON `storedId` is never inferred
    from `_id` presence
  - ObjectId coercion and required-field checks are keyed by collection+path (same bare field name
    can differ across models; nested paths via `coerceDeep` / `$elemMatch`)
  - Connection cursors still reject array-backed sort keys (correct multikey keyset needs
    `$expr`/`$min`/`$max`, not multikey `$gt`)
  - `MongoModelConfig`: exactly one of `model` | `schema` | `path`; flat `fields`
    (only/remove/required); discriminator subtypes auto-read from `schema.discriminatorMapping`
  - `queryAndMutations`: opt out of individual Query/Mutation roots (`false` omits; keys follow
    Mongo collection methods: `insertOne` / `deleteMany` / `countDocuments` / …)
  - `naming?: Partial<MongoNaming>` on `loadMongoSubgraph` / `loadGraphQLSchemaFromMongo`
  - Raw `aggregate*` omitted subgraph-wide when any model has `fields.only` / `fields.remove`, and
    omitted on discriminator subtype models (`$unionWith` can bypass a prepended `$match`)

  ## Consumer migration

  | Before (v0 mongoose)                           | After                                                                              |
  | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
  | Runtime `composeWithMongoose`                  | Same YAML handler or `loadMongoSubgraph`                                           |
  | `User_findById(_id)` / `User_findMany(filter)` | `findUserById(id)` / `findUsers(filter)`                                           |
  | `User_createOne(record)`                       | `insertOneUser(document)`                                                          |
  | Opaque resolvers                               | `@mongo__find(query/sort/selection/…)`                                             |
  | Select `error { message }` on `*Payload`       | GraphQL `errors` (`DOWNSTREAM_SERVICE_ERROR`)                                      |
  | `createOne` → `*Payload { record }`            | `insertOneUser` → `User` (payload via `returnDocumentOnlyInMutationResult: false`) |

  ```graphql
  # Before
  query {
    User_findMany(filter: { age: { gte: 30 } }) {
      name
    }
  }

  # After
  query {
    findUsers(filter: { age: { gte: 30 } }) {
      name
    }
  }
  ```

  Website docs deferred. First npm publish of the new packages is required before CI alphas.

- [#9862](https://github.com/ardatan/graphql-mesh/pull/9862)
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca)
  Thanks [@ardatan](https://github.com/ardatan)! - Preserve Apollo Connectors types/fields
  (`ConnectHTTP.GET`, etc.) under naming-convention, and rewrite enum argument defaults for GraphQL
  17's `default.literal` shape.

- [#9828](https://github.com/ardatan/graphql-mesh/pull/9828)
  [`94be224`](https://github.com/ardatan/graphql-mesh/commit/94be224fac53773992df7984057545f3404979d9)
  Thanks [@ardatan](https://github.com/ardatan)! - OData Federation entity resolution without Mesh
  `@merge`:

  - Entity-set-backed types keep resolvable `@key` + type-level `@connect(entity: true)` so Hive
    `Query._entities` and Apollo Router entity fill both work from the same Connectors SDL.
  - Nested-only (or ambiguous entity-set) types keep `@key` for Hive `$expand` heuristics but emit
    `@key(fields: "…", resolvable: false)` when there is no type-level entity `@connect`.
  - `finalizeConnectorsSupergraph` attributes type-level `@connect` by `source` name before the
    first `@join__type`, so stub/extension graphs listed first no longer steal the owner connector.
  - `transport-connect` repairs bare Federation-extracted `Query._entities` (no resolver) by
    installing `@apollo/subgraph`'s `entitiesResolver` (Connectors `resolveReference` recorded on
    `extensions.apollo.subgraph`). Without this, Hive planned `_entities` against Connectors
    subgraphs and hit `Cannot return null for non-nullable field Query._entities` whenever another
    GraphQL Federation subgraph stubbed the entity.
  - Unit + e2e (`federation-connectors`, composition, OData handler, `e2e/odata-entities`) prove
    Airline stubs resolve Name across a catalog subgraph on Hive and Apollo Router with no `@merge`.

- [#9862](https://github.com/ardatan/graphql-mesh/pull/9862)
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca)
  Thanks [@ardatan](https://github.com/ardatan)! - Preserve `schema.extensions` (Connectors
  `@source` / `@link`) when extending or stitching schemas under GraphQL 16.

- [#9881](https://github.com/ardatan/graphql-mesh/pull/9881)
  [`d18f4c3`](https://github.com/ardatan/graphql-mesh/commit/d18f4c3a7ecb1c8f588d25919b8ecb4a8ce357f6)
  Thanks [@ardatan](https://github.com/ardatan)! - Breaking (0.x): `@protobuf__rpc` now requires
  `method: String!` and `selection: String!` (aligned with the published protobuf family SDL and
  runtime binding).

  ### Why

  The specs host and loader stamped `method` / `selection` as optional, but every executable binding
  needs a non-empty method name and a selection mapping. Hand-authored SDL that omitted them only
  failed later at transport setup.

  ### What changed
  - Loader `protobufRpcDirective` and `specs/content/protobuf/v0.1` mark `method` and `selection` as
    non-null.
  - Transport rejects apps missing `method` (or with an empty method) and missing `selection`.
  - `args` stays optional so empty request messages can omit it (same empty-omit pattern as Thrift).
  - Join finalize (`prepareJoinDirectiveArgs`) still omits empty `args: ""`, but keeps empty
    `selection: ""` so an empty-response RPC is not mistaken for a missing selection after
    reconstitution.

  ### Migration

  On every `@protobuf__rpc` application, always set `method` and `selection`. Example:

  ```graphql
  type Query {
    moviesByYear(year: Int!): MoviesResult!
      @protobuf__rpc(
        service: "Example"
        method: "GetMovies"
        args: """
        1(message): $args {
          2(int64): $args.year
        }
        """
        selection: """
        1(repeated message): result {
          1(string): name
          2(int64): year
        }
        """
      )
  }
  ```

  Omit `args` only when the RPC request message is empty. Loader-generated schemas already emit both
  required args.

- [#9862](https://github.com/ardatan/graphql-mesh/pull/9862)
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca)
  Thanks [@ardatan](https://github.com/ardatan)! - GraphQL 17 compatibility:

  - Stitching merger: re-mark the unified schema `assumeValid` after `stitchSchemas` (extendSchema
    clears the flag) so third-party schemas with interface/implementation deprecation mismatches
    (e.g. GitHub) still execute.
  - Connect transport: wire `coerceOutputValue` / `coerceInputValue` for `@regexp` / `@length` /
    Date scalars; read `variableValues.coerced` for OData `$expand` options.
  - JSON Schema / OpenAPI: coerce numeric enum defaults to enum keys and drop empty-string URL/email
    defaults so GraphQL 17 printing does not throw.
  - Fusion naming-convention: rewrite enum arg `default.literal` instead of clearing it.

- [#9836](https://github.com/ardatan/graphql-mesh/pull/9836)
  [`db730d1`](https://github.com/ardatan/graphql-mesh/commit/db730d1c9d3ecef18e47c879501eac242df486c6)
  Thanks [@ardatan](https://github.com/ardatan)! - ### TL;DR

  If you load Thrift from IDL and **recompose** after upgrading, you are mostly done.

  - **Breaking:** `@fieldTypeMap` / `@thrift__method` / `topTypeMap` / `clientAnnotations` are
    removed (no dual-read). Regenerate composed SDL.
  - **Default:** binary HTTP Thrift via slim `@transport` + per-field `@thrift__rpc` (readable
    compact `args` / `selection`).
  - **Opt-in:** `protocol: 'json'` emits Federation `@source` / `@connect` (TJSON) for Hive and
    Apollo Router.
  - **Optional:** `ignoreErrorResponses`, `entityMethods`, `serviceName`.

  ### Why

  The old surface stamped opaque `@fieldTypeMap` bags and a large `@transport.options`
  (`clientAnnotations`, `topTypeMap`). Field ids and exact Thrift types (`i16` vs `i32`) were hard
  to hand-write or review; GraphQL `Int` cannot carry that distinction. Binary was Mesh-only (no
  Router-friendly TJSON emit). IDL `throws` / `oneway` were ignored, so JSON throws could become
  silent `null`.

  ### Breaking

  **Removed / no longer executed:** `@fieldTypeMap`, `@thrift__method` (older draft name),
  `@transport.options.clientAnnotations` / `topTypeMap`, and any transport path that preferred those
  bags when the new directive was absent.

  **Required:** recompose / regenerate Thrift subgraphs from IDL. Hand-written `@fieldTypeMap` /
  `@thrift__method` SDL will not run until rewritten to `@thrift__rpc` (binary) or `@connect`
  (JSON).

  ### What changed

  #### Binary - `protocol: 'binary'` (default)
  - Slim `@transport(subgraph, kind: "thrift", location, headers)` - no options bag.
  - Per-field `@thrift__rpc(function, args, selection, throws?, messageType, entity?)`.
  - Compact mapping keeps wire types explicit (`1(i32): left`, `$(i16)`, containers, nested maps);
    multiline values print as `"""`.
  - `map<*, struct>` args expand the value struct field ids (same recursion as list/set-of-struct).
    `list/set<map<*, scalar>>` keeps the full nested wire token (e.g. `list<map<string, i32>>`) so
    binary regenerate does not drop the method. Nested scalar containers (e.g. `list<list<i32>>`)
    keep the full token; nested containers that would drop struct field ids (e.g.
    `list<map<string, list<Item>>>`) fail at generate until descriptors are preserved.
  - `function` is always the IDL name. Single-service generate **omits** `service:` (path is on
    `@transport`).
  - `messageType: ONEWAY` does not wait for / decode a reply.
  - `entity: true` only via loader `entityMethods` (Federation entity Query fields).
  - Transport executes `@thrift__rpc` by field id (no `topTypeMap`). Compact parse keeps
    `map<*, struct>` as MAP (`keyType` + `valType.fields`), not STRUCT, and
    `list/set<map<*, struct>>` as LIST/SET → MAP → STRUCT so value field ids (e.g. `7: value`)
    survive.
  - Example/e2e calculator codegen runs `scripts/patch-thrift-oneway-zip.mjs` after
    `@creditkarma/thrift-typescript` so oneway `process_zip` keeps an empty body (upstream 3.7.6
    still emits REPLY/EXCEPTION).
  - Service mappings and typedef aliases resolve only after every named type is registered (forward
    refs resolve correctly).
  - GraphQL enum members always use **names**. Binary uses plain `i32` leaves with Connectors-style
    `->match` on `@thrift__rpc` args/selection (same shape as TJSON `@connect`); no Mesh `@enum` on
    thrift. Recursive struct **arguments** fail at generate (no silent empty truncation).

  #### JSON - `protocol: 'json'`

  Emits `@source` + `@connect` (TJSON) instead of thrift `@transport`:

  - `Content-Type` / `Accept`: `application/vnd.apache.thrift.json`
  - Path `/`, or `/<service>` when `serviceName` is set
  - Body message types CALL=`1`, ONEWAY=`4`
  - `isSuccess` / `errors` so declared throws and `TApplicationException` are not silent nulls;
    ONEWAY omits `isSuccess`
  - Bool scalars encode as TJSON integers `0`/`1` (`->match`). Enum args/selections bake name <->
    i32 `->match` (root scalars, root list/set, and list/set enum fields inside structs, including
    union `$({ … })` selections).
  - **Fail at generate** (prefer scalar/struct args, binary, or hand-author `@connect`; Hive Mesh
    supports `->concat`): `map<*, bool>`, **list/set args**, and maps whose values are
    struct/list/set/map (Connectors cannot rewrite map values / LitArray has no element spread).
  - Void/ONEWAY `@connect(selection:)` uses `$(null)` (bare `null` is a field path).
    `ignoreErrorResponses: false` unions emit a single `$({ … })` selection; void success is
    `ok: $->get(4)->size->eq(0)`; struct success stamps `field0: $->get(4)->get("0")->ne(null)` and
    both the loader and REST `processDirectives` resolveType treat that stamp as authoritative when
    present (Hive may keep `value: { left: undefined }` / `message: undefined` on replies). Declared
    throws also stamp `__throw_<TypeName>` from the reply field id; shared exception field
    projections gate on throw-field presence then coalesce with `$(a ?? b)` so an absent throw’s
    empty `$({…})` projection cannot hide the active exception’s struct/scalar value. Binary still
    uses `__typename`. Nested enum containers (e.g. `list<list<State>>`) fail at generate on the
    binary path (same spirit as nested struct containers) until name↔i32 `->match` can be preserved.

  #### Exceptions
  1. **`TApplicationException`:** binary throws; JSON uses `isSuccess` / `errors`.
  2. **IDL `throws`:** `ignoreErrorResponses` defaults to `true`. Set `false` for GraphQL unions +
     `@thrift__rpc(throws:)`. Union `resolveType` matches exception members on **defined** field
     values (not key presence alone).

  #### Transforms / Connectors eval
  - Mesh rename / naming-convention rewrite `$args…` inside `@thrift__rpc(args/selection/throws)`
    the same way as `@connect`. HTTP path templates still rename `$args` when the literal path
    contains apostrophes. No `@merge` / `@meshSource` for thrift.
  - Mesh Connectors eval: trailing NamedSelection after `$()` stays on the subselection path;
    `->map` / `->filter` preserve bare `@` match-arm wildcards (`[@, "other"]`).

  ### Migration
  1. Upgrade and **recompose** (prefer regenerate from IDL).
  2. Replace hand-written `@fieldTypeMap` / `@thrift__method` + transport `options` with
     `@thrift__rpc` or `protocol: 'json'`.
  3. Keep binary `@transport` to `location` + `headers` only.
  4. Single-service: no `service:` required on `@thrift__rpc`. TJSON multiplex: set `serviceName`.
  5. Optional: `ignoreErrorResponses: false`; `entityMethods: ['getX']` only for Federation entity
     resolvers.
  6. If IDL uses list/set args or composite/bool map values on the JSON path, switch those RPCs to
     binary, change the IDL, or hand-author the `@connect` body.

  **Before** (old composed field):

  ```graphql
  add(request: AddRequestInput): Int @fieldTypeMap(…)
  # wire layout lived in @transport(options: { topTypeMap, clientAnnotations })
  ```

  **After** (binary generate):

  ```graphql
  add(request: AddRequestInput): Int @thrift__rpc(
    function: "add"
    args: """
    1(struct): $args.request {
      1(i32): left
      2(i32): right
    }
    """
    selection: "$(i32)"
    messageType: CALL
  )
  ```

  ### Packages
  - `@omnigraph/thrift` - loader emit; `protocol`, `entityMethods`, `ignoreErrorResponses`,
    `serviceName`
  - `@graphql-mesh/transport-thrift` - execute compact mapping (incl. `i32->match` coerce), ONEWAY,
    throws unions
  - `@graphql-mesh/transport-connect` - Connectors helpers for TJSON / `$()` / match wildcards
  - `@graphql-mesh/fusion-composition` - `$args` rewrite for `@thrift__rpc` and HTTP paths

- Updated dependencies
  [[`45265d4`](https://github.com/ardatan/graphql-mesh/commit/45265d49d17461c046759f24b927422dbb58fe7a),
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
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`61da679`](https://github.com/ardatan/graphql-mesh/commit/61da679fc946374cbb6e18c9de1f4b158df9cc88),
  [`f9b41bc`](https://github.com/ardatan/graphql-mesh/commit/f9b41bc23325f130e39244b1748ba4e7eecd2b4f),
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`dc79228`](https://github.com/ardatan/graphql-mesh/commit/dc792289aca741ff81449c996ea38d50a5cb22cf),
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca),
  [`1b57413`](https://github.com/ardatan/graphql-mesh/commit/1b574137cd68ab82e33a2ad51a7501c67c8cd8fd)]:
  - @graphql-mesh/utils@1.0.0
  - @graphql-tools/stitching-directives@6.0.0

## 0.11.4

### Patch Changes

- [#9682](https://github.com/ardatan/graphql-mesh/pull/9682)
  [`4b92af0`](https://github.com/ardatan/graphql-mesh/commit/4b92af01c10d1d746dfb1623491282c169e03248)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^12.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.0.4)
    (from `^12.0.3`, in `dependencies`)
- Updated dependencies
  [[`4b92af0`](https://github.com/ardatan/graphql-mesh/commit/4b92af01c10d1d746dfb1623491282c169e03248)]:
  - @graphql-mesh/utils@0.107.3

## 0.11.3

### Patch Changes

- [#9678](https://github.com/ardatan/graphql-mesh/pull/9678)
  [`3bdb714`](https://github.com/ardatan/graphql-mesh/commit/3bdb7143f11aba6e2855d7c1cc479d8fe749798c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.1.3)
    (from `^10.0.38`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.1.1)
    (from `^4.0.27`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^12.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.0.3)
    (from `^11.2.2`, in `dependencies`)
- Updated dependencies
  [[`58d3ab4`](https://github.com/ardatan/graphql-mesh/commit/58d3ab475a455ba4c924e07add6859b388783474),
  [`3bdb714`](https://github.com/ardatan/graphql-mesh/commit/3bdb7143f11aba6e2855d7c1cc479d8fe749798c)]:
  - @graphql-mesh/utils@0.107.2

## 0.11.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.107.1

## 0.11.1

### Patch Changes

- [#9635](https://github.com/ardatan/graphql-mesh/pull/9635)
  [`c47a0c0`](https://github.com/ardatan/graphql-mesh/commit/c47a0c0905b7d303281921b33cf512adc7092bb9)
  Thanks [@ardatan](https://github.com/ardatan)! - Preserve interface implementors and union members
  when encapsulating a subgraph, keep original field directives on wrapped fields, and nest a second
  encapsulate (same outer name across subgraphs) without dropping inner namespaces.

## 0.11.0

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.107.0

## 0.10.0

### Minor Changes

- [#6007](https://github.com/ardatan/graphql-mesh/pull/6007)
  [`0f4ec4a`](https://github.com/ardatan/graphql-mesh/commit/0f4ec4a821f1782969d67cffbb8923aaab5f381e)
  Thanks [@SGudbrandsson](https://github.com/SGudbrandsson)! - Add optional `force` to prefix
  protected custom scalars (e.g. from graphql-scalars) that are ignored by default.
  GraphQL-specified scalars stay unprefixed.

  Note: v1 `createPrefixTransform` previously prefixed those protected scalars by default; that was
  a bug. Aligning with the legacy ignore behavior is a bug fix (not a breaking change). Use `force`
  to opt in.

### Patch Changes

- [#9609](https://github.com/ardatan/graphql-mesh/pull/9609)
  [`07c7b8e`](https://github.com/ardatan/graphql-mesh/commit/07c7b8eb16138131aaa08e56adf577528874cc40)
  Thanks [@ardatan](https://github.com/ardatan)! - Batched `@resolveTo` joins can now match results
  to keys by a field on each result (`valueKeyField`), instead of assuming the upstream returns one
  row per key in request order. Use this for collection-style sources (Strapi filters, Hasura
  `where`, SQL `IN (...)`, and similar) that return rows in their own order, skip missing keys, or
  return multiple rows per key.

  Example:

  ```graphql
  extend type SearchResult {
    products: [Product!]!
      @resolveTo(
        sourceName: "Products"
        sourceTypeName: "Query"
        sourceFieldName: "productsBySkus"
        keyField: "sku"
        keysArg: "skus"
        valueKeyField: "sku"
      )
  }
  ```

  Docs:
  [Schema Extensions → Matching results by a field (`valueKeyField`)](https://the-guild.dev/graphql/mesh/v1/schema-extensions#matching-results-by-a-field-valuekeyfield)

- Updated dependencies
  [[`a7cbeef`](https://github.com/ardatan/graphql-mesh/commit/a7cbeef58ddea00c8f55630f943bbe8ea19bba26),
  [`e148b13`](https://github.com/ardatan/graphql-mesh/commit/e148b13d083683ed0f2589b23b8174b87a48d78e),
  [`07c7b8e`](https://github.com/ardatan/graphql-mesh/commit/07c7b8eb16138131aaa08e56adf577528874cc40)]:
  - @graphql-mesh/utils@0.106.0

## 0.9.2

### Patch Changes

- [#9603](https://github.com/ardatan/graphql-mesh/pull/9603)
  [`f2f715f`](https://github.com/ardatan/graphql-mesh/commit/f2f715fd35820e1dffb2fe1b6db43f5b92872bcc)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Hide types that become unreachable when
  `createFilterTransform` filters their last accessible field

  The filter transform keeps filtered fields in the executable subgraph schema and marks them with
  `@inaccessible`. This is necessary because their definitions can still carry execution metadata,
  but it also means that a later prune transform considers their referenced types reachable. Those
  types were consequently left in the public API schema, including generated unions whose operations
  had all been filtered.

  The transform now compares schema reachability before and after applying its filters. Types that
  were reachable before filtering but are unreachable afterward are marked with `@inaccessible`,
  allowing composition to omit them from the public API while retaining them in the supergraph for
  execution. Types that were already unreachable before filtering and root operation types are
  preserved to avoid changing existing filtering behavior. Enum types are also preserved because
  federation validates enum values used in argument defaults before removing inaccessible fields
  from the API schema.

## 0.9.1

### Patch Changes

- [#9586](https://github.com/ardatan/graphql-mesh/pull/9586)
  [`096ed33`](https://github.com/ardatan/graphql-mesh/commit/096ed338832c305aa88ccb2d154c1270d05e4b08)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.0.38` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.38)
    (from `^10.0.36`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.27` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.27)
    (from `^4.0.24`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^11.2.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.2.2)
    (from `^11.2.0`, in `dependencies`)

- [#9592](https://github.com/ardatan/graphql-mesh/pull/9592)
  [`7383889`](https://github.com/ardatan/graphql-mesh/commit/738388968fcb0701dbdd2a6dcb9791e8d43c02ec)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`minimatch@^10.2.6` ↗︎](https://www.npmjs.com/package/minimatch/v/10.2.6)
    (from `^10.2.5`, in `dependencies`)
- Updated dependencies
  [[`096ed33`](https://github.com/ardatan/graphql-mesh/commit/096ed338832c305aa88ccb2d154c1270d05e4b08)]:
  - @graphql-mesh/utils@0.105.1

## 0.9.0

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.105.0

## 0.8.50

### Patch Changes

- [#9465](https://github.com/ardatan/graphql-mesh/pull/9465)
  [`eece882`](https://github.com/ardatan/graphql-mesh/commit/eece8825bacc70210ca0b9d88b91da4ab7ae5cf9)
  Thanks [@zcag](https://github.com/zcag)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.37` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.37)
    (from `^0.104.36`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.34` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.34)
    (from `^10.0.32`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.22` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.22)
    (from `^4.0.20`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^11.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.1.1)
    (from `^11.1.0`, in `dependencies`)

- [#9530](https://github.com/ardatan/graphql-mesh/pull/9530)
  [`6282a71`](https://github.com/ardatan/graphql-mesh/commit/6282a71a56fe3d640e8d84f3459ad2ad7ab1edad)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.0.34` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.34)
    (from `^10.0.33`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.22` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.22)
    (from `^4.0.21`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^11.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.1.1)
    (from `^11.1.0`, in `dependencies`)

- [#9547](https://github.com/ardatan/graphql-mesh/pull/9547)
  [`b28d9ec`](https://github.com/ardatan/graphql-mesh/commit/b28d9ec67ace89503fda762049b09111409b43bd)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.0.36` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.36)
    (from `^10.0.34`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.23` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.23)
    (from `^4.0.22`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^11.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.2.0)
    (from `^11.1.1`, in `dependencies`)

- [#9560](https://github.com/ardatan/graphql-mesh/pull/9560)
  [`1b0e3c4`](https://github.com/ardatan/graphql-mesh/commit/1b0e3c4dd5dcf46fa241f87322be368a9fba195a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.24` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.24)
    (from `^4.0.23`, in `dependencies`)
- Updated dependencies
  [[`eece882`](https://github.com/ardatan/graphql-mesh/commit/eece8825bacc70210ca0b9d88b91da4ab7ae5cf9),
  [`444fbbe`](https://github.com/ardatan/graphql-mesh/commit/444fbbe4c6d17a37d2f8eb0107408e508e86ac79),
  [`6282a71`](https://github.com/ardatan/graphql-mesh/commit/6282a71a56fe3d640e8d84f3459ad2ad7ab1edad),
  [`2c347d5`](https://github.com/ardatan/graphql-mesh/commit/2c347d50c64f76cc61ba8d70184b45f1c14ba809),
  [`b28d9ec`](https://github.com/ardatan/graphql-mesh/commit/b28d9ec67ace89503fda762049b09111409b43bd),
  [`1b0e3c4`](https://github.com/ardatan/graphql-mesh/commit/1b0e3c4dd5dcf46fa241f87322be368a9fba195a),
  [`4c56adc`](https://github.com/ardatan/graphql-mesh/commit/4c56adc1bcc5d4179444b56d9ce2d46de6b81c91)]:
  - @graphql-mesh/utils@0.104.38

## 0.8.49

### Patch Changes

- [#9470](https://github.com/ardatan/graphql-mesh/pull/9470)
  [`1da4b45`](https://github.com/ardatan/graphql-mesh/commit/1da4b4592fb8611c90004419a4362fefac51d63f)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.0.33` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.33)
    (from `^10.0.32`, in `dependencies`)

- [#9490](https://github.com/ardatan/graphql-mesh/pull/9490)
  [`fa18e2d`](https://github.com/ardatan/graphql-mesh/commit/fa18e2dcb672c844274c6a0bef62a2f548402cfa)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.21` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.21)
    (from `^4.0.20`, in `dependencies`)
- Updated dependencies
  [[`1da4b45`](https://github.com/ardatan/graphql-mesh/commit/1da4b4592fb8611c90004419a4362fefac51d63f),
  [`fa18e2d`](https://github.com/ardatan/graphql-mesh/commit/fa18e2dcb672c844274c6a0bef62a2f548402cfa),
  [`7cfc2a0`](https://github.com/ardatan/graphql-mesh/commit/7cfc2a0a04407313b464420851ebee0a40bbc2d3)]:
  - @graphql-mesh/utils@0.104.37

## 0.8.48

### Patch Changes

- [#9454](https://github.com/ardatan/graphql-mesh/pull/9454)
  [`9e23b1f`](https://github.com/ardatan/graphql-mesh/commit/9e23b1f3db8912018f601ed2a8ac9c9cd33b8a27)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not mark root types inaccessible solely
  because all of their fields were filtered out. Previously, filtering all `Mutation` fields also
  made the `Mutation` type inaccessible, which was unintended. Now, root types are only marked
  inaccessible when explicitly marked as such. If all `Mutation` fields are filtered, the `Mutation`
  type remains accessible while those fields are marked inaccessible.

## 0.8.47

### Patch Changes

- [#9430](https://github.com/ardatan/graphql-mesh/pull/9430)
  [`8c7b764`](https://github.com/ardatan/graphql-mesh/commit/8c7b764dbd84356244f6e84dc36b7a3c1fc37a71)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.20)
    (from `^4.0.19`, in `dependencies`)

- [#9446](https://github.com/ardatan/graphql-mesh/pull/9446)
  [`6943e28`](https://github.com/ardatan/graphql-mesh/commit/6943e284f107bfb2f3cd958258a6f5402a366ab4)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^11.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.1.0)
    (from `^11.0.1`, in `dependencies`)
- Updated dependencies
  [[`8c7b764`](https://github.com/ardatan/graphql-mesh/commit/8c7b764dbd84356244f6e84dc36b7a3c1fc37a71),
  [`6943e28`](https://github.com/ardatan/graphql-mesh/commit/6943e284f107bfb2f3cd958258a6f5402a366ab4),
  [`6943e28`](https://github.com/ardatan/graphql-mesh/commit/6943e284f107bfb2f3cd958258a6f5402a366ab4)]:
  - @graphql-mesh/utils@0.104.36

## 0.8.46

### Patch Changes

- [`d62f684`](https://github.com/ardatan/graphql-mesh/commit/d62f684e77ff8e69af687cd044d563aad662465a)
  Thanks [@ardatan](https://github.com/ardatan)! - Remove broken `graphql/suggestionList` import

## 0.8.45

### Patch Changes

- [#9406](https://github.com/ardatan/graphql-mesh/pull/9406)
  [`af31a59`](https://github.com/ardatan/graphql-mesh/commit/af31a59b2aaa7aabda3ea566e0c0c063b98c87c5)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.0.32` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.32)
    (from `^10.0.31`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^11.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.0.1)
    (from `^11.0.0`, in `dependencies`)

- [#9407](https://github.com/ardatan/graphql-mesh/pull/9407)
  [`6449161`](https://github.com/ardatan/graphql-mesh/commit/644916156aa92a866a59a249ea193ebaa5cf5ceb)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.22.2` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.22.2)
    (from `^0.22.1`, in `dependencies`)
- Updated dependencies
  [[`af31a59`](https://github.com/ardatan/graphql-mesh/commit/af31a59b2aaa7aabda3ea566e0c0c063b98c87c5)]:
  - @graphql-mesh/utils@0.104.35

## 0.8.44

### Patch Changes

- [`d745894`](https://github.com/ardatan/graphql-mesh/commit/d7458941ea51f1e5af5c850ab9c051ac1fc6719b)
  Thanks [@ardatan](https://github.com/ardatan)! - Copy the implementation instead of importing it
  from graphql-js

## 0.8.43

### Patch Changes

- [#9398](https://github.com/ardatan/graphql-mesh/pull/9398)
  [`bc4b5d0`](https://github.com/ardatan/graphql-mesh/commit/bc4b5d05a92038cb5c0367e4e3c86330811f8065)
  Thanks [@ardatan](https://github.com/ardatan)! - Add validation for transforms such as Federation
  Transform to provide better error messages when the configuration is incorrect. This includes
  suggestions for field names and argument names when they are not found in the schema.
  Additionally, improve error messages when applying transforms to subgraphs.

  This also adds validation for `@merge` and `@resolveTo` directives to ensure that the referenced
  fields and arguments exist in the subgraph schemas, providing suggestions when they do not.

## 0.8.42

### Patch Changes

- [#9389](https://github.com/ardatan/graphql-mesh/pull/9389)
  [`95a2d10`](https://github.com/ardatan/graphql-mesh/commit/95a2d10aa98bf5818debb7e1a21d493cea6dada2)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.19)
    (from `^4.0.18`, in `dependencies`)
- Updated dependencies
  [[`95a2d10`](https://github.com/ardatan/graphql-mesh/commit/95a2d10aa98bf5818debb7e1a21d493cea6dada2)]:
  - @graphql-mesh/utils@0.104.34

## 0.8.41

### Patch Changes

- [#9375](https://github.com/ardatan/graphql-mesh/pull/9375)
  [`5c4b93b`](https://github.com/ardatan/graphql-mesh/commit/5c4b93b74a7c16fa5f5fae51d90118694b06a8b2)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`minimatch@^10.2.5` ↗︎](https://www.npmjs.com/package/minimatch/v/10.2.5)
    (from `^10.2.4`, in `dependencies`)
- Updated dependencies
  [[`46d8eed`](https://github.com/ardatan/graphql-mesh/commit/46d8eed3af7a7531e744da1d6b3449c332e3abb1)]:
  - @graphql-mesh/utils@0.104.33

## 0.8.40

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.104.32

## 0.8.39

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.104.31

## 0.8.38

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.104.30

## 0.8.37

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.104.29

## 0.8.36

### Patch Changes

- [#9329](https://github.com/ardatan/graphql-mesh/pull/9329)
  [`300aea0`](https://github.com/ardatan/graphql-mesh/commit/300aea0f32edb9da7a13562fbec35bf31fb40a91)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.18` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.18)
    (from `^4.0.17`, in `dependencies`)
- Updated dependencies
  [[`300aea0`](https://github.com/ardatan/graphql-mesh/commit/300aea0f32edb9da7a13562fbec35bf31fb40a91)]:
  - @graphql-mesh/utils@0.104.28

## 0.8.35

### Patch Changes

- [#9323](https://github.com/ardatan/graphql-mesh/pull/9323)
  [`94c37cd`](https://github.com/ardatan/graphql-mesh/commit/94c37cdef8ba20e8b233445c679bf7604d310a1f)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.22.1` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.22.1)
    (from `^0.22.0`, in `dependencies`)

- [#9311](https://github.com/ardatan/graphql-mesh/pull/9311)
  [`17630d2`](https://github.com/ardatan/graphql-mesh/commit/17630d28ad8ce8fcedf1eb3992c41d72fe4d4eee)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix incompatibility when encapsulation and prefix
  transforms are combined

## 0.8.34

### Patch Changes

- [#9315](https://github.com/ardatan/graphql-mesh/pull/9315)
  [`2c80833`](https://github.com/ardatan/graphql-mesh/commit/2c80833a1a11531aa37d35f9e64d9e97e1c6d728)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.17)
    (from `^4.0.14`, in `dependencies`)
- Updated dependencies
  [[`2c80833`](https://github.com/ardatan/graphql-mesh/commit/2c80833a1a11531aa37d35f9e64d9e97e1c6d728)]:
  - @graphql-mesh/utils@0.104.27

## 0.8.33

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.104.26

## 0.8.32

### Patch Changes

- [#9278](https://github.com/ardatan/graphql-mesh/pull/9278)
  [`04df502`](https://github.com/ardatan/graphql-mesh/commit/04df5024842035d7718fd8a45129d20a35d3943e)
  Thanks [@ardatan](https://github.com/ardatan)! - If the encapsulated fields are conflicting, they
  will be renamed to include the subgraph name as a prefix and the renamed fields will be marked
  with the `@inaccessible` directive. For example, if both Subgraph A and Subgraph B have a
  `getItems` field, they will be renamed to `_encapsulated_SubgraphA_getItems` and
  `_encapsulated_SubgraphB_getItems` respectively, and the original `getItems` fields will be
  removed from the root type to prevent conflicts.

  Subgraph A

  ```graphql
  type Query {
    getItems: [SubgraphA_Item]
  }

  type SubgraphA_Item {
    id: ID
  }
  ```

  Subgraph B

  ```graphql
  type Query {
    getItems: [SubgraphB_Item]
  }

  type SubgraphB_Item {
    id: ID
  }
  ```

- Updated dependencies []:
  - @graphql-mesh/utils@0.104.25

## 0.8.31

### Patch Changes

- [#9268](https://github.com/ardatan/graphql-mesh/pull/9268)
  [`457549e`](https://github.com/ardatan/graphql-mesh/commit/457549eca0b1dfd1714f76a70c1399fa57fe5404)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.22.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.22.0)
    (from `^0.21.3`, in `dependencies`)

## 0.8.30

### Patch Changes

- [#9258](https://github.com/ardatan/graphql-mesh/pull/9258)
  [`e42819b`](https://github.com/ardatan/graphql-mesh/commit/e42819bd9ce3a95ba425cbb18de9a053892087b9)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`minimatch@^10.2.4` ↗︎](https://www.npmjs.com/package/minimatch/v/10.2.4)
    (from `^10.2.2`, in `dependencies`)

- [#9261](https://github.com/ardatan/graphql-mesh/pull/9261)
  [`a442cbe`](https://github.com/ardatan/graphql-mesh/commit/a442cbe66898dcc5ddb2451e268176fa4cd97633)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.14)
    (from `^4.0.13`, in `dependencies`)
- Updated dependencies
  [[`a442cbe`](https://github.com/ardatan/graphql-mesh/commit/a442cbe66898dcc5ddb2451e268176fa4cd97633)]:
  - @graphql-mesh/utils@0.104.24

## 0.8.29

### Patch Changes

- [#9244](https://github.com/ardatan/graphql-mesh/pull/9244)
  [`63b2a0b`](https://github.com/ardatan/graphql-mesh/commit/63b2a0b62282e786e1db57fb1a7fd10d3f78e25a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`minimatch@^10.2.2` ↗︎](https://www.npmjs.com/package/minimatch/v/10.2.2)
    (from `^10.1.2`, in `dependencies`)

## 0.8.28

### Patch Changes

- [#9228](https://github.com/ardatan/graphql-mesh/pull/9228)
  [`d213cd9`](https://github.com/ardatan/graphql-mesh/commit/d213cd912412c65602120243094795c9a1b5a28e)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.13)
    (from `^4.0.12`, in `dependencies`)
- Updated dependencies
  [[`d213cd9`](https://github.com/ardatan/graphql-mesh/commit/d213cd912412c65602120243094795c9a1b5a28e)]:
  - @graphql-mesh/utils@0.104.23

## 0.8.27

### Patch Changes

- [#9199](https://github.com/ardatan/graphql-mesh/pull/9199)
  [`6c65df7`](https://github.com/ardatan/graphql-mesh/commit/6c65df7a99baf36f6c5d07d2bcd14fa2166b4909)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.12)
    (from `^4.0.10`, in `dependencies`)

- [#9203](https://github.com/ardatan/graphql-mesh/pull/9203)
  [`b25cc8e`](https://github.com/ardatan/graphql-mesh/commit/b25cc8e496bce38cb1e2d71c8445d7eafe738c89)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`minimatch@^10.1.2` ↗︎](https://www.npmjs.com/package/minimatch/v/10.1.2)
    (from `^10.0.3`, in `dependencies`)

- [#9149](https://github.com/ardatan/graphql-mesh/pull/9149)
  [`235c56b`](https://github.com/ardatan/graphql-mesh/commit/235c56b0bcd8f68e7c9dad77b051a14576d355f4)
  Thanks [@ardatan](https://github.com/ardatan)! - Assign `Query.typenamesByKeysList` semantic
  convention as the entity resolver.

  Previously it only assigned `Query.typenamesByKeys` semantic convention for batched type
  resolutions

- Updated dependencies
  [[`6c65df7`](https://github.com/ardatan/graphql-mesh/commit/6c65df7a99baf36f6c5d07d2bcd14fa2166b4909)]:
  - @graphql-mesh/utils@0.104.22

## 0.8.26

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.104.21

## 0.8.25

### Patch Changes

- [#9120](https://github.com/ardatan/graphql-mesh/pull/9120)
  [`c219668`](https://github.com/ardatan/graphql-mesh/commit/c219668be72a56f0400a3086fe5144604b7ae948)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.0.31` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.31)
    (from `^10.0.30`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.9)
    (from `^4.0.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^11.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.0.0)
    (from `^10.11.0`, in `dependencies`)

- [#9129](https://github.com/ardatan/graphql-mesh/pull/9129)
  [`3f91b5a`](https://github.com/ardatan/graphql-mesh/commit/3f91b5a5ca6dcb470e0e3897dd96c607f6e358c8)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.10)
    (from `^4.0.9`, in `dependencies`)
- Updated dependencies
  [[`c219668`](https://github.com/ardatan/graphql-mesh/commit/c219668be72a56f0400a3086fe5144604b7ae948),
  [`3f91b5a`](https://github.com/ardatan/graphql-mesh/commit/3f91b5a5ca6dcb470e0e3897dd96c607f6e358c8)]:
  - @graphql-mesh/utils@0.104.20

## 0.8.24

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.104.19

## 0.8.23

### Patch Changes

- [#9061](https://github.com/ardatan/graphql-mesh/pull/9061)
  [`3878067`](https://github.com/ardatan/graphql-mesh/commit/38780670ae4d777d192c95e10308b51b9ee6a3fd)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.21.1` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.21.1)
    (from `^0.21.0`, in `dependencies`)

- [#9112](https://github.com/ardatan/graphql-mesh/pull/9112)
  [`d420cb2`](https://github.com/ardatan/graphql-mesh/commit/d420cb23a09c1bb3525fb4f2a341dfea8ff53b4e)
  Thanks [@tazsingh](https://github.com/tazsingh)! - Fix Fusion Composition not forwarding
  sourceArgs to @resolveTo

## 0.8.22

### Patch Changes

- [#9027](https://github.com/ardatan/graphql-mesh/pull/9027)
  [`72c443c`](https://github.com/ardatan/graphql-mesh/commit/72c443c0a2246c1573c72522d5ee7b6955f515d2)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.0.30` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.30)
    (from `^10.0.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.8)
    (from `^4.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.11.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.11.0)
    (from `^10.8.0`, in `dependencies`)

- [#9040](https://github.com/ardatan/graphql-mesh/pull/9040)
  [`ff31a2b`](https://github.com/ardatan/graphql-mesh/commit/ff31a2b64089b1444afd63ffa3d3c989cb6273ab)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.21.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.21.0)
    (from `^0.20.0`, in `dependencies`)
- Updated dependencies
  [[`72c443c`](https://github.com/ardatan/graphql-mesh/commit/72c443c0a2246c1573c72522d5ee7b6955f515d2)]:
  - @graphql-mesh/utils@0.104.18

## 0.8.21

### Patch Changes

- Updated dependencies
  [[`3987b80`](https://github.com/ardatan/graphql-mesh/commit/3987b80a7e8bbeb3fc65360ac6d4a96587cdb4e6)]:
  - @graphql-mesh/utils@0.104.17

## 0.8.20

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.104.16

## 0.8.19

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.104.15

## 0.8.18

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.104.14

## 0.8.17

### Patch Changes

- [#8745](https://github.com/ardatan/graphql-mesh/pull/8745)
  [`dfc6bc1`](https://github.com/ardatan/graphql-mesh/commit/dfc6bc10769092e6e44bf93a516f8d4e3dd1c681)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^4.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/4.0.0)
    (from `^3.1.9`, in `dependencies`)

- [#8761](https://github.com/ardatan/graphql-mesh/pull/8761)
  [`c880540`](https://github.com/ardatan/graphql-mesh/commit/c880540ec19a42caf3efa435d9c3cd1b02016725)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.20.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.20.0)
    (from `^0.19.0`, in `dependencies`)
- Updated dependencies
  [[`dfc6bc1`](https://github.com/ardatan/graphql-mesh/commit/dfc6bc10769092e6e44bf93a516f8d4e3dd1c681),
  [`865b000`](https://github.com/ardatan/graphql-mesh/commit/865b000024850b1d98fe39244e8eb432e4c04d38)]:
  - @graphql-mesh/utils@0.104.13

## 0.8.16

### Patch Changes

- [`8c1456d`](https://github.com/ardatan/graphql-mesh/commit/8c1456d4c87b2fd0aabdf0e69fa6045672d89c17)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix issues with missing query type and `extends`
  modifier

- Updated dependencies
  [[`ffec6e7`](https://github.com/ardatan/graphql-mesh/commit/ffec6e7ae007b7019a895d4dbee79177a4a0a13e)]:
  - @graphql-mesh/utils@0.104.12

## 0.8.15

### Patch Changes

- Updated dependencies
  [[`d61faf0`](https://github.com/ardatan/graphql-mesh/commit/d61faf0370969cbd83acf04f4ca2f1c9253cc0e7)]:
  - @graphql-mesh/utils@0.104.11

## 0.8.14

### Patch Changes

- Updated dependencies
  [[`7852ccd`](https://github.com/ardatan/graphql-mesh/commit/7852ccde178e590740d533fcfc29dd1f74a91859),
  [`7852ccd`](https://github.com/ardatan/graphql-mesh/commit/7852ccde178e590740d533fcfc29dd1f74a91859)]:
  - @graphql-mesh/utils@0.104.10

## 0.8.13

### Patch Changes

- Updated dependencies
  [[`0c18fe1`](https://github.com/ardatan/graphql-mesh/commit/0c18fe12b1d92af006e945b19e9207cb16a1ee7e)]:
  - @graphql-mesh/utils@0.104.9

## 0.8.12

### Patch Changes

- [#8710](https://github.com/ardatan/graphql-mesh/pull/8710)
  [`76df3d1`](https://github.com/ardatan/graphql-mesh/commit/76df3d166aea0f579192f68366ae1e9309070d8f)
  Thanks [@ardatan](https://github.com/ardatan)! - Use the latest compatible federation version v2.6
  not v2.3 when upgrading the existing import

- Updated dependencies
  [[`fb6e935`](https://github.com/ardatan/graphql-mesh/commit/fb6e935c059d1508f60c7e1105df865a76aeec07)]:
  - @graphql-mesh/utils@0.104.8

## 0.8.11

### Patch Changes

- [#8683](https://github.com/ardatan/graphql-mesh/pull/8683)
  [`00dd66a`](https://github.com/ardatan/graphql-mesh/commit/00dd66af22c98aa1e153149e3df68bca7de83778)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.19.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.19.0)
    (from `^0.18.2`, in `dependencies`)
- Updated dependencies
  [[`c37c23b`](https://github.com/ardatan/graphql-mesh/commit/c37c23bae7f95ea4580b66c57c7e160a485614cf)]:
  - @graphql-mesh/utils@0.104.7

## 0.8.10

### Patch Changes

- Updated dependencies
  [[`e2666bc`](https://github.com/ardatan/graphql-mesh/commit/e2666bc151e63f319fe65d2f3e18bdfe1e305b2a)]:
  - @graphql-mesh/utils@0.104.6

## 0.8.9

### Patch Changes

- Updated dependencies
  [[`9d61d75`](https://github.com/ardatan/graphql-mesh/commit/9d61d75c462a577b5fa4fe3285370abb6ea064c8)]:
  - @graphql-mesh/utils@0.104.5

## 0.8.8

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.104.4

## 0.8.7

### Patch Changes

- [`74672d0`](https://github.com/ardatan/graphql-mesh/commit/74672d0f8906f31d6563eee240ffeea04328bd7d)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump Federation Composition package to get the
  fix -> https://github.com/graphql-hive/federation-composition/pull/141

## 0.8.6

### Patch Changes

- Updated dependencies
  [[`0af3d0c`](https://github.com/ardatan/graphql-mesh/commit/0af3d0c77a0226b4f2339ba46012b3e00c13e65c),
  [`0af3d0c`](https://github.com/ardatan/graphql-mesh/commit/0af3d0c77a0226b4f2339ba46012b3e00c13e65c)]:
  - @graphql-mesh/utils@0.104.3

## 0.8.5

### Patch Changes

- [#8570](https://github.com/ardatan/graphql-mesh/pull/8570)
  [`3528ddb`](https://github.com/ardatan/graphql-mesh/commit/3528ddb85e13a0d2f4f452d5e79c939634d49e2a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.18.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.18.0)
    (from `^0.17.0`, in `dependencies`)

## 0.8.4

### Patch Changes

- [#8564](https://github.com/ardatan/graphql-mesh/pull/8564)
  [`3d33f2c`](https://github.com/ardatan/graphql-mesh/commit/3d33f2c366c61f49d8e7658d4191f14ec1066c92)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.16.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.16.0)
    (from `^0.15.0`, in `dependencies`)

- [#8568](https://github.com/ardatan/graphql-mesh/pull/8568)
  [`b432f1d`](https://github.com/ardatan/graphql-mesh/commit/b432f1d5880f849a4d418d23807d4e52f3caeb36)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.17.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.17.0)
    (from `^0.16.0`, in `dependencies`)

## 0.8.3

### Patch Changes

- [#8554](https://github.com/ardatan/graphql-mesh/pull/8554)
  [`cedadc5`](https://github.com/ardatan/graphql-mesh/commit/cedadc5e27f9059eff4cda42f45adbba9ee415cd)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.15.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.15.0)
    (from `^0.14.0`, in `dependencies`)

## 0.8.2

### Patch Changes

- Updated dependencies
  [[`1b5d072`](https://github.com/ardatan/graphql-mesh/commit/1b5d07211e2e67bc939f1def3d19c45a7a4eb28b)]:
  - @graphql-mesh/utils@0.104.2

## 0.8.1

### Patch Changes

- Updated dependencies
  [[`b6c083c`](https://github.com/ardatan/graphql-mesh/commit/b6c083ce9e9305874cf847246fefda3fe068e8b4),
  [`f416982`](https://github.com/ardatan/graphql-mesh/commit/f4169823bce2abf093bd53249d1d1208ea459a5d)]:
  - @graphql-mesh/utils@0.104.1

## 0.8.0

### Patch Changes

- Updated dependencies
  [[`4528794`](https://github.com/ardatan/graphql-mesh/commit/45287948dbfbe07c3f60f9c36253099c549207d9),
  [`4528794`](https://github.com/ardatan/graphql-mesh/commit/45287948dbfbe07c3f60f9c36253099c549207d9)]:
  - @graphql-mesh/utils@0.104.0

## 0.7.27

### Patch Changes

- Updated dependencies
  [[`903124f`](https://github.com/ardatan/graphql-mesh/commit/903124f8245a518aac50ef8d0eff2fef01a206f2)]:
  - @graphql-mesh/utils@0.103.21

## 0.7.26

### Patch Changes

- Updated dependencies
  [[`3f5e0a1`](https://github.com/ardatan/graphql-mesh/commit/3f5e0a13c8a07bd68ec19e4da94f34030cc7d3dc)]:
  - @graphql-mesh/utils@0.103.20

## 0.7.25

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.103.19

## 0.7.24

### Patch Changes

- Updated dependencies
  [[`ab0863b`](https://github.com/ardatan/graphql-mesh/commit/ab0863ba367552e4b1ced1063ae7cb3a5f81b3b2)]:
  - @graphql-mesh/utils@0.103.18

## 0.7.23

### Patch Changes

- Updated dependencies
  [[`eee582a`](https://github.com/ardatan/graphql-mesh/commit/eee582a4cf78d8f7b0e303b522e6a97bd0ad4f2a)]:
  - @graphql-mesh/utils@0.103.17

## 0.7.22

### Patch Changes

- Updated dependencies
  [[`b44f8b7`](https://github.com/ardatan/graphql-mesh/commit/b44f8b7a413c8adb213b22fb8a243ca6aa06d2bd)]:
  - @graphql-mesh/utils@0.103.16

## 0.7.21

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.103.15

## 0.7.20

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.103.14

## 0.7.19

### Patch Changes

- [#8362](https://github.com/ardatan/graphql-mesh/pull/8362)
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.0)
    (from `^10.6.0`, in `dependencies`)
- Updated dependencies
  [[`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)]:
  - @graphql-mesh/utils@0.103.13

## 0.7.18

### Patch Changes

- [#8268](https://github.com/ardatan/graphql-mesh/pull/8268)
  [`f1b5e8e`](https://github.com/ardatan/graphql-mesh/commit/f1b5e8ee2f2da7599532b6f2a2e6399c46575789)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect other `@composeDirective` definitions
  other than Mesh

- Updated dependencies
  [[`5180b06`](https://github.com/ardatan/graphql-mesh/commit/5180b068568042e764558a19194b8bae69354fe2)]:
  - @graphql-mesh/utils@0.103.12

## 0.7.17

### Patch Changes

- Updated dependencies
  [[`4011203`](https://github.com/ardatan/graphql-mesh/commit/40112034a2e248eda94883a39a3f8682189f4288)]:
  - @graphql-mesh/utils@0.103.11

## 0.7.16

### Patch Changes

- Updated dependencies
  [[`b750a41`](https://github.com/ardatan/graphql-mesh/commit/b750a410c082d64a04f21023790f2ff2c46f5eb9)]:
  - @graphql-mesh/utils@0.103.10

## 0.7.15

### Patch Changes

- Updated dependencies
  [[`10ba2c4`](https://github.com/ardatan/graphql-mesh/commit/10ba2c42549dacff9c4e6be87ee50b608be62ddc)]:
  - @graphql-mesh/utils@0.103.9

## 0.7.14

### Patch Changes

- Updated dependencies
  [[`93fb364`](https://github.com/ardatan/graphql-mesh/commit/93fb3643d90c52084725d79b586ace8ecd570911)]:
  - @graphql-mesh/utils@0.103.8

## 0.7.13

### Patch Changes

- [#7961](https://github.com/ardatan/graphql-mesh/pull/7961)
  [`1a7adbf`](https://github.com/ardatan/graphql-mesh/commit/1a7adbf28f126c0fc8ba834f8a7db886f7fba876)
  Thanks [@ardatan](https://github.com/ardatan)! - HATEOAS Support

- Updated dependencies []:
  - @graphql-mesh/utils@0.103.7

## 0.7.12

### Patch Changes

- Updated dependencies
  [[`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)]:
  - @graphql-mesh/utils@0.103.6

## 0.7.11

### Patch Changes

- [`5883d66`](https://github.com/ardatan/graphql-mesh/commit/5883d6664730031b410b53c7c763fde981c1ae47)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect existing federation directives when
  federation transform is used

## 0.7.10

### Patch Changes

- [`6a4d978`](https://github.com/ardatan/graphql-mesh/commit/6a4d978a9c337241a9c2fe909452647f4645ba9b)
  Thanks [@ardatan](https://github.com/ardatan)! - Add federation annotations correctly to the root
  fields

## 0.7.9

### Patch Changes

- [#8040](https://github.com/ardatan/graphql-mesh/pull/8040)
  [`a4942c3`](https://github.com/ardatan/graphql-mesh/commit/a4942c3aeffab1b868fbbdba144ce6601d296c9e)
  Thanks [@ardatan](https://github.com/ardatan)! - Use \`@inaccessible\` instead of \`@hidden\`

## 0.7.8

### Patch Changes

- [`b35fb59`](https://github.com/ardatan/graphql-mesh/commit/b35fb59db0ef49b915400c715da5fea3016c498e)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes the transforms with resolveTo directive

## 0.7.7

### Patch Changes

- [`750ce54`](https://github.com/ardatan/graphql-mesh/commit/750ce5452b61bf78ee056fe7b9b3d283c40114b4)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect resolveTo directives in rename transform

- Updated dependencies
  [[`9f9f6fe`](https://github.com/ardatan/graphql-mesh/commit/9f9f6fe61c74eaa6572866eddd97c348307107a8)]:
  - @graphql-mesh/utils@0.103.5

## 0.7.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.103.4

## 0.7.5

### Patch Changes

- Updated dependencies
  [[`6360755`](https://github.com/ardatan/graphql-mesh/commit/63607552017ed462c0555ad2e2ec6466c10d7ae4)]:
  - @graphql-mesh/utils@0.103.3

## 0.7.4

### Patch Changes

- Updated dependencies
  [[`bfd8929`](https://github.com/ardatan/graphql-mesh/commit/bfd89297b0fe4dbdd0fecff8c35c316e874b9a56)]:
  - @graphql-mesh/utils@0.103.2

## 0.7.3

### Patch Changes

- [#7993](https://github.com/ardatan/graphql-mesh/pull/7993)
  [`8154187`](https://github.com/ardatan/graphql-mesh/commit/815418727abae8a283aa19644f17bb210812611e)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not apply semantic conventions if there is
  already defined some federation annotations

## 0.7.2

### Patch Changes

- [`6ea841c`](https://github.com/ardatan/graphql-mesh/commit/6ea841c6e6b666a9f19d1f09d883d8ff77d00160)
  Thanks [@ardatan](https://github.com/ardatan)! - More strict checks

## 0.7.1

### Patch Changes

- [#7978](https://github.com/ardatan/graphql-mesh/pull/7978)
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (from `^10.5.5`, in `dependencies`)
- Updated dependencies
  [[`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)]:
  - @graphql-mesh/utils@0.103.1

## 0.7.0

### Patch Changes

- Updated dependencies
  [[`0e49907`](https://github.com/ardatan/graphql-mesh/commit/0e49907cf19d91fe40c28237aa79bd55742b371f),
  [`9873b33`](https://github.com/ardatan/graphql-mesh/commit/9873b33f0cc6c3b3a3c3dc1a0a1cb18c827b8722)]:
  - @graphql-mesh/utils@0.103.0

## 0.6.7

### Patch Changes

- [#7936](https://github.com/ardatan/graphql-mesh/pull/7936)
  [`4236099`](https://github.com/ardatan/graphql-mesh/commit/423609963b72000d2954fcb55606bd8e8b679db3)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not create extra \`@transport\` annotation if
  the subgraph is a regular HTTP subgraph

- Updated dependencies []:
  - @graphql-mesh/utils@0.102.13

## 0.6.6

### Patch Changes

- Updated dependencies
  [[`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7)]:
  - @graphql-mesh/utils@0.102.12

## 0.6.5

### Patch Changes

- [#7838](https://github.com/ardatan/graphql-mesh/pull/7838)
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^3.1.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.1.9)
    (from `^3.1.8`, in `dependencies`)
- Updated dependencies
  [[`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)]:
  - @graphql-mesh/utils@0.102.11

## 0.6.4

### Patch Changes

- [#7828](https://github.com/ardatan/graphql-mesh/pull/7828)
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^3.1.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.1.8)
    (from `^3.1.7`, in `dependencies`)
- Updated dependencies
  [[`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)]:
  - @graphql-mesh/utils@0.102.10

## 0.6.3

### Patch Changes

- [#7816](https://github.com/ardatan/graphql-mesh/pull/7816)
  [`fad4d27`](https://github.com/ardatan/graphql-mesh/commit/fad4d27bfebb80a374c2041b86ffab509845effe)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix subscription fields fed by webhooks and
  defined in \`additionalTypeDefs\` with \`@resolveTo\`

- Updated dependencies
  [[`fad4d27`](https://github.com/ardatan/graphql-mesh/commit/fad4d27bfebb80a374c2041b86ffab509845effe)]:
  - @graphql-mesh/utils@0.102.9

## 0.6.2

### Patch Changes

- [#7769](https://github.com/ardatan/graphql-mesh/pull/7769)
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^3.1.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.1.7)
    (from `^3.1.4`, in `dependencies`)
- Updated dependencies
  [[`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)]:
  - @graphql-mesh/utils@0.102.8

## 0.6.1

### Patch Changes

- [#7781](https://github.com/ardatan/graphql-mesh/pull/7781)
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^3.1.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.1.4)
    (from `^3.1.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.5.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.5)
    (from `^10.5.3`, in `dependencies`)

- [#7772](https://github.com/ardatan/graphql-mesh/pull/7772)
  [`7c24ded`](https://github.com/ardatan/graphql-mesh/commit/7c24ded0128f098778a32f74554d9be22e63fa7f)
  Thanks [@ardatan](https://github.com/ardatan)! - Choose correct key fields and arguments for type
  merging during Mesh Compose

- Updated dependencies
  [[`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)]:
  - @graphql-mesh/utils@0.102.7

## 0.6.0

### Minor Changes

- [#7746](https://github.com/ardatan/graphql-mesh/pull/7746)
  [`c8b1309`](https://github.com/ardatan/graphql-mesh/commit/c8b1309a707c358dc446799a986c99e120767d0e)
  Thanks [@renovate](https://github.com/apps/renovate)! - Remove workaround for directives on enums,
  enum values and unions

### Patch Changes

- [#7746](https://github.com/ardatan/graphql-mesh/pull/7746)
  [`c8b1309`](https://github.com/ardatan/graphql-mesh/commit/c8b1309a707c358dc446799a986c99e120767d0e)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.14.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.14.0)
    (from `^0.12.0`, in `dependencies`)

## 0.5.4

### Patch Changes

- Updated dependencies
  [[`bf588d3`](https://github.com/ardatan/graphql-mesh/commit/bf588d372c0078378aaa24beea2da794af7949e6)]:
  - @graphql-mesh/utils@0.102.6

## 0.5.3

### Patch Changes

- [#7722](https://github.com/ardatan/graphql-mesh/pull/7722)
  [`e9483d6`](https://github.com/ardatan/graphql-mesh/commit/e9483d69cbfb8a774d5184fdd12665c30984d5ab)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not add another `@hidden` directive definition
  if it already exists

## 0.5.2

### Patch Changes

- [#7676](https://github.com/ardatan/graphql-mesh/pull/7676)
  [`adc3293`](https://github.com/ardatan/graphql-mesh/commit/adc32938449da6ad75f6a3381c437bede8b128a7)
  Thanks [@ardatan](https://github.com/ardatan)! - If the target hoisted field is a new field name
  that doesn't exist, create that field and keep the existing one;

  ```ts
  createHoistFieldTransform({
    mapping: [
      {
        typeName: 'Query',
        pathConfig: ['users', 'results'],
        newFieldName: 'usersResults'
      }
    ]
  })
  ```

  ```diff
  type Query {
    users(limit: Int!, page: Int): UserSearchResult # Keep this
  + usersResults(limit: Int!, page: Int): [User!]! # Add a new one
  }

  scalar _HoistConfig

  type UserSearchResult {
    page: Int!
  }

  type User {
    id: ID!
    name: String!
  }
  ```

## 0.5.1

### Patch Changes

- [`28cd8b0`](https://github.com/ardatan/graphql-mesh/commit/28cd8b0fb657e9b62d6d2e15ce125bcd791c84ec)
  Thanks [@ardatan](https://github.com/ardatan)! - Automatically upgrade Federation v2.0 to v2.x
  because Mesh Compose doesn't support v2.0 and it needs \`@composeDirective\` which is available
  since v2.1

## 0.5.0

### Minor Changes

- [#7580](https://github.com/ardatan/graphql-mesh/pull/7580)
  [`75e9f63`](https://github.com/ardatan/graphql-mesh/commit/75e9f63d09514a0af786f909dc8c32ac09a1a849)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING: All types prefixed with `MeshServe`,
  now are prefixed with `Gateway`. e.g. `MeshServeRuntime` -> `GatewayRuntime`

  Runtime factory is renamed; `createServeRuntime` -> `createGatewayRuntime`

  The expected export name for config files are renamed from `serveConfig` to `gatewayConfig`

  RENAMING:

  You can rename the product, config file name etc by using the following config options;

  For example;

  ```ts
  productName = 'Mesh Gateway'
  productDescription =
    'Mesh Gateway is a GraphQL Gateway that can be used to serve a supergraph schema.'
  productLogo = '<svg>...</svg>'
  productPackageName = '@graphql-mesh/gateway'
  ```

### Patch Changes

- Updated dependencies
  [[`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d)]:
  - @graphql-mesh/utils@0.102.5

## 0.4.5

### Patch Changes

- [#7488](https://github.com/ardatan/graphql-mesh/pull/7488)
  [`5146df0`](https://github.com/ardatan/graphql-mesh/commit/5146df0fd3313227d5d7df2beb726ca89e13923f)
  Thanks [@ardatan](https://github.com/ardatan)! - Support auth directives

## 0.4.4

### Patch Changes

- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/utils@0.102.4

## 0.4.3

### Patch Changes

- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)]:
  - @graphql-mesh/utils@0.102.3

## 0.4.2

### Patch Changes

- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/utils@0.102.2

## 0.4.1

### Patch Changes

- [#7550](https://github.com/ardatan/graphql-mesh/pull/7550)
  [`102d970`](https://github.com/ardatan/graphql-mesh/commit/102d97050d3f0713c98f95de99dcfcd961124c44)
  Thanks [@ardatan](https://github.com/ardatan)! - New Transport and Loader implementation for OData

- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de)]:
  - @graphql-mesh/utils@0.102.1

## 0.4.0

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.102.0

## 0.3.0

### Patch Changes

- [#7497](https://github.com/ardatan/graphql-mesh/pull/7497)
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.5)
    (from `^10.0.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.5.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.2)
    (from `^10.3.4`, in `dependencies`)

- [#7512](https://github.com/ardatan/graphql-mesh/pull/7512)
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.5.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.3)
    (from `^10.5.2`, in `dependencies`)
- Updated dependencies
  [[`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)]:
  - @graphql-mesh/utils@0.101.0

## 0.2.0

### Patch Changes

- [#7477](https://github.com/ardatan/graphql-mesh/pull/7477)
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.3.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.3.4)
    (from `^10.3.2`, in `dependencies`)
- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7),
  [`4d1eb28`](https://github.com/ardatan/graphql-mesh/commit/4d1eb285c2b703c5f80473ad0f316004306fac7f),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7)]:
  - @graphql-mesh/utils@0.100.0

## 0.1.9

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.99.7

## 0.1.8

### Patch Changes

- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/utils@0.99.6

## 0.1.7

### Patch Changes

- [#7192](https://github.com/ardatan/graphql-mesh/pull/7192)
  [`1905f53`](https://github.com/ardatan/graphql-mesh/commit/1905f53a65e6c73d1d305770dcfc4cba34798a09)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^3.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.1.2)
    (from `^3.0.2`, in `dependencies`)

- [#7192](https://github.com/ardatan/graphql-mesh/pull/7192)
  [`1905f53`](https://github.com/ardatan/graphql-mesh/commit/1905f53a65e6c73d1d305770dcfc4cba34798a09)
  Thanks [@ardatan](https://github.com/ardatan)! - Extract subgraph schema

## 0.1.6

### Patch Changes

- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/utils@0.99.5

## 0.1.5

### Patch Changes

- [#7241](https://github.com/ardatan/graphql-mesh/pull/7241)
  [`7b474af`](https://github.com/ardatan/graphql-mesh/commit/7b474af8ebd91fad894ca72fca31e0afbcc76ede)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`minimatch@^10.0.0` ↗︎](https://www.npmjs.com/package/minimatch/v/10.0.0)
    (from `^9.0.0`, in `dependencies`)

## 0.1.4

### Patch Changes

- Updated dependencies
  [[`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)]:
  - @graphql-mesh/utils@0.99.4

## 0.1.3

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3

## 0.1.2

### Patch Changes

- Updated dependencies
  [[`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e)]:
  - @graphql-mesh/utils@0.99.2

## 0.1.1

### Patch Changes

- [#7286](https://github.com/ardatan/graphql-mesh/pull/7286)
  [`e3714fb`](https://github.com/ardatan/graphql-mesh/commit/e3714fb2e91309e515e9c09a7b1c3c15b17fff3d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.3.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.3.2)
    (from `^10.2.3`, in `dependencies`)
- Updated dependencies
  [[`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)]:
  - @graphql-mesh/utils@0.99.1

## 0.1.0

### Patch Changes

- [#7218](https://github.com/ardatan/graphql-mesh/pull/7218)
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.12.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.12.0)
    (from `^0.11.2`, in `dependencies`)

- [#7255](https://github.com/ardatan/graphql-mesh/pull/7255)
  [`94245c7`](https://github.com/ardatan/graphql-mesh/commit/94245c708850ce643e395ea559b65d4897f05936)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.12.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.12.0)
    (from `^0.11.2`, in `dependencies`)
- Updated dependencies
  [[`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00)]:
  - @graphql-mesh/utils@0.99.0

## 0.0.8

### Patch Changes

- [#7185](https://github.com/ardatan/graphql-mesh/pull/7185)
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (from `^10.2.1`, in `dependencies`)
- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)]:
  - @graphql-mesh/utils@0.98.10

## 0.0.7

### Patch Changes

- [#7145](https://github.com/ardatan/graphql-mesh/pull/7145)
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/stitching-directives@^3.0.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.0.2)
    (to `dependencies`)
  - Added dependency
    [`@theguild/federation-composition@^0.11.2` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.11.2)
    (to `dependencies`)

- [#7145](https://github.com/ardatan/graphql-mesh/pull/7145)
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)
  Thanks [@Author](https://github.com/Author), [@User](https://github.com/User)! - New Federation
  Composition Approach for the new Mesh v1 alpha; (If you are using Mesh v0 legacy, ignore this
  changelog)

  Now Mesh Compose produces a superset of Federated Supergraph.
  - Drop any options and implementation related to the old `fusiongraph`
  - - The output is a valid supergraph that can be consumed by any Federation router. But if it is
      not Mesh Serve, the subgraph should still be served via Mesh Serve then consumed by that
      Federation router. If it is Mesh Serve, no additional server is needed because Mesh Serve
      already knows the additional directives etc of the transports
  - Compose the subgraphs using `@theguild/federation-composition` package
  - - So benefit from the validation rules of Federation in Mesh Compose
  - Ability to consume existing federated subgraphs
  - - Since the composition is now Federation, we can accept any federated subgraph
  - Implement Federation transform to transform any subgraph to a federated subgraph by adding
    Federation directives (v2 only) . This is on user's own because they add the directives
    manually. And for `__resolveReference`, we use `@merge` directive to mark a root field as an
    entity resolver for Federation
  - Use additional `@source` directive to consume transforms on the subgraph execution (field
    renames etc)
  - Use additional `@resolveTo` directive to consume additional stitched resolvers
  - Use additional `@transport` directive to choose and configure a specific transport for subgraphs
  - Handle unsupported additional directives with another set of additional directives on `Query`
    for example directives on unions, schema definitions, enum values etc and then
    `@extraUnionDirective` added with missing directives for unions then on the runtime these
    directives are added back to the union for the subgraph execution of the transports.

  Basically Mesh Compose uses Federation spec for composition, validation and runtime BUT the output
  is a superset with these additional directives imported via `@composeDirective`;
  - `@merge` (Taken from Stitching Directives) If a custom entity resolver is defined for a root
    field like below, the gateway will pick it up as an entity resolver;

  ```graphql
  type Query {
     fooById(id: ID!): Foo @merge(keyField: 'id', keyArg: 'id', subgraph: Foo)
  }
  ```

  - `@resolveTo` (Taken from v0) This allows to delegate to a field in any subgraph just like Schema
    Extensions in old Schema Stitching approach;

  ```graphql
      extend type Book {

          @resolveTo(
            sourceName: "authors"
            sourceTypeName: "Query"
            sourceFieldName: "authors"
            keyField: "authorId"
            keysArg: "ids"
          )
      }
  ```

  - `@source` Taken from Fusion This allows us to know how the original definition is in the
    subgraph. If this directive exists, the runtime applies the transforms from Schema Stitching
    during the subgraph execution. This directive can exist in arguments, fields, types etc.

  ```graphql
  type Query {
   @source(type: "MyUser") # This means `User` is actually `MyUser` in the actual subgraph
  }

  type User @source(name: "MyUser") {
    id: ID
    name: String
  }
  ```

  - `@transport` Taken from Fusion This allows us to choose a specific transport (rest, mysql,
    graphql-ws, graphql-http etc) for the subgraph execution with some configuration. In the
    runtime, the gateway loads the transports and passes the subgraph schema with annotations if
    needed to get an executor to execute queries against that subgraph.

  ```graphql
  schema @transport(subgraph: "API", kind: "rest", location: "http://0.0.0.0:<api_port>") {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
  ```

  - `@extraSchemaDefinitionDirective` By default, it is not possible to add directives from subgraph
    to the supergraph but it is possible to do the same thing on types or fields. So we add this
    directive to `Query` for the directives we want to add to the schema. Then the runtime picks
    those per `subgraph` to put the directives back to their original places;

  ```graphql
  type Query @extraSchemaDefinitionDirective(
    directives: {transport: [{subgraph: "petstore", kind: "rest", location: "http://0.0.0.0:<petstore_port>/api/v3"}]}
  )  {
  ```

  - `@extraEnumValueDirective` and `@extraTypeDirective` Same for enum values and unions etc that
    are not supported by the composition library

  > Thanks to these directives, subgraphs can be published individually to Hive for example then the
  > supergraph stored there can be handled by Mesh Gateway since the composition is the same. All
  > the additions etc are done on the subgraph level. For the Fed gateways except Mesh Serve,
  > subgraphs can be served individually by Mesh Serve again while they are consumed by any gw like
  > Apollo Router Shareable is enabled by default for non-federated subgraphs

  Documentation PR has details for users; https://github.com/ardatan/graphql-mesh/pull/7109

- Updated dependencies
  [[`f985978`](https://github.com/ardatan/graphql-mesh/commit/f9859784ad854207e4d32bda11c904b5301610ee),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)]:
  - @graphql-mesh/utils@0.98.9

## 0.0.6

### Patch Changes

- [#7009](https://github.com/ardatan/graphql-mesh/pull/7009)
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/utils@^0.98.6` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.98.6)
    (to `dependencies`)
  - Added dependency
    [`graphql-scalars@^1.23.0` ↗︎](https://www.npmjs.com/package/graphql-scalars/v/1.23.0) (to
    `dependencies`)
  - Added dependency [`minimatch@^9.0.0` ↗︎](https://www.npmjs.com/package/minimatch/v/9.0.0) (to
    `dependencies`)

- [#7009](https://github.com/ardatan/graphql-mesh/pull/7009)
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0)
  Thanks [@ardatan](https://github.com/ardatan)! - Implement declarative transforms

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `Disposable` pattern for plugins and
  transports

- [#7009](https://github.com/ardatan/graphql-mesh/pull/7009)
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0)
  Thanks [@User](https://github.com/User)! - Respect existing transformation done in the given
  subgraph schema

  If the given subgraph has the transformed elements with `@source` directive, then the composition
  should respect it;

  ```graphql
  type Query {
   @source(type: "MyUser") # This means `User` is actually `MyUser` in the actual subgraph
  }

  type User @source(name: "MyUser") {
    id: ID
    name: String
  }
  ```

- Updated dependencies
  [[`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/utils@0.98.8

## 0.0.5

### Patch Changes

- [#7030](https://github.com/ardatan/graphql-mesh/pull/7030)
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.4)
    (from `^10.0.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.1)
    (from `^10.2.0`, in `dependencies`)

## 0.0.4

### Patch Changes

- [`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

## 0.0.3

### Patch Changes

- [#6872](https://github.com/ardatan/graphql-mesh/pull/6872)
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency [`pascal-case@^3.0.0` ↗︎](https://www.npmjs.com/package/pascal-case/v/3.0.0)
    (from `dependencies`)

## 0.0.2

### Patch Changes

- [#6602](https://github.com/ardatan/graphql-mesh/pull/6602)
  [`915b8f8`](https://github.com/ardatan/graphql-mesh/commit/915b8f8e56edc22515ca99e396f1c9d3b4e904b9)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency [`pluralize@^8.0.0` ↗︎](https://www.npmjs.com/package/pluralize/v/8.0.0) (to
    `dependencies`)

- [#6602](https://github.com/ardatan/graphql-mesh/pull/6602)
  [`915b8f8`](https://github.com/ardatan/graphql-mesh/commit/915b8f8e56edc22515ca99e396f1c9d3b4e904b9)
  Thanks [@ardatan](https://github.com/ardatan)! - Support `where.id_in` API (Graph Node subgraphs)

## 0.0.1

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - New Fusion packages
