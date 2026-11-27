# @graphql-tools/federation

## 6.0.0

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

- [#9860](https://github.com/ardatan/graphql-mesh/pull/9860)
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc)
  Thanks [@ardatan](https://github.com/ardatan)! - Source of these packages moved from
  `graphql-hive/gateway` into this repo. npm names and import paths are unchanged. Hive Gateway will
  consume published versions from Mesh after cutover. Package-level federation benches live under
  `bench/federation`; Gateway e2e memtest/bench CI stays on the Gateway repo and continues to
  measure Gateway impact.

- Updated dependencies
  [[`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`31a23d2`](https://github.com/ardatan/graphql-mesh/commit/31a23d2c4e2f22cd9a5bcbab93bb768e9da8f67b),
  [`c36d9b8`](https://github.com/ardatan/graphql-mesh/commit/c36d9b8930c971558cd7471c67edf0b3783d808c),
  [`c36d9b8`](https://github.com/ardatan/graphql-mesh/commit/c36d9b8930c971558cd7471c67edf0b3783d808c),
  [`4be0ced`](https://github.com/ardatan/graphql-mesh/commit/4be0cedc3d15c6cdd8db91334f9edfee2c99783e),
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc)]:
  - @graphql-tools/delegate@14.0.0
  - @graphql-tools/executor-http@4.0.1
  - @graphql-tools/stitch@12.0.0
  - @graphql-tools/wrap@13.0.0

## 5.0.0

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
  [[`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`4eb4a6c`](https://github.com/graphql-hive/gateway/commit/4eb4a6c89176a04a38ced9cd99608e6c639fd5ee),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)]:
  - @graphql-tools/stitch@11.0.0
  - @graphql-tools/delegate@13.0.0
  - @graphql-tools/executor-http@4.0.0
  - @graphql-tools/wrap@12.0.0

## 4.6.7

### Patch Changes

- Updated dependencies
  [[`a0bd5e8`](https://github.com/graphql-hive/gateway/commit/a0bd5e8882d04c1211c244adc991e62bb4e5c369)]:
  - @graphql-tools/delegate@12.3.6
  - @graphql-tools/stitch@10.4.6
  - @graphql-tools/wrap@11.2.8

## 4.6.6

### Patch Changes

- Updated dependencies
  [[`b180423`](https://github.com/graphql-hive/gateway/commit/b1804230911a8cd047ee0953304469ff4cb6b131),
  [`ad89e84`](https://github.com/graphql-hive/gateway/commit/ad89e8443b1839e79fa6c34a0347a2f3c67d3ec2),
  [`ad89e84`](https://github.com/graphql-hive/gateway/commit/ad89e8443b1839e79fa6c34a0347a2f3c67d3ec2),
  [`ad89e84`](https://github.com/graphql-hive/gateway/commit/ad89e8443b1839e79fa6c34a0347a2f3c67d3ec2)]:
  - @graphql-tools/delegate@12.3.5
  - @graphql-tools/stitch@10.4.5
  - @graphql-tools/wrap@11.2.7

## 4.6.5

### Patch Changes

- Updated dependencies
  [[`3e0a896`](https://github.com/graphql-hive/gateway/commit/3e0a896cf110d8a6290e20b10b6865813301f5ca)]:
  - @graphql-tools/delegate@12.3.4
  - @graphql-tools/executor-http@3.6.2
  - @graphql-tools/stitch@10.4.4
  - @graphql-tools/wrap@11.2.6

## 4.6.4

### Patch Changes

- [`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^12.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.1.0)
    (from `^12.0.1`, in `dependencies`)

- Updated dependencies
  [[`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)]:
  - @graphql-tools/delegate@12.3.3
  - @graphql-tools/executor-http@3.6.1
  - @graphql-tools/stitch@10.4.3
  - @graphql-tools/wrap@11.2.5

## 4.6.3

### Patch Changes

- Updated dependencies
  [[`cc5870d`](https://github.com/graphql-hive/gateway/commit/cc5870de856effe1e277b79ee2cd87bd046179a2)]:
  - @graphql-tools/executor-http@3.6.0

## 4.6.2

### Patch Changes

- Updated dependencies
  [[`4a2d3b6`](https://github.com/graphql-hive/gateway/commit/4a2d3b6a4e34cbe984ce7e36fd3306d907fb29d1)]:
  - @graphql-tools/executor-http@3.5.1
  - @graphql-tools/delegate@12.3.2
  - @graphql-tools/stitch@10.4.2
  - @graphql-tools/wrap@11.2.4

## 4.6.1

### Patch Changes

- Updated dependencies
  [[`aabe28a`](https://github.com/graphql-hive/gateway/commit/aabe28a87cc4e85f590bbf4340a9c8700d544223),
  [`a558eea`](https://github.com/graphql-hive/gateway/commit/a558eeae3c94deb60d40f98232b9d4d82ae9d9a1)]:
  - @graphql-tools/delegate@12.3.1
  - @graphql-tools/stitch@10.4.1
  - @graphql-tools/wrap@11.2.3

## 4.6.0

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
  [[`127576a`](https://github.com/graphql-hive/gateway/commit/127576a9e823cd2425c69432166a175464882b7f),
  [`befdb8e`](https://github.com/graphql-hive/gateway/commit/befdb8e3e352650c9f6c4e5fbeadfcf3615ee6ae),
  [`cd30482`](https://github.com/graphql-hive/gateway/commit/cd30482174173564e7a292f36b8dd12cc7cfab59),
  [`cd30482`](https://github.com/graphql-hive/gateway/commit/cd30482174173564e7a292f36b8dd12cc7cfab59),
  [`cd30482`](https://github.com/graphql-hive/gateway/commit/cd30482174173564e7a292f36b8dd12cc7cfab59)]:
  - @graphql-tools/delegate@12.3.0
  - @graphql-tools/stitch@10.4.0
  - @graphql-tools/executor-http@3.5.0
  - @graphql-tools/wrap@11.2.2

## 4.5.3

### Patch Changes

- Updated dependencies
  [[`abf4091`](https://github.com/graphql-hive/gateway/commit/abf40919725f57d81ede935bee27a7b408e7d99b)]:
  - @graphql-tools/delegate@12.2.1
  - @graphql-tools/stitch@10.3.2
  - @graphql-tools/wrap@11.2.1

## 4.5.2

### Patch Changes

- Updated dependencies
  [[`8f582af`](https://github.com/graphql-hive/gateway/commit/8f582af7e2cd250d9538495487c33a64b038bcb4)]:
  - @graphql-tools/stitch@10.3.1

## 4.5.1

### Patch Changes

- Updated dependencies
  [[`47fe3d6`](https://github.com/graphql-hive/gateway/commit/47fe3d6846f3c6227985168cac6bb2d5f1db91cc)]:
  - @graphql-tools/executor-http@3.4.1

## 4.5.0

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
    [`@graphql-tools/schema@^10.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.1.1)
    (from `^10.0.29`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^12.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.0.1)
    (from `^11.0.0`, in `dependencies`)

- Updated dependencies
  [[`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830)]:
  - @graphql-tools/delegate@12.2.0
  - @graphql-tools/executor-http@3.4.0
  - @graphql-tools/stitch@10.3.0
  - @graphql-tools/wrap@11.2.0

## 4.4.15

### Patch Changes

- [#2600](https://github.com/graphql-hive/gateway/pull/2600)
  [`e5ea5f4`](https://github.com/graphql-hive/gateway/commit/e5ea5f419bb27abe24e6962f07fd98fb886464f7)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Drop prototype polluting keys from subgraph
  results before merging them

  Response keys named `__proto__`, `constructor` or `prototype`, which a client can produce with a
  field alias, were only filtered at the top level of a merged result. Nested occurrences were
  passed to `mergeDeep`, which walks the prototype chain and could end up writing to
  `Object.prototype` or `Function.prototype`.

  Such keys are now removed at every depth of a subgraph result before it takes part in a merge, and
  `projectDataSelectionSet` no longer treats an inherited property as an already projected field.

- Updated dependencies
  [[`e5ea5f4`](https://github.com/graphql-hive/gateway/commit/e5ea5f419bb27abe24e6962f07fd98fb886464f7)]:
  - @graphql-tools/delegate@12.1.4
  - @graphql-tools/stitch@10.2.5
  - @graphql-tools/wrap@11.1.24

## 4.4.14

### Patch Changes

- [#2555](https://github.com/graphql-hive/gateway/pull/2555)
  [`eb6569b`](https://github.com/graphql-hive/gateway/commit/eb6569b3ee21bdc16c67c6d356101e66e206d520)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Flush deferred merged fields without blocking
  the initial payload

  Deferred fields on merged entity types are now delegated when their deferred resolvers run instead
  of being included in the initial delegation plan. This allows the initial payload to be delivered
  before slower merged subgraph fields resolve.

- Updated dependencies
  [[`eb6569b`](https://github.com/graphql-hive/gateway/commit/eb6569b3ee21bdc16c67c6d356101e66e206d520)]:
  - @graphql-tools/delegate@12.1.3
  - @graphql-tools/stitch@10.2.4
  - @graphql-tools/wrap@11.1.23

## 4.4.13

### Patch Changes

- Updated dependencies
  [[`af2cccb`](https://github.com/graphql-hive/gateway/commit/af2cccb7150db504ce42ab6b463166341377614f)]:
  - @graphql-tools/delegate@12.1.2
  - @graphql-tools/stitch@10.2.3
  - @graphql-tools/wrap@11.1.22

## 4.4.12

### Patch Changes

- Updated dependencies
  [[`9ff0daf`](https://github.com/graphql-hive/gateway/commit/9ff0dafdfaa1db829dbde2c28e98c78e47fc7b24)]:
  - @graphql-tools/delegate@12.1.1
  - @graphql-tools/stitch@10.2.2
  - @graphql-tools/wrap@11.1.21

## 4.4.11

### Patch Changes

- Updated dependencies
  [[`a589a2d`](https://github.com/graphql-hive/gateway/commit/a589a2d9797e67623b28439d0bd30a17e3a247d6)]:
  - @graphql-tools/stitch@10.2.1

## 4.4.10

### Patch Changes

- Updated dependencies
  [[`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc),
  [`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc),
  [`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc)]:
  - @graphql-tools/delegate@12.1.0
  - @graphql-tools/stitch@10.2.0
  - @graphql-tools/wrap@11.1.20

## 4.4.9

### Patch Changes

- Updated dependencies
  [[`8a08de3`](https://github.com/graphql-hive/gateway/commit/8a08de36be598f975ba500a28a9bd9710ead2d66),
  [`65ce370`](https://github.com/graphql-hive/gateway/commit/65ce3702231068c946d4f95147b556cab57ad28c)]:
  - @graphql-tools/delegate@12.0.20
  - @graphql-tools/stitch@10.1.25
  - @graphql-tools/wrap@11.1.19

## 4.4.8

### Patch Changes

- [#2351](https://github.com/graphql-hive/gateway/pull/2351)
  [`0bbdbbc`](https://github.com/graphql-hive/gateway/commit/0bbdbbc22b75d9705a77f96144af002c796a695d)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix `@provides` so the gateway only requests the
  provided fields the client actually selected, and stops delegating to the owner subgraph when
  `@provides` already covers the request.

  Previously, when a subgraph declared `@provides(fields: "...")` on a field, the gateway would
  still:

  1. Forward **every** field listed in `@provides` to that subgraph, even when the client never
     asked for them.
  2. After receiving the response, plan additional delegations to the owner subgraph for
     `@provides`-covered fields whenever the providing subgraph declared them as `@external`, even
     though the data was already returned.

  For example with:

  ```graphql
  # subgraph B (provider)
  type Query {
    entity: Entity @provides(fields: "name description")
  }

  type Entity @key(fields: "id") {
    id: ID!
    name: String! @external
    description: String! @external
  }
  ```

  a client query of `{ entity { id name } }` would still cause the gateway to ask subgraph B for
  `description` _and_ fetch `name` again from subgraph A (the owner of `Entity`).

  After this fix:

  - Only the `@provides` fields the client actually selected are forwarded to the providing subgraph
    (request side).
  - The delegation planner now recognises `@provides` declarations at every nested level (e.g.
    `@provides(fields: "nested { nestedNested { name description } }")`) and `@provides`
    declarations made via inline fragments on union/interface members (e.g.
    `@provides(fields: "... on Book { title }")`), so the gateway no longer round-trips to the owner
    subgraph for fields that the providing subgraph has already returned.
  - Fragment spreads in the client query are correctly handled when selecting nested
    `@provides`-covered fields. Previously, using a fragment spread (e.g. `...MyFrag`) for nested
    `@external` fields could cause an unnecessary delegation to the owner because selection
    subtraction compared only the spread name with the explicit `@provides` fields. The planner now
    resolves fragment spreads before subtracting provided selections, while preserving the fragment
    type condition and directives when only part of a fragment remains.

  Aliases, direct field selections, fragments, fragment spreads, `@include`/`@skip` directives
  wrapping a `@provides` field, and nested `@provides` selections are preserved without unnecessary
  owner delegations.

- Updated dependencies
  [[`0bbdbbc`](https://github.com/graphql-hive/gateway/commit/0bbdbbc22b75d9705a77f96144af002c796a695d)]:
  - @graphql-tools/delegate@12.0.19
  - @graphql-tools/stitch@10.1.24
  - @graphql-tools/wrap@11.1.18

## 4.4.7

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@12.0.18
  - @graphql-tools/stitch@10.1.23
  - @graphql-tools/wrap@11.1.17

## 4.4.6

### Patch Changes

- Updated dependencies
  [[`83465de`](https://github.com/graphql-hive/gateway/commit/83465def4d854d1f0912f635bd9621433fd33c8b)]:
  - @graphql-tools/stitch@10.1.22

## 4.4.5

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/stitch@10.1.21

## 4.4.4

### Patch Changes

- Updated dependencies
  [[`3e774e0`](https://github.com/graphql-hive/gateway/commit/3e774e050bc2d3c33e0f36a258ab6a8d94bf0750)]:
  - @graphql-tools/delegate@12.0.17
  - @graphql-tools/stitch@10.1.20
  - @graphql-tools/wrap@11.1.16

## 4.4.3

### Patch Changes

- [#2346](https://github.com/graphql-hive/gateway/pull/2346)
  [`eeebc74`](https://github.com/graphql-hive/gateway/commit/eeebc74a1619f5f0ccc339dd3e4429c8976bdd39)
  Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - Fix `@requires` argument
  conflict when multiple computed fields in a federation subgraph require the same external field
  with different argument values (e.g. `price(currency: "USD")` vs `price(currency: "EUR")`).

  Previously, all `@requires` selections for computed fields in a subgraph were merged into a single
  entity representation. When two computed fields needed the same external field but with different
  argument values, the stitching engine would alias each field differently — but both aliases ended
  up in the same representation object. The second field would overwrite the first, so one of the
  computed fields would always receive the wrong value.

  **What changed:**

  - **Computed field conflict detection** — when building subschema merge configs from the
    supergraph SDL, the federation stitching layer now detects conflicts: two computed fields
    conflict when they produce the same top-level aliased field name in their `@requires` selections
    but with different aliases (i.e. the same external field required with different argument
    values).

  - **Conflict group isolation** — conflicting computed fields are separated into independent
    "conflict groups". Each group gets its own `SubschemaConfig` (sharing the same underlying
    executor/endpoint) with only its own computed fields and a deduplicated entity representation
    that carries only the aliased fields it actually needs. This ensures each group sends the
    correct representation to the subgraph and receives the right data back.

  - **Schema scoping per group** — the main `SubschemaConfig`'s schema is filtered (via `mapSchema`)
    to remove computed fields that were moved to a conflict group, preventing the stitching engine
    from incorrectly routing those fields back to the main subschema. Each conflict group's
    `SubschemaConfig` is likewise scoped to expose only its own computed fields.

  - **`getMergedTypeConfigFromKey` extended** — accepts an optional `keysExtraKeys` parameter so
    each conflict group can inject its own `extraKeys` set when building entity key functions,
    keeping key generation independent per group.

  - **Federation audit test enabled** — the `requires-with-argument-conflict` case in the federation
    compatibility test suite was previously skipped for stitching (marked `it.todo`). It now passes
    and the skip has been removed.

## 4.4.2

### Patch Changes

- Updated dependencies
  [[`0f8706c`](https://github.com/graphql-hive/gateway/commit/0f8706c54556669148de1bf74725cc8c896e5ced)]:
  - @graphql-tools/executor-http@3.3.0

## 4.4.1

### Patch Changes

- Updated dependencies
  [[`deafdc0`](https://github.com/graphql-hive/gateway/commit/deafdc00e388ed195c2cdf77e98cd19e7d496d48)]:
  - @graphql-tools/delegate@12.0.16
  - @graphql-tools/stitch@10.1.19
  - @graphql-tools/wrap@11.1.15

## 4.4.0

### Minor Changes

- [#2281](https://github.com/graphql-hive/gateway/pull/2281)
  [`4db5afa`](https://github.com/graphql-hive/gateway/commit/4db5afadfc3703d7f0228140f5297ed1c99df967)
  Thanks [@ardatan](https://github.com/ardatan)! - Support aliases in directive imports correctly
  specifically for `@source` of Mesh to distinguish it from Apollo's connector `@source` directive.

- [#2294](https://github.com/graphql-hive/gateway/pull/2294)
  [`8ffdc33`](https://github.com/graphql-hive/gateway/commit/8ffdc3360ca3e9274625c50b2fb1d41d307ecc70)
  Thanks [@ardatan](https://github.com/ardatan)! - Support `@join__directive` while extracting
  subgraph definitions from the supergraph

  For example;

  ```graphql
  type Query @join__type(graph: PRODUCTS) {
    products: [Product]
      @join__field(graph: PRODUCTS)
      @join__directive(
        graphs: [PRODUCTS]
        name: "connect"
        args: {
          source: "ecomm"
          http: { GET: "/products" }
          selection: "$.products {\n  id\n  name\n  description\n}"
        }
      )
  }
  ```

  should extract `products` subgraph as;

  ```graphql
  type Query {
      products: @connect(
        source: "ecomm"
        http: { GET: "/products" }
        selection: """
        $.products {
          id
          name
          description
        }
        """
      )
  }
  ```

  Same goes to the schema definition level directives;

  ```graphql
  schema
    @join__directive(
      graphs: [PRODUCTS]
      name: "link"
      args: { url: "https://specs.apollo.dev/connect/v0.2", import: ["@connect", "@source"] }
    )
    @join__directive(
      graphs: [PRODUCTS]
      name: "source"
      args: {
        name: "ecomm"
        http: { baseURL: "https://ecommerce.demo-api.apollo.dev/", headers: [] }
      }
    ) {
    query: Query
  }
  ```

  should be extracted as;

  ```graphql
  extend schema
    @link(url: "https://specs.apollo.dev/connect/v0.2", import: ["@connect", "@source"]) # Enable this schema to use Apollo Connectors
    @source(
      name: "ecomm"
      # A @source directive defines a shared data source for multiple Connectors.
      http: {
        baseURL: "https://ecommerce.demo-api.apollo.dev/"
        headers: [
          # If your API requires headers, add them here and in your router.yaml file.
          # Example:
          # { name: "name", value: "{$config.apiKey}" }
        ]
      }
    )
  ```

## 4.3.7

### Patch Changes

- Updated dependencies
  [[`dff525f`](https://github.com/graphql-hive/gateway/commit/dff525f214d3525434c5a73a5b3fb22c46550163)]:
  - @graphql-tools/delegate@12.0.14
  - @graphql-tools/stitch@10.1.18
  - @graphql-tools/wrap@11.1.14

## 4.3.6

### Patch Changes

- Updated dependencies
  [[`786e06f`](https://github.com/graphql-hive/gateway/commit/786e06f4e3d74c76a7274bbbc69100a7d30549e6)]:
  - @graphql-tools/executor-http@3.2.1

## 4.3.5

### Patch Changes

- Updated dependencies
  [[`59ef8f7`](https://github.com/graphql-hive/gateway/commit/59ef8f733d4fced3416bc95d323f00fb46e69b95)]:
  - @graphql-tools/executor-http@3.2.0
  - @graphql-tools/delegate@12.0.13
  - @graphql-tools/stitch@10.1.17
  - @graphql-tools/wrap@11.1.13

## 4.3.4

### Patch Changes

- Updated dependencies
  [[`f9d2f0e`](https://github.com/graphql-hive/gateway/commit/f9d2f0ea9e7f172b8270c17961a98bc52a7ba49d)]:
  - @graphql-tools/executor-http@3.1.4

## 4.3.3

### Patch Changes

- Updated dependencies
  [[`323626f`](https://github.com/graphql-hive/gateway/commit/323626ff877f50e509e45cc56ce82602d5118a1d)]:
  - @graphql-tools/executor-http@3.1.3

## 4.3.2

### Patch Changes

- Updated dependencies
  [[`f85a9fe`](https://github.com/graphql-hive/gateway/commit/f85a9fe11dc88a7fa8397c5372ef24f9e91b638e)]:
  - @graphql-tools/executor-http@3.1.2

## 4.3.1

### Patch Changes

- [#2106](https://github.com/graphql-hive/gateway/pull/2106)
  [`da68d27`](https://github.com/graphql-hive/gateway/commit/da68d2710dff1f8bca5b17bcd5368e631f72114e)
  Thanks [@ardatan](https://github.com/ardatan)! - - Optimizations to select ONLY required fields
  when fetching the missing fields from other subgraphs
  - Do not try to resolve types from the subschemas which only have the stub types, for example if a
    subgraph only has `id` field as a stub, do not use that subgraph as a target subgraph for
    resolving the type, because it will not have any other fields than `id`.
- Updated dependencies
  [[`da68d27`](https://github.com/graphql-hive/gateway/commit/da68d2710dff1f8bca5b17bcd5368e631f72114e)]:
  - @graphql-tools/delegate@12.0.12
  - @graphql-tools/stitch@10.1.16
  - @graphql-tools/wrap@11.1.12

## 4.3.0

### Minor Changes

- [#2096](https://github.com/graphql-hive/gateway/pull/2096)
  [`4e626d4`](https://github.com/graphql-hive/gateway/commit/4e626d4cd2f1a6050a30b1219f5b5408ff56b3a6)
  Thanks [@ardatan](https://github.com/ardatan)! - Progressive Override Support in Rust QP Runtime

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@12.0.11
  - @graphql-tools/stitch@10.1.15
  - @graphql-tools/wrap@11.1.11

## 4.2.14

### Patch Changes

- Updated dependencies
  [[`dae3fe4`](https://github.com/graphql-hive/gateway/commit/dae3fe4fbb9c78598d1bbf91c2ed07ab1b90f05d)]:
  - @graphql-tools/executor-http@3.1.1
  - @graphql-tools/wrap@11.1.10
  - @graphql-tools/delegate@12.0.10
  - @graphql-tools/stitch@10.1.14

## 4.2.13

### Patch Changes

- Updated dependencies
  [[`43aaa6a`](https://github.com/graphql-hive/gateway/commit/43aaa6ab8c1c64cae92e9cdff7016ebdf1afa756)]:
  - @graphql-tools/delegate@12.0.9
  - @graphql-tools/stitch@10.1.13
  - @graphql-tools/wrap@11.1.9

## 4.2.12

### Patch Changes

- Updated dependencies
  [[`4065b7f`](https://github.com/graphql-hive/gateway/commit/4065b7fbb08d9e75c5f0d3b2b4d42d665aa9dbd9)]:
  - @graphql-tools/delegate@12.0.8
  - @graphql-tools/stitch@10.1.12
  - @graphql-tools/wrap@11.1.8

## 4.2.11

### Patch Changes

- Updated dependencies
  [[`584a293`](https://github.com/graphql-hive/gateway/commit/584a293e3dafa7cd2d0210f80299c81b6707bcd4)]:
  - @graphql-tools/delegate@12.0.7
  - @graphql-tools/stitch@10.1.11
  - @graphql-tools/wrap@11.1.7

## 4.2.10

### Patch Changes

- [#1916](https://github.com/graphql-hive/gateway/pull/1916)
  [`2200fc3`](https://github.com/graphql-hive/gateway/commit/2200fc3e9b94db77a642835bbf2d646c65b3e8d0)
  Thanks [@ardatan](https://github.com/ardatan)! - - Handle the type merging order correctly with
  custom labels and percentage labels for progressive override
  - Do not pass `percent(x)` labels to the progressive override handler
  - Apply progressive override to the shared root fields
- Updated dependencies
  [[`2200fc3`](https://github.com/graphql-hive/gateway/commit/2200fc3e9b94db77a642835bbf2d646c65b3e8d0)]:
  - @graphql-tools/delegate@12.0.6
  - @graphql-tools/stitch@10.1.10
  - @graphql-tools/wrap@11.1.6

## 4.2.9

### Patch Changes

- Updated dependencies
  [[`e92c5a9`](https://github.com/graphql-hive/gateway/commit/e92c5a9702a2aea395a4a4e3a482b92f528655e8)]:
  - @graphql-tools/delegate@12.0.5
  - @graphql-tools/stitch@10.1.9
  - @graphql-tools/wrap@11.1.5

## 4.2.8

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
  [`9f29d58`](https://github.com/graphql-hive/gateway/commit/9f29d587946383482ad55924fe49b9e7804f48a3)]:
  - @graphql-tools/delegate@12.0.4
  - @graphql-tools/executor-http@3.1.0
  - @graphql-tools/stitch@10.1.8
  - @graphql-tools/wrap@11.1.4

## 4.2.7

### Patch Changes

- Updated dependencies
  [[`dcd8f0e`](https://github.com/graphql-hive/gateway/commit/dcd8f0e93fd220cb99f79cadea759ea49bc15308)]:
  - @graphql-tools/delegate@12.0.3
  - @graphql-tools/stitch@10.1.7
  - @graphql-tools/wrap@11.1.3

## 4.2.6

### Patch Changes

- Updated dependencies
  [[`da8b8e3`](https://github.com/graphql-hive/gateway/commit/da8b8e3f3545487249b11c6577e3889f68527249)]:
  - @graphql-tools/delegate@12.0.2
  - @graphql-tools/stitch@10.1.6
  - @graphql-tools/wrap@11.1.2

## 4.2.5

### Patch Changes

- Updated dependencies
  [[`0d14faf`](https://github.com/graphql-hive/gateway/commit/0d14fafdbaf3fb27eef123016ef2ca977d6688d8)]:
  - @graphql-tools/delegate@12.0.1
  - @graphql-tools/stitch@10.1.5
  - @graphql-tools/wrap@11.1.1

## 4.2.4

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

## 4.2.3

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
    [`@graphql-tools/executor@^1.4.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.13)
    (from `^1.4.11`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.1.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.1.5)
    (from `^9.1.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.29` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.29)
    (from `^10.0.27`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.10.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.3)
    (from `^10.10.1`, in `dependencies`)

- Updated dependencies
  [[`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`478d7e2`](https://github.com/graphql-hive/gateway/commit/478d7e25ef47fb8fb6183010a8bb61ac31688c55),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`2993f24`](https://github.com/graphql-hive/gateway/commit/2993f24f8e46853c0d2667c0cd2bf96190f3a2b2)]:
  - @graphql-tools/delegate@11.1.3
  - @graphql-tools/executor-http@3.0.7
  - @graphql-tools/stitch@10.1.3
  - @graphql-tools/wrap@11.0.5

## 4.2.2

### Patch Changes

- [#1608](https://github.com/graphql-hive/gateway/pull/1608)
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor@^1.4.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.11)
    (from `^1.4.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.1.3)
    (from `^9.1.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.27` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.27)
    (from `^10.0.25`, in `dependencies`)
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

- [#1663](https://github.com/graphql-hive/gateway/pull/1663)
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor@^1.4.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.11)
    (from `^1.4.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.1.3)
    (from `^9.1.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.27` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.27)
    (from `^10.0.26`, in `dependencies`)

- Updated dependencies
  [[`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a),
  [`c754a96`](https://github.com/graphql-hive/gateway/commit/c754a96d49ea69f54f57a8f1b01baf9d2fb947b6)]:
  - @graphql-tools/delegate@11.1.2
  - @graphql-tools/executor-http@3.0.6
  - @graphql-tools/stitch@10.1.2
  - @graphql-tools/wrap@11.0.4

## 4.2.1

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
    [`@graphql-tools/schema@^10.0.26` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.26)
    (from `^10.0.25`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.0)
    (from `^10.9.1`, in `dependencies`)

- Updated dependencies
  [[`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`3226919`](https://github.com/graphql-hive/gateway/commit/3226919d58930289491696fa3b56ed85c766e3f5)]:
  - @graphql-tools/delegate@11.1.1
  - @graphql-tools/executor-http@3.0.5
  - @graphql-tools/stitch@10.1.1
  - @graphql-tools/wrap@11.0.3

## 4.2.0

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

## 4.1.0

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

- [#1588](https://github.com/graphql-hive/gateway/pull/1588)
  [`20f7a50`](https://github.com/graphql-hive/gateway/commit/20f7a50c5ddb862c2921e91ca43d9858bae1bce8)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Correctly resolve circular @requires in
  different subgraphs

- Updated dependencies
  [[`a54b0c1`](https://github.com/graphql-hive/gateway/commit/a54b0c1777229aaeea295bcd15d4f4d6e4e615f7),
  [`058ef2f`](https://github.com/graphql-hive/gateway/commit/058ef2f8373ea822fed985b705416cb39d5b6efc),
  [`a8458b2`](https://github.com/graphql-hive/gateway/commit/a8458b24e71fda37a515eaf9ac9af43a73e7823f),
  [`20f7a50`](https://github.com/graphql-hive/gateway/commit/20f7a50c5ddb862c2921e91ca43d9858bae1bce8)]:
  - @graphql-tools/delegate@11.1.0
  - @graphql-tools/stitch@10.1.0
  - @graphql-tools/wrap@11.0.2

## 4.0.5

### Patch Changes

- [#1542](https://github.com/graphql-hive/gateway/pull/1542)
  [`0a349fb`](https://github.com/graphql-hive/gateway/commit/0a349fbfd52eaf8a2b21c9669871c916d41b840f)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/fetch@^0.10.11` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.11)
    (from `^0.10.10`, in `dependencies`)

- Updated dependencies
  [[`0a349fb`](https://github.com/graphql-hive/gateway/commit/0a349fbfd52eaf8a2b21c9669871c916d41b840f),
  [`818461e`](https://github.com/graphql-hive/gateway/commit/818461e6ea55bb10ba4ead9ed214848e1ba4bfd2)]:
  - @graphql-tools/executor-http@3.0.4
  - @graphql-tools/stitch@10.0.2

## 4.0.4

### Patch Changes

- [#1533](https://github.com/graphql-hive/gateway/pull/1533)
  [`a6a3d4d`](https://github.com/graphql-hive/gateway/commit/a6a3d4d0ffba9d73a5151c747c281c25d0d26954)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix shared root handling in case of heavily
  nested selections

## 4.0.3

### Patch Changes

- [#1522](https://github.com/graphql-hive/gateway/pull/1522)
  [`e64a4e1`](https://github.com/graphql-hive/gateway/commit/e64a4e11db66be8bd9c3728eca1ac3d7d97c7d0e)
  Thanks [@ardatan](https://github.com/ardatan)! - Revert an extra memoization

- Updated dependencies []:
  - @graphql-tools/executor-http@3.0.3

## 4.0.2

### Patch Changes

- [#1473](https://github.com/graphql-hive/gateway/pull/1473)
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.2)
    (from `^1.3.0`, in `dependencies`)

- Updated dependencies
  [[`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14),
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14),
  [`fe99f74`](https://github.com/graphql-hive/gateway/commit/fe99f74dd11fdf2928ca7080d4d2e5dfd1e2f18e),
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14),
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14)]:
  - @graphql-tools/delegate@11.0.1
  - @graphql-tools/executor-http@3.0.2
  - @graphql-tools/stitch@10.0.1
  - @graphql-tools/wrap@11.0.1

## 4.0.1

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/executor-http@3.0.1

## 4.0.0

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
  [[`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)]:
  - @graphql-tools/executor-http@3.0.0
  - @graphql-tools/delegate@11.0.0
  - @graphql-tools/stitch@10.0.0
  - @graphql-tools/wrap@11.0.0

## 3.2.9

### Patch Changes

- [#1411](https://github.com/graphql-hive/gateway/pull/1411)
  [`37113d1`](https://github.com/graphql-hive/gateway/commit/37113d1a446748fd83da9823e27a0f56872317df)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/fetch@^0.10.10` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.10)
    (from `^0.10.9`, in `dependencies`)

- Updated dependencies
  [[`37113d1`](https://github.com/graphql-hive/gateway/commit/37113d1a446748fd83da9823e27a0f56872317df)]:
  - @graphql-tools/executor-http@2.1.2

## 3.2.8

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
    [`@graphql-tools/schema@^10.0.25` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.25)
    (from `^10.0.24`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.1)
    (from `^10.9.0`, in `dependencies`)

- Updated dependencies
  [[`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1),
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1),
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1),
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)]:
  - @graphql-tools/delegate@10.2.23
  - @graphql-tools/executor-http@2.1.1
  - @graphql-tools/stitch@9.4.28
  - @graphql-tools/wrap@10.1.4

## 3.2.7

### Patch Changes

- [#1318](https://github.com/graphql-hive/gateway/pull/1318)
  [`7dafdeb`](https://github.com/graphql-hive/gateway/commit/7dafdebc803e49373fe9d53997113483e512fdb0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/typed-event-target@^3.0.2` ↗︎](https://www.npmjs.com/package/@graphql-yoga/typed-event-target/v/3.0.2)
    (from `^3.0.1`, in `dependencies`)

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
    [`@graphql-tools/executor@^1.4.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.8)
    (from `^1.4.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.1.0)
    (from `^9.0.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.24` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.24)
    (from `^10.0.11`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.9.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.0)
    (from `^10.8.1`, in `dependencies`)

- [#1333](https://github.com/graphql-hive/gateway/pull/1333)
  [`ffa3753`](https://github.com/graphql-hive/gateway/commit/ffa3753ccb9045c5b2d62af05edc7f1d78336cb3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Isomorphic environment variable getter with
  truthy value parsing

- Updated dependencies
  [[`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`7287ffa`](https://github.com/graphql-hive/gateway/commit/7287ffa2ac0f08801c3058e96a7c4eba7102c1d0),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`b59a266`](https://github.com/graphql-hive/gateway/commit/b59a26628c368272b50380bab57553070e2edf6e)]:
  - @graphql-tools/delegate@10.2.22
  - @graphql-tools/executor-http@2.1.0
  - @graphql-tools/stitch@9.4.27
  - @graphql-tools/wrap@10.1.3

## 3.2.6

### Patch Changes

- Updated dependencies
  [[`b69c80b`](https://github.com/graphql-hive/gateway/commit/b69c80b259bd0565eb9826f7ee9bc8e6c32076d1)]:
  - @graphql-tools/delegate@10.2.21
  - @graphql-tools/stitch@9.4.26
  - @graphql-tools/wrap@10.1.2

## 3.2.5

### Patch Changes

- Updated dependencies
  [[`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56),
  [`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56),
  [`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56)]:
  - @graphql-tools/delegate@10.2.20
  - @graphql-tools/stitch@9.4.25
  - @graphql-tools/wrap@10.1.1

## 3.2.4

### Patch Changes

- Updated dependencies
  [[`ed323fa`](https://github.com/graphql-hive/gateway/commit/ed323fa06d196c1df128a493006238078bf69fc6)]:
  - @graphql-tools/executor-http@2.0.3

## 3.2.3

### Patch Changes

- [#1144](https://github.com/graphql-hive/gateway/pull/1144)
  [`54beb7a`](https://github.com/graphql-hive/gateway/commit/54beb7acde7558eee81ec0e20c123717865b8e18)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.8` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.8)
    (from `^0.10.6`, in `dependencies`)

- [#1187](https://github.com/graphql-hive/gateway/pull/1187)
  [`85d7c95`](https://github.com/graphql-hive/gateway/commit/85d7c95cfe90773daf7680f2308ff4f52f0f7fa9)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Handle nested keys with arguments

- [#1136](https://github.com/graphql-hive/gateway/pull/1136)
  [`511ba36`](https://github.com/graphql-hive/gateway/commit/511ba36d9c8b81f83cf4cb37c03c9fbb9c5c9c9d)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle errors on non-nullable fields in shared
  root fields correctly

- Updated dependencies
  [[`54beb7a`](https://github.com/graphql-hive/gateway/commit/54beb7acde7558eee81ec0e20c123717865b8e18),
  [`4a80de1`](https://github.com/graphql-hive/gateway/commit/4a80de1a2884dc42a5f09202b6215c3e6780efc4)]:
  - @graphql-tools/executor-http@2.0.2
  - @graphql-tools/wrap@10.1.0
  - @graphql-tools/stitch@9.4.24
  - @graphql-tools/delegate@10.2.19

## 3.2.2

### Patch Changes

- [#1117](https://github.com/graphql-hive/gateway/pull/1117)
  [`0512be3`](https://github.com/graphql-hive/gateway/commit/0512be32399268eb7926db48675ddb5763fd8578)
  Thanks [@ardatan](https://github.com/ardatan)! - Optimizes `@provides` handling by avoiding the
  generation of new query plans when a parent subgraph already supplies the requested fields.
  - Refactors and inlines `subtractSelectionSets` to compute leftover selections.
  - Threads a `providedSelectionNode` through planning to subtract out provided fields early.
  - Updates stitching and federation logic to conditionally skip planning when selections are
    already available.
- Updated dependencies
  [[`b7627d3`](https://github.com/graphql-hive/gateway/commit/b7627d3cc29e54a048085a79a07a7906f2994173),
  [`ef0e24c`](https://github.com/graphql-hive/gateway/commit/ef0e24c55ed26320d139a83b1de5b75d5c1bfe4e),
  [`0512be3`](https://github.com/graphql-hive/gateway/commit/0512be32399268eb7926db48675ddb5763fd8578),
  [`b7627d3`](https://github.com/graphql-hive/gateway/commit/b7627d3cc29e54a048085a79a07a7906f2994173)]:
  - @graphql-tools/executor-http@2.0.1
  - @graphql-tools/delegate@10.2.18
  - @graphql-tools/stitch@9.4.23
  - @graphql-tools/wrap@10.0.36

## 3.2.1

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

- Updated dependencies
  [[`da47a0e`](https://github.com/graphql-hive/gateway/commit/da47a0effcc0e3c2b934bc97ab10e6e86ef8cd93),
  [`da47a0e`](https://github.com/graphql-hive/gateway/commit/da47a0effcc0e3c2b934bc97ab10e6e86ef8cd93),
  [`9a120c8`](https://github.com/graphql-hive/gateway/commit/9a120c85ac67654f63e374cf420ac4b73da21228),
  [`4cf75cb`](https://github.com/graphql-hive/gateway/commit/4cf75cbf1f14169826d1917532ee73ee45c002d5)]:
  - @graphql-tools/executor-http@2.0.0

## 3.2.0

### Minor Changes

- [#946](https://github.com/graphql-hive/gateway/pull/946)
  [`7d771d8`](https://github.com/graphql-hive/gateway/commit/7d771d89ff6d731b1025acfc5eb197541a6d5d35)
  Thanks [@ardatan](https://github.com/ardatan)! - As Apollo suggests and uses in their
  implementation, we set the request timeout to 30 seconds for GraphOS uplinks

### Patch Changes

- [#946](https://github.com/graphql-hive/gateway/pull/946)
  [`7d771d8`](https://github.com/graphql-hive/gateway/commit/7d771d89ff6d731b1025acfc5eb197541a6d5d35)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/executor@^1.4.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.7)
    (to `dependencies`)

- [#950](https://github.com/graphql-hive/gateway/pull/950)
  [`c7ea2c5`](https://github.com/graphql-hive/gateway/commit/c7ea2c5ae71b6b338ef22edd927a3fc93803965f)
  Thanks [@kroupacz](https://github.com/kroupacz)! - Errors should not be swallowed when it is
  thrown from the shared root

- Updated dependencies
  [[`c7ea2c5`](https://github.com/graphql-hive/gateway/commit/c7ea2c5ae71b6b338ef22edd927a3fc93803965f),
  [`0af3485`](https://github.com/graphql-hive/gateway/commit/0af3485abb1b3dfba4126f09d291b2096d23aa32)]:
  - @graphql-tools/delegate@10.2.17
  - @graphql-tools/stitch@9.4.22
  - @graphql-tools/executor-http@1.3.3
  - @graphql-tools/wrap@10.0.35

## 3.1.7

### Patch Changes

- [#532](https://github.com/graphql-hive/gateway/pull/532)
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.0)
    (from `^1.2.5`, in `dependencies`)

- Updated dependencies
  [[`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04),
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04),
  [`c9cd206`](https://github.com/graphql-hive/gateway/commit/c9cd20666a740514a5c17ecd6d0c000ad0dd7106),
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04),
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04),
  [`7b86c09`](https://github.com/graphql-hive/gateway/commit/7b86c097f5d424b82c84b87c743d5ed4ebe6aa5c),
  [`dbfb0f7`](https://github.com/graphql-hive/gateway/commit/dbfb0f7d6906d99b07b959bb6254d10e2fe2adf0)]:
  - @graphql-tools/delegate@10.2.16
  - @graphql-tools/executor-http@1.3.2
  - @graphql-tools/stitch@9.4.21
  - @graphql-tools/wrap@10.0.34

## 3.1.6

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
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)]:
  - @graphql-tools/delegate@10.2.15
  - @graphql-tools/executor-http@1.3.1
  - @graphql-tools/stitch@9.4.20
  - @graphql-tools/wrap@10.0.33

## 3.1.5

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

- Updated dependencies
  [[`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`c54a080`](https://github.com/graphql-hive/gateway/commit/c54a080b8b9c477ed55dd7c23fc8fcae9139bec8),
  [`d949143`](https://github.com/graphql-hive/gateway/commit/d94914302b5b2c71b1c95df5145326fba89b023c),
  [`661b103`](https://github.com/graphql-hive/gateway/commit/661b103a7b9586641e69b78cbaad516e550e7192),
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`9c2f323`](https://github.com/graphql-hive/gateway/commit/9c2f323ece47d9c0ef8f4e44050390096ceac17f),
  [`2a54e85`](https://github.com/graphql-hive/gateway/commit/2a54e85f2848aea7525703ea33918a21db96b26b)]:
  - @graphql-tools/delegate@10.2.14
  - @graphql-tools/executor-http@1.3.0
  - @graphql-tools/stitch@9.4.19
  - @graphql-tools/wrap@10.0.32

## 3.1.4

### Patch Changes

- [#696](https://github.com/graphql-hive/gateway/pull/696)
  [`a289faa`](https://github.com/graphql-hive/gateway/commit/a289faae1469eb46f1458be341d21909fe5f8f8f)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.4)
    (from `^0.10.1`, in `dependencies`)

- Updated dependencies
  [[`a289faa`](https://github.com/graphql-hive/gateway/commit/a289faae1469eb46f1458be341d21909fe5f8f8f),
  [`20d275c`](https://github.com/graphql-hive/gateway/commit/20d275cd1badf76665874492d4550a7732b46f62)]:
  - @graphql-tools/executor-http@1.2.8

## 3.1.3

### Patch Changes

- Updated dependencies
  [[`2318393`](https://github.com/graphql-hive/gateway/commit/2318393bc7b3aca7f53806a44b59277cd176702d)]:
  - @graphql-tools/delegate@10.2.13
  - @graphql-tools/stitch@9.4.18
  - @graphql-tools/wrap@10.0.31

## 3.1.2

### Patch Changes

- [#620](https://github.com/graphql-hive/gateway/pull/620)
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.1)
    (from `^10.7.0`, in `dependencies`)

- Updated dependencies
  [[`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`7146f8d`](https://github.com/graphql-hive/gateway/commit/7146f8decca808ab2c68f4971ba9b64ca27a9b87),
  [`7146f8d`](https://github.com/graphql-hive/gateway/commit/7146f8decca808ab2c68f4971ba9b64ca27a9b87)]:
  - @graphql-tools/delegate@10.2.12
  - @graphql-tools/executor-http@1.2.7
  - @graphql-tools/stitch@9.4.17
  - @graphql-tools/wrap@10.0.30

## 3.1.1

### Patch Changes

- Updated dependencies
  [[`8c80ac9`](https://github.com/graphql-hive/gateway/commit/8c80ac98cd5afd7c063945f4704fe4866622c5d7),
  [`8c80ac9`](https://github.com/graphql-hive/gateway/commit/8c80ac98cd5afd7c063945f4704fe4866622c5d7)]:
  - @graphql-tools/executor-http@1.2.6

## 3.1.0

### Minor Changes

- [#444](https://github.com/graphql-hive/gateway/pull/444)
  [`b52c9ba`](https://github.com/graphql-hive/gateway/commit/b52c9ba47f84d0905f1f63fdfe071c891dce5b7f)
  Thanks [@ardatan](https://github.com/ardatan)! - Now `SupergraphSchemaManager` can be used in
  `ApolloServer` as `gateway`;

  ```ts
  import { ApolloServer } from '@apollo/server'
  import { SupergraphSchemaManager } from '@graphql-tools/federation'

  const gateway = new SupergraphSchemaManager()
  const apolloServer = new ApolloServer({
    gateway
  })
  ```

  And with the new `onStitchedSchema` option, you can manipulate the executable schema created from
  the supergraph. The following example demonstrates how to use `onStitchedSchema` with
  `applyMiddleware` from `graphql-middleware`:

  ```ts
  import { applyMiddleware } from 'graphql-middleware'
  import { SupergraphSchemaManager } from '@graphql-tools/federation'

  const logInput = async (resolve, root, args, context, info) => {
    console.log(`1. logInput: ${JSON.stringify(args)}`)
    const result = await resolve(root, args, context, info)
    console.log(`5. logInput`)
    return result
  }

  const logResult = async (resolve, root, args, context, info) => {
    console.log(`2. logResult`)
    const result = await resolve(root, args, context, info)
    console.log(`4. logResult: ${JSON.stringify(result)}`)
    return result
  }

  const gateway = new SupergraphSchemaManager({
    onStitchedSchema: async schema => {
      // Manipulate the schema
      return applyMiddleware(schema, logInput, logResult)
    }
  })
  ```

### Patch Changes

- [#552](https://github.com/graphql-hive/gateway/pull/552)
  [`b0bc26b`](https://github.com/graphql-hive/gateway/commit/b0bc26b8e18a2e61e5fa96f48cd77820e3598b52)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle shared subscription root fields correctly

  In case of conflicting subscription root fields coming from different subgraphs or different entry
  points(multiple keys), subscription was failing.

- Updated dependencies
  [[`9144222`](https://github.com/graphql-hive/gateway/commit/91442220b2242a0fa082d4b544d03621572eecd0)]:
  - @graphql-tools/delegate@10.2.11
  - @graphql-tools/stitch@9.4.16
  - @graphql-tools/wrap@10.0.29

## 3.0.10

### Patch Changes

- Updated dependencies
  [[`18682e6`](https://github.com/graphql-hive/gateway/commit/18682e6873091afe63f09414f02f93649a4da141),
  [`e9f78cd`](https://github.com/graphql-hive/gateway/commit/e9f78cd29681ca9b4371e12953a31d2b8f5e4c17)]:
  - @graphql-tools/delegate@10.2.10
  - @graphql-tools/wrap@10.0.28
  - @graphql-tools/stitch@9.4.15

## 3.0.9

### Patch Changes

- [#443](https://github.com/graphql-hive/gateway/pull/443)
  [`a625269`](https://github.com/graphql-hive/gateway/commit/a62526936680d030339fc26cc55d76507134b022)
  Thanks [@ardatan](https://github.com/ardatan)! - In case of shared Mutation field in different
  subgraphs, choose the best option instead of choosing the last option just like we do in Query
  root fields

- Updated dependencies
  [[`a625269`](https://github.com/graphql-hive/gateway/commit/a62526936680d030339fc26cc55d76507134b022),
  [`14152f7`](https://github.com/graphql-hive/gateway/commit/14152f70d91572c0e60ba15ddeb2ffd0b41c9e92)]:
  - @graphql-tools/stitch@9.4.14
  - @graphql-tools/executor-http@1.2.5

## 3.0.8

### Patch Changes

- [#351](https://github.com/graphql-hive/gateway/pull/351)
  [`0591aa9`](https://github.com/graphql-hive/gateway/commit/0591aa9cc9718a1c7d8b6fa68723a3155f775cc7)
  Thanks [@ardatan](https://github.com/ardatan)! - Keep the custom directives(using
  @composeDirective) from the supergraph, in the unified schema served by the gateway should keep
  it.

## 3.0.7

### Patch Changes

- [#387](https://github.com/graphql-hive/gateway/pull/387)
  [`3571399`](https://github.com/graphql-hive/gateway/commit/35713997b5330989b001c6317631621af24c404b)
  Thanks [@ardatan](https://github.com/ardatan)! - In case of shared root field on Mutation, it was
  batched incorrectly across subgraphs. But instead only one mutation should be called as mutations
  should not be parallel

- Updated dependencies []:
  - @graphql-tools/executor-http@1.2.4
  - @graphql-tools/stitch@9.4.13

## 3.0.6

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/stitch@9.4.12

## 3.0.5

### Patch Changes

- Updated dependencies
  [[`55eb1b4`](https://github.com/graphql-hive/gateway/commit/55eb1b4d14aec7b3e6c7bcf9f596bc01192d022c),
  [`55eb1b4`](https://github.com/graphql-hive/gateway/commit/55eb1b4d14aec7b3e6c7bcf9f596bc01192d022c)]:
  - @graphql-tools/executor-http@1.2.3

## 3.0.4

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
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2),
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2),
  [`15975c2`](https://github.com/graphql-hive/gateway/commit/15975c28daddbb4f31d520371f53520aecacaac7)]:
  - @graphql-tools/delegate@10.2.9
  - @graphql-tools/executor-http@1.2.2
  - @graphql-tools/stitch@9.4.11
  - @graphql-tools/wrap@10.0.27

## 3.0.3

### Patch Changes

- [#333](https://github.com/graphql-hive/gateway/pull/333)
  [`0d81307`](https://github.com/graphql-hive/gateway/commit/0d813079753e7c66158499e2db6e301a3c145856)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/typed-event-target@^3.0.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/typed-event-target/v/3.0.1)
    (from `^3.0.0`, in `dependencies`)

## 3.0.2

### Patch Changes

- Updated dependencies
  [[`23b8987`](https://github.com/graphql-hive/gateway/commit/23b89874fcf10b4cb6b1b941f29fa5f5aecf0ef2),
  [`23b8987`](https://github.com/graphql-hive/gateway/commit/23b89874fcf10b4cb6b1b941f29fa5f5aecf0ef2)]:
  - @graphql-tools/delegate@10.2.8
  - @graphql-tools/executor-http@1.2.1
  - @graphql-tools/stitch@9.4.10
  - @graphql-tools/wrap@10.0.26

## 3.0.1

### Patch Changes

- Updated dependencies
  [[`367b359`](https://github.com/graphql-hive/gateway/commit/367b3593cb7fd51c42ef4a13ab4adac202845734)]:
  - @graphql-tools/executor-http@1.2.0

## 3.0.0

### Major Changes

- [#308](https://github.com/graphql-hive/gateway/pull/308)
  [`d747d4c`](https://github.com/graphql-hive/gateway/commit/d747d4cd37317e8a9b2b95a5270c0fbd47e4cba3)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING CHANGES;
  - Removed `buildSubgraphSchema`, use `@apollo/subgraph` instead.
  - Removed the following gateway related functions, and prefer using Supergraph approach instead
    - `getSubschemaForFederationWithURL`
    - `getSubschemaForFederationWithTypeDefs`
    - `getSubschemaForFederationWithExecutor`
    - `getSubschemaForFederationWithSchema`
    - `federationSubschemaTransformer`
  - `SupergraphSchemaManager` is no longer an `EventEmitter` but `EventTarget` instead, and it emits
    a real `Event` object.
  - `SupergraphSchemaManager` is now `Disposable` and it no longer stops based on Nodejs terminate
    events, so you should use `using` syntax.

  ```ts
  using manager = new SupergraphSchemaManager({ ... });

  manager.addEventListener('error', (event: SupergraphSchemaManagerErrorEvent) => {
    console.error(event.detail.error);
  });

  let schema: GraphQLSchema | null = null;
  manager.addEventListener('schema', (event: SupergraphSchemaManagerSchemaEvent) => {
      schema = event.detail.schema;
  });
  ```

### Patch Changes

- [#308](https://github.com/graphql-hive/gateway/pull/308)
  [`d747d4c`](https://github.com/graphql-hive/gateway/commit/d747d4cd37317e8a9b2b95a5270c0fbd47e4cba3)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-yoga/typed-event-target@^3.0.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/typed-event-target/v/3.0.0)
    (to `dependencies`)
  - Added dependency
    [`@whatwg-node/disposablestack@^0.0.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.5)
    (to `dependencies`)
  - Added dependency
    [`@whatwg-node/events@^0.1.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/events/v/0.1.2) (to
    `dependencies`)

## 2.2.40

### Patch Changes

- [#291](https://github.com/graphql-hive/gateway/pull/291)
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`tslib@^2.8.1` ↗︎](https://www.npmjs.com/package/tslib/v/2.8.1) (from
    `^2.4.0`, in `dependencies`)

- Updated dependencies
  [[`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151),
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151),
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151),
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)]:
  - @graphql-tools/delegate@10.2.7
  - @graphql-tools/executor-http@1.1.14
  - @graphql-tools/stitch@9.4.9
  - @graphql-tools/wrap@10.0.25

## 2.2.39

### Patch Changes

- Updated dependencies
  [[`3f1a0fa`](https://github.com/graphql-hive/gateway/commit/3f1a0fa9f1f3b91542d00a0211d7def8ef30827e)]:
  - @graphql-tools/executor-http@1.1.13

## 2.2.38

### Patch Changes

- [#269](https://github.com/graphql-hive/gateway/pull/269)
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/merge@^9.0.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.0.12)
    (from `^9.0.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.11)
    (from `^10.0.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.6.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.2)
    (from `^10.6.0`, in `dependencies`)

- Updated dependencies
  [[`7df2215`](https://github.com/graphql-hive/gateway/commit/7df2215abd309dc1dfd91f4ec91ce975f3982c62),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)]:
  - @graphql-tools/delegate@10.2.6
  - @graphql-tools/executor-http@1.1.12
  - @graphql-tools/stitch@9.4.8
  - @graphql-tools/wrap@10.0.24

## 2.2.37

### Patch Changes

- Updated dependencies
  [[`9ce705c`](https://github.com/graphql-hive/gateway/commit/9ce705c5ccc5e6f4ac26af6e6471a6d2f4e995db)]:
  - @graphql-tools/delegate@10.2.5
  - @graphql-tools/stitch@9.4.7
  - @graphql-tools/wrap@10.0.23

## 2.2.36

### Patch Changes

- Updated dependencies
  [[`76642d8`](https://github.com/graphql-hive/gateway/commit/76642d84b722bae28115310f25a6ac4865b41598)]:
  - @graphql-tools/stitch@9.4.6

## 2.2.35

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@10.2.4
  - @graphql-tools/stitch@9.4.5
  - @graphql-tools/wrap@10.0.22

## 2.2.34

### Patch Changes

- [#234](https://github.com/graphql-hive/gateway/pull/234)
  [`ba7e585`](https://github.com/graphql-hive/gateway/commit/ba7e585bcabbcec2ccd35f0903f25fdce9eeb214)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop \`@hidden\` support in favor of
  \`@inaccessible\`

## 2.2.33

### Patch Changes

- [#231](https://github.com/graphql-hive/gateway/pull/231)
  [`7ca0ff3`](https://github.com/graphql-hive/gateway/commit/7ca0ff331e42c133c4218a8086bbf0a7607f45d0)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid extensions and use \`stitchingInfo\` for
  provided fields

- Updated dependencies
  [[`7ca0ff3`](https://github.com/graphql-hive/gateway/commit/7ca0ff331e42c133c4218a8086bbf0a7607f45d0)]:
  - @graphql-tools/delegate@10.2.3
  - @graphql-tools/stitch@9.4.4
  - @graphql-tools/wrap@10.0.21

## 2.2.32

### Patch Changes

- [#205](https://github.com/graphql-hive/gateway/pull/205)
  [`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.1)
    (from `^0.10.0`, in `dependencies`)

- [#205](https://github.com/graphql-hive/gateway/pull/205)
  [`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix missing key fields in the nested queries

- Updated dependencies
  [[`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a),
  [`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a)]:
  - @graphql-tools/executor-http@1.1.11
  - @graphql-tools/delegate@10.2.2
  - @graphql-tools/stitch@9.4.3
  - @graphql-tools/wrap@10.0.20

## 2.2.31

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

- [#199](https://github.com/graphql-hive/gateway/pull/199)
  [`b534288`](https://github.com/graphql-hive/gateway/commit/b5342885f8ac1197d70cbf45266c83b720b4f85a)
  Thanks [@ardatan](https://github.com/ardatan)! - Logs are now easier to read, bigger results not
  do not create bigger outputs but instead they are all logged in a single line

- Updated dependencies
  [[`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`9438e21`](https://github.com/graphql-hive/gateway/commit/9438e21982ed5c6fb18cb678b275046595ae00f5),
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`f0b6921`](https://github.com/graphql-hive/gateway/commit/f0b69219fefc1b24c5511a1c623a5e3bbaf5ca0b),
  [`f71366d`](https://github.com/graphql-hive/gateway/commit/f71366d234fe8f30a419814fe1460f1e22663241),
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`f0b6921`](https://github.com/graphql-hive/gateway/commit/f0b69219fefc1b24c5511a1c623a5e3bbaf5ca0b),
  [`f71366d`](https://github.com/graphql-hive/gateway/commit/f71366d234fe8f30a419814fe1460f1e22663241),
  [`9438e21`](https://github.com/graphql-hive/gateway/commit/9438e21982ed5c6fb18cb678b275046595ae00f5),
  [`b534288`](https://github.com/graphql-hive/gateway/commit/b5342885f8ac1197d70cbf45266c83b720b4f85a),
  [`697308d`](https://github.com/graphql-hive/gateway/commit/697308df3b2dd96f28dc65a5f5361a911077e022)]:
  - @graphql-tools/delegate@10.2.1
  - @graphql-tools/executor-http@1.1.10
  - @graphql-tools/stitch@9.4.2
  - @graphql-tools/wrap@10.0.19

## 2.2.30

### Patch Changes

- [`725d5b7`](https://github.com/graphql-hive/gateway/commit/725d5b7952be3a2fb2caeb40d26c194fb03b35d5)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix regression on override type interface

- Updated dependencies
  [[`725d5b7`](https://github.com/graphql-hive/gateway/commit/725d5b7952be3a2fb2caeb40d26c194fb03b35d5)]:
  - @graphql-tools/stitch@9.4.1

## 2.2.29

### Patch Changes

- Updated dependencies
  [[`f32cb2a`](https://github.com/graphql-hive/gateway/commit/f32cb2a0289aa32e4811ced5dc1aac3efb0674f1)]:
  - @graphql-tools/delegate@10.2.0
  - @graphql-tools/stitch@9.4.0
  - @graphql-tools/wrap@10.0.18

## 2.2.28

### Patch Changes

- Updated dependencies
  [[`73c621d`](https://github.com/graphql-hive/gateway/commit/73c621d98a4e6ca134527e349bc71223c03d06db),
  [`19bc6a4`](https://github.com/graphql-hive/gateway/commit/19bc6a4c222ff157553785ea16760888cdfe10bb)]:
  - @graphql-tools/delegate@10.1.3
  - @graphql-tools/wrap@10.0.17
  - @graphql-tools/stitch@9.3.5

## 2.2.26

### Patch Changes

- [#6663](https://github.com/ardatan/graphql-tools/pull/6663)
  [`d06afe3`](https://github.com/ardatan/graphql-tools/commit/d06afe3065edb15f4c58c1c155a230d8d542669f)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.0)
    (from `^0.9.17`, in `dependencies`)
- Updated dependencies
  [[`d06afe3`](https://github.com/ardatan/graphql-tools/commit/d06afe3065edb15f4c58c1c155a230d8d542669f),
  [`04d5cd7`](https://github.com/ardatan/graphql-tools/commit/04d5cd785be759f0327586a75b9a6ef70cbacf95)]:
  - @graphql-tools/executor-http@1.1.8

## 2.2.25

### Patch Changes

- [`342e044`](https://github.com/ardatan/graphql-tools/commit/342e044c7da74aaf5df6a90ce68973c525c9aa10)
  Thanks [@ardatan](https://github.com/ardatan)! - Prevent extra queries to the same subgraph
  multiple times on the same plan, and merge iterables correctly
- Updated dependencies
  [[`342e044`](https://github.com/ardatan/graphql-tools/commit/342e044c7da74aaf5df6a90ce68973c525c9aa10)]:
  - @graphql-tools/delegate@10.1.1
  - @graphql-tools/stitch@9.3.3
  - @graphql-tools/wrap@10.0.15

## 2.2.24

### Patch Changes

- [#6619](https://github.com/ardatan/graphql-tools/pull/6619)
  [`e9906eb`](https://github.com/ardatan/graphql-tools/commit/e9906eb311132ab902720e75bc787228d67c0e34)
  Thanks [@kroupacz](https://github.com/kroupacz)! - Handle shared root field queries with aliases

- Updated dependencies
  [[`e9906eb`](https://github.com/ardatan/graphql-tools/commit/e9906eb311132ab902720e75bc787228d67c0e34)]:
  - @graphql-tools/delegate@10.1.0
  - @graphql-tools/stitch@9.3.2
  - @graphql-tools/wrap@10.0.14

## 2.2.23

### Patch Changes

- Updated dependencies
  [[`da1de08`](https://github.com/ardatan/graphql-tools/commit/da1de08c269a4cb3ed8240bf191833f7e75a6b01)]:
  - @graphql-tools/delegate@10.0.29
  - @graphql-tools/stitch@9.3.1
  - @graphql-tools/wrap@10.0.13

## 2.2.22

### Patch Changes

- Updated dependencies
  [[`2bb2adb`](https://github.com/ardatan/graphql-tools/commit/2bb2adbe81ab940e582ea2c779a766817c099c9c)]:
  - @graphql-tools/stitch@9.3.0

## 2.2.21

### Patch Changes

- [`5145fc4`](https://github.com/ardatan/graphql-tools/commit/5145fc4f4eed543219dbab5c0bd54e4636e1b952)
  Thanks [@ardatan](https://github.com/ardatan)! - Run \`onSubschemaConfig\` in the right place

## 2.2.20

### Patch Changes

- Updated dependencies
  [[`f470f49`](https://github.com/ardatan/graphql-tools/commit/f470f49f7d8445801a2983f14532124588f9f59e)]:
  - @graphql-tools/delegate@10.0.28
  - @graphql-tools/stitch@9.2.17
  - @graphql-tools/wrap@10.0.12

## 2.2.19

### Patch Changes

- [`180f3f0`](https://github.com/ardatan/graphql-tools/commit/180f3f0c8362613eb3013ff12f2d5405cd987903)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid extra calls if the keys are already
  resolved

- Updated dependencies
  [[`180f3f0`](https://github.com/ardatan/graphql-tools/commit/180f3f0c8362613eb3013ff12f2d5405cd987903)]:
  - @graphql-tools/delegate@10.0.27
  - @graphql-tools/stitch@9.2.16
  - @graphql-tools/wrap@10.0.11

## 2.2.18

### Patch Changes

- [#6598](https://github.com/ardatan/graphql-tools/pull/6598)
  [`4deac7f`](https://github.com/ardatan/graphql-tools/commit/4deac7f3ac468334874f1d9e4ab41943fdf2818c)
  Thanks [@kroupacz](https://github.com/kroupacz)! - If `currentUnavailableSelectionSet.selections`
  is empty array then "query planning" will fail.

## 2.2.17

### Patch Changes

- [`b1e002f`](https://github.com/ardatan/graphql-tools/commit/b1e002f16fe01f7d5d42f9a6b6c8d3ec67fe93ba)
  Thanks [@ardatan](https://github.com/ardatan)! - If required non-nullable key is null, do not send
  it to the subgraph;

  See optimizations.test.ts for more details.

## 2.2.16

### Patch Changes

- [#6586](https://github.com/ardatan/graphql-tools/pull/6586)
  [`8effad4`](https://github.com/ardatan/graphql-tools/commit/8effad4ffb9be1bca098b8cb6ce41b84ac7d9b6b)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements on upstream request
  execution

- Updated dependencies
  [[`8effad4`](https://github.com/ardatan/graphql-tools/commit/8effad4ffb9be1bca098b8cb6ce41b84ac7d9b6b)]:
  - @graphql-tools/delegate@10.0.26
  - @graphql-tools/stitch@9.2.15
  - @graphql-tools/wrap@10.0.10

## 2.2.15

### Patch Changes

- Updated dependencies
  [[`8a16b01`](https://github.com/ardatan/graphql-tools/commit/8a16b01296457bdcfbb111e02b6f6569ef8b04aa)]:
  - @graphql-tools/delegate@10.0.25
  - @graphql-tools/stitch@9.2.14
  - @graphql-tools/wrap@10.0.9

## 2.2.14

### Patch Changes

- [`e0070c2`](https://github.com/ardatan/graphql-tools/commit/e0070c2327ca49bc2a87b88d6ff1066ac2078d2b)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix unavailable field error throwing

## 2.2.13

### Patch Changes

- Updated dependencies
  [[`4cdb462`](https://github.com/ardatan/graphql-tools/commit/4cdb46248774f2d5ae2757d40e1d55e83d7413b3)]:
  - @graphql-tools/delegate@10.0.24
  - @graphql-tools/stitch@9.2.13
  - @graphql-tools/wrap@10.0.8

## 2.2.12

### Patch Changes

- [#6573](https://github.com/ardatan/graphql-tools/pull/6573)
  [`7e2938d`](https://github.com/ardatan/graphql-tools/commit/7e2938d45c6d0a6eb6b18b89f9f80e9b5b5c08db)
  Thanks [@ardatan](https://github.com/ardatan)! - When there are two services like below then the
  following query senty, the gateway tries to fetch `id` as an extra field because it considers `id`
  might be needed while this is not correct. This patch avoids any extra calls, and forwards the
  query as is to the 2nd service.

  ```graphql
  query {
    viewer {
      booksContainer(input: $input) {
        edges {
          cursor
          node {
            source {
              # Book(upc=)
              upc
            }
          }
        }
        pageInfo {
          endCursor
        }
      }
    }
  }
  ```

  ```graphql
  type Book @key(fields: "id") @key(fields: "upc") {
    id: ID!
    upc: ID!
  }
  ```

  ```graphql
  type BookContainer { # the type that is used in a collection
    id: ID!
    # ... other stuff here
    source: Book!
  }

  type Book @key(fields: "upc") {
    upc: ID!
  }

  type Query {
    viewer: Viewer
  }

  type Viewer {
    booksContainer: BooksContainerResult
  }

  type BooksContainerResult {
    edges: [BooksContainerEdge!]!
    pageInfo: PageInfo!
  }

  type BooksContainerEdge {
    node: BookContainer!
    cursor: String!
  }

  type PageInfo {
    endCursor: String
  }
  ```

- Updated dependencies
  [[`7e2938d`](https://github.com/ardatan/graphql-tools/commit/7e2938d45c6d0a6eb6b18b89f9f80e9b5b5c08db)]:
  - @graphql-tools/delegate@10.0.23
  - @graphql-tools/stitch@9.2.12
  - @graphql-tools/wrap@10.0.7

## 2.2.11

### Patch Changes

- Updated dependencies
  [[`dcb3e27`](https://github.com/ardatan/graphql-tools/commit/dcb3e276cce59340596156542bcede9d8b143d44),
  [`cf2ce5e`](https://github.com/ardatan/graphql-tools/commit/cf2ce5ed4773087cc324599f2812f4fb91398b21)]:
  - @graphql-tools/stitch@9.2.11
  - @graphql-tools/utils@10.5.5
  - @graphql-tools/delegate@10.0.22
  - @graphql-tools/executor-http@1.1.7
  - @graphql-tools/merge@9.0.8
  - @graphql-tools/schema@10.0.7
  - @graphql-tools/wrap@10.0.6

## 2.2.10

### Patch Changes

- [`a600be6`](https://github.com/ardatan/graphql-tools/commit/a600be627a6d619ef4c95a445a5c7801d166787b)
  Thanks [@ardatan](https://github.com/ardatan)! - Add `onSubgraphAST`

## 2.2.9

### Patch Changes

- [#6469](https://github.com/ardatan/graphql-tools/pull/6469)
  [`0e87805`](https://github.com/ardatan/graphql-tools/commit/0e8780572fb1a852c8f4d7c8a59b064ae92bdd6b)
  Thanks [@User!](https://github.com/User!)! - Handle merged selection sets in the computed fields;

  When a selection set for a computed field needs to be merged, resolve that required selection set
  fully then resolve the computed field. In the following case, the selection set for the `author`
  field in the `Post` type is merged with the selection set for the `authorId` field in the
  `Comment` type.

  ```graphql
  type Query {
    feed: [Post!]!
  }

  type Post {
    id: ID! @computed(selectionSet: "{ comments { authorId } }")
  }

  type Comment {
    id: ID!
    authorId: ID!
  }

  type User {
    id: ID!
    name: String!
  }
  ```

  ```graphql
  type Post {
    id: ID!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
  }
  ```

- Updated dependencies
  [[`0e87805`](https://github.com/ardatan/graphql-tools/commit/0e8780572fb1a852c8f4d7c8a59b064ae92bdd6b)]:
  - @graphql-tools/delegate@10.0.20

## 2.2.8

### Patch Changes

- [#6441](https://github.com/ardatan/graphql-tools/pull/6441)
  [`52a69ed`](https://github.com/ardatan/graphql-tools/commit/52a69edb8979fd081d1caea90684f5d61dc9f6ec)
  Thanks [@ardatan](https://github.com/ardatan)! - Filter errors as null in the projected key

  If the key field has `Error`, do not send them to the subgraphs as objects but `null`.

## 2.2.7

### Patch Changes

- [#6437](https://github.com/ardatan/graphql-tools/pull/6437)
  [`3188051`](https://github.com/ardatan/graphql-tools/commit/3188051ae530772210e9f3a2c9615932ef13f497)
  Thanks [@User](https://github.com/User), [@()](<https://github.com/()>),
  [@{](https://github.com/{), [@{](https://github.com/{), [@{](https://github.com/{),
  [@{](https://github.com/{), [@{](https://github.com/{)! - Fix the bug happens when a merged field
  is a computed field requires another computed field requires a field from the initial subschema.

  In the following test case, `totalOrdersPrices` needs `userOrders` which needs `lastName` from
  initial `Query.user`. So the bug was skipping the dependencies of `userOrders` because it assumed
  `lastName` already there by mistake.

  ```ts
      const schema1 = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type User {
            id: ID!
            firstName: String!
            lastName: String!
            address: String
          }

          type Query {

          }
        `,
        resolvers: {
          Query: {
   => {
              return {
                id: 1,
                firstName: 'Jake',
                lastName: 'Dawkins',
                address: 'everywhere',
              };
            },
          },
        },
      });
      const schema2 = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type UserOrder {
            id: ID!
          }

          type User {
            id: ID!
            totalOrdersPrices: Int
            aggregatedOrdersByStatus: Int
          }

          type Query {
            userWithOrderDetails(userId: ID!, userOrderIds: [ID]): User
          }
        `,
        resolvers: {
          Query: {
            userWithOrderDetails: (_root, { userId, userOrderIds }) => {
              return {
                id: userId,
                userOrders: userOrderIds?.map((userOrderId: string) => ({ id: userOrderId })),
              };
            },
          },

            totalOrdersPrices(user) {
              if (user.userOrders instanceof Error) {
                return user.userOrders;
              }
              if (!user.userOrders) {
                throw new Error('UserOrders is required');
              }
              return 0;
            },
            aggregatedOrdersByStatus(user) {
              if (user.userOrders instanceof Error) {
                return user.userOrders;
              }
              if (!user.userOrders) {
                throw new Error('UserOrders is required');
              }
              return 1;
            },
          },
        },
      });
      const schema3 = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type User {
            id: ID!
            userOrders: [UserOrder!]
          }

          type UserOrder {
            id: ID!
          }

          type Query {
            userWithOrders(id: ID!, lastName: String): User
          }
        `,
        resolvers: {
          Query: {
            userWithOrders: (_root, { id, lastName }) => {
              return {
                id,
                lastName,
              };
            },
          },

            userOrders(user) {
              if (!user.lastName) {
                throw new Error('LastName is required');
              }
              return [
                {
                  id: `${user.lastName}1`,
                },
              ];
            },
          },
        },
      });
      const stitchedSchema = stitchSchemas({
        subschemas: [
          {
            schema: schema1,
          },
          {
            schema: schema2,
            merge: {

                selectionSet: '{ id }',
                fieldName: 'userWithOrderDetails',
                args: ({ id, userOrders }: { id: string; userOrders: any[] }) => ({
                  userId: id,
                  userOrderIds: userOrders?.map?.(({ id }: { id: string }) => id),
                }),
                fields: {
                  totalOrdersPrices: {
                    selectionSet: '{ userOrders { id } }',
                    computed: true,
                  },
                  aggregatedOrdersByStatus: {
                    selectionSet: '{ userOrders { id } }',
                    computed: true,
                  },
                },
              },
            },
          },
          {
            schema: schema3,
            merge: {

                selectionSet: '{ id }',
                fieldName: 'userWithOrders',
                args: ({ id, lastName }: { id: string; lastName: string }) => ({
                  id,
                  lastName,
                }),
                fields: {
                  userOrders: {
                    selectionSet: '{ lastName }',
                    computed: true,
                  },
                },
              },
            },
          },
        ],
      });
      const res = await normalizedExecutor({
        schema: stitchedSchema,
        document: parse(/* GraphQL */ `
          query User {
            user {
              aggregatedOrdersByStatus
              totalOrdersPrices
            }
          }
        `),
      });
      expect(res).toEqual({
        data: {

            aggregatedOrdersByStatus: 1,
            totalOrdersPrices: 0,
          },
        },
      });
  ```

- Updated dependencies
  [[`3188051`](https://github.com/ardatan/graphql-tools/commit/3188051ae530772210e9f3a2c9615932ef13f497)]:
  - @graphql-tools/delegate@10.0.19

## 2.2.6

### Patch Changes

- [`b8bf584`](https://github.com/ardatan/graphql-tools/commit/b8bf584fde87d3064c204d8ac2f9da5b869249c0)
  Thanks [@ardatan](https://github.com/ardatan)! - Introduce \`getDirectiveExtensions\` and refactor
  directive handling in the extensions

- Updated dependencies
  [[`b8bf584`](https://github.com/ardatan/graphql-tools/commit/b8bf584fde87d3064c204d8ac2f9da5b869249c0)]:
  - @graphql-tools/utils@10.4.0
  - @graphql-tools/schema@10.0.5
  - @graphql-tools/merge@9.0.5

## 2.2.5

### Patch Changes

- [`dbb0516`](https://github.com/ardatan/graphql-tools/commit/dbb05162731b7a2baf08f4756d4a4de3dce0a951)
  Thanks [@ardatan](https://github.com/ardatan)! - If there are repeated computed fields like below,
  project the data for the computed fields for each `fields` and merge them correctly. And if they
  are array as in `userOrders`, merge them by respecting the order (the second one can have `price`
  maybe).

  ```graphql
  type UserOrder @key(fields: "id") {
    id: ID!
    status: String!
    price: Int!
  }

  type User @key(fields: "id") {
    id: ID!
    userOrders: [UserOrder!] @external
    totalOrdersPrices: Int @requires(fields: "userOrders { id }")
    aggregatedOrdersByStatus: Int @requires(fields: "userOrders { id }")
  }
  ```

## 2.2.4

### Patch Changes

- [#6403](https://github.com/ardatan/graphql-tools/pull/6403)
  [`3803897`](https://github.com/ardatan/graphql-tools/commit/3803897cef27b15bad1718819c5d75030afbe781)
  Thanks [@ardatan](https://github.com/ardatan)! - Cleanup extra fields, empty inline fragments and
  duplicate \_\_typename fields

- Updated dependencies
  [[`3803897`](https://github.com/ardatan/graphql-tools/commit/3803897cef27b15bad1718819c5d75030afbe781)]:
  - @graphql-tools/delegate@10.0.17

## 2.2.3

### Patch Changes

- [`0d203ab`](https://github.com/ardatan/graphql-tools/commit/0d203ab57671cfa6d4417e60b08b3224a65bec91)
  Thanks [@ardatan](https://github.com/ardatan)! - Support `@requires` with arguments like
  `@requires(fields: "price(currency: 'USD')")`

## 2.2.2

### Patch Changes

- [`63cab60`](https://github.com/ardatan/graphql-tools/commit/63cab60dca3f36614ff5cb26869e1e7d3e939c50)
  Thanks [@ardatan](https://github.com/ardatan)! - Use type definition merger instead of
  \`concatAST\` to merge type definitions for creating a subschema for Federation

## 2.2.1

### Patch Changes

- [`33e8146`](https://github.com/ardatan/graphql-tools/commit/33e8146e33aa17790ee76d14e52f62c684ee1b16)
  Thanks [@ardatan](https://github.com/ardatan)! - Fail on query planning phase if the query plan is
  not successful before the actual execution

- Updated dependencies
  [[`33e8146`](https://github.com/ardatan/graphql-tools/commit/33e8146e33aa17790ee76d14e52f62c684ee1b16)]:
  - @graphql-tools/delegate@10.0.16

## 2.2.0

### Minor Changes

- [#6368](https://github.com/ardatan/graphql-tools/pull/6368)
  [`334d301`](https://github.com/ardatan/graphql-tools/commit/334d301007d4d73e09182f22a76bdce1937ec8af)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Expose the loaded supergrapth SDL in
  the `schema` event

## 2.1.4

### Patch Changes

- [`167b47c`](https://github.com/ardatan/graphql-tools/commit/167b47cbc6ae31ce046cf6cc17365813d2481d4c)
  Thanks [@ardatan](https://github.com/ardatan)! - New options to configure query batching and
  batched delegation

  ```ts
  {
    batchingOptions: {
      dataLoaderOptions: {
        maxBatchSize: 10, // Limits the query batching
      }
    },
    batchDelegateOptions: {
      maxBatchSize: 10, // Limits the batch delegation
    }
  }
  ```

  Learn more about these here;
  [Batch Delegation](https://the-guild.dev/graphql/stitching/docs/approaches/schema-extensions#batch-delegation-array-batching)
  [Query Batching](https://the-guild.dev/graphql/stitching/docs/getting-started/remote-subschemas#batch-the-executor-query-batching)

## 2.1.3

### Patch Changes

- [`d54b21a`](https://github.com/ardatan/graphql-tools/commit/d54b21a235f9632d320a32f15594ecd70b5eae29)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not apply type merging for non-resolvable
  entities

- Updated dependencies
  [[`d54b21a`](https://github.com/ardatan/graphql-tools/commit/d54b21a235f9632d320a32f15594ecd70b5eae29),
  [`d54b21a`](https://github.com/ardatan/graphql-tools/commit/d54b21a235f9632d320a32f15594ecd70b5eae29)]:
  - @graphql-tools/delegate@10.0.15

## 2.1.2

### Patch Changes

- [#6355](https://github.com/ardatan/graphql-tools/pull/6355)
  [`c6d175b`](https://github.com/ardatan/graphql-tools/commit/c6d175b2c1de640d2156ba0b2c69bf7e8884d98f)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle errors coming from subgraphs correctly
  when a root field is shared by different subgraphs
  - If subgraph A returns an error for `Query.foo`, and subgraph B returns the data, ignore the
    error and keep it for null fields.
  - If both subgraphs return errors, return them as `AggregateError` then return them to the gateway
    result.

- Updated dependencies
  [[`8094c37`](https://github.com/ardatan/graphql-tools/commit/8094c3733c745b2ccb7adcca38024c82c42319a0),
  [`97c88a0`](https://github.com/ardatan/graphql-tools/commit/97c88a0844eff2ace5914b8e18a2d32dc5b8c265)]:
  - @graphql-tools/delegate@10.0.14
  - @graphql-tools/executor-http@1.1.5

## 2.1.1

### Patch Changes

- [#6293](https://github.com/ardatan/graphql-tools/pull/6293)
  [`3f301dc`](https://github.com/ardatan/graphql-tools/commit/3f301dc74a99ea1db28fe75923fa26ba2736d9f7)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not use `entryPoints` for `MergedTypeConfig`
  if there is only one

- [#6278](https://github.com/ardatan/graphql-tools/pull/6278)
  [`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c)
  Thanks [@ardatan](https://github.com/ardatan)! - Exclude `@defer` in the subgraph requests

- Updated dependencies
  [[`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c),
  [`3f301dc`](https://github.com/ardatan/graphql-tools/commit/3f301dc74a99ea1db28fe75923fa26ba2736d9f7)]:
  - @graphql-tools/delegate@10.0.12
  - @graphql-tools/stitch@9.2.10
  - @graphql-tools/utils@10.2.3

## 2.1.0

### Minor Changes

- [#6267](https://github.com/ardatan/graphql-tools/pull/6267)
  [`d5dd794`](https://github.com/ardatan/graphql-tools/commit/d5dd794352878aec9b0d543dfe2e6995142dddff)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add `delayInSeconds` to the `failure`
  event to give users more control on failure handling.

- [#6267](https://github.com/ardatan/graphql-tools/pull/6267)
  [`d5dd794`](https://github.com/ardatan/graphql-tools/commit/d5dd794352878aec9b0d543dfe2e6995142dddff)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add a the ability to start polling with
  a delay. This ease the handling of failure handling, allowing to restart the manager and
  respecting GraphOS minimum retry delay.

### Patch Changes

- [#6267](https://github.com/ardatan/graphql-tools/pull/6267)
  [`d5dd794`](https://github.com/ardatan/graphql-tools/commit/d5dd794352878aec9b0d543dfe2e6995142dddff)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Fix Supergraph Manager Event Emitter
  not calling every listener when at least one has been registered using `once` method.

## 2.0.1

### Patch Changes

- [#6238](https://github.com/ardatan/graphql-tools/pull/6238)
  [`0f7059b`](https://github.com/ardatan/graphql-tools/commit/0f7059beb218d0012c48e121c55e7db386796bee)
  Thanks [@ardatan](https://github.com/ardatan)! - Merge the elements of the lists if the root field
  is shared across different subgraphs

  ```graphql
  type Query {
    products: [Product] # If this field is returned by multiple subgraphs, the elements of the lists will be merged
  }
  ```

- Updated dependencies
  [[`0f7059b`](https://github.com/ardatan/graphql-tools/commit/0f7059beb218d0012c48e121c55e7db386796bee)]:
  - @graphql-tools/utils@10.2.2

## 2.0.0

### Major Changes

- [#6227](https://github.com/ardatan/graphql-tools/pull/6227)
  [`85c383f`](https://github.com/ardatan/graphql-tools/commit/85c383fbb44eeb2a0509480d84ca0b12811bc3ca)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING CHANGES:
  - `getSubschemasFromSupergraphSdl` has been removed in favor of the new
    `getStitchingOptionsFromSupergraphSdl`, and it returns the options for `stitchSchemas` instead
    of the map of subschemas
  - `onExecutor` has been removed in favor of `onSubschemaConfig`
  - To change the default HTTP executor options, use `httpExecutorOpts` instead of `onExecutor`

### Patch Changes

- [#6223](https://github.com/ardatan/graphql-tools/pull/6223)
  [`db29280`](https://github.com/ardatan/graphql-tools/commit/db29280ef4b058857923ed8a207052fe06ba5fa0)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/fetch@^0.9.17` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.17) (to
    `dependencies`)

## 1.1.36

### Patch Changes

- [#6194](https://github.com/ardatan/graphql-tools/pull/6194)
  [`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle interface objects in a different way

- [#6189](https://github.com/ardatan/graphql-tools/pull/6189)
  [`0134f7f`](https://github.com/ardatan/graphql-tools/commit/0134f7ffe5383603961d69337bfa5bceefb3ed74)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle interface types with non-shared
  implementations;

  For example, you have the following services, where `Node` is implemented in both services, but
  `Foo` and `Bar` are only implemented in one service. And when the gateway receives the following
  query, it should be converted to this because `Node` is not implemented as `Bar` in Service 1
  while implemented in Service 2.

  Query conversion;

  ```graphql
  # Gateway request
  query {
    fooBar(id: "1") {
      ... on Node {
        id
      }
    }
  }
  ```

  ```graphql
  # Service 1 Request
  query {
    fooBar(id: "1") {
      ... on Foo {
        id
      }
      ... on Bar {
        id
      }
    }
  }
  ```

  Services;

  ```graphql
  # Service 1

  union FooBar = Foo | Bar

  interface Node {
    id: ID!
  }

  type Foo implements Node {
    id: ID!
  }

  type Bar {
    id: ID!
  }

  type Query {
    fooBar(id: ID!): FooBar
  }
  ```

  ```graphql
  # Service 2
  interface Node {
    id: ID!
  }

  type Foo implements Node {
    id: ID!
  }

  type Bar implements Node {
    id: ID!
  }
  ```

- [#6187](https://github.com/ardatan/graphql-tools/pull/6187)
  [`dfccfbf`](https://github.com/ardatan/graphql-tools/commit/dfccfbfd6633dd576f660c648f3c6cecff3667a1)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect @provides to optimize the query plan

- [#6188](https://github.com/ardatan/graphql-tools/pull/6188)
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e)
  Thanks [@ardatan](https://github.com/ardatan)! - If two different subschemas have the root field,
  use the same field to resolve missing fields instead of applying a type merging in advance

- Updated dependencies
  [[`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e),
  [`dfccfbf`](https://github.com/ardatan/graphql-tools/commit/dfccfbfd6633dd576f660c648f3c6cecff3667a1),
  [`0134f7f`](https://github.com/ardatan/graphql-tools/commit/0134f7ffe5383603961d69337bfa5bceefb3ed74),
  [`eec9d3d`](https://github.com/ardatan/graphql-tools/commit/eec9d3d86a1a0a748321263ef9bc4db13fd3c35c),
  [`03a47b1`](https://github.com/ardatan/graphql-tools/commit/03a47b181516e17f33c84f364df9482c2d1ba502),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e),
  [`0827497`](https://github.com/ardatan/graphql-tools/commit/08274975ccb1524d88fc8b95f42deb1cba05425d)]:
  - @graphql-tools/delegate@10.0.11
  - @graphql-tools/schema@10.0.4
  - @graphql-tools/stitch@9.2.9
  - @graphql-tools/utils@10.2.1

## 1.1.35

### Patch Changes

- [#6141](https://github.com/ardatan/graphql-tools/pull/6141)
  [`cd962c1`](https://github.com/ardatan/graphql-tools/commit/cd962c1048b21c0a6f91c943860089b050ac5f5e)
  Thanks [@ardatan](https://github.com/ardatan)! - When the gateway receives the query, now it
  chooses the best root field if there is the same root field in different subgraphs. For example,
  if there is `node(id: ID!): Node` in all subgraphs but one implements `User` and the other
  implements `Post`, the gateway will choose the subgraph that implements `User` or `Post` based on
  the query.

  If there is a unresolvable interface field, it throws.

  See
  [this supergraph and the test query](https://github.com/ardatan/graphql-tools/tree/master/packages/federation/test/fixtures/federation-compatibility/corrupted-supergraph-node-id)
  to see a real-life example

- [#6143](https://github.com/ardatan/graphql-tools/pull/6143)
  [`04d5431`](https://github.com/ardatan/graphql-tools/commit/04d5431deccc42d75b6ae2ae8ed941dac4c3679a)
  Thanks [@ardatan](https://github.com/ardatan)! - Implement interface objects support

- Updated dependencies
  [[`a83da08`](https://github.com/ardatan/graphql-tools/commit/a83da087e24929ed0734a2cff63c97bd45cc9eb4),
  [`fc9c71f`](https://github.com/ardatan/graphql-tools/commit/fc9c71fbc9057a8e32e0d8813b23819c631afa65),
  [`cd962c1`](https://github.com/ardatan/graphql-tools/commit/cd962c1048b21c0a6f91c943860089b050ac5f5e)]:
  - @graphql-tools/delegate@10.0.10
  - @graphql-tools/stitch@9.2.8

## 1.1.34

### Patch Changes

- [#6130](https://github.com/ardatan/graphql-tools/pull/6130)
  [`508ae6b`](https://github.com/ardatan/graphql-tools/commit/508ae6bbe36248926b58719d71042c4d608782a1)
  Thanks [@ardatan](https://github.com/ardatan)! - Support overrides on interfaces See
  [packages/federation/test/fixtures/federation-compatibility/override-type-interface/supergraph.graphql](https://github.com/ardatan/graphql-tools/blob/739264d5f7f2f4254d4d41f965d664ae04c37e45/packages/federation/test/fixtures/federation-compatibility/override-type-interface/supergraph.graphql)
  for more details

## 1.1.33

### Patch Changes

- [`361052a`](https://github.com/ardatan/graphql-tools/commit/361052a5fcc7f3bb00092efa3efd5767b9ac1ee6)
  Thanks [@ardatan](https://github.com/ardatan)! - Small fix: check all final types to find orphan
  interfaces

## 1.1.32

### Patch Changes

- [#6126](https://github.com/ardatan/graphql-tools/pull/6126)
  [`680351e`](https://github.com/ardatan/graphql-tools/commit/680351ee2af39ffd6b4b0048a28954d0d4b8a926)
  Thanks [@ardatan](https://github.com/ardatan)! - When there is a Node subschema, and others to
  resolve the rest of the entities by using a union resolver as in Federation like below, it was
  failing. This version fixes that issue.

  ```graphql
  query {
    node(id: "1") {
      id # Fetches from Node
      ... on User {
        name # Fetches from User
      }
    }
  }
  ```

  ```graphql
  type Query {
    node(id: ID!): Node
  }

  interface Node {
    id: ID!
  }

  type User implements Node {
    id: ID!
  }

  type Post implements Node {
    id: ID!
  }
  ```

  ```graphql
  # User subschema
  scalar _Any
  type Query {
    _entities(representations: [_Any!]!): [_Entity]!
  }
  union _Entity = User
  interface Node {
    id: ID!
  }
  type User implements Node {
    id: ID!
    name: String!
  }
  ```

  ```graphql
  # Post subschema
  scalar _Any
  union _Entity = Post
  type Query {
    _entities(representations: [_Any!]!): [_Entity]!
  }
  interface Node {
    id: ID!
  }
  type Post implements Node {
    id: ID!
    title: String!
  }
  ```

- Updated dependencies
  [[`680351e`](https://github.com/ardatan/graphql-tools/commit/680351ee2af39ffd6b4b0048a28954d0d4b8a926)]:
  - @graphql-tools/delegate@10.0.9
  - @graphql-tools/stitch@9.2.7

## 1.1.31

### Patch Changes

- [`98b2795`](https://github.com/ardatan/graphql-tools/commit/98b2795120e05dec1d91b57422f50d38c088b630)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on unavailable field selection, and
  key object projection

- Updated dependencies
  [[`98b2795`](https://github.com/ardatan/graphql-tools/commit/98b2795120e05dec1d91b57422f50d38c088b630)]:
  - @graphql-tools/stitch@9.2.6

## 1.1.30

### Patch Changes

- [`9238e14`](https://github.com/ardatan/graphql-tools/commit/9238e140862d33c6df072c42054fc642eda37840)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on field merging and extraction of
  unavailable fields

- Updated dependencies
  [[`9238e14`](https://github.com/ardatan/graphql-tools/commit/9238e140862d33c6df072c42054fc642eda37840),
  [`4ce3ffc`](https://github.com/ardatan/graphql-tools/commit/4ce3ffc8ec927651587e0aa236fdd573e883ef21)]:
  - @graphql-tools/stitch@9.2.5
  - @graphql-tools/delegate@10.0.8

## 1.1.29

### Patch Changes

- [#6109](https://github.com/ardatan/graphql-tools/pull/6109)
  [`074fad4`](https://github.com/ardatan/graphql-tools/commit/074fad4144095fbefe449ced397b7707963bd7aa)
  Thanks [@ardatan](https://github.com/ardatan)! - Show responses in debug logging with `DEBUG` env
  var

- Updated dependencies
  [[`074fad4`](https://github.com/ardatan/graphql-tools/commit/074fad4144095fbefe449ced397b7707963bd7aa),
  [`074fad4`](https://github.com/ardatan/graphql-tools/commit/074fad4144095fbefe449ced397b7707963bd7aa)]:
  - @graphql-tools/delegate@10.0.7
  - @graphql-tools/stitch@9.2.3

## 1.1.28

### Patch Changes

- [#6091](https://github.com/ardatan/graphql-tools/pull/6091)
  [`9bca9e0`](https://github.com/ardatan/graphql-tools/commit/9bca9e03915a2e12d164e355be9aed389b0de3a4)
  Thanks [@User](https://github.com/User), [@User](https://github.com/User)! - If the gateway
  receives a query with an overlapping fields for the subschema, it uses aliases to resolve it
  correctly.

  Let's say subschema A has the following schema;

  ```graphql
    type Query {

    }

    interface User {
      id: ID!
      name: String!
    }

    type Admin implements User {
      id: ID!
      name: String!
      role: String!
    }

    type Customer implements User {
      id: ID!
      name: String
      email: String
    }
  ```

  And let's say the gateway has the following schema instead;

  ```graphql
    type Query {

    }

    interface User {
      id: ID!
      name: String!
    }

    type Admin implements User {
      id: ID!
      name: String!
      role: String!
    }

    type Customer implements User {
      id: ID!
      name: String!
      email: String!
    }
  ```

  In this case, the following query is fine for the gateway but for the subschema, it's not;

  ```graphql
  query {
    user {
      ... on Admin {
        id
        name # This is nullable in the subschema
        role
      }
      ... on Customer {
        id
        name # This is non-nullable in the subschema
        email
      }
    }
  }
  ```

  So the subgraph will throw based on this rule
  [OverlappingFieldsCanBeMerged](https://github.com/graphql/graphql-js/blob/main/src/validation/rules/OverlappingFieldsCanBeMergedRule.ts)

  To avoid this, the gateway will use aliases to resolve the query correctly. The query will be
  transformed to the following;

  ```graphql
  query {
    user {
      ... on Admin {
        id
        name # This is nullable in the subschema
        role
      }
      ... on Customer {
        id
        name: _nullable_name # This is non-nullable in the subschema
        email
      }
    }
  }
  ```

- Updated dependencies
  [[`9bca9e0`](https://github.com/ardatan/graphql-tools/commit/9bca9e03915a2e12d164e355be9aed389b0de3a4),
  [`9bca9e0`](https://github.com/ardatan/graphql-tools/commit/9bca9e03915a2e12d164e355be9aed389b0de3a4),
  [`243c353`](https://github.com/ardatan/graphql-tools/commit/243c353412921cf0063f963ee46b9c63d2f33b41)]:
  - @graphql-tools/stitch@9.2.0
  - @graphql-tools/delegate@10.0.5

## 1.1.27

### Patch Changes

- [#6086](https://github.com/ardatan/graphql-tools/pull/6086)
  [`f538e50`](https://github.com/ardatan/graphql-tools/commit/f538e503c3cdb152bd29f77804217100cac0f648)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle @inaccessible types correctly

## 1.1.26

### Patch Changes

- [#6071](https://github.com/ardatan/graphql-tools/pull/6071)
  [`6cf507f`](https://github.com/ardatan/graphql-tools/commit/6cf507fc70d2474c71c8604ab117d01af76376e1)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle inaccessible enum values

## 1.1.25

### Patch Changes

- [`e09c383`](https://github.com/ardatan/graphql-tools/commit/e09c383a540f84f56db141466b711f88fce8548d)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect fields with specified types

## 1.1.24

### Patch Changes

- [`458ef46`](https://github.com/ardatan/graphql-tools/commit/458ef46536db003edc399587feabfcee7b186830)
  Thanks [@ardatan](https://github.com/ardatan)! - Remove extra logs

## 1.1.23

### Patch Changes

- [`2202768`](https://github.com/ardatan/graphql-tools/commit/220276800d271e7c6fbc43339eb779b618c82e68)
  Thanks [@ardatan](https://github.com/ardatan)! - Federation v1 support improvements

## 1.1.22

### Patch Changes

- [`4620bb2`](https://github.com/ardatan/graphql-tools/commit/4620bb2a352fd0e645950aaae8bb54cbc7c85ce7)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle unspecified key fields

## 1.1.21

### Patch Changes

- [`14f4fae`](https://github.com/ardatan/graphql-tools/commit/14f4faec87b1423c5541dab16dc2c5c1298edcf7)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle orphan scalars with directives

## 1.1.20

### Patch Changes

- [`b78ce7e`](https://github.com/ardatan/graphql-tools/commit/b78ce7e42c8d016d972b125a86508f5ab78d57a6)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle orphan union types

## 1.1.19

### Patch Changes

- [#5956](https://github.com/ardatan/graphql-tools/pull/5956)
  [`d4395dd`](https://github.com/ardatan/graphql-tools/commit/d4395dd7d21db3becdf51cc0508e35d246dcbe1e)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle orphan types

- Updated dependencies
  [[`8199416`](https://github.com/ardatan/graphql-tools/commit/81994160488aad1114b0d130083bcf694fe13aba),
  [`baf3c28`](https://github.com/ardatan/graphql-tools/commit/baf3c28f43dcfafffd15386daeb153bc2895c1b3)]:
  - @graphql-tools/wrap@10.0.3
  - @graphql-tools/utils@10.1.1

## 1.1.18

### Patch Changes

- [#5946](https://github.com/ardatan/graphql-tools/pull/5946)
  [`107c021`](https://github.com/ardatan/graphql-tools/commit/107c021aa191f0654c45ed72b45d650993e2142f)
  Thanks [@ardatan](https://github.com/ardatan)! - If an interface or scalar type is not annotated
  for a subgraph explicitly, consider them as a shared type

## 1.1.17

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.3)
    (from `^10.0.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor-http@^1.0.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.0.8)
    (from `^1.0.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.0.1)
    (from `^9.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.2)
    (from `^10.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitch@^9.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/9.0.4)
    (from `^9.0.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@^10.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/10.0.1)
    (from `^10.0.0`, in `dependencies`)
- Updated dependencies
  [[`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)]:
  - @graphql-tools/delegate@10.0.4
  - @graphql-tools/executor-http@1.0.9
  - @graphql-tools/merge@9.0.3
  - @graphql-tools/schema@10.0.3
  - @graphql-tools/stitch@9.0.5
  - @graphql-tools/wrap@10.0.2

## 1.1.16

### Patch Changes

- [`7583729`](https://github.com/ardatan/graphql-tools/commit/7583729718ffd528bba5d1c5c4ea087975102c1f)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix `getSubschemaForFederationWithTypeDefs` for
  non-supergraph merging of subgraphs

## 1.1.15

### Patch Changes

- [#5885](https://github.com/ardatan/graphql-tools/pull/5885)
  [`2d76909`](https://github.com/ardatan/graphql-tools/commit/2d76909908a918562a9f7599825b70ae60f91127)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid creating invalid schema when there is no
  entity

## 1.1.14

### Patch Changes

- [#5878](https://github.com/ardatan/graphql-tools/pull/5878)
  [`ba062ff`](https://github.com/ardatan/graphql-tools/commit/ba062ff4880f6922eaddfcbd746782275a8f689e)
  Thanks [@darren-west](https://github.com/darren-west)! - fix: buildSubgraphSchema with no entity
  keys

## 1.1.13

### Patch Changes

- [`974df8a`](https://github.com/ardatan/graphql-tools/commit/974df8a1a1bca422bac5d971a3f8029cd9728efd)
  Thanks [@ardatan](https://github.com/ardatan)! - Debug logging & expose the subgraph schema

- Updated dependencies
  [[`b798b3b`](https://github.com/ardatan/graphql-tools/commit/b798b3b0a54f634bf2dd2275ef47f5263a5ce238)]:
  - @graphql-tools/executor-http@1.0.6

## 1.1.12

### Patch Changes

- [`efedc590`](https://github.com/ardatan/graphql-tools/commit/efedc59018ea1d63f86973d0c6608b3c7ddc2e71)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle unions correctly

## 1.1.11

### Patch Changes

- [`250715a1`](https://github.com/ardatan/graphql-tools/commit/250715a1e18f0c645240ea78bb80f7557ac81340)
  Thanks [@ardatan](https://github.com/ardatan)! - Support `extend type` in subgraph SDL

- [`250715a1`](https://github.com/ardatan/graphql-tools/commit/250715a1e18f0c645240ea78bb80f7557ac81340)
  Thanks [@ardatan](https://github.com/ardatan)! - Support supergraph with no join\_\_type
  directives on Query type

## 1.1.10

### Patch Changes

- [`cda328c3`](https://github.com/ardatan/graphql-tools/commit/cda328c3e487ea51e13a3b18f0e2e494fd3275ca)
  Thanks [@ardatan](https://github.com/ardatan)! - Support for multiple key entrypoints for an
  object, and avoid sending whole object if possible

- Updated dependencies
  [[`cda328c3`](https://github.com/ardatan/graphql-tools/commit/cda328c3e487ea51e13a3b18f0e2e494fd3275ca)]:
  - @graphql-tools/stitch@9.0.2

## 1.1.9

### Patch Changes

- [`3ed8cbd6`](https://github.com/ardatan/graphql-tools/commit/3ed8cbd68988492e8b220a82b3590bad2a1c672b)
  Thanks [@ardatan](https://github.com/ardatan)! - Support @join\_\_implements in Federation

## 1.1.8

### Patch Changes

- [`7fe63895`](https://github.com/ardatan/graphql-tools/commit/7fe63895c1b989de3ab433e90945cb318718ddac)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix Fed v2 support

## 1.1.7

### Patch Changes

- [#5579](https://github.com/ardatan/graphql-tools/pull/5579)
  [`d30e8735`](https://github.com/ardatan/graphql-tools/commit/d30e8735682c3a7209cded3fc16dd889ddfa5ddf)
  Thanks [@ardatan](https://github.com/ardatan)! - Optimizations and refactor

## 1.1.6

### Patch Changes

- [`9b404e83`](https://github.com/ardatan/graphql-tools/commit/9b404e8346af2831e3ed56326cd9e1e9f8582b42)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle type ownerships correctly

## 1.1.5

### Patch Changes

- [#5567](https://github.com/ardatan/graphql-tools/pull/5567)
  [`61393975`](https://github.com/ardatan/graphql-tools/commit/61393975c535e45c108500feea1ceec461586c6e)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect input types

## 1.1.4

### Patch Changes

- [#5559](https://github.com/ardatan/graphql-tools/pull/5559)
  [`ada5c56a`](https://github.com/ardatan/graphql-tools/commit/ada5c56af472e06d595e53a035c105e745490bfc)
  Thanks [@ardatan](https://github.com/ardatan)! - Support unowned types such as interfaces, unions
  and scalars

## 1.1.3

### Patch Changes

- [#5474](https://github.com/ardatan/graphql-tools/pull/5474)
  [`f31be313`](https://github.com/ardatan/graphql-tools/commit/f31be313b2af5a7c5bf893f1ce1dc7d36bf5340c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency [`lodash.pick@^4.4.0` ↗︎](https://www.npmjs.com/package/lodash.pick/v/4.4.0)
    (from `dependencies`)

- [#5474](https://github.com/ardatan/graphql-tools/pull/5474)
  [`f31be313`](https://github.com/ardatan/graphql-tools/commit/f31be313b2af5a7c5bf893f1ce1dc7d36bf5340c)
  Thanks [@ardatan](https://github.com/ardatan)! - Optimizations for federation

- Updated dependencies
  [[`f31be313`](https://github.com/ardatan/graphql-tools/commit/f31be313b2af5a7c5bf893f1ce1dc7d36bf5340c)]:
  - @graphql-tools/delegate@10.0.1
  - @graphql-tools/stitch@9.0.1

## 1.1.2

### Patch Changes

- [#5468](https://github.com/ardatan/graphql-tools/pull/5468)
  [`de9e8a67`](https://github.com/ardatan/graphql-tools/commit/de9e8a678a0ab38e5fc1cbf6c1bf27c265cc0c01)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency [`lodash.pick@^4.4.0` ↗︎](https://www.npmjs.com/package/lodash.pick/v/4.4.0) (to
    `dependencies`)

- [#5468](https://github.com/ardatan/graphql-tools/pull/5468)
  [`de9e8a67`](https://github.com/ardatan/graphql-tools/commit/de9e8a678a0ab38e5fc1cbf6c1bf27c265cc0c01)
  Thanks [@ardatan](https://github.com/ardatan)! - Reduce the number of upstream requests

## 1.1.1

### Patch Changes

- [`d593dfce`](https://github.com/ardatan/graphql-tools/commit/d593dfce52a895993c754903687043a9d5429803)
  Thanks [@ardatan](https://github.com/ardatan)! - Adding `batch` option to allow batching

## 1.1.0

### Minor Changes

- [#5455](https://github.com/ardatan/graphql-tools/pull/5455)
  [`d4de4a8e`](https://github.com/ardatan/graphql-tools/commit/d4de4a8e84f7dabbaab058b264a350a3592dd752)
  Thanks [@ardatan](https://github.com/ardatan)! - Supergraph SDL support

## 1.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`8fba6cc1`](https://github.com/ardatan/graphql-tools/commit/8fba6cc1876e914d587f5b253332aaedbcaa65e6),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/executor-http@1.0.0
  - @graphql-tools/delegate@10.0.0
  - @graphql-tools/schema@10.0.0
  - @graphql-tools/stitch@9.0.0
  - @graphql-tools/merge@9.0.0
  - @graphql-tools/utils@10.0.0
  - @graphql-tools/wrap@10.0.0

## 0.0.3

### Patch Changes

- [#5223](https://github.com/ardatan/graphql-tools/pull/5223)
  [`24c13616`](https://github.com/ardatan/graphql-tools/commit/24c136160fe675c08c1c1fe06bfb8883cdf0b466)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor-http@^0.1.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/0.1.9)
    (from `^0.0.7`, in `dependencies`)

## 0.0.2

### Patch Changes

- [#5212](https://github.com/ardatan/graphql-tools/pull/5212)
  [`0cd9e8c4`](https://github.com/ardatan/graphql-tools/commit/0cd9e8c4469d07e53ad8e7944ba144f58c4db34f)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^9.0.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.19)
    (from `9.0.19`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^8.3.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/8.3.16)
    (from `8.3.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^9.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/9.0.14)
    (from `9.0.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@^9.2.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.20)
    (from `9.2.20`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^9.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.3)
    (from `9.1.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor-http@^0.0.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/0.0.7)
    (from `0.0.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitch@^8.7.34` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/8.7.34)
    (from `8.7.34`, in `dependencies`)
  - Added dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (to
    `dependencies`)

- [#5215](https://github.com/ardatan/graphql-tools/pull/5215)
  [`88244048`](https://github.com/ardatan/graphql-tools/commit/882440487551abcb5bdd4f626f3b56ac2e886f11)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid object spread

- [#5220](https://github.com/ardatan/graphql-tools/pull/5220)
  [`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements

- Updated dependencies
  [[`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)]:
  - @graphql-tools/delegate@9.0.35
  - @graphql-tools/stitch@8.7.49

## 0.0.1

### Patch Changes

- [#4974](https://github.com/ardatan/graphql-tools/pull/4974)
  [`1c0e80a6`](https://github.com/ardatan/graphql-tools/commit/1c0e80a60827169eb3eb99fe5710b1e891b89740)
  Thanks [@ardatan](https://github.com/ardatan)! - New Federation package
