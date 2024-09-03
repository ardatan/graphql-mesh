# @graphql-mesh/plugin-hive

## 0.102.6

### Patch Changes

- [#7607](https://github.com/ardatan/graphql-mesh/pull/7607)
  [`379c9cf`](https://github.com/ardatan/graphql-mesh/commit/379c9cf2c6c958d5d1615c953137204ddcf3e7bc)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/yoga@^0.38.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/yoga/v/0.38.0)
    (from `^0.37.0`, in `dependencies`)

## 0.102.5

### Patch Changes

- Updated dependencies
  [[`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d)]:
  - @graphql-mesh/utils@0.102.5
  - @graphql-mesh/types@0.102.5

## 0.102.4

### Patch Changes

- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/types@0.102.4
  - @graphql-mesh/utils@0.102.4

## 0.102.3

### Patch Changes

- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)]:
  - @graphql-mesh/types@0.102.3
  - @graphql-mesh/utils@0.102.3

## 0.102.2

### Patch Changes

- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/utils@0.102.2
  - @graphql-mesh/types@0.102.2

## 0.102.1

### Patch Changes

- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de)]:
  - @graphql-mesh/utils@0.102.1
  - @graphql-mesh/types@0.102.1

## 0.102.0

### Minor Changes

- [#7530](https://github.com/ardatan/graphql-mesh/pull/7530)
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Support Hive's experimental persisted
  documents

  ```ts
  import { useMeshHive } from '@graphql-mesh/plugin-hive'

  // Usage Reporting
  useMeshHive({
    token: '<hive_registry_token>'
  })

  // Persisted Documents
  useMeshHive({
    experimental__persistedDocuments: {
      cdn: {
        endpoint: 'https://cdn.graphql-hive.com/<target_id>',
        accessToken: '<cdn_access_token>'
      }
    }
  })

  // Usage Reporting and Persisted Documents
  useMeshHive({
    token: '<hive_registry_token>',
    experimental__persistedDocuments: {
      cdn: {
        endpoint: 'https://cdn.graphql-hive.com/<target_id>',
        accessToken: '<cdn_access_token>'
      }
    }
  })
  ```

### Patch Changes

- [#7540](https://github.com/ardatan/graphql-mesh/pull/7540)
  [`86acf63`](https://github.com/ardatan/graphql-mesh/commit/86acf6382b15e00fde87b718e84bb86e682621a8)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-hive/core@^0.8.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/core/v/0.8.0)
    (from `^0.7.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-hive/yoga@^0.37.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/yoga/v/0.37.0)
    (from `^0.36.0`, in `dependencies`)

- [#7530](https://github.com/ardatan/graphql-mesh/pull/7530)
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Support truthy DEBUG environment variables
  (1, t, true, y, yes)

- Updated dependencies
  [[`13fa835`](https://github.com/ardatan/graphql-mesh/commit/13fa835036c3671305fc831fa236f110c33d9965),
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)]:
  - @graphql-mesh/string-interpolation@0.5.6
  - @graphql-mesh/types@0.102.0
  - @graphql-mesh/utils@0.102.0

## 0.101.0

### Patch Changes

- [#7498](https://github.com/ardatan/graphql-mesh/pull/7498)
  [`1a9746f`](https://github.com/ardatan/graphql-mesh/commit/1a9746f6ca9b517230a0337d5a852bf05707303a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-hive/core@^0.7.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/core/v/0.7.0)
    (from `^0.6.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-hive/yoga@^0.35.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/yoga/v/0.35.0)
    (from `^0.34.0`, in `dependencies`)

- [#7500](https://github.com/ardatan/graphql-mesh/pull/7500)
  [`1d24997`](https://github.com/ardatan/graphql-mesh/commit/1d249977bbc1180f15ea0e11eece6cce1e8f2de1)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-hive/core@^0.7.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/core/v/0.7.0)
    (from `^0.6.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-hive/yoga@^0.35.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/yoga/v/0.35.0)
    (from `^0.34.0`, in `dependencies`)

- [#7502](https://github.com/ardatan/graphql-mesh/pull/7502)
  [`ace0a65`](https://github.com/ardatan/graphql-mesh/commit/ace0a650f9543ad977182414e16f581d59a2f3ef)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-hive/yoga@^0.36.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/yoga/v/0.36.0)
    (from `^0.35.0`, in `dependencies`)

- [#7469](https://github.com/ardatan/graphql-mesh/pull/7469)
  [`e509a25`](https://github.com/ardatan/graphql-mesh/commit/e509a259d3080db1300c9f38ae149f648fc9159f)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Warn when the plugin is disabled and inform
  when enabled

- Updated dependencies
  [[`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)]:
  - @graphql-mesh/cross-helpers@0.4.6
  - @graphql-mesh/types@0.101.0
  - @graphql-mesh/utils@0.101.0

## 0.100.0

### Patch Changes

- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7),
  [`4d1eb28`](https://github.com/ardatan/graphql-mesh/commit/4d1eb285c2b703c5f80473ad0f316004306fac7f),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7)]:
  - @graphql-mesh/cross-helpers@0.4.5
  - @graphql-mesh/types@0.100.0
  - @graphql-mesh/utils@0.100.0

## 0.99.7

### Patch Changes

- Updated dependencies
  [[`a1bfc49`](https://github.com/ardatan/graphql-mesh/commit/a1bfc492ac3378f22b79a51824407e776b496a84)]:
  - @graphql-mesh/types@0.99.7
  - @graphql-mesh/utils@0.99.7

## 0.99.6

### Patch Changes

- [#7448](https://github.com/ardatan/graphql-mesh/pull/7448)
  [`2041e8d`](https://github.com/ardatan/graphql-mesh/commit/2041e8dafcae602aed96e51f4e9ab38113c3ccde)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/core@^0.6.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/core/v/0.6.0)
    (from `^0.5.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-hive/yoga@^0.34.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/yoga/v/0.34.0)
    (from `^0.33.3`, in `dependencies`)
- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/types@0.99.6
  - @graphql-mesh/utils@0.99.6

## 0.99.5

### Patch Changes

- [#7401](https://github.com/ardatan/graphql-mesh/pull/7401)
  [`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/utils@^0.99.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.99.4)
    (to `peerDependencies`)
- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/utils@0.99.5
  - @graphql-mesh/types@0.99.5

## 0.99.4

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.99.4

## 0.99.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.99.3

## 0.99.2

### Patch Changes

- Updated dependencies
  [[`b01f3ea`](https://github.com/ardatan/graphql-mesh/commit/b01f3eabdc42d8905e8d586a4845e8394c094033),
  [`0bdc18d`](https://github.com/ardatan/graphql-mesh/commit/0bdc18df3d150a61abf987b8829934ed4ca02eed),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e)]:
  - @graphql-mesh/string-interpolation@0.5.5
  - @graphql-mesh/types@0.99.2

## 0.99.1

### Patch Changes

- [#7300](https://github.com/ardatan/graphql-mesh/pull/7300)
  [`db05fc3`](https://github.com/ardatan/graphql-mesh/commit/db05fc3d3205ac8e2730099cf453a7a113a5d770)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency
    [`@graphql-hive/core@^0.5.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/core/v/0.5.0) (to
    `dependencies`)
  - Added dependency
    [`@graphql-hive/yoga@^0.33.3` ↗︎](https://www.npmjs.com/package/@graphql-hive/yoga/v/0.33.3)
    (to `dependencies`)
  - Removed dependency
    [`@graphql-hive/client@^0.32.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.32.0)
    (from `dependencies`)

- [#7300](https://github.com/ardatan/graphql-mesh/pull/7300)
  [`db05fc3`](https://github.com/ardatan/graphql-mesh/commit/db05fc3d3205ac8e2730099cf453a7a113a5d770)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Upgrade Hive SDK to use latest

- Updated dependencies
  [[`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)]:
  - @graphql-mesh/types@0.99.1

## 0.99.0

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.99.0

## 0.98.12

### Patch Changes

- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)]:
  - @graphql-mesh/cross-helpers@0.4.4
  - @graphql-mesh/types@0.98.10

## 0.98.11

### Patch Changes

- [`a7e8a9c`](https://github.com/ardatan/graphql-mesh/commit/a7e8a9cea8ef31c0418bc0ad2c5d536b75eebab0)
  Thanks [@ardatan](https://github.com/ardatan)! - Enable usage reporting by default, and configure
  the agent

## 0.98.10

### Patch Changes

- [`d68c464`](https://github.com/ardatan/graphql-mesh/commit/d68c4642c9993c37a48004fc0d1f0574f557ca43)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix Hive integration

## 0.98.9

### Patch Changes

- [#7145](https://github.com/ardatan/graphql-mesh/pull/7145)
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency
    [`@graphql-mesh/utils@^0.98.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.98.8)
    (from `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/types@0.98.9

## 0.98.8

### Patch Changes

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

## 0.98.7

### Patch Changes

- [#7069](https://github.com/ardatan/graphql-mesh/pull/7069)
  [`c5ab899`](https://github.com/ardatan/graphql-mesh/commit/c5ab89992628b2a588dc227d3400ed2b3784cc7d)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not hook into `terminate` events of Node.js,
  because Mesh handles it already

  Hooking into those events cause a memory leak because plugins are initialized on each polling
  iteration in legacy Mesh CLI/Runtime

- Updated dependencies []:
  - @graphql-mesh/types@0.98.7
  - @graphql-mesh/utils@0.98.7

## 0.98.6

### Patch Changes

- Updated dependencies
  [[`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/cross-helpers@0.4.3
  - @graphql-mesh/types@0.98.6
  - @graphql-mesh/utils@0.98.6

## 0.98.5

### Patch Changes

- Updated dependencies
  [[`c4d2249`](https://github.com/ardatan/graphql-mesh/commit/c4d22497b4249f9a0969e1d01efbe0721774ce73)]:
  - @graphql-mesh/utils@0.98.5
  - @graphql-mesh/types@0.98.5

## 0.98.4

### Patch Changes

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @graphql-mesh/types@0.98.4
  - @graphql-mesh/utils@0.98.4

## 0.98.3

### Patch Changes

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @graphql-mesh/types@0.98.3
  - @graphql-mesh/utils@0.98.3

## 0.98.2

### Patch Changes

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/cross-helpers@0.4.2
  - @graphql-mesh/types@0.98.2
  - @graphql-mesh/utils@0.98.2

## 0.98.1

### Patch Changes

- Updated dependencies
  [[`3d88cb8`](https://github.com/ardatan/graphql-mesh/commit/3d88cb8ff1829081411fcb2051ad18d7f89536ba),
  [`6044b7f`](https://github.com/ardatan/graphql-mesh/commit/6044b7f8bd72ee3d4460d9f09f303ea6fc4e007b)]:
  - @graphql-mesh/string-interpolation@0.5.4
  - @graphql-mesh/types@0.98.1
  - @graphql-mesh/utils@0.98.1

## 0.98.0

### Patch Changes

- [#6845](https://github.com/ardatan/graphql-mesh/pull/6845)
  [`d793807`](https://github.com/ardatan/graphql-mesh/commit/d793807f43ece9bf797f1b9fc9252ab959753492)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-hive/client@^0.31.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.31.0)
    (from `^0.30.0`, in `dependencies`)

- [#6880](https://github.com/ardatan/graphql-mesh/pull/6880)
  [`4e658c6`](https://github.com/ardatan/graphql-mesh/commit/4e658c6245527f79d08451a39eb6511efc97c772)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@^0.32.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.32.0)
    (from `^0.31.0`, in `dependencies`)
- Updated dependencies
  [[`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)]:
  - @graphql-mesh/types@0.98.0
  - @graphql-mesh/utils@0.98.0

## 0.97.7

### Patch Changes

- [#6739](https://github.com/ardatan/graphql-mesh/pull/6739)
  [`674c720`](https://github.com/ardatan/graphql-mesh/commit/674c720a87565ac8c313c27b17bf0846ee689193)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@^0.30.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.30.0)
    (from `^0.29.0`, in `dependencies`)

## 0.97.6

### Patch Changes

- Updated dependencies
  [[`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)]:
  - @graphql-mesh/types@0.97.5
  - @graphql-mesh/utils@0.97.5

## 0.97.5

### Patch Changes

- [#6675](https://github.com/ardatan/graphql-mesh/pull/6675)
  [`800a7fc`](https://github.com/ardatan/graphql-mesh/commit/800a7fc788435b57aa1cf3bb619cd8cb7366f394)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-hive/client@^0.29.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.29.0)
    (from `^0.28.0`, in `dependencies`)

- [`e9d97e3`](https://github.com/ardatan/graphql-mesh/commit/e9d97e38f6b2765fd3c7acd6d4a1f1c2531c264e)
  Thanks [@ardatan](https://github.com/ardatan)! - Enable autoDispose for Hive client instances

## 0.97.4

### Patch Changes

- [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f)
  Thanks [@ardatan](https://github.com/ardatan)! - Terminate handler registry

- [`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)
  Thanks [@ardatan](https://github.com/ardatan)! - Update types in Hive plugin

- Updated dependencies
  [[`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)]:
  - @graphql-mesh/utils@0.97.4
  - @graphql-mesh/types@0.97.4

## 0.97.3

### Patch Changes

- Updated dependencies
  [[`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)]:
  - @graphql-mesh/types@0.97.3

## 0.97.2

### Patch Changes

- Updated dependencies
  [[`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)]:
  - @graphql-mesh/types@0.97.2

## 0.97.1

### Patch Changes

- Updated dependencies
  [[`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)]:
  - @graphql-mesh/types@0.97.1

## 0.97.0

### Patch Changes

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a)]:
  - @graphql-mesh/types@0.97.0

## 0.96.8

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.96.6

## 0.96.7

### Patch Changes

- Updated dependencies
  [[`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)]:
  - @graphql-mesh/types@0.96.5

## 0.96.6

### Patch Changes

- Updated dependencies
  [[`ae7b085`](https://github.com/ardatan/graphql-mesh/commit/ae7b085e93ba911f03bbfd2a15ff9ca8be9f4de8)]:
  - @graphql-mesh/types@0.96.4

## 0.96.5

### Patch Changes

- Updated dependencies
  [[`ac26793`](https://github.com/ardatan/graphql-mesh/commit/ac26793e59f76f0839b61a8030e0eefc7383e640)]:
  - @graphql-mesh/types@0.96.3

## 0.96.4

### Patch Changes

- [#6366](https://github.com/ardatan/graphql-mesh/pull/6366)
  [`1bb2023`](https://github.com/ardatan/graphql-mesh/commit/1bb20238cf87b8dc5f4c124015c0bebf43204e2d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@^0.28.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.28.0)
    (from `^0.27.0`, in `dependencies`)

## 0.96.3

### Patch Changes

- [#6328](https://github.com/ardatan/graphql-mesh/pull/6328)
  [`03f5566`](https://github.com/ardatan/graphql-mesh/commit/03f55664cebd98119699cbe6c03833a5f2348714)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@^0.27.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.27.0)
    (from `^0.26.0`, in `dependencies`)
- Updated dependencies
  [[`d758afa`](https://github.com/ardatan/graphql-mesh/commit/d758afa7da55cf3ed6b4ed9e8cccfd0ed67fe658),
  [`4fac014`](https://github.com/ardatan/graphql-mesh/commit/4fac01400544bc6e8b2a4ae55f1a4dd4771bbc5c)]:
  - @graphql-mesh/types@0.96.2

## 0.96.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.96.1

## 0.96.1

### Patch Changes

- [#6239](https://github.com/ardatan/graphql-mesh/pull/6239)
  [`95c340bed`](https://github.com/ardatan/graphql-mesh/commit/95c340bed250f397a919e1db9cbce2a04575eb69)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-hive/client@^0.25.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.25.0)
    (from `^0.24.3`, in `dependencies`)

- [#6243](https://github.com/ardatan/graphql-mesh/pull/6243)
  [`b88df4e7e`](https://github.com/ardatan/graphql-mesh/commit/b88df4e7efcf1026692e16e113cc2664d6d4ed95)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@^0.26.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.26.0)
    (from `^0.25.0`, in `dependencies`)

## 0.96.0

### Patch Changes

- Updated dependencies
  [[`5c6a8f784`](https://github.com/ardatan/graphql-mesh/commit/5c6a8f784a787641b90349e584b49de629cc41ff)]:
  - @graphql-mesh/types@0.96.0

## 0.95.10

### Patch Changes

- Updated dependencies
  [[`b4d38c55d`](https://github.com/ardatan/graphql-mesh/commit/b4d38c55df8c4d2aeb98325555979eb09d065906)]:
  - @graphql-mesh/string-interpolation@0.5.3
  - @graphql-mesh/types@0.95.8

## 0.95.9

### Patch Changes

- [#6063](https://github.com/Urigo/graphql-mesh/pull/6063)
  [`888661506`](https://github.com/Urigo/graphql-mesh/commit/8886615066abeeae3669f9f7a0a4fa0b971b05f3)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@0.24.3` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.24.3)
    (from `0.24.2`, in `dependencies`)

## 0.95.8

### Patch Changes

- Updated dependencies
  [[`a13969c77`](https://github.com/Urigo/graphql-mesh/commit/a13969c77794c44493d7a9426be7e38a6d673c88)]:
  - @graphql-mesh/types@0.95.7

## 0.95.7

### Patch Changes

- [#6023](https://github.com/Urigo/graphql-mesh/pull/6023)
  [`682280c66`](https://github.com/Urigo/graphql-mesh/commit/682280c66c1cbd3bf54f64b3c2b1bd25b1fe20f2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@0.24.2` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.24.2)
    (from `0.24.1`, in `dependencies`)

## 0.95.6

### Patch Changes

- Updated dependencies
  [[`8e1056cf9`](https://github.com/Urigo/graphql-mesh/commit/8e1056cf91b0e7069499f5102aaed163a0168597)]:
  - @graphql-mesh/string-interpolation@0.5.2
  - @graphql-mesh/types@0.95.6

## 0.95.5

### Patch Changes

- Updated dependencies
  [[`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781),
  [`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781)]:
  - @graphql-mesh/cross-helpers@0.4.1
  - @graphql-mesh/types@0.95.5

## 0.95.4

### Patch Changes

- Updated dependencies
  [[`625e5d787`](https://github.com/Urigo/graphql-mesh/commit/625e5d7878d44abd7c9d1542bf5cdcd4e37e2411)]:
  - @graphql-mesh/types@0.95.4

## 0.95.3

### Patch Changes

- Updated dependencies
  [[`33ae7a89a`](https://github.com/Urigo/graphql-mesh/commit/33ae7a89a13f40ebbe0a01620e378fe4a914df7f)]:
  - @graphql-mesh/types@0.95.3

## 0.95.2

### Patch Changes

- Updated dependencies
  [[`d8da4b282`](https://github.com/Urigo/graphql-mesh/commit/d8da4b282ab15ab6d0ea24c78c172e31fa1170ea)]:
  - @graphql-mesh/types@0.95.2

## 0.95.1

### Patch Changes

- Updated dependencies
  [[`7cdc69e04`](https://github.com/Urigo/graphql-mesh/commit/7cdc69e0454ab99ea5c3b8072ac28da8f81a8796)]:
  - @graphql-mesh/types@0.95.1

## 0.95.0

### Minor Changes

- [#5749](https://github.com/Urigo/graphql-mesh/pull/5749)
  [`bb50c4f94`](https://github.com/Urigo/graphql-mesh/commit/bb50c4f941caa59d69186d1415dce5773596e8bc)
  Thanks [@ardatan](https://github.com/ardatan)! - `enabled` flag to enable/disable Hive Client

### Patch Changes

- Updated dependencies
  [[`bb50c4f94`](https://github.com/Urigo/graphql-mesh/commit/bb50c4f941caa59d69186d1415dce5773596e8bc)]:
  - @graphql-mesh/types@0.95.0

## 0.94.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.94.6

## 0.94.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.94.5

## 0.94.4

### Patch Changes

- [#5674](https://github.com/Urigo/graphql-mesh/pull/5674)
  [`4772ce518`](https://github.com/Urigo/graphql-mesh/commit/4772ce5184078445d81a297c1484fce747c08724)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@0.24.1` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.24.1)
    (from `0.24.0`, in `dependencies`)
- Updated dependencies
  [[`ff1678eea`](https://github.com/Urigo/graphql-mesh/commit/ff1678eeabec67edaa4991b938ef81437cd9361e)]:
  - @graphql-mesh/types@0.94.4

## 0.94.3

### Patch Changes

- [#5626](https://github.com/Urigo/graphql-mesh/pull/5626)
  [`fba66c6fc`](https://github.com/Urigo/graphql-mesh/commit/fba66c6fc7a0ca15393df8ae5382d97eb0ae8fcf)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@0.24.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.24.0)
    (from `0.23.1`, in `dependencies`)
- Updated dependencies
  [[`fba66c6fc`](https://github.com/Urigo/graphql-mesh/commit/fba66c6fc7a0ca15393df8ae5382d97eb0ae8fcf)]:
  - @graphql-mesh/string-interpolation@0.5.1
  - @graphql-mesh/types@0.94.3

## 0.94.2

### Patch Changes

- Updated dependencies
  [[`d0d4917f4`](https://github.com/Urigo/graphql-mesh/commit/d0d4917f405d7d6acfba62abef38909e1398ce7c)]:
  - @graphql-mesh/types@0.94.2

## 0.94.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.94.1

## 0.94.0

### Minor Changes

- [#5449](https://github.com/Urigo/graphql-mesh/pull/5449)
  [`ef520d91e`](https://github.com/Urigo/graphql-mesh/commit/ef520d91e6d1800ed63ef016ed74084261788371)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support and require Node 16 or
  higher

### Patch Changes

- Updated dependencies
  [[`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`3d9218360`](https://github.com/Urigo/graphql-mesh/commit/3d9218360dff838b9d3c731c92b3b6e8ad52e2c7),
  [`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`01fb0cc85`](https://github.com/Urigo/graphql-mesh/commit/01fb0cc858dfbf2cd931d1b08b0749a0b82b232c),
  [`ef520d91e`](https://github.com/Urigo/graphql-mesh/commit/ef520d91e6d1800ed63ef016ed74084261788371)]:
  - @graphql-mesh/cross-helpers@0.4.0
  - @graphql-mesh/string-interpolation@0.5.0
  - @graphql-mesh/types@0.94.0

## 0.93.1

### Patch Changes

- [#5365](https://github.com/Urigo/graphql-mesh/pull/5365)
  [`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/types@^0.93.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.93.0)
    (from `^1.0.0`, in `peerDependencies`)
- Updated dependencies
  [[`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8)]:
  - @graphql-mesh/types@0.93.1

## 1.0.0

### Patch Changes

- Updated dependencies
  [[`cff645677`](https://github.com/Urigo/graphql-mesh/commit/cff645677c680e248ed718e5bb98ece5a41f9c0f),
  [`72fe781c1`](https://github.com/Urigo/graphql-mesh/commit/72fe781c15f20ad2af792b8245aedfdcc742e048),
  [`a597261db`](https://github.com/Urigo/graphql-mesh/commit/a597261dbb4f18c47bf7323695e853950ae500df)]:
  - @graphql-mesh/types@1.0.0

## 0.1.11

### Patch Changes

- Updated dependencies
  [[`870de5dae`](https://github.com/Urigo/graphql-mesh/commit/870de5dae08a7e43d9aa0f52d5d504cffb4d8fc8),
  [`aea134764`](https://github.com/Urigo/graphql-mesh/commit/aea1347645c322437ed6ccfadabcfc23065bc9c8),
  [`a1e08193b`](https://github.com/Urigo/graphql-mesh/commit/a1e08193be3ac8cab5f6f8c84025f934134369b6),
  [`abc0c8747`](https://github.com/Urigo/graphql-mesh/commit/abc0c8747b274e011f5b8387233fe96d4f702035)]:
  - @graphql-mesh/types@0.91.13
  - @graphql-mesh/string-interpolation@0.4.4

## 0.1.10

### Patch Changes

- [#5252](https://github.com/Urigo/graphql-mesh/pull/5252)
  [`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)
  Thanks [@ardatan](https://github.com/ardatan)! - Make shared packages peer dependency

- Updated dependencies
  [[`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)]:
  - @graphql-mesh/string-interpolation@0.4.3
  - @graphql-mesh/cross-helpers@0.3.4
  - @graphql-mesh/types@0.91.12

## 0.1.9

### Patch Changes

- Updated dependencies
  [[`7e7096695`](https://github.com/Urigo/graphql-mesh/commit/7e709669564fa427332b8af00bc66234485f3d54)]:
  - @graphql-mesh/types@0.91.11

## 0.1.8

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.91.10

## 0.1.7

### Patch Changes

- Updated dependencies
  [[`a272fdbca`](https://github.com/Urigo/graphql-mesh/commit/a272fdbca655b17119fb1dcb1c44498f387b1edc)]:
  - @graphql-mesh/types@0.91.9

## 0.1.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.91.8

## 0.1.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.91.7

## 0.1.4

### Patch Changes

- Updated dependencies
  [[`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391)]:
  - @graphql-mesh/types@0.91.6

## 0.1.3

### Patch Changes

- Updated dependencies
  [[`5c19f8d6f`](https://github.com/Urigo/graphql-mesh/commit/5c19f8d6f79f2d9bfbeb6458c8dc7a1729c37db9)]:
  - @graphql-mesh/types@0.91.5

## 0.1.2

### Patch Changes

- Updated dependencies
  [[`63ab17f0b`](https://github.com/Urigo/graphql-mesh/commit/63ab17f0bd402b5a3923d752ba715f556f3beadd)]:
  - @graphql-mesh/types@0.91.4

## 0.1.1

### Patch Changes

- Updated dependencies
  [[`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e)]:
  - @graphql-mesh/types@0.91.3

## 0.1.0

### Minor Changes

- [`989a47802`](https://github.com/Urigo/graphql-mesh/commit/989a478027b703ab969d529f09bc83071fe4f96f)
  Thanks [@ardatan](https://github.com/ardatan)! - Options for self hosting

### Patch Changes

- Updated dependencies
  [[`975715275`](https://github.com/Urigo/graphql-mesh/commit/9757152751e37062bca4ba114bee65a0c79a3d4d),
  [`989a47802`](https://github.com/Urigo/graphql-mesh/commit/989a478027b703ab969d529f09bc83071fe4f96f)]:
  - @graphql-mesh/cross-helpers@0.3.3
  - @graphql-mesh/types@0.91.2

## 0.0.15

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.91.1

## 0.0.14

### Patch Changes

- [#5091](https://github.com/Urigo/graphql-mesh/pull/5091)
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-hive/client@0.23.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.23.0)
    (from `0.22.0`, in `dependencies`)

- [#5123](https://github.com/Urigo/graphql-mesh/pull/5123)
  [`bbd8f10ce`](https://github.com/Urigo/graphql-mesh/commit/bbd8f10cea58ebf281d0b8caef2f994ad1047ced)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@0.23.1` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.23.1)
    (from `0.23.0`, in `dependencies`)
- Updated dependencies
  [[`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`7e8bb87dd`](https://github.com/Urigo/graphql-mesh/commit/7e8bb87ddf4cb1210db6873334bdd18007cc0552)]:
  - @graphql-mesh/cross-helpers@0.3.2
  - @graphql-mesh/types@0.91.0

## 0.0.13

### Patch Changes

- Updated dependencies
  [[`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72),
  [`bcf29dfd0`](https://github.com/Urigo/graphql-mesh/commit/bcf29dfd02d19cf5c770b83fc627f059569a0fac)]:
  - @graphql-mesh/types@0.90.0

## 0.0.12

### Patch Changes

- Updated dependencies
  [[`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5)]:
  - @graphql-mesh/types@0.89.5

## 0.0.11

### Patch Changes

- [#5049](https://github.com/Urigo/graphql-mesh/pull/5049)
  [`cb7e2c568`](https://github.com/Urigo/graphql-mesh/commit/cb7e2c568dbf027c0023b4a933f5b8f748ac90be)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@0.22.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.22.0)
    (from `0.21.4`, in `dependencies`)

## 0.0.10

### Patch Changes

- [#4930](https://github.com/Urigo/graphql-mesh/pull/4930)
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Prettier fixes

- Updated dependencies
  [[`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664),
  [`fb9113d5b`](https://github.com/Urigo/graphql-mesh/commit/fb9113d5bfc4865d51f9cb1bd3236c7c0c27b170)]:
  - @graphql-mesh/cross-helpers@0.3.1
  - @graphql-mesh/types@0.89.4
  - @graphql-mesh/string-interpolation@0.4.2

## 0.0.9

### Patch Changes

- Updated dependencies
  [[`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9)]:
  - @graphql-mesh/types@0.89.3

## 0.0.8

### Patch Changes

- Updated dependencies
  [[`deb9912e0`](https://github.com/Urigo/graphql-mesh/commit/deb9912e0bc2ae782c9570b60a7224b47af341eb)]:
  - @graphql-mesh/string-interpolation@0.4.1
  - @graphql-mesh/types@0.89.2

## 0.0.7

### Patch Changes

- Updated dependencies
  [[`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43)]:
  - @graphql-mesh/types@0.89.1

## 0.0.6

### Patch Changes

- Updated dependencies
  [[`3edaa00ac`](https://github.com/Urigo/graphql-mesh/commit/3edaa00ac772d519e351e620bfa670514db886e5)]:
  - @graphql-mesh/types@0.89.0

## 0.0.5

### Patch Changes

- Updated dependencies
  [[`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f),
  [`5ed3435b8`](https://github.com/Urigo/graphql-mesh/commit/5ed3435b8fdfd115566ef548f044884628d39211),
  [`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f),
  [`1a28c92c2`](https://github.com/Urigo/graphql-mesh/commit/1a28c92c2d67b89b48581b7bb1414d1404428cdb)]:
  - @graphql-mesh/cross-helpers@0.3.0
  - @graphql-mesh/string-interpolation@0.4.0
  - @graphql-mesh/types@0.88.0

## 0.0.4

### Patch Changes

- [#4869](https://github.com/Urigo/graphql-mesh/pull/4869)
  [`58b6f76bb`](https://github.com/Urigo/graphql-mesh/commit/58b6f76bbf01c3fe61ce8373337847fa88656263)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@0.21.4` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.21.4)
    (from `0.21.3`, in `dependencies`)

## 0.0.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.87.1

## 0.0.2

### Patch Changes

- [#4856](https://github.com/Urigo/graphql-mesh/pull/4856)
  [`8b25eb578`](https://github.com/Urigo/graphql-mesh/commit/8b25eb578c293ef72de70301f2e24dc0c22ba75b)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/client@0.21.3` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.21.3)
    (from `0.21.1`, in `dependencies`)

## 0.0.1

### Patch Changes

- [#4854](https://github.com/Urigo/graphql-mesh/pull/4854)
  [`0d9771428`](https://github.com/Urigo/graphql-mesh/commit/0d97714284a6eea31c2c9420addd4a1518584924)
  Thanks [@ardatan](https://github.com/ardatan)! - New GraphQL Hive plugin

- Updated dependencies
  [[`0d9771428`](https://github.com/Urigo/graphql-mesh/commit/0d97714284a6eea31c2c9420addd4a1518584924),
  [`686b3301b`](https://github.com/Urigo/graphql-mesh/commit/686b3301b2441bc095a379d95e77686b4f5ceb70)]:
  - @graphql-mesh/types@0.87.0
