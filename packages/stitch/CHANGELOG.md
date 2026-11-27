# @graphql-tools/stitch

## 12.0.0

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

- [#9867](https://github.com/ardatan/graphql-mesh/pull/9867)
  [`c36d9b8`](https://github.com/ardatan/graphql-mesh/commit/c36d9b8930c971558cd7471c67edf0b3783d808c)
  Thanks [@ardatan](https://github.com/ardatan)! - Surface shared-root Parallel subgraph errors when
  they explain a hole in the merged object (for example a downed subgraph), forward them through
  root proxying into graphql-js, and keep internal `CRITICAL_ERROR` / speculative `@provides` probe
  failures off successful partial results.

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
  [`c36d9b8`](https://github.com/ardatan/graphql-mesh/commit/c36d9b8930c971558cd7471c67edf0b3783d808c),
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc)]:
  - @graphql-tools/batch-delegate@12.0.0
  - @graphql-tools/delegate@14.0.0
  - @graphql-tools/wrap@13.0.0

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

- [#2763](https://github.com/graphql-hive/gateway/pull/2763)
  [`4eb4a6c`](https://github.com/graphql-hive/gateway/commit/4eb4a6c89176a04a38ced9cd99608e6c639fd5ee)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Support GraphQL v17

  Hive Gateway and the stitching, wrapping and federation packages work with GraphQL v17 alongside
  v16. The `graphql` peer dependency range stays `^16 || ^17`, so projects that install the packages
  themselves keep the GraphQL version they already use.

  Schema stitching, schema wrapping (including `TransformEnumValues` with defaults defined in SDL),
  `federationToStitchingSDL` and demand control behave the same on both versions.

  ## Docker images and binary ship GraphQL v17

  The Hive Gateway Docker images and the standalone binary come with `graphql@17.1.0`. Custom code
  loaded by the gateway configuration, like plugins, additional resolvers, transforms and hooks,
  runs against GraphQL v17. Code that only uses the gateway APIs needs no changes. Code that uses
  GraphQL internals directly might, see the
  [GraphQL.js v16 to v17 upgrade guide](https://www.graphql-js.org/upgrade-guides/v16-v17/) for all
  changes.

  ### Variable values in resolver info

  `info.variableValues` is an object of `{ sources, coerced }` instead of a flat map of variable
  names to values. Read the variable values from `info.variableValues.coerced`, or use
  `getCoercedVariableValues` from `@graphql-tools/delegate` to support both versions.

  ```ts
  import { getCoercedVariableValues } from '@graphql-tools/delegate'

  const variables = getCoercedVariableValues(info.variableValues)
  ```

  ### Calling `getArgumentValues` and `getDirectiveValues`

  The `variableValues` argument of `getArgumentValues` and `getDirectiveValues` from `graphql`
  expects the `{ sources, coerced }` shape too. Wrap a flat map of variables with
  `asGetArgumentValuesVariables` from `@graphql-tools/utils`, which works with both versions.

  ```ts
  import { getArgumentValues } from 'graphql'
  import { asGetArgumentValuesVariables } from '@graphql-tools/utils'

  const args = getArgumentValues(field, fieldNode, asGetArgumentValuesVariables(variables))
  ```

  ### Empty lists in parsed documents

  Parsed documents leave out empty lists. For example, a field without arguments has `arguments` set
  to `undefined` instead of `[]`, and the same goes for `directives`, `variableDefinitions`,
  `interfaces` and `fields`. Use optional chaining or a fallback like `node.directives ?? []` when
  reading them.

  ### Default values defined in SDL

  Default values of arguments and input fields defined in SDL are kept as an AST node in
  `default.literal`, and `defaultValue` is `undefined`. Read `default` first and fall back to
  `defaultValue` to support both versions. When mapping a schema and changing a default, set
  `default` to `undefined` next to the new `defaultValue`, otherwise the literal from SDL is still
  used.

  ### Custom scalars

  Scalars have the `coerceOutputValue`, `coerceInputValue`, `coerceInputLiteral` and
  `valueToLiteral` functions next to the deprecated `serialize`, `parseValue` and `parseLiteral`.
  When building a scalar from another scalar's `toConfig()` and replacing its coercion, replace the
  new functions too, otherwise they keep coercing with the original implementation.

  ### Errors

  `GraphQLError` sets the standard `cause` property to its original error. Errors from subgraphs
  that the gateway relays to clients have the subgraph error as `cause`. What clients receive stays
  the same.

  ### Printing and introspection

  `print` formats object values with spaces, like `{ a: 1 }` instead of `{a: 1}`, and breaks long
  ones over several lines. The `reason` argument of `@deprecated` and the `includeDeprecated`
  argument of introspection fields are non-nullable. Update snapshots or string comparisons of
  printed documents and introspection results.

  Closes [#2750](https://github.com/graphql-hive/gateway/issues/2750)

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

### Patch Changes

- Updated dependencies
  [[`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`4eb4a6c`](https://github.com/graphql-hive/gateway/commit/4eb4a6c89176a04a38ced9cd99608e6c639fd5ee),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)]:
  - @graphql-tools/delegate@13.0.0
  - @graphql-tools/batch-delegate@11.0.0
  - @graphql-tools/wrap@12.0.0

## 10.4.6

### Patch Changes

- Updated dependencies
  [[`a0bd5e8`](https://github.com/graphql-hive/gateway/commit/a0bd5e8882d04c1211c244adc991e62bb4e5c369)]:
  - @graphql-tools/delegate@12.3.6
  - @graphql-tools/batch-delegate@10.1.8
  - @graphql-tools/wrap@11.2.8

## 10.4.5

### Patch Changes

- [#2767](https://github.com/graphql-hive/gateway/pull/2767)
  [`ad89e84`](https://github.com/graphql-hive/gateway/commit/ad89e8443b1839e79fa6c34a0347a2f3c67d3ec2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Keep fields of named fragments spread on an
  interface when fetching the concrete type from the implementing subgraph

  For example, `node { ...NodeFields }` with `fragment NodeFields on Node { ... on Leaf { extra } }`
  now fetches `extra` instead of returning `null` for it.

  Closes [#2463](https://github.com/graphql-hive/gateway/issues/2463)

- [#2767](https://github.com/graphql-hive/gateway/pull/2767)
  [`ad89e84`](https://github.com/graphql-hive/gateway/commit/ad89e8443b1839e79fa6c34a0347a2f3c67d3ec2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Fetch `@requires` fields of an
  `@interfaceObject` field when it is selected through an inline fragment on an implementation

  For example, `location { ... on Store { events } }` where `events` is `@requires(fields: "code")`
  on the `Location` interface object now sends `code` to the contributing subgraph.

  Closes [#2737](https://github.com/graphql-hive/gateway/issues/2737)

- Updated dependencies
  [[`b180423`](https://github.com/graphql-hive/gateway/commit/b1804230911a8cd047ee0953304469ff4cb6b131),
  [`ad89e84`](https://github.com/graphql-hive/gateway/commit/ad89e8443b1839e79fa6c34a0347a2f3c67d3ec2)]:
  - @graphql-tools/delegate@12.3.5
  - @graphql-tools/batch-delegate@10.1.7
  - @graphql-tools/wrap@11.2.7

## 10.4.4

### Patch Changes

- Updated dependencies
  [[`3e0a896`](https://github.com/graphql-hive/gateway/commit/3e0a896cf110d8a6290e20b10b6865813301f5ca)]:
  - @graphql-tools/delegate@12.3.4
  - @graphql-tools/batch-delegate@10.1.6
  - @graphql-tools/wrap@11.2.6

## 10.4.3

### Patch Changes

- [`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^12.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.1.0)
    (from `^12.0.1`, in `dependencies`)

- Updated dependencies
  [[`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)]:
  - @graphql-tools/batch-delegate@10.1.5
  - @graphql-tools/delegate@12.3.3
  - @graphql-tools/wrap@11.2.5

## 10.4.2

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@12.3.2
  - @graphql-tools/batch-delegate@10.1.4
  - @graphql-tools/wrap@11.2.4

## 10.4.1

### Patch Changes

- Updated dependencies
  [[`4c1d3f0`](https://github.com/graphql-hive/gateway/commit/4c1d3f01c4e2842d9fd2c1f81a3f753da1d57405),
  [`aabe28a`](https://github.com/graphql-hive/gateway/commit/aabe28a87cc4e85f590bbf4340a9c8700d544223),
  [`a558eea`](https://github.com/graphql-hive/gateway/commit/a558eeae3c94deb60d40f98232b9d4d82ae9d9a1)]:
  - @graphql-tools/batch-delegate@10.1.3
  - @graphql-tools/delegate@12.3.1
  - @graphql-tools/wrap@11.2.3

## 10.4.0

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

- [#2671](https://github.com/graphql-hive/gateway/pull/2671)
  [`cd30482`](https://github.com/graphql-hive/gateway/commit/cd30482174173564e7a292f36b8dd12cc7cfab59)
  Thanks [@ardatan](https://github.com/ardatan)! - Allow `@merge` without `keyArg` when the resolver
  takes zero arguments, and make keyless type merges work when the initial subschema cannot satisfy
  the requested fields ([graphql-tools#4337](https://github.com/ardatan/graphql-tools/pull/4337)).

  Previously the validator rejected `@merge` on zero-arg fields (`args.length !== 1`). It now allows
  zero or one argument and only errors when there are multiple args without `keyArg` / `argsExpr`.

  Separately, keyless merges such as:

  ```ts
  merge: {
    Stats: {
      fieldName: 'stats',
      args: () => ({}),
    },
  }
  ```

  had no key `selectionSet`. When the subschema that owned `Query.stats` did not have the requested
  fields (for example querying only `totalChirps` while that field lived on the other subschema),
  `finalizeGatewayRequest` stripped the empty nested selection and failed with "The request must
  contain at least one operation."

  For merged types that have resolvers but no key `selectionSet`, stitching now injects `__typename`
  into `fieldNodesByType` so a stub object remains and type merging can fill the remaining fields.
  This matches the partial-field failure called out in
  [this discussion](https://github.com/ardatan/graphql-tools/pull/4337#issuecomment-1086893317).
  Keyed merges (`selectionSet: '{ id }'`) are unchanged.

- [#2671](https://github.com/graphql-hive/gateway/pull/2671)
  [`cd30482`](https://github.com/graphql-hive/gateway/commit/cd30482174173564e7a292f36b8dd12cc7cfab59)
  Thanks [@ardatan](https://github.com/ardatan)! - Merged type resolvers now preserve the parent
  `mutation` operation when the merge entry point lives on `Mutation`
  ([graphql-tools#4549](https://github.com/ardatan/graphql-tools/pull/4549)).

  Previously `createMergedTypeResolver` always used `operation: 'query'`. When type merging ran
  during a mutation and the merge entry point existed only under `Mutation` (or the subgraph
  rejected mutation fields executed as queries), merged fields came back null.

  Example: two subschemas each expose `Mutation.zeroUser` / `Mutation.oneUser` as merge entry points
  for `User`. A client mutation that selects fields from both users now re-delegates those merges as
  mutations, so subgraphs that distinguish mutation vs query resolvers keep working.

  Query-only merge fields (Federation `_entities`) still delegate as `query` even when the gateway
  operation is a mutation. Subscriptions are also unchanged: merges while resolving a subscription
  event use `query`, because you cannot re-subscribe for entity fields. Scope follows the
  [mutation-vs-query discussion](https://github.com/ardatan/graphql-tools/pull/4549#issuecomment-1173573076).

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
  [[`127576a`](https://github.com/graphql-hive/gateway/commit/127576a9e823cd2425c69432166a175464882b7f),
  [`befdb8e`](https://github.com/graphql-hive/gateway/commit/befdb8e3e352650c9f6c4e5fbeadfcf3615ee6ae),
  [`cd30482`](https://github.com/graphql-hive/gateway/commit/cd30482174173564e7a292f36b8dd12cc7cfab59)]:
  - @graphql-tools/delegate@12.3.0
  - @graphql-tools/batch-delegate@10.1.2
  - @graphql-tools/wrap@11.2.2

## 10.3.2

### Patch Changes

- Updated dependencies
  [[`abf4091`](https://github.com/graphql-hive/gateway/commit/abf40919725f57d81ede935bee27a7b408e7d99b)]:
  - @graphql-tools/delegate@12.2.1
  - @graphql-tools/batch-delegate@10.1.1
  - @graphql-tools/wrap@11.2.1

## 10.3.1

### Patch Changes

- [#2591](https://github.com/graphql-hive/gateway/pull/2591)
  [`8f582af`](https://github.com/graphql-hive/gateway/commit/8f582af7e2cd250d9538495487c33a64b038bcb4)
  Thanks [@kpiotr](https://github.com/kpiotr)! - `stitchSchemas` no longer mutates the resolver
  objects passed in `resolvers`.

  The wrapper it adds around resolvers of fields that return a merged type (so the merged type's
  fields get resolved) used to be written back into the caller's field config
  (`existing.resolve = wrappedResolve`). A resolver map reused across `stitchSchemas` calls — a
  gateway's additional resolvers on every supergraph reload — therefore gained one wrapper per call,
  and every wrapper kept its call's `stitchingInfo`, and with it the entire superseded schema,
  subschemas and executors, reachable: a heap leak of one schema generation per reload.

  Nesting also changed behaviour, because `wrappedResolve` closes over its own call's
  `stitchingInfo` and the innermost (oldest) wrapper runs first: such a field hydrated through a
  superseded call's stitching plan and executors, and once that hydration satisfied the selection
  the newest wrapper found nothing left to resolve.

  The merged resolver map is now cloned before the wrappers are added. Enum value maps, scalars,
  union and input type resolvers and plain resolver functions are still passed through by reference,
  so their identities are unchanged.

## 10.3.0

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
  [`ee4cc07`](https://github.com/graphql-hive/gateway/commit/ee4cc07097926293a8628c075a264e272cad8830)]:
  - @graphql-tools/batch-delegate@10.1.0
  - @graphql-tools/delegate@12.2.0
  - @graphql-tools/wrap@11.2.0

## 10.2.5

### Patch Changes

- Updated dependencies
  [[`e5ea5f4`](https://github.com/graphql-hive/gateway/commit/e5ea5f419bb27abe24e6962f07fd98fb886464f7)]:
  - @graphql-tools/delegate@12.1.4
  - @graphql-tools/batch-delegate@10.0.32
  - @graphql-tools/wrap@11.1.24

## 10.2.4

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
  - @graphql-tools/batch-delegate@10.0.31
  - @graphql-tools/wrap@11.1.23

## 10.2.3

### Patch Changes

- Updated dependencies
  [[`af2cccb`](https://github.com/graphql-hive/gateway/commit/af2cccb7150db504ce42ab6b463166341377614f)]:
  - @graphql-tools/delegate@12.1.2
  - @graphql-tools/batch-delegate@10.0.30
  - @graphql-tools/wrap@11.1.22

## 10.2.2

### Patch Changes

- Updated dependencies
  [[`9ff0daf`](https://github.com/graphql-hive/gateway/commit/9ff0dafdfaa1db829dbde2c28e98c78e47fc7b24)]:
  - @graphql-tools/delegate@12.1.1
  - @graphql-tools/batch-delegate@10.0.29
  - @graphql-tools/wrap@11.1.21

## 10.2.1

### Patch Changes

- [#2484](https://github.com/graphql-hive/gateway/pull/2484)
  [`a589a2d`](https://github.com/graphql-hive/gateway/commit/a589a2d9797e67623b28439d0bd30a17e3a247d6)
  Thanks [@jdolle](https://github.com/jdolle)! - Reduce peak memory consumption for `stitchSchemas`
  function

## 10.2.0

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
  [`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc)]:
  - @graphql-tools/delegate@12.1.0
  - @graphql-tools/batch-delegate@10.0.28
  - @graphql-tools/wrap@11.1.20

## 10.1.25

### Patch Changes

- Updated dependencies
  [[`8a08de3`](https://github.com/graphql-hive/gateway/commit/8a08de36be598f975ba500a28a9bd9710ead2d66),
  [`65ce370`](https://github.com/graphql-hive/gateway/commit/65ce3702231068c946d4f95147b556cab57ad28c)]:
  - @graphql-tools/delegate@12.0.20
  - @graphql-tools/batch-delegate@10.0.27
  - @graphql-tools/wrap@11.1.19

## 10.1.24

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
  - @graphql-tools/batch-delegate@10.0.26
  - @graphql-tools/wrap@11.1.18

## 10.1.23

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@12.0.18
  - @graphql-tools/batch-delegate@10.0.25
  - @graphql-tools/wrap@11.1.17

## 10.1.22

### Patch Changes

- [#2401](https://github.com/graphql-hive/gateway/pull/2401)
  [`83465de`](https://github.com/graphql-hive/gateway/commit/83465def4d854d1f0912f635bd9621433fd33c8b)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix `mergeDirectives` option and default it to
  `true`

  Custom directive definitions from subschemas were silently dropped from the stitched schema unless
  `mergeDirectives: true` was explicitly passed to `stitchSchemas`. This meant a schema like:

  ```graphql
  directive @public on SCHEMA | OBJECT | FIELD_DEFINITION

  type Query @public {
    isAnExample: Boolean @public
  }
  ```

  would stitch into a broken schema where `@public` was used on types and fields but never defined.

  The default is now `true`, so directive definitions are always collected and retained in the
  stitched schema, this is the expected behaviour since the merging was partial before this fix
  (usages got merged, but definitions not).

  Passing `mergeDirectives: false` now produces a fully clean result - both directive definitions
  and all their usages on types, fields, input fields, and enum values are stripped.

## 10.1.21

### Patch Changes

- Updated dependencies
  [[`b6230c9`](https://github.com/graphql-hive/gateway/commit/b6230c97709065c2f540b6d263af492379eca359)]:
  - @graphql-tools/batch-delegate@10.0.24

## 10.1.20

### Patch Changes

- Updated dependencies
  [[`3e774e0`](https://github.com/graphql-hive/gateway/commit/3e774e050bc2d3c33e0f36a258ab6a8d94bf0750)]:
  - @graphql-tools/delegate@12.0.17
  - @graphql-tools/batch-delegate@10.0.23
  - @graphql-tools/wrap@11.1.16

## 10.1.19

### Patch Changes

- Updated dependencies
  [[`deafdc0`](https://github.com/graphql-hive/gateway/commit/deafdc00e388ed195c2cdf77e98cd19e7d496d48)]:
  - @graphql-tools/delegate@12.0.16
  - @graphql-tools/batch-delegate@10.0.22
  - @graphql-tools/wrap@11.1.15

## 10.1.18

### Patch Changes

- Updated dependencies
  [[`dff525f`](https://github.com/graphql-hive/gateway/commit/dff525f214d3525434c5a73a5b3fb22c46550163)]:
  - @graphql-tools/delegate@12.0.14
  - @graphql-tools/batch-delegate@10.0.20
  - @graphql-tools/wrap@11.1.14

## 10.1.17

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@12.0.13
  - @graphql-tools/batch-delegate@10.0.19
  - @graphql-tools/wrap@11.1.13

## 10.1.16

### Patch Changes

- Updated dependencies
  [[`da68d27`](https://github.com/graphql-hive/gateway/commit/da68d2710dff1f8bca5b17bcd5368e631f72114e)]:
  - @graphql-tools/delegate@12.0.12
  - @graphql-tools/batch-delegate@10.0.18
  - @graphql-tools/wrap@11.1.12

## 10.1.15

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@12.0.11
  - @graphql-tools/batch-delegate@10.0.17
  - @graphql-tools/wrap@11.1.11

## 10.1.14

### Patch Changes

- Updated dependencies
  [[`dae3fe4`](https://github.com/graphql-hive/gateway/commit/dae3fe4fbb9c78598d1bbf91c2ed07ab1b90f05d)]:
  - @graphql-tools/wrap@11.1.10
  - @graphql-tools/delegate@12.0.10
  - @graphql-tools/batch-delegate@10.0.16

## 10.1.13

### Patch Changes

- [#2022](https://github.com/graphql-hive/gateway/pull/2022)
  [`43aaa6a`](https://github.com/graphql-hive/gateway/commit/43aaa6ab8c1c64cae92e9cdff7016ebdf1afa756)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix redundant extra calls to the same subschema
  in case of `@canonical` annotation

- Updated dependencies
  [[`43aaa6a`](https://github.com/graphql-hive/gateway/commit/43aaa6ab8c1c64cae92e9cdff7016ebdf1afa756)]:
  - @graphql-tools/delegate@12.0.9
  - @graphql-tools/batch-delegate@10.0.15
  - @graphql-tools/wrap@11.1.9

## 10.1.12

### Patch Changes

- Updated dependencies
  [[`4065b7f`](https://github.com/graphql-hive/gateway/commit/4065b7fbb08d9e75c5f0d3b2b4d42d665aa9dbd9)]:
  - @graphql-tools/delegate@12.0.8
  - @graphql-tools/batch-delegate@10.0.14
  - @graphql-tools/wrap@11.1.8

## 10.1.11

### Patch Changes

- Updated dependencies
  [[`584a293`](https://github.com/graphql-hive/gateway/commit/584a293e3dafa7cd2d0210f80299c81b6707bcd4)]:
  - @graphql-tools/delegate@12.0.7
  - @graphql-tools/batch-delegate@10.0.13
  - @graphql-tools/wrap@11.1.7

## 10.1.10

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
  - @graphql-tools/batch-delegate@10.0.12
  - @graphql-tools/wrap@11.1.6

## 10.1.9

### Patch Changes

- Updated dependencies
  [[`e92c5a9`](https://github.com/graphql-hive/gateway/commit/e92c5a9702a2aea395a4a4e3a482b92f528655e8)]:
  - @graphql-tools/delegate@12.0.5
  - @graphql-tools/batch-delegate@10.0.11
  - @graphql-tools/wrap@11.1.5

## 10.1.8

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
  [`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f)]:
  - @graphql-tools/batch-delegate@10.0.10
  - @graphql-tools/delegate@12.0.4
  - @graphql-tools/wrap@11.1.4

## 10.1.7

### Patch Changes

- Updated dependencies
  [[`dcd8f0e`](https://github.com/graphql-hive/gateway/commit/dcd8f0e93fd220cb99f79cadea759ea49bc15308)]:
  - @graphql-tools/delegate@12.0.3
  - @graphql-tools/batch-delegate@10.0.9
  - @graphql-tools/wrap@11.1.3

## 10.1.6

### Patch Changes

- Updated dependencies
  [[`da8b8e3`](https://github.com/graphql-hive/gateway/commit/da8b8e3f3545487249b11c6577e3889f68527249)]:
  - @graphql-tools/delegate@12.0.2
  - @graphql-tools/batch-delegate@10.0.8
  - @graphql-tools/wrap@11.1.2

## 10.1.5

### Patch Changes

- Updated dependencies
  [[`0d14faf`](https://github.com/graphql-hive/gateway/commit/0d14fafdbaf3fb27eef123016ef2ca977d6688d8)]:
  - @graphql-tools/delegate@12.0.1
  - @graphql-tools/batch-delegate@10.0.7
  - @graphql-tools/wrap@11.1.1

## 10.1.4

### Patch Changes

- [#1735](https://github.com/graphql-hive/gateway/pull/1735)
  [`55173a5`](https://github.com/graphql-hive/gateway/commit/55173a55344a07fdf9531efcbaa4cb142fff655e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Ensure key fields propagate correctly for
  interface/object combinations

- [#1727](https://github.com/graphql-hive/gateway/pull/1727)
  [`1dbc653`](https://github.com/graphql-hive/gateway/commit/1dbc6536cb992a705cac7894acca6fe5431b72de)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid extra `__typename` in the root selection

  ```diff
  query {
  - __typename
    hello
  }
  ```

- Updated dependencies
  [[`bc6cddd`](https://github.com/graphql-hive/gateway/commit/bc6cddd1c53a012dd02a1d8a7217a28e65cc6ae9),
  [`1dbc653`](https://github.com/graphql-hive/gateway/commit/1dbc6536cb992a705cac7894acca6fe5431b72de),
  [`bc6cddd`](https://github.com/graphql-hive/gateway/commit/bc6cddd1c53a012dd02a1d8a7217a28e65cc6ae9),
  [`b520eb2`](https://github.com/graphql-hive/gateway/commit/b520eb2309f627578519826d6b9e0056252c6c46)]:
  - @graphql-tools/wrap@11.1.0
  - @graphql-tools/delegate@12.0.0
  - @graphql-tools/batch-delegate@10.0.6

## 10.1.3

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
    [`@graphql-tools/schema@^10.0.29` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.29)
    (from `^10.0.27`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.10.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.3)
    (from `^10.10.1`, in `dependencies`)

- Updated dependencies
  [[`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb),
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)]:
  - @graphql-tools/batch-delegate@10.0.5
  - @graphql-tools/delegate@11.1.3
  - @graphql-tools/wrap@11.0.5

## 10.1.2

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

- [#1662](https://github.com/graphql-hive/gateway/pull/1662)
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.1)
    (from `^10.10.0`, in `dependencies`)

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
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a),
  [`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a)]:
  - @graphql-tools/batch-delegate@10.0.4
  - @graphql-tools/delegate@11.1.2
  - @graphql-tools/wrap@11.0.4

## 10.1.1

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

- [#1656](https://github.com/graphql-hive/gateway/pull/1656)
  [`3226919`](https://github.com/graphql-hive/gateway/commit/3226919d58930289491696fa3b56ed85c766e3f5)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Fix Progressive Override to prevent caching
  on different variations of override

- Updated dependencies
  [[`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851),
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851)]:
  - @graphql-tools/batch-delegate@10.0.3
  - @graphql-tools/delegate@11.1.1
  - @graphql-tools/wrap@11.0.3

## 10.1.0

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
  [[`a54b0c1`](https://github.com/graphql-hive/gateway/commit/a54b0c1777229aaeea295bcd15d4f4d6e4e615f7),
  [`058ef2f`](https://github.com/graphql-hive/gateway/commit/058ef2f8373ea822fed985b705416cb39d5b6efc),
  [`a8458b2`](https://github.com/graphql-hive/gateway/commit/a8458b24e71fda37a515eaf9ac9af43a73e7823f),
  [`20f7a50`](https://github.com/graphql-hive/gateway/commit/20f7a50c5ddb862c2921e91ca43d9858bae1bce8)]:
  - @graphql-tools/delegate@11.1.0
  - @graphql-tools/batch-delegate@10.0.2
  - @graphql-tools/wrap@11.0.2

## 10.0.2

### Patch Changes

- [#1546](https://github.com/graphql-hive/gateway/pull/1546)
  [`818461e`](https://github.com/graphql-hive/gateway/commit/818461e6ea55bb10ba4ead9ed214848e1ba4bfd2)
  Thanks [@ardatan](https://github.com/ardatan)! - Normalize the subschemas with root types in a
  custom names like `query_root` instead of `Query`, then stitch them

  ```graphql
  schema {
    query: query_root
    subscription: subscription_root
  }

  type Post {
    id: ID!
    text: String
    userId: ID!
  }

  type query_root {
    postById(id: ID!): Post
  }

  type subscription_root {
    postsByUserId(userId: ID!): [Post]!
  }
  ```

  and

  ```graphql
  type User {
    id: ID!
    email: String
  }

  type Query {
    userById(id: ID!): User
  }
  ```

  should be stitched as;

  ```graphql
  type Query {
    postById(id: ID!): Post
    userById(id: ID!): User
  }

  type Subscription {
    postsByUserId(userId: ID!): [Post]!
  }

  type Post {
    id: ID!
    text: String
    userId: ID!
  }

  type User {
    id: ID!
    email: String
  }
  ```

## 10.0.1

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
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14)]:
  - @graphql-tools/batch-delegate@10.0.1
  - @graphql-tools/delegate@11.0.1
  - @graphql-tools/wrap@11.0.1

## 10.0.0

### Major Changes

- [#956](https://github.com/graphql-hive/gateway/pull/956)
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Drop Node 18 support

  Least supported Node version is now v20.

### Patch Changes

- Updated dependencies
  [[`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a),
  [`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)]:
  - @graphql-tools/batch-delegate@10.0.0
  - @graphql-tools/delegate@11.0.0
  - @graphql-tools/wrap@11.0.0

## 9.4.29

### Patch Changes

- [#1405](https://github.com/graphql-hive/gateway/pull/1405)
  [`29f0409`](https://github.com/graphql-hive/gateway/commit/29f0409fe851b45d717ab5d0f5651dde3012e913)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle `@oneOf` directive properly while
  stitching subschemas

## 9.4.28

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
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)]:
  - @graphql-tools/batch-delegate@9.0.41
  - @graphql-tools/delegate@10.2.23
  - @graphql-tools/wrap@10.1.4

## 9.4.27

### Patch Changes

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

- Updated dependencies
  [[`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a),
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a)]:
  - @graphql-tools/batch-delegate@9.0.40
  - @graphql-tools/delegate@10.2.22
  - @graphql-tools/wrap@10.1.3

## 9.4.26

### Patch Changes

- Updated dependencies
  [[`b69c80b`](https://github.com/graphql-hive/gateway/commit/b69c80b259bd0565eb9826f7ee9bc8e6c32076d1)]:
  - @graphql-tools/delegate@10.2.21
  - @graphql-tools/batch-delegate@9.0.39
  - @graphql-tools/wrap@10.1.2

## 9.4.25

### Patch Changes

- Updated dependencies
  [[`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56),
  [`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56),
  [`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56)]:
  - @graphql-tools/delegate@10.2.20
  - @graphql-tools/batch-delegate@9.0.38
  - @graphql-tools/wrap@10.1.1

## 9.4.24

### Patch Changes

- Updated dependencies
  [[`4a80de1`](https://github.com/graphql-hive/gateway/commit/4a80de1a2884dc42a5f09202b6215c3e6780efc4),
  [`f634b53`](https://github.com/graphql-hive/gateway/commit/f634b53478199c2b783a608e22fbe51401942039),
  [`dca6529`](https://github.com/graphql-hive/gateway/commit/dca6529b234f1e178ad87a8992c5a7de12831128)]:
  - @graphql-tools/wrap@10.1.0
  - @graphql-tools/batch-delegate@9.0.37
  - @graphql-tools/delegate@10.2.19

## 9.4.23

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
  [[`0512be3`](https://github.com/graphql-hive/gateway/commit/0512be32399268eb7926db48675ddb5763fd8578)]:
  - @graphql-tools/delegate@10.2.18
  - @graphql-tools/batch-delegate@9.0.36
  - @graphql-tools/wrap@10.0.36

## 9.4.22

### Patch Changes

- [#950](https://github.com/graphql-hive/gateway/pull/950)
  [`c7ea2c5`](https://github.com/graphql-hive/gateway/commit/c7ea2c5ae71b6b338ef22edd927a3fc93803965f)
  Thanks [@kroupacz](https://github.com/kroupacz)! - Errors should not be swallowed when it is
  thrown from the shared root

- Updated dependencies
  [[`c7ea2c5`](https://github.com/graphql-hive/gateway/commit/c7ea2c5ae71b6b338ef22edd927a3fc93803965f),
  [`0af3485`](https://github.com/graphql-hive/gateway/commit/0af3485abb1b3dfba4126f09d291b2096d23aa32)]:
  - @graphql-tools/delegate@10.2.17
  - @graphql-tools/batch-delegate@9.0.35
  - @graphql-tools/wrap@10.0.35

## 9.4.21

### Patch Changes

- [#532](https://github.com/graphql-hive/gateway/pull/532)
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.0)
    (from `^1.2.5`, in `dependencies`)

- [#906](https://github.com/graphql-hive/gateway/pull/906)
  [`7b86c09`](https://github.com/graphql-hive/gateway/commit/7b86c097f5d424b82c84b87c743d5ed4ebe6aa5c)
  Thanks [@ardatan](https://github.com/ardatan)! - Extract unavailable fields for the target
  subschema from the fragments provided in the original query

- Updated dependencies
  [[`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04),
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04),
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04)]:
  - @graphql-tools/batch-delegate@9.0.34
  - @graphql-tools/delegate@10.2.16
  - @graphql-tools/wrap@10.0.34

## 9.4.20

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
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)]:
  - @graphql-tools/batch-delegate@9.0.33
  - @graphql-tools/delegate@10.2.15
  - @graphql-tools/wrap@10.0.33

## 9.4.19

### Patch Changes

- [#726](https://github.com/graphql-hive/gateway/pull/726)
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/promise-helpers@^1.0.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.0.0)
    (to `dependencies`)

- Updated dependencies
  [[`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`2a54e85`](https://github.com/graphql-hive/gateway/commit/2a54e85f2848aea7525703ea33918a21db96b26b)]:
  - @graphql-tools/batch-delegate@9.0.32
  - @graphql-tools/delegate@10.2.14
  - @graphql-tools/wrap@10.0.32

## 9.4.18

### Patch Changes

- Updated dependencies
  [[`2318393`](https://github.com/graphql-hive/gateway/commit/2318393bc7b3aca7f53806a44b59277cd176702d)]:
  - @graphql-tools/delegate@10.2.13
  - @graphql-tools/batch-delegate@9.0.31
  - @graphql-tools/wrap@10.0.31

## 9.4.17

### Patch Changes

- [#620](https://github.com/graphql-hive/gateway/pull/620)
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.1)
    (from `^10.7.0`, in `dependencies`)

- [#614](https://github.com/graphql-hive/gateway/pull/614)
  [`7146f8d`](https://github.com/graphql-hive/gateway/commit/7146f8decca808ab2c68f4971ba9b64ca27a9b87)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix a bug while isolating computed abstract type
  fields

  When a field in an interface needs to be isolated, it should not remove the field from the base
  subschema if it is used by other members of the base subschema.

- [#614](https://github.com/graphql-hive/gateway/pull/614)
  [`7146f8d`](https://github.com/graphql-hive/gateway/commit/7146f8decca808ab2c68f4971ba9b64ca27a9b87)
  Thanks [@ardatan](https://github.com/ardatan)! - While calculating the best subschema for a
  selection set, respect fragments

- Updated dependencies
  [[`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9),
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)]:
  - @graphql-tools/batch-delegate@9.0.30
  - @graphql-tools/delegate@10.2.12
  - @graphql-tools/wrap@10.0.30

## 9.4.16

### Patch Changes

- Updated dependencies
  [[`9144222`](https://github.com/graphql-hive/gateway/commit/91442220b2242a0fa082d4b544d03621572eecd0)]:
  - @graphql-tools/delegate@10.2.11
  - @graphql-tools/batch-delegate@9.0.29
  - @graphql-tools/wrap@10.0.29

## 9.4.15

### Patch Changes

- Updated dependencies
  [[`18682e6`](https://github.com/graphql-hive/gateway/commit/18682e6873091afe63f09414f02f93649a4da141),
  [`e9f78cd`](https://github.com/graphql-hive/gateway/commit/e9f78cd29681ca9b4371e12953a31d2b8f5e4c17)]:
  - @graphql-tools/delegate@10.2.10
  - @graphql-tools/wrap@10.0.28
  - @graphql-tools/batch-delegate@9.0.28

## 9.4.14

### Patch Changes

- [#443](https://github.com/graphql-hive/gateway/pull/443)
  [`a625269`](https://github.com/graphql-hive/gateway/commit/a62526936680d030339fc26cc55d76507134b022)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect fragments while calculating the selection
  score

## 9.4.13

### Patch Changes

- Updated dependencies
  [[`da65b2d`](https://github.com/graphql-hive/gateway/commit/da65b2d8a66714fb5a135e66ebbe59fa37182600)]:
  - @graphql-tools/batch-delegate@9.0.27

## 9.4.12

### Patch Changes

- Updated dependencies
  [[`21e1f05`](https://github.com/graphql-hive/gateway/commit/21e1f05373a78c93b52b5321f1f4e8d7aba17151)]:
  - @graphql-tools/batch-delegate@9.0.26

## 9.4.11

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

- Updated dependencies
  [[`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2),
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2),
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2)]:
  - @graphql-tools/batch-delegate@9.0.25
  - @graphql-tools/delegate@10.2.9
  - @graphql-tools/wrap@10.0.27

## 9.4.10

### Patch Changes

- Updated dependencies
  [[`23b8987`](https://github.com/graphql-hive/gateway/commit/23b89874fcf10b4cb6b1b941f29fa5f5aecf0ef2)]:
  - @graphql-tools/delegate@10.2.8
  - @graphql-tools/batch-delegate@9.0.24
  - @graphql-tools/wrap@10.0.26

## 9.4.9

### Patch Changes

- [#291](https://github.com/graphql-hive/gateway/pull/291)
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`tslib@^2.8.1` ↗︎](https://www.npmjs.com/package/tslib/v/2.8.1) (from
    `^2.4.0`, in `dependencies`)

- Updated dependencies
  [[`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151),
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151),
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)]:
  - @graphql-tools/batch-delegate@9.0.23
  - @graphql-tools/delegate@10.2.7
  - @graphql-tools/wrap@10.0.25

## 9.4.8

### Patch Changes

- [#269](https://github.com/graphql-hive/gateway/pull/269)
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.3.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.6)
    (from `^1.3.3`, in `dependencies`)
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
  [[`6f56083`](https://github.com/graphql-hive/gateway/commit/6f56083028402780f505db1492b9e84ab4227a4f),
  [`7df2215`](https://github.com/graphql-hive/gateway/commit/7df2215abd309dc1dfd91f4ec91ce975f3982c62),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4),
  [`7df2215`](https://github.com/graphql-hive/gateway/commit/7df2215abd309dc1dfd91f4ec91ce975f3982c62),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)]:
  - @graphql-tools/batch-delegate@9.0.22
  - @graphql-tools/delegate@10.2.6
  - @graphql-tools/wrap@10.0.24

## 9.4.7

### Patch Changes

- Updated dependencies
  [[`9ce705c`](https://github.com/graphql-hive/gateway/commit/9ce705c5ccc5e6f4ac26af6e6471a6d2f4e995db)]:
  - @graphql-tools/delegate@10.2.5
  - @graphql-tools/batch-delegate@9.0.21
  - @graphql-tools/wrap@10.0.23

## 9.4.6

### Patch Changes

- [#247](https://github.com/graphql-hive/gateway/pull/247)
  [`76642d8`](https://github.com/graphql-hive/gateway/commit/76642d84b722bae28115310f25a6ac4865b41598)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes the bug when interfaces extended by
  \`additionalTypeDefs\`

## 9.4.5

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@10.2.4
  - @graphql-tools/batch-delegate@9.0.20
  - @graphql-tools/wrap@10.0.22

## 9.4.4

### Patch Changes

- [#231](https://github.com/graphql-hive/gateway/pull/231)
  [`7ca0ff3`](https://github.com/graphql-hive/gateway/commit/7ca0ff331e42c133c4218a8086bbf0a7607f45d0)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid extensions and use \`stitchingInfo\` for
  provided fields

- Updated dependencies
  [[`7ca0ff3`](https://github.com/graphql-hive/gateway/commit/7ca0ff331e42c133c4218a8086bbf0a7607f45d0)]:
  - @graphql-tools/delegate@10.2.3
  - @graphql-tools/batch-delegate@9.0.19
  - @graphql-tools/wrap@10.0.21

## 9.4.3

### Patch Changes

- [#205](https://github.com/graphql-hive/gateway/pull/205)
  [`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix missing key fields in the nested queries

- Updated dependencies
  [[`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a)]:
  - @graphql-tools/delegate@10.2.2
  - @graphql-tools/batch-delegate@9.0.18
  - @graphql-tools/wrap@10.0.20

## 9.4.2

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
    [`value-or-promise@^1.0.11` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.11) (from
    `dependencies`)

- [#188](https://github.com/graphql-hive/gateway/pull/188)
  [`f71366d`](https://github.com/graphql-hive/gateway/commit/f71366d234fe8f30a419814fe1460f1e22663241)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency
    [`value-or-promise@^1.0.11` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.11) (from
    `dependencies`)

- Updated dependencies
  [[`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`f0b6921`](https://github.com/graphql-hive/gateway/commit/f0b69219fefc1b24c5511a1c623a5e3bbaf5ca0b),
  [`f71366d`](https://github.com/graphql-hive/gateway/commit/f71366d234fe8f30a419814fe1460f1e22663241),
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf),
  [`f0b6921`](https://github.com/graphql-hive/gateway/commit/f0b69219fefc1b24c5511a1c623a5e3bbaf5ca0b),
  [`f71366d`](https://github.com/graphql-hive/gateway/commit/f71366d234fe8f30a419814fe1460f1e22663241)]:
  - @graphql-tools/batch-delegate@9.0.17
  - @graphql-tools/delegate@10.2.1
  - @graphql-tools/wrap@10.0.19

## 9.4.1

### Patch Changes

- [`725d5b7`](https://github.com/graphql-hive/gateway/commit/725d5b7952be3a2fb2caeb40d26c194fb03b35d5)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix regression on override type interface

## 9.4.0

### Minor Changes

- [#148](https://github.com/graphql-hive/gateway/pull/148)
  [`f32cb2a`](https://github.com/graphql-hive/gateway/commit/f32cb2a0289aa32e4811ced5dc1aac3efb0674f1)
  Thanks [@ardatan](https://github.com/ardatan)! - Introduce \`onDelegationPlan\` and
  \`onDelegationStageExecuteDone\` hooks

### Patch Changes

- Updated dependencies
  [[`f32cb2a`](https://github.com/graphql-hive/gateway/commit/f32cb2a0289aa32e4811ced5dc1aac3efb0674f1)]:
  - @graphql-tools/delegate@10.2.0
  - @graphql-tools/batch-delegate@9.0.16
  - @graphql-tools/wrap@10.0.18

## 9.3.5

### Patch Changes

- Updated dependencies
  [[`73c621d`](https://github.com/graphql-hive/gateway/commit/73c621d98a4e6ca134527e349bc71223c03d06db),
  [`19bc6a4`](https://github.com/graphql-hive/gateway/commit/19bc6a4c222ff157553785ea16760888cdfe10bb)]:
  - @graphql-tools/delegate@10.1.3
  - @graphql-tools/wrap@10.0.17
  - @graphql-tools/batch-delegate@9.0.15

## 9.3.3

### Patch Changes

- Updated dependencies
  [[`342e044`](https://github.com/ardatan/graphql-tools/commit/342e044c7da74aaf5df6a90ce68973c525c9aa10)]:
  - @graphql-tools/delegate@10.1.1
  - @graphql-tools/batch-delegate@9.0.13
  - @graphql-tools/wrap@10.0.15

## 9.3.2

### Patch Changes

- Updated dependencies
  [[`e9906eb`](https://github.com/ardatan/graphql-tools/commit/e9906eb311132ab902720e75bc787228d67c0e34)]:
  - @graphql-tools/delegate@10.1.0
  - @graphql-tools/batch-delegate@9.0.12
  - @graphql-tools/wrap@10.0.14

## 9.3.1

### Patch Changes

- Updated dependencies
  [[`da1de08`](https://github.com/ardatan/graphql-tools/commit/da1de08c269a4cb3ed8240bf191833f7e75a6b01)]:
  - @graphql-tools/delegate@10.0.29
  - @graphql-tools/batch-delegate@9.0.11
  - @graphql-tools/wrap@10.0.13

## 9.3.0

### Minor Changes

- [#6629](https://github.com/ardatan/graphql-tools/pull/6629)
  [`2bb2adb`](https://github.com/ardatan/graphql-tools/commit/2bb2adbe81ab940e582ea2c779a766817c099c9c)
  Thanks [@aarne](https://github.com/aarne)! - Performance improvement in stitchSchemas

## 9.2.17

### Patch Changes

- Updated dependencies
  [[`f470f49`](https://github.com/ardatan/graphql-tools/commit/f470f49f7d8445801a2983f14532124588f9f59e)]:
  - @graphql-tools/delegate@10.0.28
  - @graphql-tools/batch-delegate@9.0.10
  - @graphql-tools/wrap@10.0.12

## 9.2.16

### Patch Changes

- [`180f3f0`](https://github.com/ardatan/graphql-tools/commit/180f3f0c8362613eb3013ff12f2d5405cd987903)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid extra calls if the keys are already
  resolved

- Updated dependencies
  [[`180f3f0`](https://github.com/ardatan/graphql-tools/commit/180f3f0c8362613eb3013ff12f2d5405cd987903)]:
  - @graphql-tools/delegate@10.0.27
  - @graphql-tools/batch-delegate@9.0.9
  - @graphql-tools/wrap@10.0.11

## 9.2.15

### Patch Changes

- Updated dependencies
  [[`8effad4`](https://github.com/ardatan/graphql-tools/commit/8effad4ffb9be1bca098b8cb6ce41b84ac7d9b6b)]:
  - @graphql-tools/delegate@10.0.26
  - @graphql-tools/batch-delegate@9.0.8
  - @graphql-tools/wrap@10.0.10

## 9.2.14

### Patch Changes

- Updated dependencies
  [[`8a16b01`](https://github.com/ardatan/graphql-tools/commit/8a16b01296457bdcfbb111e02b6f6569ef8b04aa)]:
  - @graphql-tools/delegate@10.0.25
  - @graphql-tools/batch-delegate@9.0.7
  - @graphql-tools/wrap@10.0.9

## 9.2.13

### Patch Changes

- Updated dependencies
  [[`4cdb462`](https://github.com/ardatan/graphql-tools/commit/4cdb46248774f2d5ae2757d40e1d55e83d7413b3)]:
  - @graphql-tools/delegate@10.0.24
  - @graphql-tools/batch-delegate@9.0.6
  - @graphql-tools/wrap@10.0.8

## 9.2.12

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
  - @graphql-tools/batch-delegate@9.0.5
  - @graphql-tools/wrap@10.0.7

## 9.2.11

### Patch Changes

- [#6543](https://github.com/ardatan/graphql-tools/pull/6543)
  [`dcb3e27`](https://github.com/ardatan/graphql-tools/commit/dcb3e276cce59340596156542bcede9d8b143d44)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Isolate computed fields return objects only
  if not referenced from other, non-isolated, objects

- Updated dependencies
  [[`cf2ce5e`](https://github.com/ardatan/graphql-tools/commit/cf2ce5ed4773087cc324599f2812f4fb91398b21)]:
  - @graphql-tools/utils@10.5.5
  - @graphql-tools/batch-delegate@9.0.4
  - @graphql-tools/delegate@10.0.22
  - @graphql-tools/executor@1.3.2
  - @graphql-tools/merge@9.0.8
  - @graphql-tools/schema@10.0.7
  - @graphql-tools/wrap@10.0.6

## 9.2.10

### Patch Changes

- [#6278](https://github.com/ardatan/graphql-tools/pull/6278)
  [`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle `@defer`

- [#6293](https://github.com/ardatan/graphql-tools/pull/6293)
  [`3f301dc`](https://github.com/ardatan/graphql-tools/commit/3f301dc74a99ea1db28fe75923fa26ba2736d9f7)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not apply isolation for Mutation fields

- Updated dependencies
  [[`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c),
  [`74f995f`](https://github.com/ardatan/graphql-tools/commit/74f995f17dfea6385e08bcdd662e7ad6fcfb5dfa)]:
  - @graphql-tools/delegate@10.0.12
  - @graphql-tools/utils@10.2.3
  - @graphql-tools/executor@1.2.8

## 9.2.9

### Patch Changes

- [#6194](https://github.com/ardatan/graphql-tools/pull/6194)
  [`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle interface objects in a different way

- [#6180](https://github.com/ardatan/graphql-tools/pull/6180)
  [`eec9d3d`](https://github.com/ardatan/graphql-tools/commit/eec9d3d86a1a0a748321263ef9bc4db13fd3c35c)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle nested dependencies in the computed fields

  ```ts
  {
    merge: {
      Product: {
        selectionSet: '{ id }',
        fields: {
          isExpensive: {
            selectionSet: '{ price }',
            computed: true,
          },
          canAfford: {
            selectionSet: '{ isExpensive }',
            computed: true,
          },
        }
      }
    }
  }
  ```

- [#6179](https://github.com/ardatan/graphql-tools/pull/6179)
  [`03a47b1`](https://github.com/ardatan/graphql-tools/commit/03a47b181516e17f33c84f364df9482c2d1ba502)
  Thanks [@ardatan](https://github.com/ardatan)! - Support computed fields resolved via a root field
  returning an interface When a computed field returning an object, and that field is resolved via
  an interface, the computed field will now be resolved correctly.

- [#6188](https://github.com/ardatan/graphql-tools/pull/6188)
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle nested selections in
  `calculateSelectionScore`

- [#6175](https://github.com/ardatan/graphql-tools/pull/6175)
  [`0827497`](https://github.com/ardatan/graphql-tools/commit/08274975ccb1524d88fc8b95f42deb1cba05425d)
  Thanks [@ardatan](https://github.com/ardatan)! - If there is a subschema with some selection set,
  and another with some other selection set. After the calculation of delegation stage, if one
  subschema can cover the other selection set as well, then we can merge the two selection sets into
  one, and remove the other subschema from the stage.
- Updated dependencies
  [[`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e),
  [`dfccfbf`](https://github.com/ardatan/graphql-tools/commit/dfccfbfd6633dd576f660c648f3c6cecff3667a1),
  [`0134f7f`](https://github.com/ardatan/graphql-tools/commit/0134f7ffe5383603961d69337bfa5bceefb3ed74)]:
  - @graphql-tools/batch-delegate@9.0.3
  - @graphql-tools/delegate@10.0.11
  - @graphql-tools/schema@10.0.4
  - @graphql-tools/utils@10.2.1

## 9.2.8

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

- Updated dependencies
  [[`a83da08`](https://github.com/ardatan/graphql-tools/commit/a83da087e24929ed0734a2cff63c97bd45cc9eb4),
  [`fc9c71f`](https://github.com/ardatan/graphql-tools/commit/fc9c71fbc9057a8e32e0d8813b23819c631afa65)]:
  - @graphql-tools/delegate@10.0.10

## 9.2.7

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

## 9.2.6

### Patch Changes

- [`98b2795`](https://github.com/ardatan/graphql-tools/commit/98b2795120e05dec1d91b57422f50d38c088b630)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on unavailable field selection, and
  key object projection

## 9.2.5

### Patch Changes

- [`9238e14`](https://github.com/ardatan/graphql-tools/commit/9238e140862d33c6df072c42054fc642eda37840)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on field merging and extraction of
  unavailable fields

- Updated dependencies
  [[`4ce3ffc`](https://github.com/ardatan/graphql-tools/commit/4ce3ffc8ec927651587e0aa236fdd573e883ef21)]:
  - @graphql-tools/delegate@10.0.8

## 9.2.4

### Patch Changes

- [#6117](https://github.com/ardatan/graphql-tools/pull/6117)
  [`67a9c49`](https://github.com/ardatan/graphql-tools/commit/67a9c4909b7676b69c4b425ab1a6cd5533c799ef)
  Thanks [@ardatan](https://github.com/ardatan)! - Add field as an unavailable field only if it is
  not able to resolve by any other subschema;

  When the following query is sent to the gateway with the following subschemas, the gateway should
  resolve `Category.details` from A Subschema using `Product` resolver instead of trying to resolve
  by using non-existing `Category` resolver from A Subschema.

  Previously, the query planner decides to resolve `Category.details` after resolving `Category`
  from C Subschema. But it will be too late to resolve `details` because `Category` is not
  resolvable in A Subschema.

  So the requests for `Category.details` and the rest of `Category` should be different.

  So for the following query, we expect a full result;

  ```graphql
  query {
    productFromA(id: "1") {
      id
      name
      category {
        id
        name
        details
      }
    }
  }
  ```

  ```graphql
  # A Subschema
  type Query {
    productFromA(id: ID): Product
    # No category resolver is present
  }

  type Product {
    id: ID
    category: Category
  }

  type Category {
    details: CategoryDetails
  }
  ```

  ```graphql
  # B Subschema
  type Query {
    productFromB(id: ID): Product
  }
  type Product {
    id: ID
    name: String
    category: Category
  }
  type Category {
    id: ID
  }
  ```

  ```graphql
  # C Subschema
  type Query {
    categoryFromC(id: ID): Category
  }

  type Category {
    id: ID
    name: String
  }
  ```

- Updated dependencies
  [[`a06dbd2`](https://github.com/ardatan/graphql-tools/commit/a06dbd263ec7bfc6d50aa8faf2e35396a67b4f0b)]:
  - @graphql-tools/merge@9.0.4

## 9.2.3

### Patch Changes

- [#6109](https://github.com/ardatan/graphql-tools/pull/6109)
  [`074fad4`](https://github.com/ardatan/graphql-tools/commit/074fad4144095fbefe449ced397b7707963bd7aa)
  Thanks [@ardatan](https://github.com/ardatan)! - Exclude fields with `__typename` while extracting
  missing fields for the type merging

- Updated dependencies
  [[`074fad4`](https://github.com/ardatan/graphql-tools/commit/074fad4144095fbefe449ced397b7707963bd7aa)]:
  - @graphql-tools/delegate@10.0.7

## 9.2.2

### Patch Changes

- [#6107](https://github.com/ardatan/graphql-tools/pull/6107)
  [`b281dd6`](https://github.com/ardatan/graphql-tools/commit/b281dd65276dd9df56a41cc2dbff5139281f02f9)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the priority of isolated fields

## 9.2.1

### Patch Changes

- [#6105](https://github.com/ardatan/graphql-tools/pull/6105)
  [`5567347`](https://github.com/ardatan/graphql-tools/commit/5567347217fdfb72e3f8b389ade6d5912dfb5c95)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle fields in unmerged types as both isolated
  and non-isolated fields

- [#6105](https://github.com/ardatan/graphql-tools/pull/6105)
  [`5567347`](https://github.com/ardatan/graphql-tools/commit/5567347217fdfb72e3f8b389ade6d5912dfb5c95)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect `specifiedByURL` in stitched schemas

- Updated dependencies
  [[`5567347`](https://github.com/ardatan/graphql-tools/commit/5567347217fdfb72e3f8b389ade6d5912dfb5c95),
  [`5567347`](https://github.com/ardatan/graphql-tools/commit/5567347217fdfb72e3f8b389ade6d5912dfb5c95)]:
  - @graphql-tools/utils@10.2.0

## 9.2.0

### Minor Changes

- [#6091](https://github.com/ardatan/graphql-tools/pull/6091)
  [`9bca9e0`](https://github.com/ardatan/graphql-tools/commit/9bca9e03915a2e12d164e355be9aed389b0de3a4)
  Thanks [@User](https://github.com/User), [@User](https://github.com/User)! - New option
  `useNonNullableFieldOnConflict` in `typeMergingOptions` of `stitchSchemas`

  When you have two schemas like below, you will get a warning about the conflicting fields because
  `name` field is defined as non-null in one schema and nullable in the other schema, and
  non-nullable field can exist in the stitched schema because of the order or any other reasons, and
  this might actually cause an unexpected behavior when you fetch `User.name` from the one who has
  it as non-nullable. This option supresses the warning, and takes the field from the schema that
  has it as non-nullable.

  ```graphql
    type Query {

    }

    type User {
      id: ID!
      name: String
      email: String
    }
  ```

  And;

  ```graphql
    type Query {

    }

    type User {
      id: ID!
      name: String!
    }
  ```

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

- Updated dependencies
  [[`9bca9e0`](https://github.com/ardatan/graphql-tools/commit/9bca9e03915a2e12d164e355be9aed389b0de3a4),
  [`243c353`](https://github.com/ardatan/graphql-tools/commit/243c353412921cf0063f963ee46b9c63d2f33b41)]:
  - @graphql-tools/delegate@10.0.5

## 9.1.2

### Patch Changes

- [`6d26702`](https://github.com/ardatan/graphql-tools/commit/6d267022eaf4b695b3791927912375f1b1d0f3a8)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect interface types as computed field types

## 9.1.1

### Patch Changes

- [`c5df958`](https://github.com/ardatan/graphql-tools/commit/c5df95858c5b5a57a232740e8e4b667ce5d2da2c)
  Thanks [@ardatan](https://github.com/ardatan)! - Prevent infinite loop while visiting over the
  computed field types

## 9.1.0

### Minor Changes

- [#5162](https://github.com/ardatan/graphql-tools/pull/5162)
  [`27b6f49`](https://github.com/ardatan/graphql-tools/commit/27b6f49c67d4b3fca26d90dcaaef37ff61fe9d0a)
  Thanks [@asodeur](https://github.com/asodeur)! - Adding the ability to return non-scalar types
  from computed fields. Computed fields can now return object types (local or stitched), interfaces,
  unions, or enums.

## 9.0.5

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.3)
    (from `^10.0.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.0.1)
    (from `^9.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.2)
    (from `^10.0.0`, in `dependencies`)
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
  - @graphql-tools/batch-delegate@9.0.1
  - @graphql-tools/delegate@10.0.4
  - @graphql-tools/executor@1.2.1
  - @graphql-tools/merge@9.0.3
  - @graphql-tools/schema@10.0.3
  - @graphql-tools/wrap@10.0.2

## 9.0.4

### Patch Changes

- [#5922](https://github.com/ardatan/graphql-tools/pull/5922)
  [`7f606ea`](https://github.com/ardatan/graphql-tools/commit/7f606ea4da035b220319fb702d6a2c9d5e5d35e9)
  Thanks [@ardatan](https://github.com/ardatan)! - Merge directives correctly

## 9.0.3

### Patch Changes

- [`a0a9c5e1`](https://github.com/ardatan/graphql-tools/commit/a0a9c5e1686508c32a45fc7c9bbda89cb046cbcf)
  Thanks [@ardatan](https://github.com/ardatan)! - Isolate the schemas correctly

## 9.0.2

### Patch Changes

- [`cda328c3`](https://github.com/ardatan/graphql-tools/commit/cda328c3e487ea51e13a3b18f0e2e494fd3275ca)
  Thanks [@ardatan](https://github.com/ardatan)! - Support for multiple key entrypoints for an
  object, and avoid sending whole object if possible

## 9.0.1

### Patch Changes

- [#5474](https://github.com/ardatan/graphql-tools/pull/5474)
  [`f31be313`](https://github.com/ardatan/graphql-tools/commit/f31be313b2af5a7c5bf893f1ce1dc7d36bf5340c)
  Thanks [@ardatan](https://github.com/ardatan)! - Optimizations for federation

- Updated dependencies
  [[`f31be313`](https://github.com/ardatan/graphql-tools/commit/f31be313b2af5a7c5bf893f1ce1dc7d36bf5340c)]:
  - @graphql-tools/delegate@10.0.1

## 9.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- Updated dependencies
  [[`8fba6cc1`](https://github.com/ardatan/graphql-tools/commit/8fba6cc1876e914d587f5b253332aaedbcaa65e6),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/delegate@10.0.0
  - @graphql-tools/batch-delegate@9.0.0
  - @graphql-tools/executor@1.0.0
  - @graphql-tools/schema@10.0.0
  - @graphql-tools/merge@9.0.0
  - @graphql-tools/utils@10.0.0
  - @graphql-tools/wrap@10.0.0

## 8.7.50

### Patch Changes

- [#5235](https://github.com/ardatan/graphql-tools/pull/5235)
  [`2bbbe1af`](https://github.com/ardatan/graphql-tools/commit/2bbbe1af0bb7d04685bdceab9252a5ded6809c78)
  Thanks [@belgattitude](https://github.com/belgattitude)! - Add missing dependency on
  @graphql-tools/executor.

- Updated dependencies
  [[`33005c48`](https://github.com/ardatan/graphql-tools/commit/33005c48e8aa9d5eae53c720bd39dca655c645f1)]:
  - @graphql-tools/merge@8.4.2

## 8.7.49

### Patch Changes

- [#5220](https://github.com/ardatan/graphql-tools/pull/5220)
  [`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements

- Updated dependencies
  [[`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)]:
  - @graphql-tools/batch-delegate@8.4.27
  - @graphql-tools/delegate@9.0.35

## 8.7.48

### Patch Changes

- [`1c95368a`](https://github.com/ardatan/graphql-tools/commit/1c95368aea868be537d956ba5e994cde58dfee41)
  Thanks [@ardatan](https://github.com/ardatan)! - Use ranged versions for dependencies

- Updated dependencies
  [[`1c95368a`](https://github.com/ardatan/graphql-tools/commit/1c95368aea868be537d956ba5e994cde58dfee41)]:
  - @graphql-tools/batch-delegate@8.4.25
  - @graphql-tools/schema@9.0.18
  - @graphql-tools/merge@8.4.1
  - @graphql-tools/wrap@9.4.2
  - @graphql-tools/delegate@9.0.31

## 8.7.47

### Patch Changes

- Updated dependencies
  [[`c8d5e0df`](https://github.com/ardatan/graphql-tools/commit/c8d5e0dfccdfc40d2a586650b56c124f3e4c5d42)]:
  - @graphql-tools/wrap@9.4.1
  - @graphql-tools/delegate@9.0.30
  - @graphql-tools/batch-delegate@8.4.24

## 8.7.46

### Patch Changes

- Updated dependencies
  [[`68c158d2`](https://github.com/ardatan/graphql-tools/commit/68c158d2b4e0f8bdd94daafd63ea6b3efb29d7eb)]:
  - @graphql-tools/wrap@9.4.0

## 8.7.45

### Patch Changes

- Updated dependencies
  [[`f26392a6`](https://github.com/ardatan/graphql-tools/commit/f26392a66299956da1e66253b181f85332c93db5)]:
  - @graphql-tools/delegate@9.0.29
  - @graphql-tools/batch-delegate@8.4.23
  - @graphql-tools/wrap@9.3.9

## 8.7.44

### Patch Changes

- Updated dependencies
  [[`1913bf91`](https://github.com/ardatan/graphql-tools/commit/1913bf913130f20582152f3cbb1a4bfb49d85a13)]:
  - @graphql-tools/batch-delegate@8.4.22

## 8.7.43

### Patch Changes

- Updated dependencies
  [[`04e3ecb9`](https://github.com/ardatan/graphql-tools/commit/04e3ecb9c377834984ab0a272add29a1709e305d)]:
  - @graphql-tools/merge@8.4.0
  - @graphql-tools/schema@9.0.17
  - @graphql-tools/wrap@9.3.8

## 8.7.42

### Patch Changes

- Updated dependencies
  [[`492220cb`](https://github.com/ardatan/graphql-tools/commit/492220cbdf240e7abde23af0aabcb8cbc6fd3656)]:
  - @graphql-tools/delegate@9.0.28
  - @graphql-tools/batch-delegate@8.4.21
  - @graphql-tools/wrap@9.3.7

## 8.7.41

### Patch Changes

- Updated dependencies
  [[`30bd4d0c`](https://github.com/ardatan/graphql-tools/commit/30bd4d0c10f59147faba925dc0941c731b0532a9),
  [`30bd4d0c`](https://github.com/ardatan/graphql-tools/commit/30bd4d0c10f59147faba925dc0941c731b0532a9)]:
  - @graphql-tools/batch-delegate@8.4.20
  - @graphql-tools/delegate@9.0.27
  - @graphql-tools/wrap@9.3.6

## 8.7.40

### Patch Changes

- Updated dependencies
  [[`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155),
  [`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155),
  [`85659bca`](https://github.com/ardatan/graphql-tools/commit/85659bca1bdbd6d4a9a6e875acfbf9bb36056ea6),
  [`b5c8f640`](https://github.com/ardatan/graphql-tools/commit/b5c8f6407b74466ed0d2989000458cb59239e9af)]:
  - @graphql-tools/batch-delegate@8.4.19
  - @graphql-tools/delegate@9.0.26
  - @graphql-tools/wrap@9.3.5
  - @graphql-tools/utils@9.2.1
  - @graphql-tools/merge@8.3.18
  - @graphql-tools/schema@9.0.16

## 8.7.39

### Patch Changes

- Updated dependencies
  [[`a94217e9`](https://github.com/ardatan/graphql-tools/commit/a94217e920c5d6237471ab6ad4d96cf230984177),
  [`62d074be`](https://github.com/ardatan/graphql-tools/commit/62d074be48779b1e096e056ca1233822c421dc99)]:
  - @graphql-tools/utils@9.2.0
  - @graphql-tools/batch-delegate@8.4.18
  - @graphql-tools/delegate@9.0.25
  - @graphql-tools/merge@8.3.17
  - @graphql-tools/schema@9.0.15
  - @graphql-tools/wrap@9.3.4

## 8.7.38

### Patch Changes

- Updated dependencies
  [[`772b948a`](https://github.com/ardatan/graphql-tools/commit/772b948ae536ac23520e704b33f450c94252f113)]:
  - @graphql-tools/delegate@9.0.24
  - @graphql-tools/batch-delegate@8.4.17
  - @graphql-tools/wrap@9.3.3

## 8.7.37

### Patch Changes

- Updated dependencies
  [[`8555c5c5`](https://github.com/ardatan/graphql-tools/commit/8555c5c57094e14b6ed1380c6572e0681444496b)]:
  - @graphql-tools/merge@8.3.16
  - @graphql-tools/schema@9.0.14
  - @graphql-tools/batch-delegate@8.4.16
  - @graphql-tools/delegate@9.0.23
  - @graphql-tools/wrap@9.3.2

## 8.7.36

### Patch Changes

- [`fdb3e4c4`](https://github.com/ardatan/graphql-tools/commit/fdb3e4c4bbd004c92b52c55a0733793339822639)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix enum value transformation with
  `stitchSchemas`

- Updated dependencies
  [[`fdb3e4c4`](https://github.com/ardatan/graphql-tools/commit/fdb3e4c4bbd004c92b52c55a0733793339822639)]:
  - @graphql-tools/wrap@9.3.1

## 8.7.35

### Patch Changes

- Updated dependencies
  [[`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`499365aa`](https://github.com/ardatan/graphql-tools/commit/499365aa3f33148a47e708351416b6a54c17655a),
  [`e3ec35ed`](https://github.com/ardatan/graphql-tools/commit/e3ec35ed27d4a329739c8da6be06ce74c8f25591)]:
  - @graphql-tools/delegate@9.0.22
  - @graphql-tools/schema@9.0.13
  - @graphql-tools/wrap@9.3.0
  - @graphql-tools/utils@9.1.4
  - @graphql-tools/batch-delegate@8.4.15
  - @graphql-tools/merge@8.3.15

## 8.7.34

### Patch Changes

- Updated dependencies
  [[`13177794`](https://github.com/ardatan/graphql-tools/commit/131777947d111e6a952d9e0e581fd651664101a1)]:
  - @graphql-tools/delegate@9.0.21
  - @graphql-tools/batch-delegate@8.4.14
  - @graphql-tools/wrap@9.2.23

## 8.7.33

### Patch Changes

- Updated dependencies
  [[`55e24643`](https://github.com/ardatan/graphql-tools/commit/55e24643fac7eb25b7e4a6fefb15bd48ee562593)]:
  - @graphql-tools/wrap@9.2.22

## 8.7.32

### Patch Changes

- Updated dependencies
  [[`eb6cd8b6`](https://github.com/ardatan/graphql-tools/commit/eb6cd8b65dc72434348c259538b233e57a58eb1a),
  [`eb6cd8b6`](https://github.com/ardatan/graphql-tools/commit/eb6cd8b65dc72434348c259538b233e57a58eb1a)]:
  - @graphql-tools/delegate@9.0.20
  - @graphql-tools/wrap@9.2.21
  - @graphql-tools/batch-delegate@8.4.13

## 8.7.31

### Patch Changes

- Updated dependencies
  [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759),
  [`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3
  - @graphql-tools/delegate@9.0.19
  - @graphql-tools/batch-delegate@8.4.12
  - @graphql-tools/merge@8.3.14
  - @graphql-tools/schema@9.0.12
  - @graphql-tools/wrap@9.2.20

## 8.7.30

### Patch Changes

- Updated dependencies
  [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b),
  [`b5e6459f`](https://github.com/ardatan/graphql-tools/commit/b5e6459f87cd8720457ce9bff38f3dfa0cb3c150)]:
  - @graphql-tools/delegate@9.0.18
  - @graphql-tools/utils@9.1.2
  - @graphql-tools/batch-delegate@8.4.11
  - @graphql-tools/wrap@9.2.19
  - @graphql-tools/merge@8.3.13
  - @graphql-tools/schema@9.0.11

## 8.7.29

### Patch Changes

- Updated dependencies
  [[`02126e63`](https://github.com/ardatan/graphql-tools/commit/02126e631b103617e0f07b90e157d5be5678ef84)]:
  - @graphql-tools/wrap@9.2.18

## 8.7.28

### Patch Changes

- Updated dependencies
  [[`7aa610ae`](https://github.com/ardatan/graphql-tools/commit/7aa610ae01d63eebab92b0677650457338e73827)]:
  - @graphql-tools/wrap@9.2.17

## 8.7.27

### Patch Changes

- [#4866](https://github.com/ardatan/graphql-tools/pull/4866)
  [`44fe1ef1`](https://github.com/ardatan/graphql-tools/commit/44fe1ef1ef371bfa71b9b015aedc4ee205b0f19f)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not keep internal enum values while stitching

## 8.7.26

### Patch Changes

- Updated dependencies
  [[`5bd8c0dc`](https://github.com/ardatan/graphql-tools/commit/5bd8c0dc565ec46b3ae2b507ed3f039e96a63ddb)]:
  - @graphql-tools/wrap@9.2.16

## 8.7.25

### Patch Changes

- Updated dependencies
  [[`e3f81ea5`](https://github.com/ardatan/graphql-tools/commit/e3f81ea5bf449dafee45d6f770f88af8354aeffc)]:
  - @graphql-tools/wrap@9.2.15

## 8.7.24

### Patch Changes

- Updated dependencies
  [[`df81034c`](https://github.com/ardatan/graphql-tools/commit/df81034c48b49ed5690f0c8cc61dc8dc47830bf8)]:
  - @graphql-tools/wrap@9.2.14

## 8.7.23

### Patch Changes

- Updated dependencies
  [[`7411a5e7`](https://github.com/ardatan/graphql-tools/commit/7411a5e71a8138d9ccfe907b1fb01e62fcbb0cdb)]:
  - @graphql-tools/utils@9.1.1
  - @graphql-tools/batch-delegate@8.4.10
  - @graphql-tools/delegate@9.0.17
  - @graphql-tools/merge@8.3.12
  - @graphql-tools/schema@9.0.10
  - @graphql-tools/wrap@9.2.13

## 8.7.22

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@9.0.16
  - @graphql-tools/batch-delegate@8.4.9
  - @graphql-tools/wrap@9.2.12

## 8.7.21

### Patch Changes

- Updated dependencies
  [[`1270b75a`](https://github.com/ardatan/graphql-tools/commit/1270b75a01ffca0d3f301bb809a572e0ee7b1c88),
  [`c0639dd0`](https://github.com/ardatan/graphql-tools/commit/c0639dd0065db1b5bcedaabf58b11945714bab8d)]:
  - @graphql-tools/wrap@9.2.11
  - @graphql-tools/utils@9.1.0
  - @graphql-tools/batch-delegate@8.4.8
  - @graphql-tools/delegate@9.0.15
  - @graphql-tools/merge@8.3.11
  - @graphql-tools/schema@9.0.9

## 8.7.20

### Patch Changes

- Updated dependencies
  [[`a58cd6d3`](https://github.com/ardatan/graphql-tools/commit/a58cd6d38d7856edbf9404a3694d592cd1c383d1)]:
  - @graphql-tools/wrap@9.2.10

## 8.7.19

### Patch Changes

- Updated dependencies
  [[`d83b1960`](https://github.com/ardatan/graphql-tools/commit/d83b19605be71481ccf8effd80d5254423ea811a)]:
  - @graphql-tools/utils@9.0.1
  - @graphql-tools/batch-delegate@8.4.7
  - @graphql-tools/delegate@9.0.14
  - @graphql-tools/merge@8.3.10
  - @graphql-tools/schema@9.0.8
  - @graphql-tools/wrap@9.2.9

## 8.7.18

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@9.0.13
  - @graphql-tools/batch-delegate@8.4.6
  - @graphql-tools/wrap@9.2.8

## 8.7.17

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@9.0.12
  - @graphql-tools/batch-delegate@8.4.5
  - @graphql-tools/wrap@9.2.7

## 8.7.16

### Patch Changes

- [#4796](https://github.com/ardatan/graphql-tools/pull/4796)
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)
  Thanks [@saihaj](https://github.com/saihaj)! - update `collectFields` to support collecting
  deffered values

- Updated dependencies
  [[`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`8f6d3efc`](https://github.com/ardatan/graphql-tools/commit/8f6d3efc92b25236f5a3a761ea7ba2f0a7c7f550),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)]:
  - @graphql-tools/utils@9.0.0
  - @graphql-tools/delegate@9.0.11
  - @graphql-tools/batch-delegate@8.4.4
  - @graphql-tools/merge@8.3.9
  - @graphql-tools/schema@9.0.7
  - @graphql-tools/wrap@9.2.6

## 8.7.15

### Patch Changes

- Updated dependencies
  [[`f7daf777`](https://github.com/ardatan/graphql-tools/commit/f7daf7777cc214801886e4a45c0389bc5837d175),
  [`c1d01f3d`](https://github.com/ardatan/graphql-tools/commit/c1d01f3dd19b35dae4d4838af7f27490655549c6)]:
  - @graphql-tools/utils@8.13.1
  - @graphql-tools/wrap@9.2.5
  - @graphql-tools/batch-delegate@8.4.3
  - @graphql-tools/delegate@9.0.10
  - @graphql-tools/merge@8.3.8
  - @graphql-tools/schema@9.0.6

## 8.7.14

### Patch Changes

- Updated dependencies
  [[`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f)]:
  - @graphql-tools/delegate@9.0.9
  - @graphql-tools/utils@8.13.0
  - @graphql-tools/batch-delegate@8.4.2
  - @graphql-tools/wrap@9.2.4
  - @graphql-tools/merge@8.3.7
  - @graphql-tools/schema@9.0.5

## 8.7.13

### Patch Changes

- Updated dependencies
  [[`0402894d`](https://github.com/ardatan/graphql-tools/commit/0402894d0b2747ae5d98d28df9b39d6a06cc5f2a)]:
  - @graphql-tools/delegate@9.0.8
  - @graphql-tools/batch-delegate@8.4.1
  - @graphql-tools/wrap@9.2.3

## 8.7.12

### Patch Changes

- Updated dependencies
  [[`614a5622`](https://github.com/ardatan/graphql-tools/commit/614a56224aed6224be708a601c816647e679a4fe),
  [`00c4a1a4`](https://github.com/ardatan/graphql-tools/commit/00c4a1a44e14b9950f44d56f44967ab7a0121706)]:
  - @graphql-tools/batch-delegate@8.4.0
  - @graphql-tools/delegate@9.0.7
  - @graphql-tools/wrap@9.2.2

## 8.7.11

### Patch Changes

- Updated dependencies
  [[`c21a895a`](https://github.com/ardatan/graphql-tools/commit/c21a895a19721f73037d43e664aa8346f59356e8)]:
  - @graphql-tools/wrap@9.2.1

## 8.7.10

### Patch Changes

- Updated dependencies
  [[`43c736bd`](https://github.com/ardatan/graphql-tools/commit/43c736bd1865c00898966a7ed14060496c9e6a0c),
  [`43c736bd`](https://github.com/ardatan/graphql-tools/commit/43c736bd1865c00898966a7ed14060496c9e6a0c)]:
  - @graphql-tools/utils@8.12.0
  - @graphql-tools/wrap@9.2.0
  - @graphql-tools/batch-delegate@8.3.9
  - @graphql-tools/delegate@9.0.6
  - @graphql-tools/merge@8.3.6
  - @graphql-tools/schema@9.0.4

## 8.7.9

### Patch Changes

- Updated dependencies
  [[`dd8886d1`](https://github.com/ardatan/graphql-tools/commit/dd8886d1534fdf73b7cfb6d54b13a3db5812b38b)]:
  - @graphql-tools/wrap@9.1.0

## 8.7.8

### Patch Changes

- Updated dependencies
  [[`71cb4fae`](https://github.com/ardatan/graphql-tools/commit/71cb4faeb0833a228520a7bc2beed8ac7274443f),
  [`403ed450`](https://github.com/ardatan/graphql-tools/commit/403ed4507eff7cd509f410f7542a702da72e1a9a)]:
  - @graphql-tools/utils@8.11.0
  - @graphql-tools/batch-delegate@8.3.8
  - @graphql-tools/delegate@9.0.5
  - @graphql-tools/merge@8.3.5
  - @graphql-tools/schema@9.0.3
  - @graphql-tools/wrap@9.0.6

## 8.7.7

### Patch Changes

- Updated dependencies
  [[`4fe3d9c0`](https://github.com/ardatan/graphql-tools/commit/4fe3d9c037e9c138bd8a9b04b3977d74eba32c97),
  [`4e4fac0a`](https://github.com/ardatan/graphql-tools/commit/4e4fac0a8a46b5498a30a81932ef28d1f788efaa)]:
  - @graphql-tools/utils@8.10.1
  - @graphql-tools/wrap@9.0.5
  - @graphql-tools/batch-delegate@8.3.7
  - @graphql-tools/delegate@9.0.4
  - @graphql-tools/merge@8.3.4
  - @graphql-tools/schema@9.0.2

## 8.7.6

### Patch Changes

- [#4640](https://github.com/ardatan/graphql-tools/pull/4640)
  [`27bdc237`](https://github.com/ardatan/graphql-tools/commit/27bdc23713a5176485ac940fc5431256b4f2de8d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.5)
    (was `8.3.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.3)
    (was `9.0.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.3) (was
    `9.0.2`, in `dependencies`)

- Updated dependencies
  [[`27bdc237`](https://github.com/ardatan/graphql-tools/commit/27bdc23713a5176485ac940fc5431256b4f2de8d),
  [`27bdc237`](https://github.com/ardatan/graphql-tools/commit/27bdc23713a5176485ac940fc5431256b4f2de8d)]:
  - @graphql-tools/batch-delegate@8.3.6
  - @graphql-tools/wrap@9.0.4

## 8.7.5

### Patch Changes

- [`0555a972`](https://github.com/ardatan/graphql-tools/commit/0555a972f010d2b3ca93b9164b26474a78d0b20b)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump versions

- Updated dependencies
  [[`0555a972`](https://github.com/ardatan/graphql-tools/commit/0555a972f010d2b3ca93b9164b26474a78d0b20b)]:
  - @graphql-tools/delegate@9.0.3
  - @graphql-tools/wrap@9.0.3
  - @graphql-tools/batch-delegate@8.3.5

## 8.7.4

### Patch Changes

- [#4648](https://github.com/ardatan/graphql-tools/pull/4648)
  [`29ee7542`](https://github.com/ardatan/graphql-tools/commit/29ee7542649e9c938bdb9c751bd3a2f56d17cb55)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not call `Transform.transformSchema` more than
  once

- Updated dependencies
  [[`29ee7542`](https://github.com/ardatan/graphql-tools/commit/29ee7542649e9c938bdb9c751bd3a2f56d17cb55)]:
  - @graphql-tools/delegate@9.0.2
  - @graphql-tools/wrap@9.0.2
  - @graphql-tools/batch-delegate@8.3.4

## 8.7.3

### Patch Changes

- Updated dependencies
  [[`2609d71f`](https://github.com/ardatan/graphql-tools/commit/2609d71f7c3a0ef2b381c51d9ce60b0de49f9b27)]:
  - @graphql-tools/utils@8.10.0
  - @graphql-tools/merge@8.3.3
  - @graphql-tools/schema@9.0.1
  - @graphql-tools/batch-delegate@8.3.3
  - @graphql-tools/delegate@9.0.1
  - @graphql-tools/wrap@9.0.1

## 8.7.2

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624)
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with
  `moduleResolution` `node16` or `nodenext`

- Updated dependencies
  [[`8cc8721f`](https://github.com/ardatan/graphql-tools/commit/8cc8721fbbff3c978fd67d162df833d6973c1860),
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67),
  [`d8dc67aa`](https://github.com/ardatan/graphql-tools/commit/d8dc67aa6cb05bf10f5f16e90690e5ccc87b3426)]:
  - @graphql-tools/schema@9.0.0
  - @graphql-tools/batch-delegate@8.3.2
  - @graphql-tools/delegate@9.0.0
  - @graphql-tools/merge@8.3.2
  - @graphql-tools/utils@8.9.1
  - @graphql-tools/wrap@9.0.0

## 8.7.1

### Patch Changes

- Updated dependencies [2a3b45e3]
  - @graphql-tools/utils@8.9.0
  - @graphql-tools/batch-delegate@8.3.1
  - @graphql-tools/delegate@8.8.1
  - @graphql-tools/merge@8.3.1
  - @graphql-tools/schema@8.5.1
  - @graphql-tools/wrap@8.5.1

## 8.7.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [a0abbbcd]
- Updated dependencies [d76a299c]
  - @graphql-tools/utils@8.8.0
  - @graphql-tools/batch-delegate@8.3.0
  - @graphql-tools/delegate@8.8.0
  - @graphql-tools/merge@8.3.0
  - @graphql-tools/schema@8.5.0
  - @graphql-tools/wrap@8.5.0

## 8.6.14

### Patch Changes

- Updated dependencies [6df204de]
- Updated dependencies [4914970b]
  - @graphql-tools/delegate@8.7.12
  - @graphql-tools/schema@8.4.0
  - @graphql-tools/utils@8.7.0
  - @graphql-tools/batch-delegate@8.2.21
  - @graphql-tools/wrap@8.4.21
  - @graphql-tools/merge@8.2.15

## 8.6.13

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/batch-delegate@8.2.20
  - @graphql-tools/delegate@8.7.11
  - @graphql-tools/merge@8.2.14
  - @graphql-tools/schema@8.3.14
  - @graphql-tools/utils@8.6.13
  - @graphql-tools/wrap@8.4.20

## 8.6.12

### Patch Changes

- Updated dependencies [7c3b2797]
- Updated dependencies [da7ad43b]
  - @graphql-tools/wrap@8.4.19
  - @graphql-tools/utils@8.6.12
  - @graphql-tools/batch-delegate@8.2.19
  - @graphql-tools/delegate@8.7.10
  - @graphql-tools/merge@8.2.13
  - @graphql-tools/schema@8.3.13

## 8.6.11

### Patch Changes

- Updated dependencies [c0762ee3]
  - @graphql-tools/utils@8.6.11
  - @graphql-tools/batch-delegate@8.2.18
  - @graphql-tools/delegate@8.7.9
  - @graphql-tools/merge@8.2.12
  - @graphql-tools/schema@8.3.12
  - @graphql-tools/wrap@8.4.18

## 8.6.10

### Patch Changes

- Updated dependencies [0fc510cb]
  - @graphql-tools/utils@8.6.10
  - @graphql-tools/batch-delegate@8.2.17
  - @graphql-tools/delegate@8.7.8
  - @graphql-tools/merge@8.2.11
  - @graphql-tools/schema@8.3.11
  - @graphql-tools/wrap@8.4.17

## 8.6.9

### Patch Changes

- Updated dependencies [31a33e2b]
  - @graphql-tools/utils@8.6.9
  - @graphql-tools/batch-delegate@8.2.16
  - @graphql-tools/delegate@8.7.7
  - @graphql-tools/merge@8.2.10
  - @graphql-tools/schema@8.3.10
  - @graphql-tools/wrap@8.4.16

## 8.6.8

### Patch Changes

- Updated dependencies [26e4b464]
  - @graphql-tools/delegate@8.7.6
  - @graphql-tools/batch-delegate@8.2.15
  - @graphql-tools/wrap@8.4.15

## 8.6.7

### Patch Changes

- Updated dependencies [cb238877]
  - @graphql-tools/utils@8.6.8
  - @graphql-tools/batch-delegate@8.2.14
  - @graphql-tools/delegate@8.7.5
  - @graphql-tools/merge@8.2.9
  - @graphql-tools/schema@8.3.9
  - @graphql-tools/wrap@8.4.14

## 8.6.6

### Patch Changes

- 0bbb1769: Refine generic typings using `extends X` when appropriate

  Typescript 4.7 has stricter requirements around generics which is explained well in the related
  PR: https://github.com/microsoft/TypeScript/pull/48366

  These changes resolve the errors that these packages will face when attempting to upgrade to TS
  4.7 (still in beta at the time of writing this). Landing these changes now will allow other TS
  libraries which depend on these packages to experiment with TS 4.7 in the meantime.

- Updated dependencies [0bbb1769]
  - @graphql-tools/delegate@8.7.4
  - @graphql-tools/utils@8.6.7
  - @graphql-tools/wrap@8.4.13
  - @graphql-tools/batch-delegate@8.2.13
  - @graphql-tools/merge@8.2.8
  - @graphql-tools/schema@8.3.8

## 8.6.5

### Patch Changes

- Updated dependencies [fe9402af]
  - @graphql-tools/batch-delegate@8.2.12
  - @graphql-tools/delegate@8.7.3
  - @graphql-tools/wrap@8.4.12

## 8.6.4

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6
  - @graphql-tools/batch-delegate@8.2.11
  - @graphql-tools/delegate@8.7.2
  - @graphql-tools/merge@8.2.7
  - @graphql-tools/schema@8.3.7
  - @graphql-tools/wrap@8.4.11

## 8.6.3

### Patch Changes

- Updated dependencies [722abad7]
  - @graphql-tools/schema@8.3.6
  - @graphql-tools/batch-delegate@8.2.10
  - @graphql-tools/delegate@8.7.1
  - @graphql-tools/wrap@8.4.10

## 8.6.2

### Patch Changes

- Updated dependencies [d8fd6b94]
  - @graphql-tools/delegate@8.7.0
  - @graphql-tools/batch-delegate@8.2.9
  - @graphql-tools/wrap@8.4.9

## 8.6.1

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5
  - @graphql-tools/batch-delegate@8.2.8
  - @graphql-tools/delegate@8.6.1
  - @graphql-tools/merge@8.2.6
  - @graphql-tools/schema@8.3.5
  - @graphql-tools/wrap@8.4.8

## 8.6.0

### Minor Changes

- c40e801f: feat: forward gateway operation's name to subschema executors

### Patch Changes

- Updated dependencies [c40e801f]
- Updated dependencies [d36d530b]
  - @graphql-tools/delegate@8.6.0
  - @graphql-tools/utils@8.6.4
  - @graphql-tools/batch-delegate@8.2.7
  - @graphql-tools/wrap@8.4.7
  - @graphql-tools/merge@8.2.5
  - @graphql-tools/schema@8.3.4

## 8.5.2

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/batch-delegate@8.2.6
  - @graphql-tools/delegate@8.5.4
  - @graphql-tools/merge@8.2.4
  - @graphql-tools/schema@8.3.3
  - @graphql-tools/wrap@8.4.6

## 8.5.1

### Patch Changes

- 3da3d66c: fix - align versions
- Updated dependencies [3da3d66c]
  - @graphql-tools/batch-delegate@8.2.5
  - @graphql-tools/wrap@8.4.5
  - @graphql-tools/utils@8.6.3

## 8.5.0

### Minor Changes

- 70081f8f: enhance(stitch): support promises in key functions

### Patch Changes

- Updated dependencies [70081f8f]
- Updated dependencies [70081f8f]
  - @graphql-tools/delegate@8.5.3

## 8.4.4

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/batch-delegate@8.2.4
  - @graphql-tools/delegate@8.5.1
  - @graphql-tools/merge@8.2.3
  - @graphql-tools/schema@8.3.2
  - @graphql-tools/wrap@8.4.2
  - @graphql-tools/utils@8.6.2

## 8.4.3

### Patch Changes

- Updated dependencies [51315610]
  - @graphql-tools/batch-delegate@8.2.3
  - @graphql-tools/delegate@8.4.3
  - @graphql-tools/utils@8.5.4

## 8.4.2

### Patch Changes

- Updated dependencies [5482c99a]
  - @graphql-tools/batch-delegate@8.2.2

## 8.4.1

### Patch Changes

- 981eef80: enhance: remove isPromise and cleanup file-upload handling
- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [981eef80]
- Updated dependencies [4bfb3428]
  - @graphql-tools/wrap@8.3.1
  - @graphql-tools/batch-delegate@8.2.1
  - @graphql-tools/delegate@8.4.1
  - @graphql-tools/merge@8.2.1
  - @graphql-tools/schema@8.3.1
  - @graphql-tools/utils@8.5.1

## 8.4.0

### Minor Changes

- 149afddb: fix: getting ready for GraphQL v16

### Patch Changes

- Updated dependencies [149afddb]
  - @graphql-tools/batch-delegate@8.2.0
  - @graphql-tools/delegate@8.3.0
  - @graphql-tools/merge@8.2.0
  - @graphql-tools/schema@8.3.0
  - @graphql-tools/utils@8.4.0
  - @graphql-tools/wrap@8.2.0

## 8.3.1

### Patch Changes

- d4918a78: fix(commentDescriptions): handle descriptions and comments correctly during merge
- Updated dependencies [d4918a78]
  - @graphql-tools/merge@8.1.1
  - @graphql-tools/utils@8.2.2

## 8.3.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support
- c5b0719c: enhance(utils): move memoize functions to utils
- c5b0719c: enhance(utils): copy collectFields from graphql-js@16 for backwards compat

### Patch Changes

- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
  - @graphql-tools/delegate@8.2.0
  - @graphql-tools/utils@8.2.0
  - @graphql-tools/batch-delegate@8.1.0
  - @graphql-tools/merge@8.1.0
  - @graphql-tools/schema@8.2.0
  - @graphql-tools/wrap@8.1.0

## 8.2.1

### Patch Changes

- c8c13ed1: enhance: remove TypeMap and small improvements
- Updated dependencies [c8c13ed1]
  - @graphql-tools/batch-delegate@8.0.12
  - @graphql-tools/delegate@8.1.1
  - @graphql-tools/merge@8.0.3
  - @graphql-tools/utils@8.1.2

## 8.2.0

### Minor Changes

- 631b11bd: refactor(delegationPlanner): introduce static version of our piecemeal planner

  ...which, although undocumented, can be accessed within the StitchingInfo object saved in a
  stitched schema's extensions.

  Also improves memoization technique slightly across the board.

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions
- Updated dependencies [631b11bd]
- Updated dependencies [e50852e6]
  - @graphql-tools/delegate@8.1.0
  - @graphql-tools/batch-delegate@8.0.11
  - @graphql-tools/merge@8.0.2
  - @graphql-tools/schema@8.1.2
  - @graphql-tools/wrap@8.0.13

## 8.1.2

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1
  - @graphql-tools/batch-delegate@8.0.10
  - @graphql-tools/delegate@8.0.10
  - @graphql-tools/merge@8.0.1
  - @graphql-tools/schema@8.1.1
  - @graphql-tools/wrap@8.0.12

## 8.1.1

### Patch Changes

- 9a13357c: Fix nested type merges with repeated children ignore all but first occurrence
- Updated dependencies [9a13357c]
  - @graphql-tools/delegate@8.0.9
  - @graphql-tools/batch-delegate@8.0.9
  - @graphql-tools/wrap@8.0.11

## 8.1.0

### Minor Changes

- 67691b78: - `schemaExtensions` option has been added to `mergeSchemas`, `makeExecutableSchema` and
  `stitchSchemas` configurations

  Breaking Changes;
  - Move `mergeSchemas` and `MergeSchemasConfig` from `@graphql-tools/merge` to
    `@graphql-tools/schema` package to prevent circular dependency between them.
  - `mergeSchemasAsync` has been removed.
  - Move `NamedDefinitionNode`, `resetComments`, `collectComment`, `pushComment` and `printComment`
    from `@graphql-tools/merge` to `@graphql-tools/utils`.

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [a5fb77a4]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0
  - @graphql-tools/merge@8.0.0
  - @graphql-tools/schema@8.1.0
  - @graphql-tools/batch-delegate@8.0.8
  - @graphql-tools/delegate@8.0.8
  - @graphql-tools/wrap@8.0.10

## 8.0.8

### Patch Changes

- Updated dependencies [d47dcf42]
  - @graphql-tools/delegate@8.0.7
  - @graphql-tools/batch-delegate@8.0.7
  - @graphql-tools/wrap@8.0.7

## 8.0.7

### Patch Changes

- Updated dependencies [ded29f3d]
  - @graphql-tools/delegate@8.0.6
  - @graphql-tools/batch-delegate@8.0.6
  - @graphql-tools/wrap@8.0.6

## 8.0.6

### Patch Changes

- Updated dependencies [7fdef335]
  - @graphql-tools/delegate@8.0.5
  - @graphql-tools/batch-delegate@8.0.5
  - @graphql-tools/wrap@8.0.5

## 8.0.5

### Patch Changes

- Updated dependencies [4992b472]
  - @graphql-tools/merge@7.0.0
  - @graphql-tools/schema@8.0.3

## 8.0.4

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/batch-delegate@8.0.4
  - @graphql-tools/delegate@8.0.4
  - @graphql-tools/merge@6.2.17
  - @graphql-tools/schema@8.0.2
  - @graphql-tools/wrap@8.0.4

## 8.0.3

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/batch-delegate@8.0.3
  - @graphql-tools/delegate@8.0.3
  - @graphql-tools/merge@6.2.16
  - @graphql-tools/schema@8.0.1
  - @graphql-tools/wrap@8.0.3

## 8.0.2

### Patch Changes

- Updated dependencies [d93945fa]
  - @graphql-tools/delegate@8.0.2
  - @graphql-tools/batch-delegate@8.0.2
  - @graphql-tools/wrap@8.0.2

## 8.0.1

### Patch Changes

- c36defbe: fix(delegate): fix ESM import
- Updated dependencies [c36defbe]
  - @graphql-tools/delegate@8.0.1
  - @graphql-tools/batch-delegate@8.0.1
  - @graphql-tools/wrap@8.0.1

## 8.0.0

### Major Changes

- 7d3e3006: BREAKING CHANGE
  - Legacy Schema Directives and Directive Resolvers have been removed
  - - You can check the new method for both;
  - - - https://www.graphql-tools.com/docs/schema-directives
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

- 74581cf3: fix(getDirectives): preserve order around repeatable directives

  BREAKING CHANGE: getDirectives now always return an array of individual DirectiveAnnotation
  objects consisting of `name` and `args` properties.

  New useful function `getDirective` returns an array of objects representing any args for each use
  of a single directive (returning the empty object `{}` when a directive is used without
  arguments).

  Note: The `getDirective` function returns an array even when the specified directive is
  non-repeatable. This is because one use of this function is to throw an error if more than one
  directive annotation is used for a non repeatable directive!

  When specifying directives in extensions, one can use either the old or new format.

- c0ca3190: BREAKING CHANGE
  - Remove Subscriber and use only Executor
  - - Now `Executor` can receive `AsyncIterable` and subscriptions will also be handled by
      `Executor`. This is a future-proof change for defer, stream and live queries

### Minor Changes

- 1b0ce2ae: @ardatanfeat(stitch): add helpers for Relay

### Patch Changes

- 91155ab6: Fixed issue with stitchSchemas function returning info object with left.subschema and
  right.subschema referencing the same object
- Updated dependencies [af9a78de]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [9c26b847]
- Updated dependencies [7d3e3006]
- Updated dependencies [d53e3be5]
- Updated dependencies [7d3e3006]
- Updated dependencies [dae6dc7b]
- Updated dependencies [6877b913]
- Updated dependencies [7d3e3006]
- Updated dependencies [c42e811d]
- Updated dependencies [7d3e3006]
- Updated dependencies [8c8d4fc0]
- Updated dependencies [7d3e3006]
- Updated dependencies [c0ca3190]
- Updated dependencies [7d3e3006]
- Updated dependencies [aa43054d]
- Updated dependencies [7d3e3006]
- Updated dependencies [74581cf3]
- Updated dependencies [c0ca3190]
- Updated dependencies [7d3e3006]
- Updated dependencies [982c8f53]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [a31f9593]
- Updated dependencies [7d3e3006]
  - @graphql-tools/utils@8.0.0
  - @graphql-tools/delegate@8.0.0
  - @graphql-tools/wrap@8.0.0
  - @graphql-tools/schema@8.0.0
  - @graphql-tools/batch-delegate@8.0.0
  - @graphql-tools/merge@6.2.15

## 7.5.3

### Patch Changes

- b48f944c: chore(stitch) export typescript package types + cleanup (#2918)

## 7.5.2

### Patch Changes

- 61da3e82: use value-or-promise to streamline working with sync values or async promises
- Updated dependencies [61da3e82]
  - @graphql-tools/delegate@7.1.4
  - @graphql-tools/schema@7.1.4
  - @graphql-tools/wrap@7.0.6

## 7.5.1

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

- Updated dependencies [6aed1714]
  - @graphql-tools/delegate@7.1.2

## 7.5.0

### Minor Changes

- 58fd4b28: feat(types): add TContext to stitchSchemas and executor

### Patch Changes

- Updated dependencies [58fd4b28]
- Updated dependencies [43da6b59]
  - @graphql-tools/delegate@7.1.0
  - @graphql-tools/utils@7.7.0
  - @graphql-tools/merge@6.2.11

## 7.4.0

### Minor Changes

- 0194118f: Introduces a suite of stitched schema validations that enforce the integrity of merged
  schemas. This includes validations for:
  - Strict and safe null consistency (the later of which allows safe transitions in nullability).
  - Named type consistency with the option to whitelist proxiable scalar mappings.
  - Argument and input field name consistency.
  - Enum value consistency when used as an input value.

  Validations may be adjusted by setting `validationLevel` to `off|warn|error` globally or scoped
  for specific types and fields. In this initial v7 release, all validations are introduced at the
  `warn` threshold for backwards compatibility. Most of these validations will become automatic
  errors in v8. To enable validation errors now, set `validationLevel: 'error'`. Full configuration
  options look like this:

  ```js
  const gatewaySchema = stitchSchemas({
    subschemas: [...],
    typeMergingOptions: {
      validationSettings: {
        validationLevel: 'error',
        strictNullComparison: false, // << gateway "String" may proxy subschema "String!"
        proxiableScalars: {
          ID: ['String'], // << gateway "ID" may proxy subschema "String"
        }
      },
      validationScopes: {
        // scope to specific element paths
        'User.id': {
          validationLevel: 'warn',
          strictNullComparison: true,
        },
      }
    },
  });
  ```

### Patch Changes

- Updated dependencies [0194118f]
  - @graphql-tools/merge@6.2.10

## 7.3.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [24926654]
  - @graphql-tools/delegate@7.0.10

## 7.2.1

### Patch Changes

- 3cf9104c: fix(stitch) canonical via transformed subschema

## 7.2.0

### Minor Changes

- d9b82a2e: enhance(stitch) canonical merged type and field definitions. Use the @canonical
  directive to promote preferred type and field descriptions into the combined gateway schema.

### Patch Changes

- d9b82a2e: fix(merge/stitch) consistent enum value merge
- Updated dependencies [d9b82a2e]
- Updated dependencies [d9b82a2e]
- Updated dependencies [d9b82a2e]
  - @graphql-tools/merge@6.2.7
  - @graphql-tools/delegate@7.0.9

## 7.1.9

### Patch Changes

- 6a966bee: fix(stitch): add \_\_typename for mutations

  fix related to #2349

## 7.1.8

### Patch Changes

- 6e50d9fc: enhance(stitching-directives): use keyField

  When using simple keys, i.e. when using the keyField argument to `@merge`, the keyField can be
  added implicitly to the types's key. In most cases, therefore, `@key` should not be required at
  all.

- Updated dependencies [6e50d9fc]
  - @graphql-tools/utils@7.2.4

## 7.1.7

### Patch Changes

- 06a6acbe: fix(stitch): computed fields should work with merge resolvers that return abstract types

  see: https://github.com/ardatan/graphql-tools/pull/2432#issuecomment-753729191 and:
  https://github.com/gmac/schema-stitching-handbook/pull/17

## 7.1.6

### Patch Changes

- c84d2f8f: fix(stitch): always use defaultMergedResolver by default on gateway

## 7.1.5

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

- Updated dependencies [cd5da458]
- Updated dependencies [cd5da458]
- Updated dependencies [cd5da458]
  - @graphql-tools/delegate@7.0.8
  - @graphql-tools/utils@7.1.6

## 7.1.4

### Patch Changes

- 21da6904: fix release
- Updated dependencies [21da6904]
  - @graphql-tools/wrap@7.0.3
  - @graphql-tools/schema@7.1.2
  - @graphql-tools/utils@7.1.2

## 7.1.3

### Patch Changes

- b48a91b1: add ability to specify merge config within subschemas using directives
- Updated dependencies [b48a91b1]
  - @graphql-tools/schema@7.1.1
  - @graphql-tools/utils@7.1.1

## 7.1.2

### Patch Changes

- 8db8f8dd: fix(typeMerging): support transformed type names when merging types

## 7.1.1

### Patch Changes

- 878c36b6: enhance(stitch): use mergeScalar from merge
- 9c6a4409: enhance(stitch): avoid multiple iterations
- Updated dependencies [878c36b6]
- Updated dependencies [d40c0a84]
  - @graphql-tools/merge@6.2.6
  - @graphql-tools/delegate@7.0.6

## 7.1.0

### Minor Changes

- 4f5a4efe: enhance(schema): add some options to improve schema creation performance

### Patch Changes

- Updated dependencies [65ed780a]
- Updated dependencies [4f5a4efe]
- Updated dependencies [b79e3a6b]
  - @graphql-tools/schema@7.1.0
  - @graphql-tools/utils@7.1.0

## 7.0.4

### Patch Changes

- e50f80a3: enhance(stitch): custom merge resolvers
- Updated dependencies [e50f80a3]
  - @graphql-tools/delegate@7.0.5

## 7.0.3

### Patch Changes

- 718eda30: fix(stitch): fix mergeExternalObject regressions

  v7 introduced a regression in the merging of ExternalObjects that causes type merging to fail when
  undergoing multiple rounds of merging.

- Updated dependencies [718eda30]
  - @graphql-tools/delegate@7.0.2

## 7.0.2

### Patch Changes

- fcbc497b: fix(stitch): support type merging with abstract types (#2137)

## 7.0.1

### Patch Changes

- Updated dependencies [a9254491]
  - @graphql-tools/batch-delegate@7.0.0

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
  - @graphql-tools/delegate@7.0.0
  - @graphql-tools/schema@7.0.0
  - @graphql-tools/utils@7.0.0
  - @graphql-tools/wrap@7.0.0
  - @graphql-tools/merge@6.2.5
  - @graphql-tools/batch-delegate@6.2.5

## 6.2.4

### Patch Changes

- 32c3c4f8: enhance(HoistFields): allow arguments
- 32c3c4f8: enhance(stitching): improve error message for unknown types
- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/wrap@6.2.4
  - @graphql-tools/merge@6.2.4
  - @graphql-tools/utils@6.2.4
  - @graphql-tools/delegate@6.2.4
  - @graphql-tools/batch-delegate@6.2.4
  - @graphql-tools/schema@6.2.4
