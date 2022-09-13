# @graphql-mesh/runtime

## 0.44.6

### Patch Changes

- [#4487](https://github.com/Urigo/graphql-mesh/pull/4487) [`39f440e36`](https://github.com/Urigo/graphql-mesh/commit/39f440e36018f98a41a37b5465ea6617c5fc6c7e) Thanks [@ardatan](https://github.com/ardatan)! - - Do not assume scalars' types by using graphql-scalars
  - Create unified executor only once at startup
  - Respect predefined type definitions for scalars in the source types `.mesh/sources/SOURCE_NAME/types.ts` like `BigInt: bigint`
  - Respect introspection fields correctly

## 0.44.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.83.5
  - @graphql-mesh/utils@0.41.10

## 0.44.4

### Patch Changes

- [#4439](https://github.com/Urigo/graphql-mesh/pull/4439) [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2) Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:

  - Updated dependency [`@graphql-mesh/cross-helpers@0.2.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.2.5) (from `0.2.3`, in `dependencies`)
  - Updated dependency [`@graphql-mesh/types@0.83.3` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.83.3) (from `0.82.1`, in `dependencies`)
  - Updated dependency [`@graphql-mesh/utils@0.41.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.41.8) (from `0.41.2`, in `dependencies`)
  - Updated dependency [`@graphql-tools/delegate@9.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.6) (from `9.0.4`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-delegate@8.3.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.9) (from `8.3.7`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-execute@8.5.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.6) (from `8.5.4`, in `dependencies`)
  - Updated dependency [`@graphql-tools/wrap@9.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.0) (from `9.0.5`, in `dependencies`)
  - Updated dependency [`@graphql-tools/utils@8.12.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.12.0) (from `8.10.1`, in `dependencies`)
  - Updated dependency [`fetchache@0.1.4` ↗︎](https://www.npmjs.com/package/fetchache/v/0.1.4) (from `0.1.2`, in `dependencies`)
  - Updated dependency [`@whatwg-node/fetch@0.4.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.4.2) (from `0.3.2`, in `dependencies`)

- [`317f6b454`](https://github.com/Urigo/graphql-mesh/commit/317f6b454db59e351cf6360df5575248cb579dd4) Thanks [@ardatan](https://github.com/ardatan)! - Bump fetch and server packages and avoid using Response.redirect which needs a full path but instead Response with Location header works better

- Updated dependencies [[`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2), [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2), [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2)]:
  - @graphql-mesh/cross-helpers@0.2.6
  - @graphql-mesh/types@0.83.4
  - @graphql-mesh/utils@0.41.9

## 0.44.3

### Patch Changes

- [#4466](https://github.com/Urigo/graphql-mesh/pull/4466) [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/delegate@9.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.6) (from `9.0.5`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-delegate@8.3.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.9) (from `8.3.8`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-execute@8.5.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.6) (from `8.5.5`, in `dependencies`)
  - Updated dependency [`@graphql-tools/wrap@9.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.0) (from `9.0.6`, in `dependencies`)
  - Updated dependency [`@graphql-tools/utils@8.12.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.12.0) (from `8.11.0`, in `dependencies`)

- Updated dependencies [[`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f), [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f), [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f)]:
  - @graphql-mesh/cross-helpers@0.2.5
  - @graphql-mesh/types@0.83.3
  - @graphql-mesh/utils@0.41.8

## 0.44.2

### Patch Changes

- [#4462](https://github.com/Urigo/graphql-mesh/pull/4462) [`d84f81d94`](https://github.com/Urigo/graphql-mesh/commit/d84f81d9487ce228125863b8b283adab75daff19) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`fetchache@0.1.4` ↗︎](https://www.npmjs.com/package/fetchache/v/0.1.4) (from `0.1.3`, in `dependencies`)

- Updated dependencies [[`d84f81d94`](https://github.com/Urigo/graphql-mesh/commit/d84f81d9487ce228125863b8b283adab75daff19)]:
  - @graphql-mesh/utils@0.41.7
  - @graphql-mesh/types@0.83.2

## 0.44.1

### Patch Changes

- [#4453](https://github.com/Urigo/graphql-mesh/pull/4453) [`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`fetchache@0.1.3` ↗︎](https://www.npmjs.com/package/fetchache/v/0.1.3) (from `0.1.2`, in `dependencies`)
  - Updated dependency [`@whatwg-node/fetch@0.4.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.4.2) (from `0.3.2`, in `dependencies`)

- Updated dependencies [[`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8)]:
  - @graphql-mesh/utils@0.41.6
  - @graphql-mesh/types@0.83.1

## 0.44.0

### Minor Changes

- [`44b868196`](https://github.com/Urigo/graphql-mesh/commit/44b86819695a298e60b1d7b6c54ae2772e8f1588) Thanks [@ardatan](https://github.com/ardatan)! - Use In Context SDK for wrapping resolvers for better tracing

### Patch Changes

- [`24afabece`](https://github.com/Urigo/graphql-mesh/commit/24afabece51aee171f902776d3f59b4a17026c49) Thanks [@ardatan](https://github.com/ardatan)! - Enable Automatic Type Merging by default

- Updated dependencies [[`a56ebcec5`](https://github.com/Urigo/graphql-mesh/commit/a56ebcec503402fbdb3d4e3561fd2e38e4dd5c43), [`24afabece`](https://github.com/Urigo/graphql-mesh/commit/24afabece51aee171f902776d3f59b4a17026c49), [`44b868196`](https://github.com/Urigo/graphql-mesh/commit/44b86819695a298e60b1d7b6c54ae2772e8f1588)]:
  - @graphql-mesh/types@0.83.0
  - @graphql-mesh/utils@0.41.5

## 0.43.4

### Patch Changes

- [#4443](https://github.com/Urigo/graphql-mesh/pull/4443) [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/delegate@9.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.5) (from `9.0.4`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-delegate@8.3.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.8) (from `8.3.7`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-execute@8.5.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.5) (from `8.5.4`, in `dependencies`)
  - Updated dependency [`@graphql-tools/wrap@9.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.6) (from `9.0.5`, in `dependencies`)
  - Updated dependency [`@graphql-tools/utils@8.11.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.11.0) (from `8.10.1`, in `dependencies`)

- Updated dependencies [[`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53), [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53), [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53)]:
  - @graphql-mesh/cross-helpers@0.2.4
  - @graphql-mesh/types@0.82.3
  - @graphql-mesh/utils@0.41.4

## 0.43.3

### Patch Changes

- Updated dependencies [[`b9bb80094`](https://github.com/Urigo/graphql-mesh/commit/b9bb8009407d27440267a5e9a7ec5dbfecc9bf8f)]:
  - @graphql-mesh/types@0.82.2
  - @graphql-mesh/utils@0.41.3

## 0.43.2

### Patch Changes

- [#4418](https://github.com/Urigo/graphql-mesh/pull/4418) [`59dbb1985`](https://github.com/Urigo/graphql-mesh/commit/59dbb1985b07a250f0113d70e0f55e467dc17812) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@envelop/core@2.6.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/2.6.0) (from `2.5.0`, in `dependencies`)
  - Updated dependency [`@envelop/extended-validation@1.9.0` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/1.9.0) (from `1.8.0`, in `dependencies`)

- Updated dependencies [[`3165827f7`](https://github.com/Urigo/graphql-mesh/commit/3165827f74b48a914b9604b024cd1318c211aa14)]:
  - @graphql-mesh/types@0.82.1
  - @graphql-mesh/utils@0.41.2

## 0.43.1

### Patch Changes

- Updated dependencies [[`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9), [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9)]:
  - @graphql-mesh/types@0.82.0
  - @graphql-mesh/utils@0.41.1

## 0.43.0

### Minor Changes

- [#4404](https://github.com/Urigo/graphql-mesh/pull/4404) [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f) Thanks [@ardatan](https://github.com/ardatan)! - New `onFetch` hook!

- [#4409](https://github.com/Urigo/graphql-mesh/pull/4409) [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f) Thanks [@ardatan](https://github.com/ardatan)! - New onDelegate hook

### Patch Changes

- [#4380](https://github.com/Urigo/graphql-mesh/pull/4380) [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd) Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:

  - Updated dependency [`@graphql-tools/delegate@9.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.4) (from `9.0.3`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-delegate@8.3.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.7) (from `8.3.6`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-execute@8.5.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.4) (from `8.5.3`, in `dependencies`)
  - Updated dependency [`@graphql-tools/wrap@9.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.5) (from `9.0.4`, in `dependencies`)
  - Updated dependency [`@graphql-tools/utils@8.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.1) (from `8.10.0`, in `dependencies`)

- [#4389](https://github.com/Urigo/graphql-mesh/pull/4389) [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/delegate@9.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.4) (from `9.0.3`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-delegate@8.3.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.7) (from `8.3.6`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-execute@8.5.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.4) (from `8.5.3`, in `dependencies`)
  - Updated dependency [`@graphql-tools/wrap@9.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.5) (from `9.0.4`, in `dependencies`)
  - Updated dependency [`@graphql-tools/utils@8.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.1) (from `8.10.0`, in `dependencies`)

- [#4404](https://github.com/Urigo/graphql-mesh/pull/4404) [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f) Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency [`fetchache@0.1.2` ↗︎](https://www.npmjs.com/package/fetchache/v/0.1.2) (to `dependencies`)
  - Added dependency [`@whatwg-node/fetch@0.3.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.3.2) (to `dependencies`)

- Updated dependencies [[`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`df37c40f4`](https://github.com/Urigo/graphql-mesh/commit/df37c40f47c6c53949f5d5f71e062c09fe5e1bd0), [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f), [`7a4023a2c`](https://github.com/Urigo/graphql-mesh/commit/7a4023a2cac2dacc8e78e10dabee65427b9a5e54), [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f)]:
  - @graphql-mesh/cross-helpers@0.2.3
  - @graphql-mesh/types@0.81.0
  - @graphql-mesh/utils@0.41.0

## 0.42.3

### Patch Changes

- [#4356](https://github.com/Urigo/graphql-mesh/pull/4356) [`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824) Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency [`@graphql-mesh/cross-helpers@0.2.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.2.2) (to `dependencies`)

- Updated dependencies [[`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824), [`be79b20a5`](https://github.com/Urigo/graphql-mesh/commit/be79b20a59b14d5d79bfeb260e4ecabc58c26efb), [`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824)]:
  - @graphql-mesh/utils@0.40.0
  - @graphql-mesh/types@0.80.2

## 0.42.2

### Patch Changes

- Updated dependencies [[`f23e14eba`](https://github.com/Urigo/graphql-mesh/commit/f23e14ebaf7c6a869207edc43b0e2a8114d0d21f)]:
  - @graphql-mesh/utils@0.39.0
  - @graphql-mesh/types@0.80.1

## 0.42.1

### Patch Changes

- [#4344](https://github.com/Urigo/graphql-mesh/pull/4344) [`fd9356d31`](https://github.com/Urigo/graphql-mesh/commit/fd9356d31ace0bc411602a31e419a9091b6c3323) Thanks [@ardatan](https://github.com/ardatan)! - fix(runtime): if there is only one source, respect introspection query even if there is no operationName

- Updated dependencies [[`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319)]:
  - @graphql-mesh/types@0.80.0
  - @graphql-mesh/utils@0.38.1

## 0.42.0

### Minor Changes

- [#4326](https://github.com/Urigo/graphql-mesh/pull/4326) [`209717f0b`](https://github.com/Urigo/graphql-mesh/commit/209717f0b87a56326cfd37fb9f26cb1ccbc47b1a) Thanks [@ardatan](https://github.com/ardatan)! - Enable batching by default when there is a single source, and respect `batch` flag

### Patch Changes

- [#4326](https://github.com/Urigo/graphql-mesh/pull/4326) [`209717f0b`](https://github.com/Urigo/graphql-mesh/commit/209717f0b87a56326cfd37fb9f26cb1ccbc47b1a) Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency [`@graphql-tools/batch-execute@8.5.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.3) (to `dependencies`)

## 0.41.10

### Patch Changes

- [#4314](https://github.com/Urigo/graphql-mesh/pull/4314) [`cbc00748e`](https://github.com/Urigo/graphql-mesh/commit/cbc00748e8538e17e83b1a858947ff6503c6d5c0) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@envelop/core@2.5.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/2.5.0) (from `2.4.2`, in `dependencies`)
  - Updated dependency [`@envelop/extended-validation@1.8.0` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/1.8.0) (from `1.7.2`, in `dependencies`)

- Updated dependencies [[`b162269f7`](https://github.com/Urigo/graphql-mesh/commit/b162269f70a90594962792ffaaa40d3a7ee9f4e4), [`2ad667d96`](https://github.com/Urigo/graphql-mesh/commit/2ad667d964545ed47170cfa4f9393282edc2073b)]:
  - @graphql-mesh/types@0.79.0
  - @graphql-mesh/utils@0.38.0
  - @graphql-mesh/string-interpolation@0.3.2

## 0.41.9

### Patch Changes

- [#4275](https://github.com/Urigo/graphql-mesh/pull/4275) [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/delegate@9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.1) (was `9.0.0`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-delegate@8.3.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.3) (was `8.3.2`, in `dependencies`)
  - Updated dependency [`@graphql-tools/wrap@9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.1) (was `9.0.0`, in `dependencies`)
  - Updated dependency [`@graphql-tools/utils@8.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.0) (was `8.9.1`, in `dependencies`)

* [#4298](https://github.com/Urigo/graphql-mesh/pull/4298) [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/delegate@9.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.3) (was `9.0.1`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-delegate@8.3.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.6) (was `8.3.3`, in `dependencies`)
  - Updated dependency [`@graphql-tools/wrap@9.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.4) (was `9.0.1`, in `dependencies`)

* Updated dependencies [[`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968)]:
  - @graphql-mesh/string-interpolation@0.3.1
  - @graphql-mesh/types@0.78.8
  - @graphql-mesh/utils@0.37.9

## 0.41.8

### Patch Changes

- [#4263](https://github.com/Urigo/graphql-mesh/pull/4263) [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/delegate@9.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.0) (was `8.8.1`, in `dependencies`)
  - Updated dependency [`@graphql-tools/batch-delegate@8.3.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.2) (was `8.3.1`, in `dependencies`)
  - Updated dependency [`@graphql-tools/wrap@9.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.0) (was `8.5.1`, in `dependencies`)
  - Updated dependency [`@graphql-tools/utils@8.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.9.1) (was `8.9.0`, in `dependencies`)

- Updated dependencies [[`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)]:
  - @graphql-mesh/types@0.78.7
  - @graphql-mesh/utils@0.37.8

## 0.41.7

### Patch Changes

- [`760a60483`](https://github.com/Urigo/graphql-mesh/commit/760a60483c2a95a4453b043d97b72c0ee46e5c65) Thanks [@ardatan](https://github.com/ardatan)! - Fix a bug causing the execution args passed to 'execution' ignored in the subsequent envelop plugins

## 0.41.6

### Patch Changes

- Updated dependencies [[`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18), [`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b)]:
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

- 2e89d814b: Now if there is only one error to be thrown, throw it as it is instead of using AggregateError in SDK and handlers
  - @graphql-mesh/types@0.78.1
  - @graphql-mesh/utils@0.37.2

## 0.41.0

### Minor Changes

- bcd9355ee: Breaking change in merger API;

  Before a merger should return a `GraphQLSchema`, not it needs to return `SubschemaConfig` from `@graphql-tools/delegate` package.
  The idea is to prevent the schema from being wrap to reduce the execution complexity.
  Now if merger returns an executor, it will be used directly as an executor inside Envelop's pipeline.
  Also it can return `transforms` which will be applied during execution while schema transforms are applied on build time without any modification in the resolvers.

  If there are some root transforms, those are applied together with the source transforms on the execution level in case of a single source.

### Patch Changes

- Updated dependencies [6e6fd4ab7]
- Updated dependencies [bcd9355ee]
  - @graphql-mesh/utils@0.37.1
  - @graphql-mesh/types@0.78.0

## 0.40.0

### Minor Changes

- 0401c7617: **Improvements on string interpolation ({env.sth} or {context.headers.sth}) for different environments**

  As we mention in most of our docs, we usually expect a key-value `header` object in the context.
  But Fetch-like environments don't have this kind of object but instead `Headers` object which is a kind `Map`.
  Now Mesh can detect this and automatically convert it to the key-value object especially for Yoga users.

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

  - Now you can set a global `customFetch` instead of setting `customFetch` individually for each handler. `customFetch` configuration field for each handler will no longer work. And also `customFetch` needs to be the path of the code file that exports the function as `default`. `moduleName#exportName` is not supported for now.

  - While programmatically creating the handlers, now you also need `fetchFn` to be passed to the constructor;

  ```ts
  new GraphQLHandler({
    ...,
    fetchFn: myFetchFn,
  })
  ```

  - `readFileOrUrl`'s second `config` parameter is now required. Also this second parameter should take an object with `cwd`, `importFn`, `fetch` and `logger`. You can see the diff of handler's codes as an example.

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

- b974d9bd0: fix: get correct subschema for in context sdk and make correct assumptions to apply WrapQuery transform

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

- f202f53af: fix: bump wrap package and throw better error message in case of missing selectionSet for unmatching return types

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
  - You don't need `returnType` for abstract types anymore, because it's inferred from the type of `targetFieldName`.

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
