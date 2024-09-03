# @graphql-mesh/plugin-opentelemetry

## 0.4.2

### Patch Changes

- [#7608](https://github.com/ardatan/graphql-mesh/pull/7608)
  [`d4f23b3`](https://github.com/ardatan/graphql-mesh/commit/d4f23b32f53178620f346a84dead035fb56c34f9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@opentelemetry/auto-instrumentations-node@^0.50.0` ↗︎](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node/v/0.50.0)
    (from `^0.49.0`, in `dependencies`)

- [`c663f59`](https://github.com/ardatan/graphql-mesh/commit/c663f59e916f9b9fbb0fe9e4ee4439bb8c3f9412)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `Gateway` prefix instead of `Mesh`

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.9.2

## 0.4.1

### Patch Changes

- Updated dependencies
  [[`bc70d78`](https://github.com/ardatan/graphql-mesh/commit/bc70d78c7542d1ca46fe65a9886da880e7e574b7)]:
  - @graphql-mesh/serve-runtime@0.9.1

## 0.4.0

### Minor Changes

- [#7580](https://github.com/ardatan/graphql-mesh/pull/7580)
  [`75e9f63`](https://github.com/ardatan/graphql-mesh/commit/75e9f63d09514a0af786f909dc8c32ac09a1a849)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING: All types prefixed with `MeshServe`,
  now are prefixed with `Gateway`. e.g. `MeshServeRuntime` -> `GatewayRuntime`

  Runtime factory is renamed; `createServeRuntime` -> `createGatewayRuntime`

  The expected export name for config files are renamed from `serveConfig` to `gatewayConfig`

  RENAMING:

  You can rename the product, config file name etc by using the following config options;

  For example;

  ```ts
  productName = 'Mesh Gateway'
  productDescription =
    'Mesh Gateway is a GraphQL Gateway that can be used to serve a supergraph schema.'
  productLogo = '<svg>...</svg>'
  productPackageName = '@graphql-mesh/gateway'
  ```

### Patch Changes

- Updated dependencies
  [[`9f01438`](https://github.com/ardatan/graphql-mesh/commit/9f01438fbdf327c0a4bfa0cf440d890ec871ffcc),
  [`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d),
  [`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d),
  [`75e9f63`](https://github.com/ardatan/graphql-mesh/commit/75e9f63d09514a0af786f909dc8c32ac09a1a849),
  [`9f01438`](https://github.com/ardatan/graphql-mesh/commit/9f01438fbdf327c0a4bfa0cf440d890ec871ffcc),
  [`d4838b0`](https://github.com/ardatan/graphql-mesh/commit/d4838b0f530dc1841ad9da0cd88cb26387564012)]:
  - @graphql-mesh/serve-runtime@0.9.0
  - @graphql-mesh/utils@0.102.5
  - @graphql-mesh/types@0.102.5
  - @graphql-mesh/transport-common@0.7.6

## 0.3.6

### Patch Changes

- Updated dependencies
  [[`5146df0`](https://github.com/ardatan/graphql-mesh/commit/5146df0fd3313227d5d7df2beb726ca89e13923f)]:
  - @graphql-mesh/transport-common@0.7.5
  - @graphql-mesh/serve-runtime@0.8.6

## 0.3.5

### Patch Changes

- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/serve-runtime@0.8.5
  - @graphql-mesh/transport-common@0.7.4
  - @graphql-mesh/types@0.102.4
  - @graphql-mesh/utils@0.102.4

## 0.3.4

### Patch Changes

- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)]:
  - @graphql-mesh/serve-runtime@0.8.4
  - @graphql-mesh/transport-common@0.7.3
  - @graphql-mesh/types@0.102.3
  - @graphql-mesh/utils@0.102.3

## 0.3.3

### Patch Changes

- [#7407](https://github.com/ardatan/graphql-mesh/pull/7407)
  [`3ea4ea7`](https://github.com/ardatan/graphql-mesh/commit/3ea4ea7e62f4a957a3733eab59ccefd37d8b9e8e)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/serve-runtime@^0.8.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/serve-runtime/v/0.8.2)
    (to `dependencies`)

- [#7407](https://github.com/ardatan/graphql-mesh/pull/7407)
  [`3ea4ea7`](https://github.com/ardatan/graphql-mesh/commit/3ea4ea7e62f4a957a3733eab59ccefd37d8b9e8e)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Export DisposableSymbols from
  serveRuntime and use it in plugins

- Updated dependencies
  [[`3ea4ea7`](https://github.com/ardatan/graphql-mesh/commit/3ea4ea7e62f4a957a3733eab59ccefd37d8b9e8e),
  [`46f847d`](https://github.com/ardatan/graphql-mesh/commit/46f847d47e9ced84a0010c5f3a9aae5702e0f96f),
  [`416897a`](https://github.com/ardatan/graphql-mesh/commit/416897a9b8924d309e685faf92325391f7d7f687)]:
  - @graphql-mesh/serve-runtime@0.8.3

## 0.3.2

### Patch Changes

- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/utils@0.102.2
  - @graphql-mesh/types@0.102.2
  - @graphql-mesh/transport-common@0.7.2

## 0.3.1

### Patch Changes

- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de),
  [`60bfc22`](https://github.com/ardatan/graphql-mesh/commit/60bfc2240108af0a599a66451517a146cace879d)]:
  - @graphql-mesh/utils@0.102.1
  - @graphql-mesh/transport-common@0.7.1
  - @graphql-mesh/types@0.102.1

## 0.3.0

### Patch Changes

- Updated dependencies
  [[`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)]:
  - @graphql-mesh/types@0.102.0
  - @graphql-mesh/utils@0.102.0
  - @graphql-mesh/transport-common@0.7.0

## 0.2.3

## 0.2.2

### Patch Changes

- [#7518](https://github.com/ardatan/graphql-mesh/pull/7518)
  [`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^0.6.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/0.6.1)
    (from `^0.6.0`, in `dependencies`)

## 0.2.1

### Patch Changes

- Updated dependencies
  [[`67e1062`](https://github.com/ardatan/graphql-mesh/commit/67e10629c70ec553234c1ffc99af4b89ddb31985)]:
  - @graphql-mesh/transport-common@0.6.1

## 0.2.0

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
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)]:
  - @graphql-mesh/transport-common@0.6.0
  - @graphql-mesh/types@0.101.0
  - @graphql-mesh/utils@0.101.0

## 0.1.0

### Patch Changes

- [#7477](https://github.com/ardatan/graphql-mesh/pull/7477)
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.3.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.3.4)
    (from `^10.2.3`, in `dependencies`)

- [#7430](https://github.com/ardatan/graphql-mesh/pull/7430)
  [`e902fee`](https://github.com/ardatan/graphql-mesh/commit/e902feee0a70128641e12893e05d6f0cb7aab4d5)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Initial implementation for open-telemetry
  plugin

- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7),
  [`4d1eb28`](https://github.com/ardatan/graphql-mesh/commit/4d1eb285c2b703c5f80473ad0f316004306fac7f),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7)]:
  - @graphql-mesh/transport-common@0.5.0
  - @graphql-mesh/types@0.100.0
  - @graphql-mesh/utils@0.100.0
