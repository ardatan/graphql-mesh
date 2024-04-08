# @graphql-mesh/runtime

## 0.98.8

### Patch Changes

- [#6790](https://github.com/ardatan/graphql-mesh/pull/6790)
  [`afe0cc5`](https://github.com/ardatan/graphql-mesh/commit/afe0cc5ddfc7a1291dc878c61793b58850ae848b)
  Thanks [@ardatan](https://github.com/ardatan)! - Better error messages in case of Supergraph SDL
  endpoint returns invalid result or it is down

  If the endpoint is down;

  ```
  Failed to generate the schema for the source "supergraph"
  Failed to load supergraph SDL from http://down-sdl-source.com/my-sdl.graphql:
  Couldn't resolve host name
  ```

  If the endpoint returns invalid result;

  ```
  Failed to generate the schema for the source "supergraph"
  Supergraph source must be a valid GraphQL SDL string or a parsed DocumentNode, but got an invalid result from ./fixtures/supergraph-invalid.graphql instead.
  Got result: type Query {

  Got error: Syntax Error: Expected Name, found <EOF>.
  ```

## 0.98.7

### Patch Changes

- [#6760](https://github.com/ardatan/graphql-mesh/pull/6760)
  [`c008dda`](https://github.com/ardatan/graphql-mesh/commit/c008ddae4bd617497a2a9bd70e8c90667c2b1ddc)
  Thanks [@ardatan](https://github.com/ardatan)! - Disable GraphQL JIT if there are nested input
  types

## 0.98.6

### Patch Changes

- Updated dependencies
  [[`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)]:
  - @graphql-mesh/types@0.97.5
  - @graphql-mesh/utils@0.97.5

## 0.98.5

### Patch Changes

- [`18e0d49`](https://github.com/ardatan/graphql-mesh/commit/18e0d495053f0b67fd1ba488270318e5d11309f8)
  Thanks [@ardatan](https://github.com/ardatan)! - Add DISABLE_JIT flag to disable GraphQL JIT

## 0.98.4

### Patch Changes

- Updated dependencies
  [[`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)]:
  - @graphql-mesh/utils@0.97.4
  - @graphql-mesh/types@0.97.4

## 0.98.3

### Patch Changes

- Updated dependencies
  [[`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)]:
  - @graphql-mesh/types@0.97.3
  - @graphql-mesh/utils@0.97.3

## 0.98.2

### Patch Changes

- Updated dependencies
  [[`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)]:
  - @graphql-mesh/types@0.97.2
  - @graphql-mesh/utils@0.97.2

## 0.98.1

### Patch Changes

- Updated dependencies
  [[`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)]:
  - @graphql-mesh/types@0.97.1
  - @graphql-mesh/utils@0.97.1

## 0.98.0

### Patch Changes

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a),
  [`70b05a2`](https://github.com/ardatan/graphql-mesh/commit/70b05a20a948b5ebed5306c14710c8839225cdad)]:
  - @graphql-mesh/types@0.97.0
  - @graphql-mesh/utils@0.97.0

## 0.97.7

### Patch Changes

- Updated dependencies
  [[`0f274ef`](https://github.com/ardatan/graphql-mesh/commit/0f274ef8177068da65e50e08607998d0ed63e8b9)]:
  - @graphql-mesh/utils@0.96.6
  - @graphql-mesh/types@0.96.6

## 0.97.6

### Patch Changes

- [#6566](https://github.com/ardatan/graphql-mesh/pull/6566)
  [`89d8dd6`](https://github.com/ardatan/graphql-mesh/commit/89d8dd6dde4b74a9c3edb3438ef23f2498d94276)
  Thanks [@ardatan](https://github.com/ardatan)! - Compatibility with the environments and schemas
  do not support GraphQL JIT

- [#6553](https://github.com/ardatan/graphql-mesh/pull/6553)
  [`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Correct additional envelop plugins docs

- Updated dependencies
  [[`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)]:
  - @graphql-mesh/types@0.96.5
  - @graphql-mesh/utils@0.96.5

## 0.97.5

### Patch Changes

- Updated dependencies
  [[`ae7b085`](https://github.com/ardatan/graphql-mesh/commit/ae7b085e93ba911f03bbfd2a15ff9ca8be9f4de8)]:
  - @graphql-mesh/types@0.96.4
  - @graphql-mesh/utils@0.96.4

## 0.97.4

### Patch Changes

- Updated dependencies
  [[`ac26793`](https://github.com/ardatan/graphql-mesh/commit/ac26793e59f76f0839b61a8030e0eefc7383e640)]:
  - @graphql-mesh/types@0.96.3
  - @graphql-mesh/utils@0.96.3

## 0.97.3

### Patch Changes

- Updated dependencies
  [[`d758afa`](https://github.com/ardatan/graphql-mesh/commit/d758afa7da55cf3ed6b4ed9e8cccfd0ed67fe658),
  [`4fac014`](https://github.com/ardatan/graphql-mesh/commit/4fac01400544bc6e8b2a4ae55f1a4dd4771bbc5c)]:
  - @graphql-mesh/types@0.96.2
  - @graphql-mesh/utils@0.96.2

## 0.97.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.96.1
  - @graphql-mesh/utils@0.96.1

## 0.97.1

### Patch Changes

- [`730398204`](https://github.com/ardatan/graphql-mesh/commit/730398204176837acb13f2c0cf1e22a64c56bde9)
  Thanks [@ardatan](https://github.com/ardatan)! - Expose `fetch` in the context

- [`0c4940802`](https://github.com/ardatan/graphql-mesh/commit/0c49408027896e99537683ee063231c5c0ac0a1b)
  Thanks [@ardatan](https://github.com/ardatan)! - Disable fast-json-stringify usage with GraphQL
  JIT for now

## 0.97.0

### Patch Changes

- Updated dependencies
  [[`5c6a8f784`](https://github.com/ardatan/graphql-mesh/commit/5c6a8f784a787641b90349e584b49de629cc41ff)]:
  - @graphql-mesh/types@0.96.0
  - @graphql-mesh/utils@0.96.0

## 0.96.13

### Patch Changes

- Updated dependencies
  [[`b4d38c55d`](https://github.com/ardatan/graphql-mesh/commit/b4d38c55df8c4d2aeb98325555979eb09d065906)]:
  - @graphql-mesh/string-interpolation@0.5.3
  - @graphql-mesh/utils@0.95.8
  - @graphql-mesh/types@0.95.8

## 0.96.12

### Patch Changes

- [#6103](https://github.com/Urigo/graphql-mesh/pull/6103)
  [`c859f220b`](https://github.com/Urigo/graphql-mesh/commit/c859f220bc3f7db125511a7b655c8688efe2b14b)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^5.0.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.0) (from
    `^4.0.0`, in `dependencies`)
  - Updated dependency
    [`@envelop/extended-validation@^4.0.0` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/4.0.0)
    (from `^3.0.0`, in `dependencies`)
  - Updated dependency
    [`@envelop/graphql-jit@^8.0.0` ↗︎](https://www.npmjs.com/package/@envelop/graphql-jit/v/8.0.0)
    (from `^7.0.0`, in `dependencies`)

## 0.96.11

### Patch Changes

- [#6070](https://github.com/Urigo/graphql-mesh/pull/6070)
  [`2eb8d2d56`](https://github.com/Urigo/graphql-mesh/commit/2eb8d2d561ac8aa2f0aff72b8d39bd88963d464c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@envelop/graphql-jit@^7.0.0` ↗︎](https://www.npmjs.com/package/@envelop/graphql-jit/v/7.0.0)
    (from `^6.0.5`, in `dependencies`)

## 0.96.10

### Patch Changes

- Updated dependencies
  [[`a13969c77`](https://github.com/Urigo/graphql-mesh/commit/a13969c77794c44493d7a9426be7e38a6d673c88)]:
  - @graphql-mesh/types@0.95.7
  - @graphql-mesh/utils@0.95.7

## 0.96.9

### Patch Changes

- [`482d813a9`](https://github.com/Urigo/graphql-mesh/commit/482d813a9f75935024aa77872125d197f5fca3d0)
  Thanks [@ardatan](https://github.com/ardatan)! - Simplify the logic and use GraphQL Tools executor

- [`482d813a9`](https://github.com/Urigo/graphql-mesh/commit/482d813a9f75935024aa77872125d197f5fca3d0)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not cache entire request but only DocumentNode

## 0.96.8

### Patch Changes

- [#6018](https://github.com/Urigo/graphql-mesh/pull/6018)
  [`41005ff7d`](https://github.com/Urigo/graphql-mesh/commit/41005ff7d240ef7803c7fcca0504aaf84be850b0)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@envelop/graphql-jit@^6.0.5` ↗︎](https://www.npmjs.com/package/@envelop/graphql-jit/v/6.0.5)
    (from `^6.0.2`, in `dependencies`)

## 0.96.7

### Patch Changes

- Updated dependencies
  [[`8e1056cf9`](https://github.com/Urigo/graphql-mesh/commit/8e1056cf91b0e7069499f5102aaed163a0168597)]:
  - @graphql-mesh/string-interpolation@0.5.2
  - @graphql-mesh/utils@0.95.6
  - @graphql-mesh/types@0.95.6

## 0.96.6

### Patch Changes

- [#6008](https://github.com/Urigo/graphql-mesh/pull/6008)
  [`675cc678a`](https://github.com/Urigo/graphql-mesh/commit/675cc678abb4922a7cad1aafd381dabd73721ffe)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency [`graphql-jit@0.8.2` ↗︎](https://www.npmjs.com/package/graphql-jit/v/0.8.2)
    (from `^0.8.4`, in `dependencies`)

- [#6008](https://github.com/Urigo/graphql-mesh/pull/6008)
  [`675cc678a`](https://github.com/Urigo/graphql-mesh/commit/675cc678abb4922a7cad1aafd381dabd73721ffe)
  Thanks [@ardatan](https://github.com/ardatan)! - Pin graphql-jit version until scalar issue has
  been fixed

- Updated dependencies
  [[`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781),
  [`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781)]:
  - @graphql-mesh/cross-helpers@0.4.1
  - @graphql-mesh/types@0.95.5
  - @graphql-mesh/utils@0.95.5

## 0.96.5

### Patch Changes

- [#5958](https://github.com/Urigo/graphql-mesh/pull/5958)
  [`9c49c5f7f`](https://github.com/Urigo/graphql-mesh/commit/9c49c5f7f7aac44f2fe141ad3d895d2e97205b4b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@envelop/graphql-jit@^6.0.2` ↗︎](https://www.npmjs.com/package/@envelop/graphql-jit/v/6.0.2)
    (to `dependencies`)
  - Added dependency [`graphql-jit@^0.8.4` ↗︎](https://www.npmjs.com/package/graphql-jit/v/0.8.4)
    (to `dependencies`)

- [#5958](https://github.com/Urigo/graphql-mesh/pull/5958)
  [`9c49c5f7f`](https://github.com/Urigo/graphql-mesh/commit/9c49c5f7f7aac44f2fe141ad3d895d2e97205b4b)
  Thanks [@ardatan](https://github.com/ardatan)! - Use JIT if it is a regular executable schema

- Updated dependencies
  [[`625e5d787`](https://github.com/Urigo/graphql-mesh/commit/625e5d7878d44abd7c9d1542bf5cdcd4e37e2411)]:
  - @graphql-mesh/types@0.95.4
  - @graphql-mesh/utils@0.95.4

## 0.96.4

### Patch Changes

- Updated dependencies
  [[`33ae7a89a`](https://github.com/Urigo/graphql-mesh/commit/33ae7a89a13f40ebbe0a01620e378fe4a914df7f)]:
  - @graphql-mesh/types@0.95.3
  - @graphql-mesh/utils@0.95.3

## 0.96.3

### Patch Changes

- [#5917](https://github.com/Urigo/graphql-mesh/pull/5917)
  [`a5ace966e`](https://github.com/Urigo/graphql-mesh/commit/a5ace966e18fac0ed71fb999078fb86499374ced)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance optimizations for Node.js
  - Fork the cluster worker again when it dies
  - Avoid unnecessary promises

## 0.96.2

### Patch Changes

- [`d8da4b282`](https://github.com/Urigo/graphql-mesh/commit/d8da4b282ab15ab6d0ea24c78c172e31fa1170ea)
  Thanks [@ardatan](https://github.com/ardatan)! - New `autoSelectionSetWithDepth` option in the
  incontext sdk to avoid users to write manual selection sets if return types don't match
- Updated dependencies
  [[`d8da4b282`](https://github.com/Urigo/graphql-mesh/commit/d8da4b282ab15ab6d0ea24c78c172e31fa1170ea)]:
  - @graphql-mesh/types@0.95.2
  - @graphql-mesh/utils@0.95.2

## 0.96.1

### Patch Changes

- [#5744](https://github.com/Urigo/graphql-mesh/pull/5744)
  [`7cdc69e04`](https://github.com/Urigo/graphql-mesh/commit/7cdc69e0454ab99ea5c3b8072ac28da8f81a8796)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency
    [`@graphql-tools/batch-execute@^9.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/9.0.0)
    (from `dependencies`)
- Updated dependencies
  [[`7cdc69e04`](https://github.com/Urigo/graphql-mesh/commit/7cdc69e0454ab99ea5c3b8072ac28da8f81a8796)]:
  - @graphql-mesh/types@0.95.1
  - @graphql-mesh/utils@0.95.1

## 0.96.0

### Patch Changes

- Updated dependencies
  [[`bb50c4f94`](https://github.com/Urigo/graphql-mesh/commit/bb50c4f941caa59d69186d1415dce5773596e8bc)]:
  - @graphql-mesh/types@0.95.0
  - @graphql-mesh/utils@0.95.0

## 0.95.4

### Patch Changes

- Updated dependencies
  [[`d1310cdff`](https://github.com/Urigo/graphql-mesh/commit/d1310cdff53c53d5342e28b7c0c1af1dd25c6c75)]:
  - @graphql-mesh/utils@0.94.6
  - @graphql-mesh/types@0.94.6

## 0.95.3

### Patch Changes

- Updated dependencies
  [[`f11e9b307`](https://github.com/Urigo/graphql-mesh/commit/f11e9b307f1336d5ead9a75befdb61de963c6c5b)]:
  - @graphql-mesh/utils@0.94.5
  - @graphql-mesh/types@0.94.5

## 0.95.2

### Patch Changes

- Updated dependencies
  [[`ff1678eea`](https://github.com/Urigo/graphql-mesh/commit/ff1678eeabec67edaa4991b938ef81437cd9361e)]:
  - @graphql-mesh/types@0.94.4
  - @graphql-mesh/utils@0.94.4

## 0.95.1

### Patch Changes

- Updated dependencies
  [[`fba66c6fc`](https://github.com/Urigo/graphql-mesh/commit/fba66c6fc7a0ca15393df8ae5382d97eb0ae8fcf)]:
  - @graphql-mesh/string-interpolation@0.5.1
  - @graphql-mesh/utils@0.94.3
  - @graphql-mesh/types@0.94.3

## 0.95.0

### Minor Changes

- [#4724](https://github.com/Urigo/graphql-mesh/pull/4724)
  [`191f1cc88`](https://github.com/Urigo/graphql-mesh/commit/191f1cc88cdfa6f0ca5b735fbe8677bc2679c9e7)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Supply WebSocket `connectionParams` to
  operation context and introduce `connectionParams` option for graphql handler

## 0.94.2

### Patch Changes

- Updated dependencies
  [[`d0d4917f4`](https://github.com/Urigo/graphql-mesh/commit/d0d4917f405d7d6acfba62abef38909e1398ce7c)]:
  - @graphql-mesh/types@0.94.2
  - @graphql-mesh/utils@0.94.2

## 0.94.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.94.1
  - @graphql-mesh/utils@0.94.1

## 0.94.0

### Minor Changes

- [#5449](https://github.com/Urigo/graphql-mesh/pull/5449)
  [`ef520d91e`](https://github.com/Urigo/graphql-mesh/commit/ef520d91e6d1800ed63ef016ed74084261788371)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support and require Node 16 or
  higher

### Patch Changes

- [#5421](https://github.com/Urigo/graphql-mesh/pull/5421)
  [`7fcc4e566`](https://github.com/Urigo/graphql-mesh/commit/7fcc4e566a4fbba5dd6ecb248ddfb95e4c270417)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@envelop/core@^4.0.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/4.0.0) (from
    `^3.0.6`, in `dependencies`)
  - Updated dependency
    [`@envelop/extended-validation@^3.0.0` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/3.0.0)
    (from `^2.0.6`, in `dependencies`)

- [#5446](https://github.com/Urigo/graphql-mesh/pull/5446)
  [`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@^9.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/9.0.0)
    (from `^8.4.25`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@^9.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/9.0.0)
    (from `^8.5.19`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.0)
    (from `^9.0.32`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@^10.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/10.0.0)
    (from `^9.4.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^9.2.1 || ^10.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.2.1)
    (from `^9.2.1`, in `peerDependencies`)

- [#5450](https://github.com/Urigo/graphql-mesh/pull/5450)
  [`bc438f835`](https://github.com/Urigo/graphql-mesh/commit/bc438f83549599a544d956ccbb931cf44fb834f4)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/fetch@^0.9.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.0)
    (from `^0.8.3`, in `dependencies`)

- [#5456](https://github.com/Urigo/graphql-mesh/pull/5456)
  [`b52b4c7c1`](https://github.com/Urigo/graphql-mesh/commit/b52b4c7c1133a9904080c344dcb5140c1af67f2a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^4.0.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/4.0.0) (from
    `^3.0.6`, in `dependencies`)
  - Updated dependency
    [`@envelop/extended-validation@^3.0.0` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/3.0.0)
    (from `^2.0.6`, in `dependencies`)
- Updated dependencies
  [[`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`3d9218360`](https://github.com/Urigo/graphql-mesh/commit/3d9218360dff838b9d3c731c92b3b6e8ad52e2c7),
  [`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`4296a55f4`](https://github.com/Urigo/graphql-mesh/commit/4296a55f4a6fb1c8e1701403cfe88067255ae9b7),
  [`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`01fb0cc85`](https://github.com/Urigo/graphql-mesh/commit/01fb0cc858dfbf2cd931d1b08b0749a0b82b232c),
  [`ef520d91e`](https://github.com/Urigo/graphql-mesh/commit/ef520d91e6d1800ed63ef016ed74084261788371)]:
  - @graphql-mesh/cross-helpers@0.4.0
  - @graphql-mesh/string-interpolation@0.5.0
  - @graphql-mesh/types@0.94.0
  - @graphql-mesh/utils@0.94.0

## 0.93.2

### Patch Changes

- [`446124c24`](https://github.com/Urigo/graphql-mesh/commit/446124c24250635545792109473fc5ac17e27259)
  Thanks [@ardatan](https://github.com/ardatan)! - Enable Yoga caching for validation

## 0.93.1

### Patch Changes

- [#5365](https://github.com/Urigo/graphql-mesh/pull/5365)
  [`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/types@^0.93.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.93.0)
    (from `^1.0.0`, in `peerDependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.93.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.93.0)
    (from `^1.0.0`, in `peerDependencies`)
- Updated dependencies
  [[`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8),
  [`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8)]:
  - @graphql-mesh/types@0.93.1
  - @graphql-mesh/utils@0.93.1

## 1.0.0

### Patch Changes

- [#5340](https://github.com/Urigo/graphql-mesh/pull/5340)
  [`cff645677`](https://github.com/Urigo/graphql-mesh/commit/cff645677c680e248ed718e5bb98ece5a41f9c0f)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.32` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.32)
    (from `9.0.31`, in `dependencies`)

- [#5356](https://github.com/Urigo/graphql-mesh/pull/5356)
  [`72fe781c1`](https://github.com/Urigo/graphql-mesh/commit/72fe781c15f20ad2af792b8245aedfdcc742e048)
  Thanks [@ardatan](https://github.com/ardatan)! - Rearrange dependencies

- Updated dependencies
  [[`cff645677`](https://github.com/Urigo/graphql-mesh/commit/cff645677c680e248ed718e5bb98ece5a41f9c0f),
  [`cff645677`](https://github.com/Urigo/graphql-mesh/commit/cff645677c680e248ed718e5bb98ece5a41f9c0f),
  [`72fe781c1`](https://github.com/Urigo/graphql-mesh/commit/72fe781c15f20ad2af792b8245aedfdcc742e048),
  [`a597261db`](https://github.com/Urigo/graphql-mesh/commit/a597261dbb4f18c47bf7323695e853950ae500df)]:
  - @graphql-mesh/types@1.0.0
  - @graphql-mesh/utils@1.0.0

## 0.46.24

### Patch Changes

- [#5328](https://github.com/Urigo/graphql-mesh/pull/5328)
  [`0d73b3f71`](https://github.com/Urigo/graphql-mesh/commit/0d73b3f71e847d751eea130df62d795c3b06a192)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.25` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.25)
    (from `8.4.24`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.19)
    (from `8.5.18`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.31` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.31)
    (from `9.0.30`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.4.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.4.2)
    (from `9.4.1`, in `dependencies`)
- Updated dependencies
  [[`0d73b3f71`](https://github.com/Urigo/graphql-mesh/commit/0d73b3f71e847d751eea130df62d795c3b06a192),
  [`0d73b3f71`](https://github.com/Urigo/graphql-mesh/commit/0d73b3f71e847d751eea130df62d795c3b06a192),
  [`ed2232e71`](https://github.com/Urigo/graphql-mesh/commit/ed2232e715c1dadc3817d8b3b469f75ddbae6ac6)]:
  - @graphql-mesh/types@0.91.15
  - @graphql-mesh/utils@0.43.23

## 0.46.23

### Patch Changes

- [#5291](https://github.com/Urigo/graphql-mesh/pull/5291)
  [`20de686dc`](https://github.com/Urigo/graphql-mesh/commit/20de686dcd414112c841cd2c11b1567b82bee134)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.23` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.23)
    (from `8.4.22`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.29` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.29)
    (from `9.0.28`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.4.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.4.0)
    (from `9.3.8`, in `dependencies`)

- [#5301](https://github.com/Urigo/graphql-mesh/pull/5301)
  [`3926ac41a`](https://github.com/Urigo/graphql-mesh/commit/3926ac41ac3405ea352b5a945d33770c5bf5d3c2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.24` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.24)
    (from `8.4.23`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.30` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.30)
    (from `9.0.29`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.4.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.4.1)
    (from `9.4.0`, in `dependencies`)
- Updated dependencies
  [[`20de686dc`](https://github.com/Urigo/graphql-mesh/commit/20de686dcd414112c841cd2c11b1567b82bee134),
  [`3926ac41a`](https://github.com/Urigo/graphql-mesh/commit/3926ac41ac3405ea352b5a945d33770c5bf5d3c2),
  [`20de686dc`](https://github.com/Urigo/graphql-mesh/commit/20de686dcd414112c841cd2c11b1567b82bee134),
  [`3926ac41a`](https://github.com/Urigo/graphql-mesh/commit/3926ac41ac3405ea352b5a945d33770c5bf5d3c2)]:
  - @graphql-mesh/types@0.91.14
  - @graphql-mesh/utils@0.43.22

## 0.46.22

### Patch Changes

- [#5266](https://github.com/Urigo/graphql-mesh/pull/5266)
  [`870de5dae`](https://github.com/Urigo/graphql-mesh/commit/870de5dae08a7e43d9aa0f52d5d504cffb4d8fc8)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.22` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.22)
    (from `8.4.21`, in `dependencies`)
- Updated dependencies
  [[`870de5dae`](https://github.com/Urigo/graphql-mesh/commit/870de5dae08a7e43d9aa0f52d5d504cffb4d8fc8),
  [`aea134764`](https://github.com/Urigo/graphql-mesh/commit/aea1347645c322437ed6ccfadabcfc23065bc9c8),
  [`a1e08193b`](https://github.com/Urigo/graphql-mesh/commit/a1e08193be3ac8cab5f6f8c84025f934134369b6),
  [`abc0c8747`](https://github.com/Urigo/graphql-mesh/commit/abc0c8747b274e011f5b8387233fe96d4f702035),
  [`6aa7da6f8`](https://github.com/Urigo/graphql-mesh/commit/6aa7da6f8492adb1af5598e501d089b7b008637a)]:
  - @graphql-mesh/types@0.91.13
  - @graphql-mesh/string-interpolation@0.4.4
  - @graphql-mesh/utils@0.43.21

## 0.46.21

### Patch Changes

- [#5252](https://github.com/Urigo/graphql-mesh/pull/5252)
  [`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)
  Thanks [@ardatan](https://github.com/ardatan)! - Make shared packages peer dependency

- Updated dependencies
  [[`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)]:
  - @graphql-mesh/string-interpolation@0.4.3
  - @graphql-mesh/cross-helpers@0.3.4
  - @graphql-mesh/types@0.91.12
  - @graphql-mesh/utils@0.43.20

## 0.46.20

### Patch Changes

- [#5192](https://github.com/Urigo/graphql-mesh/pull/5192)
  [`7e7096695`](https://github.com/Urigo/graphql-mesh/commit/7e709669564fa427332b8af00bc66234485f3d54)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/wrap@9.3.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.3.8)
    (from `9.3.7`, in `dependencies`)
- Updated dependencies
  [[`7e7096695`](https://github.com/Urigo/graphql-mesh/commit/7e709669564fa427332b8af00bc66234485f3d54)]:
  - @graphql-mesh/types@0.91.11
  - @graphql-mesh/utils@0.43.19

## 0.46.19

### Patch Changes

- [#5239](https://github.com/Urigo/graphql-mesh/pull/5239)
  [`3f658a771`](https://github.com/Urigo/graphql-mesh/commit/3f658a7711cd68bc7451c1494699c5ffb8e919ce)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.8.3` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.8.3)
    (from `^0.8.0`, in `dependencies`)
- Updated dependencies
  [[`3f658a771`](https://github.com/Urigo/graphql-mesh/commit/3f658a7711cd68bc7451c1494699c5ffb8e919ce)]:
  - @graphql-mesh/utils@0.43.18
  - @graphql-mesh/types@0.91.10

## 0.46.18

### Patch Changes

- Updated dependencies
  [[`a272fdbca`](https://github.com/Urigo/graphql-mesh/commit/a272fdbca655b17119fb1dcb1c44498f387b1edc)]:
  - @graphql-mesh/types@0.91.9
  - @graphql-mesh/utils@0.43.17

## 0.46.17

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.91.8
  - @graphql-mesh/utils@0.43.16

## 0.46.16

### Patch Changes

- Updated dependencies
  [[`fa2c010c1`](https://github.com/Urigo/graphql-mesh/commit/fa2c010c13f95ce401c345a1330d8fddabeebc17)]:
  - @graphql-mesh/utils@0.43.15
  - @graphql-mesh/types@0.91.7

## 0.46.15

### Patch Changes

- [#5160](https://github.com/Urigo/graphql-mesh/pull/5160)
  [`7def5adae`](https://github.com/Urigo/graphql-mesh/commit/7def5adae9e1cab3597320731ca6767bde5c04a1)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@envelop/core@3.0.5` ↗︎](https://www.npmjs.com/package/@envelop/core/v/3.0.5) (from `3.0.4`,
    in `dependencies`)
  - Updated dependency
    [`@envelop/extended-validation@2.0.5` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/2.0.5)
    (from `2.0.4`, in `dependencies`)

- [#5167](https://github.com/Urigo/graphql-mesh/pull/5167)
  [`ab08c2af5`](https://github.com/Urigo/graphql-mesh/commit/ab08c2af559aee4ee009c1bafceab7f5d1e87321)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@envelop/core@3.0.6` ↗︎](https://www.npmjs.com/package/@envelop/core/v/3.0.6) (from `3.0.5`,
    in `dependencies`)
  - Updated dependency
    [`@envelop/extended-validation@2.0.6` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/2.0.6)
    (from `2.0.5`, in `dependencies`)

- [#5183](https://github.com/Urigo/graphql-mesh/pull/5183)
  [`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.21` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.21)
    (from `8.4.20`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.28` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.28)
    (from `9.0.27`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.3.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.3.7)
    (from `9.3.6`, in `dependencies`)
- Updated dependencies
  [[`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391),
  [`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391)]:
  - @graphql-mesh/types@0.91.6
  - @graphql-mesh/utils@0.43.14

## 0.46.14

### Patch Changes

- Updated dependencies
  [[`5c19f8d6f`](https://github.com/Urigo/graphql-mesh/commit/5c19f8d6f79f2d9bfbeb6458c8dc7a1729c37db9)]:
  - @graphql-mesh/types@0.91.5
  - @graphql-mesh/utils@0.43.13

## 0.46.13

### Patch Changes

- Updated dependencies
  [[`63ab17f0b`](https://github.com/Urigo/graphql-mesh/commit/63ab17f0bd402b5a3923d752ba715f556f3beadd)]:
  - @graphql-mesh/types@0.91.4
  - @graphql-mesh/utils@0.43.12

## 0.46.12

### Patch Changes

- [`1129efbb4`](https://github.com/Urigo/graphql-mesh/commit/1129efbb4cb17ec088d48ebfcc9610823085d025)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes for better introspection

## 0.46.11

### Patch Changes

- [#5135](https://github.com/Urigo/graphql-mesh/pull/5135)
  [`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.20)
    (from `8.4.19`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.18` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.18)
    (from `8.5.17`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.27` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.27)
    (from `9.0.26`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.3.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.3.6)
    (from `9.3.5`, in `dependencies`)
- Updated dependencies
  [[`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e),
  [`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e)]:
  - @graphql-mesh/types@0.91.3
  - @graphql-mesh/utils@0.43.11

## 0.46.10

### Patch Changes

- [`3f4ca5b6b`](https://github.com/Urigo/graphql-mesh/commit/3f4ca5b6b39b1946fa7bd10f0de2a69b8b414376)
  Thanks [@ardatan](https://github.com/ardatan)! - Return SDL directly for federation introspection
  query

- Updated dependencies
  [[`975715275`](https://github.com/Urigo/graphql-mesh/commit/9757152751e37062bca4ba114bee65a0c79a3d4d),
  [`989a47802`](https://github.com/Urigo/graphql-mesh/commit/989a478027b703ab969d529f09bc83071fe4f96f)]:
  - @graphql-mesh/cross-helpers@0.3.3
  - @graphql-mesh/types@0.91.2
  - @graphql-mesh/utils@0.43.10

## 0.46.9

### Patch Changes

- Updated dependencies
  [[`d694ccc1f`](https://github.com/Urigo/graphql-mesh/commit/d694ccc1f5a2cbc3ed97778a3210594005f2830b)]:
  - @graphql-mesh/utils@0.43.9
  - @graphql-mesh/types@0.91.1

## 0.46.8

### Patch Changes

- [#5091](https://github.com/Urigo/graphql-mesh/pull/5091)
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.19)
    (from `8.4.17`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.17)
    (from `8.5.15`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.26` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.26)
    (from `9.0.24`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@9.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.2.1)
    (from `9.1.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.3.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.3.5)
    (from `9.3.3`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/fetch@^0.8.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.8.0)
    (from `^0.6.0`, in `dependencies`)
- Updated dependencies
  [[`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`7e8bb87dd`](https://github.com/Urigo/graphql-mesh/commit/7e8bb87ddf4cb1210db6873334bdd18007cc0552)]:
  - @graphql-mesh/cross-helpers@0.3.2
  - @graphql-mesh/types@0.91.0
  - @graphql-mesh/utils@0.43.8

## 0.46.7

### Patch Changes

- [#5087](https://github.com/Urigo/graphql-mesh/pull/5087)
  [`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.17)
    (from `8.4.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.24` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.24)
    (from `9.0.23`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.3.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.3.3)
    (from `9.3.2`, in `dependencies`)
- Updated dependencies
  [[`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72),
  [`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72),
  [`bcf29dfd0`](https://github.com/Urigo/graphql-mesh/commit/bcf29dfd02d19cf5c770b83fc627f059569a0fac)]:
  - @graphql-mesh/types@0.90.0
  - @graphql-mesh/utils@0.43.7

## 0.46.6

### Patch Changes

- [#5073](https://github.com/Urigo/graphql-mesh/pull/5073)
  [`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.16)
    (from `8.4.15`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.23` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.23)
    (from `9.0.22`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.3.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.3.2)
    (from `9.3.1`, in `dependencies`)
- Updated dependencies
  [[`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5),
  [`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5)]:
  - @graphql-mesh/types@0.89.5
  - @graphql-mesh/utils@0.43.6

## 0.46.5

### Patch Changes

- [#4988](https://github.com/Urigo/graphql-mesh/pull/4988)
  [`ad938f485`](https://github.com/Urigo/graphql-mesh/commit/ad938f485a9b881a0379284ac582c6c599aa1117)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/fetch@^0.6.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.0)
    (from `^0.5.0`, in `dependencies`)

- [#5028](https://github.com/Urigo/graphql-mesh/pull/5028)
  [`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.15` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.15)
    (from `8.4.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.15` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.15)
    (from `8.5.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.22` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.22)
    (from `9.0.21`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@9.1.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.4)
    (from `9.1.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.3.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.3.0)
    (from `9.2.23`, in `dependencies`)

- [#4930](https://github.com/Urigo/graphql-mesh/pull/4930)
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Prettier fixes

- [`4f0b102dd`](https://github.com/Urigo/graphql-mesh/commit/4f0b102ddb093a14c8dec613c3b59db88ba1069e)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools

- Updated dependencies
  [[`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664),
  [`fb9113d5b`](https://github.com/Urigo/graphql-mesh/commit/fb9113d5bfc4865d51f9cb1bd3236c7c0c27b170),
  [`d573d203f`](https://github.com/Urigo/graphql-mesh/commit/d573d203f8bb04ff75cb4d83ba0deaa2bf9818a7)]:
  - @graphql-mesh/cross-helpers@0.3.1
  - @graphql-mesh/types@0.89.4
  - @graphql-mesh/utils@0.43.5
  - @graphql-mesh/string-interpolation@0.4.2

## 0.46.4

### Patch Changes

- [#4963](https://github.com/Urigo/graphql-mesh/pull/4963)
  [`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.14)
    (from `8.4.13`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.21` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.21)
    (from `9.0.20`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.23` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.23)
    (from `9.2.22`, in `dependencies`)
- Updated dependencies
  [[`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9),
  [`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9)]:
  - @graphql-mesh/types@0.89.3
  - @graphql-mesh/utils@0.43.4

## 0.46.3

### Patch Changes

- [`0a4a77135`](https://github.com/Urigo/graphql-mesh/commit/0a4a771353c2fa1700afaeb54561c078df5229ec)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools packages for transfomation
  issues

## 0.46.2

### Patch Changes

- Updated dependencies
  [[`deb9912e0`](https://github.com/Urigo/graphql-mesh/commit/deb9912e0bc2ae782c9570b60a7224b47af341eb)]:
  - @graphql-mesh/string-interpolation@0.4.1
  - @graphql-mesh/types@0.89.2
  - @graphql-mesh/utils@0.43.3

## 0.46.1

### Patch Changes

- [#4906](https://github.com/Urigo/graphql-mesh/pull/4906)
  [`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.13)
    (from `8.4.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.20)
    (from `9.0.19`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.21` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.21)
    (from `9.2.20`, in `dependencies`)
- Updated dependencies
  [[`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43),
  [`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43)]:
  - @graphql-mesh/types@0.89.1
  - @graphql-mesh/utils@0.43.2

## 0.46.0

### Minor Changes

- [#4767](https://github.com/Urigo/graphql-mesh/pull/4767)
  [`3edaa00ac`](https://github.com/Urigo/graphql-mesh/commit/3edaa00ac772d519e351e620bfa670514db886e5)
  Thanks [@ardatan](https://github.com/ardatan)! - _BREAKING_ - Neo4J handler's `url` changed to
  `endpoint` to be consistent with other handlers _BREAKING_ - Neo4J handler's `typeDefs` changed to
  `source` to be consistent with other handlers _BREAKING_ - OData handler's `url` changed to
  `endpoint` to be consistent with other handlers _BREAKING_ - OData handler's `metadata` changed to
  `source` to be consistent with other handlers _BREAKING_ - OpenAPI handler's `baseUrl` changed to
  `endpoint` to be consistent with other handlers _BREAKING_ - RAML handler's `baseUrl` changed to
  `endpoint` to be consistent with other handlers _BREAKING_ - RAML handler's `ramlFilePath` changed
  to `source` to be consistent with other handlers

### Patch Changes

- Updated dependencies
  [[`3edaa00ac`](https://github.com/Urigo/graphql-mesh/commit/3edaa00ac772d519e351e620bfa670514db886e5)]:
  - @graphql-mesh/types@0.89.0
  - @graphql-mesh/utils@0.43.1

## 0.45.0

### Minor Changes

- [#4821](https://github.com/Urigo/graphql-mesh/pull/4821)
  [`1a28c92c2`](https://github.com/Urigo/graphql-mesh/commit/1a28c92c2d67b89b48581b7bb1414d1404428cdb)
  Thanks [@ardatan](https://github.com/ardatan)! - Update build flow to fully support both CommonJS
  and ESM

### Patch Changes

- [#4901](https://github.com/Urigo/graphql-mesh/pull/4901)
  [`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.12)
    (from `8.4.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.14)
    (from `8.5.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.19)
    (from `9.0.17`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@9.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.3)
    (from `9.1.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.20)
    (from `9.2.18`, in `dependencies`)
- Updated dependencies
  [[`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f),
  [`5ed3435b8`](https://github.com/Urigo/graphql-mesh/commit/5ed3435b8fdfd115566ef548f044884628d39211),
  [`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f),
  [`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f),
  [`1a28c92c2`](https://github.com/Urigo/graphql-mesh/commit/1a28c92c2d67b89b48581b7bb1414d1404428cdb)]:
  - @graphql-mesh/cross-helpers@0.3.0
  - @graphql-mesh/string-interpolation@0.4.0
  - @graphql-mesh/types@0.88.0
  - @graphql-mesh/utils@0.43.0

## 0.44.37

### Patch Changes

- [#4872](https://github.com/Urigo/graphql-mesh/pull/4872)
  [`3ced82c45`](https://github.com/Urigo/graphql-mesh/commit/3ced82c45ed50eefe238c569a1eefdac164dff77)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/wrap@9.2.18` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.18)
    (from `9.2.16`, in `dependencies`)

## 0.44.36

### Patch Changes

- Updated dependencies
  [[`eba73c626`](https://github.com/Urigo/graphql-mesh/commit/eba73c6261a2fdde8ece31915202203b70ff0e5f)]:
  - @graphql-mesh/utils@0.42.9
  - @graphql-mesh/types@0.87.1

## 0.44.35

### Patch Changes

- Updated dependencies
  [[`0d9771428`](https://github.com/Urigo/graphql-mesh/commit/0d97714284a6eea31c2c9420addd4a1518584924),
  [`686b3301b`](https://github.com/Urigo/graphql-mesh/commit/686b3301b2441bc095a379d95e77686b4f5ceb70)]:
  - @graphql-mesh/types@0.87.0
  - @graphql-mesh/utils@0.42.8

## 0.44.34

### Patch Changes

- [#4850](https://github.com/Urigo/graphql-mesh/pull/4850)
  [`7df7c644d`](https://github.com/Urigo/graphql-mesh/commit/7df7c644d85c00c0c0c3f8907854bbef50d298eb)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@3.0.4` ↗︎](https://www.npmjs.com/package/@envelop/core/v/3.0.4) (from `3.0.3`,
    in `dependencies`)
  - Updated dependency
    [`@envelop/extended-validation@2.0.4` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/2.0.4)
    (from `2.0.3`, in `dependencies`)

## 0.44.33

### Patch Changes

- [#4825](https://github.com/Urigo/graphql-mesh/pull/4825)
  [`3d8f23adb`](https://github.com/Urigo/graphql-mesh/commit/3d8f23adb28ca102b19433eca5baf8d341ac7305)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes on handling plural anyOf types

## 0.44.32

### Patch Changes

- [#4790](https://github.com/Urigo/graphql-mesh/pull/4790)
  [`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.15` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.15)
    (from `9.0.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.8)
    (from `8.4.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.11)
    (from `8.5.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.11)
    (from `9.2.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@9.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.0)
    (from `9.0.1`, in `dependencies`)

- [#4806](https://github.com/Urigo/graphql-mesh/pull/4806)
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.16)
    (from `9.0.15`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.9)
    (from `8.4.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.12)
    (from `9.2.11`, in `dependencies`)

- [#4809](https://github.com/Urigo/graphql-mesh/pull/4809)
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.17)
    (from `9.0.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.10)
    (from `8.4.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.12)
    (from `8.5.11`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.16)
    (from `9.2.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@9.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.1)
    (from `9.1.0`, in `dependencies`)

- [#4814](https://github.com/Urigo/graphql-mesh/pull/4814)
  [`7390ca341`](https://github.com/Urigo/graphql-mesh/commit/7390ca341c9135625f89f1e03a9d15938880154e)
  Thanks [@renovate](https://github.com/apps/renovate)! - Fixes for TypeScript 4.9.3

- Updated dependencies
  [[`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33),
  [`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33),
  [`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33),
  [`76deb32d1`](https://github.com/Urigo/graphql-mesh/commit/76deb32d1c036bc8da171be55582ec3f7b9c5015),
  [`baa4fbf82`](https://github.com/Urigo/graphql-mesh/commit/baa4fbf82af4a8787b9cab8c99e9177e3491ecf8),
  [`cf9c6d5e0`](https://github.com/Urigo/graphql-mesh/commit/cf9c6d5e00e41f2403bcb9ad1a6e403390ff3ec6)]:
  - @graphql-mesh/cross-helpers@0.2.10
  - @graphql-mesh/types@0.86.0
  - @graphql-mesh/utils@0.42.7

## 0.44.31

### Patch Changes

- [#4773](https://github.com/Urigo/graphql-mesh/pull/4773)
  [`d9c5c1195`](https://github.com/Urigo/graphql-mesh/commit/d9c5c119522a1c4cad455d62818e07a2b8f41005)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.12)
    (from `9.0.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.5)
    (from `8.4.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.9)
    (from `8.5.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.7)
    (from `9.2.5`, in `dependencies`)

- [#4775](https://github.com/Urigo/graphql-mesh/pull/4775)
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.0.1)
    (from `8.13.1`, in `dependencies`)

- [#4779](https://github.com/Urigo/graphql-mesh/pull/4779)
  [`85e5071d0`](https://github.com/Urigo/graphql-mesh/commit/85e5071d084d5372830213511f55f4a30a17bb33)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.14)
    (from `9.0.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.7)
    (from `8.4.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.10)
    (from `8.5.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.9)
    (from `9.2.7`, in `dependencies`)

- [`9a56eb45b`](https://github.com/Urigo/graphql-mesh/commit/9a56eb45bcbaa1eb58d9d7537b5d08ca4fef658f)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools packages

- Updated dependencies
  [[`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a),
  [`d9c5c1195`](https://github.com/Urigo/graphql-mesh/commit/d9c5c119522a1c4cad455d62818e07a2b8f41005),
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a),
  [`85e5071d0`](https://github.com/Urigo/graphql-mesh/commit/85e5071d084d5372830213511f55f4a30a17bb33),
  [`d9c5c1195`](https://github.com/Urigo/graphql-mesh/commit/d9c5c119522a1c4cad455d62818e07a2b8f41005),
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a),
  [`85e5071d0`](https://github.com/Urigo/graphql-mesh/commit/85e5071d084d5372830213511f55f4a30a17bb33),
  [`c55e68381`](https://github.com/Urigo/graphql-mesh/commit/c55e683816bd5668fa9e520e6e434363a2a78425)]:
  - @graphql-mesh/cross-helpers@0.2.9
  - @graphql-mesh/types@0.85.7
  - @graphql-mesh/utils@0.42.6

## 0.44.30

### Patch Changes

- [#4765](https://github.com/Urigo/graphql-mesh/pull/4765)
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@9.0.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.10)
    (from `9.0.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.3)
    (from `8.4.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.8)
    (from `8.5.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.5)
    (from `9.2.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.13.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.13.1)
    (from `8.13.0`, in `dependencies`)
- Updated dependencies
  [[`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a),
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a),
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a)]:
  - @graphql-mesh/cross-helpers@0.2.8
  - @graphql-mesh/types@0.85.6
  - @graphql-mesh/utils@0.42.5

## 0.44.29

### Patch Changes

- Updated dependencies
  [[`d5f2d950e`](https://github.com/Urigo/graphql-mesh/commit/d5f2d950e6318a74c062c9dbc436d5e9c0e8d59d)]:
  - @graphql-mesh/utils@0.42.4
  - @graphql-mesh/types@0.85.5

## 0.44.28

### Patch Changes

- [#4745](https://github.com/Urigo/graphql-mesh/pull/4745)
  [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.9)
    (from `9.0.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.2)
    (from `8.4.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.7)
    (from `8.5.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.4)
    (from `9.2.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.13.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.13.0)
    (from `8.12.0`, in `dependencies`)

- [#4748](https://github.com/Urigo/graphql-mesh/pull/4748)
  [`305dd2262`](https://github.com/Urigo/graphql-mesh/commit/305dd2262054f4173384c0af8f90e8879411bbe0)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@3.0.3` ↗︎](https://www.npmjs.com/package/@envelop/core/v/3.0.3) (from `3.0.2`,
    in `dependencies`)
  - Updated dependency
    [`@envelop/extended-validation@2.0.3` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/2.0.3)
    (from `2.0.2`, in `dependencies`)
- Updated dependencies
  [[`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd),
  [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd),
  [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd)]:
  - @graphql-mesh/cross-helpers@0.2.7
  - @graphql-mesh/types@0.85.4
  - @graphql-mesh/utils@0.42.3

## 0.44.27

### Patch Changes

- [#4732](https://github.com/Urigo/graphql-mesh/pull/4732)
  [`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/types@0.85.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.85.2)
    (from `0.85.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@0.42.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.42.1)
    (from `0.42.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/string-interpolation@0.3.3` ↗︎](https://www.npmjs.com/package/@graphql-mesh/string-interpolation/v/0.3.3)
    (from `0.3.2`, in `dependencies`)
- Updated dependencies
  [[`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56),
  [`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56)]:
  - @graphql-mesh/types@0.85.3
  - @graphql-mesh/utils@0.42.2

## 0.44.26

### Patch Changes

- [#4728](https://github.com/Urigo/graphql-mesh/pull/4728)
  [`c72d904dc`](https://github.com/Urigo/graphql-mesh/commit/c72d904dc11adfd3b6ee1695b1aaeae6ab64e1e9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.5.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.5.0)
    (from `^0.4.6`, in `dependencies`)
- Updated dependencies
  [[`5c87cfc60`](https://github.com/Urigo/graphql-mesh/commit/5c87cfc60501213e8701482b093490ec1a5fce23),
  [`09c286994`](https://github.com/Urigo/graphql-mesh/commit/09c28699441cda92f79e4e9b8464e7be5f46a786)]:
  - @graphql-mesh/string-interpolation@0.3.3
  - @graphql-mesh/types@0.85.2
  - @graphql-mesh/utils@0.42.1

## 0.44.25

### Patch Changes

- [`52b9c79d4`](https://github.com/Urigo/graphql-mesh/commit/52b9c79d4d1e665c81623a3fbe48706afe82e645)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix GraphQL v15 support by replacing
  schema.getRootType with getDefinedRootType from GraphQL Tools

## 0.44.24

### Patch Changes

- [`398af2bf6`](https://github.com/Urigo/graphql-mesh/commit/398af2bf602182ca315bc8d99d2237ad1a16ee48)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix a bug causing the plugin is registered twice
  with onPluginInit's addPlugin

- Updated dependencies
  [[`398af2bf6`](https://github.com/Urigo/graphql-mesh/commit/398af2bf602182ca315bc8d99d2237ad1a16ee48),
  [`1d61fbcec`](https://github.com/Urigo/graphql-mesh/commit/1d61fbcecb8d5b286bb1c2e727bdf7d233c566da)]:
  - @graphql-mesh/types@0.85.1
  - @graphql-mesh/utils@0.42.0

## 0.44.23

### Patch Changes

- [`c82a1c158`](https://github.com/Urigo/graphql-mesh/commit/c82a1c15873f59837a670186590d0723e5574d11)
  Thanks [@ardatan](https://github.com/ardatan)! - Clone Response for deduplication instead of
  reading it first, it no longer needs accept header to be json

## 0.44.22

### Patch Changes

- [#4673](https://github.com/Urigo/graphql-mesh/pull/4673)
  [`299770a78`](https://github.com/Urigo/graphql-mesh/commit/299770a781211badd594e2f3c88bf1e66736b170)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@envelop/core@3.0.1` ↗︎](https://www.npmjs.com/package/@envelop/core/v/3.0.1) (from `2.6.0`,
    in `dependencies`)

- [#4675](https://github.com/Urigo/graphql-mesh/pull/4675)
  [`db9005a50`](https://github.com/Urigo/graphql-mesh/commit/db9005a50d9e2f4b60fc5345e387646f4feb1bf2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@envelop/extended-validation@2.0.1` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/2.0.1)
    (from `1.9.0`, in `dependencies`)

- [#4689](https://github.com/Urigo/graphql-mesh/pull/4689)
  [`2b619b732`](https://github.com/Urigo/graphql-mesh/commit/2b619b732d35355855b4a4175a0c3050f14d9fda)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@envelop/core@3.0.2` ↗︎](https://www.npmjs.com/package/@envelop/core/v/3.0.2) (from `3.0.1`,
    in `dependencies`)
  - Updated dependency
    [`@envelop/extended-validation@2.0.2` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/2.0.2)
    (from `2.0.1`, in `dependencies`)

- [#4698](https://github.com/Urigo/graphql-mesh/pull/4698)
  [`858135646`](https://github.com/Urigo/graphql-mesh/commit/8581356462ae06b2acff96330aabf458f21e7a63)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Removed dependency [`fetchache@0.1.4` ↗︎](https://www.npmjs.com/package/fetchache/v/0.1.4)
    (from `dependencies`)

- [#4698](https://github.com/Urigo/graphql-mesh/pull/4698)
  [`858135646`](https://github.com/Urigo/graphql-mesh/commit/8581356462ae06b2acff96330aabf458f21e7a63)
  Thanks [@ardatan](https://github.com/ardatan)! - **BREAKING**

  Previously HTTP Caching was respected by GraphQL Mesh by default. Now this has been seperated into
  a different plugin. Please check our docs if you want to bring this functionality back in your
  gateway.

  [HTTP Caching Plugin](/docs/plugins/http-cache)

  Previously some details about underlying HTTP requests were exposed via
  `includeHttpDetailsInExtensions: true` flag or `DEBUG=1` env var. Now you need to install this
  plugin to get the same functionality;

  [HTTP Details in Extensions Plugin](/docs/plugins/http-details-extensions)

  Previously Mesh automatically deduplicate the similar HTTP requests per GraphQL Context by
  default, now you need to install the following plugin;

  [Deduplicate HTTP Requests Plugin](/docs/plugins/deduplicate-request)

## 0.44.21

### Patch Changes

- Updated dependencies
  [[`6fb57d3ba`](https://github.com/Urigo/graphql-mesh/commit/6fb57d3ba6ce68e47d9f5dbf54e57d178441fa18),
  [`814f2d516`](https://github.com/Urigo/graphql-mesh/commit/814f2d51692df593fcf368765e9c8a0ce99f46bd)]:
  - @graphql-mesh/types@0.85.0
  - @graphql-mesh/utils@0.41.22

## 0.44.20

### Patch Changes

- Updated dependencies
  [[`637e9e9d8`](https://github.com/Urigo/graphql-mesh/commit/637e9e9d8a702cf28cde48137a0f73bab7628f6d)]:
  - @graphql-mesh/types@0.84.10
  - @graphql-mesh/utils@0.41.21

## 0.44.19

### Patch Changes

- Updated dependencies
  [[`dd831a7d1`](https://github.com/Urigo/graphql-mesh/commit/dd831a7d1256400d1b7441cfb99b517cf856ce5b)]:
  - @graphql-mesh/types@0.84.9
  - @graphql-mesh/utils@0.41.20

## 0.44.18

### Patch Changes

- Updated dependencies
  [[`5b44abcd2`](https://github.com/Urigo/graphql-mesh/commit/5b44abcd2aaa765ee329539112d9dface063efa6)]:
  - @graphql-mesh/utils@0.41.19
  - @graphql-mesh/types@0.84.8

## 0.44.17

### Patch Changes

- [`70b3f55a5`](https://github.com/Urigo/graphql-mesh/commit/70b3f55a5e8a8b033397015fb82daebcb1c4af6d)
  Thanks [@ardatan](https://github.com/ardatan)! - Support older GraphQL-js versions

## 0.44.16

### Patch Changes

- [#4604](https://github.com/Urigo/graphql-mesh/pull/4604)
  [`ffb301435`](https://github.com/Urigo/graphql-mesh/commit/ffb3014353c17d23a03cf8001eba606c85c2043f)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@9.0.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.8)
    (from `9.0.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.1)
    (from `8.3.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.3)
    (from `9.2.1`, in `dependencies`)
- Updated dependencies
  [[`ffb301435`](https://github.com/Urigo/graphql-mesh/commit/ffb3014353c17d23a03cf8001eba606c85c2043f),
  [`ffb301435`](https://github.com/Urigo/graphql-mesh/commit/ffb3014353c17d23a03cf8001eba606c85c2043f)]:
  - @graphql-mesh/types@0.84.7
  - @graphql-mesh/utils@0.41.18

## 0.44.15

### Patch Changes

- [#4605](https://github.com/Urigo/graphql-mesh/pull/4605)
  [`31a64714a`](https://github.com/Urigo/graphql-mesh/commit/31a64714a3e47dc41b950b3e1cfd1a49e7ff2d8a)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.8)
    (from `9.0.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.1)
    (from `8.3.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.3)
    (from `9.2.1`, in `dependencies`)

- [#4605](https://github.com/Urigo/graphql-mesh/pull/4605)
  [`31a64714a`](https://github.com/Urigo/graphql-mesh/commit/31a64714a3e47dc41b950b3e1cfd1a49e7ff2d8a)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix memoization on batch delegation

- Updated dependencies
  [[`31a64714a`](https://github.com/Urigo/graphql-mesh/commit/31a64714a3e47dc41b950b3e1cfd1a49e7ff2d8a),
  [`31a64714a`](https://github.com/Urigo/graphql-mesh/commit/31a64714a3e47dc41b950b3e1cfd1a49e7ff2d8a)]:
  - @graphql-mesh/types@0.84.6
  - @graphql-mesh/utils@0.41.17

## 0.44.14

### Patch Changes

- [#4571](https://github.com/Urigo/graphql-mesh/pull/4571)
  [`1a8e80870`](https://github.com/Urigo/graphql-mesh/commit/1a8e8087039646b7ccf02d76cbed134854271516)
  Thanks [@ardatan](https://github.com/ardatan)! - Choose the root type name for a specific
  operation type from the source schema not from the gateway schema, because source schema might
  have a different like `QueryType` instead of `Query`.

- Updated dependencies
  [[`88ab8f9ae`](https://github.com/Urigo/graphql-mesh/commit/88ab8f9ae32a4d0f52c978d625082abe075bebe4)]:
  - @graphql-mesh/utils@0.41.16
  - @graphql-mesh/types@0.84.5

## 0.44.13

### Patch Changes

- Updated dependencies
  [[`186e37bcd`](https://github.com/Urigo/graphql-mesh/commit/186e37bcd94c6eae16b30abd2f4c8b04d2ef422e)]:
  - @graphql-mesh/utils@0.41.15
  - @graphql-mesh/types@0.84.4

## 0.44.12

### Patch Changes

- Updated dependencies
  [[`93f4ed55d`](https://github.com/Urigo/graphql-mesh/commit/93f4ed55de7b9f2a55e11bf1df4ab7b4c59b3825)]:
  - @graphql-mesh/utils@0.41.14
  - @graphql-mesh/types@0.84.3

## 0.44.11

### Patch Changes

- Updated dependencies
  [[`ff251e4c7`](https://github.com/Urigo/graphql-mesh/commit/ff251e4c7654306d3030774447c991788768e148)]:
  - @graphql-mesh/types@0.84.2
  - @graphql-mesh/utils@0.41.13

## 0.44.10

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.84.1
  - @graphql-mesh/utils@0.41.12

## 0.44.9

### Patch Changes

- Updated dependencies
  [[`077e65c18`](https://github.com/Urigo/graphql-mesh/commit/077e65c1857aaefa2689f33decc9e72ded281c94),
  [`ee1cb6f76`](https://github.com/Urigo/graphql-mesh/commit/ee1cb6f7620f71fd824e69f4171cfef6c5d51794)]:
  - @graphql-mesh/types@0.84.0
  - @graphql-mesh/utils@0.41.11

## 0.44.8

### Patch Changes

- [#4493](https://github.com/Urigo/graphql-mesh/pull/4493)
  [`cb6fa8c82`](https://github.com/Urigo/graphql-mesh/commit/cb6fa8c82640c72768290a7843a8b767a57e09d7)
  Thanks [@ardatan](https://github.com/ardatan)! - Refactor useSubschema

## 0.44.7

### Patch Changes

- [#4491](https://github.com/Urigo/graphql-mesh/pull/4491)
  [`15230bc53`](https://github.com/Urigo/graphql-mesh/commit/15230bc534e4f5e769b6f1210120472c98d842b5)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/wrap@9.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.1)
    (from `9.2.0`, in `dependencies`)

## 0.44.6

### Patch Changes

- [#4487](https://github.com/Urigo/graphql-mesh/pull/4487)
  [`39f440e36`](https://github.com/Urigo/graphql-mesh/commit/39f440e36018f98a41a37b5465ea6617c5fc6c7e)
  Thanks [@ardatan](https://github.com/ardatan)! - - Do not assume scalars' types by using
  graphql-scalars
  - Create unified executor only once at startup
  - Respect predefined type definitions for scalars in the source types
    `.mesh/sources/SOURCE_NAME/types.ts` like `BigInt: bigint`
  - Respect introspection fields correctly

## 0.44.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.83.5
  - @graphql-mesh/utils@0.41.10

## 0.44.4

### Patch Changes

- [#4439](https://github.com/Urigo/graphql-mesh/pull/4439)
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/cross-helpers@0.2.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.2.5)
    (from `0.2.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@0.83.3` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.83.3)
    (from `0.82.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@0.41.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.41.8)
    (from `0.41.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.6)
    (from `9.0.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.9)
    (from `8.3.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.6)
    (from `8.5.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.0)
    (from `9.0.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.12.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.12.0)
    (from `8.10.1`, in `dependencies`)
  - Updated dependency [`fetchache@0.1.4` ↗︎](https://www.npmjs.com/package/fetchache/v/0.1.4)
    (from `0.1.2`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/fetch@0.4.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.4.2) (from
    `0.3.2`, in `dependencies`)

- [`317f6b454`](https://github.com/Urigo/graphql-mesh/commit/317f6b454db59e351cf6360df5575248cb579dd4)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump fetch and server packages and avoid using
  Response.redirect which needs a full path but instead Response with Location header works better

- Updated dependencies
  [[`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2),
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2),
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2)]:
  - @graphql-mesh/cross-helpers@0.2.6
  - @graphql-mesh/types@0.83.4
  - @graphql-mesh/utils@0.41.9

## 0.44.3

### Patch Changes

- [#4466](https://github.com/Urigo/graphql-mesh/pull/4466)
  [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.6)
    (from `9.0.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.9)
    (from `8.3.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.6)
    (from `8.5.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.0)
    (from `9.0.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.12.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.12.0)
    (from `8.11.0`, in `dependencies`)

- Updated dependencies
  [[`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f),
  [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f),
  [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f)]:
  - @graphql-mesh/cross-helpers@0.2.5
  - @graphql-mesh/types@0.83.3
  - @graphql-mesh/utils@0.41.8

## 0.44.2

### Patch Changes

- [#4462](https://github.com/Urigo/graphql-mesh/pull/4462)
  [`d84f81d94`](https://github.com/Urigo/graphql-mesh/commit/d84f81d9487ce228125863b8b283adab75daff19)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`fetchache@0.1.4` ↗︎](https://www.npmjs.com/package/fetchache/v/0.1.4)
    (from `0.1.3`, in `dependencies`)

- Updated dependencies
  [[`d84f81d94`](https://github.com/Urigo/graphql-mesh/commit/d84f81d9487ce228125863b8b283adab75daff19)]:
  - @graphql-mesh/utils@0.41.7
  - @graphql-mesh/types@0.83.2

## 0.44.1

### Patch Changes

- [#4453](https://github.com/Urigo/graphql-mesh/pull/4453)
  [`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`fetchache@0.1.3` ↗︎](https://www.npmjs.com/package/fetchache/v/0.1.3)
    (from `0.1.2`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/fetch@0.4.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.4.2) (from
    `0.3.2`, in `dependencies`)

- Updated dependencies
  [[`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8)]:
  - @graphql-mesh/utils@0.41.6
  - @graphql-mesh/types@0.83.1

## 0.44.0

### Minor Changes

- [`44b868196`](https://github.com/Urigo/graphql-mesh/commit/44b86819695a298e60b1d7b6c54ae2772e8f1588)
  Thanks [@ardatan](https://github.com/ardatan)! - Use In Context SDK for wrapping resolvers for
  better tracing

### Patch Changes

- [`24afabece`](https://github.com/Urigo/graphql-mesh/commit/24afabece51aee171f902776d3f59b4a17026c49)
  Thanks [@ardatan](https://github.com/ardatan)! - Enable Automatic Type Merging by default

- Updated dependencies
  [[`a56ebcec5`](https://github.com/Urigo/graphql-mesh/commit/a56ebcec503402fbdb3d4e3561fd2e38e4dd5c43),
  [`24afabece`](https://github.com/Urigo/graphql-mesh/commit/24afabece51aee171f902776d3f59b4a17026c49),
  [`44b868196`](https://github.com/Urigo/graphql-mesh/commit/44b86819695a298e60b1d7b6c54ae2772e8f1588)]:
  - @graphql-mesh/types@0.83.0
  - @graphql-mesh/utils@0.41.5

## 0.43.4

### Patch Changes

- [#4443](https://github.com/Urigo/graphql-mesh/pull/4443)
  [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.5)
    (from `9.0.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.8)
    (from `8.3.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.5)
    (from `8.5.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.6)
    (from `9.0.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.11.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.11.0)
    (from `8.10.1`, in `dependencies`)

- Updated dependencies
  [[`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53),
  [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53),
  [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53)]:
  - @graphql-mesh/cross-helpers@0.2.4
  - @graphql-mesh/types@0.82.3
  - @graphql-mesh/utils@0.41.4

## 0.43.3

### Patch Changes

- Updated dependencies
  [[`b9bb80094`](https://github.com/Urigo/graphql-mesh/commit/b9bb8009407d27440267a5e9a7ec5dbfecc9bf8f)]:
  - @graphql-mesh/types@0.82.2
  - @graphql-mesh/utils@0.41.3

## 0.43.2

### Patch Changes

- [#4418](https://github.com/Urigo/graphql-mesh/pull/4418)
  [`59dbb1985`](https://github.com/Urigo/graphql-mesh/commit/59dbb1985b07a250f0113d70e0f55e467dc17812)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@envelop/core@2.6.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/2.6.0) (from `2.5.0`,
    in `dependencies`)
  - Updated dependency
    [`@envelop/extended-validation@1.9.0` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/1.9.0)
    (from `1.8.0`, in `dependencies`)

- Updated dependencies
  [[`3165827f7`](https://github.com/Urigo/graphql-mesh/commit/3165827f74b48a914b9604b024cd1318c211aa14)]:
  - @graphql-mesh/types@0.82.1
  - @graphql-mesh/utils@0.41.2

## 0.43.1

### Patch Changes

- Updated dependencies
  [[`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9),
  [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9)]:
  - @graphql-mesh/types@0.82.0
  - @graphql-mesh/utils@0.41.1

## 0.43.0

### Minor Changes

- [#4404](https://github.com/Urigo/graphql-mesh/pull/4404)
  [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f)
  Thanks [@ardatan](https://github.com/ardatan)! - New `onFetch` hook!

- [#4409](https://github.com/Urigo/graphql-mesh/pull/4409)
  [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f)
  Thanks [@ardatan](https://github.com/ardatan)! - New onDelegate hook

### Patch Changes

- [#4380](https://github.com/Urigo/graphql-mesh/pull/4380)
  [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.4)
    (from `9.0.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.7)
    (from `8.3.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.4)
    (from `8.5.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.5)
    (from `9.0.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.1)
    (from `8.10.0`, in `dependencies`)

- [#4389](https://github.com/Urigo/graphql-mesh/pull/4389)
  [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.4)
    (from `9.0.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.7)
    (from `8.3.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-execute@8.5.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.4)
    (from `8.5.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.5)
    (from `9.0.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.1)
    (from `8.10.0`, in `dependencies`)

- [#4404](https://github.com/Urigo/graphql-mesh/pull/4404)
  [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency [`fetchache@0.1.2` ↗︎](https://www.npmjs.com/package/fetchache/v/0.1.2) (to
    `dependencies`)
  - Added dependency
    [`@whatwg-node/fetch@0.3.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.3.2) (to
    `dependencies`)

- Updated dependencies
  [[`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd),
  [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f),
  [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd),
  [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f),
  [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f),
  [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd),
  [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f),
  [`df37c40f4`](https://github.com/Urigo/graphql-mesh/commit/df37c40f47c6c53949f5d5f71e062c09fe5e1bd0),
  [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f),
  [`7a4023a2c`](https://github.com/Urigo/graphql-mesh/commit/7a4023a2cac2dacc8e78e10dabee65427b9a5e54),
  [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f)]:
  - @graphql-mesh/cross-helpers@0.2.3
  - @graphql-mesh/types@0.81.0
  - @graphql-mesh/utils@0.41.0

## 0.42.3

### Patch Changes

- [#4356](https://github.com/Urigo/graphql-mesh/pull/4356)
  [`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/cross-helpers@0.2.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.2.2)
    (to `dependencies`)

- Updated dependencies
  [[`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824),
  [`be79b20a5`](https://github.com/Urigo/graphql-mesh/commit/be79b20a59b14d5d79bfeb260e4ecabc58c26efb),
  [`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824)]:
  - @graphql-mesh/utils@0.40.0
  - @graphql-mesh/types@0.80.2

## 0.42.2

### Patch Changes

- Updated dependencies
  [[`f23e14eba`](https://github.com/Urigo/graphql-mesh/commit/f23e14ebaf7c6a869207edc43b0e2a8114d0d21f)]:
  - @graphql-mesh/utils@0.39.0
  - @graphql-mesh/types@0.80.1

## 0.42.1

### Patch Changes

- [#4344](https://github.com/Urigo/graphql-mesh/pull/4344)
  [`fd9356d31`](https://github.com/Urigo/graphql-mesh/commit/fd9356d31ace0bc411602a31e419a9091b6c3323)
  Thanks [@ardatan](https://github.com/ardatan)! - fix(runtime): if there is only one source,
  respect introspection query even if there is no operationName

- Updated dependencies
  [[`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319)]:
  - @graphql-mesh/types@0.80.0
  - @graphql-mesh/utils@0.38.1

## 0.42.0

### Minor Changes

- [#4326](https://github.com/Urigo/graphql-mesh/pull/4326)
  [`209717f0b`](https://github.com/Urigo/graphql-mesh/commit/209717f0b87a56326cfd37fb9f26cb1ccbc47b1a)
  Thanks [@ardatan](https://github.com/ardatan)! - Enable batching by default when there is a single
  source, and respect `batch` flag

### Patch Changes

- [#4326](https://github.com/Urigo/graphql-mesh/pull/4326)
  [`209717f0b`](https://github.com/Urigo/graphql-mesh/commit/209717f0b87a56326cfd37fb9f26cb1ccbc47b1a)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-tools/batch-execute@8.5.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.3)
    (to `dependencies`)

## 0.41.10

### Patch Changes

- [#4314](https://github.com/Urigo/graphql-mesh/pull/4314)
  [`cbc00748e`](https://github.com/Urigo/graphql-mesh/commit/cbc00748e8538e17e83b1a858947ff6503c6d5c0)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@envelop/core@2.5.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/2.5.0) (from `2.4.2`,
    in `dependencies`)
  - Updated dependency
    [`@envelop/extended-validation@1.8.0` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/1.8.0)
    (from `1.7.2`, in `dependencies`)

- Updated dependencies
  [[`b162269f7`](https://github.com/Urigo/graphql-mesh/commit/b162269f70a90594962792ffaaa40d3a7ee9f4e4),
  [`2ad667d96`](https://github.com/Urigo/graphql-mesh/commit/2ad667d964545ed47170cfa4f9393282edc2073b)]:
  - @graphql-mesh/types@0.79.0
  - @graphql-mesh/utils@0.38.0
  - @graphql-mesh/string-interpolation@0.3.2

## 0.41.9

### Patch Changes

- [#4275](https://github.com/Urigo/graphql-mesh/pull/4275)
  [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.1)
    (was `9.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.3)
    (was `8.3.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.1)
    (was `9.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.0)
    (was `8.9.1`, in `dependencies`)

* [#4298](https://github.com/Urigo/graphql-mesh/pull/4298)
  [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.3)
    (was `9.0.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.6)
    (was `8.3.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.4)
    (was `9.0.1`, in `dependencies`)

* Updated dependencies
  [[`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968),
  [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2),
  [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968),
  [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2),
  [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968)]:
  - @graphql-mesh/string-interpolation@0.3.1
  - @graphql-mesh/types@0.78.8
  - @graphql-mesh/utils@0.37.9

## 0.41.8

### Patch Changes

- [#4263](https://github.com/Urigo/graphql-mesh/pull/4263)
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.0)
    (was `8.8.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.2)
    (was `8.3.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.0)
    (was `8.5.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.9.1)
    (was `8.9.0`, in `dependencies`)

- Updated dependencies
  [[`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73),
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73),
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)]:
  - @graphql-mesh/types@0.78.7
  - @graphql-mesh/utils@0.37.8

## 0.41.7

### Patch Changes

- [`760a60483`](https://github.com/Urigo/graphql-mesh/commit/760a60483c2a95a4453b043d97b72c0ee46e5c65)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix a bug causing the execution args passed to
  'execution' ignored in the subsequent envelop plugins

## 0.41.6

### Patch Changes

- Updated dependencies
  [[`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18),
  [`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b)]:
  - @graphql-mesh/utils@0.37.7
  - @graphql-mesh/types@0.78.6

## 0.41.5

### Patch Changes

- Updated dependencies [c88a34d82]
  - @graphql-mesh/types@0.78.5
  - @graphql-mesh/utils@0.37.6

## 0.41.4

### Patch Changes

- Updated dependencies [30d046724]
  - @graphql-mesh/utils@0.37.5
  - @graphql-mesh/types@0.78.4

## 0.41.3

### Patch Changes

- Updated dependencies [738e2f378]
  - @graphql-mesh/types@0.78.3
  - @graphql-mesh/utils@0.37.4

## 0.41.2

### Patch Changes

- Updated dependencies [a2ef35c35]
  - @graphql-mesh/types@0.78.2
  - @graphql-mesh/utils@0.37.3

## 0.41.1

### Patch Changes

- 2e89d814b: Now if there is only one error to be thrown, throw it as it is instead of using
  AggregateError in SDK and handlers
  - @graphql-mesh/types@0.78.1
  - @graphql-mesh/utils@0.37.2

## 0.41.0

### Minor Changes

- bcd9355ee: Breaking change in merger API;

  Before a merger should return a `GraphQLSchema`, not it needs to return `SubschemaConfig` from
  `@graphql-tools/delegate` package. The idea is to prevent the schema from being wrap to reduce the
  execution complexity. Now if merger returns an executor, it will be used directly as an executor
  inside Envelop's pipeline. Also it can return `transforms` which will be applied during execution
  while schema transforms are applied on build time without any modification in the resolvers.

  If there are some root transforms, those are applied together with the source transforms on the
  execution level in case of a single source.

### Patch Changes

- Updated dependencies [6e6fd4ab7]
- Updated dependencies [bcd9355ee]
  - @graphql-mesh/utils@0.37.1
  - @graphql-mesh/types@0.78.0

## 0.40.0

### Minor Changes

- 0401c7617: **Improvements on string interpolation ({env.sth} or {context.headers.sth}) for
  different environments**

  As we mention in most of our docs, we usually expect a key-value `header` object in the context.
  But Fetch-like environments don't have this kind of object but instead `Headers` object which is a
  kind `Map`. Now Mesh can detect this and automatically convert it to the key-value object
  especially for Yoga users.

  Also Mesh now handles `env` in a better way for non-Node environments;

  Consider `import.meta.env` as `env` if available, else take `globalThis` as `env`.

### Patch Changes

- Updated dependencies [66f5d0189]
- Updated dependencies [0401c7617]
  - @graphql-mesh/types@0.77.1
  - @graphql-mesh/utils@0.37.0

## 0.39.1

### Patch Changes

- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
  - @graphql-mesh/types@0.77.0
  - @graphql-mesh/utils@0.36.1

## 0.39.0

### Minor Changes

- a0950ac6f: Breaking Change:

  - Now you can set a global `customFetch` instead of setting `customFetch` individually for each
    handler. `customFetch` configuration field for each handler will no longer work. And also
    `customFetch` needs to be the path of the code file that exports the function as `default`.
    `moduleName#exportName` is not supported for now.

  - While programmatically creating the handlers, now you also need `fetchFn` to be passed to the
    constructor;

  ```ts
  new GraphQLHandler({
    ...,
    fetchFn: myFetchFn,
  })
  ```

  - `readFileOrUrl`'s second `config` parameter is now required. Also this second parameter should
    take an object with `cwd`, `importFn`, `fetch` and `logger`. You can see the diff of handler's
    codes as an example.

### Patch Changes

- Updated dependencies [19d06f6c9]
- Updated dependencies [19d06f6c9]
- Updated dependencies [a0950ac6f]
  - @graphql-mesh/utils@0.36.0
  - @graphql-mesh/types@0.76.0

## 0.38.0

### Minor Changes

- d4754ad08: Response Cache Plugin

### Patch Changes

- Updated dependencies [d4754ad08]
- Updated dependencies [2df026e90]
  - @graphql-mesh/types@0.75.0
  - @graphql-mesh/utils@0.35.7

## 0.37.1

### Patch Changes

- Updated dependencies [ed9ba7f48]
  - @graphql-mesh/types@0.74.2
  - @graphql-mesh/utils@0.35.6

## 0.37.0

### Minor Changes

- ab93f1697: Handle @oneOf validation if used by any sources

## 0.36.1

### Patch Changes

- Updated dependencies [41cfb46b4]
  - @graphql-mesh/utils@0.35.5
  - @graphql-mesh/types@0.74.1

## 0.36.0

### Minor Changes

- 13b9b30f7: Add interpolation strings to the generated MeshContext type

### Patch Changes

- Updated dependencies [13b9b30f7]
  - @graphql-mesh/string-interpolation@0.3.0
  - @graphql-mesh/types@0.74.0
  - @graphql-mesh/utils@0.35.4

## 0.35.4

### Patch Changes

- Updated dependencies [9733f490c]
  - @graphql-mesh/utils@0.35.3
  - @graphql-mesh/types@0.73.3

## 0.35.3

### Patch Changes

- 930bbd3ee: Remove unused dependencies

## 0.35.2

### Patch Changes

- Updated dependencies [3c0366d2c]
- Updated dependencies [3c0366d2c]
  - @graphql-mesh/utils@0.35.2
  - @graphql-mesh/types@0.73.2

## 0.35.1

### Patch Changes

- Updated dependencies [abe9fcc41]
  - @graphql-mesh/utils@0.35.1
  - @graphql-mesh/types@0.73.1

## 0.35.0

### Minor Changes

- 893d526ab: POC: Mesh Declarative Plugin System

### Patch Changes

- 974e703e2: Cleanup dependencies
- Updated dependencies [974e703e2]
- Updated dependencies [19a99c055]
- Updated dependencies [974e703e2]
- Updated dependencies [974e703e2]
- Updated dependencies [893d526ab]
- Updated dependencies [974e703e2]
  - @graphql-mesh/string-interpolation@0.2.0
  - @graphql-mesh/types@0.73.0
  - @graphql-mesh/utils@0.35.0

## 0.34.10

### Patch Changes

- Updated dependencies [43eb3d2c2]
  - @graphql-mesh/utils@0.34.10
  - @graphql-mesh/types@0.72.5

## 0.34.9

### Patch Changes

- Updated dependencies [55ad5ea44]
  - @graphql-mesh/utils@0.34.9
  - @graphql-mesh/types@0.72.4

## 0.34.8

### Patch Changes

- Updated dependencies [31efa964e]
  - @graphql-mesh/utils@0.34.8
  - @graphql-mesh/types@0.72.3

## 0.34.7

### Patch Changes

- @graphql-mesh/utils@0.34.7
- @graphql-mesh/types@0.72.2

## 0.34.6

### Patch Changes

- Updated dependencies [b9beacca2]
  - @graphql-mesh/utils@0.34.6
  - @graphql-mesh/types@0.72.1

## 0.34.5

### Patch Changes

- efe797ff9: Fix typing issues and improve Urql and Apollo packages
- Updated dependencies [fa2542468]
  - @graphql-mesh/types@0.72.0
  - @graphql-mesh/utils@0.34.5

## 0.34.4

### Patch Changes

- Updated dependencies [ddbbec8a8]
  - @graphql-mesh/utils@0.34.4
  - @graphql-mesh/types@0.71.4

## 0.34.3

### Patch Changes

- Updated dependencies [2e9addd80]
  - @graphql-mesh/utils@0.34.3
  - @graphql-mesh/types@0.71.3

## 0.34.2

### Patch Changes

- @graphql-mesh/types@0.71.2
- @graphql-mesh/utils@0.34.2

## 0.34.1

### Patch Changes

- 7856f92d3: Bump all packages
- Updated dependencies [7856f92d3]
  - @graphql-mesh/types@0.71.1
  - @graphql-mesh/utils@0.34.1

## 0.34.0

### Minor Changes

- f963b57ce: Improve Logging Experience

### Patch Changes

- Updated dependencies [f963b57ce]
- Updated dependencies [0644f31f2]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
  - @graphql-mesh/types@0.71.0
  - @graphql-mesh/utils@0.34.0

## 0.33.15

### Patch Changes

- @graphql-mesh/utils@0.33.6
- @graphql-mesh/types@0.70.6

## 0.33.14

### Patch Changes

- b974d9bd0: fix: get correct subschema for in context sdk and make correct assumptions to apply
  WrapQuery transform

## 0.33.13

### Patch Changes

- c0387e8ac: Better Error Handling
  - @graphql-mesh/types@0.70.5
  - @graphql-mesh/utils@0.33.5

## 0.33.12

### Patch Changes

- 35a55e841: Bump GraphQL Tools packages
- Updated dependencies [35a55e841]
  - @graphql-mesh/types@0.70.4
  - @graphql-mesh/utils@0.33.4

## 0.33.11

### Patch Changes

- 1dbe6b6c3: Better Error Handling

## 0.33.10

### Patch Changes

- @graphql-mesh/types@0.70.3
- @graphql-mesh/utils@0.33.3

## 0.33.9

### Patch Changes

- Updated dependencies [b02f5b008]
  - @graphql-mesh/types@0.70.2
  - @graphql-mesh/utils@0.33.2

## 0.33.8

### Patch Changes

- 2d5c6c72a: add Git repository link in package.json
- Updated dependencies [2d5c6c72a]
  - @graphql-mesh/types@0.70.1
  - @graphql-mesh/utils@0.33.1

## 0.33.7

### Patch Changes

- Updated dependencies [d567be7b5]
  - @graphql-mesh/types@0.70.0
  - @graphql-mesh/utils@0.33.0

## 0.33.6

### Patch Changes

- Updated dependencies [f30dba61e]
  - @graphql-mesh/types@0.69.0
  - @graphql-mesh/utils@0.32.2

## 0.33.5

### Patch Changes

- Updated dependencies [be61de529]
  - @graphql-mesh/types@0.68.3
  - @graphql-mesh/utils@0.32.1

## 0.33.4

### Patch Changes

- Updated dependencies [b1a6df928]
- Updated dependencies [67fb11706]
  - @graphql-mesh/types@0.68.2
  - @graphql-mesh/utils@0.32.0

## 0.33.3

### Patch Changes

- Updated dependencies [b2c537c2a]
  - @graphql-mesh/utils@0.31.0
  - @graphql-mesh/types@0.68.1

## 0.33.2

### Patch Changes

- afdac7faf: fix artifacts and add tests for artifact usage
- Updated dependencies [6c318b91a]
  - @graphql-mesh/types@0.68.0
  - @graphql-mesh/utils@0.30.2

## 0.33.1

### Patch Changes

- @graphql-mesh/types@0.67.1
- @graphql-mesh/utils@0.30.1

## 0.33.0

### Minor Changes

- 01bac6bb5: enhance: reduce memory consumption

### Patch Changes

- 01bac6bb5: fix - align graphql-tools versions
- Updated dependencies [01bac6bb5]
- Updated dependencies [01bac6bb5]
  - @graphql-mesh/types@0.67.0
  - @graphql-mesh/utils@0.30.0

## 0.32.0

### Minor Changes

- 268db0462: feat: persisted queries

### Patch Changes

- Updated dependencies [268db0462]
  - @graphql-mesh/utils@0.29.0
  - @graphql-mesh/types@0.66.6

## 0.31.13

### Patch Changes

- Updated dependencies [2ffb1f287]
  - @graphql-mesh/types@0.66.5
  - @graphql-mesh/utils@0.28.5

## 0.31.12

### Patch Changes

- 634363331: fix: bump wrap and url-loader packages
- Updated dependencies [6d2d46480]
  - @graphql-mesh/types@0.66.4
  - @graphql-mesh/utils@0.28.4

## 0.31.11

### Patch Changes

- f11d8b9c8: fix: add implicit dependencies
  - @graphql-mesh/types@0.66.3
  - @graphql-mesh/utils@0.28.3

## 0.31.10

### Patch Changes

- fb876e99c: fix: bump fixed delegate package
- Updated dependencies [fb876e99c]
  - @graphql-mesh/types@0.66.2
  - @graphql-mesh/utils@0.28.2

## 0.31.9

### Patch Changes

- Updated dependencies [98ff961ff]
  - @graphql-mesh/types@0.66.1
  - @graphql-mesh/utils@0.28.1

## 0.31.8

### Patch Changes

- 6f07de8fe: fix: do not import process from env
- b481fbc39: enhance: add tslib to dependencies to reduce bundle size
- Updated dependencies [6f07de8fe]
- Updated dependencies [6f07de8fe]
- Updated dependencies [b481fbc39]
  - @graphql-mesh/types@0.66.0
  - @graphql-mesh/utils@0.28.0

## 0.31.7

### Patch Changes

- Updated dependencies [21de17a3d]
- Updated dependencies [3f4bb09a9]
  - @graphql-mesh/types@0.65.0
  - @graphql-mesh/utils@0.27.9

## 0.31.6

### Patch Changes

- Updated dependencies [8b8eb5158]
- Updated dependencies [8b8eb5158]
  - @graphql-mesh/types@0.64.2
  - @graphql-mesh/utils@0.27.8

## 0.31.5

### Patch Changes

- Updated dependencies [ca6bb5ff3]
  - @graphql-mesh/utils@0.27.7
  - @graphql-mesh/types@0.64.1

## 0.31.4

### Patch Changes

- c84d9e95e: fix(cli/runtime): print stacktrace of error objects instead of inspecting them

## 0.31.3

### Patch Changes

- Updated dependencies [08b250e04]
  - @graphql-mesh/types@0.64.0
  - @graphql-mesh/utils@0.27.6

## 0.31.2

### Patch Changes

- 1815865c3: fix: bump fixed graphql-tools
- Updated dependencies [1815865c3]
  - @graphql-mesh/types@0.63.1
  - @graphql-mesh/utils@0.27.5

## 0.31.1

### Patch Changes

- f202f53af: fix: bump wrap package and throw better error message in case of missing selectionSet
  for unmatching return types

## 0.31.0

### Minor Changes

- b6eca9baa: feat(core): Envelop integration

### Patch Changes

- Updated dependencies [b6eca9baa]
- Updated dependencies [b6eca9baa]
  - @graphql-mesh/types@0.63.0
  - @graphql-mesh/utils@0.27.4

## 0.30.4

### Patch Changes

- 0d43ecf19: fix(runtime): add mock info if not present
- Updated dependencies [0d43ecf19]
  - @graphql-mesh/types@0.62.2
  - @graphql-mesh/utils@0.27.3

## 0.30.3

### Patch Changes

- 3272bb516: fix(runtime): consider noWrap transforms as wrap if the source is wrapped already

## 0.30.2

### Patch Changes

- Updated dependencies [c71b29004]
- Updated dependencies [447bc3697]
  - @graphql-mesh/utils@0.27.2
  - @graphql-mesh/types@0.62.1

## 0.30.1

### Patch Changes

- fcbd12a35: fix(runtime): fallback to a dummy selectionSet if parent return type doesn't have one
- Updated dependencies [240ec7b38]
- Updated dependencies [fcbd12a35]
  - @graphql-mesh/types@0.62.0
  - @graphql-mesh/utils@0.27.1

## 0.30.0

### Minor Changes

- 900a01355: feat(serve-source): use the same server for serve-source cmd

### Patch Changes

- Updated dependencies [900a01355]
  - @graphql-mesh/utils@0.27.0

## 0.29.3

### Patch Changes

- Updated dependencies [66ca1a366]
  - @graphql-mesh/types@0.61.0
  - @graphql-mesh/utils@0.26.4

## 0.29.2

### Patch Changes

- Updated dependencies [a79268b3a]
- Updated dependencies [a79268b3a]
  - @graphql-mesh/types@0.60.0
  - @graphql-mesh/utils@0.26.3

## 0.29.1

### Patch Changes

- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
  - @graphql-mesh/types@0.59.0
  - @graphql-mesh/utils@0.26.2

## 0.29.0

### Minor Changes

- 6601a949e: enhance(runtime): expose logger in the context and MeshInstance
- 6601a949e: feat(runtime): export ServeMeshOption for custom server handler

### Patch Changes

- Updated dependencies [113091148]
- Updated dependencies [6bb4cf673]
  - @graphql-mesh/utils@0.26.1
  - @graphql-mesh/types@0.58.0

## 0.28.0

### Minor Changes

- 56e2257fa: feat: use JIT in all execution phases

### Patch Changes

- f60bcb083: fix(core): update wrap to fix #3424
- Updated dependencies [1ab0aebbc]
- Updated dependencies [56e2257fa]
- Updated dependencies [56e2257fa]
  - @graphql-mesh/types@0.57.2
  - @graphql-mesh/utils@0.26.0

## 0.27.1

### Patch Changes

- Updated dependencies [2b876f2b8]
  - @graphql-mesh/utils@0.25.0

## 0.27.0

### Minor Changes

- 80eb8e92b: feat(SDK): use JIT SDK instead of regular generic SDK

### Patch Changes

- Updated dependencies [d907351c5]
  - @graphql-mesh/types@0.57.1
  - @graphql-mesh/utils@0.24.2

## 0.26.10

### Patch Changes

- Updated dependencies [26d685f2a]
  - @graphql-mesh/utils@0.24.1

## 0.26.9

### Patch Changes

- Updated dependencies [cfca98d34]
  - @graphql-mesh/types@0.57.0
  - @graphql-mesh/utils@0.24.0

## 0.26.8

### Patch Changes

- Updated dependencies [5666484d6]
  - @graphql-mesh/utils@0.23.0

## 0.26.7

### Patch Changes

- Updated dependencies [6c216c309]
  - @graphql-mesh/utils@0.22.2

## 0.26.6

### Patch Changes

- Updated dependencies [c22eb1b5e]
  - @graphql-mesh/utils@0.22.1

## 0.26.5

### Patch Changes

- Updated dependencies [ec0d1d639]
- Updated dependencies [1cc0acb9a]
  - @graphql-mesh/types@0.56.0
  - @graphql-mesh/utils@0.22.0

## 0.26.4

### Patch Changes

- 3bded2bad: disable JIT execution for now

## 0.26.3

### Patch Changes

- Updated dependencies [1b332487c]
  - @graphql-mesh/types@0.55.0
  - @graphql-mesh/utils@0.21.1

## 0.26.2

### Patch Changes

- Updated dependencies [875d0e48d]
  - @graphql-mesh/utils@0.21.0

## 0.26.1

### Patch Changes

- Updated dependencies [761b16ed9]
  - @graphql-mesh/types@0.54.1
  - @graphql-mesh/utils@0.20.1

## 0.26.0

### Minor Changes

- 0f476c201: feat(runtime): adapt new LiveQuery changes

## 0.25.0

### Minor Changes

- 09f81dd74: GraphQL v16 compatibility
- 267573a16: enhance: resolve all promises
- 09f81dd74: GraphQL v16 compability

### Patch Changes

- Updated dependencies [09f81dd74]
- Updated dependencies [09f81dd74]
  - @graphql-mesh/types@0.54.0
  - @graphql-mesh/utils@0.20.0

## 0.24.1

### Patch Changes

- Updated dependencies [0dc08e5cc]
  - @graphql-mesh/utils@0.19.0

## 0.24.0

### Minor Changes

- eb3f68e4d: feat(grpc): more debugging logs

## 0.23.1

### Patch Changes

- Updated dependencies [6f57be0c1]
  - @graphql-mesh/types@0.53.0
  - @graphql-mesh/utils@0.18.1

## 0.23.0

### Minor Changes

- 4ec7a14ba: enhance: memoize parse/print document node
- 811960cdc: feat(runtime): use factory functions for debug messages

### Patch Changes

- Updated dependencies [4ec7a14ba]
- Updated dependencies [811960cdc]
- Updated dependencies [6f5ffe766]
  - @graphql-mesh/utils@0.18.0
  - @graphql-mesh/types@0.52.0

## 0.22.0

### Minor Changes

- 256abf5f7: enhance: do not use context of orchestrator but internally

### Patch Changes

- Updated dependencies [256abf5f7]
  - @graphql-mesh/types@0.51.0
  - @graphql-mesh/utils@0.17.2

## 0.21.2

### Patch Changes

- Updated dependencies [8c9b709ae]
  - @graphql-mesh/types@0.50.0
  - @graphql-mesh/utils@0.17.1

## 0.21.1

### Patch Changes

- Updated dependencies [7bd145769]
  - @graphql-mesh/utils@0.17.0

## 0.21.0

### Minor Changes

- 4263ed47e: feat(runtime): list errors from all sources

### Patch Changes

- Updated dependencies [472c5887b]
  - @graphql-mesh/utils@0.16.3

## 0.20.2

### Patch Changes

- Updated dependencies [6ce43ddac]
  - @graphql-mesh/types@0.49.0
  - @graphql-mesh/utils@0.16.2

## 0.20.1

### Patch Changes

- Updated dependencies [46a4f7b73]
- Updated dependencies [aa804d043]
- Updated dependencies [67552c8f8]
  - @graphql-mesh/utils@0.16.1
  - @graphql-mesh/types@0.48.0

## 0.20.0

### Minor Changes

- 9eff8a396: enhance(logging): ability to filter debug messages

### Patch Changes

- Updated dependencies [9eff8a396]
  - @graphql-mesh/types@0.47.0
  - @graphql-mesh/utils@0.16.0

## 0.19.1

### Patch Changes

- Updated dependencies [f4f30741d]
  - @graphql-mesh/utils@0.15.0

## 0.19.0

### Minor Changes

- 4545fe72d: Some improvements on additional resolvers;

  - Now you can point to the nested fields in `keyArgs`; e.g. `keysArg: "where.ids"`
  - You don't need `returnType` for abstract types anymore, because it's inferred from the type of
    `targetFieldName`.

### Patch Changes

- Updated dependencies [4545fe72d]
- Updated dependencies [d189b4034]
- Updated dependencies [f23820ed0]
- Updated dependencies [06d688e70]
  - @graphql-mesh/types@0.46.0
  - @graphql-mesh/utils@0.14.0

## 0.18.7

### Patch Changes

- fc51c574d: Dependency updates
- Updated dependencies [fc51c574d]
  - @graphql-mesh/types@0.45.2
  - @graphql-mesh/utils@0.13.7

## 0.18.6

### Patch Changes

- Updated dependencies [1c2667489]
  - @graphql-mesh/types@0.45.1
  - @graphql-mesh/utils@0.13.6

## 0.18.5

### Patch Changes

- Updated dependencies [7080a2f1d]
  - @graphql-mesh/utils@0.13.5

## 0.18.4

### Patch Changes

- cb70939cc: fix(transforms): handle non nullable input variables correctly
- Updated dependencies [6266d1774]
- Updated dependencies [94606e7b9]
- Updated dependencies [2b8dae1cb]
- Updated dependencies [0c97b4b75]
  - @graphql-mesh/types@0.45.0
  - @graphql-mesh/utils@0.13.4

## 0.18.3

### Patch Changes

- Updated dependencies [25d10cc23]
  - @graphql-mesh/types@0.44.2
  - @graphql-mesh/utils@0.13.3

## 0.18.2

### Patch Changes

- 49c8ceb38: fix(core): bump packages to fix variables issue
- Updated dependencies [49c8ceb38]
  - @graphql-mesh/types@0.44.1
  - @graphql-mesh/utils@0.13.2

## 0.18.1

### Patch Changes

- Updated dependencies [1ee417e3d]
  - @graphql-mesh/types@0.44.0
  - @graphql-mesh/utils@0.13.1

## 0.18.0

### Minor Changes

- e5fdcfdcc: fix(config): do not ignore additional resolvers while building artifacts

## 0.17.1

### Patch Changes

- Updated dependencies [885ea439a]
- Updated dependencies [d8051f87d]
- Updated dependencies [d8051f87d]
  - @graphql-mesh/types@0.43.0
  - @graphql-mesh/utils@0.13.0

## 0.17.0

### Minor Changes

- 01cf89298: feat(runtime/config): enable Type Merging

## 0.16.6

### Patch Changes

- Updated dependencies [bdb58dfec]
  - @graphql-mesh/utils@0.12.0

## 0.16.5

### Patch Changes

- Updated dependencies [7d0e33660]
  - @graphql-mesh/utils@0.11.4

## 0.16.4

### Patch Changes

- Updated dependencies [cfb517b3d]
  - @graphql-mesh/types@0.42.0

## 0.16.3

### Patch Changes

- 3c4c51100: enhance(runtime): skip validation on schema delegation
- Updated dependencies [3c4c51100]
  - @graphql-mesh/utils@0.11.3

## 0.16.2

### Patch Changes

- e6acdbd7d: enhance(runtime): do not compose unnecessary resolvers
- Updated dependencies [e6acdbd7d]
  - @graphql-mesh/types@0.41.1
  - @graphql-mesh/utils@0.11.2

## 0.16.1

### Patch Changes

- Updated dependencies [69c89666d]
  - @graphql-mesh/utils@0.11.1

## 0.16.0

### Minor Changes

- 214b7a23c: feat(runtime): Type Merging support

### Patch Changes

- Updated dependencies [214b7a23c]
  - @graphql-mesh/types@0.41.0

## 0.15.0

### Minor Changes

- 1f4655ee6: enhance(runtime): export getMesh result interface

## 0.14.1

### Patch Changes

- Updated dependencies [0d2f7bfcd]
  - @graphql-mesh/types@0.40.0

## 0.14.0

### Minor Changes

- 1caa8ffd3: enhance(runtime): use graphql-jit to improve the performance

### Patch Changes

- Updated dependencies [1caa8ffd3]
  - @graphql-mesh/utils@0.11.0

## 0.13.4

### Patch Changes

- Updated dependencies [6c90e0e39]
  - @graphql-mesh/types@0.39.0

## 0.13.3

### Patch Changes

- f89497389: Use GraphQL JIT for faster GraphQL Executions
- Updated dependencies [346fe9c61]
  - @graphql-mesh/types@0.38.0
  - @graphql-mesh/utils@0.10.0

## 0.13.2

### Patch Changes

- Updated dependencies [4b57f7496]
- Updated dependencies [4b57f7496]
  - @graphql-mesh/types@0.37.0

## 0.13.1

### Patch Changes

- b77148a04: fix(npm-publish): bump all versions to publish again
- Updated dependencies [b77148a04]
  - @graphql-mesh/types@0.36.1
  - @graphql-mesh/utils@0.9.2

## 0.13.0

### Minor Changes

- 634a8a134: feat(config): introduce introspection cache

### Patch Changes

- Updated dependencies [634a8a134]
- Updated dependencies [6b8b23a4e]
- Updated dependencies [2c3312f1a]
- Updated dependencies [d12c7d978]
  - @graphql-mesh/types@0.36.0
  - @graphql-mesh/utils@0.9.1

## 0.12.0

### Minor Changes

- 0b175305a: feat(runtime): add @live directive on demand

## 0.11.9

### Patch Changes

- Updated dependencies [191a663a]
  - @graphql-mesh/types@0.35.1

## 0.11.8

### Patch Changes

- Updated dependencies [b9ca0c30]
  - @graphql-mesh/types@0.35.0
  - @graphql-mesh/utils@0.9.0

## 0.11.7

### Patch Changes

- cf58cd5c: fix(runtime): deduplicate live directive

## 0.11.6

### Patch Changes

- ec89a923: fix(runtime): respect noWrap transforms at source level
- Updated dependencies [ec89a923]
  - @graphql-mesh/utils@0.8.8

## 0.11.5

### Patch Changes

- Updated dependencies [55327fd6]
  - @graphql-mesh/types@0.34.1

## 0.11.4

### Patch Changes

- Updated dependencies [76051dd7]
  - @graphql-mesh/types@0.34.0

## 0.11.3

### Patch Changes

- Updated dependencies [646d6bdb]
  - @graphql-mesh/types@0.33.0

## 0.11.2

### Patch Changes

- Updated dependencies [68d6b117]
  - @graphql-mesh/types@0.32.0

## 0.11.1

### Patch Changes

- Updated dependencies [212f2d66]
  - @graphql-mesh/types@0.31.1

## 0.11.0

### Minor Changes

- 77327988: feat(runtime): Live Queries Support

### Patch Changes

- Updated dependencies [77327988]
  - @graphql-mesh/types@0.31.0

## 0.10.26

### Patch Changes

- Updated dependencies [48f38a4a]
  - @graphql-mesh/types@0.30.1

## 0.10.25

### Patch Changes

- Updated dependencies [938cca26]
  - @graphql-mesh/types@0.30.0

## 0.10.24

### Patch Changes

- Updated dependencies [8ef29de1]
  - @graphql-mesh/types@0.29.4

## 0.10.23

### Patch Changes

- a02d86c3: fix(runtime): patch graphql-compose schemas to support @defer and @stream
- Updated dependencies [a02d86c3]
- Updated dependencies [a02d86c3]
- Updated dependencies [a02d86c3]
  - @graphql-mesh/types@0.29.3

## 0.10.22

### Patch Changes

- Updated dependencies [69d2198d]
  - @graphql-mesh/utils@0.8.7

## 0.10.21

### Patch Changes

- bf6c517d: fix(runtime): mutate incoming context object instead of creating a new one

## 0.10.20

### Patch Changes

- Updated dependencies [8e8848e1]
  - @graphql-mesh/types@0.29.2

## 0.10.19

### Patch Changes

- Updated dependencies [7e970f09]
  - @graphql-mesh/utils@0.8.6

## 0.10.18

### Patch Changes

- Updated dependencies [e8994875]
  - @graphql-mesh/types@0.29.1

## 0.10.17

### Patch Changes

- Updated dependencies [8d345721]
  - @graphql-mesh/utils@0.8.5

## 0.10.16

### Patch Changes

- c767df01: fix(fs): fix fs handling issues for non Node environments
- Updated dependencies [c767df01]
- Updated dependencies [183cfa96]
- Updated dependencies [b3d7ecbf]
  - @graphql-mesh/types@0.29.0
  - @graphql-mesh/utils@0.8.4

## 0.10.15

### Patch Changes

- Updated dependencies [a22fc6f3]
  - @graphql-mesh/types@0.28.0

## 0.10.14

### Patch Changes

- Updated dependencies [c1de3e43]
  - @graphql-mesh/types@0.27.0

## 0.10.13

### Patch Changes

- Updated dependencies [75f6dff9]
- Updated dependencies [c4f207a7]
  - @graphql-mesh/types@0.26.0

## 0.10.12

### Patch Changes

- Updated dependencies [0df817d0]
  - @graphql-mesh/types@0.25.0

## 0.10.11

### Patch Changes

- Updated dependencies [08c2966e]
  - @graphql-mesh/utils@0.8.3

## 0.10.10

### Patch Changes

- Updated dependencies [b6262481]
  - @graphql-mesh/types@0.24.0

## 0.10.9

### Patch Changes

- Updated dependencies [e5b38574]
  - @graphql-mesh/types@0.23.3

## 0.10.8

### Patch Changes

- Updated dependencies [c85a54eb]
  - @graphql-mesh/utils@0.8.2

## 0.10.7

### Patch Changes

- Updated dependencies [c614e796]
  - @graphql-mesh/types@0.23.2

## 0.10.6

### Patch Changes

- Updated dependencies [59d77fb8]
  - @graphql-mesh/types@0.23.1

## 0.10.5

### Patch Changes

- Updated dependencies [e5cd44f5]
  - @graphql-mesh/types@0.23.0

## 0.10.4

### Patch Changes

- Updated dependencies [2fd59a83]
  - @graphql-mesh/types@0.22.0

## 0.10.3

### Patch Changes

- Updated dependencies [c064e3a8]
  - @graphql-mesh/types@0.21.1
  - @graphql-mesh/utils@0.8.1

## 0.10.2

### Patch Changes

- 1f0b2f1f: fix(stitching): fix stitching resolvers issue
- Updated dependencies [03f41cd0]
  - @graphql-mesh/types@0.21.0

## 0.10.1

### Patch Changes

- Updated dependencies [1e7fd602]
  - @graphql-mesh/types@0.20.1

## 0.10.0

### Minor Changes

- 2d14fcc3: bump graphql-tools to v7

### Patch Changes

- Updated dependencies [2d14fcc3]
- Updated dependencies [2d14fcc3]
  - @graphql-mesh/types@0.20.0
  - @graphql-mesh/utils@0.8.0

## 0.9.0

### Minor Changes

- c9a272f7: split api in apiQuery, apiMutation, apiSubscription

## 0.8.0

### Minor Changes

- c1b073de: feat(runtime): support TypedDocumentNode

### Patch Changes

- Updated dependencies [c1b073de]
  - @graphql-mesh/types@0.19.0
  - @graphql-mesh/utils@0.7.0

## 0.7.15

### Patch Changes

- Updated dependencies [5628fb14]
  - @graphql-mesh/types@0.18.0

## 0.7.14

### Patch Changes

- Updated dependencies [0560e806]
  - @graphql-mesh/types@0.17.1

## 0.7.13

### Patch Changes

- Updated dependencies [c26c8c56]
  - @graphql-mesh/types@0.17.0

## 0.7.12

### Patch Changes

- Updated dependencies [3770af72]
  - @graphql-mesh/types@0.16.1

## 0.7.11

### Patch Changes

- Updated dependencies [3ee10180]
  - @graphql-mesh/types@0.16.0

## 0.7.10

### Patch Changes

- Updated dependencies [0f17c58c]
  - @graphql-mesh/types@0.15.0

## 0.7.9

### Patch Changes

- Updated dependencies [937c87d2]
  - @graphql-mesh/types@0.14.1

## 0.7.8

### Patch Changes

- f6dae19b: fix(runtime): map schemas to rawSources correctly

## 0.7.7

### Patch Changes

- bd26407b: fix(runtime): apply transforms correctly in source level

## 0.7.6

### Patch Changes

- Updated dependencies [1e0445ee]
  - @graphql-mesh/types@0.14.0

## 0.7.5

### Patch Changes

- Updated dependencies [b50a68e3]
  - @graphql-mesh/types@0.13.0

## 0.7.4

### Patch Changes

- 3b658014: fix(runtime): prefer same operation type during stitching
- Updated dependencies [e2b34219]
- Updated dependencies [9a7a55c4]
  - @graphql-mesh/types@0.12.0
  - @graphql-mesh/utils@0.6.0

## 0.7.3

### Patch Changes

- a3b42cfd: fix(runtime): handle transforms correctly for single source
- Updated dependencies [2dedda3c]
- Updated dependencies [a3b42cfd]
  - @graphql-mesh/types@0.11.3
  - @graphql-mesh/utils@0.5.4

## 0.7.2

### Patch Changes

- Updated dependencies [6d624576]
  - @graphql-mesh/types@0.11.2

## 0.7.1

### Patch Changes

- Updated dependencies [405cec23]
  - @graphql-mesh/types@0.11.1

## 0.7.0

### Minor Changes

- 48d89de2: feat(runtime): replace hooks with pubsub logic

### Patch Changes

- 2e7d4fb0: fix(runtime): apply noWrap transforms
- Updated dependencies [48d89de2]
  - @graphql-mesh/types@0.11.0

## 0.6.5

### Patch Changes

- Updated dependencies [79adf4b6]
- Updated dependencies [79adf4b6]
  - @graphql-mesh/utils@0.5.3
  - @graphql-mesh/types@0.10.0

## 0.6.4

### Patch Changes

- Updated dependencies [2d5cc25b]
  - @graphql-mesh/types@0.9.2

## 0.6.3

### Patch Changes

- Updated dependencies [93ad5255]
  - @graphql-mesh/types@0.9.1

## 0.6.2

### Patch Changes

- 9900d2fa: fix(runtime): handle noWrap transforms correctly
- Updated dependencies [9900d2fa]
- Updated dependencies [9900d2fa]
  - @graphql-mesh/utils@0.5.2

## 0.6.1

### Patch Changes

- Updated dependencies [c8d9695e]
- Updated dependencies [8f53be10]
  - @graphql-mesh/types@0.9.0
  - @graphql-mesh/utils@0.5.1

## 0.6.0

### Minor Changes

- 6aef18be: refactor(runtime): do not configure handler and transforms

### Patch Changes

- Updated dependencies [d2e56567]
  - @graphql-mesh/types@0.8.1

## 0.5.0

### Minor Changes

- a789c312: feat(stitching): use batch execution

### Patch Changes

- Updated dependencies [a789c312]
  - @graphql-mesh/types@0.8.0
  - @graphql-mesh/utils@0.5.0

## 0.4.0

### Minor Changes

- 718e7a16: fix(runtime): fix browser support

### Patch Changes

- Updated dependencies [718e7a16]
  - @graphql-mesh/types@0.7.0
  - @graphql-mesh/utils@0.4.0

## 0.3.2

### Patch Changes

- Updated dependencies [5067ac73]
- Updated dependencies [a76d74bb]
  - @graphql-mesh/types@0.6.0

## 0.3.1

### Patch Changes

- dde7878b: fix(runtime): handle empty arrays
- Updated dependencies [dde7878b]
  - @graphql-mesh/types@0.5.1

## 0.3.0

### Minor Changes

- 705c4626: introduce an independent config package

### Patch Changes

- Updated dependencies [705c4626]
  - @graphql-mesh/types@0.5.0
  - @graphql-mesh/utils@0.3.0

## 0.2.19

### Patch Changes

- Updated dependencies [854dc550]
- Updated dependencies [6f21094b]
  - @graphql-mesh/types@0.4.0
  - @graphql-mesh/cache-inmemory-lru@0.2.19
  - @graphql-mesh/merger-stitching@0.2.18

## 0.2.18

### Patch Changes

- f650cd2f: fix(cache) handle default cache as inmemory-lru
- Updated dependencies [f650cd2f]
  - @graphql-mesh/cache-inmemory-lru@0.2.18

## 0.2.17

### Patch Changes

- 3c131332: feat(cache): introduce new caching strategy localforage
- Updated dependencies [3c131332]
  - @graphql-mesh/types@0.3.1
  - @graphql-mesh/cache-inmemory-lru@0.2.17
  - @graphql-mesh/merger-stitching@0.2.17

## 0.2.16

### Patch Changes

- 16ab2aa5: fix(runtime): handle non query operations in proxy sdk
- Updated dependencies [ccede377]
  - @graphql-mesh/types@0.3.0
  - @graphql-mesh/cache-inmemory-lru@0.2.16
  - @graphql-mesh/merger-stitching@0.2.16
