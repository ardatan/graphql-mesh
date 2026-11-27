# @omnigraph/mongo

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
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`5c9bcea`](https://github.com/ardatan/graphql-mesh/commit/5c9bceafc25f6a039b26323f64934f22a7cb88f4),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`dc79228`](https://github.com/ardatan/graphql-mesh/commit/dc792289aca741ff81449c996ea38d50a5cb22cf),
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca),
  [`1b57413`](https://github.com/ardatan/graphql-mesh/commit/1b574137cd68ab82e33a2ad51a7501c67c8cd8fd)]:
  - @graphql-mesh/cross-helpers@0.4.19
  - @graphql-mesh/transport-mongo@1.0.0
  - @graphql-mesh/types@1.0.0
  - @graphql-mesh/utils@1.0.0

## 0.1.0

### Major Changes

- Initial draft: Mongoose bootstrap emits hand-writable `@mongo` SDL for
  `@graphql-mesh/transport-mongo` (`kind: "mongo"`). First slice covers `FIND_ONE` / `FIND_MANY` /
  `COUNT` with `where` + `selection`.
