# @graphql-tools/executor-graphql-ws

## 4.0.1

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
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Drop Node.js 20 support. The minimum
  supported Node.js version is now 22.15.0.

  Upgrade to Node.js 22.15.0 or later.

### Patch Changes

- Updated dependencies
  [[`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)]:
  - @graphql-tools/executor-common@2.0.0

## 3.2.2

### Patch Changes

- [`2de8d6a`](https://github.com/graphql-hive/gateway/commit/2de8d6a244af2d6b8b3c5dee7cd362942dafd0e9)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Do not carry `extensions.connectionParams`
  over between executions and do not mutate the `connectionParams` option

## 3.2.1

### Patch Changes

- [`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^12.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.1.0)
    (from `^12.0.1`, in `dependencies`)

- Updated dependencies
  [[`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)]:
  - @graphql-tools/executor-common@1.1.1

## 3.2.0

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

## 3.1.5

### Patch Changes

- [#2099](https://github.com/graphql-hive/gateway/pull/2099)
  [`dae3fe4`](https://github.com/graphql-hive/gateway/commit/dae3fe4fbb9c78598d1bbf91c2ed07ab1b90f05d)
  Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - Fix missing NPM
  provenance attestation by enabling `npmPublishProvenance` in Yarn configuration

## 3.1.4

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

## 3.1.3

### Patch Changes

- [#1691](https://github.com/graphql-hive/gateway/pull/1691)
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.3)
    (from `^10.10.1`, in `dependencies`)

- Updated dependencies
  [[`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)]:
  - @graphql-tools/executor-common@1.0.5

## 3.1.2

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

- Updated dependencies
  [[`9c789fb`](https://github.com/graphql-hive/gateway/commit/9c789fb11f6de80e781ff056cb5b98c548938bea),
  [`27789de`](https://github.com/graphql-hive/gateway/commit/27789de7967cb5299d471c00434591f309b978ff),
  [`3f6b99d`](https://github.com/graphql-hive/gateway/commit/3f6b99d152cbcc17d4ec3c97bc48dae452982151)]:
  - @graphql-tools/executor-common@1.0.4

## 3.1.1

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

## 3.1.0

### Minor Changes

- [#1518](https://github.com/graphql-hive/gateway/pull/1518)
  [`a9ec688`](https://github.com/graphql-hive/gateway/commit/a9ec6885f4e136f912ab66c18fa907adf1ff5cde)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Improve isomorphic WS, and drop
  `isomorphic-ws`, for accurate usage in all platforms that natively support WebSockets

### Patch Changes

- [#1518](https://github.com/graphql-hive/gateway/pull/1518)
  [`a9ec688`](https://github.com/graphql-hive/gateway/commit/a9ec6885f4e136f912ab66c18fa907adf1ff5cde)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency [`isows@^1.0.7` ↗︎](https://www.npmjs.com/package/isows/v/1.0.7) (to
    `dependencies`)
  - Removed dependency
    [`isomorphic-ws@^5.0.0` ↗︎](https://www.npmjs.com/package/isomorphic-ws/v/5.0.0) (from
    `dependencies`)

- Updated dependencies
  [[`d7b48a7`](https://github.com/graphql-hive/gateway/commit/d7b48a778344145478f0d3e1e1e188124181f0f2)]:
  - @graphql-tools/executor-common@1.0.2

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

- Updated dependencies
  [[`46d2661`](https://github.com/graphql-hive/gateway/commit/46d26615c2c3c5f936c1d1bca1d03b025c1ce86a)]:
  - @graphql-tools/executor-common@1.0.0

## 2.0.7

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

## 2.0.6

### Patch Changes

- [#1321](https://github.com/graphql-hive/gateway/pull/1321)
  [`6215001`](https://github.com/graphql-hive/gateway/commit/6215001b1d650ad865331661532bcc4f7bad6b40)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`ws@^8.18.3` ↗︎](https://www.npmjs.com/package/ws/v/8.18.3) (from `^8.17.1`,
    in `dependencies`)

- [#1329](https://github.com/graphql-hive/gateway/pull/1329)
  [`ce99e43`](https://github.com/graphql-hive/gateway/commit/ce99e43b9fec43c665836bd3a282ce6d4302481d)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency [`graphql-ws@^6.0.6` ↗︎](https://www.npmjs.com/package/graphql-ws/v/6.0.6)
    (from `^6.0.3`, in `dependencies`)

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

## 2.0.5

### Patch Changes

- [#862](https://github.com/graphql-hive/gateway/pull/862)
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)
  Thanks [@ardatan](https://github.com/ardatan)! - Use signal.addEventListener instead of leaking
  `registerAbortSignalListener` helper

## 2.0.4

### Patch Changes

- [#727](https://github.com/graphql-hive/gateway/pull/727)
  [`c54a080`](https://github.com/graphql-hive/gateway/commit/c54a080b8b9c477ed55dd7c23fc8fcae9139bec8)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.6` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.6)
    (from `^0.0.5`, in `dependencies`)

- Updated dependencies
  [[`e393337`](https://github.com/graphql-hive/gateway/commit/e393337ecb40beffb79748b19b5aa8f2fd9197b7)]:
  - @graphql-tools/executor-common@0.0.4

## 2.0.3

### Patch Changes

- Updated dependencies
  [[`a289faa`](https://github.com/graphql-hive/gateway/commit/a289faae1469eb46f1458be341d21909fe5f8f8f)]:
  - @graphql-tools/executor-common@0.0.3

## 2.0.2

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

## 2.0.1

### Patch Changes

- [#591](https://github.com/graphql-hive/gateway/pull/591)
  [`7d42160`](https://github.com/graphql-hive/gateway/commit/7d42160c31a10efbc680826704410fc1a33fb97c)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the regression preventing users from passing
  custom `lazy` and `lazyCloseTimeout` options

## 2.0.0

### Major Changes

- [#481](https://github.com/graphql-hive/gateway/pull/481)
  [`0b13cb4`](https://github.com/graphql-hive/gateway/commit/0b13cb472305edd01cdbd964a71995831797305e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Executor options don't exist graphql-ws
  dependency options

  Removing the dependency on the types. Some options are still exposed, but if you want to further
  customise the graphql-ws client, you should pass your own instance of the client instead.

  ```ts
  import { createClient } from 'graphql-ws'
  import { buildGraphQLWSExecutor } from '@graphql-tools/executor-graphql-ws'
  import { options } from './my-graphql-ws-client-options'

  const executor = buildGraphQLWSExecutor(
    createClient({
      url: 'ws://localhost:4000/graphql',
      ...options
    })
  )
  ```

- [#481](https://github.com/graphql-hive/gateway/pull/481)
  [`0b13cb4`](https://github.com/graphql-hive/gateway/commit/0b13cb472305edd01cdbd964a71995831797305e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Upgrade graphql-ws to v6

  If you have a custom graphql-ws configuration when building the executor with
  `buildGraphQLWSExecutor`, you will have to migrate the graphql-ws side to v6.
  [Please consult the changelog of graphql-ws.](https://github.com/enisdenjo/graphql-ws/releases/tag/v6.0.0)

### Minor Changes

- [#481](https://github.com/graphql-hive/gateway/pull/481)
  [`0b13cb4`](https://github.com/graphql-hive/gateway/commit/0b13cb472305edd01cdbd964a71995831797305e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Export GraphQLWSExecutorOptions type

### Patch Changes

- [#481](https://github.com/graphql-hive/gateway/pull/481)
  [`0b13cb4`](https://github.com/graphql-hive/gateway/commit/0b13cb472305edd01cdbd964a71995831797305e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency [`graphql-ws@^6.0.3` ↗︎](https://www.npmjs.com/package/graphql-ws/v/6.0.3)
    (from `^5.14.0`, in `dependencies`)

## 1.3.7

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

## 1.3.6

### Patch Changes

- [#373](https://github.com/graphql-hive/gateway/pull/373)
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.7.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.7.0)
    (from `^10.6.2`, in `dependencies`)

## 1.3.5

### Patch Changes

- [#291](https://github.com/graphql-hive/gateway/pull/291)
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`tslib@^2.8.1` ↗︎](https://www.npmjs.com/package/tslib/v/2.8.1) (from
    `^2.4.0`, in `dependencies`)

## 1.3.4

### Patch Changes

- [#269](https://github.com/graphql-hive/gateway/pull/269)
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.2)
    (from `^10.6.0`, in `dependencies`)

## 1.3.3

### Patch Changes

- [#164](https://github.com/graphql-hive/gateway/pull/164)
  [`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (from `^10.5.6`, in `dependencies`)

## 1.3.2

### Patch Changes

- Updated dependencies
  [[`dc5043b`](https://github.com/ardatan/graphql-tools/commit/dc5043bb7c9afaca907c242eb6bf65e8019d79c4)]:
  - @graphql-tools/utils@10.5.6

## 1.3.1

### Patch Changes

- Updated dependencies
  [[`cf2ce5e`](https://github.com/ardatan/graphql-tools/commit/cf2ce5ed4773087cc324599f2812f4fb91398b21)]:
  - @graphql-tools/utils@10.5.5

## 1.3.0

### Minor Changes

- [#6540](https://github.com/ardatan/graphql-tools/pull/6540)
  [`1e085bd`](https://github.com/ardatan/graphql-tools/commit/1e085bd8516a692e91afe3f1b95b9f5740485693)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Allow to configure headers of the
  WebSocket sent with the upgrade request.

## 1.2.1

### Patch Changes

- [#6536](https://github.com/ardatan/graphql-tools/pull/6536)
  [`3facde0`](https://github.com/ardatan/graphql-tools/commit/3facde02724add648a00feafaaee6a76a443d25d)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - `webSocketImpl` and `lazy` options were
  ignored and overriden by default values. This is no longer the case and it's now possible to
  change the `WebSocket` implementation.

## 1.2.0

### Minor Changes

- [#6323](https://github.com/ardatan/graphql-tools/pull/6323)
  [`cacf20f`](https://github.com/ardatan/graphql-tools/commit/cacf20f8dbe4ec5dce0d5fd87e37cf69ef9b177e)
  Thanks [@ardatan](https://github.com/ardatan)! - Implement Symbol.dispose or Symbol.asyncDispose
  to make \`Executor\`s \`Disposable\`

### Patch Changes

- Updated dependencies
  [[`cacf20f`](https://github.com/ardatan/graphql-tools/commit/cacf20f8dbe4ec5dce0d5fd87e37cf69ef9b177e)]:
  - @graphql-tools/utils@10.3.0

## 1.1.2

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.2`, in `dependencies`)

## 1.1.1

### Patch Changes

- [#5666](https://github.com/ardatan/graphql-tools/pull/5666)
  [`6269314d`](https://github.com/ardatan/graphql-tools/commit/6269314dfe2ae7b9074096a2831e39c9ee17be0a)
  Thanks [@ThomasMoritz](https://github.com/ThomasMoritz)! - changed the order how the configuration
  is given into the graphql-wsclient and prevent the overwriting of the parameters

## 1.1.0

### Minor Changes

- [#4781](https://github.com/ardatan/graphql-tools/pull/4781)
  [`104921ff`](https://github.com/ardatan/graphql-tools/commit/104921ffc066bde737d4cb36a3bbd1b3b2ad4094)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Read and use `connectionParams` from
  operation extensions

## 1.0.2

### Patch Changes

- [#5396](https://github.com/ardatan/graphql-tools/pull/5396)
  [`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c)
  Thanks [@ardatan](https://github.com/ardatan)! - Simplify GraphQL WS executor

- Updated dependencies
  [[`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c),
  [`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c)]:
  - @graphql-tools/utils@10.0.2

## 1.0.1

### Patch Changes

- [#5374](https://github.com/ardatan/graphql-tools/pull/5374)
  [`88a7de96`](https://github.com/ardatan/graphql-tools/commit/88a7de96c7766d94f9ac0adbe54523e585f8566c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`graphql-ws@5.14.0` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.14.0)
    (from `5.13.1`, in `dependencies`)

## 1.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- [#5272](https://github.com/ardatan/graphql-tools/pull/5272)
  [`3a870139`](https://github.com/ardatan/graphql-tools/commit/3a870139e13236f3ecc744666dd1c6fdb9f6be59)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`graphql-ws@5.13.0` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.13.0)
    (from `5.12.1`, in `dependencies`)

- [#5277](https://github.com/ardatan/graphql-tools/pull/5277)
  [`853db708`](https://github.com/ardatan/graphql-tools/commit/853db70824fc86350a61bae415b7965fa2c06355)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`graphql-ws@5.13.1` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.13.1)
    (from `5.13.0`, in `dependencies`)
- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/utils@10.0.0

## 0.0.14

### Patch Changes

- [`1c95368a`](https://github.com/ardatan/graphql-tools/commit/1c95368aea868be537d956ba5e994cde58dfee41)
  Thanks [@ardatan](https://github.com/ardatan)! - Use ranged versions for dependencies

## 0.0.13

### Patch Changes

- [#5112](https://github.com/ardatan/graphql-tools/pull/5112)
  [`828fbf93`](https://github.com/ardatan/graphql-tools/commit/828fbf93ff317d00577c9a94402736bac5f4be39)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`ws@8.13.0` ↗︎](https://www.npmjs.com/package/ws/v/8.13.0) (from `8.12.1`, in
    `dependencies`)
  - Updated dependency [`graphql-ws@5.12.1` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.12.1)
    (from `5.12.0`, in `dependencies`)

## 0.0.12

### Patch Changes

- [#5096](https://github.com/ardatan/graphql-tools/pull/5096)
  [`a5073e85`](https://github.com/ardatan/graphql-tools/commit/a5073e85124fa90db9dda606ed70a4a560d95737)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`graphql-ws@5.12.0` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.12.0)
    (from `5.11.3`, in `dependencies`)

## 0.0.11

### Patch Changes

- [#5058](https://github.com/ardatan/graphql-tools/pull/5058)
  [`1298727c`](https://github.com/ardatan/graphql-tools/commit/1298727c629b4d535b023dcf920639ae43571692)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`ws@8.12.1` ↗︎](https://www.npmjs.com/package/ws/v/8.12.1) (from `8.12.0`, in
    `dependencies`)

## 0.0.10

### Patch Changes

- Updated dependencies
  [[`b5c8f640`](https://github.com/ardatan/graphql-tools/commit/b5c8f6407b74466ed0d2989000458cb59239e9af)]:
  - @graphql-tools/utils@9.2.1

## 0.0.9

### Patch Changes

- [#5020](https://github.com/ardatan/graphql-tools/pull/5020)
  [`d104ce50`](https://github.com/ardatan/graphql-tools/commit/d104ce50a9ee18e92ffc92c39ff87e1cffc2aa19)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`graphql-ws@5.11.3` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.11.3)
    (from `5.11.2`, in `dependencies`)

## 0.0.8

### Patch Changes

- Updated dependencies
  [[`a94217e9`](https://github.com/ardatan/graphql-tools/commit/a94217e920c5d6237471ab6ad4d96cf230984177),
  [`62d074be`](https://github.com/ardatan/graphql-tools/commit/62d074be48779b1e096e056ca1233822c421dc99)]:
  - @graphql-tools/utils@9.2.0

## 0.0.7

### Patch Changes

- [`1c291f33`](https://github.com/ardatan/graphql-tools/commit/1c291f33ba5e42126b5335530c1ac4cd6b3eaf6a)
  Thanks [@ardatan](https://github.com/ardatan)! - Support regular queries and mutations in WS
  Executor

## 0.0.6

### Patch Changes

- [#4952](https://github.com/ardatan/graphql-tools/pull/4952)
  [`1c4853cb`](https://github.com/ardatan/graphql-tools/commit/1c4853cb8563d83c0d862d3c11257c48c7d1469c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`ws@8.12.0` ↗︎](https://www.npmjs.com/package/ws/v/8.12.0) (from `8.11.0`, in
    `dependencies`)
- Updated dependencies
  [[`e3ec35ed`](https://github.com/ardatan/graphql-tools/commit/e3ec35ed27d4a329739c8da6be06ce74c8f25591)]:
  - @graphql-tools/utils@9.1.4

## 0.0.5

### Patch Changes

- Updated dependencies
  [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3

## 0.0.4

### Patch Changes

- Updated dependencies
  [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b)]:
  - @graphql-tools/utils@9.1.2

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
