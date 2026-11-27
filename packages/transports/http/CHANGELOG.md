# @graphql-mesh/transport-http

## 3.0.0

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

- Updated dependencies
  [[`06a77f4`](https://github.com/ardatan/graphql-mesh/commit/06a77f419a2574fa77b63b7ac84c3b446344d332),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`080bc57`](https://github.com/ardatan/graphql-mesh/commit/080bc575d7f964fb219a797f903e77783f90966d),
  [`a0fdd49`](https://github.com/ardatan/graphql-mesh/commit/a0fdd497a2e5af00f395a5a999bfab31aec12e6d),
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
  [`4be0ced`](https://github.com/ardatan/graphql-mesh/commit/4be0cedc3d15c6cdd8db91334f9edfee2c99783e),
  [`61da679`](https://github.com/ardatan/graphql-mesh/commit/61da679fc946374cbb6e18c9de1f4b158df9cc88),
  [`f9b41bc`](https://github.com/ardatan/graphql-mesh/commit/f9b41bc23325f130e39244b1748ba4e7eecd2b4f),
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
  - @graphql-mesh/string-interpolation@0.6.0
  - @graphql-mesh/transport-common@3.0.0
  - @graphql-mesh/types@1.0.0
  - @graphql-mesh/utils@1.0.0
  - @graphql-tools/executor-http@4.0.1

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

### Patch Changes

- Updated dependencies
  [[`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)]:
  - @graphql-tools/executor-http@4.0.0
  - @graphql-mesh/transport-common@2.0.0

## 1.2.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@1.1.3

## 1.2.6

### Patch Changes

- Updated dependencies
  [[`3e0a896`](https://github.com/graphql-hive/gateway/commit/3e0a896cf110d8a6290e20b10b6865813301f5ca)]:
  - @graphql-tools/executor-http@3.6.2

## 1.2.5

### Patch Changes

- [`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^12.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.1.0)
    (from `^12.0.1`, in `dependencies`)

- Updated dependencies
  [[`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)]:
  - @graphql-tools/executor-http@3.6.1
  - @graphql-mesh/transport-common@1.1.2

## 1.2.4

### Patch Changes

- [#2717](https://github.com/graphql-hive/gateway/pull/2717)
  [`cc5870d`](https://github.com/graphql-hive/gateway/commit/cc5870de856effe1e277b79ee2cd87bd046179a2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Add `deduplicateInflightRequestsPerContext`
  option to the HTTP executor

  When `true` (default), inflight requests are deduplicated only within the same `context` object.
  When `false`, identical requests are deduplicated across different contexts within the same
  executor.

  Hive Gateway's HTTP transport sets it to `false` so that identical subgraph requests coming from
  different clients are deduplicated.

- Updated dependencies
  [[`cc5870d`](https://github.com/graphql-hive/gateway/commit/cc5870de856effe1e277b79ee2cd87bd046179a2)]:
  - @graphql-tools/executor-http@3.6.0

## 1.2.3

### Patch Changes

- Updated dependencies
  [[`4a2d3b6`](https://github.com/graphql-hive/gateway/commit/4a2d3b6a4e34cbe984ce7e36fd3306d907fb29d1)]:
  - @graphql-tools/executor-http@3.5.1

## 1.2.2

### Patch Changes

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

- Updated dependencies
  [[`befdb8e`](https://github.com/graphql-hive/gateway/commit/befdb8e3e352650c9f6c4e5fbeadfcf3615ee6ae)]:
  - @graphql-tools/executor-http@3.5.0
  - @graphql-mesh/transport-common@1.1.1

## 1.2.1

### Patch Changes

- Updated dependencies
  [[`47fe3d6`](https://github.com/graphql-hive/gateway/commit/47fe3d6846f3c6227985168cac6bb2d5f1db91cc)]:
  - @graphql-tools/executor-http@3.4.1

## 1.2.0

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

- Updated dependencies
  [[`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830)]:
  - @graphql-mesh/transport-common@1.1.0
  - @graphql-tools/executor-http@3.4.0

## 1.1.5

### Patch Changes

- [#2549](https://github.com/graphql-hive/gateway/pull/2549)
  [`091fcd2`](https://github.com/graphql-hive/gateway/commit/091fcd282af0842d24cdb994c8e0a0d635e8c1e2)
  Thanks [@dotansimha](https://github.com/dotansimha)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/cross-helpers@^0.4.16` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.16)
    (from `^0.4.13`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/string-interpolation@^0.5.18` ↗︎](https://www.npmjs.com/package/@graphql-mesh/string-interpolation/v/0.5.18)
    (from `^0.5.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.107.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.107.1)
    (from `^0.105.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.107.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.107.1)
    (from `^0.104.38`, in `dependencies`)

- Updated dependencies
  [[`091fcd2`](https://github.com/graphql-hive/gateway/commit/091fcd282af0842d24cdb994c8e0a0d635e8c1e2)]:
  - @graphql-mesh/transport-common@1.0.21

## 1.1.4

### Patch Changes

- [#2328](https://github.com/graphql-hive/gateway/pull/2328)
  [`530eca8`](https://github.com/graphql-hive/gateway/commit/530eca85a7745d53145ced209b6b2ce4b3798e1c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@^0.105.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.105.0)
    (from `^0.104.27`, in `dependencies`)

- Updated dependencies
  [[`530eca8`](https://github.com/graphql-hive/gateway/commit/530eca85a7745d53145ced209b6b2ce4b3798e1c)]:
  - @graphql-mesh/transport-common@1.0.20

## 1.1.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@1.0.19

## 1.1.2

### Patch Changes

- [#2473](https://github.com/graphql-hive/gateway/pull/2473)
  [`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/utils@^0.104.38` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.38)
    (from `^0.104.36`, in `dependencies`)

- Updated dependencies []:
  - @graphql-mesh/transport-common@1.0.18

## 1.1.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@1.0.17

## 1.1.0

### Minor Changes

- [#2334](https://github.com/graphql-hive/gateway/pull/2334)
  [`0f8706c`](https://github.com/graphql-hive/gateway/commit/0f8706c54556669148de1bf74725cc8c896e5ced)
  Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - Add
  `useGETForHashedQueries` support for downstream APQ requests so hash-only query probes can use GET
  while full-query fallbacks continue to use POST.

  Add the `useContentTypeForGETRequests` opt-in for GET requests that need
  `content-type: application/json` compatibility.

### Patch Changes

- Updated dependencies
  [[`0f8706c`](https://github.com/graphql-hive/gateway/commit/0f8706c54556669148de1bf74725cc8c896e5ced)]:
  - @graphql-tools/executor-http@3.3.0

## 1.0.25

### Patch Changes

- [#2285](https://github.com/graphql-hive/gateway/pull/2285)
  [`e5bf019`](https://github.com/graphql-hive/gateway/commit/e5bf01939712eae423f94642469cebb0b69ac4eb)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/utils@^0.104.36` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.36)
    (from `^0.104.35`, in `dependencies`)

## 1.0.24

### Patch Changes

- [#2249](https://github.com/graphql-hive/gateway/pull/2249)
  [`6ac955d`](https://github.com/graphql-hive/gateway/commit/6ac955d2910fba67f5177681262dcd9b7ef3f079)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/cross-helpers@^0.4.13` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.13)
    (from `^0.4.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/string-interpolation@^0.5.16` ↗︎](https://www.npmjs.com/package/@graphql-mesh/string-interpolation/v/0.5.16)
    (from `^0.5.15`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.104.27` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.27)
    (from `^0.104.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.35` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.35)
    (from `^0.104.16`, in `dependencies`)

- Updated dependencies
  [[`6ac955d`](https://github.com/graphql-hive/gateway/commit/6ac955d2910fba67f5177681262dcd9b7ef3f079)]:
  - @graphql-mesh/transport-common@1.0.16

## 1.0.23

### Patch Changes

- Updated dependencies
  [[`786e06f`](https://github.com/graphql-hive/gateway/commit/786e06f4e3d74c76a7274bbbc69100a7d30549e6)]:
  - @graphql-tools/executor-http@3.2.1

## 1.0.22

### Patch Changes

- Updated dependencies
  [[`59ef8f7`](https://github.com/graphql-hive/gateway/commit/59ef8f733d4fced3416bc95d323f00fb46e69b95)]:
  - @graphql-tools/executor-http@3.2.0

## 1.0.21

### Patch Changes

- Updated dependencies
  [[`f9d2f0e`](https://github.com/graphql-hive/gateway/commit/f9d2f0ea9e7f172b8270c17961a98bc52a7ba49d)]:
  - @graphql-tools/executor-http@3.1.4

## 1.0.20

### Patch Changes

- Updated dependencies
  [[`323626f`](https://github.com/graphql-hive/gateway/commit/323626ff877f50e509e45cc56ce82602d5118a1d)]:
  - @graphql-tools/executor-http@3.1.3

## 1.0.19

### Patch Changes

- Updated dependencies
  [[`f85a9fe`](https://github.com/graphql-hive/gateway/commit/f85a9fe11dc88a7fa8397c5372ef24f9e91b638e)]:
  - @graphql-tools/executor-http@3.1.2

## 1.0.18

### Patch Changes

- [#2148](https://github.com/graphql-hive/gateway/pull/2148)
  [`ed7abb9`](https://github.com/graphql-hive/gateway/commit/ed7abb9b6471d27591460749c5f5bac3d41d37ce)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/string-interpolation@^0.5.15` ↗︎](https://www.npmjs.com/package/@graphql-mesh/string-interpolation/v/0.5.15)
    (from `^0.5.13`, in `dependencies`)

## 1.0.17

### Patch Changes

- [#2141](https://github.com/graphql-hive/gateway/pull/2141)
  [`f35b57a`](https://github.com/graphql-hive/gateway/commit/f35b57ab3d03053ed52d5d57f86e42f54d8ff613)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/string-interpolation@^0.5.13` ↗︎](https://www.npmjs.com/package/@graphql-mesh/string-interpolation/v/0.5.13)
    (from `^0.5.9`, in `dependencies`)

## 1.0.16

### Patch Changes

- Updated dependencies
  [[`dae3fe4`](https://github.com/graphql-hive/gateway/commit/dae3fe4fbb9c78598d1bbf91c2ed07ab1b90f05d)]:
  - @graphql-tools/executor-http@3.1.1

## 1.0.15

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@1.0.15

## 1.0.14

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@1.0.14

## 1.0.13

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
  [`9f29d58`](https://github.com/graphql-hive/gateway/commit/9f29d587946383482ad55924fe49b9e7804f48a3)]:
  - @graphql-mesh/transport-common@1.0.13
  - @graphql-tools/executor-http@3.1.0

## 1.0.12

### Patch Changes

- [#1691](https://github.com/graphql-hive/gateway/pull/1691)
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.3)
    (from `^10.10.1`, in `dependencies`)

- Updated dependencies
  [[`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`478d7e2`](https://github.com/graphql-hive/gateway/commit/478d7e25ef47fb8fb6183010a8bb61ac31688c55),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`2993f24`](https://github.com/graphql-hive/gateway/commit/2993f24f8e46853c0d2667c0cd2bf96190f3a2b2)]:
  - @graphql-mesh/transport-common@1.0.12
  - @graphql-tools/executor-http@3.0.7

## 1.0.11

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

## 1.0.10

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
    [`@graphql-tools/utils@^10.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.1)
    (from `^10.9.1`, in `dependencies`)
  - Removed dependency [`graphql@^16.9.0` ↗︎](https://www.npmjs.com/package/graphql/v/16.9.0) (from
    `dependencies`)

- [#1659](https://github.com/graphql-hive/gateway/pull/1659)
  [`810e12b`](https://github.com/graphql-hive/gateway/commit/810e12bd5d24f90ade73f3b257a16277d2731355)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Removed dependency [`graphql@^16.9.0` ↗︎](https://www.npmjs.com/package/graphql/v/16.9.0) (from
    `dependencies`)

- [#1662](https://github.com/graphql-hive/gateway/pull/1662)
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.1)
    (from `^10.10.0`, in `dependencies`)

- [#1669](https://github.com/graphql-hive/gateway/pull/1669)
  [`1bfac64`](https://github.com/graphql-hive/gateway/commit/1bfac649f00f1b5ac830813030cec64522fea29f)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@^0.104.15` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.15)
    (from `^0.104.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.15` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.15)
    (from `^0.104.14`, in `dependencies`)

- Updated dependencies
  [[`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a),
  [`1bfac64`](https://github.com/graphql-hive/gateway/commit/1bfac649f00f1b5ac830813030cec64522fea29f),
  [`3f6b99d`](https://github.com/graphql-hive/gateway/commit/3f6b99d152cbcc17d4ec3c97bc48dae452982151),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`c754a96`](https://github.com/graphql-hive/gateway/commit/c754a96d49ea69f54f57a8f1b01baf9d2fb947b6)]:
  - @graphql-mesh/transport-common@1.0.10
  - @graphql-tools/executor-http@3.0.6

## 1.0.9

### Patch Changes

- [#1654](https://github.com/graphql-hive/gateway/pull/1654)
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.0)
    (from `^10.9.1`, in `dependencies`)

- Updated dependencies
  [[`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851)]:
  - @graphql-mesh/transport-common@1.0.9
  - @graphql-tools/executor-http@3.0.5

## 1.0.8

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
  [[`aa1cb63`](https://github.com/graphql-hive/gateway/commit/aa1cb635583e41ed0f8ebe7ae4897feedec50a71)]:
  - @graphql-mesh/transport-common@1.0.8

## 1.0.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@1.0.7

## 1.0.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@1.0.6

## 1.0.5

### Patch Changes

- Updated dependencies
  [[`0a349fb`](https://github.com/graphql-hive/gateway/commit/0a349fbfd52eaf8a2b21c9669871c916d41b840f)]:
  - @graphql-tools/executor-http@3.0.4
  - @graphql-mesh/transport-common@1.0.5

## 1.0.4

### Patch Changes

- [#1524](https://github.com/graphql-hive/gateway/pull/1524)
  [`d7b48a7`](https://github.com/graphql-hive/gateway/commit/d7b48a778344145478f0d3e1e1e188124181f0f2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/string-interpolation@^0.5.9` ↗︎](https://www.npmjs.com/package/@graphql-mesh/string-interpolation/v/0.5.9)
    (from `^0.5.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.104.13` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.13)
    (from `^0.104.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.13` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.13)
    (from `^0.104.12`, in `dependencies`)

- Updated dependencies
  [[`d7b48a7`](https://github.com/graphql-hive/gateway/commit/d7b48a778344145478f0d3e1e1e188124181f0f2)]:
  - @graphql-mesh/transport-common@1.0.4
  - @graphql-tools/executor-http@3.0.3

## 1.0.3

### Patch Changes

- [#1473](https://github.com/graphql-hive/gateway/pull/1473)
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.2)
    (from `^1.3.0`, in `dependencies`)

- Updated dependencies
  [[`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14),
  [`fe99f74`](https://github.com/graphql-hive/gateway/commit/fe99f74dd11fdf2928ca7080d4d2e5dfd1e2f18e)]:
  - @graphql-tools/executor-http@3.0.2
  - @graphql-mesh/transport-common@1.0.3

## 1.0.2

### Patch Changes

- [#1450](https://github.com/graphql-hive/gateway/pull/1450)
  [`ab05e3f`](https://github.com/graphql-hive/gateway/commit/ab05e3f899b017067e0eb42301516d4fdf3b816d)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@^0.104.11` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.11)
    (from `^0.104.8`, in `dependencies`)

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
  [[`ab05e3f`](https://github.com/graphql-hive/gateway/commit/ab05e3f899b017067e0eb42301516d4fdf3b816d),
  [`b0e5568`](https://github.com/graphql-hive/gateway/commit/b0e55688d4fc22d0bfbf664de52e78e9642d7014),
  [`b6f985b`](https://github.com/graphql-hive/gateway/commit/b6f985b0456ba7556cc299368892ffc5f7d4817e)]:
  - @graphql-mesh/transport-common@1.0.2
  - @graphql-tools/executor-http@3.0.1

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

### Patch Changes

- Updated dependencies
  [[`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)]:
  - @graphql-mesh/transport-common@1.0.0
  - @graphql-tools/executor-http@3.0.0

## 0.7.3

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
  - @graphql-tools/executor-http@2.1.2

## 0.7.2

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

- [#1385](https://github.com/graphql-hive/gateway/pull/1385)
  [`34294ea`](https://github.com/graphql-hive/gateway/commit/34294eaa26d82da0ac7018da081b2dca46bd90f4)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Fix an infinite loop when providing
  options for subscriptions transport of subgraphs using HTTP transport for both queries/mutations
  and subscrpitions.

- Updated dependencies
  [[`a832e7b`](https://github.com/graphql-hive/gateway/commit/a832e7bf9a8f92c48fb9df8ca1bff5a008dcf420)]:
  - @graphql-mesh/transport-common@0.7.38

## 0.7.1

### Patch Changes

- [#1358](https://github.com/graphql-hive/gateway/pull/1358)
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.1)
    (from `^10.9.0`, in `dependencies`)

- Updated dependencies
  [[`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1),
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)]:
  - @graphql-mesh/transport-common@0.7.37
  - @graphql-tools/executor-http@2.1.1

## 0.7.0

### Minor Changes

- [#1017](https://github.com/graphql-hive/gateway/pull/1017)
  [`b59a266`](https://github.com/graphql-hive/gateway/commit/b59a26628c368272b50380bab57553070e2edf6e)
  Thanks [@ardatan](https://github.com/ardatan)! - Support dynamic values in transport location.
  Syntax like `{env.SOME_ENDPOINT}` will interpolated and dynamically filled.

### Patch Changes

- [#1344](https://github.com/graphql-hive/gateway/pull/1344)
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.9.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.0)
    (from `^10.8.1`, in `dependencies`)

- Updated dependencies
  [[`6215001`](https://github.com/graphql-hive/gateway/commit/6215001b1d650ad865331661532bcc4f7bad6b40),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`7287ffa`](https://github.com/graphql-hive/gateway/commit/7287ffa2ac0f08801c3058e96a7c4eba7102c1d0),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`b59a266`](https://github.com/graphql-hive/gateway/commit/b59a26628c368272b50380bab57553070e2edf6e)]:
  - @graphql-mesh/transport-common@0.7.36
  - @graphql-tools/executor-http@2.1.0

## 0.6.43

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
  [[`3d24beb`](https://github.com/graphql-hive/gateway/commit/3d24beb7b15fd8109f86bbb3dfd514f6b8202741),
  [`ed323fa`](https://github.com/graphql-hive/gateway/commit/ed323fa06d196c1df128a493006238078bf69fc6)]:
  - @graphql-mesh/transport-common@0.7.35
  - @graphql-tools/executor-http@2.0.3

## 0.6.42

### Patch Changes

- Updated dependencies
  [[`54beb7a`](https://github.com/graphql-hive/gateway/commit/54beb7acde7558eee81ec0e20c123717865b8e18)]:
  - @graphql-tools/executor-http@2.0.2

## 0.6.41

### Patch Changes

- Updated dependencies
  [[`b7627d3`](https://github.com/graphql-hive/gateway/commit/b7627d3cc29e54a048085a79a07a7906f2994173),
  [`ef0e24c`](https://github.com/graphql-hive/gateway/commit/ef0e24c55ed26320d139a83b1de5b75d5c1bfe4e),
  [`b7627d3`](https://github.com/graphql-hive/gateway/commit/b7627d3cc29e54a048085a79a07a7906f2994173)]:
  - @graphql-tools/executor-http@2.0.1

## 0.6.40

### Patch Changes

- Updated dependencies
  [[`da47a0e`](https://github.com/graphql-hive/gateway/commit/da47a0effcc0e3c2b934bc97ab10e6e86ef8cd93),
  [`da47a0e`](https://github.com/graphql-hive/gateway/commit/da47a0effcc0e3c2b934bc97ab10e6e86ef8cd93),
  [`9a120c8`](https://github.com/graphql-hive/gateway/commit/9a120c85ac67654f63e374cf420ac4b73da21228),
  [`4cf75cb`](https://github.com/graphql-hive/gateway/commit/4cf75cbf1f14169826d1917532ee73ee45c002d5)]:
  - @graphql-tools/executor-http@2.0.0

## 0.6.39

### Patch Changes

- [#946](https://github.com/graphql-hive/gateway/pull/946)
  [`7d771d8`](https://github.com/graphql-hive/gateway/commit/7d771d89ff6d731b1025acfc5eb197541a6d5d35)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.2)
    (from `^0.104.1`, in `dependencies`)

- Updated dependencies
  [[`c7ea2c5`](https://github.com/graphql-hive/gateway/commit/c7ea2c5ae71b6b338ef22edd927a3fc93803965f)]:
  - @graphql-mesh/transport-common@0.7.34
  - @graphql-tools/executor-http@1.3.3

## 0.6.38

### Patch Changes

- Updated dependencies
  [[`a374bfc`](https://github.com/graphql-hive/gateway/commit/a374bfcf4309f5953b8c8304fba8e079b6f6b6dc)]:
  - @graphql-mesh/transport-common@0.7.33

## 0.6.37

### Patch Changes

- [#532](https://github.com/graphql-hive/gateway/pull/532)
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.0)
    (from `^1.2.5`, in `dependencies`)

- Updated dependencies
  [[`c9cd206`](https://github.com/graphql-hive/gateway/commit/c9cd20666a740514a5c17ecd6d0c000ad0dd7106),
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04),
  [`c9cd206`](https://github.com/graphql-hive/gateway/commit/c9cd20666a740514a5c17ecd6d0c000ad0dd7106),
  [`dbfb0f7`](https://github.com/graphql-hive/gateway/commit/dbfb0f7d6906d99b07b959bb6254d10e2fe2adf0)]:
  - @graphql-mesh/transport-common@0.7.32
  - @graphql-tools/executor-http@1.3.2

## 0.6.36

### Patch Changes

- [#862](https://github.com/graphql-hive/gateway/pull/862)
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.2.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.2.5)
    (from `^1.0.0`, in `dependencies`)

- Updated dependencies
  [[`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)]:
  - @graphql-tools/executor-http@1.3.1

## 0.6.35

### Patch Changes

- [#706](https://github.com/graphql-hive/gateway/pull/706)
  [`e393337`](https://github.com/graphql-hive/gateway/commit/e393337ecb40beffb79748b19b5aa8f2fd9197b7)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.1)
    (from `^0.104.0`, in `dependencies`)

- [#726](https://github.com/graphql-hive/gateway/pull/726)
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/promise-helpers@^1.0.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.0.0)
    (to `dependencies`)

- [#775](https://github.com/graphql-hive/gateway/pull/775)
  [`33f7dfd`](https://github.com/graphql-hive/gateway/commit/33f7dfdb10eef2a1e7f6dffe0ce6e4bb3cc7c2c6)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/types@^0.104.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.104.0)
    (from `^0.103.18`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.104.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.104.0)
    (from `^0.103.18`, in `dependencies`)

- [#792](https://github.com/graphql-hive/gateway/pull/792)
  [`9c2f323`](https://github.com/graphql-hive/gateway/commit/9c2f323ece47d9c0ef8f4e44050390096ceac17f)
  Thanks [@ardatan](https://github.com/ardatan)! - Ensure subgraph name is present in the upstream
  error extensions when HTTP Executor throws

- Updated dependencies
  [[`e393337`](https://github.com/graphql-hive/gateway/commit/e393337ecb40beffb79748b19b5aa8f2fd9197b7),
  [`33f7dfd`](https://github.com/graphql-hive/gateway/commit/33f7dfdb10eef2a1e7f6dffe0ce6e4bb3cc7c2c6),
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`c54a080`](https://github.com/graphql-hive/gateway/commit/c54a080b8b9c477ed55dd7c23fc8fcae9139bec8),
  [`d949143`](https://github.com/graphql-hive/gateway/commit/d94914302b5b2c71b1c95df5145326fba89b023c),
  [`661b103`](https://github.com/graphql-hive/gateway/commit/661b103a7b9586641e69b78cbaad516e550e7192),
  [`9c2f323`](https://github.com/graphql-hive/gateway/commit/9c2f323ece47d9c0ef8f4e44050390096ceac17f)]:
  - @graphql-mesh/transport-common@0.7.31
  - @graphql-tools/executor-http@1.3.0

## 0.6.34

### Patch Changes

- [#696](https://github.com/graphql-hive/gateway/pull/696)
  [`a289faa`](https://github.com/graphql-hive/gateway/commit/a289faae1469eb46f1458be341d21909fe5f8f8f)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/cross-helpers@^0.4.10` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.10)
    (from `^0.4.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.103.18` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.18)
    (from `^0.103.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.103.18` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.18)
    (from `^0.103.6`, in `dependencies`)

- Updated dependencies
  [[`a289faa`](https://github.com/graphql-hive/gateway/commit/a289faae1469eb46f1458be341d21909fe5f8f8f),
  [`a289faa`](https://github.com/graphql-hive/gateway/commit/a289faae1469eb46f1458be341d21909fe5f8f8f),
  [`20d275c`](https://github.com/graphql-hive/gateway/commit/20d275cd1badf76665874492d4550a7732b46f62)]:
  - @graphql-mesh/transport-common@0.7.30
  - @graphql-tools/executor-http@1.2.8

## 0.6.33

### Patch Changes

- [#620](https://github.com/graphql-hive/gateway/pull/620)
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.1)
    (from `^10.7.0`, in `dependencies`)

- Updated dependencies
  [[`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)]:
  - @graphql-mesh/transport-common@0.7.29
  - @graphql-tools/executor-http@1.2.7

## 0.6.32

### Patch Changes

- Updated dependencies
  [[`8c80ac9`](https://github.com/graphql-hive/gateway/commit/8c80ac98cd5afd7c063945f4704fe4866622c5d7),
  [`8c80ac9`](https://github.com/graphql-hive/gateway/commit/8c80ac98cd5afd7c063945f4704fe4866622c5d7),
  [`8c80ac9`](https://github.com/graphql-hive/gateway/commit/8c80ac98cd5afd7c063945f4704fe4866622c5d7)]:
  - @graphql-mesh/transport-common@0.7.28
  - @graphql-tools/executor-http@1.2.6

## 0.6.31

### Patch Changes

- [#420](https://github.com/graphql-hive/gateway/pull/420)
  [`14152f7`](https://github.com/graphql-hive/gateway/commit/14152f70d91572c0e60ba15ddeb2ffd0b41c9e92)
  Thanks [@ardatan](https://github.com/ardatan)! - - In case of schema reload, throw `SCHEMA_RELOAD`
  error while recreating the transports and executors
  - In case of shut down, throw `SHUTTING_DOWN` error while cleaning the transports and executors up

  Previously, these errors are only thrown for subscriptions not it is thrown in other type of
  operations as well. And previously the thrown errors during these two cleanup and restart process
  were cryptic, now the mentioned two errors above are thrown with more clear messages

- Updated dependencies
  [[`14152f7`](https://github.com/graphql-hive/gateway/commit/14152f70d91572c0e60ba15ddeb2ffd0b41c9e92),
  [`14152f7`](https://github.com/graphql-hive/gateway/commit/14152f70d91572c0e60ba15ddeb2ffd0b41c9e92)]:
  - @graphql-mesh/transport-common@0.7.27
  - @graphql-tools/executor-http@1.2.5

## 0.6.30

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/executor-http@1.2.4
  - @graphql-mesh/transport-common@0.7.26

## 0.6.29

### Patch Changes

- [#381](https://github.com/graphql-hive/gateway/pull/381)
  [`55eb1b4`](https://github.com/graphql-hive/gateway/commit/55eb1b4d14aec7b3e6c7bcf9f596bc01192d022c)
  Thanks [@ardatan](https://github.com/ardatan)! - This is a bugfix with some internal changes, no
  user action is needed. This bugfix and improvement is done to improve the stability of some
  components of the gateway;

  Like HMAC Upstream Signature plugin, different components of the gateway were using different ways
  of serializing the execution request. Some of them were ignoring `variables` if it is empty, some
  of not, this was causing the signature generation to be different for the same query. For example,
  it was working as expected in Proxy mode, but not working as expected in Federation Gateway mode.

  With this change, now we have a shared helper to serialize the upstream execution request with a
  memoized `print` function for query AST etc to have a consistent serialization so consistent
  signature generation for HMAC.

  For example instead of using `print`, you should use `defaultPrintFn` that memoizes `print`
  operation and also used the string version of it parsed before by Envelop/Yoga.

  ```diff
  -import { print } from 'graphql';
  -const query = print(parsedQuery);
  +import { defaultPrintFn } from '@graphql-tools/executor-common';
  +const query = defaultPrintFn(parsedQuery);
  ```

  Or instead of creating objects from `ExecutionRequest`, use `serializeExecutionRequest` helper.

  ```diff
  -const serializedRequest = {
  -  query: print(executionRequest.document),
  -  variables: executionRequest.variables,
  -  operationName: executionRequest.operationName,
  -  extensions: executionRequest.extensions,
  -};
  +import { serializeExecutionRequest } from '@graphql-tools/executor-common';
  +const serializedRequest = serializeExecutionRequest(executionRequest);
  ```

- Updated dependencies
  [[`55eb1b4`](https://github.com/graphql-hive/gateway/commit/55eb1b4d14aec7b3e6c7bcf9f596bc01192d022c),
  [`55eb1b4`](https://github.com/graphql-hive/gateway/commit/55eb1b4d14aec7b3e6c7bcf9f596bc01192d022c),
  [`55eb1b4`](https://github.com/graphql-hive/gateway/commit/55eb1b4d14aec7b3e6c7bcf9f596bc01192d022c)]:
  - @graphql-mesh/transport-common@0.7.25
  - @graphql-tools/executor-http@1.2.3

## 0.6.28

### Patch Changes

- [#373](https://github.com/graphql-hive/gateway/pull/373)
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.7.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.7.0)
    (from `^10.6.2`, in `dependencies`)

- Updated dependencies
  [[`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2),
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2),
  [`15975c2`](https://github.com/graphql-hive/gateway/commit/15975c28daddbb4f31d520371f53520aecacaac7)]:
  - @graphql-mesh/transport-common@0.7.24
  - @graphql-tools/executor-http@1.2.2

## 0.6.27

### Patch Changes

- Updated dependencies
  [[`23b8987`](https://github.com/graphql-hive/gateway/commit/23b89874fcf10b4cb6b1b941f29fa5f5aecf0ef2),
  [`23b8987`](https://github.com/graphql-hive/gateway/commit/23b89874fcf10b4cb6b1b941f29fa5f5aecf0ef2)]:
  - @graphql-mesh/transport-common@0.7.23
  - @graphql-tools/executor-http@1.2.1

## 0.6.26

### Patch Changes

- [#313](https://github.com/graphql-hive/gateway/pull/313)
  [`367b359`](https://github.com/graphql-hive/gateway/commit/367b3593cb7fd51c42ef4a13ab4adac202845734)
  Thanks [@ardatan](https://github.com/ardatan)! - Automatic Persisted Queries support for upstream
  requests

  For HTTP Executor;

  ```ts
  buildHTTPExecutor({
    // ...
    apq: true
  })
  ```

  For Gateway Configuration;

  ```ts
  export const gatewayConfig = defineConfig({
    transportEntries: {
      '*': {
        options: {
          apq: true
        }
      }
    }
  })
  ```

- Updated dependencies
  [[`367b359`](https://github.com/graphql-hive/gateway/commit/367b3593cb7fd51c42ef4a13ab4adac202845734)]:
  - @graphql-tools/executor-http@1.2.0

## 0.6.25

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
  - Updated dependency [`tslib@^2.8.1` ↗︎](https://www.npmjs.com/package/tslib/v/2.8.1) (from
    `^2.4.0`, in `dependencies`)

- Updated dependencies
  [[`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151),
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)]:
  - @graphql-mesh/transport-common@0.7.22
  - @graphql-tools/executor-http@1.1.14

## 0.6.24

### Patch Changes

- Updated dependencies
  [[`3f1a0fa`](https://github.com/graphql-hive/gateway/commit/3f1a0fa9f1f3b91542d00a0211d7def8ef30827e)]:
  - @graphql-tools/executor-http@1.1.13

## 0.6.23

### Patch Changes

- [#269](https://github.com/graphql-hive/gateway/pull/269)
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.2)
    (from `^10.6.0`, in `dependencies`)

- Updated dependencies
  [[`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)]:
  - @graphql-mesh/transport-common@0.7.21
  - @graphql-tools/executor-http@1.1.12

## 0.6.22

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.7.20

## 0.6.21

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.7.19

## 0.6.20

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.7.18

## 0.6.19

### Patch Changes

- Updated dependencies
  [[`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a)]:
  - @graphql-tools/executor-http@1.1.11
  - @graphql-mesh/transport-common@0.7.17

## 0.6.18

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
    [`@graphql-mesh/types@^0.103.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.4)
    (from `^0.103.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.103.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.4)
    (from `^0.103.1`, in `dependencies`)

- [#185](https://github.com/graphql-hive/gateway/pull/185)
  [`f0b6921`](https://github.com/graphql-hive/gateway/commit/f0b69219fefc1b24c5511a1c623a5e3bbaf5ca0b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/types@^0.103.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.4)
    (from `^0.103.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.103.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.4)
    (from `^0.103.1`, in `dependencies`)

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
  [`9438e21`](https://github.com/graphql-hive/gateway/commit/9438e21982ed5c6fb18cb678b275046595ae00f5),
  [`9438e21`](https://github.com/graphql-hive/gateway/commit/9438e21982ed5c6fb18cb678b275046595ae00f5),
  [`b534288`](https://github.com/graphql-hive/gateway/commit/b5342885f8ac1197d70cbf45266c83b720b4f85a),
  [`697308d`](https://github.com/graphql-hive/gateway/commit/697308df3b2dd96f28dc65a5f5361a911077e022)]:
  - @graphql-mesh/transport-common@0.7.16
  - @graphql-tools/executor-http@1.1.10

## 0.6.17

### Patch Changes

- [#148](https://github.com/graphql-hive/gateway/pull/148)
  [`f32cb2a`](https://github.com/graphql-hive/gateway/commit/f32cb2a0289aa32e4811ced5dc1aac3efb0674f1)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
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
    [`@graphql-mesh/types@^0.103.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.0)
    (from `^0.102.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.103.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.0)
    (from `^0.102.12`, in `dependencies`)

- Updated dependencies
  [[`f32cb2a`](https://github.com/graphql-hive/gateway/commit/f32cb2a0289aa32e4811ced5dc1aac3efb0674f1),
  [`c0e189a`](https://github.com/graphql-hive/gateway/commit/c0e189ac83901da3a101f16f151e859ff7cca19f)]:
  - @graphql-mesh/transport-common@0.7.15

## 0.6.16

### Patch Changes

- [#118](https://github.com/graphql-hive/gateway/pull/118)
  [`73c621d`](https://github.com/graphql-hive/gateway/commit/73c621d98a4e6ca134527e349bc71223c03d06db)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor-http@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/workspace:^)
    (from `^1.1.8`, in `dependencies`)

- [`19bc6a4`](https://github.com/graphql-hive/gateway/commit/19bc6a4c222ff157553785ea16760888cdfe10bb)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - `onError` and `onEnd` callbacks when mapping
  async iterators are invoked only once regardless of how many times throw/return was called on the
  iterator

- Updated dependencies
  [[`73c621d`](https://github.com/graphql-hive/gateway/commit/73c621d98a4e6ca134527e349bc71223c03d06db),
  [`19bc6a4`](https://github.com/graphql-hive/gateway/commit/19bc6a4c222ff157553785ea16760888cdfe10bb)]:
  - @graphql-mesh/transport-common@0.7.14

## 0.6.15

### Patch Changes

- [`38526dd`](https://github.com/ardatan/graphql-mesh/commit/38526dd613935248df1a313263c56f6b88725c06)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Bump @graphql-tools/executor-http. Latest
  includes a fix for canceling SSE streams even while waiting for next event

## 0.6.14

### Patch Changes

- Updated dependencies
  [[`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7)]:
  - @graphql-mesh/utils@0.102.12
  - @graphql-mesh/transport-common@0.7.13

## 0.6.13

### Patch Changes

- Updated dependencies
  [[`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af),
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)]:
  - @graphql-mesh/transport-common@0.7.12
  - @graphql-mesh/utils@0.102.11

## 0.6.12

### Patch Changes

- [#7712](https://github.com/ardatan/graphql-mesh/pull/7712)
  [`dc54d58`](https://github.com/ardatan/graphql-mesh/commit/dc54d589afa0d08378565e1153b679397f2853a5)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Transport entries `headers` option can
  now be overridden in the `subscriptions` transport

## 0.6.11

### Patch Changes

- [#7826](https://github.com/ardatan/graphql-mesh/pull/7826)
  [`e59191f`](https://github.com/ardatan/graphql-mesh/commit/e59191f3ec34c2c15d65174459a5c848cab67e13)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/cross-helpers@^0.4.7` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.7)
    (to `dependencies`)

- [#7826](https://github.com/ardatan/graphql-mesh/pull/7826)
  [`e59191f`](https://github.com/ardatan/graphql-mesh/commit/e59191f3ec34c2c15d65174459a5c848cab67e13)
  Thanks [@ardatan](https://github.com/ardatan)! - Add missing \`process\` import for cross platform
  support

- Updated dependencies
  [[`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71),
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)]:
  - @graphql-mesh/transport-common@0.7.11
  - @graphql-mesh/utils@0.102.10

## 0.6.10

### Patch Changes

- Updated dependencies
  [[`fad4d27`](https://github.com/ardatan/graphql-mesh/commit/fad4d27bfebb80a374c2041b86ffab509845effe)]:
  - @graphql-mesh/utils@0.102.9
  - @graphql-mesh/transport-common@0.7.10

## 0.6.9

### Patch Changes

- Updated dependencies
  [[`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)]:
  - @graphql-mesh/transport-common@0.7.9
  - @graphql-mesh/utils@0.102.8

## 0.6.8

### Patch Changes

- [#7781](https://github.com/ardatan/graphql-mesh/pull/7781)
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.5.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.5)
    (from `^10.5.3`, in `dependencies`)
- Updated dependencies
  [[`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)]:
  - @graphql-mesh/transport-common@0.7.8
  - @graphql-mesh/utils@0.102.7

## 0.6.7

### Patch Changes

- Updated dependencies
  [[`bf588d3`](https://github.com/ardatan/graphql-mesh/commit/bf588d372c0078378aaa24beea2da794af7949e6)]:
  - @graphql-mesh/utils@0.102.6
  - @graphql-mesh/transport-common@0.7.7

## 0.6.6

### Patch Changes

- Updated dependencies
  [[`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d)]:
  - @graphql-mesh/utils@0.102.5
  - @graphql-mesh/transport-common@0.7.6

## 0.6.5

### Patch Changes

- Updated dependencies
  [[`5146df0`](https://github.com/ardatan/graphql-mesh/commit/5146df0fd3313227d5d7df2beb726ca89e13923f)]:
  - @graphql-mesh/transport-common@0.7.5

## 0.6.4

### Patch Changes

- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/transport-common@0.7.4
  - @graphql-mesh/utils@0.102.4

## 0.6.3

### Patch Changes

- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)]:
  - @graphql-mesh/transport-common@0.7.3
  - @graphql-mesh/utils@0.102.3

## 0.6.2

### Patch Changes

- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/utils@0.102.2
  - @graphql-mesh/transport-common@0.7.2

## 0.6.1

### Patch Changes

- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de),
  [`60bfc22`](https://github.com/ardatan/graphql-mesh/commit/60bfc2240108af0a599a66451517a146cace879d)]:
  - @graphql-mesh/utils@0.102.1
  - @graphql-mesh/transport-common@0.7.1

## 0.6.0

### Patch Changes

- Updated dependencies
  [[`13fa835`](https://github.com/ardatan/graphql-mesh/commit/13fa835036c3671305fc831fa236f110c33d9965)]:
  - @graphql-mesh/string-interpolation@0.5.6
  - @graphql-mesh/utils@0.102.0
  - @graphql-mesh/transport-common@0.7.0

## 0.5.2

### Patch Changes

- [#7518](https://github.com/ardatan/graphql-mesh/pull/7518)
  [`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^0.6.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/0.6.1)
    (from `^0.6.0`, in `dependencies`)

## 0.5.1

### Patch Changes

- [#7516](https://github.com/ardatan/graphql-mesh/pull/7516)
  [`67e1062`](https://github.com/ardatan/graphql-mesh/commit/67e10629c70ec553234c1ffc99af4b89ddb31985)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Transport's kind doesn't need to be typed

- Updated dependencies
  [[`67e1062`](https://github.com/ardatan/graphql-mesh/commit/67e10629c70ec553234c1ffc99af4b89ddb31985)]:
  - @graphql-mesh/transport-common@0.6.1

## 0.5.0

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
    [`@graphql-tools/utils@^10.5.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.3)
    (from `^10.5.2`, in `dependencies`)
- Updated dependencies
  [[`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)]:
  - @graphql-mesh/transport-common@0.6.0
  - @graphql-mesh/utils@0.101.0

## 0.4.0

### Patch Changes

- [#7477](https://github.com/ardatan/graphql-mesh/pull/7477)
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.3.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.3.4)
    (from `^10.2.3`, in `dependencies`)
- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7),
  [`4d1eb28`](https://github.com/ardatan/graphql-mesh/commit/4d1eb285c2b703c5f80473ad0f316004306fac7f),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7)]:
  - @graphql-mesh/transport-common@0.5.0
  - @graphql-mesh/utils@0.100.0

## 0.3.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.99.7
  - @graphql-mesh/transport-common@0.4.7

## 0.3.6

### Patch Changes

- [#7447](https://github.com/ardatan/graphql-mesh/pull/7447)
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on schema loading handling

- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/transport-common@0.4.6
  - @graphql-mesh/utils@0.99.6

## 0.3.5

### Patch Changes

- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/utils@0.99.5
  - @graphql-mesh/transport-common@0.4.5

## 0.3.4

### Patch Changes

- Updated dependencies
  [[`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)]:
  - @graphql-mesh/utils@0.99.4
  - @graphql-mesh/transport-common@0.4.4

## 0.3.3

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3
  - @graphql-mesh/transport-common@0.4.3

## 0.3.2

### Patch Changes

- [#7294](https://github.com/ardatan/graphql-mesh/pull/7294)
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/string-interpolation@^0.5.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/string-interpolation/v/0.5.4)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/utils@^0.99.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.99.0)
    (to `dependencies`)
  - Removed dependency
    [`@graphql-tools/executor-graphql-ws@^1.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-graphql-ws/v/1.2.0)
    (from `dependencies`)

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
  [[`b01f3ea`](https://github.com/ardatan/graphql-mesh/commit/b01f3eabdc42d8905e8d586a4845e8394c094033),
  [`0bdc18d`](https://github.com/ardatan/graphql-mesh/commit/0bdc18df3d150a61abf987b8829934ed4ca02eed),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730)]:
  - @graphql-mesh/string-interpolation@0.5.5
  - @graphql-mesh/transport-common@0.4.2
  - @graphql-mesh/utils@0.99.2

## 0.3.1

### Patch Changes

- [#7316](https://github.com/ardatan/graphql-mesh/pull/7316)
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor-http@^1.1.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.1.5)
    (from `^1.1.2`, in `dependencies`)
- Updated dependencies
  [[`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)]:
  - @graphql-mesh/transport-common@0.4.1

## 0.3.0

### Minor Changes

- [#7207](https://github.com/ardatan/graphql-mesh/pull/7207)
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Support subscriptions over WebSockets

### Patch Changes

- [#6772](https://github.com/ardatan/graphql-mesh/pull/6772)
  [`27e3cc9`](https://github.com/ardatan/graphql-mesh/commit/27e3cc97c1218863cf2948902bdca050bd71d18a)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor-http@^1.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.1.2)
    (from `^1.0.6`, in `dependencies`)

- [#7207](https://github.com/ardatan/graphql-mesh/pull/7207)
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/executor-graphql-ws@^1.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-graphql-ws/v/1.2.0)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (to `dependencies`)
  - Added dependency [`graphql-ws@^5.16.0` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.16.0) (to
    `dependencies`)
  - Added dependency [`ws@^8.18.0` ↗︎](https://www.npmjs.com/package/ws/v/8.18.0) (to `dependencies`)
  - Removed dependency
    [`@envelop/core@^5.0.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.0) (from
    `dependencies`)

- [#7218](https://github.com/ardatan/graphql-mesh/pull/7218)
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor-http@^1.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.1.2)
    (from `^1.0.6`, in `dependencies`)
  - Added dependency
    [`@graphql-tools/executor-graphql-ws@^1.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-graphql-ws/v/1.2.0)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (to `dependencies`)
  - Added dependency [`graphql-ws@^5.16.0` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.16.0) (to
    `dependencies`)
  - Added dependency [`ws@^8.18.0` ↗︎](https://www.npmjs.com/package/ws/v/8.18.0) (to `dependencies`)
  - Removed dependency
    [`@envelop/core@^5.0.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.0) (from
    `dependencies`)

- [#7223](https://github.com/ardatan/graphql-mesh/pull/7223)
  [`26549a9`](https://github.com/ardatan/graphql-mesh/commit/26549a9832b4e18afdb22e4615a9951d69a5922b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor-http@^1.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.1.2)
    (from `^1.0.6`, in `dependencies`)
- Updated dependencies
  [[`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)]:
  - @graphql-mesh/transport-common@0.4.0

## 0.2.1

### Patch Changes

- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)]:
  - @graphql-mesh/transport-common@0.3.1

## 0.2.0

### Minor Changes

- [#7145](https://github.com/ardatan/graphql-mesh/pull/7145)
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)
  Thanks [@ardatan](https://github.com/ardatan)! - POTENTIAL BREAKING CHANGE:

  Now `@httpOperation` and `@transport` directive serializes headers as `[string, string][]` instead
  of stringified JSON.

  ```diff
  @httpOperation(
  -  operationSpecificHeaders: [["Authorization", "Bearer 123"], ["X-Api-Key", "123"]]
  +  operationSpecificHeaders: "{\"Authorization\": \"Bearer 123\", \"X-Api-Key\": \"123\"}"
  )
  ```

  ```diff
  @transport(
  -  headers: [["Authorization, "Bearer 123"], ["X-Api-Key", "123"]]
  +  headers: "{\"Authorization, \"Bearer 123\", \"X-Api-Key\": \"123\"}"
  )
  ```

  Also incorrect placement of `@transport` has been fixed to `SCHEMA`

  ```diff
  directive @transport on
  -  FIELD_DEFINITION
  +  SCHEMA
  ```

  There is still backwards compatibility but this might look like a breaking change for some users
  during schema validation.

### Patch Changes

- Updated dependencies
  [[`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)]:
  - @graphql-mesh/transport-common@0.3.0

## 0.1.14

### Patch Changes

- Updated dependencies
  [[`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/transport-common@0.2.8

## 0.1.13

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.2.7

## 0.1.12

### Patch Changes

- Updated dependencies
  [[`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/transport-common@0.2.6

## 0.1.11

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.2.5

## 0.1.10

### Patch Changes

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @graphql-mesh/transport-common@0.2.4

## 0.1.9

### Patch Changes

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @graphql-mesh/transport-common@0.2.3

## 0.1.8

### Patch Changes

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/transport-common@0.2.2

## 0.1.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.2.1

## 0.1.6

### Patch Changes

- Updated dependencies
  [[`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)]:
  - @graphql-mesh/transport-common@0.2.0

## 0.1.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.1.5

## 0.1.4

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.1.4

## 0.1.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.1.1

## 0.1.0

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.1.0

## 0.0.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.0.3

## 0.0.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.0.2

## 0.0.1

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - New Fusion packages

- Updated dependencies
  [[`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)]:
  - @graphql-mesh/transport-common@0.0.1
