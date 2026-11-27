# @graphql-tools/delegate

## 14.0.0

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
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc)]:
  - @graphql-tools/batch-execute@11.0.1

## 13.0.0

### Major Changes

- [#2670](https://github.com/graphql-hive/gateway/pull/2670)
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Remove `createDeferred`. Use
  `Promise.withResolvers()`.

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

- [#2670](https://github.com/graphql-hive/gateway/pull/2670)
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - **Breaking:** Remove
  `isolateComputedFieldsTransformer` and isolation-clone planning.

  ### What changed

  Computed / `@requires` fields used to live on **cloned** subschema copies so the initial Query hop
  could not select them early. That N-clone tax is gone. Computed fields stay on the single
  subschema schema; `deferComputedFieldsTransformer` strips them from non-merge outbound requests
  and injects merge-key fields (including nested selections) so later entity hops still have
  identity. Aliased key fields (for example `aliasId: id`) are not treated as the literal merge key.

  Default `stitchSchemas` / federation presets already include deferral. Most apps need no config
  change.

  ### Migration

  If you previously passed isolation explicitly, drop it:

  ```ts
  // before
  import { isolateComputedFieldsTransformer, stitchSchemas } from '@graphql-tools/stitch'

  stitchSchemas({
    subschemas,
    subschemaConfigTransforms: [isolateComputedFieldsTransformer]
  })

  // after
  import { stitchSchemas } from '@graphql-tools/stitch'

  stitchSchemas({ subschemas })
  // defaults already defer computed fields without cloning
  ```

  Computed field config is unchanged. Example inventory-style merge:

  ```ts
  merge: {
    Product: {
      selectionSet: '{ upc }',
      fieldName: 'products',
      key: ({ upc }) => upc,
      argsFromKeys: (upcs) => ({ upcs }),
      fields: {
        shippingEstimate: {
          selectionSet: '{ price weight }',
          computed: true,
        },
      },
    },
  }
  ```

  `shippingEstimate` stays on the schema for merge hops, but the initial `products` selection no
  longer resolves it before `price` / `weight` are available.

### Patch Changes

- [#2670](https://github.com/graphql-hive/gateway/pull/2670)
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Keep multiple merged-type `entryPoints` on
  **one** subschema instead of cloning a `SubschemaConfig` per entry.

  ### Before

  Two keys on the same subgraph used to become two registered subschemas (via
  `splitMergedTypeEntryPointsTransformer`). That duplicated stitching bookkeeping and could split
  work that should be one merge.

  ### After

  Declare every key on the same `merge` config. The planner treats the target as proxiable when
  **any** entry's keys are present; at hop time stitching picks the entry that matches the parent
  (including nested keys like `{ organization { id } }`). Parent merge defaults (`argsFromKeys`,
  `valuesFromResults`, `dataLoaderOptions`, shared `key` / `args` / `fieldName`) overlay onto each
  entry, and a per-entry custom `resolve` is honored when set.

  ```ts
  stitchSchemas({
    subschemas: [
      {
        schema: vendorSchema,
        merge: {
          Product: {
            // shared batching defaults apply to every entry unless overridden
            argsFromKeys: keys => ({ keys }),
            valuesFromResults: results => results,
            entryPoints: [
              {
                selectionSet: '{ upc }',
                fieldName: 'productsByKey',
                key: ({ upc }) => ({ upc })
              },
              {
                selectionSet: '{ id }',
                fieldName: 'productsByKey',
                key: ({ id }) => ({ id })
              }
            ]
          }
        }
      }
    ]
  })
  ```

  With a parent that only has `upc`, the first entry runs; with only `id`, the second. Nested keys
  work the same way:

  ```ts
  entryPoints: [
    {
      selectionSet: '{ organization { id } }',
      fieldName: 'productByOrg',
      key: ({ organization }) => organization?.id,
      argsFromKeys: ids => ({ ids })
    },
    {
      selectionSet: '{ upc }',
      fieldName: 'productByUpc',
      key: ({ upc }) => upc,
      argsFromKeys: upcs => ({ upcs })
    }
  ]
  ```

  No caller API change is required if you already used `entryPoints`; clones simply stop happening.

- Updated dependencies
  [[`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)]:
  - @graphql-tools/batch-execute@11.0.0

## 12.3.6

### Patch Changes

- [#2781](https://github.com/graphql-hive/gateway/pull/2781)
  [`a0bd5e8`](https://github.com/graphql-hive/gateway/commit/a0bd5e8882d04c1211c244adc991e62bb4e5c369)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Only follow own properties when merging
  forwarded deferred patches

  Deferred patch paths are made of client response keys, so merging them into the result tree only
  considers properties the tree actually owns. Aliases matching built-in object members, like
  `hasOwnProperty`, are merged like any other response key.

## 12.3.5

### Patch Changes

- [#2751](https://github.com/graphql-hive/gateway/pull/2751)
  [`b180423`](https://github.com/graphql-hive/gateway/commit/b1804230911a8cd047ee0953304469ff4cb6b131)
  Thanks [@aarne](https://github.com/aarne)! - Do not add a `null` item to a streamed list when the
  subgraph ends the stream with `{ "hasNext": false }`

- [#2767](https://github.com/graphql-hive/gateway/pull/2767)
  [`ad89e84`](https://github.com/graphql-hive/gateway/commit/ad89e8443b1839e79fa6c34a0347a2f3c67d3ec2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Resolve `@interfaceObject` fields on an
  implementation that another subgraph extends directly

  Previously the field resolved to `null` without an error, because only the implementation's
  subgraphs were considered and the `@interfaceObject` subgraph was never called.

  Closes [#2736](https://github.com/graphql-hive/gateway/issues/2736)

## 12.3.4

### Patch Changes

- [#2691](https://github.com/graphql-hive/gateway/pull/2691)
  [`3e0a896`](https://github.com/graphql-hive/gateway/commit/3e0a896cf110d8a6290e20b10b6865813301f5ca)
  Thanks [@jhonDoe15](https://github.com/jhonDoe15)! - Reduce allocation during delegation: clone
  HTTP query results only when the in-flight request has multiple consumers, construct compact fresh
  null-prototype field metadata maps, and avoid temporary fake-promise wrappers for synchronous
  composite completion. Preserve shared-request isolation, metadata descriptors, and asynchronous
  completion behavior.

## 12.3.3

### Patch Changes

- [`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^12.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.1.0)
    (from `^12.0.1`, in `dependencies`)

- Updated dependencies
  [[`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)]:
  - @graphql-tools/batch-execute@10.3.2

## 12.3.2

### Patch Changes

- Updated dependencies
  [[`9877255`](https://github.com/graphql-hive/gateway/commit/98772559ea8a529b3c6235722ac5cc7b82992c11)]:
  - @graphql-tools/batch-execute@10.3.1

## 12.3.1

### Patch Changes

- [#2687](https://github.com/graphql-hive/gateway/pull/2687)
  [`aabe28a`](https://github.com/graphql-hive/gateway/commit/aabe28a87cc4e85f590bbf4340a9c8700d544223)
  Thanks [@ardatan](https://github.com/ardatan)! - Deliver forwarded `@defer` patches for nested
  list items and avoid recursion through `wrapSchema` over a stitched schema

  When a subschema has `defer: true`, deferred fields inside list items were resolved as `null`:
  `IncrementalReceiver` did not merge patches into existing list items (including nested lists), and
  when the subgraph sent several patches in one chunk, every re-emitted patch carried the chunk's
  `hasNext: false`, so only the first one was applied.

  Without `defer: true`, a deferred field owned by another inner subschema under `wrapSchema` over a
  stitched schema called `defaultMergedResolver` on the nested schema with the same parent and
  recursed. Re-fetch via the nested merged-type resolver for the field owner instead.

- [#2701](https://github.com/graphql-hive/gateway/pull/2701)
  [`a558eea`](https://github.com/graphql-hive/gateway/commit/a558eeae3c94deb60d40f98232b9d4d82ae9d9a1)
  Thanks [@ardatan](https://github.com/ardatan)! - Settle unsatisfiable stitched leftover fields
  instead of hanging

  When a merged field could only be fetched with a merge key that never arrived, leftover resolution
  returned a deferred promise that never settled and the request hung idle. Track leftover work and,
  once the queue is empty, reject unsettled deferreds with `SATISFIABILITY_ERROR` (Apollo
  composition-style message, including selection snippet and subschema names when set).

  Closes [#2695](https://github.com/graphql-hive/gateway/issues/2695)

## 12.3.0

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

- [#2666](https://github.com/graphql-hive/gateway/pull/2666)
  [`127576a`](https://github.com/graphql-hive/gateway/commit/127576a9e823cd2425c69432166a175464882b7f)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Removed dependency
    [`@repeaterjs/repeater@^3.0.6` ↗︎](https://www.npmjs.com/package/@repeaterjs/repeater/v/3.0.6)
    (from `dependencies`)

- [#2671](https://github.com/graphql-hive/gateway/pull/2671)
  [`cd30482`](https://github.com/graphql-hive/gateway/commit/cd30482174173564e7a292f36b8dd12cc7cfab59)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix type merging for unions queried with inline
  fragments ([graphql-tools#4965](https://github.com/ardatan/graphql-tools/pull/4965) /
  [#4966](https://github.com/ardatan/graphql-tools/issues/4966)).

  Typical setup: one subschema returns a stub member (`StubMajor { id }`) while another resolves the
  real union members via `@merge`:

  ```graphql
  # students
  union Major = StubMajor
  type StubMajor {
    id: String!
  }

  # majors
  type Query {
    major(id: String!): Major @merge(keyField: "id")
  }
  union Major = MajorSuccess | MajorError
  ```

  Client query:

  ```graphql
  major {
    ... on MajorSuccess { id name }
    ... on MajorError { id code }
  }
  ```

  Three problems stacked:

  1. `@merge` on a union only registered concrete members (`MajorSuccess` / `MajorError`), not
     `Major` itself, so a `StubMajor` result never triggered merge.
  2. `MergedTypeInfo` was not built for union types, and planners assumed object/interface
     `getFields()`.
  3. Expanding a bare merge-key field (`id`) on a union into `... on StubMajor { id }` returned an
     **array** from the FIELD visitor; graphql-js `visit` nests that array as one selection instead
     of splicing it, so execution ignored the fragment and the merge key was never queried
     (`major(id: $id)` ran with empty variables).

  Fixes:

  - Register the abstract union/interface name for `@merge` as well as concrete members.
  - Build merge info for unions; treat unions as field-less so the abstract planner re-fetches via
    inline fragments.
  - Flatten nested selection arrays after union field expansion so stub keys are actually requested.

  This goes beyond the
  [schema-extension workaround](https://github.com/ardatan/graphql-tools/issues/4966#issuecomment-1670713991)
  discussed on the issue.

- Updated dependencies
  [[`680eb53`](https://github.com/graphql-hive/gateway/commit/680eb53b8d9ef9b45503c819780ff1d592773e35),
  [`62175b8`](https://github.com/graphql-hive/gateway/commit/62175b81b04237825372370de04dbdc11c239a01),
  [`680eb53`](https://github.com/graphql-hive/gateway/commit/680eb53b8d9ef9b45503c819780ff1d592773e35),
  [`befdb8e`](https://github.com/graphql-hive/gateway/commit/befdb8e3e352650c9f6c4e5fbeadfcf3615ee6ae)]:
  - @graphql-tools/batch-execute@10.3.0

## 12.2.1

### Patch Changes

- [#2644](https://github.com/graphql-hive/gateway/pull/2644)
  [`abf4091`](https://github.com/graphql-hive/gateway/commit/abf40919725f57d81ede935bee27a7b408e7d99b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Fix compatibility with GraphQL 14 and 15 by
  avoiding runtime access to the `OperationTypeNode` enum, which is only available in GraphQL 16 and
  later

  Closes [#2643](https://github.com/graphql-hive/gateway/issues/2643)

## 12.2.0

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
    [`@graphql-tools/schema@^10.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.1.1)
    (from `^10.0.29`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^12.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.0.1)
    (from `^11.0.0`, in `dependencies`)

- Updated dependencies
  [[`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830),
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830)]:
  - @graphql-tools/batch-execute@10.2.0

## 12.1.4

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
  [[`8cbdfd0`](https://github.com/graphql-hive/gateway/commit/8cbdfd01b2682e304eec51f3dd56ce57e4ec76c9)]:
  - @graphql-tools/batch-execute@10.1.0

## 12.1.3

### Patch Changes

- [#2555](https://github.com/graphql-hive/gateway/pull/2555)
  [`eb6569b`](https://github.com/graphql-hive/gateway/commit/eb6569b3ee21bdc16c67c6d356101e66e206d520)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Flush deferred merged fields without blocking
  the initial payload

  Deferred fields on merged entity types are now delegated when their deferred resolvers run instead
  of being included in the initial delegation plan. This allows the initial payload to be delivered
  before slower merged subgraph fields resolve.

## 12.1.2

### Patch Changes

- [#2544](https://github.com/graphql-hive/gateway/pull/2544)
  [`af2cccb`](https://github.com/graphql-hive/gateway/commit/af2cccb7150db504ce42ab6b463166341377614f)
  Thanks [@egoodwinx](https://github.com/egoodwinx)! - Create new getCoercedVariableValues to
  support graphql-js 17

## 12.1.1

### Patch Changes

- [#2498](https://github.com/graphql-hive/gateway/pull/2498)
  [`9ff0daf`](https://github.com/graphql-hive/gateway/commit/9ff0dafdfaa1db829dbde2c28e98c78e47fc7b24)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Fix delegated argument serialization when
  fields are filtered or renamed

  Inline enum values now remain enum literals, and original variable definitions are preserved while
  still referenced by fragments, selections, directives, or other arguments.

## 12.1.0

### Minor Changes

- [#2473](https://github.com/graphql-hive/gateway/pull/2473)
  [`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Automatically resolve plain merged-type
  references returned by local stitching resolvers

  Local fields introduced through `typeDefs` or `resolvers` are wrapped by `stitchSchemas`. When
  they return a partial merged type containing a usable key, stitching performs one initial
  delegation with type merging enabled. The existing stitching planner then handles computed fields,
  `@requires` dependencies, batching, nested entities, and fields owned by other subschemas.

### Patch Changes

- [#2473](https://github.com/graphql-hive/gateway/pull/2473)
  [`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - `defaultMergedResolver` now falls back to the
  literal field name when an external object does not have the requested response key

  Plain resolver data merged into an external object is keyed by field name, so an aliased request
  used to resolve to `null` even though the value was there:

  ```graphql
  {
    person {
      fullName: name
    }
  }
  ```

  ```ts
  // merged object carries resolver data by field name
  { id: '1', name: 'Local' }
  ```

  Previously `fullName` was `null` because only the alias was looked up. Now it resolves to
  `'Local'` by field name, matching plain graphql-js behavior. When the response key is present
  (e.g. the field came from a subschema), it is still preferred.

## 12.0.20

### Patch Changes

- [#2474](https://github.com/graphql-hive/gateway/pull/2474)
  [`8a08de3`](https://github.com/graphql-hive/gateway/commit/8a08de36be598f975ba500a28a9bd9710ead2d66)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Fix delegated argument variable type
  compatibility

  Avoid reusing variables whose types are incompatible with target schema argument types, and create
  correctly typed variables instead.

- [#2475](https://github.com/graphql-hive/gateway/pull/2475)
  [`65ce370`](https://github.com/graphql-hive/gateway/commit/65ce3702231068c946d4f95147b556cab57ad28c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Fix enum argument serialization when
  delegating to a field removed from the transformed schema.

  When a delegated query field is filtered from the transformed schema, its arguments now use the
  original subschema for type lookup. This ensures enum values are sent as typed variables instead
  of invalid quoted enum literals while preserving input field transforms for fields that remain
  exposed.

## 12.0.19

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

## 12.0.18

### Patch Changes

- Updated dependencies
  [[`4311d79`](https://github.com/graphql-hive/gateway/commit/4311d79d854a589f2f6295629b9ad5b0a5c00f92)]:
  - @graphql-tools/batch-execute@10.0.9

## 12.0.17

### Patch Changes

- [#2382](https://github.com/graphql-hive/gateway/pull/2382)
  [`3e774e0`](https://github.com/graphql-hive/gateway/commit/3e774e050bc2d3c33e0f36a258ab6a8d94bf0750)
  Thanks [@gonzo-32](https://github.com/gonzo-32)! - Fix cross-subgraph delegation for unavailable
  fields selected through inline fragments or fragment spreads on interface fields.

  The fix in `extractUnavailableFieldsFromSelectionSet` within `extractUnavailableFields.ts` now
  preserves the fragment wrapper and type condition, so concrete-type fields do not lose their type
  context and get treated as missing.

## 12.0.16

### Patch Changes

- [#2320](https://github.com/graphql-hive/gateway/pull/2320)
  [`deafdc0`](https://github.com/graphql-hive/gateway/commit/deafdc00e388ed195c2cdf77e98cd19e7d496d48)
  Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - Fix `@stream` directive
  not working for federated subgraphs with non-null scalar list return types.

  Two bugs were addressed in `delegateRequest`:

  1. `isListType` was called without first unwrapping `NonNull`, so a field typed `[String!]!` (a
     `NonNull(List(...))`) was not recognised as a list. The fix wraps the check with
     `getNullableType()`.

  2. Deduplication of already-pushed stream items used a `WeakSet`, which throws a `TypeError` for
     primitive values (strings, numbers, etc.). This was replaced with an integer index counter that
     works for both object and primitive list items.

## 12.0.15

### Patch Changes

- [#2306](https://github.com/graphql-hive/gateway/pull/2306)
  [`7171b46`](https://github.com/graphql-hive/gateway/commit/7171b46546a8e60776f70d18d14dd6fa19d5649f)
  Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - Fix incorrect error path
  when delegating a single type to a list type in a subschema.

  When using schema stitching with type merging (e.g., a supergraph `book` field delegating to a
  subschema `books` list field via batch delegation), errors from the subschema now correctly report
  the path as seen in the supergraph (e.g., `['book', 'title']`) instead of including an unexpected
  array index (e.g., `['book', 0, 'title']`).

  Also ensures `onLocatedError` is passed through in all branches of `getDelegationContext`.

## 12.0.14

### Patch Changes

- [#2243](https://github.com/graphql-hive/gateway/pull/2243)
  [`dff525f`](https://github.com/graphql-hive/gateway/commit/dff525f214d3525434c5a73a5b3fb22c46550163)
  Thanks [@qsona](https://github.com/qsona)! - Fix redundant type merging calls when subschemas have
  no explicit name.

  The fallback name-based matching in `resolveExternalValue` (introduced in
  [#1557](https://github.com/graphql-hive/gateway/issues/1557)) incorrectly matched unrelated
  subschemas when neither had an explicit `name` set, because `undefined === undefined` evaluated to
  `true`. This caused type merging to trigger even when fetching a type directly from its source
  subschema, resulting in a redundant second call.

## 12.0.13

### Patch Changes

- Updated dependencies
  [[`d2bf6af`](https://github.com/graphql-hive/gateway/commit/d2bf6af899b21e5faee5f8436f39e50fd594ab7a)]:
  - @graphql-tools/batch-execute@10.0.8

## 12.0.12

### Patch Changes

- [#2106](https://github.com/graphql-hive/gateway/pull/2106)
  [`da68d27`](https://github.com/graphql-hive/gateway/commit/da68d2710dff1f8bca5b17bcd5368e631f72114e)
  Thanks [@ardatan](https://github.com/ardatan)! - - Optimizations to select ONLY required fields
  when fetching the missing fields from other subgraphs
  - Do not try to resolve types from the subschemas which only have the stub types, for example if a
    subgraph only has `id` field as a stub, do not use that subgraph as a target subgraph for
    resolving the type, because it will not have any other fields than `id`.

## 12.0.11

### Patch Changes

- Updated dependencies
  [[`08c9da2`](https://github.com/graphql-hive/gateway/commit/08c9da28af4587aa823f3b7a10af493fa87dab87)]:
  - @graphql-tools/batch-execute@10.0.7

## 12.0.10

### Patch Changes

- [#2099](https://github.com/graphql-hive/gateway/pull/2099)
  [`dae3fe4`](https://github.com/graphql-hive/gateway/commit/dae3fe4fbb9c78598d1bbf91c2ed07ab1b90f05d)
  Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - Fix missing NPM
  provenance attestation by enabling `npmPublishProvenance` in Yarn configuration

- Updated dependencies
  [[`dae3fe4`](https://github.com/graphql-hive/gateway/commit/dae3fe4fbb9c78598d1bbf91c2ed07ab1b90f05d)]:
  - @graphql-tools/batch-execute@10.0.6

## 12.0.9

### Patch Changes

- [#2022](https://github.com/graphql-hive/gateway/pull/2022)
  [`43aaa6a`](https://github.com/graphql-hive/gateway/commit/43aaa6ab8c1c64cae92e9cdff7016ebdf1afa756)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix redundant extra calls to the same subschema
  in case of `@canonical` annotation

## 12.0.8

### Patch Changes

- [#1971](https://github.com/graphql-hive/gateway/pull/1971)
  [`4065b7f`](https://github.com/graphql-hive/gateway/commit/4065b7fbb08d9e75c5f0d3b2b4d42d665aa9dbd9)
  Thanks [@ardatan](https://github.com/ardatan)! - Reuse the existing variables from the gateway
  request correctly

  When you have an argument in a nested field that uses the variable from the gateway request like
  below;

  ```graphql
  query GetArticles($date: Datetime!) {
    view {
      articlesByDate(date: $date) {
        id
        title
        publishedAt
      }
    }
  }
  ```

  And if `Datetime` is renamed from `DateTime` in the original schema, the transform wasn't applied
  correctly to the variable definitions, and the delegation failed with an error in the subgraph
  like `Datetime` is not known.

## 12.0.7

### Patch Changes

- [#1948](https://github.com/graphql-hive/gateway/pull/1948)
  [`584a293`](https://github.com/graphql-hive/gateway/commit/584a293e3dafa7cd2d0210f80299c81b6707bcd4)
  Thanks [@Tolsee](https://github.com/Tolsee)! - Respect existing variable definitions from the
  gateway request;
  1. If the argument uses a variable definition on the gateway request, keep and re-use it as-is.

  ```graphql
  query ($var1: String = "default") {
    rootField(arg1: $var1)
  }
  ```

  2. If the argument does not use a variable definition on the gateway request, create a new
     variable definition for it and make sure it does not conflict with any existing variable
     definitions on the gateway request, because the gateway request can have variables that have
     nothing to do with the delegated argument.

  ```graphql
  query ($arg1: String = "default") {
    rootField(arg1: 2) {
      someField(arg2: $arg1)
    }
  }
  ```

  In that case it should be delegated as:

  ```graphql
  query ($arg1: String = "default", $rootField_arg1: String = "default") {
    rootField(arg1: $rootField_arg1) {
      someField(arg2: $arg1)
    }
  }
  ```

## 12.0.6

### Patch Changes

- [#1916](https://github.com/graphql-hive/gateway/pull/1916)
  [`2200fc3`](https://github.com/graphql-hive/gateway/commit/2200fc3e9b94db77a642835bbf2d646c65b3e8d0)
  Thanks [@ardatan](https://github.com/ardatan)! - - Handle the type merging order correctly with
  custom labels and percentage labels for progressive override
  - Do not pass `percent(x)` labels to the progressive override handler
  - Apply progressive override to the shared root fields

## 12.0.5

### Patch Changes

- [#1901](https://github.com/graphql-hive/gateway/pull/1901)
  [`e92c5a9`](https://github.com/graphql-hive/gateway/commit/e92c5a9702a2aea395a4a4e3a482b92f528655e8)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not add required fields if they are already
  present in the original selection set.

  For example in Federation;

  If you have a subgraph schema like below;

  ```graphql
  type Book @key(fields: "upc otherUpc shop { id }") {
    upc: ID!
    otherUpc: ID!
    shop: Shop!
  }

  type Shop @key(fields: "id") {
    id: ID!
    name: String!
    location: Location!
  }
  ```

  And when you send a mutation like below;

  ```graphql
  mutation {
    buyBook(input: { bookUpc: "test" }) {
      book {
        upc
        otherUpc
        shop {
          id
          name
          location {
            address1
            city
            state
          }
        }
      }
    }
  }
  ```

  Previously, the gateway would add the required key fields again to the selection set when
  resolving the type like below;

  ```diff
  mutation {
      buyBook(input: { bookUpc: "test" }) {
          book {
              upc
              otherUpc
  -           upc
  -           otherUpc
  -           shop { id } # from the key fields
              shop {
                  id
                  name
                  location {
                      address1
                      city
                      state
                  }
              }
          }
      }
  }
  ```

## 12.0.4

### Patch Changes

- [#1842](https://github.com/graphql-hive/gateway/pull/1842)
  [`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^11.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.0.0)
    (from `^10.10.3`, in `dependencies`)

- Updated dependencies
  [[`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f)]:
  - @graphql-tools/batch-execute@10.0.5

## 12.0.3

### Patch Changes

- [#1835](https://github.com/graphql-hive/gateway/pull/1835)
  [`dcd8f0e`](https://github.com/graphql-hive/gateway/commit/dcd8f0e93fd220cb99f79cadea759ea49bc15308)
  Thanks [@ardatan](https://github.com/ardatan)! - Delegate variable values correctly;

  When delegating requests with variables that include nested arrays, ensure that null values are
  preserved and passed correctly to the subschema. This fix addresses issues where null values in
  nested arrays were not handled properly during delegation.

  Let's say we have the following schema;

  ```ts
  makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        test(input: InputType!): [String!]
      }
      input InputType {
        value: [String!]
      }
    `,
    resolvers: {
      Query: {
        test: (_, args) => {
          // Returns the incoming variable value
          return args.input.value
        }
      }
    }
  })
  ```

  When delegating a query with a variable like:

  ```json
  {
    "query": "query Test($value: [String!]) { test(input: { value: $value } ) }",
    "variables": { "value": null }
  }
  ```

  And the result was

  ```json
  {
    "data": {
      "test": []
    }
  }
  ```

  But with this fix, the result will correctly be:

  ```json
  {
    "data": {
      "test": null
    }
  }
  ```

## 12.0.2

### Patch Changes

- [`da8b8e3`](https://github.com/graphql-hive/gateway/commit/da8b8e3f3545487249b11c6577e3889f68527249)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `getDefinedRootType` instead of
  `schema.getRootType` for GraphQL v15 compatibility

## 12.0.1

### Patch Changes

- [`0d14faf`](https://github.com/graphql-hive/gateway/commit/0d14fafdbaf3fb27eef123016ef2ca977d6688d8)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix leftover handling 2nd take

## 12.0.0

### Major Changes

- [#1708](https://github.com/graphql-hive/gateway/pull/1708)
  [`bc6cddd`](https://github.com/graphql-hive/gateway/commit/bc6cddd1c53a012dd02a1d8a7217a28e65cc6ae9)
  Thanks [@ardatan](https://github.com/ardatan)! - Breaking changes in `createRequest` function;
  - No more `sourceParentType`, `sourceFieldName`, `variableDefinitions`, `variableValues` and
    `targetRootValue`
  - `targetRootValue` has been renamed to `rootValue`
  - `targetSchema` is a required option now and `args` is also accepted as a map of the arguments of
    the target field
  - `fragments` is now an array of `FragmentDefinitionNode` instead of a record
    `{ [fragmentName: string]: FragmentDefinitionNode }`

  Breaking changes in `delegateRequest` and `delegateToSchema` functions;
  - No more `transformedSchema` option, it has been renamed to `targetSchema`
  - `targetSchema` is a required option now

### Patch Changes

- [#1727](https://github.com/graphql-hive/gateway/pull/1727)
  [`1dbc653`](https://github.com/graphql-hive/gateway/commit/1dbc6536cb992a705cac7894acca6fe5431b72de)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid extra `__typename` in the root selection

  ```diff
  query {
  - __typename
    hello
  }
  ```

- [#1743](https://github.com/graphql-hive/gateway/pull/1743)
  [`b520eb2`](https://github.com/graphql-hive/gateway/commit/b520eb2309f627578519826d6b9e0056252c6c46)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle leftovers recursively but in async Fixes
  `requires-circular` test suite's second case on federation audit repository

## 11.1.3

### Patch Changes

- [#1691](https://github.com/graphql-hive/gateway/pull/1691)
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor@^1.4.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.13)
    (from `^1.4.11`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.29` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.29)
    (from `^10.0.27`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.10.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.3)
    (from `^10.10.1`, in `dependencies`)

- Updated dependencies
  [[`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)]:
  - @graphql-tools/batch-execute@10.0.4

## 11.1.2

### Patch Changes

- [#1608](https://github.com/graphql-hive/gateway/pull/1608)
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor@^1.4.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.11)
    (from `^1.4.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.27` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.27)
    (from `^10.0.25`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.1)
    (from `^10.9.1`, in `dependencies`)
  - Removed dependency [`dset@^3.1.2` ↗︎](https://www.npmjs.com/package/dset/v/3.1.2) (from
    `dependencies`)

- [#1662](https://github.com/graphql-hive/gateway/pull/1662)
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.1)
    (from `^10.10.0`, in `dependencies`)
  - Removed dependency [`dset@^3.1.2` ↗︎](https://www.npmjs.com/package/dset/v/3.1.2) (from
    `dependencies`)

- [#1663](https://github.com/graphql-hive/gateway/pull/1663)
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor@^1.4.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.11)
    (from `^1.4.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.27` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.27)
    (from `^10.0.26`, in `dependencies`)

- Updated dependencies
  [[`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff)]:
  - @graphql-tools/batch-execute@10.0.3

## 11.1.1

### Patch Changes

- [#1654](https://github.com/graphql-hive/gateway/pull/1654)
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor@^1.4.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.10)
    (from `^1.4.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.26` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.26)
    (from `^10.0.25`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.0)
    (from `^10.9.1`, in `dependencies`)

- Updated dependencies
  [[`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851)]:
  - @graphql-tools/batch-execute@10.0.2

## 11.1.0

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

- [#1557](https://github.com/graphql-hive/gateway/pull/1557)
  [`a54b0c1`](https://github.com/graphql-hive/gateway/commit/a54b0c1777229aaeea295bcd15d4f4d6e4e615f7)
  Thanks [@ardatan](https://github.com/ardatan)! - Apply type-merging correctly in extended fields

- [#1556](https://github.com/graphql-hive/gateway/pull/1556)
  [`058ef2f`](https://github.com/graphql-hive/gateway/commit/058ef2f8373ea822fed985b705416cb39d5b6efc)
  Thanks [@ardatan](https://github.com/ardatan)! - Correct error paths in case of batch delegation
  with the same error

- [#1588](https://github.com/graphql-hive/gateway/pull/1588)
  [`20f7a50`](https://github.com/graphql-hive/gateway/commit/20f7a50c5ddb862c2921e91ca43d9858bae1bce8)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Correctly resolve circular @requires in
  different subgraphs

## 11.0.1

### Patch Changes

- [#1473](https://github.com/graphql-hive/gateway/pull/1473)
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.2)
    (from `^1.3.0`, in `dependencies`)

- Updated dependencies
  [[`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14)]:
  - @graphql-tools/batch-execute@10.0.1

## 11.0.0

### Major Changes

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Drop Node 18 support

  Least supported Node version is now v20.

### Minor Changes

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Added `subgraphName` to
  `ExecutionRequest` for easier plugin developpment.

### Patch Changes

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Fixed subgraph name being lost when
  execution requests get batched together.

- Updated dependencies
  [[`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)]:
  - @graphql-tools/batch-execute@10.0.0

## 10.2.23

### Patch Changes

- [#1358](https://github.com/graphql-hive/gateway/pull/1358)
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.4.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.9)
    (from `^1.4.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.25` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.25)
    (from `^10.0.24`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.1)
    (from `^10.9.0`, in `dependencies`)

- Updated dependencies
  [[`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)]:
  - @graphql-tools/batch-execute@9.0.19

## 10.2.22

### Patch Changes

- [#1344](https://github.com/graphql-hive/gateway/pull/1344)
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.4.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.8)
    (from `^1.4.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.24` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.24)
    (from `^10.0.11`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.9.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.0)
    (from `^10.8.1`, in `dependencies`)

- Updated dependencies
  [[`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a)]:
  - @graphql-tools/batch-execute@9.0.18

## 10.2.21

### Patch Changes

- [#1301](https://github.com/graphql-hive/gateway/pull/1301)
  [`b69c80b`](https://github.com/graphql-hive/gateway/commit/b69c80b259bd0565eb9826f7ee9bc8e6c32076d1)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Filter selection sets recursively when
  finalizing gateway requests

  Because abstract types can be nested.

## 10.2.20

### Patch Changes

- [#1280](https://github.com/graphql-hive/gateway/pull/1280)
  [`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Relocate each error in multi-error
  ExecutionResult

  Handling errors now works the same for both single-error and multi-error ExecutionResults.

- [#1280](https://github.com/graphql-hive/gateway/pull/1280)
  [`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Remove trailing spaces when merging
  multi-error responses

- [#1280](https://github.com/graphql-hive/gateway/pull/1280)
  [`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Call onLocatedError hook from delegation
  context for each error in multi-error ExecutionResult

## 10.2.19

### Patch Changes

- Updated dependencies
  [[`dca6529`](https://github.com/graphql-hive/gateway/commit/dca6529b234f1e178ad87a8992c5a7de12831128)]:
  - @graphql-tools/batch-execute@9.0.17

## 10.2.18

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
  [[`faffc17`](https://github.com/graphql-hive/gateway/commit/faffc17e72f8893e7e717d5a425205a6364e4d44)]:
  - @graphql-tools/batch-execute@9.0.16

## 10.2.17

### Patch Changes

- [#950](https://github.com/graphql-hive/gateway/pull/950)
  [`c7ea2c5`](https://github.com/graphql-hive/gateway/commit/c7ea2c5ae71b6b338ef22edd927a3fc93803965f)
  Thanks [@kroupacz](https://github.com/kroupacz)! - Errors should not be swallowed when it is
  thrown from the shared root

- [#994](https://github.com/graphql-hive/gateway/pull/994)
  [`0af3485`](https://github.com/graphql-hive/gateway/commit/0af3485abb1b3dfba4126f09d291b2096d23aa32)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not use the global \`PromiseWithResolvers\`

## 10.2.16

### Patch Changes

- [#532](https://github.com/graphql-hive/gateway/pull/532)
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.0)
    (from `^1.2.5`, in `dependencies`)

- Updated dependencies
  [[`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04)]:
  - @graphql-tools/batch-execute@9.0.15

## 10.2.15

### Patch Changes

- [#862](https://github.com/graphql-hive/gateway/pull/862)
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.2.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.2.5)
    (from `^1.0.0`, in `dependencies`)

- Updated dependencies
  [[`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)]:
  - @graphql-tools/batch-execute@9.0.14

## 10.2.14

### Patch Changes

- [#726](https://github.com/graphql-hive/gateway/pull/726)
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/promise-helpers@^1.0.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.0.0)
    (to `dependencies`)

- [#742](https://github.com/graphql-hive/gateway/pull/742)
  [`2a54e85`](https://github.com/graphql-hive/gateway/commit/2a54e85f2848aea7525703ea33918a21db96b26b)
  Thanks [@kathrynkodama](https://github.com/kathrynkodama)! - Remove the index from the batched
  error;

  In case of batched delegation (for example multiple book entitites fetched from different places
  from a field), remove the index from the error message, as it is not relevant in this case.

  [See the test](https://github.com/graphql-hive/gateway/blob/ff61b87b5928f065edfd3a6e6c0fd13bc2beac45/packages/stitch/tests/stitchSchemasPathBug.test.ts)

- Updated dependencies
  [[`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1)]:
  - @graphql-tools/batch-execute@9.0.13

## 10.2.13

### Patch Changes

- [#662](https://github.com/graphql-hive/gateway/pull/662)
  [`2318393`](https://github.com/graphql-hive/gateway/commit/2318393bc7b3aca7f53806a44b59277cd176702d)
  Thanks [@ardatan](https://github.com/ardatan)! - When a field with `@skip` and `@include`
  directives in a selection set throws, show the correct error

  ```
  // Query
  query myQuery($toInclude: Boolean! = false) {
      user(id: 1) {
          id
          name
          username
          totalReviews @include(if: $toInclude)
          # If this throws, show the actual error instead of `Argument \"if\" of required type \"Boolean!\" was provided the variable` error
      }
  }

  // Variables
  {
      "toInclude": true
  }
  ```

## 10.2.12

### Patch Changes

- [#620](https://github.com/graphql-hive/gateway/pull/620)
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.1)
    (from `^10.7.0`, in `dependencies`)

- Updated dependencies
  [[`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)]:
  - @graphql-tools/batch-execute@9.0.12

## 10.2.11

### Patch Changes

- [#506](https://github.com/graphql-hive/gateway/pull/506)
  [`9144222`](https://github.com/graphql-hive/gateway/commit/91442220b2242a0fa082d4b544d03621572eecd0)
  Thanks [@ardatan](https://github.com/ardatan)! - Add `isPrototypePollutingKey` to prevent
  accidential prototype pollution, whenever object manipulation happens with the keys based on the
  user input, it is validated to prevent prototype pollution.

  For example, `WrapQuery` takes `path` which is used to manipulate the object returned to the
  client. If the user input is `__proto__`, it will throw an error from now on but previously it
  would have polluted the prototype.

## 10.2.10

### Patch Changes

- [#471](https://github.com/graphql-hive/gateway/pull/471)
  [`18682e6`](https://github.com/graphql-hive/gateway/commit/18682e6873091afe63f09414f02f93649a4da141)
  Thanks [@ardatan](https://github.com/ardatan)! - While creating a delegation request for the
  subschema, an selection set should be spreaded on the union type field correctly.

  In case of the following schema;

  ```graphql
  type Query {
    foo: Foo
  }

  union Foo = Bar | Baz

  type Bar {
    id: ID!
    name: String
    age: Age
  }

  type Age {
    years: Int
    months: Int
  }

  type Baz {
    id: ID!
    name: Name
    age: Int
  }

  type Name {
    first: String
    last: String
  }
  ```

  If the operation is generated as following;

  ```graphql
  query {
    foo {
      id
      name
      age {
        years
        months
      }
    }
  }
  ```

  It should be spreaded on the union type field correctly as following;

  ```graphql
  query {
    foo {
      ... on Bar {
        id
        age {
          years
          months
        }
      }
      ... on Baz {
        id
        name {
          first
          last
        }
      }
    }
  }
  ```

## 10.2.9

### Patch Changes

- [#373](https://github.com/graphql-hive/gateway/pull/373)
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.3.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.10)
    (from `^1.3.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.7.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.7.0)
    (from `^10.6.2`, in `dependencies`)

- Updated dependencies
  [[`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2)]:
  - @graphql-tools/batch-execute@9.0.11

## 10.2.8

### Patch Changes

- [#322](https://github.com/graphql-hive/gateway/pull/322)
  [`23b8987`](https://github.com/graphql-hive/gateway/commit/23b89874fcf10b4cb6b1b941f29fa5f5aecf0ef2)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.3.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.8)
    (from `^1.3.6`, in `dependencies`)

## 10.2.7

### Patch Changes

- [#291](https://github.com/graphql-hive/gateway/pull/291)
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`tslib@^2.8.1` ↗︎](https://www.npmjs.com/package/tslib/v/2.8.1) (from
    `^2.5.0`, in `dependencies`)

- Updated dependencies
  [[`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)]:
  - @graphql-tools/batch-execute@9.0.10

## 10.2.6

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
    [`@graphql-tools/executor@^1.3.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.6)
    (from `^1.3.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.11)
    (from `^10.0.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.6.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.2)
    (from `^10.6.0`, in `dependencies`)

- Updated dependencies
  [[`7df2215`](https://github.com/graphql-hive/gateway/commit/7df2215abd309dc1dfd91f4ec91ce975f3982c62),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)]:
  - @graphql-tools/batch-execute@9.0.9

## 10.2.5

### Patch Changes

- [#257](https://github.com/graphql-hive/gateway/pull/257)
  [`9ce705c`](https://github.com/graphql-hive/gateway/commit/9ce705c5ccc5e6f4ac26af6e6471a6d2f4e995db)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not show internal non-nullability errors in
  the gateway

## 10.2.4

### Patch Changes

- Updated dependencies
  [[`e53d4af`](https://github.com/graphql-hive/gateway/commit/e53d4af783f9d703dea4d5e703be0dddaa337534)]:
  - @graphql-tools/batch-execute@9.0.8

## 10.2.3

### Patch Changes

- [#231](https://github.com/graphql-hive/gateway/pull/231)
  [`7ca0ff3`](https://github.com/graphql-hive/gateway/commit/7ca0ff331e42c133c4218a8086bbf0a7607f45d0)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid extensions and use \`stitchingInfo\` for
  provided fields

## 10.2.2

### Patch Changes

- [#205](https://github.com/graphql-hive/gateway/pull/205)
  [`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix missing key fields in the nested queries

## 10.2.1

### Patch Changes

- [#164](https://github.com/graphql-hive/gateway/pull/164)
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (from `^10.5.6`, in `dependencies`)

- Updated dependencies
  [[`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`f0b6921`](https://github.com/graphql-hive/gateway/commit/f0b69219fefc1b24c5511a1c623a5e3bbaf5ca0b),
  [`f71366d`](https://github.com/graphql-hive/gateway/commit/f71366d234fe8f30a419814fe1460f1e22663241)]:
  - @graphql-tools/batch-execute@9.0.7

## 10.2.0

### Minor Changes

- [#148](https://github.com/graphql-hive/gateway/pull/148)
  [`f32cb2a`](https://github.com/graphql-hive/gateway/commit/f32cb2a0289aa32e4811ced5dc1aac3efb0674f1)
  Thanks [@ardatan](https://github.com/ardatan)! - Introduce \`onDelegationPlan\` and
  \`onDelegationStageExecuteDone\` hooks

## 10.1.3

### Patch Changes

- [#118](https://github.com/graphql-hive/gateway/pull/118)
  [`73c621d`](https://github.com/graphql-hive/gateway/commit/73c621d98a4e6ca134527e349bc71223c03d06db)
  Thanks [@{](https://github.com/{)! - Do not ignore request selection set when overriding the
  fields

  ```ts
  import { buildSchema, graphql } from 'graphql';
  import { addResolversToSchema } from '@graphql-tools/schema';
  import { stitchSchemas } from '@graphql-tools/stitch';
  import { delegateToSchema } from '@graphql-tools/delegate';

  const sub_schema = addResolversToSchema({
    schema: buildSchema(`
    type Query {
      current_user: User
    }

    type User {
      id: ID!
      name: String!
      age: Int!
    }
  `),
    resolvers: {
      Query: {
        current_user: () => ({ id: '5', name: 'John Doe', age: 10 }),
      },
    },
  });

  const stitched_schema = stitchSchemas({
    subschemas: [
      {
        schema: sub_schema,
        createProxyingResolver: (options) => {
          return (_parent, _args, context, info) => {
            const operationName = info.operation.name ? info.operation.name.value : undefined;
            return delegateToSchema({
              schema: options.subschemaConfig,
              operation: options.operation,
              context,
              info,
              operationName,
            });
          };
        },
      },
    ],
    resolvers: {

        name: {
          selectionSet: '{ age }',
          resolve: (parent) => `${parent.name}(${parent.age})`, // Age should be here
        },
      },
    },
  });
  ```

## 10.1.1

### Patch Changes

- [`342e044`](https://github.com/ardatan/graphql-tools/commit/342e044c7da74aaf5df6a90ce68973c525c9aa10)
  Thanks [@ardatan](https://github.com/ardatan)! - Prevent extra queries to the same subgraph
  multiple times on the same plan, and merge iterables correctly

## 10.1.0

### Minor Changes

- [#6619](https://github.com/ardatan/graphql-tools/pull/6619)
  [`e9906eb`](https://github.com/ardatan/graphql-tools/commit/e9906eb311132ab902720e75bc787228d67c0e34)
  Thanks [@kroupacz](https://github.com/kroupacz)! - Handle shared root field queries with aliases

## 10.0.29

### Patch Changes

- [#6620](https://github.com/ardatan/graphql-tools/pull/6620)
  [`da1de08`](https://github.com/ardatan/graphql-tools/commit/da1de08c269a4cb3ed8240bf191833f7e75a6b01)
  Thanks [@kroupacz](https://github.com/kroupacz)! - - fix `subtractSelectionSets()` method - find
  field by its path correctly

## 10.0.28

### Patch Changes

- [`f470f49`](https://github.com/ardatan/graphql-tools/commit/f470f49f7d8445801a2983f14532124588f9f59e)
  Thanks [@ardatan](https://github.com/ardatan)! - Support original format of "@stream"

## 10.0.27

### Patch Changes

- [`180f3f0`](https://github.com/ardatan/graphql-tools/commit/180f3f0c8362613eb3013ff12f2d5405cd987903)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid extra calls if the keys are already
  resolved

## 10.0.26

### Patch Changes

- [#6586](https://github.com/ardatan/graphql-tools/pull/6586)
  [`8effad4`](https://github.com/ardatan/graphql-tools/commit/8effad4ffb9be1bca098b8cb6ce41b84ac7d9b6b)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements on upstream request
  execution

## 10.0.25

### Patch Changes

- [#6579](https://github.com/ardatan/graphql-tools/pull/6579)
  [`8a16b01`](https://github.com/ardatan/graphql-tools/commit/8a16b01296457bdcfbb111e02b6f6569ef8b04aa)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements on upstream request
  execution

## 10.0.24

### Patch Changes

- [#6576](https://github.com/ardatan/graphql-tools/pull/6576)
  [`4cdb462`](https://github.com/ardatan/graphql-tools/commit/4cdb46248774f2d5ae2757d40e1d55e83d7413b3)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements on upstream request
  execution

## 10.0.23

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

## 10.0.22

### Patch Changes

- Updated dependencies
  [[`cf2ce5e`](https://github.com/ardatan/graphql-tools/commit/cf2ce5ed4773087cc324599f2812f4fb91398b21)]:
  - @graphql-tools/utils@10.5.5
  - @graphql-tools/batch-execute@9.0.5
  - @graphql-tools/executor@1.3.2
  - @graphql-tools/schema@10.0.7

## 10.0.21

### Patch Changes

- [#6471](https://github.com/ardatan/graphql-tools/pull/6471)
  [`3163978`](https://github.com/ardatan/graphql-tools/commit/31639789ed385c91644c711fa4b451a5b3647e5f)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix broken complex-entity-call

## 10.0.20

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

## 10.0.19

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

## 10.0.18

### Patch Changes

- [#6420](https://github.com/ardatan/graphql-tools/pull/6420)
  [`a867bbc`](https://github.com/ardatan/graphql-tools/commit/a867bbc9b5b91e89a09447797b4c02e22e47ddb4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@repeaterjs/repeater@^3.0.6` ↗︎](https://www.npmjs.com/package/@repeaterjs/repeater/v/3.0.6)
    (to `dependencies`)

- [#6420](https://github.com/ardatan/graphql-tools/pull/6420)
  [`a867bbc`](https://github.com/ardatan/graphql-tools/commit/a867bbc9b5b91e89a09447797b4c02e22e47ddb4)
  Thanks [@ardatan](https://github.com/ardatan)! - Pass operation directives correctly to the
  subschema;

  ```graphql
  query {
    hello @someDir
  }
  ```

- [#6418](https://github.com/ardatan/graphql-tools/pull/6418)
  [`da93c08`](https://github.com/ardatan/graphql-tools/commit/da93c08b4bc22b5c9be81ed57beba8577f33118a)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix extra inline fragments for all abstract types
  in the upstream schema call

  If there are two subschemas like below, the final `Node` interface is implemented by both `Oven`
  and `Toaster` while they are not implemented in both schemas. In this case the query
  `{ products { id ... on Node { id } } }` will need to be transformed to
  `{ products { id ... on Oven { id } ... on Node { id } } }` for the first subschema. But
  previously the query planner was automatically creating inline fragments for all possible types
  which was not optimal. Now it adds inline fragments only if this case is seen.

  ```graphql
  type Query {
    products: [Product]
  }

  union Product = Oven | Toaster

  interface Node {
    id: ID!
  }

  type Oven {
    id: ID!
  }

  type Toaster implements Node {
    id: ID!
    warranty: Int
  }
  ```

  And another one like below;

  ```graphql
  interface Node {
    id: ID!
  }

  type Oven implements Node {
    id: ID!
    warranty: Int
  }
  ```

- Updated dependencies
  [[`a867bbc`](https://github.com/ardatan/graphql-tools/commit/a867bbc9b5b91e89a09447797b4c02e22e47ddb4)]:
  - @graphql-tools/executor@1.3.1
  - @graphql-tools/utils@10.3.4

## 10.0.17

### Patch Changes

- [#6403](https://github.com/ardatan/graphql-tools/pull/6403)
  [`3803897`](https://github.com/ardatan/graphql-tools/commit/3803897cef27b15bad1718819c5d75030afbe781)
  Thanks [@ardatan](https://github.com/ardatan)! - Cleanup extra fields, empty inline fragments and
  duplicate \_\_typename fields

## 10.0.16

### Patch Changes

- [`33e8146`](https://github.com/ardatan/graphql-tools/commit/33e8146e33aa17790ee76d14e52f62c684ee1b16)
  Thanks [@ardatan](https://github.com/ardatan)! - Fail on query planning phase if the query plan is
  not successful before the actual execution

- Updated dependencies
  [[`33e8146`](https://github.com/ardatan/graphql-tools/commit/33e8146e33aa17790ee76d14e52f62c684ee1b16)]:
  - @graphql-tools/executor@1.3.0

## 10.0.15

### Patch Changes

- [`d54b21a`](https://github.com/ardatan/graphql-tools/commit/d54b21a235f9632d320a32f15594ecd70b5eae29)
  Thanks [@ardatan](https://github.com/ardatan)! - If an abstract type on the gateway resolves to a
  type that does not exist on the gateway, return null instead of showing an error to the user

- [`d54b21a`](https://github.com/ardatan/graphql-tools/commit/d54b21a235f9632d320a32f15594ecd70b5eae29)
  Thanks [@ardatan](https://github.com/ardatan)! - If an enum value coming from the subschema is not
  available on gateway, do not show an error to the user but return null instead

## 10.0.14

### Patch Changes

- [#6356](https://github.com/ardatan/graphql-tools/pull/6356)
  [`8094c37`](https://github.com/ardatan/graphql-tools/commit/8094c3733c745b2ccb7adcca38024c82c42319a0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - AggregateError errors are GraphQL located
  errors

  Instead of transforming the AggregateError itself to a GraphQL located error.

  This is because of two reasons:
  - AggregateError wont lose the instanceof its class
  - Expanding the AggregateError errors will each contain the proper locations

## 10.0.13

### Patch Changes

- [#6312](https://github.com/ardatan/graphql-tools/pull/6312)
  [`7b6f77a`](https://github.com/ardatan/graphql-tools/commit/7b6f77a46177def2488ab70ce938b94d0dcf3018)
  Thanks [@ardatan](https://github.com/ardatan)! - Use native `Promise.withResolvers` when possible

## 10.0.12

### Patch Changes

- [#6278](https://github.com/ardatan/graphql-tools/pull/6278)
  [`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle `@defer`

- Updated dependencies
  [[`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c),
  [`74f995f`](https://github.com/ardatan/graphql-tools/commit/74f995f17dfea6385e08bcdd662e7ad6fcfb5dfa)]:
  - @graphql-tools/utils@10.2.3
  - @graphql-tools/executor@1.2.8

## 10.0.11

### Patch Changes

- [#6194](https://github.com/ardatan/graphql-tools/pull/6194)
  [`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle interface objects in a different way

- [#6188](https://github.com/ardatan/graphql-tools/pull/6188)
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e)
  Thanks [@ardatan](https://github.com/ardatan)! - Add `subtractSelectionSets` to get the diff of
  two selection sets

- [#6187](https://github.com/ardatan/graphql-tools/pull/6187)
  [`dfccfbf`](https://github.com/ardatan/graphql-tools/commit/dfccfbfd6633dd576f660c648f3c6cecff3667a1)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not merge errors and regular resolved objects

  If a subschema returns an error for specific field that is already resolved by another subschema,
  the error should not be merged with the resolved object.

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

- Updated dependencies
  [[`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e)]:
  - @graphql-tools/schema@10.0.4
  - @graphql-tools/utils@10.2.1

## 10.0.10

### Patch Changes

- [#6134](https://github.com/ardatan/graphql-tools/pull/6134)
  [`a83da08`](https://github.com/ardatan/graphql-tools/commit/a83da087e24929ed0734a2cff63c97bd45cc9eb4)
  Thanks [@User](https://github.com/User)! - Ignore unmerged fields

  Let's say you have a gateway schema like in the bottom, and `id` is added to the query, only if
  the `age` is requested;

  ```graphql
  # This will be sent as-is
  {
    user {
      name
    }
  }
  ```

  But the following will be transformed;

  ```graphql
  {
    user {
      name
      age
    }
  }
  ```

  Into

  ````graphql
  {
    user {
      id
      name
      age
    }
  }


  ```graphql
  type Query {

  }

  type User {
    id: ID! # is the key for all services
    name: String!
    age: Int! # This comes from another service
  }
  ````

- [#6150](https://github.com/ardatan/graphql-tools/pull/6150)
  [`fc9c71f`](https://github.com/ardatan/graphql-tools/commit/fc9c71fbc9057a8e32e0d8813b23819c631afa65)
  Thanks [@ardatan](https://github.com/ardatan)! - If there are some fields depending on a nested
  type resolution, wait until it gets resolved then resolve the rest.

  See packages/federation/test/fixtures/complex-entity-call example for more details. You can see
  `ProductList` needs some fields from `Product` to resolve `first`

## 10.0.9

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

## 10.0.8

### Patch Changes

- [`4ce3ffc`](https://github.com/ardatan/graphql-tools/commit/4ce3ffc8ec927651587e0aa236fdd573e883ef21)
  Thanks [@ardatan](https://github.com/ardatan)! - Simplify the logic in `wrapConcreteTypes`

## 10.0.7

### Patch Changes

- [#6109](https://github.com/ardatan/graphql-tools/pull/6109)
  [`074fad4`](https://github.com/ardatan/graphql-tools/commit/074fad4144095fbefe449ced397b7707963bd7aa)
  Thanks [@ardatan](https://github.com/ardatan)! - Merge list fields correctly

## 10.0.6

### Patch Changes

- [`af7be09`](https://github.com/ardatan/graphql-tools/commit/af7be099e88777bba376c14ecf191365ed3a89c7)
  Thanks [@ardatan](https://github.com/ardatan)! - Hotfix: do not use nullable and nonNullable
  prefixes if field names don't match

## 10.0.5

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

- [#6092](https://github.com/ardatan/graphql-tools/pull/6092)
  [`243c353`](https://github.com/ardatan/graphql-tools/commit/243c353412921cf0063f963ee46b9c63d2f33b41)
  Thanks [@ardatan](https://github.com/ardatan)! - If one of the subgraphs are already able to
  resolve a nested field as in `parent-entity-call` example's `Category.details` from C's `Product`,
  resolve it from there instead of using type merging.

  ```graphql
  query {
    product {
      category {
        details {
          # This is coming from C's Product, so resolve it from there instead of Type Merging
          id
          name
        }
      }
    }
  }
  ```

## 10.0.4

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.0.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.2)
    (from `^10.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.5`, in `dependencies`)

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - No unnecessary inline fragment spreads for
  union types

- Updated dependencies
  [[`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)]:
  - @graphql-tools/batch-execute@9.0.4
  - @graphql-tools/executor@1.2.1
  - @graphql-tools/schema@10.0.3

## 10.0.3

### Patch Changes

- [#5572](https://github.com/ardatan/graphql-tools/pull/5572)
  [`aadb591f`](https://github.com/ardatan/graphql-tools/commit/aadb591f8cd99560d7adba3d66a193434425b47d)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix for wrapping subscription types

## 10.0.2

### Patch Changes

- [#5477](https://github.com/ardatan/graphql-tools/pull/5477)
  [`cfd47827`](https://github.com/ardatan/graphql-tools/commit/cfd47827c0e625d1b1894e18260342576d6dd71d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `dependencies`)

- [`a59fb765`](https://github.com/ardatan/graphql-tools/commit/a59fb765a1256b914f1728283d793d61b66bdf89)
  Thanks [@ardatan](https://github.com/ardatan)! - Optimizations to get better performance in query
  planning

- Updated dependencies
  [[`a59fb765`](https://github.com/ardatan/graphql-tools/commit/a59fb765a1256b914f1728283d793d61b66bdf89)]:
  - @graphql-tools/batch-execute@9.0.1
  - @graphql-tools/utils@10.0.5

## 10.0.1

### Patch Changes

- [#5474](https://github.com/ardatan/graphql-tools/pull/5474)
  [`f31be313`](https://github.com/ardatan/graphql-tools/commit/f31be313b2af5a7c5bf893f1ce1dc7d36bf5340c)
  Thanks [@ardatan](https://github.com/ardatan)! - Optimizations for federation

## 10.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- [`8fba6cc1`](https://github.com/ardatan/graphql-tools/commit/8fba6cc1876e914d587f5b253332aaedbcaa65e6)
  Thanks [@ardatan](https://github.com/ardatan)! - Workaround for empty results

- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/batch-execute@9.0.0
  - @graphql-tools/executor@1.0.0
  - @graphql-tools/schema@10.0.0
  - @graphql-tools/utils@10.0.0

## 9.0.35

### Patch Changes

- [#5220](https://github.com/ardatan/graphql-tools/pull/5220)
  [`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements

- Updated dependencies
  [[`88244048`](https://github.com/ardatan/graphql-tools/commit/882440487551abcb5bdd4f626f3b56ac2e886f11),
  [`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)]:
  - @graphql-tools/executor@0.0.20
  - @graphql-tools/batch-execute@8.5.22

## 9.0.34

### Patch Changes

- [`2f342e43`](https://github.com/ardatan/graphql-tools/commit/2f342e430ba0d0097d1d8cb31a6abb97ed46f971)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not use promises if not async

- Updated dependencies
  [[`2f342e43`](https://github.com/ardatan/graphql-tools/commit/2f342e430ba0d0097d1d8cb31a6abb97ed46f971)]:
  - @graphql-tools/batch-execute@8.5.21

## 9.0.33

### Patch Changes

- Updated dependencies
  [[`05c97eb8`](https://github.com/ardatan/graphql-tools/commit/05c97eb888cd4b1ffbd9adb32722cd5b609292a0),
  [`05c97eb8`](https://github.com/ardatan/graphql-tools/commit/05c97eb888cd4b1ffbd9adb32722cd5b609292a0),
  [`05c97eb8`](https://github.com/ardatan/graphql-tools/commit/05c97eb888cd4b1ffbd9adb32722cd5b609292a0),
  [`f24f018a`](https://github.com/ardatan/graphql-tools/commit/f24f018aa94394766f4201b1964d473d08946bd3)]:
  - @graphql-tools/batch-execute@8.5.20
  - @graphql-tools/executor@0.0.19
  - @graphql-tools/schema@9.0.19

## 9.0.32

### Patch Changes

- Updated dependencies
  [[`91a895be`](https://github.com/ardatan/graphql-tools/commit/91a895bea32dc4226da08e8981ded3f55f4c53f3)]:
  - @graphql-tools/executor@0.0.18

## 9.0.31

### Patch Changes

- Updated dependencies
  [[`1c95368a`](https://github.com/ardatan/graphql-tools/commit/1c95368aea868be537d956ba5e994cde58dfee41)]:
  - @graphql-tools/batch-execute@8.5.19
  - @graphql-tools/executor@0.0.17
  - @graphql-tools/schema@9.0.18

## 9.0.30

### Patch Changes

- Updated dependencies
  [[`828fbf93`](https://github.com/ardatan/graphql-tools/commit/828fbf93ff317d00577c9a94402736bac5f4be39)]:
  - @graphql-tools/executor@0.0.16

## 9.0.29

### Patch Changes

- [#5131](https://github.com/ardatan/graphql-tools/pull/5131)
  [`f26392a6`](https://github.com/ardatan/graphql-tools/commit/f26392a66299956da1e66253b181f85332c93db5)
  Thanks [@neumark](https://github.com/neumark)! - Create symbols with Symbol.for() because multiple
  copies of delegate cause stitching bugs otherwise.

## 9.0.28

### Patch Changes

- [#5067](https://github.com/ardatan/graphql-tools/pull/5067)
  [`492220cb`](https://github.com/ardatan/graphql-tools/commit/492220cbdf240e7abde23af0aabcb8cbc6fd3656)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-execute@^8.5.18` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.18)
    (from `8.5.18`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor@^0.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/0.0.14)
    (from `0.0.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^9.0.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/9.0.16)
    (from `9.0.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^9.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.2.1)
    (from `9.2.1`, in `dependencies`)
  - Updated dependency [`dataloader@^2.2.2` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.2)
    (from `2.2.2`, in `dependencies`)
  - Updated dependency [`tslib@^2.5.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.5.0) (from
    `~2.5.0`, in `dependencies`)
  - Updated dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `1.0.12`, in `dependencies`)
- Updated dependencies
  [[`77c1002e`](https://github.com/ardatan/graphql-tools/commit/77c1002e2165a913508fb505513f9289db4f8cd3)]:
  - @graphql-tools/executor@0.0.15

## 9.0.27

### Patch Changes

- [#5055](https://github.com/ardatan/graphql-tools/pull/5055)
  [`30bd4d0c`](https://github.com/ardatan/graphql-tools/commit/30bd4d0c10f59147faba925dc0941c731b0532a9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dataloader@2.2.2` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.2)
    (from `2.2.1`, in `dependencies`)
- Updated dependencies
  [[`30bd4d0c`](https://github.com/ardatan/graphql-tools/commit/30bd4d0c10f59147faba925dc0941c731b0532a9)]:
  - @graphql-tools/batch-execute@8.5.18

## 9.0.26

### Patch Changes

- [#5025](https://github.com/ardatan/graphql-tools/pull/5025)
  [`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dataloader@2.2.1` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.1)
    (from `2.1.0`, in `dependencies`)
- Updated dependencies
  [[`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155),
  [`b5c8f640`](https://github.com/ardatan/graphql-tools/commit/b5c8f6407b74466ed0d2989000458cb59239e9af)]:
  - @graphql-tools/batch-execute@8.5.17
  - @graphql-tools/utils@9.2.1
  - @graphql-tools/executor@0.0.14
  - @graphql-tools/schema@9.0.16

## 9.0.25

### Patch Changes

- Updated dependencies
  [[`a94217e9`](https://github.com/ardatan/graphql-tools/commit/a94217e920c5d6237471ab6ad4d96cf230984177),
  [`62d074be`](https://github.com/ardatan/graphql-tools/commit/62d074be48779b1e096e056ca1233822c421dc99)]:
  - @graphql-tools/utils@9.2.0
  - @graphql-tools/batch-execute@8.5.16
  - @graphql-tools/executor@0.0.13
  - @graphql-tools/schema@9.0.15

## 9.0.24

### Patch Changes

- [#4995](https://github.com/ardatan/graphql-tools/pull/4995)
  [`772b948a`](https://github.com/ardatan/graphql-tools/commit/772b948ae536ac23520e704b33f450c94252f113)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`tslib@~2.5.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.5.0) (from
    `~2.4.0`, in `dependencies`)

## 9.0.23

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.14

## 9.0.22

### Patch Changes

- [#4943](https://github.com/ardatan/graphql-tools/pull/4943)
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`value-or-promise@1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `1.0.11`, in `dependencies`)
- Updated dependencies
  [[`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`e3ec35ed`](https://github.com/ardatan/graphql-tools/commit/e3ec35ed27d4a329739c8da6be06ce74c8f25591)]:
  - @graphql-tools/batch-execute@8.5.15
  - @graphql-tools/executor@0.0.12
  - @graphql-tools/schema@9.0.13
  - @graphql-tools/utils@9.1.4

## 9.0.21

### Patch Changes

- [#4920](https://github.com/ardatan/graphql-tools/pull/4920)
  [`13177794`](https://github.com/ardatan/graphql-tools/commit/131777947d111e6a952d9e0e581fd651664101a1)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle type merging with union types correctly ->
  See https://github.com/ardatan/graphql-tools/issues/4902

## 9.0.20

### Patch Changes

- [#4890](https://github.com/ardatan/graphql-tools/pull/4890)
  [`eb6cd8b6`](https://github.com/ardatan/graphql-tools/commit/eb6cd8b65dc72434348c259538b233e57a58eb1a)
  Thanks [@ardatan](https://github.com/ardatan)! - Transform provided argument values properly

- [#4890](https://github.com/ardatan/graphql-tools/pull/4890)
  [`eb6cd8b6`](https://github.com/ardatan/graphql-tools/commit/eb6cd8b65dc72434348c259538b233e57a58eb1a)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle argument definitions correctly during
  delegation and transformations

## 9.0.19

### Patch Changes

- [#4887](https://github.com/ardatan/graphql-tools/pull/4887)
  [`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix handling variables

- Updated dependencies
  [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3
  - @graphql-tools/batch-execute@8.5.14
  - @graphql-tools/executor@0.0.11
  - @graphql-tools/schema@9.0.12

## 9.0.18

### Patch Changes

- [`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix handling argument values in gateway request

- [`b5e6459f`](https://github.com/ardatan/graphql-tools/commit/b5e6459f87cd8720457ce9bff38f3dfa0cb3c150)
  Thanks [@ardatan](https://github.com/ardatan)! - Show warning only if DEBUG env var is present

- Updated dependencies
  [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b)]:
  - @graphql-tools/utils@9.1.2
  - @graphql-tools/batch-execute@8.5.13
  - @graphql-tools/executor@0.0.10
  - @graphql-tools/schema@9.0.11

## 9.0.17

### Patch Changes

- Updated dependencies
  [[`7411a5e7`](https://github.com/ardatan/graphql-tools/commit/7411a5e71a8138d9ccfe907b1fb01e62fcbb0cdb)]:
  - @graphql-tools/utils@9.1.1
  - @graphql-tools/batch-execute@8.5.12
  - @graphql-tools/executor@0.0.9
  - @graphql-tools/schema@9.0.10

## 9.0.16

### Patch Changes

- Updated dependencies
  [[`1d3856dc`](https://github.com/ardatan/graphql-tools/commit/1d3856dccaaafe2da96c91dd38dcce356bc734a3)]:
  - @graphql-tools/executor@0.0.8

## 9.0.15

### Patch Changes

- Updated dependencies
  [[`c0639dd0`](https://github.com/ardatan/graphql-tools/commit/c0639dd0065db1b5bcedaabf58b11945714bab8d)]:
  - @graphql-tools/utils@9.1.0
  - @graphql-tools/batch-execute@8.5.11
  - @graphql-tools/executor@0.0.7
  - @graphql-tools/schema@9.0.9

## 9.0.14

### Patch Changes

- Updated dependencies
  [[`d83b1960`](https://github.com/ardatan/graphql-tools/commit/d83b19605be71481ccf8effd80d5254423ea811a)]:
  - @graphql-tools/utils@9.0.1
  - @graphql-tools/batch-execute@8.5.10
  - @graphql-tools/executor@0.0.6
  - @graphql-tools/schema@9.0.8

## 9.0.13

### Patch Changes

- Updated dependencies
  [[`79e5554b`](https://github.com/ardatan/graphql-tools/commit/79e5554b524d1404f70c932cb43bdd55869ddfff),
  [`185f1e97`](https://github.com/ardatan/graphql-tools/commit/185f1e9738fbd53a894948d769e827a6e9e0ff60)]:
  - @graphql-tools/executor@0.0.5

## 9.0.12

### Patch Changes

- Updated dependencies
  [[`f47f3559`](https://github.com/ardatan/graphql-tools/commit/f47f35593d4e5b785359f4d5dbdb2981156fecba)]:
  - @graphql-tools/executor@0.0.4

## 9.0.11

### Patch Changes

- [#4796](https://github.com/ardatan/graphql-tools/pull/4796)
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)
  Thanks [@saihaj](https://github.com/saihaj)! - update `collectFields` to support collecting
  deffered values

- Updated dependencies
  [[`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`8f6d3efc`](https://github.com/ardatan/graphql-tools/commit/8f6d3efc92b25236f5a3a761ea7ba2f0a7c7f550),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)]:
  - @graphql-tools/executor@0.0.3
  - @graphql-tools/utils@9.0.0
  - @graphql-tools/batch-execute@8.5.9
  - @graphql-tools/schema@9.0.7

## 9.0.10

### Patch Changes

- Updated dependencies
  [[`f7daf777`](https://github.com/ardatan/graphql-tools/commit/f7daf7777cc214801886e4a45c0389bc5837d175)]:
  - @graphql-tools/utils@8.13.1
  - @graphql-tools/batch-execute@8.5.8
  - @graphql-tools/executor@0.0.2
  - @graphql-tools/schema@9.0.6

## 9.0.9

### Patch Changes

- [#4778](https://github.com/ardatan/graphql-tools/pull/4778)
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/executor@0.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/0.0.0)
    (to `dependencies`)
- Updated dependencies
  [[`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f)]:
  - @graphql-tools/utils@8.13.0
  - @graphql-tools/executor@0.0.1
  - @graphql-tools/batch-execute@8.5.7
  - @graphql-tools/schema@9.0.5

## 9.0.8

### Patch Changes

- [`0402894d`](https://github.com/ardatan/graphql-tools/commit/0402894d0b2747ae5d98d28df9b39d6a06cc5f2a)
  Thanks [@ardatan](https://github.com/ardatan)! - Refactor resolveExternalValue

## 9.0.7

### Patch Changes

- [`00c4a1a4`](https://github.com/ardatan/graphql-tools/commit/00c4a1a44e14b9950f44d56f44967ab7a0121706)
  Thanks [@ardatan](https://github.com/ardatan)! - If type is a list but the provided value isn't,
  do not fail and resolve that value as the member of that list type

## 9.0.6

### Patch Changes

- Updated dependencies
  [[`43c736bd`](https://github.com/ardatan/graphql-tools/commit/43c736bd1865c00898966a7ed14060496c9e6a0c)]:
  - @graphql-tools/utils@8.12.0
  - @graphql-tools/batch-execute@8.5.6
  - @graphql-tools/schema@9.0.4

## 9.0.5

### Patch Changes

- Updated dependencies
  [[`71cb4fae`](https://github.com/ardatan/graphql-tools/commit/71cb4faeb0833a228520a7bc2beed8ac7274443f),
  [`403ed450`](https://github.com/ardatan/graphql-tools/commit/403ed4507eff7cd509f410f7542a702da72e1a9a)]:
  - @graphql-tools/utils@8.11.0
  - @graphql-tools/batch-execute@8.5.5
  - @graphql-tools/schema@9.0.3

## 9.0.4

### Patch Changes

- Updated dependencies
  [[`4fe3d9c0`](https://github.com/ardatan/graphql-tools/commit/4fe3d9c037e9c138bd8a9b04b3977d74eba32c97)]:
  - @graphql-tools/utils@8.10.1
  - @graphql-tools/batch-execute@8.5.4
  - @graphql-tools/schema@9.0.2

## 9.0.3

### Patch Changes

- [`0555a972`](https://github.com/ardatan/graphql-tools/commit/0555a972f010d2b3ca93b9164b26474a78d0b20b)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump versions

## 9.0.2

### Patch Changes

- [#4648](https://github.com/ardatan/graphql-tools/pull/4648)
  [`29ee7542`](https://github.com/ardatan/graphql-tools/commit/29ee7542649e9c938bdb9c751bd3a2f56d17cb55)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not call `Transform.transformSchema` more than
  once

## 9.0.1

### Patch Changes

- Updated dependencies
  [[`2609d71f`](https://github.com/ardatan/graphql-tools/commit/2609d71f7c3a0ef2b381c51d9ce60b0de49f9b27)]:
  - @graphql-tools/utils@8.10.0
  - @graphql-tools/schema@9.0.1
  - @graphql-tools/batch-execute@8.5.3

## 9.0.0

### Major Changes

- [#4566](https://github.com/ardatan/graphql-tools/pull/4566)
  [`d8dc67aa`](https://github.com/ardatan/graphql-tools/commit/d8dc67aa6cb05bf10f5f16e90690e5ccc87b3426)
  Thanks [@ardatan](https://github.com/ardatan)! - ## Breaking changes

  **Schema generation optimization by removing `transfomedSchema` parameter**

  Previously we were applying the transforms multiple times. We needed to introduced some breaking
  changes to improve the initial wrapped/stitched schema generation performance;
  - `Transform.transformSchema` no longer accepts `transformedSchema` which can easily be created
    with `applySchemaTransforms(schema, subschemaConfig)` instead.
  - Proxying resolver factory function that is passed as `createProxyingResolver` to
    `SubschemaConfig` no longer takes `transformedSchema` which can easily be created with
    `applySchemaTransforms(schema, subschemaConfig)` instead.

  **`stitchSchemas` doesn't take nested arrays of subschemas**

  `stitchSchemas` no longer accepts an array of arrays of subschema configuration objects. Instead,
  it accepts an array of subschema configuration objects or schema objects directly.

  **`stitchSchemas` no longer prunes the schema with `pruningOptions`**

  You can use `pruneSchema` from `@graphql-tools/utils` to prune the schema instead.

  **`stitchSchemas` no longer respect "@computed" directive if stitchingDirectivesTransformer isn't
  applied**

  Also `@graphql-tools/stitch` no longer exports `computedDirectiveTransformer` and
  `defaultSubschemaConfigTransforms`. Instead, use `@graphql-tools/stitching-directives` package for
  `@computed` directive.
  [Learn more about setting it up](https://www.graphql-tools.com/docs/schema-stitching/stitch-directives-sdl#directives-glossary)

  **`computedFields` has been removed from the merged type configuration**

  `MergeTypeConfig.computedFields` setting has been removed in favor of new computed field
  configuration written as:

  ```js
  merge: {
    MyType: {
      fields: {
        myComputedField: {
          selectionSet: '{ weight }',
          computed: true,
        }
      }
    }
  }
  ```

  A field-level `selectionSet` specifies field dependencies while the `computed` setting structures
  the field in a way that assures it is always selected with this data provided. The `selectionSet`
  is intentionally generic to support possible future uses. This new pattern organizes all
  field-level configuration (including `canonical`) into a single structure.

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624)
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with
  `moduleResolution` `node16` or `nodenext`

- Updated dependencies
  [[`8cc8721f`](https://github.com/ardatan/graphql-tools/commit/8cc8721fbbff3c978fd67d162df833d6973c1860),
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)]:
  - @graphql-tools/schema@9.0.0
  - @graphql-tools/batch-execute@8.5.2
  - @graphql-tools/utils@8.9.1

## 8.8.1

### Patch Changes

- Updated dependencies [2a3b45e3]
  - @graphql-tools/utils@8.9.0
  - @graphql-tools/batch-execute@8.5.1
  - @graphql-tools/schema@8.5.1

## 8.8.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [a0abbbcd]
- Updated dependencies [d76a299c]
  - @graphql-tools/utils@8.8.0
  - @graphql-tools/batch-execute@8.5.0
  - @graphql-tools/schema@8.5.0

## 8.7.12

### Patch Changes

- 6df204de: Remove graphql-executor to have smaller bundle size
- Updated dependencies [4914970b]
  - @graphql-tools/schema@8.4.0
  - @graphql-tools/utils@8.7.0
  - @graphql-tools/batch-execute@8.4.11

## 8.7.11

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/batch-execute@8.4.10
  - @graphql-tools/schema@8.3.14
  - @graphql-tools/utils@8.6.13

## 8.7.10

### Patch Changes

- Updated dependencies [da7ad43b]
  - @graphql-tools/utils@8.6.12
  - @graphql-tools/batch-execute@8.4.9
  - @graphql-tools/schema@8.3.13

## 8.7.9

### Patch Changes

- Updated dependencies [c0762ee3]
  - @graphql-tools/utils@8.6.11
  - @graphql-tools/batch-execute@8.4.8
  - @graphql-tools/schema@8.3.12

## 8.7.8

### Patch Changes

- Updated dependencies [0fc510cb]
  - @graphql-tools/utils@8.6.10
  - @graphql-tools/batch-execute@8.4.7
  - @graphql-tools/schema@8.3.11

## 8.7.7

### Patch Changes

- Updated dependencies [31a33e2b]
  - @graphql-tools/utils@8.6.9
  - @graphql-tools/batch-execute@8.4.6
  - @graphql-tools/schema@8.3.10

## 8.7.6

### Patch Changes

- 26e4b464: relax subschema error path check

  ...as (apparently) some implementations may return path as `null` rather than not returning a
  path.

## 8.7.5

### Patch Changes

- Updated dependencies [cb238877]
  - @graphql-tools/utils@8.6.8
  - @graphql-tools/batch-execute@8.4.5
  - @graphql-tools/schema@8.3.9

## 8.7.4

### Patch Changes

- 0bbb1769: Refine generic typings using `extends X` when appropriate

  Typescript 4.7 has stricter requirements around generics which is explained well in the related
  PR: https://github.com/microsoft/TypeScript/pull/48366

  These changes resolve the errors that these packages will face when attempting to upgrade to TS
  4.7 (still in beta at the time of writing this). Landing these changes now will allow other TS
  libraries which depend on these packages to experiment with TS 4.7 in the meantime.

- Updated dependencies [0bbb1769]
  - @graphql-tools/utils@8.6.7
  - @graphql-tools/batch-execute@8.4.4
  - @graphql-tools/schema@8.3.8

## 8.7.3

### Patch Changes

- fe9402af: Bump data-loader and cross-undici-fetch
- Updated dependencies [fe9402af]
  - @graphql-tools/batch-execute@8.4.3

## 8.7.2

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6
  - @graphql-tools/batch-execute@8.4.2
  - @graphql-tools/schema@8.3.7

## 8.7.1

### Patch Changes

- Updated dependencies [722abad7]
  - @graphql-tools/schema@8.3.6

## 8.7.0

### Minor Changes

- d8fd6b94: enhance(delegate): use graphql-executor for subscriptions

## 8.6.1

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5
  - @graphql-tools/batch-execute@8.4.1
  - @graphql-tools/schema@8.3.5

## 8.6.0

### Minor Changes

- c40e801f: feat: forward gateway operation's name to subschema executors

### Patch Changes

- Updated dependencies [c40e801f]
- Updated dependencies [d36d530b]
  - @graphql-tools/batch-execute@8.4.0
  - @graphql-tools/utils@8.6.4
  - @graphql-tools/schema@8.3.4

## 8.5.4

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/batch-execute@8.3.3
  - @graphql-tools/schema@8.3.3

## 8.5.3

### Patch Changes

- 70081f8f: enhance(delegate): type is now inferred from the transformed subschema instead of
  unified schema
- 70081f8f: enhance(stitch): support promises in key functions

## 8.5.2

### Patch Changes

- b84a7809: fix(delegate): do not resolve the type twice

## 8.5.1

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/batch-execute@8.3.2
  - @graphql-tools/schema@8.3.2
  - @graphql-tools/utils@8.6.2

## 8.5.0

### Minor Changes

- 081b97e8: Add better type support for stitchSchemas using subschema transformations

## 8.4.3

### Patch Changes

- 51315610: enhance: avoid using globalThis
- Updated dependencies [51315610]
  - @graphql-tools/utils@8.5.4

## 8.4.2

### Patch Changes

- 960e178a: fix: isAsyncIterable should check if it is an object with iterator factory function
- Updated dependencies [960e178a]
- Updated dependencies [947a3fe0]
  - @graphql-tools/utils@8.5.3

## 8.4.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/batch-execute@8.3.1
  - @graphql-tools/schema@8.3.1
  - @graphql-tools/utils@8.5.1

## 8.4.0

### Minor Changes

- ad04dc79: enhance: make operationType optional

### Patch Changes

- Updated dependencies [ad04dc79]
  - @graphql-tools/batch-execute@8.3.0
  - @graphql-tools/utils@8.5.0

## 8.3.0

### Minor Changes

- 149afddb: fix: getting ready for GraphQL v16

### Patch Changes

- Updated dependencies [149afddb]
  - @graphql-tools/batch-execute@8.2.0
  - @graphql-tools/schema@8.3.0
  - @graphql-tools/utils@8.4.0

## 8.2.3

### Patch Changes

- 58262be7: enhance: show more clear error messages for aggregated error
- Updated dependencies [58262be7]
  - @graphql-tools/utils@8.3.0

## 8.2.2

### Patch Changes

- 014937db: batch-execute enhancements:
  - fixes bugs with batched fragment definitions
  - unpathed errors are now returned for all batch results
  - the "graphqlTools" prefix is simplified down to just "\_"
  - new tests and documentation
- Updated dependencies [014937db]
  - @graphql-tools/batch-execute@8.1.1
  - @graphql-tools/utils@8.2.4

## 8.2.1

### Patch Changes

- b2f18d6f: fix(delegate): pass an empty array if fieldNodes is falsy

## 8.2.0

### Minor Changes

- c5b0719c: enhance(utils): copy inspect util from graphql-js
- c5b0719c: feat: GraphQL v16 support
- c5b0719c: enhance(utils): move memoize functions to utils
- c5b0719c: enhance(utils): copy collectFields from graphql-js@16 for backwards compat

### Patch Changes

- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
  - @graphql-tools/utils@8.2.0
  - @graphql-tools/batch-execute@8.1.0
  - @graphql-tools/schema@8.2.0

## 8.1.1

### Patch Changes

- c8c13ed1: enhance: remove TypeMap and small improvements
- Updated dependencies [c8c13ed1]
  - @graphql-tools/utils@8.1.2

## 8.1.0

### Minor Changes

- 631b11bd: refactor(delegationPlanner): introduce static version of our piecemeal planner

  ...which, although undocumented, can be accessed within the StitchingInfo object saved in a
  stitched schema's extensions.

  Also improves memoization technique slightly across the board.

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions
- Updated dependencies [631b11bd]
- Updated dependencies [e50852e6]
  - @graphql-tools/batch-execute@8.0.5
  - @graphql-tools/schema@8.1.2

## 8.0.10

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1
  - @graphql-tools/batch-execute@8.0.4
  - @graphql-tools/schema@8.1.1

## 8.0.9

### Patch Changes

- 9a13357c: Fix nested type merges with repeated children ignore all but first occurrence

## 8.0.8

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0
  - @graphql-tools/schema@8.1.0
  - @graphql-tools/batch-execute@8.0.3

## 8.0.7

### Patch Changes

- d47dcf42: fix(delegate): visit list values to collect variables

## 8.0.6

### Patch Changes

- ded29f3d: fix(delegate): collect variables from directives on FragmentSpread

## 8.0.5

### Patch Changes

- 7fdef335: fix(delegate): handle variables correctly

## 8.0.4

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/batch-execute@8.0.2
  - @graphql-tools/schema@8.0.2

## 8.0.3

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/batch-execute@8.0.1
  - @graphql-tools/schema@8.0.1

## 8.0.2

### Patch Changes

- d93945fa: fix(delegate): ignore if stitchingInfo is not in extensions

## 8.0.1

### Patch Changes

- c36defbe: fix(delegate): fix ESM import

## 8.0.0

### Major Changes

- 7d3e3006: BREAKING CHANGE
  - Remove `rootValue` from subschemaConfig
  - - Pass it through `ExecutionParams` or delegation options
  - Do not pass `info.rootValue` if `rootValue` is falsy
- d53e3be5: BREAKING CHANGES;

  Refactor the core delegation transforms into individual functions to modify request and results.
  This will improve the performance considerably by reducing the number of visits over the request
  document.
  - Replace `CheckResultAndHandleErrors` with `checkResultAndHandleErrors`
  - Remove `delegationBindings`
  - Replace `AddArgumentsAsVariables`, `AddSelectionSets`, `AddTypenameToAbstract`,
    `ExpandAbstractTypes`, `FilterToSchema`, `VisitSelectionSets` and `WrapConcreteTypes` with
    `prepareGatewayDocument` and `finalizeGatewayRequest`

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

- 7d3e3006: BREAKING CHANGE
  - Now it uses the native
    [`AggregateError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError)
    implementation. The major difference is the individual errors are kept under `errors` property
    instead of the object itself with `Symbol.iterator`.
  ```js
  // From;
  for (const error of aggregateError)
  // To;
  for (const error of aggregateError.errors)
  ```
- aa43054d: BREAKING CHANGE: validations are skipped by default, use validateRequest: true to
  reenable
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
- Updated dependencies [7d3e3006]
- Updated dependencies [c42e811d]
- Updated dependencies [7d3e3006]
- Updated dependencies [8c8d4fc0]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [74581cf3]
- Updated dependencies [c0ca3190]
- Updated dependencies [7d3e3006]
- Updated dependencies [982c8f53]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
  - @graphql-tools/utils@8.0.0
  - @graphql-tools/schema@8.0.0
  - @graphql-tools/batch-execute@8.0.0

## 7.1.5

### Patch Changes

- 22a9f3da: fix(deps): follow package conventions on when to pin
- Updated dependencies [22a9f3da]
  - @graphql-tools/batch-execute@7.1.2
  - @graphql-tools/schema@7.1.5

## 7.1.4

### Patch Changes

- 61da3e82: use value-or-promise to streamline working with sync values or async promises
- Updated dependencies [61da3e82]
  - @graphql-tools/batch-execute@7.1.1
  - @graphql-tools/schema@7.1.4

## 7.1.3

### Patch Changes

- b202587b: fix(delegate): handle executor errors

## 7.1.2

### Patch Changes

- 6aed1714: Allows `MergedTypeConfig` to be written with an `entryPoints` array for multiple merged
  type entry points, each with their own `fieldName` and `selectionSet`:

  ```js
  {
    schema: testSchema,
    merge: {
      Product: {
        entryPoints: [{
          selectionSet: '{ id }',
          fieldName: 'productById',
          key: ({ id, price, weight }) => ({ id, price, weight }),
          argsFromKeys: (key) => ({ key }),
        }, {
          selectionSet: '{ upc }',
          fieldName: 'productByUpc',
          key: ({ upc, price, weight }) => ({ upc, price, weight }),
          argsFromKeys: (key) => ({ key }),
        }],
      }
    }
  }
  ```

  These multiple entry points accommodate types with multiple keys across services that rely on a
  central service to join them, for example:
  - Catalog service: `type Product { upc }`
  - Vendors service: `type Product { upc id }`
  - Reviews service: `type Product { id }`

  Given this graph, the possible traversals require the Vendors service to provide entry points for
  each unique key format:
  - `Catalog > Vendors > Reviews`
  - `Catalog < Vendors > Reviews`
  - `Catalog < Vendors < Reviews`

  Is it highly recommended that you enable query batching for subschemas with multiple entry points.

## 7.1.1

### Patch Changes

- f84e7b15: fix(delegate): export executor typings not to have breaking change
- Updated dependencies [194ac370]
  - @graphql-tools/utils@7.7.1

## 7.1.0

### Minor Changes

- 58fd4b28: feat(types): add TContext to stitchSchemas and executor

### Patch Changes

- Updated dependencies [58fd4b28]
- Updated dependencies [43da6b59]
  - @graphql-tools/batch-execute@7.1.0
  - @graphql-tools/utils@7.7.0

## 7.0.10

### Patch Changes

- 24926654: Deprecates the `MergeTypeConfig.computedFields` setting (with backwards-compatible
  warning) in favor of new computed field configuration written as:

  ```js
  merge: {
    MyType: {
      fields: {
        myComputedField: {
          selectionSet: '{ weight }',
          computed: true,
        }
      }
    }
  }
  ```

  A field-level `selectionSet` specifies field dependencies while the `computed` setting structures
  the field in a way that assures it is always selected with this data provided. The `selectionSet`
  is intentionally generic to support possible future uses. This new pattern organizes all
  field-level configuration (including `canonical`) into a single structure.

## 7.0.9

### Patch Changes

- d9b82a2e: fix(delegate) fix array check
- d9b82a2e: enhance(stitch) canonical merged type and field definitions. Use the @canonical
  directive to promote preferred type and field descriptions into the combined gateway schema.

## 7.0.8

### Patch Changes

- cd5da458: fix(stitch): type merging for nested root types

  Because root types do not usually require selectionSets, a nested root type proxied to a remote
  service may end up having an empty selectionSet, if the nested root types only includes fields
  from a different subservice.

  Empty selection sets return null, but, in this case, it should return an empty object. We can
  force this behavior by including the \_\_typename field which exists on every schema.

  Addresses #2347.

  In the future, we may want to include short-circuiting behavior that when delegating to composite
  fields, if an empty selection set is included, an empty object is returned rather than null. This
  short-circuiting behavior would be complex for lists, as it would be unclear the length of the
  list...

- cd5da458: fix(delegate): resolve external values only once

  Because items in a list may be identical and the defaultMergedResolver mutates those objects when
  resolving them as external values, a check is required so that the mutation happens only once.

  Partially addresses #2304

- Updated dependencies [cd5da458]
  - @graphql-tools/utils@7.1.6

## 7.0.7

### Patch Changes

- 1b730f80: fix(typeMerging): enable subschemas to use keys that have been renamed via transforms
- 29ead57c: fix(batch-delegate): proxy batched errors

## 7.0.6

### Patch Changes

- d40c0a84: fix(delegate): add selectionSets prior to expanding abstract types

## 7.0.5

### Patch Changes

- e50f80a3: enhance(stitch): custom merge resolvers

## 7.0.4

### Patch Changes

- 83b8e428: fix(delegate): import AggregateError polyfill (#2196)

## 7.0.3

### Patch Changes

- 856e23fa: fix(delegate): WrapConcreteTypes should not process fragments that are not on a root
  type (#2173)
- Updated dependencies [e3176633]
  - @graphql-tools/utils@7.0.2

## 7.0.2

### Patch Changes

- 718eda30: fix(stitch): fix mergeExternalObject regressions

  v7 introduced a regression in the merging of ExternalObjects that causes type merging to fail when
  undergoing multiple rounds of merging.

## 7.0.1

### Patch Changes

- 294dedda: fix(delegate): Fix type error with `arguments` being undefined
- Updated dependencies [8133a907]
- Updated dependencies [2b6c813e]
  - @graphql-tools/utils@7.0.1

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
  - @graphql-tools/batch-execute@7.0.0
  - @graphql-tools/schema@7.0.0
  - @graphql-tools/utils@7.0.0

## 6.2.4

### Patch Changes

- 32c3c4f8: enhance(stitching): improve error message for unknown types
- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/utils@6.2.4
  - @graphql-tools/schema@6.2.4
