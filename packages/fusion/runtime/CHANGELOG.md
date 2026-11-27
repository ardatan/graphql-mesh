# @graphql-mesh/fusion-runtime

## 3.0.0

### Major Changes

- [#9867](https://github.com/ardatan/graphql-mesh/pull/9867)
  [`c36d9b8`](https://github.com/ardatan/graphql-mesh/commit/c36d9b8930c971558cd7471c67edf0b3783d808c)
  Thanks [@ardatan](https://github.com/ardatan)! - Stitched Query and Mutation execution uses the
  planned backbone executor (plan once, then dataflow Fetch / Parallel / Sequence / Island /
  BatchFetch). Resolve-time `mergeFields` / leftover merge plans are no longer the stitched execute
  path.

  Field resolution on this path uses a slim `defaultMergedResolver` (alias / external value + local
  hydration). `onStitchedSchema` root overrides are planned as Islands.

  Subscriptions, `@defer`, `@stream`, and full SDL introspection (`__schema` / `__type`) still use
  schema execute until those operations are planned end-to-end.

  `@pubsubPublish` result handling and the `join__Graph` name map live in fusion-runtime (executor
  wrap + helpers) instead of mapping Mutation fields after stitch.

### Patch Changes

- [#9868](https://github.com/ardatan/graphql-mesh/pull/9868)
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^13.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/13.2.3)
    (from `^13.2.2`, in `dependencies`)

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

- [#9860](https://github.com/ardatan/graphql-mesh/pull/9860)
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc)
  Thanks [@ardatan](https://github.com/ardatan)! - Source of these packages moved from
  `graphql-hive/gateway` into this repo. npm names and import paths are unchanged. Hive Gateway will
  consume published versions from Mesh after cutover. Package-level federation benches live under
  `bench/federation`; Gateway e2e memtest/bench CI stays on the Gateway repo and continues to
  measure Gateway impact.

- Updated dependencies
  [[`06a77f4`](https://github.com/ardatan/graphql-mesh/commit/06a77f419a2574fa77b63b7ac84c3b446344d332),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
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
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`c36d9b8`](https://github.com/ardatan/graphql-mesh/commit/c36d9b8930c971558cd7471c67edf0b3783d808c),
  [`c36d9b8`](https://github.com/ardatan/graphql-mesh/commit/c36d9b8930c971558cd7471c67edf0b3783d808c),
  [`61da679`](https://github.com/ardatan/graphql-mesh/commit/61da679fc946374cbb6e18c9de1f4b158df9cc88),
  [`f9b41bc`](https://github.com/ardatan/graphql-mesh/commit/f9b41bc23325f130e39244b1748ba4e7eecd2b4f),
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`dc79228`](https://github.com/ardatan/graphql-mesh/commit/dc792289aca741ff81449c996ea38d50a5cb22cf),
  [`c1aa88e`](https://github.com/ardatan/graphql-mesh/commit/c1aa88eda5339764dbcc7a347ae6e459a61ff2ca),
  [`1b57413`](https://github.com/ardatan/graphql-mesh/commit/1b574137cd68ab82e33a2ad51a7501c67c8cd8fd)]:
  - @graphql-mesh/cross-helpers@0.4.19
  - @graphql-mesh/transport-common@3.0.0
  - @graphql-mesh/types@1.0.0
  - @graphql-mesh/utils@1.0.0
  - @graphql-tools/batch-execute@11.0.1
  - @graphql-tools/delegate@14.0.0
  - @graphql-tools/federation@6.0.0
  - @graphql-tools/stitch@12.0.0
  - @graphql-tools/stitching-directives@6.0.0
  - @graphql-tools/wrap@13.0.0

## 2.0.0

### Major Changes

- [#2670](https://github.com/graphql-hive/gateway/pull/2670)
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Drop GraphQL v15 (and older) support. Only
  GraphQL v16 and v17 are supported now.

  Upgrade to `graphql@^16` or `graphql@^17`. Hive Gateway packages require `graphql@^16.9.0` or
  later.

  `@graphql-tools/stitch` no longer reads legacy `#` comment descriptions (`commentDescriptions`,
  removed in GraphQL v16) from type definitions; use string descriptions (`"""..."""`) instead.

- [#2670](https://github.com/graphql-hive/gateway/pull/2670)
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Incremental delivery (`@defer` / `@stream`)
  Accept negotiation uses the shared `INCREMENTAL_DELIVERY_SPECS` table from `@graphql-tools/utils`.

  Client Accept (gateway responses) and upstream Accept (subgraph calls) are separate:

  | Direction                            | Default                                              | Force                                                                 |
  | ------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------- |
  | Client → Gateway (Yoga)              | Negotiate from `Accept`; echo spec on `Content-Type` | n/a (client-driven)                                                   |
  | Gateway → Subgraph (`executor-http`) | Bare `multipart/mixed` (no spec param)               | `incrementalSpec: 'v0.1' \| 'v0.2'` on executor or `ExecutionRequest` |

  | Spec     | Accept / Content-Type parameter        | Payload                                                      |
  | -------- | -------------------------------------- | ------------------------------------------------------------ |
  | `'v0.1'` | `multipart/mixed;deferSpec=20220824`   | `{ incremental: [{ path, label, data \| items }], hasNext }` |
  | `'v0.2'` | `multipart/mixed;incrementalSpec=v0.2` | `pending` / `id` / `subPath` / `completed`                   |

  `mergeIncrementalResult` merges both formats. Force `'v0.1'` when stitching `IncrementalReceiver`
  needs path/label patches. Client `Accept` is never copied onto upstream `Accept`.

- [#2670](https://github.com/graphql-hive/gateway/pull/2670)
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Drop Node.js 20 support. The minimum
  supported Node.js version is now 22.15.0.

  Upgrade to Node.js 22.15.0 or later.

- [#2670](https://github.com/graphql-hive/gateway/pull/2670)
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - **Breaking:** Remove the `onDelegationPlan`
  and `onDelegationStageExecute` plugin hooks (and the debug plugin that only existed for them).
  Those hooks blocked delegation-plan memoization and were rarely used.

  Delegation-plan memoization is restored with a parent field-presence seed key:

  - Types **without** computed / `@requires` field selections ignore parent shape and share one
    cached plan per `(schema, sourceSubschema, variables, fragments, fieldNodes)` tuple (same as the
    previous always-on `memoize5of7` path).
  - Types **with** `fieldSelectionSets` (computed / `@requires`) still memoize when parents expose
    the same fields, so list merges reuse plans without breaking clone-less requires.
  - Progressive override still skips memoize.

  `onDelegate` is unchanged.

  ### Migration

  Delete hook usage from gateway / fusion plugins:

  ```ts
  // before
  const gateway = createGatewayRuntime({
    supergraph,
    plugins: [
      {
        onDelegationPlan() {
          /* ... */
        },
        onDelegationStageExecute() {
          /* ... */
        }
      }
    ]
  })

  // after: remove those hooks
  const gateway = createGatewayRuntime({
    supergraph,
    plugins: [
      {
        onDelegate({ typeName, fieldName }) {
          // still supported for per-delegation instrumentation
        }
      }
    ]
  })
  ```

  If you relied on plan/stage hooks only for debugging, use existing logging / OpenTelemetry plugins
  instead. No stitchSchemas merge-config change is required for the memoize restore.

- [#2670](https://github.com/graphql-hive/gateway/pull/2670)
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Remove `TransportContext.logger`. Use
  `TransportContext.log` (`@graphql-hive/logger`) only.

- [#2670](https://github.com/graphql-hive/gateway/pull/2670)
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Align with GraphQL Yoga 6 / GraphQL Tools
  majors / whatwg-node: stop using removed helpers.

  | Removed                                        | Replacement                                                                               |
  | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
  | `createGraphQLError`                           | `new GraphQLError(...)`                                                                   |
  | `YogaLogger` / `createLogger` / `yoga.logger`  | `Logger` / `yoga.log`                                                                     |
  | `crypto` from `@whatwg-node/fetch`             | platform `crypto` (Node >=22.15); Gateway still exposes it on `fetchAPI` for Yoga 5 peers |
  | `mapMaybePromise` and related utils re-exports | `@whatwg-node/promise-helpers` (`handleMaybePromise`, …)                                  |
  | `createDeferred` / `createDeferredPromise`     | `Promise.withResolvers()`                                                                 |

  See [graphql-tools#8515](https://github.com/ardatan/graphql-tools/pull/8515) and
  [yoga#4623](https://github.com/graphql-hive/graphql-yoga/pull/4623).

### Minor Changes

- [#2768](https://github.com/graphql-hive/gateway/pull/2768)
  [`abde25d`](https://github.com/graphql-hive/gateway/commit/abde25d02f1cf0494210121b0aa6426513ac90e3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Run every subgraph fetch as soon as the
  fetches it needs data from are done

  The query plan now says which fetches each fetch waits for, so a fetch no longer waits for
  unrelated siblings. In `{ topProducts { inStock reviews { author { name } } } }`, the authors are
  fetched as soon as the reviews arrive, even when the stock is still loading.

  The router runtime also takes the entity keys, the possible types of abstract types and the shape
  of the response straight from the query planner, instead of working them out from the supergraph
  for every request.

  `@fromContext` fetches now respect a configurable alias limit. Such a fetch sends one aliased
  `_entities` field per group of distinct context values, so a subgraph that caps the aliases of an
  operation could reject it. With `maxAliasesPerRequest` the groups are split into as many requests
  as it takes to stay within the limit, like the Hive Router's `traffic_shaping`
  `max_aliases_per_request` does. There is no limit by default. Requests to a subgraph with a limit
  are not batched, because batching would merge the split requests back into one.

  ```ts
  import { defineConfig } from '@graphql-hive/gateway'

  export const gatewayConfig = defineConfig({
    // at most 15 aliases per request, and 4 for the accounts subgraph
    maxAliasesPerRequest: { '*': 15, accounts: 4 }
    // or the same limit for all subgraphs
    // maxAliasesPerRequest: 15,
  })
  ```

  The query planner decides how many groups go in one request now. Contextual arguments that are
  non-null are still fetched with one request per group.

  Other changes you may notice:

  - Query plans exposed through `onQueryPlan`, `extensions.queryPlan` and the shared query plan
    cache now include the shape of the response (`projection`), the `id` and `dependsOn` of every
    fetch, and the `completes` of every batch fetch.
  - Query plans in the shared cache are now kept per query planner version and alias limits. Plans
    cached by an earlier version or with other limits are not reused, they are planned again.
  - A custom scalar holding an object is replaced as a whole when two subgraphs return it for the
    same field, instead of being merged.
  - When two subgraphs return the same field, a `null` from one of them no longer overwrites the
    value from the other.

### Patch Changes

- Updated dependencies
  [[`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`4eb4a6c`](https://github.com/graphql-hive/gateway/commit/4eb4a6c89176a04a38ced9cd99608e6c639fd5ee),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)]:
  - @graphql-tools/stitch@11.0.0
  - @graphql-tools/delegate@13.0.0
  - @graphql-tools/batch-execute@11.0.0
  - @graphql-tools/federation@5.0.0
  - @graphql-tools/stitching-directives@5.0.0
  - @graphql-mesh/transport-common@2.0.0
  - @graphql-tools/wrap@12.0.0
  - @graphql-hive/logger@2.0.0

## 1.15.1

### Patch Changes

- Updated dependencies
  [[`a0bd5e8`](https://github.com/graphql-hive/gateway/commit/a0bd5e8882d04c1211c244adc991e62bb4e5c369)]:
  - @graphql-tools/delegate@12.3.6
  - @graphql-tools/federation@4.6.7
  - @graphql-tools/stitch@10.4.6
  - @graphql-tools/stitching-directives@4.1.8
  - @graphql-tools/wrap@11.2.8

## 1.15.0

### Minor Changes

- [#2774](https://github.com/graphql-hive/gateway/pull/2774)
  [`5cb2482`](https://github.com/graphql-hive/gateway/commit/5cb2482881397af69c81111f04797ff8adbc12c8)
  Thanks [@ardatan](https://github.com/ardatan)! - Support the incoming Mesh v2 supergraph shape
  (join transport, core `@link` / `@source`, Connectors without bare `@transport`).

## 1.14.2

### Patch Changes

- Updated dependencies
  [[`b180423`](https://github.com/graphql-hive/gateway/commit/b1804230911a8cd047ee0953304469ff4cb6b131),
  [`ad89e84`](https://github.com/graphql-hive/gateway/commit/ad89e8443b1839e79fa6c34a0347a2f3c67d3ec2),
  [`ad89e84`](https://github.com/graphql-hive/gateway/commit/ad89e8443b1839e79fa6c34a0347a2f3c67d3ec2),
  [`ad89e84`](https://github.com/graphql-hive/gateway/commit/ad89e8443b1839e79fa6c34a0347a2f3c67d3ec2)]:
  - @graphql-tools/delegate@12.3.5
  - @graphql-tools/stitch@10.4.5
  - @graphql-tools/federation@4.6.6
  - @graphql-tools/stitching-directives@4.1.7
  - @graphql-tools/wrap@11.2.7

## 1.14.1

### Patch Changes

- [#2755](https://github.com/graphql-hive/gateway/pull/2755)
  [`5e70bc4`](https://github.com/graphql-hive/gateway/commit/5e70bc4a40a265ef5750fcd4b695474627d3bc46)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Fix a memory leak where every supergraph
  reload retained the whole previous schema when the `supergraph` option is a synchronous function

## 1.14.0

### Minor Changes

- [#2657](https://github.com/graphql-hive/gateway/pull/2657)
  [`c3d7794`](https://github.com/graphql-hive/gateway/commit/c3d77944aea67b53a18cd3688dc3a5dd6aae75be)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Unified graph manager supports metadata loaded
  together with the unified graph

  `getUnifiedGraph` can now return `{ graph, metadata }` in addition to the unified graph itself.
  The metadata is kept with the last successfully loaded unified graph and passed to
  `onUnifiedGraphChange(schema, metadata)`. When the loaded unified graph did not change but its
  metadata did (shallow comparison), `onUnifiedGraphMetadataChange(schema, metadata)` is called.

### Patch Changes

- Updated dependencies
  [[`5267e90`](https://github.com/graphql-hive/gateway/commit/5267e90a49891730ffb29ab599badd11dc01ce4f),
  [`5267e90`](https://github.com/graphql-hive/gateway/commit/5267e90a49891730ffb29ab599badd11dc01ce4f)]:
  - @graphql-hive/logger@1.2.0
  - @graphql-mesh/transport-common@1.1.3

## 1.13.5

### Patch Changes

- Updated dependencies
  [[`3e0a896`](https://github.com/graphql-hive/gateway/commit/3e0a896cf110d8a6290e20b10b6865813301f5ca)]:
  - @graphql-tools/delegate@12.3.4
  - @graphql-tools/federation@4.6.5
  - @graphql-tools/stitch@10.4.4
  - @graphql-tools/stitching-directives@4.1.6
  - @graphql-tools/wrap@11.2.6

## 1.13.4

### Patch Changes

- [`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^12.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.1.0)
    (from `^12.0.1`, in `dependencies`)

- Updated dependencies
  [[`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)]:
  - @graphql-tools/batch-execute@10.3.2
  - @graphql-tools/delegate@12.3.3
  - @graphql-tools/federation@4.6.4
  - @graphql-tools/stitch@10.4.3
  - @graphql-tools/stitching-directives@4.1.5
  - @graphql-mesh/transport-common@1.1.2
  - @graphql-tools/wrap@11.2.5

## 1.13.3

### Patch Changes

- [#2717](https://github.com/graphql-hive/gateway/pull/2717)
  [`cc5870d`](https://github.com/graphql-hive/gateway/commit/cc5870de856effe1e277b79ee2cd87bd046179a2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Create a single transport executor per
  subgraph when concurrent requests arrive before the transport is loaded

  Concurrent first requests to a subgraph share the same pending transport executor so that features
  scoped to the executor, like inflight request deduplication, apply to them as well.

- Updated dependencies []:
  - @graphql-tools/federation@4.6.3

## 1.13.2

### Patch Changes

- Updated dependencies
  [[`9877255`](https://github.com/graphql-hive/gateway/commit/98772559ea8a529b3c6235722ac5cc7b82992c11)]:
  - @graphql-tools/batch-execute@10.3.1
  - @graphql-tools/delegate@12.3.2
  - @graphql-tools/federation@4.6.2
  - @graphql-tools/stitch@10.4.2
  - @graphql-tools/stitching-directives@4.1.4
  - @graphql-tools/wrap@11.2.4

## 1.13.1

### Patch Changes

- Updated dependencies
  [[`aabe28a`](https://github.com/graphql-hive/gateway/commit/aabe28a87cc4e85f590bbf4340a9c8700d544223),
  [`a558eea`](https://github.com/graphql-hive/gateway/commit/a558eeae3c94deb60d40f98232b9d4d82ae9d9a1)]:
  - @graphql-tools/delegate@12.3.1
  - @graphql-tools/stitch@10.4.1
  - @graphql-tools/federation@4.6.1
  - @graphql-tools/stitching-directives@4.1.3
  - @graphql-tools/wrap@11.2.3

## 1.13.0

### Minor Changes

- [#2672](https://github.com/graphql-hive/gateway/pull/2672)
  [`befdb8e`](https://github.com/graphql-hive/gateway/commit/befdb8e3e352650c9f6c4e5fbeadfcf3615ee6ae)
  Thanks [@ardatan](https://github.com/ardatan)! - Support `@defer` / `@stream` incremental delivery
  within schema stitching.

  **Gateway-owned `@defer` (default):** deferred selections are omitted from subgraph requests (only
  `@requires` / key dependencies are kept), so nested `@defer` can flush before slow fields resolve.
  Missing fields are filled later via type-merging or source resolvers.

  **Subgraph-forwarded `@defer`:** set `defer: true` on a `SubschemaConfig` (or `defer: true` on
  `getStitchedSchemaFromSupergraphSdl`) to forward `@defer` to that subgraph and merge incremental
  patches via `IncrementalReceiver`. With `batch: true` and `batchingOptions.defer` (or
  `subschema.defer`), multi-request batches wrap each root selection in `@defer` for subgraph
  compatibility; results are still collected before DataLoader waiters resolve. Single-request
  batches pass the AsyncIterable through so the initial payload can flush before deferred patches
  arrive.

  **Hive Gateway config:** extend `deferStream` instead of a separate flag:

  ```ts
  deferStream: true // client-facing only (gateway-owned omit)
  deferStream: { subgraph: true } // also forward @defer to every subgraph
  deferStream: { subgraph: { users: true, '*': false } } // per-subgraph
  ```

  `@graphql-tools/executor-http` adds `mergeIncremental` (default `true`: legacy growing snapshots).
  Set `mergeIncremental: false` to yield raw multipart parts like the default schema executor. Hive
  Gateway's `@graphql-mesh/transport-http` always uses passthrough (`mergeIncremental: false`).

  `IncrementalReceiver` prefers raw patches and cheaply tolerates accumulated snapshots (only fills
  missing keys). The HTTP executor preserves `hasNext` in accumulate mode.

  `@stream` continues to be forwarded on field directives as before. List streaming in
  `@graphql-tools/delegate` uses a plain async generator (no `@repeaterjs/repeater` dependency).

  Hive Router runtime does not plan incremental delivery yet; `deferStream.subgraph` applies to the
  stitching federation path.

### Patch Changes

- Updated dependencies
  [[`680eb53`](https://github.com/graphql-hive/gateway/commit/680eb53b8d9ef9b45503c819780ff1d592773e35),
  [`127576a`](https://github.com/graphql-hive/gateway/commit/127576a9e823cd2425c69432166a175464882b7f),
  [`62175b8`](https://github.com/graphql-hive/gateway/commit/62175b81b04237825372370de04dbdc11c239a01),
  [`680eb53`](https://github.com/graphql-hive/gateway/commit/680eb53b8d9ef9b45503c819780ff1d592773e35),
  [`befdb8e`](https://github.com/graphql-hive/gateway/commit/befdb8e3e352650c9f6c4e5fbeadfcf3615ee6ae),
  [`cd30482`](https://github.com/graphql-hive/gateway/commit/cd30482174173564e7a292f36b8dd12cc7cfab59),
  [`cd30482`](https://github.com/graphql-hive/gateway/commit/cd30482174173564e7a292f36b8dd12cc7cfab59),
  [`cd30482`](https://github.com/graphql-hive/gateway/commit/cd30482174173564e7a292f36b8dd12cc7cfab59)]:
  - @graphql-tools/batch-execute@10.3.0
  - @graphql-tools/delegate@12.3.0
  - @graphql-tools/stitch@10.4.0
  - @graphql-tools/federation@4.6.0
  - @graphql-tools/stitching-directives@4.1.2
  - @graphql-tools/wrap@11.2.2
  - @graphql-mesh/transport-common@1.1.1

## 1.12.3

### Patch Changes

- Updated dependencies
  [[`abf4091`](https://github.com/graphql-hive/gateway/commit/abf40919725f57d81ede935bee27a7b408e7d99b)]:
  - @graphql-tools/delegate@12.2.1
  - @graphql-tools/federation@4.5.3
  - @graphql-tools/stitch@10.3.2
  - @graphql-tools/stitching-directives@4.1.1
  - @graphql-tools/wrap@11.2.1

## 1.12.2

### Patch Changes

- Updated dependencies
  [[`8f582af`](https://github.com/graphql-hive/gateway/commit/8f582af7e2cd250d9538495487c33a64b038bcb4)]:
  - @graphql-tools/stitch@10.3.1
  - @graphql-tools/federation@4.5.2

## 1.12.1

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/federation@4.5.1

## 1.12.0

### Minor Changes

- [#2604](https://github.com/graphql-hive/gateway/pull/2604)
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Support GraphQL 16 with @graphql-tools/utils
  v12

  Preserves GraphQL 16 compatibility while upgrading to `@graphql-tools/utils` v12,
  `@graphql-tools/executor` v2, and the compatible `@graphql-tools/schema` and
  `@graphql-tools/merge` releases. Consumers now receive consistent resolver and execution request
  types without conflicts between different GraphQL Tools versions.

  Stitched and delegated operations handle the new executor variable result shape correctly,
  including variables used by directives. Resolver execution also supports the executor's
  cancellation and asynchronous work helpers while remaining compatible with the GraphQL 16
  `GraphQLResolveInfo` API.

### Patch Changes

- [#2604](https://github.com/graphql-hive/gateway/pull/2604)
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor@^2.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/2.0.1)
    (from `^1.4.13`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.2.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.2.4)
    (from `^9.1.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^12.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.0.1)
    (from `^11.0.0`, in `dependencies`)

- Updated dependencies
  [[`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830)]:
  - @graphql-mesh/transport-common@1.1.0
  - @graphql-tools/batch-execute@10.2.0
  - @graphql-tools/delegate@12.2.0
  - @graphql-tools/federation@4.5.0
  - @graphql-tools/stitch@10.3.0
  - @graphql-tools/stitching-directives@4.1.0
  - @graphql-tools/wrap@11.2.0

## 1.11.10

### Patch Changes

- Updated dependencies
  [[`e5ea5f4`](https://github.com/graphql-hive/gateway/commit/e5ea5f419bb27abe24e6962f07fd98fb886464f7),
  [`8cbdfd0`](https://github.com/graphql-hive/gateway/commit/8cbdfd01b2682e304eec51f3dd56ce57e4ec76c9)]:
  - @graphql-tools/federation@4.4.15
  - @graphql-tools/delegate@12.1.4
  - @graphql-tools/batch-execute@10.1.0
  - @graphql-tools/stitch@10.2.5
  - @graphql-tools/stitching-directives@4.0.30
  - @graphql-tools/wrap@11.1.24

## 1.11.9

### Patch Changes

- [#2542](https://github.com/graphql-hive/gateway/pull/2542)
  [`48e4ab3`](https://github.com/graphql-hive/gateway/commit/48e4ab36ac50dbd29c4855bb8087989b128e4351)
  Thanks [@dotansimha](https://github.com/dotansimha)! - ### Expose `cache` instance to unified
  graph handler

  The gateway `UnifiedGraphHandlerOpts` now includes an optinal `cache` instance that can be passed
  to the handler from the gateway.

## 1.11.8

### Patch Changes

- Updated dependencies
  [[`eb6569b`](https://github.com/graphql-hive/gateway/commit/eb6569b3ee21bdc16c67c6d356101e66e206d520)]:
  - @graphql-tools/federation@4.4.14
  - @graphql-tools/delegate@12.1.3
  - @graphql-tools/stitch@10.2.4
  - @graphql-tools/stitching-directives@4.0.29
  - @graphql-tools/wrap@11.1.23

## 1.11.7

### Patch Changes

- [#2549](https://github.com/graphql-hive/gateway/pull/2549)
  [`091fcd2`](https://github.com/graphql-hive/gateway/commit/091fcd282af0842d24cdb994c8e0a0d635e8c1e2)
  Thanks [@dotansimha](https://github.com/dotansimha)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/cross-helpers@^0.4.16` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.16)
    (from `^0.4.13`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.107.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.107.1)
    (from `^0.105.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.107.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.107.1)
    (from `^0.104.38`, in `dependencies`)

- Updated dependencies
  [[`091fcd2`](https://github.com/graphql-hive/gateway/commit/091fcd282af0842d24cdb994c8e0a0d635e8c1e2),
  [`af2cccb`](https://github.com/graphql-hive/gateway/commit/af2cccb7150db504ce42ab6b463166341377614f)]:
  - @graphql-mesh/transport-common@1.0.21
  - @graphql-tools/delegate@12.1.2
  - @graphql-tools/federation@4.4.13
  - @graphql-tools/stitch@10.2.3
  - @graphql-tools/stitching-directives@4.0.28
  - @graphql-tools/wrap@11.1.22

## 1.11.6

### Patch Changes

- [#2328](https://github.com/graphql-hive/gateway/pull/2328)
  [`530eca8`](https://github.com/graphql-hive/gateway/commit/530eca85a7745d53145ced209b6b2ce4b3798e1c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@^0.105.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.105.0)
    (from `^0.104.28`, in `dependencies`)

- Updated dependencies
  [[`530eca8`](https://github.com/graphql-hive/gateway/commit/530eca85a7745d53145ced209b6b2ce4b3798e1c)]:
  - @graphql-mesh/transport-common@1.0.20

## 1.11.5

### Patch Changes

- Updated dependencies
  [[`9ff0daf`](https://github.com/graphql-hive/gateway/commit/9ff0dafdfaa1db829dbde2c28e98c78e47fc7b24)]:
  - @graphql-tools/delegate@12.1.1
  - @graphql-tools/federation@4.4.12
  - @graphql-tools/stitch@10.2.2
  - @graphql-tools/stitching-directives@4.0.27
  - @graphql-tools/wrap@11.1.21

## 1.11.4

### Patch Changes

- Updated dependencies
  [[`a589a2d`](https://github.com/graphql-hive/gateway/commit/a589a2d9797e67623b28439d0bd30a17e3a247d6)]:
  - @graphql-tools/stitch@10.2.1
  - @graphql-tools/federation@4.4.11

## 1.11.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@1.0.19

## 1.11.2

### Patch Changes

- [#2473](https://github.com/graphql-hive/gateway/pull/2473)
  [`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/utils@^0.104.38` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.38)
    (from `^0.104.36`, in `dependencies`)

- [#2473](https://github.com/graphql-hive/gateway/pull/2473)
  [`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Fields that are not provided by any subschema
  (added through `typeDefs` or `resolvers`) can now return partial objects of merged types; the
  missing fields are resolved from the owning subschema automatically

  ```graphql
  type Query {
    personCreated: PersonCreated
  }

  type PersonCreated {
    person: Person # merged type, owned by a subschema
    cursor: String
  }
  ```

  ```ts
  const resolvers = {
    Query: {
      // only the key of `Person` is provided locally
      personCreated: () => ({ person: { id: '1' }, cursor: 'c1' })
    }
  }
  ```

  Before, `person` had to be resolved manually even though the stitched schema knows `Person` and
  its keys. Now the key is enough: `{ person { name } }` runs through the standard stitching
  planner, while local data (`cursor`) and local field resolvers on `Person` keep working as before.
  Computed fields, `@requires` dependencies, batching, and fields from other subschemas use the same
  type-merging flow as regular delegated results.

- Updated dependencies
  [[`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc),
  [`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc),
  [`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc)]:
  - @graphql-tools/delegate@12.1.0
  - @graphql-tools/stitch@10.2.0
  - @graphql-mesh/transport-common@1.0.18
  - @graphql-tools/federation@4.4.10
  - @graphql-tools/stitching-directives@4.0.26
  - @graphql-tools/wrap@11.1.20

## 1.11.1

### Patch Changes

- Updated dependencies
  [[`8a08de3`](https://github.com/graphql-hive/gateway/commit/8a08de36be598f975ba500a28a9bd9710ead2d66),
  [`65ce370`](https://github.com/graphql-hive/gateway/commit/65ce3702231068c946d4f95147b556cab57ad28c)]:
  - @graphql-tools/delegate@12.0.20
  - @graphql-tools/federation@4.4.9
  - @graphql-tools/stitch@10.1.25
  - @graphql-tools/stitching-directives@4.0.25
  - @graphql-tools/wrap@11.1.19

## 1.11.0

### Minor Changes

- [#2449](https://github.com/graphql-hive/gateway/pull/2449)
  [`65ecf28`](https://github.com/graphql-hive/gateway/commit/65ecf2829c379e1d3758b6ee61e83728ba9dd99f)
  Thanks [@advoretsky](https://github.com/advoretsky)! - Add opt-in graceful supergraph reload
  ("generation overlap").

  By default, when the supergraph reloads, the previous generation (executor + subgraph transports)
  is disposed immediately, aborting any in-flight operation on it with a `SCHEMA_RELOAD` / 503 error
  (queries are retried on the new schema; mutations are not).

  With the new `gracefulSchemaReload` config the previous generation is kept alive and only new
  requests are routed to the new one, so in-flight queries and mutations finish on the schema they
  were admitted under. Operations are reference-counted per generation for their whole lifetime
  (across all subgraph hops, and until `@defer`/`@stream` streams end). A superseded generation is
  disposed once idle, or force-disposed after `drainTimeout`; `maxConcurrentGenerations` caps how
  many generations may overlap. Subscriptions are not pinned: one on a superseded generation ends
  with `SCHEMA_RELOAD` when that generation is disposed — immediately on reload when nothing is
  draining, otherwise once the last in-flight operation finishes (at the latest after
  `drainTimeout`) — and the client then reconnects against the new schema. Disabled by default.

  ```ts
  export const gatewayConfig = defineConfig({
    gracefulSchemaReload: { drainTimeout: 10_000 } // ms; default off
  })
  ```

## 1.10.10

### Patch Changes

- Updated dependencies
  [[`0bbdbbc`](https://github.com/graphql-hive/gateway/commit/0bbdbbc22b75d9705a77f96144af002c796a695d)]:
  - @graphql-tools/delegate@12.0.19
  - @graphql-tools/stitch@10.1.24
  - @graphql-tools/federation@4.4.8
  - @graphql-tools/stitching-directives@4.0.24
  - @graphql-tools/wrap@11.1.18

## 1.10.9

### Patch Changes

- Updated dependencies
  [[`2337cb9`](https://github.com/graphql-hive/gateway/commit/2337cb917efd72626c319d952f7713bf3da676d6)]:
  - @graphql-hive/logger@1.1.1
  - @graphql-mesh/transport-common@1.0.17

## 1.10.8

### Patch Changes

- Updated dependencies
  [[`4311d79`](https://github.com/graphql-hive/gateway/commit/4311d79d854a589f2f6295629b9ad5b0a5c00f92)]:
  - @graphql-tools/batch-execute@10.0.9
  - @graphql-tools/delegate@12.0.18
  - @graphql-tools/federation@4.4.7
  - @graphql-tools/stitch@10.1.23
  - @graphql-tools/stitching-directives@4.0.23
  - @graphql-tools/wrap@11.1.17

## 1.10.7

### Patch Changes

- Updated dependencies
  [[`83465de`](https://github.com/graphql-hive/gateway/commit/83465def4d854d1f0912f635bd9621433fd33c8b)]:
  - @graphql-tools/stitch@10.1.22
  - @graphql-tools/federation@4.4.6

## 1.10.6

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/stitch@10.1.21
  - @graphql-tools/federation@4.4.5

## 1.10.5

### Patch Changes

- [#2391](https://github.com/graphql-hive/gateway/pull/2391)
  [`952f37f`](https://github.com/graphql-hive/gateway/commit/952f37f76bb4c48c135a3ea38e1c9555278b59fa)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`graphql-yoga@^5.21.1` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.21.1) (from `^5.16.2`,
    in `dependencies`)

## 1.10.4

### Patch Changes

- Updated dependencies
  [[`3e774e0`](https://github.com/graphql-hive/gateway/commit/3e774e050bc2d3c33e0f36a258ab6a8d94bf0750)]:
  - @graphql-tools/delegate@12.0.17
  - @graphql-tools/federation@4.4.4
  - @graphql-tools/stitch@10.1.20
  - @graphql-tools/stitching-directives@4.0.22
  - @graphql-tools/wrap@11.1.16

## 1.10.3

### Patch Changes

- [#2341](https://github.com/graphql-hive/gateway/pull/2341)
  [`2ccae41`](https://github.com/graphql-hive/gateway/commit/2ccae416160689bbdb2db06d1930d5e4e6c1ecac)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@^0.104.28` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.28)
    (from `^0.104.27`, in `dependencies`)

- Updated dependencies
  [[`eeebc74`](https://github.com/graphql-hive/gateway/commit/eeebc74a1619f5f0ccc339dd3e4429c8976bdd39)]:
  - @graphql-tools/federation@4.4.3

## 1.10.2

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/federation@4.4.2

## 1.10.1

### Patch Changes

- Updated dependencies
  [[`deafdc0`](https://github.com/graphql-hive/gateway/commit/deafdc00e388ed195c2cdf77e98cd19e7d496d48)]:
  - @graphql-tools/delegate@12.0.16
  - @graphql-tools/federation@4.4.1
  - @graphql-tools/stitch@10.1.19
  - @graphql-tools/stitching-directives@4.0.21
  - @graphql-tools/wrap@11.1.15

## 1.10.0

### Minor Changes

- [`0625f67`](https://github.com/graphql-hive/gateway/commit/0625f67b021ce7edf912cad02f40fa276cd5ffb2)
  Thanks [@ardatan](https://github.com/ardatan)! - Add Generic SDK support with
  `gateway.sdkRequester` property, see
  https://github.com/graphql-hive/gateway/tree/main/examples/typed-sdk

### Patch Changes

- Updated dependencies
  [[`7171b46`](https://github.com/graphql-hive/gateway/commit/7171b46546a8e60776f70d18d14dd6fa19d5649f)]:
  - @graphql-tools/delegate@12.0.15

## 1.9.0

### Minor Changes

- [#2281](https://github.com/graphql-hive/gateway/pull/2281)
  [`4db5afa`](https://github.com/graphql-hive/gateway/commit/4db5afadfc3703d7f0228140f5297ed1c99df967)
  Thanks [@ardatan](https://github.com/ardatan)! - Support aliases in directive imports correctly
  specifically for `@source` of Mesh to distinguish it from Apollo's connector `@source` directive.

### Patch Changes

- Updated dependencies
  [[`4db5afa`](https://github.com/graphql-hive/gateway/commit/4db5afadfc3703d7f0228140f5297ed1c99df967),
  [`8ffdc33`](https://github.com/graphql-hive/gateway/commit/8ffdc3360ca3e9274625c50b2fb1d41d307ecc70)]:
  - @graphql-tools/federation@4.4.0

## 1.8.10

### Patch Changes

- [#2285](https://github.com/graphql-hive/gateway/pull/2285)
  [`e5bf019`](https://github.com/graphql-hive/gateway/commit/e5bf01939712eae423f94642469cebb0b69ac4eb)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/utils@^0.104.36` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.36)
    (from `^0.104.35`, in `dependencies`)

- [#2285](https://github.com/graphql-hive/gateway/pull/2285)
  [`e5bf019`](https://github.com/graphql-hive/gateway/commit/e5bf01939712eae423f94642469cebb0b69ac4eb)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Resolve entities from other subgraphs when
  using subscriptions in additional resolvers

## 1.8.9

### Patch Changes

- [#2249](https://github.com/graphql-hive/gateway/pull/2249)
  [`6ac955d`](https://github.com/graphql-hive/gateway/commit/6ac955d2910fba67f5177681262dcd9b7ef3f079)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/cross-helpers@^0.4.13` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.13)
    (from `^0.4.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.104.27` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.27)
    (from `^0.104.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.35` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.35)
    (from `^0.104.16`, in `dependencies`)

- Updated dependencies
  [[`6ac955d`](https://github.com/graphql-hive/gateway/commit/6ac955d2910fba67f5177681262dcd9b7ef3f079)]:
  - @graphql-mesh/transport-common@1.0.16

## 1.8.8

### Patch Changes

- Updated dependencies
  [[`dff525f`](https://github.com/graphql-hive/gateway/commit/dff525f214d3525434c5a73a5b3fb22c46550163)]:
  - @graphql-tools/delegate@12.0.14
  - @graphql-tools/federation@4.3.7
  - @graphql-tools/stitch@10.1.18
  - @graphql-tools/stitching-directives@4.0.20
  - @graphql-tools/wrap@11.1.14

## 1.8.7

### Patch Changes

- [#2225](https://github.com/graphql-hive/gateway/pull/2225)
  [`3645fe7`](https://github.com/graphql-hive/gateway/commit/3645fe7930fc026c33aea6d70aaf66cfd0f61d38)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Inject the @resolveTo directive definition
  when not present in the composed supergraph SDL

## 1.8.6

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/federation@4.3.6

## 1.8.5

### Patch Changes

- Updated dependencies
  [[`d2bf6af`](https://github.com/graphql-hive/gateway/commit/d2bf6af899b21e5faee5f8436f39e50fd594ab7a)]:
  - @graphql-tools/batch-execute@10.0.8
  - @graphql-tools/delegate@12.0.13
  - @graphql-tools/federation@4.3.5
  - @graphql-tools/stitch@10.1.17
  - @graphql-tools/stitching-directives@4.0.19
  - @graphql-tools/wrap@11.1.13

## 1.8.4

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/federation@4.3.4

## 1.8.3

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/federation@4.3.3

## 1.8.2

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/federation@4.3.2

## 1.8.1

### Patch Changes

- Updated dependencies
  [[`da68d27`](https://github.com/graphql-hive/gateway/commit/da68d2710dff1f8bca5b17bcd5368e631f72114e)]:
  - @graphql-tools/federation@4.3.1
  - @graphql-tools/delegate@12.0.12
  - @graphql-tools/stitch@10.1.16
  - @graphql-tools/stitching-directives@4.0.18
  - @graphql-tools/wrap@11.1.12

## 1.8.0

### Minor Changes

- [#2096](https://github.com/graphql-hive/gateway/pull/2096)
  [`4e626d4`](https://github.com/graphql-hive/gateway/commit/4e626d4cd2f1a6050a30b1219f5b5408ff56b3a6)
  Thanks [@ardatan](https://github.com/ardatan)! - Progressive Override Support in Rust QP Runtime

- [#2076](https://github.com/graphql-hive/gateway/pull/2076)
  [`08c9da2`](https://github.com/graphql-hive/gateway/commit/08c9da28af4587aa823f3b7a10af493fa87dab87)
  Thanks [@ardatan](https://github.com/ardatan)! - Add automatic batching to SDK requester

### Patch Changes

- Updated dependencies
  [[`4e626d4`](https://github.com/graphql-hive/gateway/commit/4e626d4cd2f1a6050a30b1219f5b5408ff56b3a6),
  [`08c9da2`](https://github.com/graphql-hive/gateway/commit/08c9da28af4587aa823f3b7a10af493fa87dab87)]:
  - @graphql-tools/federation@4.3.0
  - @graphql-tools/batch-execute@10.0.7
  - @graphql-tools/delegate@12.0.11
  - @graphql-tools/stitch@10.1.15
  - @graphql-tools/stitching-directives@4.0.17
  - @graphql-tools/wrap@11.1.11

## 1.7.1

### Patch Changes

- Updated dependencies
  [[`dae3fe4`](https://github.com/graphql-hive/gateway/commit/dae3fe4fbb9c78598d1bbf91c2ed07ab1b90f05d)]:
  - @graphql-tools/wrap@11.1.10
  - @graphql-tools/delegate@12.0.10
  - @graphql-tools/batch-execute@10.0.6
  - @graphql-tools/federation@4.2.14
  - @graphql-tools/stitch@10.1.14
  - @graphql-tools/stitching-directives@4.0.16

## 1.7.0

### Minor Changes

- [`5468882`](https://github.com/graphql-hive/gateway/commit/5468882253927113fa22030bceb265a31101792e)
  Thanks [@ardatan](https://github.com/ardatan)! - Expose `subschemas` in
  `handleFederationSupergraph` result

## 1.6.11

### Patch Changes

- Updated dependencies
  [[`43aaa6a`](https://github.com/graphql-hive/gateway/commit/43aaa6ab8c1c64cae92e9cdff7016ebdf1afa756)]:
  - @graphql-tools/delegate@12.0.9
  - @graphql-tools/stitch@10.1.13
  - @graphql-tools/federation@4.2.13
  - @graphql-tools/stitching-directives@4.0.15
  - @graphql-tools/wrap@11.1.9

## 1.6.10

### Patch Changes

- Updated dependencies
  [[`c75fd0a`](https://github.com/graphql-hive/gateway/commit/c75fd0a64730ab07a3a7115748841025e312f335)]:
  - @graphql-hive/logger@1.1.0
  - @graphql-mesh/transport-common@1.0.15

## 1.6.9

### Patch Changes

- Updated dependencies
  [[`4065b7f`](https://github.com/graphql-hive/gateway/commit/4065b7fbb08d9e75c5f0d3b2b4d42d665aa9dbd9)]:
  - @graphql-tools/delegate@12.0.8
  - @graphql-tools/federation@4.2.12
  - @graphql-tools/stitch@10.1.12
  - @graphql-tools/stitching-directives@4.0.14
  - @graphql-tools/wrap@11.1.8

## 1.6.8

### Patch Changes

- Updated dependencies
  [[`584a293`](https://github.com/graphql-hive/gateway/commit/584a293e3dafa7cd2d0210f80299c81b6707bcd4)]:
  - @graphql-tools/delegate@12.0.7
  - @graphql-tools/federation@4.2.11
  - @graphql-tools/stitch@10.1.11
  - @graphql-tools/stitching-directives@4.0.13
  - @graphql-tools/wrap@11.1.7

## 1.6.7

### Patch Changes

- Updated dependencies
  [[`2200fc3`](https://github.com/graphql-hive/gateway/commit/2200fc3e9b94db77a642835bbf2d646c65b3e8d0)]:
  - @graphql-tools/delegate@12.0.6
  - @graphql-tools/stitch@10.1.10
  - @graphql-tools/federation@4.2.10
  - @graphql-tools/stitching-directives@4.0.12
  - @graphql-tools/wrap@11.1.6

## 1.6.6

### Patch Changes

- Updated dependencies
  [[`e92c5a9`](https://github.com/graphql-hive/gateway/commit/e92c5a9702a2aea395a4a4e3a482b92f528655e8)]:
  - @graphql-tools/delegate@12.0.5
  - @graphql-tools/federation@4.2.9
  - @graphql-tools/stitch@10.1.9
  - @graphql-tools/stitching-directives@4.0.11
  - @graphql-tools/wrap@11.1.5

## 1.6.5

### Patch Changes

- Updated dependencies
  [[`f321cbd`](https://github.com/graphql-hive/gateway/commit/f321cbdf87bc68bbf6770bec963c86e2a35b50bf)]:
  - @graphql-hive/logger@1.0.10
  - @graphql-mesh/transport-common@1.0.14

## 1.6.4

### Patch Changes

- [#1842](https://github.com/graphql-hive/gateway/pull/1842)
  [`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^11.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.0.0)
    (from `^10.10.3`, in `dependencies`)

- Updated dependencies
  [[`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f),
  [`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f),
  [`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f),
  [`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f),
  [`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f),
  [`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f),
  [`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f)]:
  - @graphql-mesh/transport-common@1.0.13
  - @graphql-tools/batch-execute@10.0.5
  - @graphql-tools/delegate@12.0.4
  - @graphql-tools/federation@4.2.8
  - @graphql-tools/stitch@10.1.8
  - @graphql-tools/stitching-directives@4.0.10
  - @graphql-tools/wrap@11.1.4

## 1.6.3

### Patch Changes

- Updated dependencies
  [[`dcd8f0e`](https://github.com/graphql-hive/gateway/commit/dcd8f0e93fd220cb99f79cadea759ea49bc15308)]:
  - @graphql-tools/delegate@12.0.3
  - @graphql-tools/federation@4.2.7
  - @graphql-tools/stitch@10.1.7
  - @graphql-tools/stitching-directives@4.0.9
  - @graphql-tools/wrap@11.1.3

## 1.6.2

### Patch Changes

- Updated dependencies
  [[`da8b8e3`](https://github.com/graphql-hive/gateway/commit/da8b8e3f3545487249b11c6577e3889f68527249)]:
  - @graphql-tools/delegate@12.0.2
  - @graphql-tools/federation@4.2.6
  - @graphql-tools/stitch@10.1.6
  - @graphql-tools/stitching-directives@4.0.8
  - @graphql-tools/wrap@11.1.2

## 1.6.1

### Patch Changes

- Updated dependencies
  [[`0d14faf`](https://github.com/graphql-hive/gateway/commit/0d14fafdbaf3fb27eef123016ef2ca977d6688d8)]:
  - @graphql-tools/delegate@12.0.1
  - @graphql-tools/federation@4.2.5
  - @graphql-tools/stitch@10.1.5
  - @graphql-tools/stitching-directives@4.0.7
  - @graphql-tools/wrap@11.1.1

## 1.6.0

### Minor Changes

- [#1708](https://github.com/graphql-hive/gateway/pull/1708)
  [`bc6cddd`](https://github.com/graphql-hive/gateway/commit/bc6cddd1c53a012dd02a1d8a7217a28e65cc6ae9)
  Thanks [@ardatan](https://github.com/ardatan)! - Export `getSubgraph` method so other handlers can
  use extracted transforms and subgraph schema

### Patch Changes

- Updated dependencies
  [[`55173a5`](https://github.com/graphql-hive/gateway/commit/55173a55344a07fdf9531efcbaa4cb142fff655e),
  [`bc6cddd`](https://github.com/graphql-hive/gateway/commit/bc6cddd1c53a012dd02a1d8a7217a28e65cc6ae9),
  [`1dbc653`](https://github.com/graphql-hive/gateway/commit/1dbc6536cb992a705cac7894acca6fe5431b72de),
  [`bc6cddd`](https://github.com/graphql-hive/gateway/commit/bc6cddd1c53a012dd02a1d8a7217a28e65cc6ae9),
  [`b520eb2`](https://github.com/graphql-hive/gateway/commit/b520eb2309f627578519826d6b9e0056252c6c46)]:
  - @graphql-tools/stitch@10.1.4
  - @graphql-tools/wrap@11.1.0
  - @graphql-tools/delegate@12.0.0
  - @graphql-tools/federation@4.2.4
  - @graphql-tools/stitching-directives@4.0.6

## 1.5.1

### Patch Changes

- [#1691](https://github.com/graphql-hive/gateway/pull/1691)
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor@^1.4.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.13)
    (from `^1.4.11`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.1.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.1.5)
    (from `^9.1.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.10.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.3)
    (from `^10.10.1`, in `dependencies`)

- Updated dependencies
  [[`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`478d7e2`](https://github.com/graphql-hive/gateway/commit/478d7e25ef47fb8fb6183010a8bb61ac31688c55),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)]:
  - @graphql-hive/logger@1.0.9
  - @graphql-mesh/transport-common@1.0.12
  - @graphql-tools/batch-execute@10.0.4
  - @graphql-tools/delegate@11.1.3
  - @graphql-tools/federation@4.2.3
  - @graphql-tools/stitch@10.1.3
  - @graphql-tools/stitching-directives@4.0.5
  - @graphql-tools/wrap@11.0.5

## 1.5.0

### Minor Changes

- [#1629](https://github.com/graphql-hive/gateway/pull/1629)
  [`073a078`](https://github.com/graphql-hive/gateway/commit/073a078c8cdbdd4ec33fdb9d3aeb4955fbcfb103)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Support changing the unified graph handler

  Allowing users to integrate other query planners, like the new
  [Hive Gateway Router Runtime](https://the-guild.dev/graphql/hive/docs/gateway/other-features/router-runtime).

## 1.4.3

### Patch Changes

- [#1677](https://github.com/graphql-hive/gateway/pull/1677)
  [`3fbf360`](https://github.com/graphql-hive/gateway/commit/3fbf3602bedbc4c4bb1947fcdca60bc27789ceb7)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@^0.104.16` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.16)
    (from `^0.104.15`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.16` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.16)
    (from `^0.104.15`, in `dependencies`)

- Updated dependencies
  [[`3fbf360`](https://github.com/graphql-hive/gateway/commit/3fbf3602bedbc4c4bb1947fcdca60bc27789ceb7)]:
  - @graphql-mesh/transport-common@1.0.11

## 1.4.2

### Patch Changes

- [#1608](https://github.com/graphql-hive/gateway/pull/1608)
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@^0.104.14` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.14)
    (from `^0.104.13`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.14` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.14)
    (from `^0.104.13`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor@^1.4.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.11)
    (from `^1.4.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.1.3)
    (from `^9.1.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.1)
    (from `^10.9.1`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@^5.16.1` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.16.1) (from `^5.16.0`,
    in `dependencies`)

- [#1662](https://github.com/graphql-hive/gateway/pull/1662)
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.1)
    (from `^10.10.0`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@^5.16.1` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.16.1) (from `^5.16.0`,
    in `dependencies`)

- [#1663](https://github.com/graphql-hive/gateway/pull/1663)
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor@^1.4.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.11)
    (from `^1.4.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.1.3)
    (from `^9.1.2`, in `dependencies`)

- [#1669](https://github.com/graphql-hive/gateway/pull/1669)
  [`1bfac64`](https://github.com/graphql-hive/gateway/commit/1bfac649f00f1b5ac830813030cec64522fea29f)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@^0.104.15` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.15)
    (from `^0.104.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.15` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.15)
    (from `^0.104.14`, in `dependencies`)

- [#1672](https://github.com/graphql-hive/gateway/pull/1672)
  [`3f6b99d`](https://github.com/graphql-hive/gateway/commit/3f6b99d152cbcc17d4ec3c97bc48dae452982151)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@envelop/core@^5.4.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.4.0) (from `^5.3.2`,
    in `dependencies`)
  - Updated dependency
    [`graphql-yoga@^5.16.2` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.16.2) (from `^5.16.1`,
    in `dependencies`)

- Updated dependencies
  [[`1f58197`](https://github.com/graphql-hive/gateway/commit/1f58197a60882c79430e59638b9396071137a221),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a),
  [`1bfac64`](https://github.com/graphql-hive/gateway/commit/1bfac649f00f1b5ac830813030cec64522fea29f),
  [`3f6b99d`](https://github.com/graphql-hive/gateway/commit/3f6b99d152cbcc17d4ec3c97bc48dae452982151),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a)]:
  - @graphql-hive/logger@1.0.8
  - @graphql-mesh/transport-common@1.0.10
  - @graphql-tools/batch-execute@10.0.3
  - @graphql-tools/delegate@11.1.2
  - @graphql-tools/federation@4.2.2
  - @graphql-tools/stitch@10.1.2
  - @graphql-tools/stitching-directives@4.0.4
  - @graphql-tools/wrap@11.0.4

## 1.4.1

### Patch Changes

- [#1654](https://github.com/graphql-hive/gateway/pull/1654)
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor@^1.4.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.10)
    (from `^1.4.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.1.2)
    (from `^9.1.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.0)
    (from `^10.9.1`, in `dependencies`)

- Updated dependencies
  [[`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`3226919`](https://github.com/graphql-hive/gateway/commit/3226919d58930289491696fa3b56ed85c766e3f5)]:
  - @graphql-mesh/transport-common@1.0.9
  - @graphql-tools/batch-execute@10.0.2
  - @graphql-tools/delegate@11.1.1
  - @graphql-tools/federation@4.2.1
  - @graphql-tools/stitch@10.1.1
  - @graphql-tools/stitching-directives@4.0.3
  - @graphql-tools/wrap@11.0.3

## 1.4.0

### Minor Changes

- [#1642](https://github.com/graphql-hive/gateway/pull/1642)
  [`af7a7de`](https://github.com/graphql-hive/gateway/commit/af7a7de0ebd81a5b41702052a3ddf466f5d84437)
  Thanks [@ardatan](https://github.com/ardatan)! - Support promises in `progressiveOverride` option

  ```ts
  import { defineConfig } from '@graphql-hive/gateway'

  export const gatewayConfig = defineConfig({
    async progressiveOverride(label: string, context: GatewayContext) {
      if (label === 'my_label') {
        const serviceResponse = await fetch('http://example.com/should_override', {
          headers: {
            'x-some-header': context.headers['x-some-header']
          }
        })
        const result = await serviceResponse.json()
        return result?.override
      }
      return false
    }
  })
  ```

### Patch Changes

- [#1637](https://github.com/graphql-hive/gateway/pull/1637)
  [`aa1cb63`](https://github.com/graphql-hive/gateway/commit/aa1cb635583e41ed0f8ebe7ae4897feedec50a71)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@^0.104.14` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.14)
    (from `^0.104.13`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.14` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.14)
    (from `^0.104.13`, in `dependencies`)

- Updated dependencies
  [[`aa1cb63`](https://github.com/graphql-hive/gateway/commit/aa1cb635583e41ed0f8ebe7ae4897feedec50a71),
  [`af7a7de`](https://github.com/graphql-hive/gateway/commit/af7a7de0ebd81a5b41702052a3ddf466f5d84437)]:
  - @graphql-mesh/transport-common@1.0.8
  - @graphql-tools/federation@4.2.0

## 1.3.0

### Minor Changes

- [#1624](https://github.com/graphql-hive/gateway/pull/1624)
  [`a8458b2`](https://github.com/graphql-hive/gateway/commit/a8458b24e71fda37a515eaf9ac9af43a73e7823f)
  Thanks [@ardatan](https://github.com/ardatan)! - Progressive Override for Safer Field Migrations

  Introduces Progressive Override, allowing you to safely migrate fields between subgraphs using the
  `@override` directive with a label. Control the rollout using custom logic in the gateway (e.g.,
  percentage, headers) or the built-in percent(x) label for gradual, incremental traffic migration.

  Detailed documentation can be found
  [here](https://the-guild.dev/graphql/hive/docs/gateway/other-features/progressive-override).

### Patch Changes

- Updated dependencies
  [[`b0cf7bb`](https://github.com/graphql-hive/gateway/commit/b0cf7bbb3ec1c1c1d18e7b064b2d9d7d2f8c9a2e),
  [`a54b0c1`](https://github.com/graphql-hive/gateway/commit/a54b0c1777229aaeea295bcd15d4f4d6e4e615f7),
  [`058ef2f`](https://github.com/graphql-hive/gateway/commit/058ef2f8373ea822fed985b705416cb39d5b6efc),
  [`a8458b2`](https://github.com/graphql-hive/gateway/commit/a8458b24e71fda37a515eaf9ac9af43a73e7823f),
  [`20f7a50`](https://github.com/graphql-hive/gateway/commit/20f7a50c5ddb862c2921e91ca43d9858bae1bce8)]:
  - @graphql-hive/logger@1.0.7
  - @graphql-tools/delegate@11.1.0
  - @graphql-tools/federation@4.1.0
  - @graphql-tools/stitch@10.1.0
  - @graphql-mesh/transport-common@1.0.7
  - @graphql-tools/stitching-directives@4.0.2
  - @graphql-tools/wrap@11.0.2

## 1.2.5

### Patch Changes

- Updated dependencies
  [[`883cd5a`](https://github.com/graphql-hive/gateway/commit/883cd5af9bc9badd0adc5596eb6a8cad741a3cb4),
  [`91a848b`](https://github.com/graphql-hive/gateway/commit/91a848bf2db0b65f2751aaf0b2ebea9ae580e66d)]:
  - @graphql-hive/logger@1.0.6
  - @graphql-mesh/transport-common@1.0.6

## 1.2.4

### Patch Changes

- [#1541](https://github.com/graphql-hive/gateway/pull/1541)
  [`5e511ca`](https://github.com/graphql-hive/gateway/commit/5e511ca9cc555577936bba942c8b3ff0796b015e)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`graphql-yoga@^5.16.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.16.0) (from `^5.15.2`,
    in `dependencies`)

- Updated dependencies
  [[`5e511ca`](https://github.com/graphql-hive/gateway/commit/5e511ca9cc555577936bba942c8b3ff0796b015e),
  [`0a349fb`](https://github.com/graphql-hive/gateway/commit/0a349fbfd52eaf8a2b21c9669871c916d41b840f),
  [`818461e`](https://github.com/graphql-hive/gateway/commit/818461e6ea55bb10ba4ead9ed214848e1ba4bfd2)]:
  - @graphql-hive/logger@1.0.5
  - @graphql-tools/federation@4.0.5
  - @graphql-tools/stitch@10.0.2
  - @graphql-mesh/transport-common@1.0.5

## 1.2.3

### Patch Changes

- Updated dependencies
  [[`a6a3d4d`](https://github.com/graphql-hive/gateway/commit/a6a3d4d0ffba9d73a5151c747c281c25d0d26954)]:
  - @graphql-tools/federation@4.0.4

## 1.2.2

### Patch Changes

- [#1524](https://github.com/graphql-hive/gateway/pull/1524)
  [`d7b48a7`](https://github.com/graphql-hive/gateway/commit/d7b48a778344145478f0d3e1e1e188124181f0f2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@envelop/core@^5.3.2` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.3.2) (from `^5.3.1`,
    in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.104.13` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.13)
    (from `^0.104.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.13` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.13)
    (from `^0.104.12`, in `dependencies`)

- Updated dependencies
  [[`bb2621c`](https://github.com/graphql-hive/gateway/commit/bb2621ce85c42ccbc97c6ca128f959bcb2bb6475),
  [`d7b48a7`](https://github.com/graphql-hive/gateway/commit/d7b48a778344145478f0d3e1e1e188124181f0f2),
  [`e64a4e1`](https://github.com/graphql-hive/gateway/commit/e64a4e11db66be8bd9c3728eca1ac3d7d97c7d0e)]:
  - @graphql-hive/logger@1.0.4
  - @graphql-mesh/transport-common@1.0.4
  - @graphql-tools/federation@4.0.3

## 1.2.1

### Patch Changes

- [#1473](https://github.com/graphql-hive/gateway/pull/1473)
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.2)
    (from `^1.3.0`, in `dependencies`)

- Updated dependencies
  [[`950ebd1`](https://github.com/graphql-hive/gateway/commit/950ebd1d1686846b59b555695c1738e25fd3268e),
  [`fe99f74`](https://github.com/graphql-hive/gateway/commit/fe99f74dd11fdf2928ca7080d4d2e5dfd1e2f18e),
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14),
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14),
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14),
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14),
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14)]:
  - @graphql-hive/logger@1.0.3
  - @graphql-tools/batch-execute@10.0.1
  - @graphql-tools/delegate@11.0.1
  - @graphql-tools/federation@4.0.2
  - @graphql-tools/stitch@10.0.1
  - @graphql-tools/wrap@11.0.1
  - @graphql-mesh/transport-common@1.0.3
  - @graphql-tools/stitching-directives@4.0.1

## 1.2.0

### Minor Changes

- [#1458](https://github.com/graphql-hive/gateway/pull/1458)
  [`6495780`](https://github.com/graphql-hive/gateway/commit/6495780516c11e6668ab827113b7edfb6379b5f2)
  Thanks [@ardatan](https://github.com/ardatan)! - New directive `@pubsubPublish` to publish the
  payload to the pubsub engine directly

  ```graphql
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key", "@composeDirective"])
    @link(url: "https://the-guild.dev/mesh/v1.0", import: ["@pubsubOperation", "@pubsubPublish"])
    @composeDirective(name: "@pubsubOperation")
    @composeDirective(name: "@pubsubPublish")

  directive @pubsubOperation(
    pubsubTopic: String!
    filterBy: String
    result: String
  ) on FIELD_DEFINITION

  directive @pubsubPublish(pubsubTopic: String!) on FIELD_DEFINITION

  type Query {
    hello: String!
  }
  type Product @key(fields: "id") {
    id: ID!
    name: String!
    price: Float!
  }

  type Mutation {
    createProduct(name: String!, price: Float!): Product! @pubsubPublish(pubsubTopic: "new_product")
  }

  type Subscription {
    newProductSubgraph: Product! @pubsubOperation(pubsubTopic: "new_product")
  }
  ```

### Patch Changes

- [#1463](https://github.com/graphql-hive/gateway/pull/1463)
  [`bcb9407`](https://github.com/graphql-hive/gateway/commit/bcb94071daccb1698439d364ccc37146aa4c5032)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`graphql-yoga@^5.15.2` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.15.2) (from `^5.15.1`,
    in `dependencies`)

## 1.1.0

### Minor Changes

- [#1455](https://github.com/graphql-hive/gateway/pull/1455)
  [`b6f985b`](https://github.com/graphql-hive/gateway/commit/b6f985b0456ba7556cc299368892ffc5f7d4817e)
  Thanks [@ardatan](https://github.com/ardatan)! - Support client side pubsub operation definition
  with `@pubsubOperation`

  Instead of `@resolveTo` on the gateway-side configuration with `additionalTypeDefs`, now you can
  define those operations on the subgraphs directly. Since this is a additional directive provided
  by Mesh, you need to use `@composeDirective`

  ```graphql
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key", "@composeDirective"])
    @link(url: "https://the-guild.dev/mesh/v1.0", import: ["@pubsubOperation"])
    @composeDirective(name: "@pubsubOperation")

  directive @pubsubOperation(
    pubsubTopic: String!
    filterBy: String
    result: String
  ) on FIELD_DEFINITION

  type Query {
    hello: String!
  }
  type Product @key(fields: "id") {
    id: ID!
    name: String!
    price: Float!
  }

  type Subscription {
    newProductSubgraph: Product! @pubsubOperation(pubsubTopic: "new_product")
  }
  ```

### Patch Changes

- [#1450](https://github.com/graphql-hive/gateway/pull/1450)
  [`ab05e3f`](https://github.com/graphql-hive/gateway/commit/ab05e3f899b017067e0eb42301516d4fdf3b816d)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@^0.104.11` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.11)
    (from `^0.104.8`, in `dependencies`)

- [#1452](https://github.com/graphql-hive/gateway/pull/1452)
  [`b0e5568`](https://github.com/graphql-hive/gateway/commit/b0e55688d4fc22d0bfbf664de52e78e9642d7014)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@envelop/core@^5.3.1` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.3.1) (from `^5.3.0`,
    in `dependencies`)

- [#1455](https://github.com/graphql-hive/gateway/pull/1455)
  [`b6f985b`](https://github.com/graphql-hive/gateway/commit/b6f985b0456ba7556cc299368892ffc5f7d4817e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@^0.104.12` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.12)
    (from `^0.104.11`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.12` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.12)
    (from `^0.104.11`, in `dependencies`)

- Updated dependencies
  [[`b0e5568`](https://github.com/graphql-hive/gateway/commit/b0e55688d4fc22d0bfbf664de52e78e9642d7014),
  [`ab05e3f`](https://github.com/graphql-hive/gateway/commit/ab05e3f899b017067e0eb42301516d4fdf3b816d),
  [`b0e5568`](https://github.com/graphql-hive/gateway/commit/b0e55688d4fc22d0bfbf664de52e78e9642d7014),
  [`b6f985b`](https://github.com/graphql-hive/gateway/commit/b6f985b0456ba7556cc299368892ffc5f7d4817e),
  [`b0e5568`](https://github.com/graphql-hive/gateway/commit/b0e55688d4fc22d0bfbf664de52e78e9642d7014)]:
  - @graphql-hive/logger@1.0.2
  - @graphql-mesh/transport-common@1.0.2
  - @graphql-tools/federation@4.0.1

## 1.0.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@1.0.1

## 1.0.0

### Major Changes

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Drop Node 18 support

  Least supported Node version is now v20.

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Introduce and use the new Hive Logger

  - [Read more about it on the Hive Logger documentation here.](https://the-guild.dev/graphql/hive/docs/logger)

  - If coming from Hive Gateway v1,
    [read the migration guide here.](https://the-guild.dev/graphql/hive/docs/migration-guides/gateway-v1-v2)

### Minor Changes

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Breaking Change: Removed
  `subgraphNameByExecutionRequest` weak map. Subgraph name is now stored in the execution request
  itself.

  ```diff
  - const subgraphName = subgraphNameByExecutionRequest.get(executionRequest)
  + const subgraphName = executionRequest.subgraphName
  ```

### Patch Changes

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:

  - Added dependency
    [`@graphql-hive/logger@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-hive/logger/v/workspace:^)
    (to `dependencies`)

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:

  - Added dependency
    [`@graphql-hive/logger@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-hive/logger/v/workspace:^)
    (to `dependencies`)

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Fixed subgraph name being lost when
  execution requests get batched together.

- Updated dependencies
  [[`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)]:
  - @graphql-mesh/transport-common@1.0.0
  - @graphql-tools/stitching-directives@4.0.0
  - @graphql-tools/batch-execute@10.0.0
  - @graphql-tools/federation@4.0.0
  - @graphql-tools/delegate@11.0.0
  - @graphql-tools/stitch@10.0.0
  - @graphql-tools/wrap@11.0.0
  - @graphql-hive/logger@1.0.1

## 0.12.0

### Minor Changes

- [#1403](https://github.com/graphql-hive/gateway/pull/1403)
  [`e5eb881`](https://github.com/graphql-hive/gateway/commit/e5eb881e8a063accc55b750e613f4baefa21dda5)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Allow configuring some of the batch
  delegation options

  Like the `maxBatchSize` which is used to limit the number of items requested in a single delegated
  batch.

### Patch Changes

- [#1408](https://github.com/graphql-hive/gateway/pull/1408)
  [`5aefad2`](https://github.com/graphql-hive/gateway/commit/5aefad2ac4abe40fd1cb141218bd2679b3e0047d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@^0.104.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.8)
    (from `^0.104.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.8)
    (from `^0.104.7`, in `dependencies`)

- [#1424](https://github.com/graphql-hive/gateway/pull/1424)
  [`fe9b42f`](https://github.com/graphql-hive/gateway/commit/fe9b42f02ca6e3fbe6defd83e21e283dedf7481a)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/utils@^0.104.11` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.11)
    (from `^0.104.8`, in `dependencies`)

- Updated dependencies
  [[`5aefad2`](https://github.com/graphql-hive/gateway/commit/5aefad2ac4abe40fd1cb141218bd2679b3e0047d),
  [`37113d1`](https://github.com/graphql-hive/gateway/commit/37113d1a446748fd83da9823e27a0f56872317df)]:
  - @graphql-mesh/transport-common@0.7.39
  - @graphql-tools/federation@3.2.9

## 0.11.20

### Patch Changes

- [#1383](https://github.com/graphql-hive/gateway/pull/1383)
  [`a832e7b`](https://github.com/graphql-hive/gateway/commit/a832e7bf9a8f92c48fb9df8ca1bff5a008dcf420)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/types@^0.104.7` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.7)
    (from `^0.104.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.7` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.7)
    (from `^0.104.5`, in `dependencies`)

- Updated dependencies
  [[`a832e7b`](https://github.com/graphql-hive/gateway/commit/a832e7bf9a8f92c48fb9df8ca1bff5a008dcf420)]:
  - @graphql-mesh/transport-common@0.7.38

## 0.11.19

### Patch Changes

- [#1358](https://github.com/graphql-hive/gateway/pull/1358)
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.4.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.9)
    (from `^1.4.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.1.1)
    (from `^9.1.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.1)
    (from `^10.9.0`, in `dependencies`)

- Updated dependencies
  [[`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1),
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1),
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1),
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1),
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1),
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1),
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)]:
  - @graphql-mesh/transport-common@0.7.37
  - @graphql-tools/batch-execute@9.0.19
  - @graphql-tools/delegate@10.2.23
  - @graphql-tools/federation@3.2.8
  - @graphql-tools/stitch@9.4.28
  - @graphql-tools/stitching-directives@3.1.38
  - @graphql-tools/wrap@10.1.4

## 0.11.18

### Patch Changes

- [#1318](https://github.com/graphql-hive/gateway/pull/1318)
  [`7dafdeb`](https://github.com/graphql-hive/gateway/commit/7dafdebc803e49373fe9d53997113483e512fdb0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`graphql-yoga@^5.15.1` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.15.1) (from `^5.13.5`,
    in `dependencies`)

- [#1321](https://github.com/graphql-hive/gateway/pull/1321)
  [`6215001`](https://github.com/graphql-hive/gateway/commit/6215001b1d650ad865331661532bcc4f7bad6b40)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^5.3.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.3.0) (from `^5.2.3`,
    in `dependencies`)

- [#1344](https://github.com/graphql-hive/gateway/pull/1344)
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.4.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.8)
    (from `^1.4.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.1.0)
    (from `^9.0.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.9.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.0)
    (from `^10.8.1`, in `dependencies`)

- Updated dependencies
  [[`6215001`](https://github.com/graphql-hive/gateway/commit/6215001b1d650ad865331661532bcc4f7bad6b40),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`7dafdeb`](https://github.com/graphql-hive/gateway/commit/7dafdebc803e49373fe9d53997113483e512fdb0),
  [`7287ffa`](https://github.com/graphql-hive/gateway/commit/7287ffa2ac0f08801c3058e96a7c4eba7102c1d0),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`ffa3753`](https://github.com/graphql-hive/gateway/commit/ffa3753ccb9045c5b2d62af05edc7f1d78336cb3)]:
  - @graphql-mesh/transport-common@0.7.36
  - @graphql-tools/batch-execute@9.0.18
  - @graphql-tools/delegate@10.2.22
  - @graphql-tools/federation@3.2.7
  - @graphql-tools/stitch@9.4.27
  - @graphql-tools/stitching-directives@3.1.37
  - @graphql-tools/wrap@10.1.3

## 0.11.17

### Patch Changes

- Updated dependencies
  [[`b69c80b`](https://github.com/graphql-hive/gateway/commit/b69c80b259bd0565eb9826f7ee9bc8e6c32076d1)]:
  - @graphql-tools/delegate@10.2.21
  - @graphql-tools/federation@3.2.6
  - @graphql-tools/stitch@9.4.26
  - @graphql-tools/stitching-directives@3.1.36
  - @graphql-tools/wrap@10.1.2

## 0.11.16

### Patch Changes

- Updated dependencies
  [[`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56),
  [`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56),
  [`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56)]:
  - @graphql-tools/delegate@10.2.20
  - @graphql-tools/federation@3.2.5
  - @graphql-tools/stitch@9.4.25
  - @graphql-tools/stitching-directives@3.1.35
  - @graphql-tools/wrap@10.1.1

## 0.11.15

### Patch Changes

- [#1245](https://github.com/graphql-hive/gateway/pull/1245)
  [`29f537f`](https://github.com/graphql-hive/gateway/commit/29f537f7dfcf17f3911efd5845d7af1e532d2e85)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.5)
    (from `^0.104.2`, in `dependencies`)

- [#1258](https://github.com/graphql-hive/gateway/pull/1258)
  [`3d24beb`](https://github.com/graphql-hive/gateway/commit/3d24beb7b15fd8109f86bbb3dfd514f6b8202741)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/types@^0.104.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.5)
    (from `^0.104.0`, in `dependencies`)

- Updated dependencies
  [[`3d24beb`](https://github.com/graphql-hive/gateway/commit/3d24beb7b15fd8109f86bbb3dfd514f6b8202741)]:
  - @graphql-mesh/transport-common@0.7.35
  - @graphql-tools/federation@3.2.4

## 0.11.14

### Patch Changes

- [#1156](https://github.com/graphql-hive/gateway/pull/1156)
  [`fb74009`](https://github.com/graphql-hive/gateway/commit/fb740098652dba2e9107981d1f4e362143478451)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`graphql-yoga@^5.13.5` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.13.5) (from `^5.13.4`,
    in `dependencies`)

- Updated dependencies
  [[`54beb7a`](https://github.com/graphql-hive/gateway/commit/54beb7acde7558eee81ec0e20c123717865b8e18),
  [`4a80de1`](https://github.com/graphql-hive/gateway/commit/4a80de1a2884dc42a5f09202b6215c3e6780efc4),
  [`85d7c95`](https://github.com/graphql-hive/gateway/commit/85d7c95cfe90773daf7680f2308ff4f52f0f7fa9),
  [`511ba36`](https://github.com/graphql-hive/gateway/commit/511ba36d9c8b81f83cf4cb37c03c9fbb9c5c9c9d),
  [`dca6529`](https://github.com/graphql-hive/gateway/commit/dca6529b234f1e178ad87a8992c5a7de12831128)]:
  - @graphql-tools/federation@3.2.3
  - @graphql-tools/wrap@10.1.0
  - @graphql-tools/batch-execute@9.0.17
  - @graphql-tools/stitch@9.4.24
  - @graphql-tools/delegate@10.2.19
  - @graphql-tools/stitching-directives@3.1.34

## 0.11.13

### Patch Changes

- [#1113](https://github.com/graphql-hive/gateway/pull/1113)
  [`88c9369`](https://github.com/graphql-hive/gateway/commit/88c9369abfdcb8e5ed8331c12a42a90e3b6b211b)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle serving subgraphs when;
  - No entity is found
  - Query root type has a different name than `Query`
  - Federation transform by adding `@key` directive to a type but without a resolver
- Updated dependencies
  [[`faffc17`](https://github.com/graphql-hive/gateway/commit/faffc17e72f8893e7e717d5a425205a6364e4d44),
  [`0512be3`](https://github.com/graphql-hive/gateway/commit/0512be32399268eb7926db48675ddb5763fd8578)]:
  - @graphql-tools/batch-execute@9.0.16
  - @graphql-tools/delegate@10.2.18
  - @graphql-tools/federation@3.2.2
  - @graphql-tools/stitch@9.4.23
  - @graphql-tools/stitching-directives@3.1.33
  - @graphql-tools/wrap@10.0.36

## 0.11.12

### Patch Changes

- [#1095](https://github.com/graphql-hive/gateway/pull/1095)
  [`2dc5fd8`](https://github.com/graphql-hive/gateway/commit/2dc5fd89a292811e7ea845d14e0ddacecfa83e9f)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Provide non-GraphQL upstream service
  responses to the retry mechanism configuration

## 0.11.11

### Patch Changes

- [#1053](https://github.com/graphql-hive/gateway/pull/1053)
  [`e6dfbcd`](https://github.com/graphql-hive/gateway/commit/e6dfbcd4d1d2ebbdb7c5454b691b1be2b9c466b3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Lazy print GraphQL schema for logger

## 0.11.10

### Patch Changes

- [#1015](https://github.com/graphql-hive/gateway/pull/1015)
  [`9a120c8`](https://github.com/graphql-hive/gateway/commit/9a120c85ac67654f63e374cf420ac4b73da21228)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`graphql-yoga@^5.13.3` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.13.3) (from `^5.13.2`,
    in `dependencies`)

- [#1045](https://github.com/graphql-hive/gateway/pull/1045)
  [`da47a0e`](https://github.com/graphql-hive/gateway/commit/da47a0effcc0e3c2b934bc97ab10e6e86ef8cd93)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`graphql-yoga@^5.13.4` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.13.4) (from `^5.13.3`,
    in `dependencies`)

- [#1045](https://github.com/graphql-hive/gateway/pull/1045)
  [`da47a0e`](https://github.com/graphql-hive/gateway/commit/da47a0effcc0e3c2b934bc97ab10e6e86ef8cd93)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Update graphql-yoga and whatwg-node packages

  In light of https://github.com/ardatan/whatwg-node/pull/2305. Please upgrade as soon as possible!

- Updated dependencies
  [[`da47a0e`](https://github.com/graphql-hive/gateway/commit/da47a0effcc0e3c2b934bc97ab10e6e86ef8cd93),
  [`da47a0e`](https://github.com/graphql-hive/gateway/commit/da47a0effcc0e3c2b934bc97ab10e6e86ef8cd93),
  [`4cf75cb`](https://github.com/graphql-hive/gateway/commit/4cf75cbf1f14169826d1917532ee73ee45c002d5)]:
  - @graphql-tools/federation@3.2.1

## 0.11.9

### Patch Changes

- [#946](https://github.com/graphql-hive/gateway/pull/946)
  [`7d771d8`](https://github.com/graphql-hive/gateway/commit/7d771d89ff6d731b1025acfc5eb197541a6d5d35)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.2)
    (from `^0.104.1`, in `dependencies`)

- [#950](https://github.com/graphql-hive/gateway/pull/950)
  [`c7ea2c5`](https://github.com/graphql-hive/gateway/commit/c7ea2c5ae71b6b338ef22edd927a3fc93803965f)
  Thanks [@kroupacz](https://github.com/kroupacz)! - Errors should not be swallowed when it is
  thrown from the shared root

- [#946](https://github.com/graphql-hive/gateway/pull/946)
  [`7d771d8`](https://github.com/graphql-hive/gateway/commit/7d771d89ff6d731b1025acfc5eb197541a6d5d35)
  Thanks [@ardatan](https://github.com/ardatan)! - Fail when the fetcher returns an empty result.
  Previously even if fetcher returns `undefined`, the runtime was trying to handle the result then
  fails with a cryptic error

- Updated dependencies
  [[`7d771d8`](https://github.com/graphql-hive/gateway/commit/7d771d89ff6d731b1025acfc5eb197541a6d5d35),
  [`7d771d8`](https://github.com/graphql-hive/gateway/commit/7d771d89ff6d731b1025acfc5eb197541a6d5d35),
  [`c7ea2c5`](https://github.com/graphql-hive/gateway/commit/c7ea2c5ae71b6b338ef22edd927a3fc93803965f),
  [`0af3485`](https://github.com/graphql-hive/gateway/commit/0af3485abb1b3dfba4126f09d291b2096d23aa32)]:
  - @graphql-tools/federation@3.2.0
  - @graphql-tools/delegate@10.2.17
  - @graphql-tools/stitch@9.4.22
  - @graphql-mesh/transport-common@0.7.34
  - @graphql-tools/stitching-directives@3.1.32
  - @graphql-tools/wrap@10.0.35

## 0.11.8

### Patch Changes

- Updated dependencies
  [[`a374bfc`](https://github.com/graphql-hive/gateway/commit/a374bfcf4309f5953b8c8304fba8e079b6f6b6dc)]:
  - @graphql-mesh/transport-common@0.7.33

## 0.11.7

### Patch Changes

- [#940](https://github.com/graphql-hive/gateway/pull/940)
  [`ab96392`](https://github.com/graphql-hive/gateway/commit/ab96392b3561de62cf6a57280e4c3ac0ec98d88b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Revert accidental OpenTelemetry potential
  breaking changes

## 0.11.6

### Patch Changes

- [#532](https://github.com/graphql-hive/gateway/pull/532)
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.0)
    (from `^1.2.5`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@^5.13.2` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.13.2) (from `^5.13.1`,
    in `dependencies`)

- [#919](https://github.com/graphql-hive/gateway/pull/919)
  [`3003ae2`](https://github.com/graphql-hive/gateway/commit/3003ae2545148f75edf0ddca5e84c7b527176713)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve disposal and polling cleanup

- Updated dependencies
  [[`c9cd206`](https://github.com/graphql-hive/gateway/commit/c9cd20666a740514a5c17ecd6d0c000ad0dd7106),
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04),
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04),
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04),
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04),
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04),
  [`7b86c09`](https://github.com/graphql-hive/gateway/commit/7b86c097f5d424b82c84b87c743d5ed4ebe6aa5c)]:
  - @graphql-mesh/transport-common@0.7.32
  - @graphql-tools/batch-execute@9.0.15
  - @graphql-tools/delegate@10.2.16
  - @graphql-tools/federation@3.1.7
  - @graphql-tools/stitch@9.4.21
  - @graphql-tools/wrap@10.0.34
  - @graphql-tools/stitching-directives@3.1.31

## 0.11.5

### Patch Changes

- [#862](https://github.com/graphql-hive/gateway/pull/862)
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.2.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.2.5)
    (from `^1.0.0`, in `dependencies`)

- Updated dependencies
  [[`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448),
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448),
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448),
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448),
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)]:
  - @graphql-tools/batch-execute@9.0.14
  - @graphql-tools/delegate@10.2.15
  - @graphql-tools/federation@3.1.6
  - @graphql-tools/stitch@9.4.20
  - @graphql-tools/wrap@10.0.33
  - @graphql-tools/stitching-directives@3.1.30

## 0.11.4

### Patch Changes

- [#818](https://github.com/graphql-hive/gateway/pull/818)
  [`115a1f1`](https://github.com/graphql-hive/gateway/commit/115a1f16791e5de39b14a41b375d061113844a1b)
  Thanks [@ardatan](https://github.com/ardatan)! - When the schema is reloaded during a query
  execution, retry the request instead of throwing a reload event error

## 0.11.3

### Patch Changes

- [#706](https://github.com/graphql-hive/gateway/pull/706)
  [`e393337`](https://github.com/graphql-hive/gateway/commit/e393337ecb40beffb79748b19b5aa8f2fd9197b7)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^5.2.3` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.2.3) (from `^5.1.0`,
    in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.1)
    (from `^0.104.0`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@^5.13.1` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.13.1) (from `^5.12.0`,
    in `dependencies`)
  - Added dependency
    [`@envelop/instrumentation@^1.0.0` ↗︎](https://www.npmjs.com/package/@envelop/instrumentation/v/1.0.0)
    (to `dependencies`)

- [#726](https://github.com/graphql-hive/gateway/pull/726)
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/promise-helpers@^1.0.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.0.0)
    (to `dependencies`)

- [#727](https://github.com/graphql-hive/gateway/pull/727)
  [`c54a080`](https://github.com/graphql-hive/gateway/commit/c54a080b8b9c477ed55dd7c23fc8fcae9139bec8)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.6` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.6)
    (from `^0.0.5`, in `dependencies`)

- [#772](https://github.com/graphql-hive/gateway/pull/772)
  [`002fc95`](https://github.com/graphql-hive/gateway/commit/002fc95c446470943de4d0ef1457850277c3d8aa)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Removed dependency [`constant-case@^3` ↗︎](https://www.npmjs.com/package/constant-case/v/3.0.0)
    (from `dependencies`)

- [#775](https://github.com/graphql-hive/gateway/pull/775)
  [`33f7dfd`](https://github.com/graphql-hive/gateway/commit/33f7dfdb10eef2a1e7f6dffe0ce6e4bb3cc7c2c6)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/types@^0.104.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.0)
    (from `^0.103.18`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.0)
    (from `^0.103.18`, in `dependencies`)

- [#800](https://github.com/graphql-hive/gateway/pull/800)
  [`0451e82`](https://github.com/graphql-hive/gateway/commit/0451e82446a83a17f9fd4b285da240fb00f1c162)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Handle polling correctly when a
  transport executor has an async disposal process

- Updated dependencies
  [[`e393337`](https://github.com/graphql-hive/gateway/commit/e393337ecb40beffb79748b19b5aa8f2fd9197b7),
  [`33f7dfd`](https://github.com/graphql-hive/gateway/commit/33f7dfdb10eef2a1e7f6dffe0ce6e4bb3cc7c2c6),
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`c54a080`](https://github.com/graphql-hive/gateway/commit/c54a080b8b9c477ed55dd7c23fc8fcae9139bec8),
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`9c2f323`](https://github.com/graphql-hive/gateway/commit/9c2f323ece47d9c0ef8f4e44050390096ceac17f),
  [`2a54e85`](https://github.com/graphql-hive/gateway/commit/2a54e85f2848aea7525703ea33918a21db96b26b)]:
  - @graphql-mesh/transport-common@0.7.31
  - @graphql-tools/batch-execute@9.0.13
  - @graphql-tools/delegate@10.2.14
  - @graphql-tools/federation@3.1.5
  - @graphql-tools/stitch@9.4.19
  - @graphql-tools/wrap@10.0.32
  - @graphql-tools/stitching-directives@3.1.29

## 0.11.2

### Patch Changes

- [#696](https://github.com/graphql-hive/gateway/pull/696)
  [`a289faa`](https://github.com/graphql-hive/gateway/commit/a289faae1469eb46f1458be341d21909fe5f8f8f)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^5.1.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.1.0) (from `^5.0.3`,
    in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/cross-helpers@^0.4.10` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.10)
    (from `^0.4.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.103.18` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.18)
    (from `^0.103.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.103.18` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.18)
    (from `^0.103.6`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@^5.12.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.12.0) (from
    `^5.10.11`, in `dependencies`)

- Updated dependencies
  [[`a289faa`](https://github.com/graphql-hive/gateway/commit/a289faae1469eb46f1458be341d21909fe5f8f8f),
  [`a289faa`](https://github.com/graphql-hive/gateway/commit/a289faae1469eb46f1458be341d21909fe5f8f8f)]:
  - @graphql-mesh/transport-common@0.7.30
  - @graphql-tools/federation@3.1.4

## 0.11.1

### Patch Changes

- Updated dependencies
  [[`2318393`](https://github.com/graphql-hive/gateway/commit/2318393bc7b3aca7f53806a44b59277cd176702d)]:
  - @graphql-tools/delegate@10.2.13
  - @graphql-tools/federation@3.1.3
  - @graphql-tools/stitch@9.4.18
  - @graphql-tools/stitching-directives@3.1.28
  - @graphql-tools/wrap@10.0.31

## 0.11.0

### Minor Changes

- [#605](https://github.com/graphql-hive/gateway/pull/605)
  [`e5d77f3`](https://github.com/graphql-hive/gateway/commit/e5d77f3aa177b50ea0ba2f37e02e3f87794f512e)
  Thanks [@ardatan](https://github.com/ardatan)! - Extract subgraph execution batching logic
  outside, so batching is handled by the Gateway not Stitching

  **BREAKING**; `UnifiedGraphHandlerOpts` no longer takes `batch` option, it is handled by the
  runtime itself

### Patch Changes

- [#605](https://github.com/graphql-hive/gateway/pull/605)
  [`e5d77f3`](https://github.com/graphql-hive/gateway/commit/e5d77f3aa177b50ea0ba2f37e02e3f87794f512e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/batch-execute@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/workspace:^)
    (to `dependencies`)

- [#620](https://github.com/graphql-hive/gateway/pull/620)
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.1)
    (from `^10.7.0`, in `dependencies`)

- [#642](https://github.com/graphql-hive/gateway/pull/642)
  [`30e41a6`](https://github.com/graphql-hive/gateway/commit/30e41a6f5b97c42ae548564bce3f6e4a92b1225f)
  Thanks [@ardatan](https://github.com/ardatan)! - New JSON-based logger

  By default, it prints pretty still to the console unless NODE_ENV is production. For JSON output,
  set the `LOG_FORMAT` environment variable to `json`.

- Updated dependencies
  [[`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`7146f8d`](https://github.com/graphql-hive/gateway/commit/7146f8decca808ab2c68f4971ba9b64ca27a9b87),
  [`7146f8d`](https://github.com/graphql-hive/gateway/commit/7146f8decca808ab2c68f4971ba9b64ca27a9b87)]:
  - @graphql-mesh/transport-common@0.7.29
  - @graphql-tools/batch-execute@9.0.12
  - @graphql-tools/delegate@10.2.12
  - @graphql-tools/federation@3.1.2
  - @graphql-tools/stitch@9.4.17
  - @graphql-tools/stitching-directives@3.1.27
  - @graphql-tools/wrap@10.0.30

## 0.10.32

### Patch Changes

- [#590](https://github.com/graphql-hive/gateway/pull/590)
  [`203172c`](https://github.com/graphql-hive/gateway/commit/203172c479f764bf09f447512f8904277bff0b20)
  Thanks [@ardatan](https://github.com/ardatan)! - Refactor to make it easier to replace the
  supergraph execution

- Updated dependencies
  [[`8c80ac9`](https://github.com/graphql-hive/gateway/commit/8c80ac98cd5afd7c063945f4704fe4866622c5d7)]:
  - @graphql-mesh/transport-common@0.7.28
  - @graphql-tools/federation@3.1.1

## 0.10.31

### Patch Changes

- [#538](https://github.com/graphql-hive/gateway/pull/538)
  [`aab5441`](https://github.com/graphql-hive/gateway/commit/aab544176983e241c62f15242a35ca1398efa044)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`graphql-yoga@^5.10.11` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.10.11) (from
    `^5.10.6`, in `dependencies`)

- Updated dependencies
  [[`b52c9ba`](https://github.com/graphql-hive/gateway/commit/b52c9ba47f84d0905f1f63fdfe071c891dce5b7f),
  [`9144222`](https://github.com/graphql-hive/gateway/commit/91442220b2242a0fa082d4b544d03621572eecd0),
  [`b0bc26b`](https://github.com/graphql-hive/gateway/commit/b0bc26b8e18a2e61e5fa96f48cd77820e3598b52)]:
  - @graphql-tools/federation@3.1.0
  - @graphql-tools/delegate@10.2.11
  - @graphql-tools/stitch@9.4.16
  - @graphql-tools/stitching-directives@3.1.26
  - @graphql-tools/wrap@10.0.29

## 0.10.30

### Patch Changes

- Updated dependencies
  [[`18682e6`](https://github.com/graphql-hive/gateway/commit/18682e6873091afe63f09414f02f93649a4da141),
  [`e9f78cd`](https://github.com/graphql-hive/gateway/commit/e9f78cd29681ca9b4371e12953a31d2b8f5e4c17)]:
  - @graphql-tools/delegate@10.2.10
  - @graphql-tools/wrap@10.0.28
  - @graphql-tools/federation@3.0.10
  - @graphql-tools/stitch@9.4.15
  - @graphql-tools/stitching-directives@3.1.25

## 0.10.29

### Patch Changes

- [#420](https://github.com/graphql-hive/gateway/pull/420)
  [`14152f7`](https://github.com/graphql-hive/gateway/commit/14152f70d91572c0e60ba15ddeb2ffd0b41c9e92)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^5.0.3` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.3) (from `^5.0.1`,
    in `dependencies`)

- [#420](https://github.com/graphql-hive/gateway/pull/420)
  [`14152f7`](https://github.com/graphql-hive/gateway/commit/14152f70d91572c0e60ba15ddeb2ffd0b41c9e92)
  Thanks [@ardatan](https://github.com/ardatan)! - - In case of schema reload, throw `SCHEMA_RELOAD`
  error while recreating the transports and executors
  - In case of shut down, throw `SHUTTING_DOWN` error while cleaning the transports and executors up

  Previously, these errors are only thrown for subscriptions not it is thrown in other type of
  operations as well. And previously the thrown errors during these two cleanup and restart process
  were cryptic, now the mentioned two errors above are thrown with more clear messages

- [#420](https://github.com/graphql-hive/gateway/pull/420)
  [`14152f7`](https://github.com/graphql-hive/gateway/commit/14152f70d91572c0e60ba15ddeb2ffd0b41c9e92)
  Thanks [@ardatan](https://github.com/ardatan)! - Leave the supergraph configuration handling logic
  to fusion-runtime package so it can compare bare read supergraph sdl directly inside unified graph
  manager to decide if the supergraph has changed.

- Updated dependencies
  [[`14152f7`](https://github.com/graphql-hive/gateway/commit/14152f70d91572c0e60ba15ddeb2ffd0b41c9e92),
  [`a625269`](https://github.com/graphql-hive/gateway/commit/a62526936680d030339fc26cc55d76507134b022),
  [`a625269`](https://github.com/graphql-hive/gateway/commit/a62526936680d030339fc26cc55d76507134b022),
  [`14152f7`](https://github.com/graphql-hive/gateway/commit/14152f70d91572c0e60ba15ddeb2ffd0b41c9e92)]:
  - @graphql-mesh/transport-common@0.7.27
  - @graphql-tools/stitch@9.4.14
  - @graphql-tools/federation@3.0.9

## 0.10.28

### Patch Changes

- Updated dependencies
  [[`0591aa9`](https://github.com/graphql-hive/gateway/commit/0591aa9cc9718a1c7d8b6fa68723a3155f775cc7)]:
  - @graphql-tools/federation@3.0.8

## 0.10.27

### Patch Changes

- Updated dependencies
  [[`3571399`](https://github.com/graphql-hive/gateway/commit/35713997b5330989b001c6317631621af24c404b)]:
  - @graphql-tools/federation@3.0.7
  - @graphql-mesh/transport-common@0.7.26
  - @graphql-tools/stitch@9.4.13

## 0.10.26

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/stitch@9.4.12
  - @graphql-tools/federation@3.0.6

## 0.10.25

### Patch Changes

- Updated dependencies
  [[`55eb1b4`](https://github.com/graphql-hive/gateway/commit/55eb1b4d14aec7b3e6c7bcf9f596bc01192d022c),
  [`55eb1b4`](https://github.com/graphql-hive/gateway/commit/55eb1b4d14aec7b3e6c7bcf9f596bc01192d022c)]:
  - @graphql-mesh/transport-common@0.7.25
  - @graphql-tools/federation@3.0.5

## 0.10.24

### Patch Changes

- [#373](https://github.com/graphql-hive/gateway/pull/373)
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.3.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.10)
    (from `^1.3.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.7.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.7.0)
    (from `^10.6.2`, in `dependencies`)

- [#367](https://github.com/graphql-hive/gateway/pull/367)
  [`15975c2`](https://github.com/graphql-hive/gateway/commit/15975c28daddbb4f31d520371f53520aecacaac7)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the combination of `upstreamRetry` and
  `upstreamTimeout` together

  When you use `upstreamRetry` and `upstreamTimeout` together, the `upstreamRetry` wasn't applied
  properly when the request is timed out with `upstreamTimeout`.

- Updated dependencies
  [[`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2),
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2),
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2),
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2),
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2),
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2),
  [`15975c2`](https://github.com/graphql-hive/gateway/commit/15975c28daddbb4f31d520371f53520aecacaac7)]:
  - @graphql-mesh/transport-common@0.7.24
  - @graphql-tools/delegate@10.2.9
  - @graphql-tools/federation@3.0.4
  - @graphql-tools/stitch@9.4.11
  - @graphql-tools/stitching-directives@3.1.24
  - @graphql-tools/wrap@10.0.27

## 0.10.23

### Patch Changes

- [#357](https://github.com/graphql-hive/gateway/pull/357)
  [`8b64103`](https://github.com/graphql-hive/gateway/commit/8b64103324d82c4934ff459ea644276bafbcda17)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the bug on setting the default polling
  interval to 10 seconds So by default, the gateway will poll the schema every 10 seconds, and
  update the schema if it has changed.

  This PR also contains improvements on logging about polling

## 0.10.22

### Patch Changes

- [#333](https://github.com/graphql-hive/gateway/pull/333)
  [`0d81307`](https://github.com/graphql-hive/gateway/commit/0d813079753e7c66158499e2db6e301a3c145856)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`graphql-yoga@^5.10.6` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.10.6) (from `^5.10.4`,
    in `dependencies`)

- Updated dependencies
  [[`0d81307`](https://github.com/graphql-hive/gateway/commit/0d813079753e7c66158499e2db6e301a3c145856)]:
  - @graphql-tools/federation@3.0.3

## 0.10.21

### Patch Changes

- Updated dependencies
  [[`23b8987`](https://github.com/graphql-hive/gateway/commit/23b89874fcf10b4cb6b1b941f29fa5f5aecf0ef2),
  [`23b8987`](https://github.com/graphql-hive/gateway/commit/23b89874fcf10b4cb6b1b941f29fa5f5aecf0ef2)]:
  - @graphql-mesh/transport-common@0.7.23
  - @graphql-tools/delegate@10.2.8
  - @graphql-tools/federation@3.0.2
  - @graphql-tools/stitch@9.4.10
  - @graphql-tools/stitching-directives@3.1.23
  - @graphql-tools/wrap@10.0.26

## 0.10.20

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/federation@3.0.1

## 0.10.19

### Patch Changes

- Updated dependencies
  [[`d747d4c`](https://github.com/graphql-hive/gateway/commit/d747d4cd37317e8a9b2b95a5270c0fbd47e4cba3),
  [`d747d4c`](https://github.com/graphql-hive/gateway/commit/d747d4cd37317e8a9b2b95a5270c0fbd47e4cba3)]:
  - @graphql-tools/federation@3.0.0

## 0.10.18

### Patch Changes

- [#291](https://github.com/graphql-hive/gateway/pull/291)
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/cross-helpers@^0.4.9` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.9)
    (from `^0.4.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.103.6` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.6)
    (from `^0.103.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.103.6` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.6)
    (from `^0.103.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.6.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.2)
    (from `^10.6.0`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@^5.10.4` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.10.4) (from `^5.10.3`,
    in `dependencies`)
  - Updated dependency [`tslib@^2.8.1` ↗︎](https://www.npmjs.com/package/tslib/v/2.8.1) (from
    `^2.4.0`, in `dependencies`)

- Updated dependencies
  [[`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151),
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151),
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151),
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151),
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151),
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)]:
  - @graphql-mesh/transport-common@0.7.22
  - @graphql-tools/delegate@10.2.7
  - @graphql-tools/federation@2.2.40
  - @graphql-tools/stitch@9.4.9
  - @graphql-tools/stitching-directives@3.1.22
  - @graphql-tools/wrap@10.0.25

## 0.10.17

### Patch Changes

- [#289](https://github.com/graphql-hive/gateway/pull/289)
  [`3b901c6`](https://github.com/graphql-hive/gateway/commit/3b901c66eabd076add8ed90709d34a1cc39c58f3)
  Thanks [@ardatan](https://github.com/ardatan)! - Use \`require\` directly on CommonJS

## 0.10.16

### Patch Changes

- [#286](https://github.com/graphql-hive/gateway/pull/286)
  [`ed9e205`](https://github.com/graphql-hive/gateway/commit/ed9e205adf705f31b6ae85ce4ad7a8eb0b30fe32)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Removed dependency
    [`@graphql-mesh/store@^0.103.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/store/v/0.103.4)
    (from `dependencies`)

## 0.10.15

### Patch Changes

- [#284](https://github.com/graphql-hive/gateway/pull/284)
  [`f2e0ae2`](https://github.com/graphql-hive/gateway/commit/f2e0ae2162f3fd3f1b2d3eefb6a21410c840db1b)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not use require explicitly

- [#284](https://github.com/graphql-hive/gateway/pull/284)
  [`f2e0ae2`](https://github.com/graphql-hive/gateway/commit/f2e0ae2162f3fd3f1b2d3eefb6a21410c840db1b)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid \`require\` but use \`globalThis.require\`
  instead

## 0.10.14

### Patch Changes

- [#274](https://github.com/graphql-hive/gateway/pull/274)
  [`3f1a0fa`](https://github.com/graphql-hive/gateway/commit/3f1a0fa9f1f3b91542d00a0211d7def8ef30827e)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve \`import\` and \`require\` interop

- Updated dependencies []:
  - @graphql-tools/federation@2.2.39

## 0.10.13

### Patch Changes

- [#269](https://github.com/graphql-hive/gateway/pull/269)
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.3.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.6)
    (from `^1.3.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.0.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.0.12)
    (from `^9.0.8`, in `dependencies`)

- Updated dependencies
  [[`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4),
  [`7df2215`](https://github.com/graphql-hive/gateway/commit/7df2215abd309dc1dfd91f4ec91ce975f3982c62),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)]:
  - @graphql-mesh/transport-common@0.7.21
  - @graphql-tools/delegate@10.2.6
  - @graphql-tools/federation@2.2.38
  - @graphql-tools/stitch@9.4.8
  - @graphql-tools/stitching-directives@3.1.21
  - @graphql-tools/wrap@10.0.24

## 0.10.12

### Patch Changes

- Updated dependencies
  [[`9ce705c`](https://github.com/graphql-hive/gateway/commit/9ce705c5ccc5e6f4ac26af6e6471a6d2f4e995db)]:
  - @graphql-tools/delegate@10.2.5
  - @graphql-tools/federation@2.2.37
  - @graphql-tools/stitch@9.4.7
  - @graphql-tools/stitching-directives@3.1.20
  - @graphql-mesh/transport-common@0.7.20
  - @graphql-tools/wrap@10.0.23

## 0.10.11

### Patch Changes

- [#248](https://github.com/graphql-hive/gateway/pull/248)
  [`248c8a6`](https://github.com/graphql-hive/gateway/commit/248c8a65483b1dc7237f223ce1a707d6754192f6)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Log Unified Graph caching errors

- [#247](https://github.com/graphql-hive/gateway/pull/247)
  [`76642d8`](https://github.com/graphql-hive/gateway/commit/76642d84b722bae28115310f25a6ac4865b41598)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle \`@resolveTo\` for interfaces correctly

- [#248](https://github.com/graphql-hive/gateway/pull/248)
  [`248c8a6`](https://github.com/graphql-hive/gateway/commit/248c8a65483b1dc7237f223ce1a707d6754192f6)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Log caching of unified graph

- [#248](https://github.com/graphql-hive/gateway/pull/248)
  [`248c8a6`](https://github.com/graphql-hive/gateway/commit/248c8a65483b1dc7237f223ce1a707d6754192f6)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Increase default TTL for caching Unified
  Graph to 60s

- Updated dependencies
  [[`76642d8`](https://github.com/graphql-hive/gateway/commit/76642d84b722bae28115310f25a6ac4865b41598)]:
  - @graphql-tools/stitch@9.4.6
  - @graphql-tools/federation@2.2.36

## 0.10.10

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@10.2.4
  - @graphql-tools/federation@2.2.35
  - @graphql-tools/stitch@9.4.5
  - @graphql-tools/stitching-directives@3.1.19
  - @graphql-mesh/transport-common@0.7.19
  - @graphql-tools/wrap@10.0.22

## 0.10.9

### Patch Changes

- [#234](https://github.com/graphql-hive/gateway/pull/234)
  [`ba7e585`](https://github.com/graphql-hive/gateway/commit/ba7e585bcabbcec2ccd35f0903f25fdce9eeb214)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop \`@hidden\` support in favor of
  \`@inaccessible\`

- Updated dependencies
  [[`ba7e585`](https://github.com/graphql-hive/gateway/commit/ba7e585bcabbcec2ccd35f0903f25fdce9eeb214)]:
  - @graphql-tools/federation@2.2.34

## 0.10.8

### Patch Changes

- Updated dependencies
  [[`7ca0ff3`](https://github.com/graphql-hive/gateway/commit/7ca0ff331e42c133c4218a8086bbf0a7607f45d0)]:
  - @graphql-tools/federation@2.2.33
  - @graphql-tools/delegate@10.2.3
  - @graphql-tools/stitch@9.4.4
  - @graphql-tools/stitching-directives@3.1.18
  - @graphql-mesh/transport-common@0.7.18
  - @graphql-tools/wrap@10.0.21

## 0.10.7

### Patch Changes

- [#205](https://github.com/graphql-hive/gateway/pull/205)
  [`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency [`graphql-yoga@^5.10.3` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.10.3)
    (to `dependencies`)

- [#208](https://github.com/graphql-hive/gateway/pull/208)
  [`baf896d`](https://github.com/graphql-hive/gateway/commit/baf896d961bf122f7598355b0e9a09d93be1d822)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency [`graphql-yoga@^5.7.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.7.0)
    (from `dependencies`)

- Updated dependencies
  [[`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a),
  [`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a)]:
  - @graphql-tools/federation@2.2.32
  - @graphql-tools/delegate@10.2.2
  - @graphql-tools/stitch@9.4.3
  - @graphql-tools/stitching-directives@3.1.17
  - @graphql-mesh/transport-common@0.7.17
  - @graphql-tools/wrap@10.0.20

## 0.10.6

### Patch Changes

- [#164](https://github.com/graphql-hive/gateway/pull/164)
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (from `^10.5.6`, in `dependencies`)

- [#180](https://github.com/graphql-hive/gateway/pull/180)
  [`9438e21`](https://github.com/graphql-hive/gateway/commit/9438e21982ed5c6fb18cb678b275046595ae00f5)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/store@^0.103.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/store/v/0.103.4)
    (from `^0.103.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.103.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.4)
    (from `^0.103.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.103.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.4)
    (from `^0.103.1`, in `dependencies`)
  - Removed dependency
    [`@graphql-mesh/runtime@^0.105.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/runtime/v/0.105.0)
    (from `dependencies`)

- [#185](https://github.com/graphql-hive/gateway/pull/185)
  [`f0b6921`](https://github.com/graphql-hive/gateway/commit/f0b69219fefc1b24c5511a1c623a5e3bbaf5ca0b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/store@^0.103.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/store/v/0.103.4)
    (from `^0.103.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.103.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.4)
    (from `^0.103.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.103.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.4)
    (from `^0.103.1`, in `dependencies`)
  - Removed dependency
    [`@graphql-mesh/runtime@^0.105.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/runtime/v/0.105.0)
    (from `dependencies`)

- [#98](https://github.com/graphql-hive/gateway/pull/98)
  [`697308d`](https://github.com/graphql-hive/gateway/commit/697308df3b2dd96f28dc65a5f5361a911077e022)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/cross-helpers@^0.4.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.8)
    (from `^0.4.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.103.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.1)
    (from `^0.103.0`, in `dependencies`)

- [#180](https://github.com/graphql-hive/gateway/pull/180)
  [`9438e21`](https://github.com/graphql-hive/gateway/commit/9438e21982ed5c6fb18cb678b275046595ae00f5)
  Thanks [@ardatan](https://github.com/ardatan)! - Use new explicit resource management internally

- Updated dependencies
  [[`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`9438e21`](https://github.com/graphql-hive/gateway/commit/9438e21982ed5c6fb18cb678b275046595ae00f5),
  [`f0b6921`](https://github.com/graphql-hive/gateway/commit/f0b69219fefc1b24c5511a1c623a5e3bbaf5ca0b),
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`f0b6921`](https://github.com/graphql-hive/gateway/commit/f0b69219fefc1b24c5511a1c623a5e3bbaf5ca0b),
  [`f71366d`](https://github.com/graphql-hive/gateway/commit/f71366d234fe8f30a419814fe1460f1e22663241),
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`f0b6921`](https://github.com/graphql-hive/gateway/commit/f0b69219fefc1b24c5511a1c623a5e3bbaf5ca0b),
  [`f71366d`](https://github.com/graphql-hive/gateway/commit/f71366d234fe8f30a419814fe1460f1e22663241),
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`f0b6921`](https://github.com/graphql-hive/gateway/commit/f0b69219fefc1b24c5511a1c623a5e3bbaf5ca0b),
  [`f71366d`](https://github.com/graphql-hive/gateway/commit/f71366d234fe8f30a419814fe1460f1e22663241),
  [`b534288`](https://github.com/graphql-hive/gateway/commit/b5342885f8ac1197d70cbf45266c83b720b4f85a)]:
  - @graphql-mesh/transport-common@0.7.16
  - @graphql-tools/delegate@10.2.1
  - @graphql-tools/federation@2.2.31
  - @graphql-tools/stitch@9.4.2
  - @graphql-tools/stitching-directives@3.1.16
  - @graphql-tools/wrap@10.0.19

## 0.10.5

### Patch Changes

- Updated dependencies
  [[`725d5b7`](https://github.com/graphql-hive/gateway/commit/725d5b7952be3a2fb2caeb40d26c194fb03b35d5)]:
  - @graphql-tools/federation@2.2.30
  - @graphql-tools/stitch@9.4.1

## 0.10.4

### Patch Changes

- [#148](https://github.com/graphql-hive/gateway/pull/148)
  [`f32cb2a`](https://github.com/graphql-hive/gateway/commit/f32cb2a0289aa32e4811ced5dc1aac3efb0674f1)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/runtime@^0.105.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/runtime/v/0.105.0)
    (from `^0.104.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/store@^0.103.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/store/v/0.103.0)
    (from `^0.102.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.103.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.0)
    (from `^0.102.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.103.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.0)
    (from `^0.102.12`, in `dependencies`)

- [#150](https://github.com/graphql-hive/gateway/pull/150)
  [`c0e189a`](https://github.com/graphql-hive/gateway/commit/c0e189ac83901da3a101f16f151e859ff7cca19f)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/runtime@^0.105.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/runtime/v/0.105.0)
    (from `^0.104.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/store@^0.103.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/store/v/0.103.0)
    (from `^0.102.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.103.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.0)
    (from `^0.102.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.103.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.0)
    (from `^0.102.12`, in `dependencies`)

- [#148](https://github.com/graphql-hive/gateway/pull/148)
  [`f32cb2a`](https://github.com/graphql-hive/gateway/commit/f32cb2a0289aa32e4811ced5dc1aac3efb0674f1)
  Thanks [@ardatan](https://github.com/ardatan)! - Introduce \`onDelegationPlan\` and
  \`onDelegationStageExecuteDone\` hooks

- Updated dependencies
  [[`f32cb2a`](https://github.com/graphql-hive/gateway/commit/f32cb2a0289aa32e4811ced5dc1aac3efb0674f1),
  [`c0e189a`](https://github.com/graphql-hive/gateway/commit/c0e189ac83901da3a101f16f151e859ff7cca19f),
  [`f32cb2a`](https://github.com/graphql-hive/gateway/commit/f32cb2a0289aa32e4811ced5dc1aac3efb0674f1)]:
  - @graphql-mesh/transport-common@0.7.15
  - @graphql-tools/delegate@10.2.0
  - @graphql-tools/stitch@9.4.0
  - @graphql-tools/federation@2.2.29
  - @graphql-tools/stitching-directives@3.1.15
  - @graphql-tools/wrap@10.0.18

## 0.10.3

### Patch Changes

- [#108](https://github.com/graphql-hive/gateway/pull/108)
  [`86c7ac1`](https://github.com/graphql-hive/gateway/commit/86c7ac1df787e9d38bdb001483b0588ada962c5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/workspace:^)
    (from `^0.7.13`, in `dependencies`)
  - Added dependency
    [`@graphql-mesh/store@^0.102.12` ↗︎](https://www.npmjs.com/package/@graphql-mesh/store/v/0.102.12)
    (to `dependencies`)
  - Added dependency [`constant-case@^3` ↗︎](https://www.npmjs.com/package/constant-case/v/3.0.0) (to
    `dependencies`)
  - Removed dependency [`change-case@^4.1.2` ↗︎](https://www.npmjs.com/package/change-case/v/4.1.2)
    (from `dependencies`)

- [#118](https://github.com/graphql-hive/gateway/pull/118)
  [`73c621d`](https://github.com/graphql-hive/gateway/commit/73c621d98a4e6ca134527e349bc71223c03d06db)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/workspace:^)
    (from `^10.0.28`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/workspace:^)
    (from `^2.2.21`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitch@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/workspace:^)
    (from `^9.2.17`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/workspace:^)
    (from `^3.1.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/workspace:^)
    (from `^10.0.12`, in `dependencies`)

- [#110](https://github.com/graphql-hive/gateway/pull/110)
  [`b84b8f9`](https://github.com/graphql-hive/gateway/commit/b84b8f99d9431a6865303aee001dd62ef9eb5d26)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not override existing merge configuration

- [`c95d25e`](https://github.com/graphql-hive/gateway/commit/c95d25e3a2dbe20795f88965cdcd22a49f51f1c1)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - `onError` and `onEnd` callbacks from
  `onSubgraphExecute` are invoked only once regardless of how many times throw/return was called on
  the iterator

- Updated dependencies
  [[`73c621d`](https://github.com/graphql-hive/gateway/commit/73c621d98a4e6ca134527e349bc71223c03d06db),
  [`73c621d`](https://github.com/graphql-hive/gateway/commit/73c621d98a4e6ca134527e349bc71223c03d06db),
  [`19bc6a4`](https://github.com/graphql-hive/gateway/commit/19bc6a4c222ff157553785ea16760888cdfe10bb)]:
  - @graphql-mesh/transport-common@0.7.14
  - @graphql-tools/delegate@10.1.3
  - @graphql-tools/wrap@10.0.17
  - @graphql-tools/federation@2.2.28
  - @graphql-tools/stitch@9.3.5
  - @graphql-tools/stitching-directives@3.1.14

## 0.10.2

### Patch Changes

- Updated dependencies
  [[`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7),
  [`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7)]:
  - @graphql-mesh/runtime@0.104.1
  - @graphql-mesh/utils@0.102.12
  - @graphql-mesh/types@0.102.12
  - @graphql-mesh/transport-common@0.7.13

## 0.10.1

### Patch Changes

- [`9975782`](https://github.com/ardatan/graphql-mesh/commit/9975782984a2cf564f835055669a35b262eaefc7)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the signature of sdk requester

## 0.10.0

### Patch Changes

- Updated dependencies
  [[`ac82d44`](https://github.com/ardatan/graphql-mesh/commit/ac82d4437b3fafd6eafb21d5470cc6bae8b7b482)]:
  - @graphql-mesh/runtime@0.104.0

## 0.9.7

### Patch Changes

- [#7838](https://github.com/ardatan/graphql-mesh/pull/7838)
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.28` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.28)
    (from `^10.0.27`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.2.21` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.21)
    (from `^2.2.19`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitch@^9.2.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/9.2.17)
    (from `^9.2.15`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^3.1.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.1.9)
    (from `^3.1.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@^10.0.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/10.0.12)
    (from `^10.0.11`, in `dependencies`)
- Updated dependencies
  [[`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af),
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af),
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af),
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)]:
  - @graphql-mesh/runtime@0.103.12
  - @graphql-mesh/transport-common@0.7.12
  - @graphql-mesh/types@0.102.11
  - @graphql-mesh/utils@0.102.11

## 0.9.6

### Patch Changes

- [#7712](https://github.com/ardatan/graphql-mesh/pull/7712)
  [`dc54d58`](https://github.com/ardatan/graphql-mesh/commit/dc54d589afa0d08378565e1153b679397f2853a5)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - WebSocket connections are now cached
  against the whole `connectionParams` object and forwarded `headers`. The fixes WebSocket
  connection being reused wrongly when `connectionParams.token` is stable while other fields are
  changing.

## 0.9.5

### Patch Changes

- [#7828](https://github.com/ardatan/graphql-mesh/pull/7828)
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.27` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.27)
    (from `^10.0.26`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.2.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.19)
    (from `^2.2.17`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^3.1.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.1.8)
    (from `^3.1.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@^10.0.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/10.0.11)
    (from `^10.0.10`, in `dependencies`)
- Updated dependencies
  [[`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71),
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71),
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71),
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)]:
  - @graphql-mesh/runtime@0.103.11
  - @graphql-mesh/transport-common@0.7.11
  - @graphql-mesh/types@0.102.10
  - @graphql-mesh/utils@0.102.10

## 0.9.4

### Patch Changes

- [#7816](https://github.com/ardatan/graphql-mesh/pull/7816)
  [`fad4d27`](https://github.com/ardatan/graphql-mesh/commit/fad4d27bfebb80a374c2041b86ffab509845effe)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/merge@^9.0.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.0.8)
    (to `dependencies`)

- [#7816](https://github.com/ardatan/graphql-mesh/pull/7816)
  [`fad4d27`](https://github.com/ardatan/graphql-mesh/commit/fad4d27bfebb80a374c2041b86ffab509845effe)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix subscription fields fed by webhooks and
  defined in \`additionalTypeDefs\` with \`@resolveTo\`

- Updated dependencies
  [[`fad4d27`](https://github.com/ardatan/graphql-mesh/commit/fad4d27bfebb80a374c2041b86ffab509845effe)]:
  - @graphql-mesh/utils@0.102.9
  - @graphql-mesh/runtime@0.103.10
  - @graphql-mesh/types@0.102.9
  - @graphql-mesh/transport-common@0.7.10

## 0.9.3

### Patch Changes

- [#7805](https://github.com/ardatan/graphql-mesh/pull/7805)
  [`f7ad933`](https://github.com/ardatan/graphql-mesh/commit/f7ad933b242ca5facb219364f73d1a3befc2bc17)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/federation@^2.2.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.17)
    (from `^2.2.16`, in `dependencies`)

## 0.9.2

### Patch Changes

- [#7769](https://github.com/ardatan/graphql-mesh/pull/7769)
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.26` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.26)
    (from `^10.0.23`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.2.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.16)
    (from `^2.2.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitch@^9.2.15` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/9.2.15)
    (from `^9.2.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^3.1.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.1.7)
    (from `^3.1.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@^10.0.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/10.0.10)
    (from `^10.0.7`, in `dependencies`)
- Updated dependencies
  [[`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`359da22`](https://github.com/ardatan/graphql-mesh/commit/359da22a9785fbea4402b282a4104ff14697cc45),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)]:
  - @graphql-mesh/runtime@0.103.9
  - @graphql-mesh/transport-common@0.7.9
  - @graphql-mesh/types@0.102.8
  - @graphql-mesh/utils@0.102.8

## 0.9.1

### Patch Changes

- [#7781](https://github.com/ardatan/graphql-mesh/pull/7781)
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.23` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.23)
    (from `^10.0.21`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor@^1.3.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.2)
    (from `^1.3.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.2.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.12)
    (from `^2.2.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitch@^9.2.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/9.2.12)
    (from `^9.2.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitching-directives@^3.1.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.1.4)
    (from `^3.1.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.5.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.5)
    (from `^10.5.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@^10.0.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/10.0.7)
    (from `^10.0.5`, in `dependencies`)
- Updated dependencies
  [[`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)]:
  - @graphql-mesh/cross-helpers@0.4.7
  - @graphql-mesh/runtime@0.103.8
  - @graphql-mesh/transport-common@0.7.8
  - @graphql-mesh/types@0.102.7
  - @graphql-mesh/utils@0.102.7

## 0.9.0

### Minor Changes

- [#7746](https://github.com/ardatan/graphql-mesh/pull/7746)
  [`c8b1309`](https://github.com/ardatan/graphql-mesh/commit/c8b1309a707c358dc446799a986c99e120767d0e)
  Thanks [@renovate](https://github.com/apps/renovate)! - Remove workaround for directives on enums,
  enum values and unions

## 0.8.14

### Patch Changes

- Updated dependencies
  [[`bf588d3`](https://github.com/ardatan/graphql-mesh/commit/bf588d372c0078378aaa24beea2da794af7949e6)]:
  - @graphql-mesh/utils@0.102.6
  - @graphql-mesh/runtime@0.103.7
  - @graphql-mesh/types@0.102.6
  - @graphql-mesh/transport-common@0.7.7

## 0.8.13

### Patch Changes

- [#7738](https://github.com/ardatan/graphql-mesh/pull/7738)
  [`01f6ad9`](https://github.com/ardatan/graphql-mesh/commit/01f6ad94b8a107bb52abb3f8a356ecadef42b02d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Use source name when hoisting fields

## 0.8.12

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

## 0.8.11

### Patch Changes

- [#7668](https://github.com/ardatan/graphql-mesh/pull/7668)
  [`547cbb7`](https://github.com/ardatan/graphql-mesh/commit/547cbb7afa17d1559d9b365facc51618df995367)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/federation@^2.2.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.10)
    (from `^2.2.9`, in `dependencies`)

- [#7668](https://github.com/ardatan/graphql-mesh/pull/7668)
  [`547cbb7`](https://github.com/ardatan/graphql-mesh/commit/547cbb7afa17d1559d9b365facc51618df995367)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix additional type definitions without shared
  types

## 0.8.10

### Patch Changes

- [`ccadfab`](https://github.com/ardatan/graphql-mesh/commit/ccadfabb345139f6320861752872e7454b0feea0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Header Propagation

## 0.8.9

### Patch Changes

- [`0443063`](https://github.com/ardatan/graphql-mesh/commit/04430632fb2fd5f90c264ad6ca9a0eb89a789c05)
  Thanks [@ardatan](https://github.com/ardatan)! - Local execution

## 0.8.8

### Patch Changes

- Updated dependencies
  [[`7df3815`](https://github.com/ardatan/graphql-mesh/commit/7df381588b8f0934cf93d67cb9ac6268295f990e)]:
  - @graphql-mesh/runtime@0.103.6

## 0.8.7

### Patch Changes

- [`81c25d3`](https://github.com/ardatan/graphql-mesh/commit/81c25d3a32ba9048303be26b5a38eeaf82a66e73)
  Thanks [@ardatan](https://github.com/ardatan)! - DX improvements, less noisy logs by default

## 0.8.6

### Patch Changes

- [#7595](https://github.com/ardatan/graphql-mesh/pull/7595)
  [`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.4)
    (from `^0.0.3`, in `dependencies`)

- [#7596](https://github.com/ardatan/graphql-mesh/pull/7596)
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.5)
    (from `^0.0.4`, in `dependencies`)

- [#7597](https://github.com/ardatan/graphql-mesh/pull/7597)
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.5)
    (from `^0.0.4`, in `dependencies`)
- Updated dependencies
  [[`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d)]:
  - @graphql-mesh/utils@0.102.5
  - @graphql-mesh/runtime@0.103.5
  - @graphql-mesh/types@0.102.5
  - @graphql-mesh/transport-common@0.7.6

## 0.8.5

### Patch Changes

- Updated dependencies
  [[`5146df0`](https://github.com/ardatan/graphql-mesh/commit/5146df0fd3313227d5d7df2beb726ca89e13923f)]:
  - @graphql-mesh/transport-common@0.7.5

## 0.8.4

### Patch Changes

- [#7576](https://github.com/ardatan/graphql-mesh/pull/7576)
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.21` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.21)
    (from `^10.0.20`, in `dependencies`)
- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/runtime@0.103.4
  - @graphql-mesh/transport-common@0.7.4
  - @graphql-mesh/types@0.102.4
  - @graphql-mesh/utils@0.102.4

## 0.8.3

### Patch Changes

- [#7572](https://github.com/ardatan/graphql-mesh/pull/7572)
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.20)
    (from `^10.0.19`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.2.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.9)
    (from `^2.2.8`, in `dependencies`)

- [#7569](https://github.com/ardatan/graphql-mesh/pull/7569)
  [`e9d73b7`](https://github.com/ardatan/graphql-mesh/commit/e9d73b7f3af98544f24d7223de735034abf17feb)
  Thanks [@ardatan](https://github.com/ardatan)! - If the first poll fails, keep polling but fail on
  requests If any poll fails in somewhere, keep polling but keep using the last successful
  supergraph

  So if the CDN is down at some point, the gateway will keep polling the supergraph, but will keep
  using the last successful supergraph. This is useful for cases where the CDN is down, but the
  supergraph is still available.

- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)]:
  - @graphql-mesh/runtime@0.103.3
  - @graphql-mesh/transport-common@0.7.3
  - @graphql-mesh/types@0.102.3
  - @graphql-mesh/utils@0.102.3

## 0.8.2

### Patch Changes

- [#7555](https://github.com/ardatan/graphql-mesh/pull/7555)
  [`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.3` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.3)
    (from `^0.0.2`, in `dependencies`)
- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/utils@0.102.2
  - @graphql-mesh/runtime@0.103.2
  - @graphql-mesh/types@0.102.2
  - @graphql-mesh/transport-common@0.7.2

## 0.8.1

### Patch Changes

- [#7553](https://github.com/ardatan/graphql-mesh/pull/7553)
  [`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.2)
    (from `^0.0.1`, in `dependencies`)

- [#7553](https://github.com/ardatan/graphql-mesh/pull/7553)
  [`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de)
  Thanks [@renovate](https://github.com/apps/renovate)! - Fix transport cleanup logic

- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de),
  [`60bfc22`](https://github.com/ardatan/graphql-mesh/commit/60bfc2240108af0a599a66451517a146cace879d)]:
  - @graphql-mesh/utils@0.102.1
  - @graphql-mesh/transport-common@0.7.1
  - @graphql-mesh/runtime@0.103.1
  - @graphql-mesh/types@0.102.1

## 0.8.0

### Patch Changes

- Updated dependencies
  [[`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)]:
  - @graphql-mesh/types@0.102.0
  - @graphql-mesh/runtime@0.103.0
  - @graphql-mesh/utils@0.102.0
  - @graphql-mesh/transport-common@0.7.0

## 0.7.3

### Patch Changes

- [#7524](https://github.com/ardatan/graphql-mesh/pull/7524)
  [`eeab8fe`](https://github.com/ardatan/graphql-mesh/commit/eeab8fe6bd5d930a1faed22f8c78e302876de7af)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`graphql-yoga@^5.7.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.7.0)
    (from `^5.6.0`, in `dependencies`)

## 0.7.2

### Patch Changes

- [#7518](https://github.com/ardatan/graphql-mesh/pull/7518)
  [`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^0.6.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/0.6.1)
    (from `^0.6.0`, in `dependencies`)

## 0.7.1

### Patch Changes

- [#7517](https://github.com/ardatan/graphql-mesh/pull/7517)
  [`e06ac0d`](https://github.com/ardatan/graphql-mesh/commit/e06ac0d721c9af17ea3825b310622aa725dfe807)
  Thanks [@ardatan](https://github.com/ardatan)! - Accept imported modules as transports and find
  subgraph executor

- [#7513](https://github.com/ardatan/graphql-mesh/pull/7513)
  [`09ad884`](https://github.com/ardatan/graphql-mesh/commit/09ad8840fbb38d770157fb435abfcae19d08f095)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Bubble module import errors when module is
  installed

- [#7516](https://github.com/ardatan/graphql-mesh/pull/7516)
  [`67e1062`](https://github.com/ardatan/graphql-mesh/commit/67e10629c70ec553234c1ffc99af4b89ddb31985)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Transport's kind doesn't need to be typed

- Updated dependencies
  [[`67e1062`](https://github.com/ardatan/graphql-mesh/commit/67e10629c70ec553234c1ffc99af4b89ddb31985)]:
  - @graphql-mesh/transport-common@0.6.1

## 0.7.0

### Minor Changes

- [#7501](https://github.com/ardatan/graphql-mesh/pull/7501)
  [`83b8cdc`](https://github.com/ardatan/graphql-mesh/commit/83b8cdc937fcb7e3cc4e2ee7a3ae3c1f12ccaf31)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Polling interval option has been renamed to
  `pollingInterval`

  ### Breaking Changes

  ```diff
  import { UnifiedGraphManager } from '@graphql-mesh/fusion-runtime';

  const mngr = new UnifiedGraphManager({
  - polling: 10_000
  + pollingInterval: 10_000
  });
  ```

### Patch Changes

- [#7497](https://github.com/ardatan/graphql-mesh/pull/7497)
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.5.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.2)
    (from `^10.3.4`, in `dependencies`)

- [#7512](https://github.com/ardatan/graphql-mesh/pull/7512)
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.19)
    (from `^10.0.18`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.2.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.8)
    (from `^2.2.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.5.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.3)
    (from `^10.5.2`, in `dependencies`)
- Updated dependencies
  [[`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)]:
  - @graphql-mesh/cross-helpers@0.4.6
  - @graphql-mesh/runtime@0.102.0
  - @graphql-mesh/transport-common@0.6.0
  - @graphql-mesh/types@0.101.0
  - @graphql-mesh/utils@0.101.0

## 0.6.0

### Minor Changes

- [#7460](https://github.com/ardatan/graphql-mesh/pull/7460)
  [`0c82de5`](https://github.com/ardatan/graphql-mesh/commit/0c82de538b1780d7858e65a8216854550cd7db1b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Control subgraph execution batching in
  UnifiedGraphManager with batch option

### Patch Changes

- [#7477](https://github.com/ardatan/graphql-mesh/pull/7477)
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.18` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.18)
    (from `^10.0.17`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor@^1.3.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.1)
    (from `^1.3.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.3.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.3.4)
    (from `^10.2.3`, in `dependencies`)

- [#7482](https://github.com/ardatan/graphql-mesh/pull/7482)
  [`d5a4cd4`](https://github.com/ardatan/graphql-mesh/commit/d5a4cd4ff93984b62d9670cc286886e62de1bc55)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/federation@^2.2.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.5)
    (from `^2.2.4`, in `dependencies`)

- [#7460](https://github.com/ardatan/graphql-mesh/pull/7460)
  [`0c82de5`](https://github.com/ardatan/graphql-mesh/commit/0c82de538b1780d7858e65a8216854550cd7db1b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Batching subgraph requests independant of the
  JEST environment variable

- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7),
  [`4d1eb28`](https://github.com/ardatan/graphql-mesh/commit/4d1eb285c2b703c5f80473ad0f316004306fac7f),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7)]:
  - @graphql-mesh/cross-helpers@0.4.5
  - @graphql-mesh/runtime@0.101.0
  - @graphql-mesh/transport-common@0.5.0
  - @graphql-mesh/types@0.100.0
  - @graphql-mesh/utils@0.100.0

## 0.5.10

### Patch Changes

- Updated dependencies
  [[`a1bfc49`](https://github.com/ardatan/graphql-mesh/commit/a1bfc492ac3378f22b79a51824407e776b496a84)]:
  - @graphql-mesh/types@0.99.7
  - @graphql-mesh/runtime@0.100.8
  - @graphql-mesh/utils@0.99.7
  - @graphql-mesh/transport-common@0.4.7

## 0.5.9

### Patch Changes

- [#7447](https://github.com/ardatan/graphql-mesh/pull/7447)
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.17)
    (from `^10.0.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.2.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.4)
    (from `^2.2.3`, in `dependencies`)

- [#7447](https://github.com/ardatan/graphql-mesh/pull/7447)
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on schema loading handling

- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/runtime@0.100.7
  - @graphql-mesh/transport-common@0.4.6
  - @graphql-mesh/types@0.99.6
  - @graphql-mesh/utils@0.99.6

## 0.5.8

### Patch Changes

- [#7424](https://github.com/ardatan/graphql-mesh/pull/7424)
  [`7cd4d35`](https://github.com/ardatan/graphql-mesh/commit/7cd4d35100489550cef5815acd424ad85a71ec27)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/federation@^2.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.3)
    (from `^2.2.1`, in `dependencies`)

## 0.5.7

### Patch Changes

- [#7192](https://github.com/ardatan/graphql-mesh/pull/7192)
  [`1905f53`](https://github.com/ardatan/graphql-mesh/commit/1905f53a65e6c73d1d305770dcfc4cba34798a09)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitching-directives@^3.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.1.2)
    (from `^3.0.2`, in `dependencies`)
- Updated dependencies
  [[`f5214eb`](https://github.com/ardatan/graphql-mesh/commit/f5214eb67e6a4fb702695207968d66cef03ca4dd)]:
  - @graphql-mesh/runtime@0.100.6

## 0.5.6

### Patch Changes

- [#7401](https://github.com/ardatan/graphql-mesh/pull/7401)
  [`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/disposablestack@^0.0.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.1)
    (to `dependencies`)
  - Removed dependency
    [`disposablestack@^1.1.6` ↗︎](https://www.npmjs.com/package/disposablestack/v/1.1.6) (from
    `dependencies`)
- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/utils@0.99.5
  - @graphql-mesh/runtime@0.100.5
  - @graphql-mesh/types@0.99.5
  - @graphql-mesh/transport-common@0.4.5

## 0.5.5

### Patch Changes

- [#7343](https://github.com/ardatan/graphql-mesh/pull/7343)
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)
  Thanks [@ardatan](https://github.com/ardatan)! - More verbose debug logs for HTTP fetch calls and
  subgraph requests

- Updated dependencies
  [[`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)]:
  - @graphql-mesh/utils@0.99.4
  - @graphql-mesh/runtime@0.100.4
  - @graphql-mesh/types@0.99.4
  - @graphql-mesh/transport-common@0.4.4

## 0.5.4

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3
  - @graphql-mesh/runtime@0.100.3
  - @graphql-mesh/types@0.99.3
  - @graphql-mesh/transport-common@0.4.3

## 0.5.3

### Patch Changes

- [#7304](https://github.com/ardatan/graphql-mesh/pull/7304)
  [`f47c900`](https://github.com/ardatan/graphql-mesh/commit/f47c900d19e8c634d39e9dd90bfb1acc4f892a1f)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Pass context type from `OnSubgraphExecute`
  to `ExecutionRequest`

## 0.5.2

### Patch Changes

- [#7351](https://github.com/ardatan/graphql-mesh/pull/7351)
  [`9f6624e`](https://github.com/ardatan/graphql-mesh/commit/9f6624e327a555b3de201e67ca9f5dabca44e238)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/federation@^2.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.0)
    (from `^2.1.2`, in `dependencies`)
  - Added dependency
    [`@graphql-mesh/cross-helpers@^0.4.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.4)
    (to `dependencies`)

- [#7352](https://github.com/ardatan/graphql-mesh/pull/7352)
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.16)
    (from `^10.0.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor@^1.3.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.0)
    (from `^1.2.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.1)
    (from `^2.2.0`, in `dependencies`)

- [#7341](https://github.com/ardatan/graphql-mesh/pull/7341)
  [`29dc043`](https://github.com/ardatan/graphql-mesh/commit/29dc043c1fd5d83b3a3f8a1c739957f3d723067a)
  Thanks [@dr3](https://github.com/dr3)! - Fix the bug when field name is renamed together with the
  argument

- [#7294](https://github.com/ardatan/graphql-mesh/pull/7294)
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730)
  Thanks [@ardatan](https://github.com/ardatan)! - Ability to manipulate transport entry through
  `transportEntries`.

  For example, you can add extra headers to a subgraph

  ```ts
  transportEntries: {
    products: {
      // This adds extra headers to the subgraph configuration
      headers: [
        // This forwards `authorization` from the upstream to downstream
        ['authorization', '{context.headers.authorization}'],
        // Or some static value
        ['x-extra', process.env.SOME_THING]
      ]
    }
  }
  ```

- Updated dependencies
  [[`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730)]:
  - @graphql-mesh/runtime@0.100.2
  - @graphql-mesh/transport-common@0.4.2
  - @graphql-mesh/types@0.99.2
  - @graphql-mesh/utils@0.99.2

## 0.5.1

### Patch Changes

- [#7316](https://github.com/ardatan/graphql-mesh/pull/7316)
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.14)
    (from `^10.0.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.1.2)
    (from `^2.1.1`, in `dependencies`)

- [#7253](https://github.com/ardatan/graphql-mesh/pull/7253)
  [`2b8e52f`](https://github.com/ardatan/graphql-mesh/commit/2b8e52fdc40e8a0aa7c48ffb92de1b29b90b3c4e)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the bug; When a non-nullable field is added
  through `additionalTypeDefs` in the compose config, then the gateway fails to resolve it even if a
  resolver defined in `additionalResolvers`;

  ```ts
  export const composeConfig = defineComposeConfig({
    subgraphs: [
      {
        sourceHandler: loadOpenAPISubgraph('Wiki', {
          source: 'https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml',
          endpoint: 'https://wikimedia.org/api/rest_v1'
        })
      }
    ],
    additionalTypeDefs: /* GraphQL */ `
      extend type pageview_project {
        banana: String
        apple: String!
      }
    `
  })

  export const serveConfig = defineServeConfig({
    additionalResolvers: {
      pageview_project: {
        banana() {
          return '🍌'
        },
        apple() {
          return '🍎' // This is ignored
        }
      }
    }
  })
  ```

- [#7266](https://github.com/ardatan/graphql-mesh/pull/7266)
  [`26deb92`](https://github.com/ardatan/graphql-mesh/commit/26deb92dc1d405847289bf28344511f143f94ff4)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix transformations on enum values

- Updated dependencies
  [[`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)]:
  - @graphql-mesh/runtime@0.100.1
  - @graphql-mesh/transport-common@0.4.1
  - @graphql-mesh/types@0.99.1
  - @graphql-mesh/utils@0.99.1

## 0.5.0

### Patch Changes

- [#7215](https://github.com/ardatan/graphql-mesh/pull/7215)
  [`eefbfbe`](https://github.com/ardatan/graphql-mesh/commit/eefbfbe94d72fa6f5cf60a8cf363cae039aece89)
  Thanks [@ardatan](https://github.com/ardatan)! - Cleanup created transport executors per schema
  change Previously they were cleaned up only on server close, which could lead to memory leaks in
  case of schema changes.
- Updated dependencies
  [[`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)]:
  - @graphql-mesh/transport-common@0.4.0
  - @graphql-mesh/utils@0.99.0
  - @graphql-mesh/runtime@0.100.0
  - @graphql-mesh/types@0.99.0

## 0.4.1

### Patch Changes

- [#7183](https://github.com/ardatan/graphql-mesh/pull/7183)
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`graphql-yoga@^5.6.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.6.0)
    (from `^5.3.0`, in `dependencies`)

- [#7185](https://github.com/ardatan/graphql-mesh/pull/7185)
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.12)
    (from `^10.0.11`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor@^1.2.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.2.8)
    (from `^1.2.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.1.1)
    (from `^2.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitch@^9.2.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/9.2.10)
    (from `^9.2.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (from `^10.2.1`, in `dependencies`)
- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)]:
  - @graphql-mesh/runtime@0.99.12
  - @graphql-mesh/transport-common@0.3.1
  - @graphql-mesh/types@0.98.10
  - @graphql-mesh/utils@0.98.10

## 0.4.0

### Patch Changes

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
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)]:
  - @graphql-mesh/utils@0.98.9
  - @graphql-mesh/transport-common@0.3.0
  - @graphql-mesh/runtime@0.99.11
  - @graphql-mesh/types@0.98.9

## 0.3.10

### Patch Changes

- Updated dependencies
  [[`6a99c52`](https://github.com/ardatan/graphql-mesh/commit/6a99c52644a399f9992487faa549907e36c73b9a)]:
  - @graphql-mesh/runtime@0.99.10

## 0.3.9

### Patch Changes

- [#7009](https://github.com/ardatan/graphql-mesh/pull/7009)
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency [`@envelop/core@^5.0.1` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.1)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/executor@^1.2.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.2.6)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/federation@^1.1.36` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/1.1.36)
    (to `dependencies`)

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/federation@^2.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.0.0)
    (to `dependencies`)
  - Added dependency
    [`disposablestack@^1.1.6` ↗︎](https://www.npmjs.com/package/disposablestack/v/1.1.6) (to
    `dependencies`)

- [#7009](https://github.com/ardatan/graphql-mesh/pull/7009)
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0)
  Thanks [@ardatan](https://github.com/ardatan)! - Implement declarative transforms

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `Disposable` pattern for plugins and
  transports

- Updated dependencies
  [[`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`4c75671`](https://github.com/ardatan/graphql-mesh/commit/4c756717247eb0a8f3431e31e6c86fc97297bd32),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/utils@0.98.8
  - @graphql-mesh/types@0.98.8
  - @graphql-mesh/transport-common@0.2.8
  - @graphql-mesh/runtime@0.99.9

## 0.3.8

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.98.7
  - @graphql-mesh/runtime@0.99.8
  - @graphql-mesh/utils@0.98.7
  - @graphql-mesh/transport-common@0.2.7

## 0.3.7

### Patch Changes

- [#7030](https://github.com/ardatan/graphql-mesh/pull/7030)
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.11)
    (from `^10.0.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitch@^9.2.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/9.2.9)
    (from `^9.2.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.1)
    (from `^10.2.0`, in `dependencies`)
- Updated dependencies
  [[`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/runtime@0.99.7
  - @graphql-mesh/transport-common@0.2.6
  - @graphql-mesh/types@0.98.6
  - @graphql-mesh/utils@0.98.6

## 0.3.6

### Patch Changes

- Updated dependencies
  [[`c4d2249`](https://github.com/ardatan/graphql-mesh/commit/c4d22497b4249f9a0969e1d01efbe0721774ce73)]:
  - @graphql-mesh/utils@0.98.5
  - @graphql-mesh/runtime@0.99.6
  - @graphql-mesh/types@0.98.5
  - @graphql-mesh/transport-common@0.2.5

## 0.3.5

### Patch Changes

- [`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)
  Thanks [@ardatan](https://github.com/ardatan)! - Update GraphQL Tools packages

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @graphql-mesh/transport-common@0.2.4
  - @graphql-mesh/runtime@0.99.5
  - @graphql-mesh/types@0.98.4
  - @graphql-mesh/utils@0.98.4

## 0.3.4

### Patch Changes

- Updated dependencies
  [[`d9b5137`](https://github.com/ardatan/graphql-mesh/commit/d9b513704f7083d523f03d1dbb379a5fb27580c4)]:
  - @graphql-mesh/runtime@0.99.4

## 0.3.3

### Patch Changes

- [`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @graphql-mesh/transport-common@0.2.3
  - @graphql-mesh/runtime@0.99.3
  - @graphql-mesh/types@0.98.3
  - @graphql-mesh/utils@0.98.3

## 0.3.2

### Patch Changes

- [`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/transport-common@0.2.2
  - @graphql-mesh/runtime@0.99.2
  - @graphql-mesh/types@0.98.2
  - @graphql-mesh/utils@0.98.2

## 0.3.1

### Patch Changes

- Updated dependencies
  [[`6044b7f`](https://github.com/ardatan/graphql-mesh/commit/6044b7f8bd72ee3d4460d9f09f303ea6fc4e007b)]:
  - @graphql-mesh/types@0.98.1
  - @graphql-mesh/runtime@0.99.1
  - @graphql-mesh/utils@0.98.1
  - @graphql-mesh/transport-common@0.2.1

## 0.3.0

### Patch Changes

- [#6779](https://github.com/ardatan/graphql-mesh/pull/6779)
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.1.3)
    (from `^10.1.0`, in `dependencies`)

- [#6872](https://github.com/ardatan/graphql-mesh/pull/6872)
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/stitch@^9.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/9.2.0)
    (from `^9.2.3`, in `dependencies`)
  - Updated dependency [`graphql-yoga@^5.3.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.3.0)
    (from `^5.1.1`, in `dependencies`)
  - Added dependency
    [`@graphql-mesh/types@^0.97.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.97.5)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/delegate@^10.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.6)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/stitching-directives@^3.0.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.0.2)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/wrap@^10.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/10.0.5)
    (to `dependencies`)
  - Removed dependency
    [`@graphql-mesh/fusion-execution@^0.0.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/fusion-execution/v/0.0.2)
    (from `dependencies`)

- [`7881346`](https://github.com/ardatan/graphql-mesh/commit/78813467cf0e2c988a55cdf1225ff60c4690ede8)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump @graphql-tools/stitch package

- Updated dependencies
  [[`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84),
  [`666b79c`](https://github.com/ardatan/graphql-mesh/commit/666b79c5bd03f86da29b479b5902741b5ad506e8),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)]:
  - @graphql-mesh/runtime@0.99.0
  - @graphql-mesh/transport-common@0.2.0
  - @graphql-mesh/types@0.98.0
  - @graphql-mesh/utils@0.98.0

## 0.2.12

### Patch Changes

- Updated dependencies
  [[`afe0cc5`](https://github.com/ardatan/graphql-mesh/commit/afe0cc5ddfc7a1291dc878c61793b58850ae848b)]:
  - @graphql-mesh/runtime@0.98.8

## 0.2.11

### Patch Changes

- Updated dependencies
  [[`c008dda`](https://github.com/ardatan/graphql-mesh/commit/c008ddae4bd617497a2a9bd70e8c90667c2b1ddc)]:
  - @graphql-mesh/runtime@0.98.7

## 0.2.10

### Patch Changes

- [#6747](https://github.com/ardatan/graphql-mesh/pull/6747)
  [`8924438`](https://github.com/ardatan/graphql-mesh/commit/8924438131a7320ef160573539bddfb024bbe343)
  Thanks [@ardatan](https://github.com/ardatan)! - Readiness and healthcheck endpoints

## 0.2.9

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/runtime@0.98.6
  - @graphql-mesh/utils@0.97.5
  - @graphql-mesh/transport-common@0.1.5

## 0.2.8

### Patch Changes

- [`f293329`](https://github.com/ardatan/graphql-mesh/commit/f2933295532d0760bb731e055dd2bd6e9cb2a63b)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve proxy execution

## 0.2.7

### Patch Changes

- [`1639001`](https://github.com/ardatan/graphql-mesh/commit/16390018bd54946fbfbd2bfb8eb3ba7682966a12)
  Thanks [@ardatan](https://github.com/ardatan)! - Modularization

## 0.2.6

### Patch Changes

- Updated dependencies
  [[`18e0d49`](https://github.com/ardatan/graphql-mesh/commit/18e0d495053f0b67fd1ba488270318e5d11309f8)]:
  - @graphql-mesh/runtime@0.98.5

## 0.2.5

### Patch Changes

- Updated dependencies
  [[`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f)]:
  - @graphql-mesh/utils@0.97.4
  - @graphql-mesh/runtime@0.98.4
  - @graphql-mesh/transport-common@0.1.4

## 0.2.4

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/runtime@0.98.3
  - @graphql-mesh/utils@0.97.3
  - @graphql-mesh/transport-common@0.1.3

## 0.2.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/runtime@0.98.2
  - @graphql-mesh/utils@0.97.2
  - @graphql-mesh/transport-common@0.1.2

## 0.2.2

### Patch Changes

- Updated dependencies
  [[`ccb80d8`](https://github.com/ardatan/graphql-mesh/commit/ccb80d829602662f22eca32d3141d47c6855b8f6)]:
  - @graphql-mesh/fusion-execution@0.0.2

## 0.2.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/runtime@0.98.1
  - @graphql-mesh/utils@0.97.1
  - @graphql-mesh/transport-common@0.1.1

## 0.2.0

### Minor Changes

- [#6605](https://github.com/ardatan/graphql-mesh/pull/6605)
  [`662a36a`](https://github.com/ardatan/graphql-mesh/commit/662a36ac5135cc8153f62ab1c18497032f21cb6f)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Change executionRequest in onSubgraphExecute
  hook and use one transportKind argument instead of spreading it

### Patch Changes

- [#6598](https://github.com/ardatan/graphql-mesh/pull/6598)
  [`35b9cab`](https://github.com/ardatan/graphql-mesh/commit/35b9cab1d6c50fd6165879dc6cc8e5cb03dd2eef)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - onSubgraphExecute hook can return nothing

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a),
  [`70b05a2`](https://github.com/ardatan/graphql-mesh/commit/70b05a20a948b5ebed5306c14710c8839225cdad)]:
  - @graphql-mesh/utils@0.97.0
  - @graphql-mesh/runtime@0.98.0
  - @graphql-mesh/transport-common@0.1.0

## 0.1.1

### Patch Changes

- [#6583](https://github.com/ardatan/graphql-mesh/pull/6583)
  [`b7c3631`](https://github.com/ardatan/graphql-mesh/commit/b7c3631bd58779c1910705fd7f2b39545bc071dd)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.1.0)
    (from `^10.0.8`, in `dependencies`)
- Updated dependencies
  [[`0f274ef`](https://github.com/ardatan/graphql-mesh/commit/0f274ef8177068da65e50e08607998d0ed63e8b9)]:
  - @graphql-mesh/utils@0.96.6
  - @graphql-mesh/runtime@0.97.7
  - @graphql-mesh/transport-common@0.0.3

## 0.1.0

### Minor Changes

- [`7b494d9`](https://github.com/ardatan/graphql-mesh/commit/7b494d981862034f256225e2c9a5c43a403ff79d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Improve typings and other accompanying
  improvements

### Patch Changes

- [#6568](https://github.com/ardatan/graphql-mesh/pull/6568)
  [`44d40ff`](https://github.com/ardatan/graphql-mesh/commit/44d40fff17877a52e63c6f644635ea53eb9deadb)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/runtime@^0.97.6` ↗︎](https://www.npmjs.com/package/@graphql-mesh/runtime/v/0.97.6)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/utils@^0.96.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.96.5)
    (to `dependencies`)

## 0.0.2

### Patch Changes

- [#6551](https://github.com/ardatan/graphql-mesh/pull/6551)
  [`7c18a3f`](https://github.com/ardatan/graphql-mesh/commit/7c18a3f9163f5156758b8cdf0292b28a3bb6046b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - No omnigraph transports and recommend
  graphql-mesh transports

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.0.2

## 0.0.1

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - New Fusion packages

- Updated dependencies
  [[`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)]:
  - @graphql-mesh/fusion-execution@0.0.1
  - @graphql-mesh/transport-common@0.0.1
