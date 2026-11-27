# @graphql-tools/batch-execute

## 11.0.1

### Patch Changes

- [#9868](https://github.com/ardatan/graphql-mesh/pull/9868)
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^13.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/13.2.3)
    (from `^13.2.2`, in `dependencies`)

- [#9860](https://github.com/ardatan/graphql-mesh/pull/9860)
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc)
  Thanks [@ardatan](https://github.com/ardatan)! - Source of these packages moved from
  `graphql-hive/gateway` into this repo. npm names and import paths are unchanged. Hive Gateway will
  consume published versions from Mesh after cutover. Package-level federation benches live under
  `bench/federation`; Gateway e2e memtest/bench CI stays on the Gateway repo and continues to
  measure Gateway impact.

## 11.0.0

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
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Drop Node.js 20 support. The minimum
  supported Node.js version is now 22.15.0.

  Upgrade to Node.js 22.15.0 or later.

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

### Patch Changes

- Updated dependencies
  [[`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)]:
  - @graphql-hive/signal@3.0.0

## 10.3.2

### Patch Changes

- [`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^12.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.1.0)
    (from `^12.0.1`, in `dependencies`)

## 10.3.1

### Patch Changes

- [`9877255`](https://github.com/graphql-hive/gateway/commit/98772559ea8a529b3c6235722ac5cc7b82992c11)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Batch only requests that share the same
  `context` in `createBatchingExecutor`

## 10.3.0

### Minor Changes

- [#2680](https://github.com/graphql-hive/gateway/pull/2680)
  [`680eb53`](https://github.com/graphql-hive/gateway/commit/680eb53b8d9ef9b45503c819780ff1d592773e35)
  Thanks [@ardatan](https://github.com/ardatan)! - # Execution cancellation on batched requests

  When using
  [Batched Execution](https://the-guild.dev/graphql/stitching/handbook/appendices/batching-arrays-and-queries),
  it is now possible to cancel the entire batched request if all individual requests' `AbortSignal`s
  are aborted. This enhancement improves resource management and responsiveness in applications that
  utilize batched GraphQL operations.

  Previously, aborting individual requests did not affect the batched request. With this update, if
  all individual requests signal an abort, the batched request will also be aborted, ensuring that
  unnecessary processing is avoided.

  This feature is implemented using the new utility function `abortSignalAll`, which combines
  multiple `AbortSignal` instances into a single signal. If all of the individual signals are
  aborted, the combined signal will also be aborted, allowing for more efficient cancellation
  handling in batched operations.

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

- [#2680](https://github.com/graphql-hive/gateway/pull/2680)
  [`680eb53`](https://github.com/graphql-hive/gateway/commit/680eb53b8d9ef9b45503c819780ff1d592773e35)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-hive/signal@^2.0.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/signal/v/2.0.0)
    (to `dependencies`)

- [`62175b8`](https://github.com/graphql-hive/gateway/commit/62175b81b04237825372370de04dbdc11c239a01)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Use semver dependencies matched by minor

- Updated dependencies
  [[`680eb53`](https://github.com/graphql-hive/gateway/commit/680eb53b8d9ef9b45503c819780ff1d592773e35)]:
  - @graphql-hive/signal@2.1.0

## 10.2.0

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
    [`@graphql-tools/utils@^12.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.0.1)
    (from `^11.0.0`, in `dependencies`)

## 10.1.0

### Minor Changes

- [#2545](https://github.com/graphql-hive/gateway/pull/2545)
  [`8cbdfd0`](https://github.com/graphql-hive/gateway/commit/8cbdfd01b2682e304eec51f3dd56ce57e4ec76c9)
  Thanks [@omahili](https://github.com/omahili)! - Fixes
  [#1288](https://github.com/graphql-hive/gateway/issues/1288).

  Per the [GraphQL spec](https://spec.graphql.org/October2021/#sec-Handling-Field-Errors) a
  non-nullable field returning null should propagate to the parent, in this case it should propagate
  to data. Batched sub-requests share one merged document so null should propagate to every result
  and not just the one whose fields actually failed.

## 10.0.9

### Patch Changes

- [#2452](https://github.com/graphql-hive/gateway/pull/2452)
  [`4311d79`](https://github.com/graphql-hive/gateway/commit/4311d79d854a589f2f6295629b9ad5b0a5c00f92)
  Thanks [@wijskinner](https://github.com/wijskinner)! - Fix
  `DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise of an Array`
  thrown when a batched subgraph response omits some of the merged sub-requests.

  `splitResult` builds `new Array(numResults)` and only assigns the indices present in the merged
  response's `data`/`errors`. When a subgraph answers only some of the batched operations —
  returning neither a data key nor a path-scoped error for the rest — those slots stay holes. A hole
  at the trailing slot fails DataLoader's `isArrayLike` check (which requires
  `hasOwnProperty(length - 1)`) even though `Array.isArray` is `true`, so the batching executor's
  DataLoader throws. The result is now densified to `numResults`, filling any missing slot with an
  empty `ExecutionResult`.

  This mirrors the sibling fix for `@graphql-tools/batch-delegate` in
  [#2393](https://github.com/graphql-hive/gateway/issues/2393).

## 10.0.8

### Patch Changes

- [#2210](https://github.com/graphql-hive/gateway/pull/2210)
  [`d2bf6af`](https://github.com/graphql-hive/gateway/commit/d2bf6af899b21e5faee5f8436f39e50fd594ab7a)
  Thanks [@ardatan](https://github.com/ardatan)! - Inherit `operationName`, `operationType`,
  `context`, `info`, and `subgraphName` from any available request in the batch. If `operationName`
  is not defined, it will be inherited from the operation itself, if it has a name.

## 10.0.7

### Patch Changes

- [#2076](https://github.com/graphql-hive/gateway/pull/2076)
  [`08c9da2`](https://github.com/graphql-hive/gateway/commit/08c9da28af4587aa823f3b7a10af493fa87dab87)
  Thanks [@ardatan](https://github.com/ardatan)! - Add automatic batching to SDK requester

## 10.0.6

### Patch Changes

- [#2099](https://github.com/graphql-hive/gateway/pull/2099)
  [`dae3fe4`](https://github.com/graphql-hive/gateway/commit/dae3fe4fbb9c78598d1bbf91c2ed07ab1b90f05d)
  Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - Fix missing NPM
  provenance attestation by enabling `npmPublishProvenance` in Yarn configuration

## 10.0.5

### Patch Changes

- [#1842](https://github.com/graphql-hive/gateway/pull/1842)
  [`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^11.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.0.0)
    (from `^10.10.3`, in `dependencies`)

## 10.0.4

### Patch Changes

- [#1691](https://github.com/graphql-hive/gateway/pull/1691)
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.3)
    (from `^10.10.1`, in `dependencies`)

## 10.0.3

### Patch Changes

- [#1608](https://github.com/graphql-hive/gateway/pull/1608)
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.1)
    (from `^10.9.1`, in `dependencies`)

- [#1662](https://github.com/graphql-hive/gateway/pull/1662)
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.1)
    (from `^10.10.0`, in `dependencies`)

## 10.0.2

### Patch Changes

- [#1654](https://github.com/graphql-hive/gateway/pull/1654)
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.0)
    (from `^10.9.1`, in `dependencies`)

## 10.0.1

### Patch Changes

- [#1473](https://github.com/graphql-hive/gateway/pull/1473)
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.2)
    (from `^1.3.0`, in `dependencies`)

## 10.0.0

### Major Changes

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Drop Node 18 support

  Least supported Node version is now v20.

### Patch Changes

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Fixed subgraph name being lost when
  execution requests get batched together.

## 9.0.19

### Patch Changes

- [#1358](https://github.com/graphql-hive/gateway/pull/1358)
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.1)
    (from `^10.9.0`, in `dependencies`)

## 9.0.18

### Patch Changes

- [#1344](https://github.com/graphql-hive/gateway/pull/1344)
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.9.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.0)
    (from `^10.8.1`, in `dependencies`)

## 9.0.17

### Patch Changes

- [#1134](https://github.com/graphql-hive/gateway/pull/1134)
  [`dca6529`](https://github.com/graphql-hive/gateway/commit/dca6529b234f1e178ad87a8992c5a7de12831128)
  Thanks [@ardatan](https://github.com/ardatan)! - Small improvements on usage of promise helpers

## 9.0.16

### Patch Changes

- [#1027](https://github.com/graphql-hive/gateway/pull/1027)
  [`faffc17`](https://github.com/graphql-hive/gateway/commit/faffc17e72f8893e7e717d5a425205a6364e4d44)
  Thanks [@ardatan](https://github.com/ardatan)! - Spread sync errors into an array with the same
  size of the requests to satisfy underlying DataLoader implementation to throw the error correctly

## 9.0.15

### Patch Changes

- [#532](https://github.com/graphql-hive/gateway/pull/532)
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.0)
    (from `^1.2.5`, in `dependencies`)

## 9.0.14

### Patch Changes

- [#862](https://github.com/graphql-hive/gateway/pull/862)
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.2.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.2.5)
    (from `^1.0.0`, in `dependencies`)

## 9.0.13

### Patch Changes

- [#726](https://github.com/graphql-hive/gateway/pull/726)
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/promise-helpers@^1.0.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.0.0)
    (to `dependencies`)

## 9.0.12

### Patch Changes

- [#620](https://github.com/graphql-hive/gateway/pull/620)
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.1)
    (from `^10.7.0`, in `dependencies`)

## 9.0.11

### Patch Changes

- [#373](https://github.com/graphql-hive/gateway/pull/373)
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.7.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.7.0)
    (from `^10.6.2`, in `dependencies`)

## 9.0.10

### Patch Changes

- [#291](https://github.com/graphql-hive/gateway/pull/291)
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`tslib@^2.8.1` ↗︎](https://www.npmjs.com/package/tslib/v/2.8.1) (from
    `^2.4.0`, in `dependencies`)

## 9.0.9

### Patch Changes

- [#268](https://github.com/graphql-hive/gateway/pull/268)
  [`7df2215`](https://github.com/graphql-hive/gateway/commit/7df2215abd309dc1dfd91f4ec91ce975f3982c62)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`dataloader@^2.2.3` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.3)
    (from `^2.2.2`, in `dependencies`)

- [#269](https://github.com/graphql-hive/gateway/pull/269)
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.2)
    (from `^10.6.0`, in `dependencies`)

## 9.0.8

### Patch Changes

- [#243](https://github.com/graphql-hive/gateway/pull/243)
  [`e53d4af`](https://github.com/graphql-hive/gateway/commit/e53d4af783f9d703dea4d5e703be0dddaa337534)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the issue that batched query generation when
  optional variables are not prefixed and sent correctly.

  See the use case below;

  When two batched queries are sent like below;

  ```graphql
  query TestOne($someOptionalVar: String) {
    foo(someOptionalArg: $someOptionalVar) {
      id
      name
    }
  }
  ```

  ```graphql
  query TestTwo($someOptionalVar: String) {
    foo(someOptionalArg: $someOptionalVar) {
      id
      name
    }
  }
  ```

  And then `someOptionalVar` is not prefixed if the value is not sent by the user. The batched
  queries will be sent as below, then it will cause issues.

  ```graphql
  query TestOneTwo($someOptionalVar: String, $someOptionalVar: String) {
    _0_foo: foo(someOptionalArg: $someOptionalVar) {
      id
      name
    }
    _1_foo: foo(someOptionalArg: $someOptionalVar) {
      id
      name
    }
  }
  ```

## 9.0.7

### Patch Changes

- [#164](https://github.com/graphql-hive/gateway/pull/164)
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (from `^10.5.6`, in `dependencies`)

- [#185](https://github.com/graphql-hive/gateway/pull/185)
  [`f0b6921`](https://github.com/graphql-hive/gateway/commit/f0b69219fefc1b24c5511a1c623a5e3bbaf5ca0b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `dependencies`)

- [#188](https://github.com/graphql-hive/gateway/pull/188)
  [`f71366d`](https://github.com/graphql-hive/gateway/commit/f71366d234fe8f30a419814fe1460f1e22663241)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `dependencies`)

## 9.0.5

### Patch Changes

- Updated dependencies
  [[`cf2ce5e`](https://github.com/ardatan/graphql-tools/commit/cf2ce5ed4773087cc324599f2812f4fb91398b21)]:
  - @graphql-tools/utils@10.5.5

## 9.0.4

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.5`, in `dependencies`)

## 9.0.3

### Patch Changes

- [#5906](https://github.com/ardatan/graphql-tools/pull/5906)
  [`f3809d4`](https://github.com/ardatan/graphql-tools/commit/f3809d4defa60678fd013017a60320be7a793870)
  Thanks [@ikenox](https://github.com/ikenox)! - Avoid for.in loop for arrays to avoid unwanted
  property access

## 9.0.2

### Patch Changes

- [#5521](https://github.com/ardatan/graphql-tools/pull/5521)
  [`ee2ef299`](https://github.com/ardatan/graphql-tools/commit/ee2ef2999b3147b16d5dced6e1baaeeeb353cfbd)
  Thanks [@BasKiers](https://github.com/BasKiers)! - GraphQL Errors with prefixed path elements will
  now correctly be split

## 9.0.1

### Patch Changes

- [`a59fb765`](https://github.com/ardatan/graphql-tools/commit/a59fb765a1256b914f1728283d793d61b66bdf89)
  Thanks [@ardatan](https://github.com/ardatan)! - Optimizations to get better performance in query
  planning

- Updated dependencies
  [[`a59fb765`](https://github.com/ardatan/graphql-tools/commit/a59fb765a1256b914f1728283d793d61b66bdf89)]:
  - @graphql-tools/utils@10.0.5

## 9.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/utils@10.0.0

## 8.5.22

### Patch Changes

- [#5220](https://github.com/ardatan/graphql-tools/pull/5220)
  [`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements

## 8.5.21

### Patch Changes

- [`2f342e43`](https://github.com/ardatan/graphql-tools/commit/2f342e430ba0d0097d1d8cb31a6abb97ed46f971)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not use promises if not async

## 8.5.20

### Patch Changes

- [#5202](https://github.com/ardatan/graphql-tools/pull/5202)
  [`05c97eb8`](https://github.com/ardatan/graphql-tools/commit/05c97eb888cd4b1ffbd9adb32722cd5b609292a0)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`dataloader@^2.2.2` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.2)
    (from `2.2.2`, in `dependencies`)
  - Updated dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `1.0.12`, in `dependencies`)

- [#5191](https://github.com/ardatan/graphql-tools/pull/5191)
  [`f24f018a`](https://github.com/ardatan/graphql-tools/commit/f24f018aa94394766f4201b1964d473d08946bd3)
  Thanks [@darren-west](https://github.com/darren-west)! - fix: batched executor returns original
  error when it has no path

## 8.5.19

### Patch Changes

- [`1c95368a`](https://github.com/ardatan/graphql-tools/commit/1c95368aea868be537d956ba5e994cde58dfee41)
  Thanks [@ardatan](https://github.com/ardatan)! - Use ranged versions for dependencies

## 8.5.18

### Patch Changes

- [#5055](https://github.com/ardatan/graphql-tools/pull/5055)
  [`30bd4d0c`](https://github.com/ardatan/graphql-tools/commit/30bd4d0c10f59147faba925dc0941c731b0532a9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dataloader@2.2.2` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.2)
    (from `2.2.1`, in `dependencies`)

## 8.5.17

### Patch Changes

- [#5025](https://github.com/ardatan/graphql-tools/pull/5025)
  [`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dataloader@2.2.1` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.1)
    (from `2.1.0`, in `dependencies`)
- Updated dependencies
  [[`b5c8f640`](https://github.com/ardatan/graphql-tools/commit/b5c8f6407b74466ed0d2989000458cb59239e9af)]:
  - @graphql-tools/utils@9.2.1

## 8.5.16

### Patch Changes

- Updated dependencies
  [[`a94217e9`](https://github.com/ardatan/graphql-tools/commit/a94217e920c5d6237471ab6ad4d96cf230984177),
  [`62d074be`](https://github.com/ardatan/graphql-tools/commit/62d074be48779b1e096e056ca1233822c421dc99)]:
  - @graphql-tools/utils@9.2.0

## 8.5.15

### Patch Changes

- [#4943](https://github.com/ardatan/graphql-tools/pull/4943)
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`value-or-promise@1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `1.0.11`, in `dependencies`)
- Updated dependencies
  [[`e3ec35ed`](https://github.com/ardatan/graphql-tools/commit/e3ec35ed27d4a329739c8da6be06ce74c8f25591)]:
  - @graphql-tools/utils@9.1.4

## 8.5.14

### Patch Changes

- Updated dependencies
  [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3

## 8.5.13

### Patch Changes

- Updated dependencies
  [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b)]:
  - @graphql-tools/utils@9.1.2

## 8.5.12

### Patch Changes

- Updated dependencies
  [[`7411a5e7`](https://github.com/ardatan/graphql-tools/commit/7411a5e71a8138d9ccfe907b1fb01e62fcbb0cdb)]:
  - @graphql-tools/utils@9.1.1

## 8.5.11

### Patch Changes

- Updated dependencies
  [[`c0639dd0`](https://github.com/ardatan/graphql-tools/commit/c0639dd0065db1b5bcedaabf58b11945714bab8d)]:
  - @graphql-tools/utils@9.1.0

## 8.5.10

### Patch Changes

- Updated dependencies
  [[`d83b1960`](https://github.com/ardatan/graphql-tools/commit/d83b19605be71481ccf8effd80d5254423ea811a)]:
  - @graphql-tools/utils@9.0.1

## 8.5.9

### Patch Changes

- Updated dependencies
  [[`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`8f6d3efc`](https://github.com/ardatan/graphql-tools/commit/8f6d3efc92b25236f5a3a761ea7ba2f0a7c7f550),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)]:
  - @graphql-tools/utils@9.0.0

## 8.5.8

### Patch Changes

- Updated dependencies
  [[`f7daf777`](https://github.com/ardatan/graphql-tools/commit/f7daf7777cc214801886e4a45c0389bc5837d175)]:
  - @graphql-tools/utils@8.13.1

## 8.5.7

### Patch Changes

- Updated dependencies
  [[`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f)]:
  - @graphql-tools/utils@8.13.0

## 8.5.6

### Patch Changes

- Updated dependencies
  [[`43c736bd`](https://github.com/ardatan/graphql-tools/commit/43c736bd1865c00898966a7ed14060496c9e6a0c)]:
  - @graphql-tools/utils@8.12.0

## 8.5.5

### Patch Changes

- Updated dependencies
  [[`71cb4fae`](https://github.com/ardatan/graphql-tools/commit/71cb4faeb0833a228520a7bc2beed8ac7274443f),
  [`403ed450`](https://github.com/ardatan/graphql-tools/commit/403ed4507eff7cd509f410f7542a702da72e1a9a)]:
  - @graphql-tools/utils@8.11.0

## 8.5.4

### Patch Changes

- Updated dependencies
  [[`4fe3d9c0`](https://github.com/ardatan/graphql-tools/commit/4fe3d9c037e9c138bd8a9b04b3977d74eba32c97)]:
  - @graphql-tools/utils@8.10.1

## 8.5.3

### Patch Changes

- Updated dependencies
  [[`2609d71f`](https://github.com/ardatan/graphql-tools/commit/2609d71f7c3a0ef2b381c51d9ce60b0de49f9b27)]:
  - @graphql-tools/utils@8.10.0

## 8.5.2

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624)
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with
  `moduleResolution` `node16` or `nodenext`

- Updated dependencies
  [[`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)]:
  - @graphql-tools/utils@8.9.1

## 8.5.1

### Patch Changes

- Updated dependencies [2a3b45e3]
  - @graphql-tools/utils@8.9.0

## 8.5.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [a0abbbcd]
- Updated dependencies [d76a299c]
  - @graphql-tools/utils@8.8.0

## 8.4.11

### Patch Changes

- Updated dependencies [4914970b]
  - @graphql-tools/utils@8.7.0

## 8.4.10

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/utils@8.6.13

## 8.4.9

### Patch Changes

- Updated dependencies [da7ad43b]
  - @graphql-tools/utils@8.6.12

## 8.4.8

### Patch Changes

- Updated dependencies [c0762ee3]
  - @graphql-tools/utils@8.6.11

## 8.4.7

### Patch Changes

- Updated dependencies [0fc510cb]
  - @graphql-tools/utils@8.6.10

## 8.4.6

### Patch Changes

- Updated dependencies [31a33e2b]
  - @graphql-tools/utils@8.6.9

## 8.4.5

### Patch Changes

- Updated dependencies [cb238877]
  - @graphql-tools/utils@8.6.8

## 8.4.4

### Patch Changes

- Updated dependencies [0bbb1769]
  - @graphql-tools/utils@8.6.7

## 8.4.3

### Patch Changes

- fe9402af: Bump data-loader and cross-undici-fetch

## 8.4.2

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6

## 8.4.1

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5

## 8.4.0

### Minor Changes

- c40e801f: feat: forward gateway operation's name to subschema executors

### Patch Changes

- Updated dependencies [d36d530b]
  - @graphql-tools/utils@8.6.4

## 8.3.3

### Patch Changes

- 0c0c6857: fix - align versions

## 8.3.2

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/utils@8.6.2

## 8.3.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/utils@8.5.1

## 8.3.0

### Minor Changes

- ad04dc79: enhance: make operationType optional

### Patch Changes

- Updated dependencies [ad04dc79]
  - @graphql-tools/utils@8.5.0

## 8.2.0

### Minor Changes

- 149afddb: fix: getting ready for GraphQL v16

### Patch Changes

- Updated dependencies [149afddb]
  - @graphql-tools/utils@8.4.0

## 8.1.1

### Patch Changes

- 014937db: batch-execute enhancements:
  - fixes bugs with batched fragment definitions
  - unpathed errors are now returned for all batch results
  - the "graphqlTools" prefix is simplified down to just "\_"
  - new tests and documentation
- Updated dependencies [014937db]
  - @graphql-tools/utils@8.2.4

## 8.1.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support
- c5b0719c: enhance(utils): move memoize functions to utils

### Patch Changes

- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
  - @graphql-tools/utils@8.2.0

## 8.0.5

### Patch Changes

- 631b11bd: refactor(delegationPlanner): introduce static version of our piecemeal planner

  ...which, although undocumented, can be accessed within the StitchingInfo object saved in a
  stitched schema's extensions.

  Also improves memoization technique slightly across the board.

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions

## 8.0.4

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1

## 8.0.3

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0

## 8.0.2

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2

## 8.0.1

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1

## 8.0.0

### Major Changes

- dae6dc7b: refactor: ExecutionParams type replaced by Request type

  rootValue property is now a part of the Request type.

  When delegating with delegateToSchema, rootValue can be set multiple ways:
  - when using a custom executor, the custom executor can utilize a rootValue in whichever custom
    way it specifies.
  - when using the default executor (execute/subscribe from graphql-js): -- rootValue can be passed
    to delegateToSchema via a named option -- rootValue can be included within a subschemaConfig --
    otherwise, rootValue is inferred from the originating schema

  When using wrapSchema/stitchSchemas, a subschemaConfig can specify the createProxyingResolver
  function which can pass whatever rootValue it wants to delegateToSchema as above.

- c42e811d: BREAKING CHANGES;
  - Rename `Request` to `ExecutionRequest`
  - Add required `operationType: OperationTypeNode` field in `ExecutionRequest`
  - Add `context` in `createRequest` and `createRequestInfo` instead of `delegateToSchema`

  > It doesn't rely on info.operation.operationType to allow the user to call an operation from
  > different root type. And it doesn't call getOperationAST again and again to get operation type
  > from the document/operation because we have it in Request and ExecutionParams
  > https://github.com/ardatan/graphql-tools/pull/3166/files#diff-d4824895ea613dcc1f710c3ac82e952fe0ca12391b671f70d9f2d90d5656fdceR38

  Improvements;
  - Memoize `defaultExecutor` for a single `GraphQLSchema` so allow `getBatchingExecutor` to memoize
    `batchingExecutor` correctly.
  - And there is no different `defaultExecutor` is created for `subscription` and other operation
    types. Only one executor is used.

  > Batch executor is memoized by `executor` reference but `createDefaultExecutor` didn't memoize
  > the default executor so this memoization wasn't working correctly on `batch-execute` side.
  > https://github.com/ardatan/graphql-tools/blob/remove-info-executor/packages/batch-execute/src/getBatchingExecutor.ts#L9

- c0ca3190: BREAKING CHANGE
  - Remove Subscriber and use only Executor
  - - Now `Executor` can receive `AsyncIterable` and subscriptions will also be handled by
      `Executor`. This is a future-proof change for defer, stream and live queries

### Patch Changes

- Updated dependencies [af9a78de]
- Updated dependencies [9c26b847]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [dae6dc7b]
- Updated dependencies [6877b913]
- Updated dependencies [c42e811d]
- Updated dependencies [7d3e3006]
- Updated dependencies [8c8d4fc0]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [74581cf3]
- Updated dependencies [c0ca3190]
- Updated dependencies [982c8f53]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
  - @graphql-tools/utils@8.0.0

## 7.1.2

### Patch Changes

- 22a9f3da: fix(deps): follow package conventions on when to pin

## 7.1.1

### Patch Changes

- 61da3e82: use value-or-promise to streamline working with sync values or async promises

## 7.1.0

### Minor Changes

- 58fd4b28: feat(types): add TContext to stitchSchemas and executor

### Patch Changes

- Updated dependencies [58fd4b28]
- Updated dependencies [43da6b59]
  - @graphql-tools/utils@7.7.0

## 7.0.0

### Major Changes

- be1a1575: ## Breaking Changes:

  #### Schema Generation and Decoration API (`@graphql-tools/schema`)
  - Resolver validation options should now be set to `error`, `warn` or `ignore` rather than `true`
    or `false`. In previous versions, some of the validators caused errors to be thrown, while some
    issued warnings. This changes brings consistency to validator behavior.

  - The `allowResolversNotInSchema` has been renamed to `requireResolversToMatchSchema`, to
    harmonize the naming convention of all the validators. The default setting of
    `requireResolversToMatchSchema` is `error`, matching the previous behavior.

  #### Schema Delegation (`delegateToSchema` & `@graphql-tools/delegate`)
  - The `delegateToSchema` return value has matured and been formalized as an `ExternalObject`, in
    which all errors are integrated into the GraphQL response, preserving their initial path. Those
    advanced users accessing the result directly will note the change in error handling. This also
    allows for the deprecation of unnecessary helper functions including `slicedError`, `getErrors`,
    `getErrorsByPathSegment` functions. Only external errors with missing or invalid paths must
    still be preserved by annotating the remote object with special properties. The new
    `getUnpathedErrors` function is therefore necessary for retrieving only these errors. Note also
    the new `annotateExternalObject` and `mergeExternalObjects` functions, as well as the renaming
    of `handleResult` to `resolveExternalValue`.

  - Transform types and the `applySchemaTransforms` are now relocated to the `delegate` package;
    `applyRequestTransforms`/`applyResultTransforms` functions have been deprecated, however, as
    this functionality has been replaced since v6 by the `Transformer` abstraction.

  - The `transformRequest`/`transformResult` methods are now provided additional `delegationContext`
    and `transformationContext` arguments -- these were introduced in v6, but previously optional.

  - The `transformSchema` method may wish to create additional delegating resolvers and so it is now
    provided the `subschemaConfig` and final (non-executable) `transformedSchema` parameters. As in
    v6, the `transformSchema` is kicked off once to produce the non-executable version, and then, if
    a wrapping schema is being generated, proxying resolvers are created with access to the
    (non-executable) initial result. In v7, the individual `transformSchema` methods also get access
    to the result of the first run, if necessary, they can create additional wrapping schema
    proxying resolvers.

  - `applySchemaTransforms` parameters have been updated to match and support the `transformSchema`
    parameters above.

  #### Remote Schemas & Wrapping (`wrapSchema`, `makeRemoteExecutableSchema`, and `@graphql-tools/wrap`)
  - `wrapSchema` and `generateProxyingResolvers` now only take a single options argument with named
    properties of type `SubschemaConfig`. The previously possible shorthand version with first
    argument consisting of a `GraphQLSchema` and second argument representing the transforms should
    be reworked as a `SubschemaConfig` object.

  - Similarly, the `ICreateProxyingResolverOptions` interface that provides the options for the
    `createProxyingResolver` property of `SubschemaConfig` options has been adjusted. The `schema`
    property previously could be set to a `GraphQLSchema` or a `SubschemaConfig` object. This
    property has been removed in favor of a `subschemaConfig` property that will always be a
    `SubschemaConfig` object. The `transforms` property has been removed; transforms should be
    included within the `SubschemaConfig` object.`

  - The format of the wrapping schema has solidified. All non-root fields are expected to use
    identical resolvers, either `defaultMergedResolver` or a custom equivalent, with root fields
    doing the hard work of proxying. Support for custom merged resolvers throught
    `createMergedResolver` has been deprecated, as custom merging resolvers conflicts when using
    stitching's type merging, where resolvers are expected to be identical across subschemas.

  - The `WrapFields` transform's `wrappingResolver` option has been removed, as this complicates
    multiple wrapping layers, as well as planned functionality to wrap subscription root fields in
    potentially multiple layers, as the wrapping resolvers may be different in different layers.
    Modifying resolvers can still be performed by use of an additional transform such as
    `TransformRootFields` or `TransformObjectFields`.

  - The `ExtendSchema` transform has been removed, as it is conceptually simpler just to use
    `stitchSchemas` with one subschema.

  - The `ReplaceFieldsWithFragment`, `AddFragmentsByField`, `AddSelectionSetsByField`, and
    `AddMergedTypeSelectionSets` transforms has been removed, as they are superseded by the
    `AddSelectionSets` and `VisitSelectionSets` transforms. The `AddSelectionSets` purposely takes
    parsed SDL rather than strings, to nudge end users to parse these strings at build time (when
    possible), rather than at runtime. Parsing of selection set strings can be performed using the
    `parseSelectionSet` function from `@graphql-tools/utils`.

  #### Schema Stitching (`stitchSchemas` & `@graphql-tools/stitch`)
  - `stitchSchemas`'s `mergeTypes` option is now true by default! This causes the `onTypeConflict`
    option to be ignored by default. To use `onTypeConflict` to select a specific type instead of
    simply merging, simply set `mergeTypes` to false.

  - `schemas` argument has been deprecated, use `subschemas`, `typeDefs`, or `types`, depending on
    what you are stitching.

  - When using batch delegation in type merging, the `argsFromKeys` function is now set only via the
    `argsFromKeys` property. Previously, if `argsFromKeys` was absent, it could be read from `args`.

  - Support for fragment hints has been removed in favor of selection set hints.

  - `stitchSchemas` now processes all `GraphQLSchema` and `SubschemaConfig` subschema input into new
    `Subschema` objects, handling schema config directives such aso`@computed` as well as generating
    the final transformed schema, stored as the `transformedSchema` property, if transforms are
    used. Signatures of the `onTypeConflict`, `fieldConfigMerger`, and `inputFieldConfigMerger` have
    been updated to include metadata related to the original and transformed subschemas. Note the
    property name change for `onTypeConflict` from `schema` to `subschema`.

  #### Mocking (`addMocksToSchema` and `@graphql-tools/mock`)
  - Mocks returning objects with fields set as functions are now operating according to upstream
    graphql-js convention, i.e. these functions take three arguments, `args`, `context`, and `info`
    with `parent` available as `this` rather than as the first argument.

  #### Other Utilities (`@graphql-tools/utils`)
  - `filterSchema`'s `fieldFilter` will now filter _all_ fields across Object, Interface, and Input
    types. For the previous Object-only behavior, switch to the `objectFieldFilter` option.
  - Unused `fieldNodes` utility functions have been removed.
  - Unused `typeContainsSelectionSet` function has been removed, and `typesContainSelectionSet` has
    been moved to the `stitch` package.
  - Unnecessary `Operation` type has been removed in favor of `OperationTypeNode` from upstream
    graphql-js.
  - As above, `applySchemaTransforms`/`applyRequestTransforms`/`applyResultTransforms` have been
    removed from the `utils` package, as they are implemented elsewhere or no longer necessary.

  ## Related Issues
  - proxy all the errors: #1047, #1641
  - better error handling for merges #2016, #2062
  - fix typings #1614
  - disable implicit schema pruning #1817
  - mocks not working for functions #1807

### Patch Changes

- Updated dependencies [be1a1575]
  - @graphql-tools/utils@7.0.0
