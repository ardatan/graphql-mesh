# @graphql-tools/executor-http

## 4.0.1

### Patch Changes

- [#9868](https://github.com/ardatan/graphql-mesh/pull/9868)
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^13.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/13.2.3)
    (from `^13.2.2`, in `dependencies`)

- [#9870](https://github.com/ardatan/graphql-mesh/pull/9870)
  [`4be0ced`](https://github.com/ardatan/graphql-mesh/commit/4be0cedc3d15c6cdd8db91334f9edfee2c99783e)
  Thanks [@ardatan](https://github.com/ardatan)! - Less CPU per shared subgraph HTTP hop.

  `copyJson` is exported from `@graphql-tools/executor-common` for a plain JSON deep copy (faster
  than `structuredClone`). Shared inflight consumers of `@graphql-tools/executor-http` use it for
  `data`, and the last consumer keeps the original. Variables are scanned for uploads before
  `extractFiles` clones them, so ordinary JSON variable bags skip multipart work. When
  `@graphql-hive/signal` exposes `disposeAbortSignal`, the HTTP executor releases the combined
  request signal once a non-streaming result is in.

- [#9860](https://github.com/ardatan/graphql-mesh/pull/9860)
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc)
  Thanks [@ardatan](https://github.com/ardatan)! - Source of these packages moved from
  `graphql-hive/gateway` into this repo. npm names and import paths are unchanged. Hive Gateway will
  consume published versions from Mesh after cutover. Package-level federation benches live under
  `bench/federation`; Gateway e2e memtest/bench CI stays on the Gateway repo and continues to
  measure Gateway impact.

- Updated dependencies
  [[`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`4be0ced`](https://github.com/ardatan/graphql-mesh/commit/4be0cedc3d15c6cdd8db91334f9edfee2c99783e),
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc)]:
  - @graphql-tools/executor-common@2.0.1

## 4.0.0

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
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Remove the unused `disposable` option from
  `buildHTTPExecutor`. Executors are always disposable.

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
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)]:
  - @graphql-tools/executor-common@2.0.0
  - @graphql-hive/signal@3.0.0

## 3.6.2

### Patch Changes

- [#2691](https://github.com/graphql-hive/gateway/pull/2691)
  [`3e0a896`](https://github.com/graphql-hive/gateway/commit/3e0a896cf110d8a6290e20b10b6865813301f5ca)
  Thanks [@jhonDoe15](https://github.com/jhonDoe15)! - Reduce allocation during delegation: clone
  HTTP query results only when the in-flight request has multiple consumers, construct compact fresh
  null-prototype field metadata maps, and avoid temporary fake-promise wrappers for synchronous
  composite completion. Preserve shared-request isolation, metadata descriptors, and asynchronous
  completion behavior.

## 3.6.1

### Patch Changes

- [`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^12.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.1.0)
    (from `^12.0.1`, in `dependencies`)

- Updated dependencies
  [[`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)]:
  - @graphql-tools/executor-common@1.1.1

## 3.6.0

### Minor Changes

- [#2717](https://github.com/graphql-hive/gateway/pull/2717)
  [`cc5870d`](https://github.com/graphql-hive/gateway/commit/cc5870de856effe1e277b79ee2cd87bd046179a2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Add `deduplicateInflightRequestsPerContext`
  option to the HTTP executor

  When `true` (default), inflight requests are deduplicated only within the same `context` object.
  When `false`, identical requests are deduplicated across different contexts within the same
  executor.

  Hive Gateway's HTTP transport sets it to `false` so that identical subgraph requests coming from
  different clients are deduplicated.

## 3.5.1

### Patch Changes

- [`4a2d3b6`](https://github.com/graphql-hive/gateway/commit/4a2d3b6a4e34cbe984ce7e36fd3306d907fb29d1)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Deduplicate inflight requests only within the
  same executor and the same `context`

  The `fetch` implementation receives the request `context` and may handle each request differently,
  so identical requests with different contexts or from different executors are no longer
  deduplicated together.

## 3.5.0

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
  [[`680eb53`](https://github.com/graphql-hive/gateway/commit/680eb53b8d9ef9b45503c819780ff1d592773e35)]:
  - @graphql-hive/signal@2.1.0

## 3.4.1

### Patch Changes

- [#2485](https://github.com/graphql-hive/gateway/pull/2485)
  [`47fe3d6`](https://github.com/graphql-hive/gateway/commit/47fe3d6846f3c6227985168cac6bb2d5f1db91cc)
  Thanks [@adam-drag](https://github.com/adam-drag)! - Release the connection when an SSE
  subscription is torn down

  `handleEventStreamResponse` called `reader.releaseLock()` on normal teardown, which detaches the
  reader but leaves the response body un-cancelled, so the underlying HTTP connection was never
  released and the socket stayed open until the process exited. Long-running consumers accumulated
  one leaked connection per disposed subscription.

  It now calls `reader.cancel()`, which propagates cancellation and closes the connection. The error
  path already used `cancel()`; only the normal path did not.

  Closes https://github.com/graphql-hive/gateway/issues/2486

## 3.4.0

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
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830)]:
  - @graphql-tools/executor-common@1.1.0

## 3.3.0

### Minor Changes

- [#2334](https://github.com/graphql-hive/gateway/pull/2334)
  [`0f8706c`](https://github.com/graphql-hive/gateway/commit/0f8706c54556669148de1bf74725cc8c896e5ced)
  Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - Add
  `useGETForHashedQueries` support for downstream APQ requests so hash-only query probes can use GET
  while full-query fallbacks continue to use POST.

  Add the `useContentTypeForGETRequests` opt-in for GET requests that need
  `content-type: application/json` compatibility.

## 3.2.1

### Patch Changes

- [`786e06f`](https://github.com/graphql-hive/gateway/commit/786e06f4e3d74c76a7274bbbc69100a7d30549e6)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not recursively return HTTP extensions

## 3.2.0

### Minor Changes

- [#2211](https://github.com/graphql-hive/gateway/pull/2211)
  [`59ef8f7`](https://github.com/graphql-hive/gateway/commit/59ef8f733d4fced3416bc95d323f00fb46e69b95)
  Thanks [@ardatan](https://github.com/ardatan)! - Add `exposeHTTPDetailsInExtensions` flag to get
  `Response` details in the result extensions.

  ```ts
  import { buildHTTPExecutor } from '@graphql-tools/executor-http'

  const executor = buildHTTPExecutor({
    exposeHTTPDetailsInExtensions: true
  })
  ```

  Then in the result;

  ```ts
  {
      "data": {
          "hello": "world"
      },
      "extensions": {
          "request": {
              "url": "http://localhost:4000/graphql",
              "method": "POST",
              "headers": {
                  "content-type": "application/json"
              },
              "body": "{\"query\":\"{ hello }\"}"
          },
          "response": {
              "status": 200,
              "statusText": "OK",
              "headers": {
                  "content-type": "application/json"
              }
          }
      }
  }
  ```

## 3.1.4

### Patch Changes

- [#2194](https://github.com/graphql-hive/gateway/pull/2194)
  [`f9d2f0e`](https://github.com/graphql-hive/gateway/commit/f9d2f0ea9e7f172b8270c17961a98bc52a7ba49d)
  Thanks [@ManrajSingh6](https://github.com/ManrajSingh6)! - Prevent reusing the cached inflight
  requests

## 3.1.3

### Patch Changes

- [#2179](https://github.com/graphql-hive/gateway/pull/2179)
  [`323626f`](https://github.com/graphql-hive/gateway/commit/323626ff877f50e509e45cc56ce82602d5118a1d)
  Thanks [@ardatan](https://github.com/ardatan)! - Exclude mutations for deduplication

## 3.1.2

### Patch Changes

- [#2185](https://github.com/graphql-hive/gateway/pull/2185)
  [`f85a9fe`](https://github.com/graphql-hive/gateway/commit/f85a9fe11dc88a7fa8397c5372ef24f9e91b638e)
  Thanks [@elliotvilhelm](https://github.com/elliotvilhelm)! - Fix SSE data parsing when JSON
  payload contains literal "data:" substrings

  The SSE event parser used `msg.split('data:')` to extract the data field, which incorrectly splits
  on `data:` substrings inside the JSON payload (e.g., OAuth scopes like `file_metadata:read`, data
  URIs like `data:image/png`). This caused `JSON.parse` to fail with "Unterminated string in JSON"
  errors.

  The fix uses line-based parsing per the SSE spec: split on newlines first, then find the line
  starting with `data:`.

## 3.1.1

### Patch Changes

- [#2099](https://github.com/graphql-hive/gateway/pull/2099)
  [`dae3fe4`](https://github.com/graphql-hive/gateway/commit/dae3fe4fbb9c78598d1bbf91c2ed07ab1b90f05d)
  Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - Fix missing NPM
  provenance attestation by enabling `npmPublishProvenance` in Yarn configuration

## 3.1.0

### Minor Changes

- [`9f29d58`](https://github.com/graphql-hive/gateway/commit/9f29d587946383482ad55924fe49b9e7804f48a3)
  Thanks [@ardatan](https://github.com/ardatan)! - Support factory function in `timeout` option so
  that you can set timeout milliseconds dynamically per `ExecutionRequest`;

  ```ts
  buildHTTPExecutor({
    timeout: request => {
      if (request.operationName === 'BigQuery') {
        return 10000 // 10 seconds for the `BigQuery` operation
      }
      // Or infinite timeout for subscriptions
      if (request.operationType === 'subscription') {
        return undefined
      }
      return 5000 // 5 seconds for other operations
    }
  })
  ```

### Patch Changes

- [#1842](https://github.com/graphql-hive/gateway/pull/1842)
  [`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^11.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.0.0)
    (from `^10.10.3`, in `dependencies`)

- Updated dependencies
  [[`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f)]:
  - @graphql-tools/executor-common@1.0.6

## 3.0.7

### Patch Changes

- [#1684](https://github.com/graphql-hive/gateway/pull/1684)
  [`478d7e2`](https://github.com/graphql-hive/gateway/commit/478d7e25ef47fb8fb6183010a8bb61ac31688c55)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/fetch@^0.10.13` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.13)
    (from `^0.10.12`, in `dependencies`)

- [#1691](https://github.com/graphql-hive/gateway/pull/1691)
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.3)
    (from `^10.10.1`, in `dependencies`)

- [#1347](https://github.com/graphql-hive/gateway/pull/1347)
  [`2993f24`](https://github.com/graphql-hive/gateway/commit/2993f24f8e46853c0d2667c0cd2bf96190f3a2b2)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid shared AbortController instance on
  CloudflareWorkers because it gives `Cannot perform I/O on behalf of a different request.` error.
  This change ensures that the AbortController is only created when not running in a Cloudflare
  Workers environment.
- Updated dependencies
  [[`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)]:
  - @graphql-tools/executor-common@1.0.5

## 3.0.6

### Patch Changes

- [#1608](https://github.com/graphql-hive/gateway/pull/1608)
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.1)
    (from `^10.9.1`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.12` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.12)
    (from `^0.10.11`, in `dependencies`)

- [#1662](https://github.com/graphql-hive/gateway/pull/1662)
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.1)
    (from `^10.10.0`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.12` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.12)
    (from `^0.10.11`, in `dependencies`)

- [`c754a96`](https://github.com/graphql-hive/gateway/commit/c754a96d49ea69f54f57a8f1b01baf9d2fb947b6)
  Thanks [@ardatan](https://github.com/ardatan)! - Use more specific error codes;

  `GATEWAY_TIMEOUT` -> Server could not get a response from upstream in time `SUBREQUEST_HTTP_ERROR`
  -> An error occurred while making the HTTP request to the upstream `RESPONSE_VALIDATION_FAILED` ->
  The response from upstream did not conform to the expected GraphQL response format

- Updated dependencies
  [[`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`3f6b99d`](https://github.com/graphql-hive/gateway/commit/3f6b99d152cbcc17d4ec3c97bc48dae452982151)]:
  - @graphql-tools/executor-common@1.0.4

## 3.0.5

### Patch Changes

- [#1654](https://github.com/graphql-hive/gateway/pull/1654)
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.0)
    (from `^10.9.1`, in `dependencies`)

- Updated dependencies
  [[`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851)]:
  - @graphql-tools/executor-common@1.0.3

## 3.0.4

### Patch Changes

- [#1542](https://github.com/graphql-hive/gateway/pull/1542)
  [`0a349fb`](https://github.com/graphql-hive/gateway/commit/0a349fbfd52eaf8a2b21c9669871c916d41b840f)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/fetch@^0.10.11` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.11)
    (from `^0.10.10`, in `dependencies`)

## 3.0.3

### Patch Changes

- Updated dependencies
  [[`d7b48a7`](https://github.com/graphql-hive/gateway/commit/d7b48a778344145478f0d3e1e1e188124181f0f2)]:
  - @graphql-tools/executor-common@1.0.2

## 3.0.2

### Patch Changes

- [#1473](https://github.com/graphql-hive/gateway/pull/1473)
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.2)
    (from `^1.3.0`, in `dependencies`)

- [#1495](https://github.com/graphql-hive/gateway/pull/1495)
  [`fe99f74`](https://github.com/graphql-hive/gateway/commit/fe99f74dd11fdf2928ca7080d4d2e5dfd1e2f18e)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency [`meros@^1.3.2` ↗︎](https://www.npmjs.com/package/meros/v/1.3.2) (from
    `^1.3.1`, in `dependencies`)

## 3.0.1

### Patch Changes

- Updated dependencies
  [[`b0e5568`](https://github.com/graphql-hive/gateway/commit/b0e55688d4fc22d0bfbf664de52e78e9642d7014)]:
  - @graphql-tools/executor-common@1.0.1

## 3.0.0

### Major Changes

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Drop Node 18 support

  Least supported Node version is now v20.

### Patch Changes

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Inflight request deduplication

- Updated dependencies
  [[`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)]:
  - @graphql-tools/executor-common@1.0.0
  - @graphql-hive/signal@2.0.0

## 2.1.2

### Patch Changes

- [#1411](https://github.com/graphql-hive/gateway/pull/1411)
  [`37113d1`](https://github.com/graphql-hive/gateway/commit/37113d1a446748fd83da9823e27a0f56872317df)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/fetch@^0.10.10` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.10)
    (from `^0.10.9`, in `dependencies`)

## 2.1.1

### Patch Changes

- [#1358](https://github.com/graphql-hive/gateway/pull/1358)
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.1)
    (from `^10.9.0`, in `dependencies`)

- Updated dependencies
  [[`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)]:
  - @graphql-tools/executor-common@0.0.6

## 2.1.0

### Minor Changes

- [#1017](https://github.com/graphql-hive/gateway/pull/1017)
  [`b59a266`](https://github.com/graphql-hive/gateway/commit/b59a26628c368272b50380bab57553070e2edf6e)
  Thanks [@ardatan](https://github.com/ardatan)! - `endpoint` can now also be a factory function
  that returns the endpoint based on the `ExecutionRequest`. This allows creating dynamic endpoints,
  depending on environment variables or other runtime values.

### Patch Changes

- [#1338](https://github.com/graphql-hive/gateway/pull/1338)
  [`7287ffa`](https://github.com/graphql-hive/gateway/commit/7287ffa2ac0f08801c3058e96a7c4eba7102c1d0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.9` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.9)
    (from `^0.10.8`, in `dependencies`)

- [#1344](https://github.com/graphql-hive/gateway/pull/1344)
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.9.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.0)
    (from `^10.8.1`, in `dependencies`)

- Updated dependencies
  [[`6215001`](https://github.com/graphql-hive/gateway/commit/6215001b1d650ad865331661532bcc4f7bad6b40),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a)]:
  - @graphql-tools/executor-common@0.0.5

## 2.0.3

### Patch Changes

- [#1233](https://github.com/graphql-hive/gateway/pull/1233)
  [`ed323fa`](https://github.com/graphql-hive/gateway/commit/ed323fa06d196c1df128a493006238078bf69fc6)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`meros@^1.3.1` ↗︎](https://www.npmjs.com/package/meros/v/1.3.1) (from
    `^1.2.1`, in `dependencies`)

## 2.0.2

### Patch Changes

- [#1144](https://github.com/graphql-hive/gateway/pull/1144)
  [`54beb7a`](https://github.com/graphql-hive/gateway/commit/54beb7acde7558eee81ec0e20c123717865b8e18)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.8` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.8)
    (from `^0.10.6`, in `dependencies`)

## 2.0.1

### Patch Changes

- [#1124](https://github.com/graphql-hive/gateway/pull/1124)
  [`b7627d3`](https://github.com/graphql-hive/gateway/commit/b7627d3cc29e54a048085a79a07a7906f2994173)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Handle server sent events stream chunk
  containing multiple events

- [#1121](https://github.com/graphql-hive/gateway/pull/1121)
  [`ef0e24c`](https://github.com/graphql-hive/gateway/commit/ef0e24c55ed26320d139a83b1de5b75d5c1bfe4e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Gracefully handle event stream reading errors
  and cancellations

- [#1124](https://github.com/graphql-hive/gateway/pull/1124)
  [`b7627d3`](https://github.com/graphql-hive/gateway/commit/b7627d3cc29e54a048085a79a07a7906f2994173)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Flush incoming chunk before closing the
  stream

## 2.0.0

### Major Changes

- [#997](https://github.com/graphql-hive/gateway/pull/997)
  [`4cf75cb`](https://github.com/graphql-hive/gateway/commit/4cf75cbf1f14169826d1917532ee73ee45c002d5)
  Thanks [@ardatan](https://github.com/ardatan)! - - **BREAKING**: HTTP Executor no longer takes
  `serviceName` as an option.
  - Both HTTP executor and `@graphql-mesh/transport-http-callback` no longer handle
    `DOWNSTREAM_SERVICE_ERROR` error code with `serviceName`.
  - Gateway runtime handles subgraph errors on its own with `DOWNSTREAM_SERVICE_ERROR` error code
    and `serviceName` as a property. This behavior can be configured with `subgraphErrors` option of
    the `createGatewayRuntime` function or CLI config.

  ```ts
  subgraphError: {
     errorCode: 'DOWNSTREAM_SERVICE_ERROR', // or `false` to remove this code completely
     subgraphNameProp: 'serviceName' // or `false` to remove this prop completely
  }
  ```

### Patch Changes

- [#1045](https://github.com/graphql-hive/gateway/pull/1045)
  [`da47a0e`](https://github.com/graphql-hive/gateway/commit/da47a0effcc0e3c2b934bc97ab10e6e86ef8cd93)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.6` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.6)
    (from `^0.10.4`, in `dependencies`)

- [#1045](https://github.com/graphql-hive/gateway/pull/1045)
  [`da47a0e`](https://github.com/graphql-hive/gateway/commit/da47a0effcc0e3c2b934bc97ab10e6e86ef8cd93)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Update graphql-yoga and whatwg-node packages

  In light of https://github.com/ardatan/whatwg-node/pull/2305. Please upgrade as soon as possible!

- [#1015](https://github.com/graphql-hive/gateway/pull/1015)
  [`9a120c8`](https://github.com/graphql-hive/gateway/commit/9a120c85ac67654f63e374cf420ac4b73da21228)
  Thanks [@ardatan](https://github.com/ardatan)! - Add `TypeError` to `originalError` prop of the
  error thrown when no `data` and `errors` found in the HTTP response, then GraphQL Servers know
  that it is an unexpected error so it should be masked and logged separately instead of leaking to
  the client

## 1.3.3

### Patch Changes

- [#950](https://github.com/graphql-hive/gateway/pull/950)
  [`c7ea2c5`](https://github.com/graphql-hive/gateway/commit/c7ea2c5ae71b6b338ef22edd927a3fc93803965f)
  Thanks [@kroupacz](https://github.com/kroupacz)! - Errors should not be swallowed when it is
  thrown from the shared root

## 1.3.2

### Patch Changes

- [#532](https://github.com/graphql-hive/gateway/pull/532)
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.0)
    (from `^1.2.5`, in `dependencies`)

- [#922](https://github.com/graphql-hive/gateway/pull/922)
  [`c9cd206`](https://github.com/graphql-hive/gateway/commit/c9cd20666a740514a5c17ecd6d0c000ad0dd7106)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Added dependency
    [`@graphql-hive/signal@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-hive/signal/v/workspace:^)
    (to `dependencies`)

- [#929](https://github.com/graphql-hive/gateway/pull/929)
  [`dbfb0f7`](https://github.com/graphql-hive/gateway/commit/dbfb0f7d6906d99b07b959bb6254d10e2fe2adf0)
  Thanks [@ardatan](https://github.com/ardatan)! - Throw an understandable error with HTTP details
  when the response is empty

- Updated dependencies
  [[`c9cd206`](https://github.com/graphql-hive/gateway/commit/c9cd20666a740514a5c17ecd6d0c000ad0dd7106)]:
  - @graphql-hive/signal@1.0.0

## 1.3.1

### Patch Changes

- [#862](https://github.com/graphql-hive/gateway/pull/862)
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.2.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.2.5)
    (from `^1.0.0`, in `dependencies`)

## 1.3.0

### Minor Changes

- [#792](https://github.com/graphql-hive/gateway/pull/792)
  [`9c2f323`](https://github.com/graphql-hive/gateway/commit/9c2f323ece47d9c0ef8f4e44050390096ceac17f)
  Thanks [@ardatan](https://github.com/ardatan)! - Ensure subgraph name is present in the upstream
  error extensions when HTTP Executor throws

### Patch Changes

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

- [#773](https://github.com/graphql-hive/gateway/pull/773)
  [`d949143`](https://github.com/graphql-hive/gateway/commit/d94914302b5b2c71b1c95df5145326fba89b023c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Removed dependency
    [`extract-files@^11.0.0` ↗︎](https://www.npmjs.com/package/extract-files/v/11.0.0) (from
    `dependencies`)

- [#791](https://github.com/graphql-hive/gateway/pull/791)
  [`661b103`](https://github.com/graphql-hive/gateway/commit/661b103a7b9586641e69b78cbaad516e550e7192)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `dependencies`)

- Updated dependencies
  [[`e393337`](https://github.com/graphql-hive/gateway/commit/e393337ecb40beffb79748b19b5aa8f2fd9197b7)]:
  - @graphql-tools/executor-common@0.0.4

## 1.2.8

### Patch Changes

- [#696](https://github.com/graphql-hive/gateway/pull/696)
  [`a289faa`](https://github.com/graphql-hive/gateway/commit/a289faae1469eb46f1458be341d21909fe5f8f8f)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.4)
    (from `^0.10.1`, in `dependencies`)

- [#709](https://github.com/graphql-hive/gateway/pull/709)
  [`20d275c`](https://github.com/graphql-hive/gateway/commit/20d275cd1badf76665874492d4550a7732b46f62)
  Thanks [@renovate](https://github.com/apps/renovate)! - Subscription cancellation fix for Bun

- Updated dependencies
  [[`a289faa`](https://github.com/graphql-hive/gateway/commit/a289faae1469eb46f1458be341d21909fe5f8f8f)]:
  - @graphql-tools/executor-common@0.0.3

## 1.2.7

### Patch Changes

- [#620](https://github.com/graphql-hive/gateway/pull/620)
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.1)
    (from `^10.7.0`, in `dependencies`)

- Updated dependencies
  [[`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)]:
  - @graphql-tools/executor-common@0.0.2

## 1.2.6

### Patch Changes

- [#598](https://github.com/graphql-hive/gateway/pull/598)
  [`8c80ac9`](https://github.com/graphql-hive/gateway/commit/8c80ac98cd5afd7c063945f4704fe4866622c5d7)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency
    [`@graphql-hive/gateway-abort-signal-any@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-hive/gateway-abort-signal-any/v/workspace:^)
    (from `dependencies`)

- [#598](https://github.com/graphql-hive/gateway/pull/598)
  [`8c80ac9`](https://github.com/graphql-hive/gateway/commit/8c80ac98cd5afd7c063945f4704fe4866622c5d7)
  Thanks [@ardatan](https://github.com/ardatan)! - Use native AbortSignal, AbortController APIs
  instead of custom ones

## 1.2.5

### Patch Changes

- [#420](https://github.com/graphql-hive/gateway/pull/420)
  [`14152f7`](https://github.com/graphql-hive/gateway/commit/14152f70d91572c0e60ba15ddeb2ffd0b41c9e92)
  Thanks [@ardatan](https://github.com/ardatan)! - - In case of schema reload, throw `SCHEMA_RELOAD`
  error while recreating the transports and executors
  - In case of shut down, throw `SHUTTING_DOWN` error while cleaning the transports and executors up

  Previously, these errors are only thrown for subscriptions not it is thrown in other type of
  operations as well. And previously the thrown errors during these two cleanup and restart process
  were cryptic, now the mentioned two errors above are thrown with more clear messages

## 1.2.4

### Patch Changes

- Updated dependencies
  [[`c60a8f4`](https://github.com/graphql-hive/gateway/commit/c60a8f446c5ca59a74a580050f5c20c0c9e61e97)]:
  - @graphql-hive/gateway-abort-signal-any@0.0.3

## 1.2.3

### Patch Changes

- [#381](https://github.com/graphql-hive/gateway/pull/381)
  [`55eb1b4`](https://github.com/graphql-hive/gateway/commit/55eb1b4d14aec7b3e6c7bcf9f596bc01192d022c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/executor-common@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-common/v/workspace:^)
    (to `dependencies`)

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
  [[`55eb1b4`](https://github.com/graphql-hive/gateway/commit/55eb1b4d14aec7b3e6c7bcf9f596bc01192d022c)]:
  - @graphql-tools/executor-common@0.0.1

## 1.2.2

### Patch Changes

- [#373](https://github.com/graphql-hive/gateway/pull/373)
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
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
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2)]:
  - @graphql-hive/gateway-abort-signal-any@0.0.2

## 1.2.1

### Patch Changes

- [#322](https://github.com/graphql-hive/gateway/pull/322)
  [`23b8987`](https://github.com/graphql-hive/gateway/commit/23b89874fcf10b4cb6b1b941f29fa5f5aecf0ef2)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-hive/gateway-abort-signal-any@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-hive/gateway-abort-signal-any/v/workspace:^)
    (to `dependencies`)

- Updated dependencies
  [[`23b8987`](https://github.com/graphql-hive/gateway/commit/23b89874fcf10b4cb6b1b941f29fa5f5aecf0ef2)]:
  - @graphql-hive/gateway-abort-signal-any@0.0.1

## 1.2.0

### Minor Changes

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

## 1.1.14

### Patch Changes

- [#291](https://github.com/graphql-hive/gateway/pull/291)
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`tslib@^2.8.1` ↗︎](https://www.npmjs.com/package/tslib/v/2.8.1) (from
    `^2.4.0`, in `dependencies`)

## 1.1.13

### Patch Changes

- [#274](https://github.com/graphql-hive/gateway/pull/274)
  [`3f1a0fa`](https://github.com/graphql-hive/gateway/commit/3f1a0fa9f1f3b91542d00a0211d7def8ef30827e)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve multipart support

## 1.1.12

### Patch Changes

- [#269](https://github.com/graphql-hive/gateway/pull/269)
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.2)
    (from `^10.6.0`, in `dependencies`)

## 1.1.11

### Patch Changes

- [#205](https://github.com/graphql-hive/gateway/pull/205)
  [`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.1)
    (from `^0.10.0`, in `dependencies`)

## 1.1.10

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
  - Added dependency
    [`@whatwg-node/disposablestack@^0.0.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.5)
    (to `dependencies`)

- [#180](https://github.com/graphql-hive/gateway/pull/180)
  [`9438e21`](https://github.com/graphql-hive/gateway/commit/9438e21982ed5c6fb18cb678b275046595ae00f5)
  Thanks [@ardatan](https://github.com/ardatan)! - Use new explicit resource management internally

- [#199](https://github.com/graphql-hive/gateway/pull/199)
  [`b534288`](https://github.com/graphql-hive/gateway/commit/b5342885f8ac1197d70cbf45266c83b720b4f85a)
  Thanks [@ardatan](https://github.com/ardatan)! - Logs are now easier to read, bigger results not
  do not create bigger outputs but instead they are all logged in a single line

- [#98](https://github.com/graphql-hive/gateway/pull/98)
  [`697308d`](https://github.com/graphql-hive/gateway/commit/697308df3b2dd96f28dc65a5f5361a911077e022)
  Thanks [@ardatan](https://github.com/ardatan)! - Bun support by using native Bun API whenever
  possible

## 1.1.9

### Patch Changes

- Updated dependencies
  [[`dc5043b`](https://github.com/ardatan/graphql-tools/commit/dc5043bb7c9afaca907c242eb6bf65e8019d79c4)]:
  - @graphql-tools/utils@10.5.6

## 1.1.8

### Patch Changes

- [#6663](https://github.com/ardatan/graphql-tools/pull/6663)
  [`d06afe3`](https://github.com/ardatan/graphql-tools/commit/d06afe3065edb15f4c58c1c155a230d8d542669f)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.0)
    (from `^0.9.0`, in `dependencies`)

- [#6658](https://github.com/ardatan/graphql-tools/pull/6658)
  [`04d5cd7`](https://github.com/ardatan/graphql-tools/commit/04d5cd785be759f0327586a75b9a6ef70cbacf95)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Cancel SSE stream even while waiting for next
  event

## 1.1.7

### Patch Changes

- Updated dependencies
  [[`cf2ce5e`](https://github.com/ardatan/graphql-tools/commit/cf2ce5ed4773087cc324599f2812f4fb91398b21)]:
  - @graphql-tools/utils@10.5.5

## 1.1.6

### Patch Changes

- [`f9dd3d6`](https://github.com/ardatan/graphql-tools/commit/f9dd3d6bb4b160e35a7f2f3c6b31171b71f21040)
  Thanks [@ardatan](https://github.com/ardatan)! - Details in the extensions when an unexpected
  error occurs;

  ```json
  {
    "request": {
      "url": "https://api.example.com/graphql",
      "method": "POST",
      "body": {
        "query": "query { hello }"
      }
    },
    "response": {
      "status": 500,
      "statusText": "Internal Server Error",
      "headers": {
        "content-type": "application/json"
      },
      "body": {
        "errors": [
          {
            "message": "Internal Server Error"
          }
        ]
      }
    }
  }
  ```

## 1.1.5

### Patch Changes

- [#6354](https://github.com/ardatan/graphql-tools/pull/6354)
  [`97c88a0`](https://github.com/ardatan/graphql-tools/commit/97c88a0844eff2ace5914b8e18a2d32dc5b8c265)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Handle AggregateErrors by expanding them to
  result errors

## 1.1.4

### Patch Changes

- [#6343](https://github.com/ardatan/graphql-tools/pull/6343)
  [`bec6eac`](https://github.com/ardatan/graphql-tools/commit/bec6eace6f7514c5488f832d67664d9b9df16c16)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.3.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.3.2)
    (from `^10.3.1`, in `dependencies`)

## 1.1.3

### Patch Changes

- [#6332](https://github.com/ardatan/graphql-tools/pull/6332)
  [`7be6930`](https://github.com/ardatan/graphql-tools/commit/7be69305bb5f9e38c96c8372ac467aa43585da54)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Strip ignored characters when printing
  a query in executor-http

- Updated dependencies
  [[`a276ba8`](https://github.com/ardatan/graphql-tools/commit/a276ba83cf7e2aa1c0f81454591a794d6efb8c2a)]:
  - @graphql-tools/utils@10.3.2

## 1.1.2

### Patch Changes

- [#6325](https://github.com/ardatan/graphql-tools/pull/6325)
  [`9792e80`](https://github.com/ardatan/graphql-tools/commit/9792e80fdd6ecbe57541324282dd06573ce5bc77)
  Thanks [@ardatan](https://github.com/ardatan)! - Make the executor disposable optional

- Updated dependencies
  [[`9792e80`](https://github.com/ardatan/graphql-tools/commit/9792e80fdd6ecbe57541324282dd06573ce5bc77)]:
  - @graphql-tools/utils@10.3.1

## 1.1.1

### Patch Changes

- [#6299](https://github.com/ardatan/graphql-tools/pull/6299)
  [`b0ffac8`](https://github.com/ardatan/graphql-tools/commit/b0ffac8ed2e0d5ac8bb304dc575184cb9073ebfc)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - When proxying the requests to the HTTP
  executor, it should return \`GraphQLError\` instances in \`errors\` array

- [`46eab79`](https://github.com/ardatan/graphql-tools/commit/46eab79e5b409d99482eb7f3a2b69a77dc3bc162)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixed potential leak on executor disposal

## 1.1.0

### Minor Changes

- [#6323](https://github.com/ardatan/graphql-tools/pull/6323)
  [`cacf20f`](https://github.com/ardatan/graphql-tools/commit/cacf20f8dbe4ec5dce0d5fd87e37cf69ef9b177e)
  Thanks [@ardatan](https://github.com/ardatan)! - Implement Symbol.dispose or Symbol.asyncDispose
  to make \`Executor\`s \`Disposable\`

### Patch Changes

- Updated dependencies
  [[`cacf20f`](https://github.com/ardatan/graphql-tools/commit/cacf20f8dbe4ec5dce0d5fd87e37cf69ef9b177e)]:
  - @graphql-tools/utils@10.3.0

## 1.0.9

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.2`, in `dependencies`)

## 1.0.8

### Patch Changes

- [#5902](https://github.com/ardatan/graphql-tools/pull/5902)
  [`9d18cce`](https://github.com/ardatan/graphql-tools/commit/9d18ccedac0a288080cbe1c9323ed838cbc4174e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Error when both data and errors fields are
  empty

## 1.0.7

### Patch Changes

- [#5825](https://github.com/ardatan/graphql-tools/pull/5825)
  [`12b578e`](https://github.com/ardatan/graphql-tools/commit/12b578e260c3011346d4af1cf71abd70f40569fe)
  Thanks [@felamaslen](https://github.com/felamaslen)! - Fixed http executor to allow custom
  content-type header

## 1.0.6

### Patch Changes

- [`b798b3b`](https://github.com/ardatan/graphql-tools/commit/b798b3b0a54f634bf2dd2275ef47f5263a5ce238)
  Thanks [@ardatan](https://github.com/ardatan)! - Memoize the print result automatically, and able
  to accept a custom print function

## 1.0.5

### Patch Changes

- [`a4463d3`](https://github.com/ardatan/graphql-tools/commit/a4463d3607f33b176828bc48b6895adf3120aeec)
  Thanks [@ardatan](https://github.com/ardatan)! - Remove headers from extensions in the GraphQL
  request

## 1.0.4

### Patch Changes

- [#5724](https://github.com/ardatan/graphql-tools/pull/5724)
  [`cfbd2e07`](https://github.com/ardatan/graphql-tools/commit/cfbd2e07aff0c773a2e2766ea5fd34b628e72f1f)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Handle chunked and no-space messages in SSE

## 1.0.3

### Patch Changes

- [`fb5f9ae3`](https://github.com/ardatan/graphql-tools/commit/fb5f9ae3bac4710b86bdad4a86bf7a4c7b8eb6e6)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect \`method\` for SSE subscriptions

## 1.0.2

### Patch Changes

- [`5c174cc9`](https://github.com/ardatan/graphql-tools/commit/5c174cc9aa2d3f623df084f276fe345f30e57928)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid object spread for better performance in
  Node

## 1.0.1

### Patch Changes

- [#5396](https://github.com/ardatan/graphql-tools/pull/5396)
  [`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency [`dset@^3.1.2` ↗︎](https://www.npmjs.com/package/dset/v/3.1.2) (from
    `dependencies`)

- [#5396](https://github.com/ardatan/graphql-tools/pull/5396)
  [`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c)
  Thanks [@ardatan](https://github.com/ardatan)! - Move the merging logic of incremental results to
  the utils package

- Updated dependencies
  [[`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c),
  [`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c)]:
  - @graphql-tools/utils@10.0.2

## 1.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.9.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.0) (from
    `^0.8.1`, in `dependencies`)
- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/utils@10.0.0

## 0.1.10

### Patch Changes

- [`05fd1fd4`](https://github.com/ardatan/graphql-tools/commit/05fd1fd4cc788e6ac19402d3158e3e5386a92894)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid passing sensitive data through errors

## 0.1.9

### Patch Changes

- [#5061](https://github.com/ardatan/graphql-tools/pull/5061)
  [`42c4a8da`](https://github.com/ardatan/graphql-tools/commit/42c4a8da2626bc7c39244712bb79550671b62a72)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle unexpected non-json responses

## 0.1.8

### Patch Changes

- [#5050](https://github.com/ardatan/graphql-tools/pull/5050)
  [`26f6d221`](https://github.com/ardatan/graphql-tools/commit/26f6d221daac51e8eccbba3780047cf8b8304e4e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.8.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.8.1) (from
    `^0.8.0`, in `dependencies`)

## 0.1.7

### Patch Changes

- [#5041](https://github.com/ardatan/graphql-tools/pull/5041)
  [`1b948acc`](https://github.com/ardatan/graphql-tools/commit/1b948accf76366f45f69fe212e0d600a85eb6a89)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.8.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.8.0) (from
    `^0.7.0`, in `dependencies`)

## 0.1.6

### Patch Changes

- [#5031](https://github.com/ardatan/graphql-tools/pull/5031)
  [`ab4cf86b`](https://github.com/ardatan/graphql-tools/commit/ab4cf86bf1330deacd95ecea2fcca54dd6590da1)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.7.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.7.0) (from
    `^0.6.9`, in `dependencies`)

## 0.1.5

### Patch Changes

- [#5025](https://github.com/ardatan/graphql-tools/pull/5025)
  [`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^9.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.2.0)
    (from `9.2.0`, in `dependencies`)
  - Updated dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `1.0.12`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/fetch@^0.6.9` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.9) (from
    `0.6.5`, in `dependencies`)
  - Updated dependency
    [`@repeaterjs/repeater@^3.0.4` ↗︎](https://www.npmjs.com/package/@repeaterjs/repeater/v/3.0.4)
    (from `3.0.4`, in `dependencies`)
  - Updated dependency [`dset@^3.1.2` ↗︎](https://www.npmjs.com/package/dset/v/3.1.2) (from `3.1.2`,
    in `dependencies`)
  - Updated dependency [`meros@^1.2.1` ↗︎](https://www.npmjs.com/package/meros/v/1.2.1) (from
    `1.2.1`, in `dependencies`)
- Updated dependencies
  [[`b5c8f640`](https://github.com/ardatan/graphql-tools/commit/b5c8f6407b74466ed0d2989000458cb59239e9af)]:
  - @graphql-tools/utils@9.2.1

## 0.1.4

### Patch Changes

- Updated dependencies
  [[`a94217e9`](https://github.com/ardatan/graphql-tools/commit/a94217e920c5d6237471ab6ad4d96cf230984177),
  [`62d074be`](https://github.com/ardatan/graphql-tools/commit/62d074be48779b1e096e056ca1233822c421dc99)]:
  - @graphql-tools/utils@9.2.0

## 0.1.3

### Patch Changes

- [`cecf4c90`](https://github.com/ardatan/graphql-tools/commit/cecf4c90dc6b0cef51bc8ef7a54205455f4d94e4)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix fetch signature

## 0.1.2

### Patch Changes

- [#5008](https://github.com/ardatan/graphql-tools/pull/5008)
  [`034b868f`](https://github.com/ardatan/graphql-tools/commit/034b868f0121de122155a5432eb5d42081493db3)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.6.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.5) (from
    `0.6.2`, in `dependencies`)

## 0.1.1

### Patch Changes

- [#4968](https://github.com/ardatan/graphql-tools/pull/4968)
  [`d9bcb5b6`](https://github.com/ardatan/graphql-tools/commit/d9bcb5b642d7e9724cc1cc6499cf6cdcfd42c102)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.6.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.2) (from
    `0.6.1`, in `dependencies`)

## 0.1.0

### Minor Changes

- [#4963](https://github.com/ardatan/graphql-tools/pull/4963)
  [`be24e9ef`](https://github.com/ardatan/graphql-tools/commit/be24e9efaaf0f159e32d8f6271275df202240ad5)
  Thanks [@ardatan](https://github.com/ardatan)! - Support factory function for headers

### Patch Changes

- [#4963](https://github.com/ardatan/graphql-tools/pull/4963)
  [`be24e9ef`](https://github.com/ardatan/graphql-tools/commit/be24e9efaaf0f159e32d8f6271275df202240ad5)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix signature of default http executor

## 0.0.9

### Patch Changes

- [#4941](https://github.com/ardatan/graphql-tools/pull/4941)
  [`0e5d250c`](https://github.com/ardatan/graphql-tools/commit/0e5d250cbac7ab003c45020b5ea464a8924eed01)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.6.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.1) (from
    `0.5.4`, in `dependencies`)

- [#4943](https://github.com/ardatan/graphql-tools/pull/4943)
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`value-or-promise@1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `1.0.11`, in `dependencies`)
- Updated dependencies
  [[`e3ec35ed`](https://github.com/ardatan/graphql-tools/commit/e3ec35ed27d4a329739c8da6be06ce74c8f25591)]:
  - @graphql-tools/utils@9.1.4

## 0.0.8

### Patch Changes

- [#4934](https://github.com/ardatan/graphql-tools/pull/4934)
  [`d0383dd6`](https://github.com/ardatan/graphql-tools/commit/d0383dd664e74e653bd933b5e4aefd3ea77b5a52)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.5.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.5.4) (from
    `0.5.3`, in `dependencies`)

## 0.0.7

### Patch Changes

- [#4885](https://github.com/ardatan/graphql-tools/pull/4885)
  [`969e264d`](https://github.com/ardatan/graphql-tools/commit/969e264df43bab2a7d0d21c09cb3d73c938b0895)
  Thanks [@paales](https://github.com/paales)! - useGETForQueries was also activating GET for
  mutations

## 0.0.6

### Patch Changes

- [#4887](https://github.com/ardatan/graphql-tools/pull/4887)
  [`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix leak on Node 14 and add cancellation to async
  iterables correctly

- Updated dependencies
  [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3

## 0.0.5

### Patch Changes

- Updated dependencies
  [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b)]:
  - @graphql-tools/utils@9.1.2

## 0.0.4

### Patch Changes

- [#4839](https://github.com/ardatan/graphql-tools/pull/4839)
  [`92dd4714`](https://github.com/ardatan/graphql-tools/commit/92dd4714acc3881f0bccf5734339c4f34f9fe2d4)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.5.3` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.5.3) (from
    `0.5.1`, in `dependencies`)

## 0.0.3

### Patch Changes

- Updated dependencies
  [[`7411a5e7`](https://github.com/ardatan/graphql-tools/commit/7411a5e71a8138d9ccfe907b1fb01e62fcbb0cdb)]:
  - @graphql-tools/utils@9.1.1

## 0.0.2

### Patch Changes

- [`e2fc041e`](https://github.com/ardatan/graphql-tools/commit/e2fc041e6f751c70efc20e8a02cbf88da0b905d2)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve typings

## 0.0.1

### Patch Changes

- [#4829](https://github.com/ardatan/graphql-tools/pull/4829)
  [`61812ccb`](https://github.com/ardatan/graphql-tools/commit/61812ccb97d6e179e74d72661dd0736f6ca0a7ff)
  Thanks [@ardatan](https://github.com/ardatan)! - Break down UrlLoader into different pieces
