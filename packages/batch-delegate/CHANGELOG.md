# @graphql-tools/batch-delegate

## 12.0.0

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
  [`c36d9b8`](https://github.com/ardatan/graphql-mesh/commit/c36d9b8930c971558cd7471c67edf0b3783d808c),
  [`2c4a150`](https://github.com/ardatan/graphql-mesh/commit/2c4a150f2b5838cccfe1655e3b628d8314df61bc)]:
  - @graphql-tools/delegate@14.0.0

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
  [[`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2),
  [`1204709`](https://github.com/graphql-hive/gateway/commit/12047092208631559c48d147d861815d63d953c2)]:
  - @graphql-tools/delegate@13.0.0

## 10.1.8

### Patch Changes

- Updated dependencies
  [[`a0bd5e8`](https://github.com/graphql-hive/gateway/commit/a0bd5e8882d04c1211c244adc991e62bb4e5c369)]:
  - @graphql-tools/delegate@12.3.6

## 10.1.7

### Patch Changes

- Updated dependencies
  [[`b180423`](https://github.com/graphql-hive/gateway/commit/b1804230911a8cd047ee0953304469ff4cb6b131),
  [`ad89e84`](https://github.com/graphql-hive/gateway/commit/ad89e8443b1839e79fa6c34a0347a2f3c67d3ec2)]:
  - @graphql-tools/delegate@12.3.5

## 10.1.6

### Patch Changes

- Updated dependencies
  [[`3e0a896`](https://github.com/graphql-hive/gateway/commit/3e0a896cf110d8a6290e20b10b6865813301f5ca)]:
  - @graphql-tools/delegate@12.3.4

## 10.1.5

### Patch Changes

- [`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^12.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.1.0)
    (from `^12.0.1`, in `dependencies`)

- Updated dependencies
  [[`e288224`](https://github.com/graphql-hive/gateway/commit/e28822460e2189e3b1e112bf2ad9072d68c01f90)]:
  - @graphql-tools/delegate@12.3.3

## 10.1.4

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@12.3.2

## 10.1.3

### Patch Changes

- [#2700](https://github.com/graphql-hive/gateway/pull/2700)
  [`4c1d3f0`](https://github.com/graphql-hive/gateway/commit/4c1d3f01c4e2842d9fd2c1f81a3f753da1d57405)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Scope batch delegation loaders to both the
  `rootValue` and the `context`

  Servers like mercurius pass the same `rootValue` object to every execution, which made the loaders
  outlive the request and serve stale results and stale variable values on subsequent requests.

  Closes [#2630](https://github.com/graphql-hive/gateway/issues/2630)

- Updated dependencies
  [[`aabe28a`](https://github.com/graphql-hive/gateway/commit/aabe28a87cc4e85f590bbf4340a9c8700d544223),
  [`a558eea`](https://github.com/graphql-hive/gateway/commit/a558eeae3c94deb60d40f98232b9d4d82ae9d9a1)]:
  - @graphql-tools/delegate@12.3.1

## 10.1.2

### Patch Changes

- Updated dependencies
  [[`127576a`](https://github.com/graphql-hive/gateway/commit/127576a9e823cd2425c69432166a175464882b7f),
  [`befdb8e`](https://github.com/graphql-hive/gateway/commit/befdb8e3e352650c9f6c4e5fbeadfcf3615ee6ae),
  [`cd30482`](https://github.com/graphql-hive/gateway/commit/cd30482174173564e7a292f36b8dd12cc7cfab59)]:
  - @graphql-tools/delegate@12.3.0

## 10.1.1

### Patch Changes

- Updated dependencies
  [[`abf4091`](https://github.com/graphql-hive/gateway/commit/abf40919725f57d81ede935bee27a7b408e7d99b)]:
  - @graphql-tools/delegate@12.2.1

## 10.1.0

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
  - @graphql-tools/delegate@12.2.0

## 10.0.32

### Patch Changes

- Updated dependencies
  [[`e5ea5f4`](https://github.com/graphql-hive/gateway/commit/e5ea5f419bb27abe24e6962f07fd98fb886464f7)]:
  - @graphql-tools/delegate@12.1.4

## 10.0.31

### Patch Changes

- Updated dependencies
  [[`eb6569b`](https://github.com/graphql-hive/gateway/commit/eb6569b3ee21bdc16c67c6d356101e66e206d520)]:
  - @graphql-tools/delegate@12.1.3

## 10.0.30

### Patch Changes

- Updated dependencies
  [[`af2cccb`](https://github.com/graphql-hive/gateway/commit/af2cccb7150db504ce42ab6b463166341377614f)]:
  - @graphql-tools/delegate@12.1.2

## 10.0.29

### Patch Changes

- Updated dependencies
  [[`9ff0daf`](https://github.com/graphql-hive/gateway/commit/9ff0dafdfaa1db829dbde2c28e98c78e47fc7b24)]:
  - @graphql-tools/delegate@12.1.1

## 10.0.28

### Patch Changes

- Updated dependencies
  [[`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc),
  [`6f2c3b6`](https://github.com/graphql-hive/gateway/commit/6f2c3b64b05f6ba17928fd098915c2167f3daedc)]:
  - @graphql-tools/delegate@12.1.0

## 10.0.27

### Patch Changes

- Updated dependencies
  [[`8a08de3`](https://github.com/graphql-hive/gateway/commit/8a08de36be598f975ba500a28a9bd9710ead2d66),
  [`65ce370`](https://github.com/graphql-hive/gateway/commit/65ce3702231068c946d4f95147b556cab57ad28c)]:
  - @graphql-tools/delegate@12.0.20

## 10.0.26

### Patch Changes

- Updated dependencies
  [[`0bbdbbc`](https://github.com/graphql-hive/gateway/commit/0bbdbbc22b75d9705a77f96144af002c796a695d)]:
  - @graphql-tools/delegate@12.0.19

## 10.0.25

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@12.0.18

## 10.0.24

### Patch Changes

- [#2393](https://github.com/graphql-hive/gateway/pull/2393)
  [`b6230c9`](https://github.com/graphql-hive/gateway/commit/b6230c97709065c2f540b6d263af492379eca359)
  Thanks [@sjransom](https://github.com/sjransom)! - Fix
  `DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise of an Array`
  thrown when the batch resolves to a sparse array.

  When `valuesFromResults` returns an array with a hole at the trailing slot — for example when it
  maps results back to keys by index and the last key in a batch has no matching row — the resulting
  array fails DataLoader's `isArrayLike` check (which requires `hasOwnProperty(length - 1)`), even
  though `Array.isArray` returns `true`. The batch result is now normalised to a dense array of
  `keys.length`, padding any missing entries with `null`.

## 10.0.23

### Patch Changes

- Updated dependencies
  [[`3e774e0`](https://github.com/graphql-hive/gateway/commit/3e774e050bc2d3c33e0f36a258ab6a8d94bf0750)]:
  - @graphql-tools/delegate@12.0.17

## 10.0.22

### Patch Changes

- Updated dependencies
  [[`deafdc0`](https://github.com/graphql-hive/gateway/commit/deafdc00e388ed195c2cdf77e98cd19e7d496d48)]:
  - @graphql-tools/delegate@12.0.16

## 10.0.21

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

- Updated dependencies
  [[`7171b46`](https://github.com/graphql-hive/gateway/commit/7171b46546a8e60776f70d18d14dd6fa19d5649f)]:
  - @graphql-tools/delegate@12.0.15

## 10.0.20

### Patch Changes

- Updated dependencies
  [[`dff525f`](https://github.com/graphql-hive/gateway/commit/dff525f214d3525434c5a73a5b3fb22c46550163)]:
  - @graphql-tools/delegate@12.0.14

## 10.0.19

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@12.0.13

## 10.0.18

### Patch Changes

- Updated dependencies
  [[`da68d27`](https://github.com/graphql-hive/gateway/commit/da68d2710dff1f8bca5b17bcd5368e631f72114e)]:
  - @graphql-tools/delegate@12.0.12

## 10.0.17

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@12.0.11

## 10.0.16

### Patch Changes

- Updated dependencies
  [[`dae3fe4`](https://github.com/graphql-hive/gateway/commit/dae3fe4fbb9c78598d1bbf91c2ed07ab1b90f05d)]:
  - @graphql-tools/delegate@12.0.10

## 10.0.15

### Patch Changes

- Updated dependencies
  [[`43aaa6a`](https://github.com/graphql-hive/gateway/commit/43aaa6ab8c1c64cae92e9cdff7016ebdf1afa756)]:
  - @graphql-tools/delegate@12.0.9

## 10.0.14

### Patch Changes

- Updated dependencies
  [[`4065b7f`](https://github.com/graphql-hive/gateway/commit/4065b7fbb08d9e75c5f0d3b2b4d42d665aa9dbd9)]:
  - @graphql-tools/delegate@12.0.8

## 10.0.13

### Patch Changes

- Updated dependencies
  [[`584a293`](https://github.com/graphql-hive/gateway/commit/584a293e3dafa7cd2d0210f80299c81b6707bcd4)]:
  - @graphql-tools/delegate@12.0.7

## 10.0.12

### Patch Changes

- Updated dependencies
  [[`2200fc3`](https://github.com/graphql-hive/gateway/commit/2200fc3e9b94db77a642835bbf2d646c65b3e8d0)]:
  - @graphql-tools/delegate@12.0.6

## 10.0.11

### Patch Changes

- Updated dependencies
  [[`e92c5a9`](https://github.com/graphql-hive/gateway/commit/e92c5a9702a2aea395a4a4e3a482b92f528655e8)]:
  - @graphql-tools/delegate@12.0.5

## 10.0.10

### Patch Changes

- [#1842](https://github.com/graphql-hive/gateway/pull/1842)
  [`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^11.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.0.0)
    (from `^10.10.3`, in `dependencies`)

- Updated dependencies
  [[`93aa767`](https://github.com/graphql-hive/gateway/commit/93aa76755afc93085280646fb7cb14e6d02b4a7f)]:
  - @graphql-tools/delegate@12.0.4

## 10.0.9

### Patch Changes

- Updated dependencies
  [[`dcd8f0e`](https://github.com/graphql-hive/gateway/commit/dcd8f0e93fd220cb99f79cadea759ea49bc15308)]:
  - @graphql-tools/delegate@12.0.3

## 10.0.8

### Patch Changes

- Updated dependencies
  [[`da8b8e3`](https://github.com/graphql-hive/gateway/commit/da8b8e3f3545487249b11c6577e3889f68527249)]:
  - @graphql-tools/delegate@12.0.2

## 10.0.7

### Patch Changes

- Updated dependencies
  [[`0d14faf`](https://github.com/graphql-hive/gateway/commit/0d14fafdbaf3fb27eef123016ef2ca977d6688d8)]:
  - @graphql-tools/delegate@12.0.1

## 10.0.6

### Patch Changes

- Updated dependencies
  [[`1dbc653`](https://github.com/graphql-hive/gateway/commit/1dbc6536cb992a705cac7894acca6fe5431b72de),
  [`bc6cddd`](https://github.com/graphql-hive/gateway/commit/bc6cddd1c53a012dd02a1d8a7217a28e65cc6ae9),
  [`b520eb2`](https://github.com/graphql-hive/gateway/commit/b520eb2309f627578519826d6b9e0056252c6c46)]:
  - @graphql-tools/delegate@12.0.0

## 10.0.5

### Patch Changes

- [#1691](https://github.com/graphql-hive/gateway/pull/1691)
  [`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.3)
    (from `^10.10.1`, in `dependencies`)

- Updated dependencies
  [[`7ecaf7e`](https://github.com/graphql-hive/gateway/commit/7ecaf7e8f658c4e4c1a91d1e8db3c1a8ceca51cb)]:
  - @graphql-tools/delegate@11.1.3

## 10.0.4

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
  [`d678113`](https://github.com/graphql-hive/gateway/commit/d678113debfe28095ed6e09c2abba4451a42608a)]:
  - @graphql-tools/delegate@11.1.2

## 10.0.3

### Patch Changes

- [#1654](https://github.com/graphql-hive/gateway/pull/1654)
  [`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.10.0)
    (from `^10.9.1`, in `dependencies`)

- Updated dependencies
  [[`efed5e0`](https://github.com/graphql-hive/gateway/commit/efed5e0c257edcacb51dae7f670c2026a747a851)]:
  - @graphql-tools/delegate@11.1.1

## 10.0.2

### Patch Changes

- [#1556](https://github.com/graphql-hive/gateway/pull/1556)
  [`058ef2f`](https://github.com/graphql-hive/gateway/commit/058ef2f8373ea822fed985b705416cb39d5b6efc)
  Thanks [@ardatan](https://github.com/ardatan)! - Correct error paths in case of batch delegation
  with the same error

- Updated dependencies
  [[`a54b0c1`](https://github.com/graphql-hive/gateway/commit/a54b0c1777229aaeea295bcd15d4f4d6e4e615f7),
  [`058ef2f`](https://github.com/graphql-hive/gateway/commit/058ef2f8373ea822fed985b705416cb39d5b6efc),
  [`a8458b2`](https://github.com/graphql-hive/gateway/commit/a8458b24e71fda37a515eaf9ac9af43a73e7823f),
  [`20f7a50`](https://github.com/graphql-hive/gateway/commit/20f7a50c5ddb862c2921e91ca43d9858bae1bce8)]:
  - @graphql-tools/delegate@11.1.0

## 10.0.1

### Patch Changes

- [#1473](https://github.com/graphql-hive/gateway/pull/1473)
  [`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.2)
    (from `^1.3.0`, in `dependencies`)

- Updated dependencies
  [[`838ffec`](https://github.com/graphql-hive/gateway/commit/838ffecb2ad3d4ef6bbb65607a56302cb45e2f14)]:
  - @graphql-tools/delegate@11.0.1

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
  - @graphql-tools/delegate@11.0.0

## 9.0.41

### Patch Changes

- [#1358](https://github.com/graphql-hive/gateway/pull/1358)
  [`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.1)
    (from `^10.9.0`, in `dependencies`)

- Updated dependencies
  [[`8e37851`](https://github.com/graphql-hive/gateway/commit/8e3785194d97edbe82c7fce316104b81bb0362f1)]:
  - @graphql-tools/delegate@10.2.23

## 9.0.40

### Patch Changes

- [#1344](https://github.com/graphql-hive/gateway/pull/1344)
  [`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.9.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.9.0)
    (from `^10.8.1`, in `dependencies`)

- Updated dependencies
  [[`a71236d`](https://github.com/graphql-hive/gateway/commit/a71236d6ba356741bc85fe27757bea45576dcf1a)]:
  - @graphql-tools/delegate@10.2.22

## 9.0.39

### Patch Changes

- Updated dependencies
  [[`b69c80b`](https://github.com/graphql-hive/gateway/commit/b69c80b259bd0565eb9826f7ee9bc8e6c32076d1)]:
  - @graphql-tools/delegate@10.2.21

## 9.0.38

### Patch Changes

- Updated dependencies
  [[`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56),
  [`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56),
  [`0655d1f`](https://github.com/graphql-hive/gateway/commit/0655d1fc604179b6cc0c148d73e38d6e8d839c56)]:
  - @graphql-tools/delegate@10.2.20

## 9.0.37

### Patch Changes

- [#1140](https://github.com/graphql-hive/gateway/pull/1140)
  [`f634b53`](https://github.com/graphql-hive/gateway/commit/f634b53478199c2b783a608e22fbe51401942039)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Use delegated response iterable next
  iterations for accurate cache key construction in external value loaders

- [#1134](https://github.com/graphql-hive/gateway/pull/1134)
  [`dca6529`](https://github.com/graphql-hive/gateway/commit/dca6529b234f1e178ad87a8992c5a7de12831128)
  Thanks [@ardatan](https://github.com/ardatan)! - Small improvements on usage of promise helpers

- Updated dependencies []:
  - @graphql-tools/delegate@10.2.19

## 9.0.36

### Patch Changes

- Updated dependencies
  [[`0512be3`](https://github.com/graphql-hive/gateway/commit/0512be32399268eb7926db48675ddb5763fd8578)]:
  - @graphql-tools/delegate@10.2.18

## 9.0.35

### Patch Changes

- Updated dependencies
  [[`c7ea2c5`](https://github.com/graphql-hive/gateway/commit/c7ea2c5ae71b6b338ef22edd927a3fc93803965f),
  [`0af3485`](https://github.com/graphql-hive/gateway/commit/0af3485abb1b3dfba4126f09d291b2096d23aa32)]:
  - @graphql-tools/delegate@10.2.17

## 9.0.34

### Patch Changes

- [#532](https://github.com/graphql-hive/gateway/pull/532)
  [`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.3.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.3.0)
    (from `^1.2.5`, in `dependencies`)

- Updated dependencies
  [[`4e33933`](https://github.com/graphql-hive/gateway/commit/4e339333945f4c4547d9ae719e67b4671fe89f04)]:
  - @graphql-tools/delegate@10.2.16

## 9.0.33

### Patch Changes

- [#862](https://github.com/graphql-hive/gateway/pull/862)
  [`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.2.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.2.5)
    (from `^1.0.0`, in `dependencies`)

- Updated dependencies
  [[`278618a`](https://github.com/graphql-hive/gateway/commit/278618a1383a01016041ce0a40adec8803c62448)]:
  - @graphql-tools/delegate@10.2.15

## 9.0.32

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
  [[`6334b2e`](https://github.com/graphql-hive/gateway/commit/6334b2e5d4942693121ab7d44a96fa80408aace1),
  [`2a54e85`](https://github.com/graphql-hive/gateway/commit/2a54e85f2848aea7525703ea33918a21db96b26b)]:
  - @graphql-tools/delegate@10.2.14

## 9.0.31

### Patch Changes

- Updated dependencies
  [[`2318393`](https://github.com/graphql-hive/gateway/commit/2318393bc7b3aca7f53806a44b59277cd176702d)]:
  - @graphql-tools/delegate@10.2.13

## 9.0.30

### Patch Changes

- [#620](https://github.com/graphql-hive/gateway/pull/620)
  [`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.1)
    (from `^10.7.0`, in `dependencies`)

- Updated dependencies
  [[`d72209a`](https://github.com/graphql-hive/gateway/commit/d72209ad82ec53689f93ce5d81bfa52493919ad9)]:
  - @graphql-tools/delegate@10.2.12

## 9.0.29

### Patch Changes

- Updated dependencies
  [[`9144222`](https://github.com/graphql-hive/gateway/commit/91442220b2242a0fa082d4b544d03621572eecd0)]:
  - @graphql-tools/delegate@10.2.11

## 9.0.28

### Patch Changes

- Updated dependencies
  [[`18682e6`](https://github.com/graphql-hive/gateway/commit/18682e6873091afe63f09414f02f93649a4da141)]:
  - @graphql-tools/delegate@10.2.10

## 9.0.27

### Patch Changes

- [#396](https://github.com/graphql-hive/gateway/pull/396)
  [`da65b2d`](https://github.com/graphql-hive/gateway/commit/da65b2d8a66714fb5a135e66ebbe59fa37182600)
  Thanks [@ardatan](https://github.com/ardatan)! - Memoize the key arguments correctly;

  With the following schema and resolvers, `userById` should batch all the requests to `usersByIds`;

  ```ts
  {
        typeDefs: /* GraphQL */ `
          type User {
            id: ID!
            email: String!
          }
          type Query {
            userById(id: ID!): User
            usersByIds(ids: [ID!]): [User]
          }
        `,
        resolvers: {
          Query: {
            usersByIds: (_root, args) => {
              return args.ids.map((id: string) => users.find((user) => user.id === id));
            },
            userById: (root, args, context, info) => {
              return batchDelegateToSchema({
                schema: userSubschema,
                fieldName: 'usersByIds',
                key: args.id,
                rootValue: root,
                context,
                info,
              })
            },
          },
        },
      }
  ```

  This query should batch all the requests to `usersByIds`:

  ```graphql
  {
    userById(id: "1") {
      id
      email
    }
    userById(id: "2") {
      id
      email
    }
  }
  ```

  The delegation request should be;

  ```graphql
  {
    usersByIds(ids: ["1", "2"]) {
      id
      email
    }
  }
  ```

## 9.0.26

### Patch Changes

- [#382](https://github.com/graphql-hive/gateway/pull/382)
  [`21e1f05`](https://github.com/graphql-hive/gateway/commit/21e1f05373a78c93b52b5321f1f4e8d7aba17151)
  Thanks [@ardatan](https://github.com/ardatan)! - Memoize the batched delegation loader by
  respecting the arguments correctly

  [See more details in the PR](https://github.com/ardatan/graphql-tools/pull/5189)

## 9.0.25

### Patch Changes

- [#373](https://github.com/graphql-hive/gateway/pull/373)
  [`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.7.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.7.0)
    (from `^10.6.2`, in `dependencies`)

- Updated dependencies
  [[`e606975`](https://github.com/graphql-hive/gateway/commit/e60697593290255fb9ac407e591ae3e8cb752df2)]:
  - @graphql-tools/delegate@10.2.9

## 9.0.24

### Patch Changes

- Updated dependencies
  [[`23b8987`](https://github.com/graphql-hive/gateway/commit/23b89874fcf10b4cb6b1b941f29fa5f5aecf0ef2)]:
  - @graphql-tools/delegate@10.2.8

## 9.0.23

### Patch Changes

- [#291](https://github.com/graphql-hive/gateway/pull/291)
  [`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`tslib@^2.8.1` ↗︎](https://www.npmjs.com/package/tslib/v/2.8.1) (from
    `^2.4.0`, in `dependencies`)

- Updated dependencies
  [[`34d1224`](https://github.com/graphql-hive/gateway/commit/34d12249ead65b8277df976f6318dca757df1151)]:
  - @graphql-tools/delegate@10.2.7

## 9.0.22

### Patch Changes

- [#264](https://github.com/graphql-hive/gateway/pull/264)
  [`6f56083`](https://github.com/graphql-hive/gateway/commit/6f56083028402780f505db1492b9e84ab4227a4f)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dataloader@2.2.3` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.3)
    (from `2.2.2`, in `dependencies`)

- [#268](https://github.com/graphql-hive/gateway/pull/268)
  [`7df2215`](https://github.com/graphql-hive/gateway/commit/7df2215abd309dc1dfd91f4ec91ce975f3982c62)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`dataloader@^2.2.3` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.3)
    (from `2.2.3`, in `dependencies`)

- [#269](https://github.com/graphql-hive/gateway/pull/269)
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.2)
    (from `^10.6.0`, in `dependencies`)

- Updated dependencies
  [[`7df2215`](https://github.com/graphql-hive/gateway/commit/7df2215abd309dc1dfd91f4ec91ce975f3982c62),
  [`cdca511`](https://github.com/graphql-hive/gateway/commit/cdca5116ce30c2bfced1130c9fbead67280af9d4)]:
  - @graphql-tools/delegate@10.2.6

## 9.0.21

### Patch Changes

- Updated dependencies
  [[`9ce705c`](https://github.com/graphql-hive/gateway/commit/9ce705c5ccc5e6f4ac26af6e6471a6d2f4e995db)]:
  - @graphql-tools/delegate@10.2.5

## 9.0.20

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@10.2.4

## 9.0.19

### Patch Changes

- Updated dependencies
  [[`7ca0ff3`](https://github.com/graphql-hive/gateway/commit/7ca0ff331e42c133c4218a8086bbf0a7607f45d0)]:
  - @graphql-tools/delegate@10.2.3

## 9.0.18

### Patch Changes

- Updated dependencies
  [[`2e0add3`](https://github.com/graphql-hive/gateway/commit/2e0add3ea9b237ad385d5b5cd4c12eeeb847805a)]:
  - @graphql-tools/delegate@10.2.2

## 9.0.17

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

- Updated dependencies
  [[`310613d`](https://github.com/graphql-hive/gateway/commit/310613d68d1df3e2bceafbd0730084a4c83527bf)]:
  - @graphql-tools/delegate@10.2.1

## 9.0.16

### Patch Changes

- Updated dependencies
  [[`f32cb2a`](https://github.com/graphql-hive/gateway/commit/f32cb2a0289aa32e4811ced5dc1aac3efb0674f1)]:
  - @graphql-tools/delegate@10.2.0

## 9.0.15

### Patch Changes

- Updated dependencies
  [[`73c621d`](https://github.com/graphql-hive/gateway/commit/73c621d98a4e6ca134527e349bc71223c03d06db)]:
  - @graphql-tools/delegate@10.1.3

## 9.0.13

### Patch Changes

- Updated dependencies
  [[`342e044`](https://github.com/ardatan/graphql-tools/commit/342e044c7da74aaf5df6a90ce68973c525c9aa10)]:
  - @graphql-tools/delegate@10.1.1

## 9.0.12

### Patch Changes

- Updated dependencies
  [[`e9906eb`](https://github.com/ardatan/graphql-tools/commit/e9906eb311132ab902720e75bc787228d67c0e34)]:
  - @graphql-tools/delegate@10.1.0

## 9.0.11

### Patch Changes

- Updated dependencies
  [[`da1de08`](https://github.com/ardatan/graphql-tools/commit/da1de08c269a4cb3ed8240bf191833f7e75a6b01)]:
  - @graphql-tools/delegate@10.0.29

## 9.0.10

### Patch Changes

- Updated dependencies
  [[`f470f49`](https://github.com/ardatan/graphql-tools/commit/f470f49f7d8445801a2983f14532124588f9f59e)]:
  - @graphql-tools/delegate@10.0.28

## 9.0.9

### Patch Changes

- Updated dependencies
  [[`180f3f0`](https://github.com/ardatan/graphql-tools/commit/180f3f0c8362613eb3013ff12f2d5405cd987903)]:
  - @graphql-tools/delegate@10.0.27

## 9.0.8

### Patch Changes

- Updated dependencies
  [[`8effad4`](https://github.com/ardatan/graphql-tools/commit/8effad4ffb9be1bca098b8cb6ce41b84ac7d9b6b)]:
  - @graphql-tools/delegate@10.0.26

## 9.0.7

### Patch Changes

- Updated dependencies
  [[`8a16b01`](https://github.com/ardatan/graphql-tools/commit/8a16b01296457bdcfbb111e02b6f6569ef8b04aa)]:
  - @graphql-tools/delegate@10.0.25

## 9.0.6

### Patch Changes

- Updated dependencies
  [[`4cdb462`](https://github.com/ardatan/graphql-tools/commit/4cdb46248774f2d5ae2757d40e1d55e83d7413b3)]:
  - @graphql-tools/delegate@10.0.24

## 9.0.5

### Patch Changes

- Updated dependencies
  [[`7e2938d`](https://github.com/ardatan/graphql-tools/commit/7e2938d45c6d0a6eb6b18b89f9f80e9b5b5c08db)]:
  - @graphql-tools/delegate@10.0.23

## 9.0.4

### Patch Changes

- Updated dependencies
  [[`cf2ce5e`](https://github.com/ardatan/graphql-tools/commit/cf2ce5ed4773087cc324599f2812f4fb91398b21)]:
  - @graphql-tools/utils@10.5.5
  - @graphql-tools/delegate@10.0.22

## 9.0.3

### Patch Changes

- [#6194](https://github.com/ardatan/graphql-tools/pull/6194)
  [`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle interface objects in a different way

- Updated dependencies
  [[`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e),
  [`dfccfbf`](https://github.com/ardatan/graphql-tools/commit/dfccfbfd6633dd576f660c648f3c6cecff3667a1),
  [`0134f7f`](https://github.com/ardatan/graphql-tools/commit/0134f7ffe5383603961d69337bfa5bceefb3ed74)]:
  - @graphql-tools/delegate@10.0.11
  - @graphql-tools/utils@10.2.1

## 9.0.2

### Patch Changes

- [#5998](https://github.com/ardatan/graphql-tools/pull/5998)
  [`9eee255`](https://github.com/ardatan/graphql-tools/commit/9eee2550907bf13b6be6d509bf0a059d826a9649)
  Thanks [@ardatan](https://github.com/ardatan)! - Add parentType name to the batch delegation key

## 9.0.1

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.3)
    (from `^10.0.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.0`, in `dependencies`)
- Updated dependencies
  [[`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)]:
  - @graphql-tools/delegate@10.0.4

## 9.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- Updated dependencies
  [[`8fba6cc1`](https://github.com/ardatan/graphql-tools/commit/8fba6cc1876e914d587f5b253332aaedbcaa65e6),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/delegate@10.0.0
  - @graphql-tools/utils@10.0.0

## 8.4.27

### Patch Changes

- [#5220](https://github.com/ardatan/graphql-tools/pull/5220)
  [`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements

- Updated dependencies
  [[`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)]:
  - @graphql-tools/delegate@9.0.35

## 8.4.26

### Patch Changes

- [#5205](https://github.com/ardatan/graphql-tools/pull/5205)
  [`a33097f7`](https://github.com/ardatan/graphql-tools/commit/a33097f734992105ca13e1774da90842780c6467)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (to
    `dependencies`)

- [`2f342e43`](https://github.com/ardatan/graphql-tools/commit/2f342e430ba0d0097d1d8cb31a6abb97ed46f971)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not use promises if not async

- Updated dependencies
  [[`2f342e43`](https://github.com/ardatan/graphql-tools/commit/2f342e430ba0d0097d1d8cb31a6abb97ed46f971)]:
  - @graphql-tools/delegate@9.0.34

## 8.4.25

### Patch Changes

- [`1c95368a`](https://github.com/ardatan/graphql-tools/commit/1c95368aea868be537d956ba5e994cde58dfee41)
  Thanks [@ardatan](https://github.com/ardatan)! - Use ranged versions for dependencies

- Updated dependencies []:
  - @graphql-tools/delegate@9.0.31

## 8.4.24

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@9.0.30

## 8.4.23

### Patch Changes

- Updated dependencies
  [[`f26392a6`](https://github.com/ardatan/graphql-tools/commit/f26392a66299956da1e66253b181f85332c93db5)]:
  - @graphql-tools/delegate@9.0.29

## 8.4.22

### Patch Changes

- [#5104](https://github.com/ardatan/graphql-tools/pull/5104)
  [`1913bf91`](https://github.com/ardatan/graphql-tools/commit/1913bf913130f20582152f3cbb1a4bfb49d85a13)
  Thanks [@PatrykWalach](https://github.com/PatrykWalach)! - Pass `keys` to lazyOptionsFn

## 8.4.21

### Patch Changes

- Updated dependencies
  [[`492220cb`](https://github.com/ardatan/graphql-tools/commit/492220cbdf240e7abde23af0aabcb8cbc6fd3656)]:
  - @graphql-tools/delegate@9.0.28

## 8.4.20

### Patch Changes

- [#5055](https://github.com/ardatan/graphql-tools/pull/5055)
  [`30bd4d0c`](https://github.com/ardatan/graphql-tools/commit/30bd4d0c10f59147faba925dc0941c731b0532a9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dataloader@2.2.2` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.2)
    (from `2.2.1`, in `dependencies`)
- Updated dependencies
  [[`30bd4d0c`](https://github.com/ardatan/graphql-tools/commit/30bd4d0c10f59147faba925dc0941c731b0532a9)]:
  - @graphql-tools/delegate@9.0.27

## 8.4.19

### Patch Changes

- [#5025](https://github.com/ardatan/graphql-tools/pull/5025)
  [`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dataloader@2.2.1` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.1)
    (from `2.1.0`, in `dependencies`)
- Updated dependencies
  [[`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155),
  [`b5c8f640`](https://github.com/ardatan/graphql-tools/commit/b5c8f6407b74466ed0d2989000458cb59239e9af)]:
  - @graphql-tools/delegate@9.0.26
  - @graphql-tools/utils@9.2.1

## 8.4.18

### Patch Changes

- Updated dependencies
  [[`a94217e9`](https://github.com/ardatan/graphql-tools/commit/a94217e920c5d6237471ab6ad4d96cf230984177),
  [`62d074be`](https://github.com/ardatan/graphql-tools/commit/62d074be48779b1e096e056ca1233822c421dc99)]:
  - @graphql-tools/utils@9.2.0
  - @graphql-tools/delegate@9.0.25

## 8.4.17

### Patch Changes

- Updated dependencies
  [[`772b948a`](https://github.com/ardatan/graphql-tools/commit/772b948ae536ac23520e704b33f450c94252f113)]:
  - @graphql-tools/delegate@9.0.24

## 8.4.16

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@9.0.23

## 8.4.15

### Patch Changes

- Updated dependencies
  [[`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`e3ec35ed`](https://github.com/ardatan/graphql-tools/commit/e3ec35ed27d4a329739c8da6be06ce74c8f25591)]:
  - @graphql-tools/delegate@9.0.22
  - @graphql-tools/utils@9.1.4

## 8.4.14

### Patch Changes

- Updated dependencies
  [[`13177794`](https://github.com/ardatan/graphql-tools/commit/131777947d111e6a952d9e0e581fd651664101a1)]:
  - @graphql-tools/delegate@9.0.21

## 8.4.13

### Patch Changes

- Updated dependencies
  [[`eb6cd8b6`](https://github.com/ardatan/graphql-tools/commit/eb6cd8b65dc72434348c259538b233e57a58eb1a),
  [`eb6cd8b6`](https://github.com/ardatan/graphql-tools/commit/eb6cd8b65dc72434348c259538b233e57a58eb1a)]:
  - @graphql-tools/delegate@9.0.20

## 8.4.12

### Patch Changes

- Updated dependencies
  [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759),
  [`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3
  - @graphql-tools/delegate@9.0.19

## 8.4.11

### Patch Changes

- Updated dependencies
  [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b),
  [`b5e6459f`](https://github.com/ardatan/graphql-tools/commit/b5e6459f87cd8720457ce9bff38f3dfa0cb3c150)]:
  - @graphql-tools/delegate@9.0.18
  - @graphql-tools/utils@9.1.2

## 8.4.10

### Patch Changes

- Updated dependencies
  [[`7411a5e7`](https://github.com/ardatan/graphql-tools/commit/7411a5e71a8138d9ccfe907b1fb01e62fcbb0cdb)]:
  - @graphql-tools/utils@9.1.1
  - @graphql-tools/delegate@9.0.17

## 8.4.9

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@9.0.16

## 8.4.8

### Patch Changes

- Updated dependencies
  [[`c0639dd0`](https://github.com/ardatan/graphql-tools/commit/c0639dd0065db1b5bcedaabf58b11945714bab8d)]:
  - @graphql-tools/utils@9.1.0
  - @graphql-tools/delegate@9.0.15

## 8.4.7

### Patch Changes

- Updated dependencies
  [[`d83b1960`](https://github.com/ardatan/graphql-tools/commit/d83b19605be71481ccf8effd80d5254423ea811a)]:
  - @graphql-tools/utils@9.0.1
  - @graphql-tools/delegate@9.0.14

## 8.4.6

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@9.0.13

## 8.4.5

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@9.0.12

## 8.4.4

### Patch Changes

- Updated dependencies
  [[`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`8f6d3efc`](https://github.com/ardatan/graphql-tools/commit/8f6d3efc92b25236f5a3a761ea7ba2f0a7c7f550),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)]:
  - @graphql-tools/utils@9.0.0
  - @graphql-tools/delegate@9.0.11

## 8.4.3

### Patch Changes

- Updated dependencies
  [[`f7daf777`](https://github.com/ardatan/graphql-tools/commit/f7daf7777cc214801886e4a45c0389bc5837d175)]:
  - @graphql-tools/utils@8.13.1
  - @graphql-tools/delegate@9.0.10

## 8.4.2

### Patch Changes

- Updated dependencies
  [[`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f)]:
  - @graphql-tools/delegate@9.0.9
  - @graphql-tools/utils@8.13.0

## 8.4.1

### Patch Changes

- Updated dependencies
  [[`0402894d`](https://github.com/ardatan/graphql-tools/commit/0402894d0b2747ae5d98d28df9b39d6a06cc5f2a)]:
  - @graphql-tools/delegate@9.0.8

## 8.4.0

### Minor Changes

- [#4738](https://github.com/ardatan/graphql-tools/pull/4738)
  [`614a5622`](https://github.com/ardatan/graphql-tools/commit/614a56224aed6224be708a601c816647e679a4fe)
  Thanks [@ardatan](https://github.com/ardatan)! - Smarter caching for batch delegation by using the
  selectionSet input

### Patch Changes

- Updated dependencies
  [[`00c4a1a4`](https://github.com/ardatan/graphql-tools/commit/00c4a1a44e14b9950f44d56f44967ab7a0121706)]:
  - @graphql-tools/delegate@9.0.7

## 8.3.9

### Patch Changes

- Updated dependencies
  [[`43c736bd`](https://github.com/ardatan/graphql-tools/commit/43c736bd1865c00898966a7ed14060496c9e6a0c)]:
  - @graphql-tools/utils@8.12.0
  - @graphql-tools/delegate@9.0.6

## 8.3.8

### Patch Changes

- Updated dependencies
  [[`71cb4fae`](https://github.com/ardatan/graphql-tools/commit/71cb4faeb0833a228520a7bc2beed8ac7274443f),
  [`403ed450`](https://github.com/ardatan/graphql-tools/commit/403ed4507eff7cd509f410f7542a702da72e1a9a)]:
  - @graphql-tools/utils@8.11.0
  - @graphql-tools/delegate@9.0.5

## 8.3.7

### Patch Changes

- Updated dependencies
  [[`4fe3d9c0`](https://github.com/ardatan/graphql-tools/commit/4fe3d9c037e9c138bd8a9b04b3977d74eba32c97)]:
  - @graphql-tools/utils@8.10.1
  - @graphql-tools/delegate@9.0.4

## 8.3.6

### Patch Changes

- [#4640](https://github.com/ardatan/graphql-tools/pull/4640)
  [`27bdc237`](https://github.com/ardatan/graphql-tools/commit/27bdc23713a5176485ac940fc5431256b4f2de8d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@9.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.3)
    (was `9.0.2`, in `dependencies`)

## 8.3.5

### Patch Changes

- Updated dependencies
  [[`0555a972`](https://github.com/ardatan/graphql-tools/commit/0555a972f010d2b3ca93b9164b26474a78d0b20b)]:
  - @graphql-tools/delegate@9.0.3

## 8.3.4

### Patch Changes

- Updated dependencies
  [[`29ee7542`](https://github.com/ardatan/graphql-tools/commit/29ee7542649e9c938bdb9c751bd3a2f56d17cb55)]:
  - @graphql-tools/delegate@9.0.2

## 8.3.3

### Patch Changes

- Updated dependencies
  [[`2609d71f`](https://github.com/ardatan/graphql-tools/commit/2609d71f7c3a0ef2b381c51d9ce60b0de49f9b27)]:
  - @graphql-tools/utils@8.10.0
  - @graphql-tools/delegate@9.0.1

## 8.3.2

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624)
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with
  `moduleResolution` `node16` or `nodenext`

- Updated dependencies
  [[`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67),
  [`d8dc67aa`](https://github.com/ardatan/graphql-tools/commit/d8dc67aa6cb05bf10f5f16e90690e5ccc87b3426)]:
  - @graphql-tools/delegate@9.0.0
  - @graphql-tools/utils@8.9.1

## 8.3.1

### Patch Changes

- Updated dependencies [2a3b45e3]
  - @graphql-tools/utils@8.9.0
  - @graphql-tools/delegate@8.8.1

## 8.3.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [a0abbbcd]
- Updated dependencies [d76a299c]
  - @graphql-tools/utils@8.8.0
  - @graphql-tools/delegate@8.8.0

## 8.2.21

### Patch Changes

- Updated dependencies [6df204de]
- Updated dependencies [4914970b]
  - @graphql-tools/delegate@8.7.12
  - @graphql-tools/utils@8.7.0

## 8.2.20

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/delegate@8.7.11
  - @graphql-tools/utils@8.6.13

## 8.2.19

### Patch Changes

- Updated dependencies [da7ad43b]
  - @graphql-tools/utils@8.6.12
  - @graphql-tools/delegate@8.7.10

## 8.2.18

### Patch Changes

- Updated dependencies [c0762ee3]
  - @graphql-tools/utils@8.6.11
  - @graphql-tools/delegate@8.7.9

## 8.2.17

### Patch Changes

- Updated dependencies [0fc510cb]
  - @graphql-tools/utils@8.6.10
  - @graphql-tools/delegate@8.7.8

## 8.2.16

### Patch Changes

- Updated dependencies [31a33e2b]
  - @graphql-tools/utils@8.6.9
  - @graphql-tools/delegate@8.7.7

## 8.2.15

### Patch Changes

- Updated dependencies [26e4b464]
  - @graphql-tools/delegate@8.7.6

## 8.2.14

### Patch Changes

- Updated dependencies [cb238877]
  - @graphql-tools/utils@8.6.8
  - @graphql-tools/delegate@8.7.5

## 8.2.13

### Patch Changes

- Updated dependencies [0bbb1769]
  - @graphql-tools/delegate@8.7.4
  - @graphql-tools/utils@8.6.7

## 8.2.12

### Patch Changes

- fe9402af: Bump data-loader and cross-undici-fetch
- Updated dependencies [fe9402af]
  - @graphql-tools/delegate@8.7.3

## 8.2.11

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6
  - @graphql-tools/delegate@8.7.2

## 8.2.10

### Patch Changes

- @graphql-tools/delegate@8.7.1

## 8.2.9

### Patch Changes

- Updated dependencies [d8fd6b94]
  - @graphql-tools/delegate@8.7.0

## 8.2.8

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5
  - @graphql-tools/delegate@8.6.1

## 8.2.7

### Patch Changes

- Updated dependencies [c40e801f]
- Updated dependencies [d36d530b]
  - @graphql-tools/delegate@8.6.0
  - @graphql-tools/utils@8.6.4

## 8.2.6

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/delegate@8.5.4

## 8.2.5

### Patch Changes

- 3da3d66c: fix - align versions
- Updated dependencies [3da3d66c]
  - @graphql-tools/utils@8.6.3

## 8.2.4

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/delegate@8.5.1
  - @graphql-tools/utils@8.6.2

## 8.2.3

### Patch Changes

- 51315610: enhance: avoid using globalThis
- Updated dependencies [51315610]
  - @graphql-tools/delegate@8.4.3
  - @graphql-tools/utils@8.5.4

## 8.2.2

### Patch Changes

- 5482c99a: Support graphql-executor

  batchDelegateToSchema currently assumes that the source fieldNodes are unique for each request,
  but this may not be the case when using executors such as graphql-executor. graphql-executor uses
  memoization to deliver the identical source fieldNodes object across requests, so functions
  operating on these fieldNodes can be memoized. This change ensures that batches are unique to
  requests, as long as the context object differs, using the same strategy that stitching makes use
  of with batch execution (getBatchingExecutor).

## 8.2.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/delegate@8.4.1
  - @graphql-tools/utils@8.5.1

## 8.2.0

### Minor Changes

- 149afddb: fix: getting ready for GraphQL v16

### Patch Changes

- Updated dependencies [149afddb]
  - @graphql-tools/delegate@8.3.0
  - @graphql-tools/utils@8.4.0

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
  - @graphql-tools/delegate@8.2.0
  - @graphql-tools/utils@8.2.0

## 8.0.12

### Patch Changes

- c8c13ed1: enhance: remove TypeMap and small improvements
- Updated dependencies [c8c13ed1]
  - @graphql-tools/delegate@8.1.1
  - @graphql-tools/utils@8.1.2

## 8.0.11

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions
- Updated dependencies [631b11bd]
- Updated dependencies [e50852e6]
  - @graphql-tools/delegate@8.1.0

## 8.0.10

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1
  - @graphql-tools/delegate@8.0.10

## 8.0.9

### Patch Changes

- Updated dependencies [9a13357c]
  - @graphql-tools/delegate@8.0.9

## 8.0.8

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0
  - @graphql-tools/delegate@8.0.8

## 8.0.7

### Patch Changes

- Updated dependencies [d47dcf42]
  - @graphql-tools/delegate@8.0.7

## 8.0.6

### Patch Changes

- Updated dependencies [ded29f3d]
  - @graphql-tools/delegate@8.0.6

## 8.0.5

### Patch Changes

- Updated dependencies [7fdef335]
  - @graphql-tools/delegate@8.0.5

## 8.0.4

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/delegate@8.0.4

## 8.0.3

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/delegate@8.0.3

## 8.0.2

### Patch Changes

- Updated dependencies [d93945fa]
  - @graphql-tools/delegate@8.0.2

## 8.0.1

### Patch Changes

- c36defbe: fix(delegate): fix ESM import
- Updated dependencies [c36defbe]
  - @graphql-tools/delegate@8.0.1

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

### Patch Changes

- Updated dependencies [af9a78de]
- Updated dependencies [7d3e3006]
- Updated dependencies [9c26b847]
- Updated dependencies [7d3e3006]
- Updated dependencies [d53e3be5]
- Updated dependencies [7d3e3006]
- Updated dependencies [dae6dc7b]
- Updated dependencies [6877b913]
- Updated dependencies [c42e811d]
- Updated dependencies [7d3e3006]
- Updated dependencies [8c8d4fc0]
- Updated dependencies [7d3e3006]
- Updated dependencies [aa43054d]
- Updated dependencies [7d3e3006]
- Updated dependencies [74581cf3]
- Updated dependencies [c0ca3190]
- Updated dependencies [982c8f53]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
  - @graphql-tools/utils@8.0.0
  - @graphql-tools/delegate@8.0.0

## 7.0.2

### Patch Changes

- 161963ac: fix(batch-delegate): only batch together delegations to the same root field

  see #2638.

## 7.0.1

### Patch Changes

- 29ead57c: fix(batch-delegate): proxy batched errors
- Updated dependencies [1b730f80]
- Updated dependencies [29ead57c]
  - @graphql-tools/delegate@7.0.7

## 7.0.0

### Major Changes

- a9254491: - Resolver validation options should now be set to `error`, `warn` or `ignore` rather
  than `true` or `false`. In previous versions, some of the validators caused errors to be thrown,
  while some issued warnings. This changes brings consistency to validator behavior.
  - The `allowResolversNotInSchema` has been renamed to `requireResolversToMatchSchema`, to
    harmonize the naming convention of all the validators. The default setting of
    `requireResolversToMatchSchema` is `error`, matching the previous behavior.
  * The `delegateToSchema` return value has matured and been formalized as an `ExternalObject`, in
    which all errors are integrated into the GraphQL response, preserving their initial path. Those
    advanced users accessing the result directly will note the change in error handling. This also
    allows for the deprecation of unnecessary helper functions including `slicedError`, `getErrors`,
    `getErrorsByPathSegment` functions. Only external errors with missing or invalid paths must
    still be preserved by annotating the remote object with special properties. The new
    `getUnpathedErrors` function is therefore necessary for retrieving only these errors. Note also
    the new `annotateExternalObject` and `mergeExternalObjects` functions, as well as the renaming
    of `handleResult` to `resolveExternalValue`.

  * Transform types and the `applySchemaTransforms` are now relocated to the `delegate` package;
    `applyRequestTransforms`/`applyResultTransforms` functions have been deprecated, however, as
    this functionality has been replaced since v6 by the `Transformer` abstraction.

  * The `transformRequest`/`transformResult` methods are now provided additional `delegationContext`
    and `transformationContext` arguments -- these were introduced in v6, but previously optional.

  * The `transformSchema` method may wish to create additional delegating resolvers and so it is now
    provided the `subschemaConfig` and final (non-executable) `transformedSchema` parameters. As in
    v6, the `transformSchema` is kicked off once to produce the non-executable version, and then, if
    a wrapping schema is being generated, proxying resolvers are created with access to the
    (non-executable) initial result. In v7, the individual `transformSchema` methods also get access
    to the result of the first run, if necessary, they can create additional wrapping schema
    proxying resolvers.

  * `applySchemaTransforms` parameters have been updated to match and support the `transformSchema`
    parameters above.
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
  * `stitchSchemas`'s `mergeTypes` option is now true by default! This causes the `onTypeConflict`
    option to be ignored by default. To use `onTypeConflict` to select a specific type instead of
    simply merging, simply set `mergeTypes` to false.

  * `schemas` argument has been deprecated, use `subschemas`, `typeDefs`, or `types`, depending on
    what you are stitching.

  * When using batch delegation in type merging, the `argsFromKeys` function is now set only via the
    `argsFromKeys` property. Previously, if `argsFromKeys` was absent, it could be read from `args`.

  * Support for fragment hints has been removed in favor of selection set hints.

  * `stitchSchemas` now processes all `GraphQLSchema` and `SubschemaConfig` subschema input into new
    `Subschema` objects, handling schema config directives such aso`@computed` as well as generating
    the final transformed schema, stored as the `transformedSchema` property, if transforms are
    used. Signatures of the `onTypeConflict`, `fieldConfigMerger`, and `inputFieldConfigMerger` have
    been updated to include metadata related to the original and transformed subschemas. Note the
    property name change for `onTypeConflict` from `schema` to `subschema`.
  - Mocks returning objects with fields set as functions are now operating according to upstream
    graphql-js convention, i.e. these functions take three arguments, `args`, `context`, and `info`
    with `parent` available as `this` rather than as the first argument.
  * `filterSchema`'s `fieldFilter` will now filter _all_ fields across Object, Interface, and Input
    types. For the previous Object-only behavior, switch to the `objectFieldFilter` option.
  * Unused `fieldNodes` utility functions have been removed.
  * Unused `typeContainsSelectionSet` function has been removed, and `typesContainSelectionSet` has
    been moved to the `stitch` package.
  * Unnecessary `Operation` type has been removed in favor of `OperationTypeNode` from upstream
    graphql-js.
  * As above, `applySchemaTransforms`/`applyRequestTransforms`/`applyResultTransforms` have been
    removed from the `utils` package, as they are implemented elsewhere or no longer necessary.

## 6.2.6

### Patch Changes

- 96a7555d: Fix release

  Last PATCH release actually transitively updated graphql-tools and @graphql-tools/delegate to use
  latest MAJOR version of dependencies.

## 6.2.5

### Patch Changes

- Updated dependencies [be1a1575]
  - @graphql-tools/delegate@7.0.0

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/delegate@6.2.4
