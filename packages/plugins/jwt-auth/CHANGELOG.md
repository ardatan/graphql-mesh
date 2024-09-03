# @graphql-mesh/plugin-jwt-auth

## 0.4.2

## 0.4.1

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

- [#7594](https://github.com/ardatan/graphql-mesh/pull/7594)
  [`9f01438`](https://github.com/ardatan/graphql-mesh/commit/9f01438fbdf327c0a4bfa0cf440d890ec871ffcc)
  Thanks [@ardatan](https://github.com/ardatan)! - Adding these plugins to serve-runtime by default,
  and make them configurable through the configuration;

  - `useResponseCache`
  - `useContentEncoding`
  - `useDeferStream`
  - `useExecutionCancellation`
  - `useUpstreamCancellation`
  - `useDisableIntrospection`
  - `useCSRFPrevention`
  - `useCustomAgent`
  - `useGenericAuth`
  - `useHMACUpstreamSignature`
  - `useWebhooks`

  In addition, the following ones are added to the serve-cli:

  - `useJWT`
  - `usePrometheus`
  - `useOpenTelemetry`
  - `useRateLimit`

- Updated dependencies
  [[`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d)]:
  - @graphql-mesh/utils@0.102.5
  - @graphql-mesh/types@0.102.5

## 0.3.6

## 0.3.5

### Patch Changes

- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/types@0.102.4
  - @graphql-mesh/utils@0.102.4

## 0.3.4

### Patch Changes

- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)]:
  - @graphql-mesh/types@0.102.3
  - @graphql-mesh/utils@0.102.3

## 0.3.3

## 0.3.2

### Patch Changes

- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/utils@0.102.2
  - @graphql-mesh/types@0.102.2

## 0.3.1

### Patch Changes

- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de)]:
  - @graphql-mesh/utils@0.102.1
  - @graphql-mesh/types@0.102.1

## 0.3.0

### Patch Changes

- Updated dependencies
  [[`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)]:
  - @graphql-mesh/types@0.102.0
  - @graphql-mesh/utils@0.102.0

## 0.2.3

## 0.2.2

## 0.2.1

## 0.2.0

### Patch Changes

- Updated dependencies
  [[`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)]:
  - @graphql-mesh/types@0.101.0
  - @graphql-mesh/utils@0.101.0

## 0.1.0

### Patch Changes

- [#7455](https://github.com/ardatan/graphql-mesh/pull/7455)
  [`5d3610a`](https://github.com/ardatan/graphql-mesh/commit/5d3610a85b3d59df5282a31e8972e800973e6963)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-jwt@^3.0.2` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-jwt/v/3.0.2)
    (from `3.0.1`, in `dependencies`)
- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7),
  [`4d1eb28`](https://github.com/ardatan/graphql-mesh/commit/4d1eb285c2b703c5f80473ad0f316004306fac7f),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7)]:
  - @graphql-mesh/types@0.100.0
  - @graphql-mesh/utils@0.100.0

## 0.0.10

### Patch Changes

- Updated dependencies
  [[`a1bfc49`](https://github.com/ardatan/graphql-mesh/commit/a1bfc492ac3378f22b79a51824407e776b496a84)]:
  - @graphql-mesh/types@0.99.7
  - @graphql-mesh/utils@0.99.7

## 0.0.9

### Patch Changes

- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/types@0.99.6
  - @graphql-mesh/utils@0.99.6

## 0.0.8

## 0.0.7

## 0.0.6

## 0.0.5

### Patch Changes

- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/utils@0.99.5
  - @graphql-mesh/types@0.99.5

## 0.0.4

### Patch Changes

- [#7374](https://github.com/ardatan/graphql-mesh/pull/7374)
  [`f427d7f`](https://github.com/ardatan/graphql-mesh/commit/f427d7fec8ab2f374e8e3aa5fd90a400a6792fc5)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-yoga/plugin-jwt@3.0.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-jwt/v/3.0.1)
    (from `3.0.0`, in `dependencies`)

- [#7376](https://github.com/ardatan/graphql-mesh/pull/7376)
  [`bb74e6d`](https://github.com/ardatan/graphql-mesh/commit/bb74e6dc935d9ac13e69c49dbb55a1364faf0e20)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-jwt@3.0.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-jwt/v/3.0.1)
    (from `3.0.0`, in `dependencies`)
- Updated dependencies
  [[`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)]:
  - @graphql-mesh/utils@0.99.4
  - @graphql-mesh/types@0.99.4

## 0.0.3

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3
  - @graphql-mesh/types@0.99.3

## 0.0.2

### Patch Changes

- [#7304](https://github.com/ardatan/graphql-mesh/pull/7304)
  [`f47c900`](https://github.com/ardatan/graphql-mesh/commit/f47c900d19e8c634d39e9dd90bfb1acc4f892a1f)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Initial commit and introduce a new plugin.
