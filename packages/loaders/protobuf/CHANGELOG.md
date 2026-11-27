# @omnigraph/grpc

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

- [#9745](https://github.com/ardatan/graphql-mesh/pull/9745)
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d)
  Thanks [@ardatan](https://github.com/ardatan)! - See `.changeset/node22-yoga6-shared.md` for the
  shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub
  replaced by disposables, promise helpers).

  ## Motivation

  Invalid `includeDirs` used `return Promise.reject` . Throwing matches other Omnigraph loaders.

  ## What changed ()
  - Invalid `includeDirs` throws instead of `return Promise.reject`

  ## How to migrate

  Prefer try/catch around `loadGraphQLSchemaFromGrpc`.

  #### Example

  ```ts
  import { loadGraphQLSchemaFromGrpc } from '@omnigraph/protobuf'

  const schema = await loadGraphQLSchemaFromGrpc('Grpc', {
    source: './service.proto',
    endpoint: 'localhost:50051'
  })
  ```

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

- [#9745](https://github.com/ardatan/graphql-mesh/pull/9745)
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^13.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/13.2.1)
    (from `^12.1.0`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.1.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.1.0)
    (from `^0.0.6`, in `dependencies`)
  - Added dependency
    [`@graphql-hive/logger@^1.1.1` ↗︎](https://www.npmjs.com/package/@graphql-hive/logger/v/1.1.1)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/load-files@^8.0.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/load-files/v/8.0.8)
    (to `dependencies`)
  - Removed dependency [`globby@^11.1.0` ↗︎](https://www.npmjs.com/package/globby/v/11.1.0) (from
    `dependencies`)
  - Updated dependency
    [`graphql@^16.0.0 || ^17.0.0` ↗︎](https://www.npmjs.com/package/graphql/v/16.0.0) (from `*`, in
    `peerDependencies`)

- [#9747](https://github.com/ardatan/graphql-mesh/pull/9747)
  [`d80446d`](https://github.com/ardatan/graphql-mesh/commit/d80446d2ce4111fdcb329fedd2652800e53ecf8f)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^1.1.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.1.1)
    (from `^1.0.20`, in `dependencies`)

- [#9770](https://github.com/ardatan/graphql-mesh/pull/9770)
  [`7431a2e`](https://github.com/ardatan/graphql-mesh/commit/7431a2eb3470878ace0e6ef126179f703f1b2618)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`protobufjs@^8.8.1` ↗︎](https://www.npmjs.com/package/protobufjs/v/8.8.1)
    (from `^7.6.5`, in `dependencies`)

- [#9771](https://github.com/ardatan/graphql-mesh/pull/9771)
  [`a2fc2be`](https://github.com/ardatan/graphql-mesh/commit/a2fc2be8178c5f8052e4f3b9ec04bc068caaef66)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`graphql-compose@^9.3.0` ↗︎](https://www.npmjs.com/package/graphql-compose/v/9.3.0) (from
    `^9.1.0`, in `dependencies`)

- [#9775](https://github.com/ardatan/graphql-mesh/pull/9775)
  [`720a8a5`](https://github.com/ardatan/graphql-mesh/commit/720a8a576a2467d2243b1ea81319cb3e815e3c28)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/cross-helpers@^0.4.18` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.18)
    (to `dependencies`)

- [#9804](https://github.com/ardatan/graphql-mesh/pull/9804)
  [`06a77f4`](https://github.com/ardatan/graphql-mesh/commit/06a77f419a2574fa77b63b7ac84c3b446344d332)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^13.2.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/13.2.2)
    (from `^13.2.1`, in `dependencies`)

- [#9807](https://github.com/ardatan/graphql-mesh/pull/9807)
  [`c472c2f`](https://github.com/ardatan/graphql-mesh/commit/c472c2f0f57655cefcafcd82ec448500895b982c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/utils@^0.107.3` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.107.3)
    (to `dependencies`)

- [#9820](https://github.com/ardatan/graphql-mesh/pull/9820)
  [`493d5ff`](https://github.com/ardatan/graphql-mesh/commit/493d5ffa5bceeb1fc2ec0b4c6584ba66d8181183)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^1.1.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.1.2)
    (from `^1.1.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/load-files@^8.0.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/load-files/v/8.0.9)
    (from `^8.0.8`, in `dependencies`)

- [#9856](https://github.com/ardatan/graphql-mesh/pull/9856)
  [`6aac64d`](https://github.com/ardatan/graphql-mesh/commit/6aac64dd64ccd396285e52e3db9e2f07b07fbf21)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/logger@^1.2.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/logger/v/1.2.0)
    (from `^1.1.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/transport-common@^1.1.3` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.1.3)
    (from `^1.1.2`, in `dependencies`)

- [#9860](https://github.com/ardatan/graphql-mesh/pull/9860)
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^2.0.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/2.0.0)
    (from `^1.1.3`, in `dependencies`)

- [#9868](https://github.com/ardatan/graphql-mesh/pull/9868)
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^13.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/13.2.3)
    (from `^13.2.2`, in `dependencies`)

- [#9890](https://github.com/ardatan/graphql-mesh/pull/9890)
  [`d7d6055`](https://github.com/ardatan/graphql-mesh/commit/d7d605581f2324c563a0b0f4e998915528dacbae)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/logger@^2.0.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/logger/v/2.0.0)
    (from `^1.2.0`, in `dependencies`)
- Updated dependencies
  [[`06a77f4`](https://github.com/ardatan/graphql-mesh/commit/06a77f419a2574fa77b63b7ac84c3b446344d332),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`a0fdd49`](https://github.com/ardatan/graphql-mesh/commit/a0fdd497a2e5af00f395a5a999bfab31aec12e6d),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
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
  [`f9b41bc`](https://github.com/ardatan/graphql-mesh/commit/f9b41bc23325f130e39244b1748ba4e7eecd2b4f),
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`dc79228`](https://github.com/ardatan/graphql-mesh/commit/dc792289aca741ff81449c996ea38d50a5cb22cf),
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca),
  [`1b57413`](https://github.com/ardatan/graphql-mesh/commit/1b574137cd68ab82e33a2ad51a7501c67c8cd8fd)]:
  - @graphql-mesh/cross-helpers@0.4.19
  - @graphql-mesh/string-interpolation@0.6.0
  - @graphql-mesh/transport-common@3.0.0
  - @graphql-mesh/utils@1.0.0

## 0.3.2

### Patch Changes

- [#9682](https://github.com/ardatan/graphql-mesh/pull/9682)
  [`4b92af0`](https://github.com/ardatan/graphql-mesh/commit/4b92af01c10d1d746dfb1623491282c169e03248)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^12.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.0.4)
    (from `^12.0.3`, in `dependencies`)
- Updated dependencies
  [[`4b92af0`](https://github.com/ardatan/graphql-mesh/commit/4b92af01c10d1d746dfb1623491282c169e03248)]:
  - @graphql-mesh/cross-helpers@0.4.18

## 0.3.1

### Patch Changes

- [#9672](https://github.com/ardatan/graphql-mesh/pull/9672)
  [`8e55954`](https://github.com/ardatan/graphql-mesh/commit/8e559541eaa17d115fdd1bd18f94c009c07a0030)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@grpc/grpc-js@^1.14.5` ↗︎](https://www.npmjs.com/package/@grpc/grpc-js/v/1.14.5) (from
    `^1.14.4`, in `dependencies`)

- [#9678](https://github.com/ardatan/graphql-mesh/pull/9678)
  [`3bdb714`](https://github.com/ardatan/graphql-mesh/commit/3bdb7143f11aba6e2855d7c1cc479d8fe749798c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^12.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.0.3)
    (from `^11.2.2`, in `dependencies`)
- Updated dependencies
  [[`3bdb714`](https://github.com/ardatan/graphql-mesh/commit/3bdb7143f11aba6e2855d7c1cc479d8fe749798c)]:
  - @graphql-mesh/cross-helpers@0.4.17

## 0.3.0

### Minor Changes

- [#9650](https://github.com/ardatan/graphql-mesh/pull/9650)
  [`c7f0f3f`](https://github.com/ardatan/graphql-mesh/commit/c7f0f3f264a2f50d2b949b1bff2c8af44b38465d)
  Thanks [@ardatan](https://github.com/ardatan)! - gRPC: pass `channelOptions` through to the gRPC
  client

  Use this for message size limits, keepalive, and other
  [channel args](https://grpc.github.io/grpc/core/group__grpc__arg__keys.html). Options are stored
  as entries so dotted keys like `grpc.max_receive_message_length` stay GraphQL-safe in the composed
  schema.

  ```ts
  import { defineConfig } from '@graphql-mesh/compose-cli'
  import loadGrpcSubgraph from '@omnigraph/grpc'

  export const composeConfig = defineConfig({
    subgraphs: [
      {
        sourceHandler: loadGrpcSubgraph('MyGrpcApi', {
          endpoint: 'localhost:50051',
          channelOptions: {
            'grpc.max_receive_message_length': 10_000_000,
            'grpc.keepalive_time_ms': 10_000,
            'grpc.keepalive_timeout_ms': 5_000,
            'grpc.keepalive_permit_without_calls': 1
          }
        })
      }
    ]
  })
  ```

  Legacy Mesh:

  ```yaml
  sources:
    - name: MyGrpcApi
      handler:
        grpc:
          endpoint: localhost:50051
          channelOptions:
            grpc.max_receive_message_length: 10000000
            grpc.keepalive_time_ms: 10000
  ```

- [#9650](https://github.com/ardatan/graphql-mesh/pull/9650)
  [`c7f0f3f`](https://github.com/ardatan/graphql-mesh/commit/c7f0f3f264a2f50d2b949b1bff2c8af44b38465d)
  Thanks [@ardatan](https://github.com/ardatan)! - gRPC: add `reflectionMetadata` for
  server-reflection requests

  Send routing / auth metadata only when loading the schema via gRPC reflection (no `source`).
  Runtime RPC metadata remains `metaData`; HTTP headers for a remote `.graphql` SDL remain
  `schemaHeaders`.

  ```ts
  import { defineConfig } from '@graphql-mesh/compose-cli'
  import loadGrpcSubgraph from '@omnigraph/grpc'

  export const composeConfig = defineConfig({
    subgraphs: [
      {
        sourceHandler: loadGrpcSubgraph('MyGrpcApi', {
          endpoint: 'localhost:50051',
          // No `source` → schema loaded via reflection
          reflectionMetadata: {
            'grpc-service': 'proto.MyGrpcService',
            authorization: 'Bearer {env.REFLECTION_TOKEN}'
          }
        })
      }
    ]
  })
  ```

  Legacy Mesh:

  ```yaml
  sources:
    - name: MyGrpcApi
      handler:
        grpc:
          endpoint: localhost:50051
          reflectionMetadata:
            grpc-service: proto.MyGrpcService
            authorization: 'Bearer {env.REFLECTION_TOKEN}'
  ```

- [#9650](https://github.com/ardatan/graphql-mesh/pull/9650)
  [`c7f0f3f`](https://github.com/ardatan/graphql-mesh/commit/c7f0f3f264a2f50d2b949b1bff2c8af44b38465d)
  Thanks [@ardatan](https://github.com/ardatan)! - gRPC: apply `requestTimeout` as a real per-call
  deadline

  Previously `requestTimeout` was not enforced as a gRPC deadline, so a hung upstream could leave
  the GraphQL request waiting indefinitely. It is now set on each call via `CallOptions.deadline`
  (`Date.now() + requestTimeout`).

  ```ts
  import { defineConfig } from '@graphql-mesh/compose-cli'
  import loadGrpcSubgraph from '@omnigraph/grpc'

  export const composeConfig = defineConfig({
    subgraphs: [
      {
        sourceHandler: loadGrpcSubgraph('MyGrpcApi', {
          endpoint: 'localhost:50051',
          // Fail the call if the server does not respond within 5s
          requestTimeout: 5000
        })
      }
    ]
  })
  ```

  Legacy Mesh:

  ```yaml
  sources:
    - name: MyGrpcApi
      handler:
        grpc:
          endpoint: localhost:50051
          requestTimeout: 5000
  ```

### Patch Changes

- [#9650](https://github.com/ardatan/graphql-mesh/pull/9650)
  [`c7f0f3f`](https://github.com/ardatan/graphql-mesh/commit/c7f0f3f264a2f50d2b949b1bff2c8af44b38465d)
  Thanks [@ardatan](https://github.com/ardatan)! - gRPC: treat missing or empty `source` as
  reflection

  Omitting `source`, setting it to `''`, or using `{ file: '' }` now correctly falls back to gRPC
  server reflection instead of failing to load a proto/descriptor.

  ```ts
  import { defineConfig } from '@graphql-mesh/compose-cli'
  import loadGrpcSubgraph from '@omnigraph/grpc'

  export const composeConfig = defineConfig({
    subgraphs: [
      {
        sourceHandler: loadGrpcSubgraph('MyGrpcApi', {
          endpoint: 'localhost:50051'
          // source omitted → reflection
        })
      }
    ]
  })
  ```

  Legacy Mesh (empty file path also reflects):

  ```yaml
  sources:
    - name: MyGrpcApi
      handler:
        grpc:
          endpoint: localhost:50051
          # source omitted or empty → reflection
  ```

## 0.2.28

### Patch Changes

- [#9611](https://github.com/ardatan/graphql-mesh/pull/9611)
  [`cb846cb`](https://github.com/ardatan/graphql-mesh/commit/cb846cb178c7c5b8f8600ad9f23d12cb5092701c)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^1.0.20` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.0.20)
    (from `^1.0.19`, in `dependencies`)

## 0.2.27

### Patch Changes

- [#9586](https://github.com/ardatan/graphql-mesh/pull/9586)
  [`096ed33`](https://github.com/ardatan/graphql-mesh/commit/096ed338832c305aa88ccb2d154c1270d05e4b08)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^1.0.19` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.0.19)
    (from `^1.0.17`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^11.2.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.2.2)
    (from `^11.2.0`, in `dependencies`)
- Updated dependencies
  [[`096ed33`](https://github.com/ardatan/graphql-mesh/commit/096ed338832c305aa88ccb2d154c1270d05e4b08)]:
  - @graphql-mesh/cross-helpers@0.4.16

## 0.2.26

### Patch Changes

- [#9583](https://github.com/ardatan/graphql-mesh/pull/9583)
  [`478676c`](https://github.com/ardatan/graphql-mesh/commit/478676c5f97caad1b11bec1a4a0270cf76736623)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`protobufjs@^7.6.5` ↗︎](https://www.npmjs.com/package/protobufjs/v/7.6.5)
    (from `^7.6.3`, in `dependencies`)

- [#9583](https://github.com/ardatan/graphql-mesh/pull/9583)
  [`478676c`](https://github.com/ardatan/graphql-mesh/commit/478676c5f97caad1b11bec1a4a0270cf76736623)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`protobufjs@^7.6.5` ↗︎](https://www.npmjs.com/package/protobufjs/v/7.6.5)
    (from `^7.6.3`, in `dependencies`)

## 0.2.25

### Patch Changes

- [#9465](https://github.com/ardatan/graphql-mesh/pull/9465)
  [`eece882`](https://github.com/ardatan/graphql-mesh/commit/eece8825bacc70210ca0b9d88b91da4ab7ae5cf9)
  Thanks [@zcag](https://github.com/zcag)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/string-interpolation@^0.5.17` ↗︎](https://www.npmjs.com/package/@graphql-mesh/string-interpolation/v/0.5.17)
    (from `^0.5.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^11.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.1.1)
    (from `^11.1.0`, in `dependencies`)
  - Updated dependency
    [`@grpc/grpc-js@^1.14.4` ↗︎](https://www.npmjs.com/package/@grpc/grpc-js/v/1.14.4) (from
    `^1.14.3`, in `dependencies`)
  - Updated dependency [`protobufjs@^7.6.3` ↗︎](https://www.npmjs.com/package/protobufjs/v/7.6.3)
    (from `^8.0.2`, in `dependencies`)

- [#9525](https://github.com/ardatan/graphql-mesh/pull/9525)
  [`f0036d4`](https://github.com/ardatan/graphql-mesh/commit/f0036d45ebbb4bd9efe53a9e326a45ae676f9b29)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`protobufjs@^7.6.3` ↗︎](https://www.npmjs.com/package/protobufjs/v/7.6.3)
    (from `^7.5.8`, in `dependencies`)

- [#9530](https://github.com/ardatan/graphql-mesh/pull/9530)
  [`6282a71`](https://github.com/ardatan/graphql-mesh/commit/6282a71a56fe3d640e8d84f3459ad2ad7ab1edad)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^11.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.1.1)
    (from `^11.1.0`, in `dependencies`)

- [#9547](https://github.com/ardatan/graphql-mesh/pull/9547)
  [`b28d9ec`](https://github.com/ardatan/graphql-mesh/commit/b28d9ec67ace89503fda762049b09111409b43bd)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^1.0.17` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.0.17)
    (from `^1.0.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^11.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.2.0)
    (from `^11.1.1`, in `dependencies`)
- Updated dependencies
  [[`eece882`](https://github.com/ardatan/graphql-mesh/commit/eece8825bacc70210ca0b9d88b91da4ab7ae5cf9),
  [`6282a71`](https://github.com/ardatan/graphql-mesh/commit/6282a71a56fe3d640e8d84f3459ad2ad7ab1edad),
  [`b28d9ec`](https://github.com/ardatan/graphql-mesh/commit/b28d9ec67ace89503fda762049b09111409b43bd),
  [`eece882`](https://github.com/ardatan/graphql-mesh/commit/eece8825bacc70210ca0b9d88b91da4ab7ae5cf9)]:
  - @graphql-mesh/cross-helpers@0.4.15
  - @graphql-mesh/string-interpolation@0.5.18

## 0.2.24

### Patch Changes

- [#9502](https://github.com/ardatan/graphql-mesh/pull/9502)
  [`679ee60`](https://github.com/ardatan/graphql-mesh/commit/679ee60c2b09f85655c9a58344e2544c5137c75a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@grpc/grpc-js@^1.14.4` ↗︎](https://www.npmjs.com/package/@grpc/grpc-js/v/1.14.4) (from
    `^1.14.3`, in `dependencies`)

- [#9503](https://github.com/ardatan/graphql-mesh/pull/9503)
  [`69a8aac`](https://github.com/ardatan/graphql-mesh/commit/69a8aacd0566879cbd6fe806de3dfd43635f43d6)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`protobufjs@^7.5.8` ↗︎](https://www.npmjs.com/package/protobufjs/v/7.5.8)
    (from `^8.0.2`, in `dependencies`)
- Updated dependencies
  [[`06c0dee`](https://github.com/ardatan/graphql-mesh/commit/06c0deed78c53a092b423a8ca360515105127d10)]:
  - @graphql-mesh/string-interpolation@0.5.17

## 0.2.23

### Patch Changes

- [#9455](https://github.com/ardatan/graphql-mesh/pull/9455)
  [`b370a6e`](https://github.com/ardatan/graphql-mesh/commit/b370a6e58d0a2f9ae6cf73cec30bbcd73bd9b933)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`protobufjs@^8.0.2` ↗︎](https://www.npmjs.com/package/protobufjs/v/8.0.2)
    (from `^8.0.1`, in `dependencies`)

## 0.2.22

### Patch Changes

- [#9430](https://github.com/ardatan/graphql-mesh/pull/9430)
  [`8c7b764`](https://github.com/ardatan/graphql-mesh/commit/8c7b764dbd84356244f6e84dc36b7a3c1fc37a71)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^1.0.16` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.0.16)
    (from `^1.0.15`, in `dependencies`)

- [#9446](https://github.com/ardatan/graphql-mesh/pull/9446)
  [`6943e28`](https://github.com/ardatan/graphql-mesh/commit/6943e284f107bfb2f3cd958258a6f5402a366ab4)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^11.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.1.0)
    (from `^11.0.1`, in `dependencies`)
- Updated dependencies
  [[`6943e28`](https://github.com/ardatan/graphql-mesh/commit/6943e284f107bfb2f3cd958258a6f5402a366ab4)]:
  - @graphql-mesh/cross-helpers@0.4.14

## 0.2.21

### Patch Changes

- [#9406](https://github.com/ardatan/graphql-mesh/pull/9406)
  [`af31a59`](https://github.com/ardatan/graphql-mesh/commit/af31a59b2aaa7aabda3ea566e0c0c063b98c87c5)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^11.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.0.1)
    (from `^11.0.0`, in `dependencies`)
- Updated dependencies
  [[`af31a59`](https://github.com/ardatan/graphql-mesh/commit/af31a59b2aaa7aabda3ea566e0c0c063b98c87c5)]:
  - @graphql-mesh/cross-helpers@0.4.13

## 0.2.20

### Patch Changes

- [#9396](https://github.com/ardatan/graphql-mesh/pull/9396)
  [`5904514`](https://github.com/ardatan/graphql-mesh/commit/5904514273b0d29fc4581bbddf082b392175640a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`protobufjs@^8.0.1` ↗︎](https://www.npmjs.com/package/protobufjs/v/8.0.1)
    (from `^8.0.0`, in `dependencies`)

## 0.2.19

### Patch Changes

- Updated dependencies
  [[`94fbfbd`](https://github.com/ardatan/graphql-mesh/commit/94fbfbd41d56cfba3d11a7c3dc21b200a1f89069)]:
  - @graphql-mesh/string-interpolation@0.5.16

## 0.2.18

### Patch Changes

- Updated dependencies
  [[`339c32c`](https://github.com/ardatan/graphql-mesh/commit/339c32c44b5dfbc810c0cf3455b2ff068b5c5b00)]:
  - @graphql-mesh/string-interpolation@0.5.15

## 0.2.17

### Patch Changes

- Updated dependencies
  [[`3ad6a00`](https://github.com/ardatan/graphql-mesh/commit/3ad6a005a9daa1f93a4286dc3d240acd1059f53f)]:
  - @graphql-mesh/string-interpolation@0.5.14

## 0.2.16

### Patch Changes

- Updated dependencies
  [[`13af2ff`](https://github.com/ardatan/graphql-mesh/commit/13af2ff997cc63953ff50198d1851f8b7101c292)]:
  - @graphql-mesh/string-interpolation@0.5.13

## 0.2.15

### Patch Changes

- Updated dependencies
  [[`5d38d11`](https://github.com/ardatan/graphql-mesh/commit/5d38d11174172e27f3f0fd7588a83d481117d96c)]:
  - @graphql-mesh/string-interpolation@0.5.12

## 0.2.14

### Patch Changes

- [#9267](https://github.com/ardatan/graphql-mesh/pull/9267)
  [`0664ddb`](https://github.com/ardatan/graphql-mesh/commit/0664ddba78476e90f38560b55fcb88410cdfa72d)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^1.0.15` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.0.15)
    (from `^1.0.14`, in `dependencies`)

## 0.2.13

### Patch Changes

- [#9182](https://github.com/ardatan/graphql-mesh/pull/9182)
  [`1474343`](https://github.com/ardatan/graphql-mesh/commit/1474343567f953c97493e2da48de4f27f0bd109c)
  Thanks [@ardatan](https://github.com/ardatan)! - Support characters that are invalid for GraphQL
  but valid for gRPC in metadata definitions.

  For example, hyphens (-) are not allowed in GraphQL field names, but they are commonly used in
  gRPC metadata keys. This change ensures that such characters are preserved when passing metadata
  from GraphQL Mesh to gRPC services.

  ```ts
  // mesh.config.ts
  import { defineConfig } from '@graphql-mesh/compose-cli'
  import { loadGrpcSubgraph } from '@omnigraph/grpc'

  export const composeConfig = defineConfig({
    subgraphs: [
      {
        sourceHandler: loadGrpcSubgraph('myService', {
          endpoint: 'localhost:50051',
          source: './service.proto',
          metaData: {
            'x-request-id': "{context.headers['x-request-id']}" // ← hyphen in key causes issue
          }
        })
      }
    ]
  })
  ```

## 0.2.12

### Patch Changes

- [#9153](https://github.com/ardatan/graphql-mesh/pull/9153)
  [`2410c44`](https://github.com/ardatan/graphql-mesh/commit/2410c44712ecc0d2e3f7eaaa03d854a32dc847de)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^1.0.14` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.0.14)
    (from `^1.0.13`, in `dependencies`)
- Updated dependencies
  [[`0028f3b`](https://github.com/ardatan/graphql-mesh/commit/0028f3bf555488ac91d3d92ac9bb33911fb79904)]:
  - @graphql-mesh/string-interpolation@0.5.11

## 0.2.11

### Patch Changes

- [#9120](https://github.com/ardatan/graphql-mesh/pull/9120)
  [`c219668`](https://github.com/ardatan/graphql-mesh/commit/c219668be72a56f0400a3086fe5144604b7ae948)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^11.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.0.0)
    (from `^10.11.0`, in `dependencies`)

- [#9129](https://github.com/ardatan/graphql-mesh/pull/9129)
  [`3f91b5a`](https://github.com/ardatan/graphql-mesh/commit/3f91b5a5ca6dcb470e0e3897dd96c607f6e358c8)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^1.0.13` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.0.13)
    (from `^1.0.0`, in `dependencies`)
- Updated dependencies
  [[`c219668`](https://github.com/ardatan/graphql-mesh/commit/c219668be72a56f0400a3086fe5144604b7ae948)]:
  - @graphql-mesh/cross-helpers@0.4.12

## 0.2.10

### Patch Changes

- Updated dependencies
  [[`30e8e32`](https://github.com/ardatan/graphql-mesh/commit/30e8e324ca3e011530c3d6f61856f6dd69b582e9)]:
  - @graphql-mesh/string-interpolation@0.5.10

## 0.2.9

### Patch Changes

- [#9066](https://github.com/ardatan/graphql-mesh/pull/9066)
  [`2b1c3ae`](https://github.com/ardatan/graphql-mesh/commit/2b1c3ae0dd9b470a9779d0eaa78df4b6989ac5bc)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@grpc/grpc-js@^1.14.3` ↗︎](https://www.npmjs.com/package/@grpc/grpc-js/v/1.14.3) (from
    `^1.14.2`, in `dependencies`)

- [#9100](https://github.com/ardatan/graphql-mesh/pull/9100)
  [`81f5680`](https://github.com/ardatan/graphql-mesh/commit/81f5680e667099ea92367f25985fe4119a97272a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`protobufjs@^8.0.0` ↗︎](https://www.npmjs.com/package/protobufjs/v/8.0.0)
    (from `^7.2.5`, in `dependencies`)

## 0.2.8

### Patch Changes

- [#9027](https://github.com/ardatan/graphql-mesh/pull/9027)
  [`72c443c`](https://github.com/ardatan/graphql-mesh/commit/72c443c0a2246c1573c72522d5ee7b6955f515d2)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.11.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.11.0)
    (from `^10.8.0`, in `dependencies`)

- [#9037](https://github.com/ardatan/graphql-mesh/pull/9037)
  [`7c0b01e`](https://github.com/ardatan/graphql-mesh/commit/7c0b01e01b61853feb95ae5b5c4045507c5def1c)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@grpc/grpc-js@^1.14.2` ↗︎](https://www.npmjs.com/package/@grpc/grpc-js/v/1.14.2) (from
    `^1.1.7`, in `dependencies`)
- Updated dependencies
  [[`72c443c`](https://github.com/ardatan/graphql-mesh/commit/72c443c0a2246c1573c72522d5ee7b6955f515d2)]:
  - @graphql-mesh/cross-helpers@0.4.11

## 0.2.7

### Patch Changes

- [#8745](https://github.com/ardatan/graphql-mesh/pull/8745)
  [`dfc6bc1`](https://github.com/ardatan/graphql-mesh/commit/dfc6bc10769092e6e44bf93a516f8d4e3dd1c681)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^1.0.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.0.0)
    (from `^0.7.13`, in `dependencies`)
- Updated dependencies
  [[`f7ce86c`](https://github.com/ardatan/graphql-mesh/commit/f7ce86c86a170dc62ac88caea4a6ad6979249571)]:
  - @graphql-mesh/string-interpolation@0.5.9

## 0.2.6

### Patch Changes

- [`84d2038`](https://github.com/ardatan/graphql-mesh/commit/84d2038b18d4a82b46a2ebdfbb06cfa791835631)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve gRPC compat

## 0.2.5

### Patch Changes

- [#8433](https://github.com/ardatan/graphql-mesh/pull/8433)
  [`903124f`](https://github.com/ardatan/graphql-mesh/commit/903124f8245a518aac50ef8d0eff2fef01a206f2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.6` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.6)
    (from `^0.0.5`, in `dependencies`)

## 0.2.4

### Patch Changes

- [#8375](https://github.com/ardatan/graphql-mesh/pull/8375)
  [`b44f8b7`](https://github.com/ardatan/graphql-mesh/commit/b44f8b7a413c8adb213b22fb8a243ca6aa06d2bd)
  Thanks [@ardatan](https://github.com/ardatan)! - More clear key-value pairs in the logs

## 0.2.3

### Patch Changes

- [#8362](https://github.com/ardatan/graphql-mesh/pull/8362)
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.0)
    (from `^10.6.0`, in `dependencies`)
- Updated dependencies
  [[`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)]:
  - @graphql-mesh/cross-helpers@0.4.10

## 0.2.2

### Patch Changes

- [#8289](https://github.com/ardatan/graphql-mesh/pull/8289)
  [`c54e361`](https://github.com/ardatan/graphql-mesh/commit/c54e36110256541e03380b0d537085848169116b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency [`micromatch@^4.0.8` ↗︎](https://www.npmjs.com/package/micromatch/v/4.0.8) (to
    `dependencies`)

- [#8289](https://github.com/ardatan/graphql-mesh/pull/8289)
  [`c54e361`](https://github.com/ardatan/graphql-mesh/commit/c54e36110256541e03380b0d537085848169116b)
  Thanks [@ardatan](https://github.com/ardatan)! - New option `selectQueryOrMutationField` to decide
  which field belongs to which root type explicitly.

  ```ts filename="mesh.config.ts"
  import { defineConfig } from '@graphql-mesh/compose-cli'
  import loadGrpcSubgraph from '@omnigraph/grpc'

  export const composeConfig = defineConfig({
    subgraphs: [
      {
        sourceHandler: loadGrpcSubgraph('MyGrpcApi', {
          /** .. **/

          // Prefix to collect Query method default: list, get
          prefixQueryMethod: ['list', 'get'],

          // Select certain fields as Query or Mutation
          // This overrides `prefixQueryMethod`
          selectQueryOrMutationField: [
            {
              // You can use a pattern matching with *
              fieldName: '*RetrieveMovies',
              type: 'Query'
            },
            // Or you can use a specific field name
            // This will make the field GetMovie available as a Mutation
            // Because it would be Query because of `prefixQueryMethod`
            {
              fieldName: 'GetMovie',
              type: 'Mutation'
            }
          ]
        })
      }
    ]
  })
  ```

- Updated dependencies
  [[`78c202e`](https://github.com/ardatan/graphql-mesh/commit/78c202ef8824607e27de1dcc5076c82a02ef86cd)]:
  - @graphql-mesh/string-interpolation@0.5.8

## 0.2.1

### Patch Changes

- [#8270](https://github.com/ardatan/graphql-mesh/pull/8270)
  [`d3656b6`](https://github.com/ardatan/graphql-mesh/commit/d3656b60fe47c74122e9dfad28273426b07b42ab)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`graphql-compose@^9.1.0` ↗︎](https://www.npmjs.com/package/graphql-compose/v/9.1.0) (from
    `^9.0.11`, in `dependencies`)

## 0.2.0

### Minor Changes

- [#8203](https://github.com/ardatan/graphql-mesh/pull/8203)
  [`c541164`](https://github.com/ardatan/graphql-mesh/commit/c541164f9d02fcc70389ee768610921ff0e622e6)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle multiple gRPC services correctly in a
  supergraph

  Previously multiple directives on Query type conflicting, which needs to be fixed on Gateway
  runtime later, but for now, it should be already in the transport directive. And this change fixes
  the issue before the gateway runtime fix.

  Generated schema will be different so this can be considered a breaking change but it will be no
  functional change for the existing users.

## 0.1.3

### Patch Changes

- Updated dependencies
  [[`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9),
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)]:
  - @graphql-mesh/cross-helpers@0.4.9
  - @graphql-mesh/string-interpolation@0.5.7

## 0.1.2

### Patch Changes

- [#7978](https://github.com/ardatan/graphql-mesh/pull/7978)
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (from `^10.5.5`, in `dependencies`)
- Updated dependencies
  [[`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)]:
  - @graphql-mesh/cross-helpers@0.4.8

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.7.13

## 0.1.0

### Minor Changes

- [#7866](https://github.com/ardatan/graphql-mesh/pull/7866)
  [`0788b5d`](https://github.com/ardatan/graphql-mesh/commit/0788b5d76b7439af804781a33cb3c065c524dd63)
  Thanks [@renovate](https://github.com/apps/renovate)! - Use shared TransportOptions scalar in all
  transport directive definitions

## 0.0.1

### Patch Changes

- Updated dependencies
  [[`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)]:
  - @graphql-mesh/transport-common@0.7.12
