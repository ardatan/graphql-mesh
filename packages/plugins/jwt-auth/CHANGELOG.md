# @graphql-mesh/plugin-jwt-auth

## 1.4.11

### Patch Changes

- Updated dependencies
  [[`903124f`](https://github.com/ardatan/graphql-mesh/commit/903124f8245a518aac50ef8d0eff2fef01a206f2)]:
  - @graphql-mesh/utils@0.103.21
  - @graphql-mesh/types@0.103.21

## 1.4.10

### Patch Changes

- Updated dependencies
  [[`3f5e0a1`](https://github.com/ardatan/graphql-mesh/commit/3f5e0a13c8a07bd68ec19e4da94f34030cc7d3dc)]:
  - @graphql-mesh/utils@0.103.20
  - @graphql-mesh/types@0.103.20

## 1.4.9

### Patch Changes

- Updated dependencies
  [[`d9cf1d3`](https://github.com/ardatan/graphql-mesh/commit/d9cf1d389c6d685a9d6cc50ff4be03380fd085f1)]:
  - @graphql-mesh/types@0.103.19
  - @graphql-mesh/utils@0.103.19

## 1.4.8

### Patch Changes

- Updated dependencies
  [[`ab0863b`](https://github.com/ardatan/graphql-mesh/commit/ab0863ba367552e4b1ced1063ae7cb3a5f81b3b2)]:
  - @graphql-mesh/utils@0.103.18
  - @graphql-mesh/types@0.103.18

## 1.4.7

### Patch Changes

- Updated dependencies
  [[`eee582a`](https://github.com/ardatan/graphql-mesh/commit/eee582a4cf78d8f7b0e303b522e6a97bd0ad4f2a)]:
  - @graphql-mesh/utils@0.103.17
  - @graphql-mesh/types@0.103.17

## 1.4.6

### Patch Changes

- Updated dependencies
  [[`b44f8b7`](https://github.com/ardatan/graphql-mesh/commit/b44f8b7a413c8adb213b22fb8a243ca6aa06d2bd)]:
  - @graphql-mesh/types@0.103.16
  - @graphql-mesh/utils@0.103.16

## 1.4.5

### Patch Changes

- Updated dependencies
  [[`b5c05c4`](https://github.com/ardatan/graphql-mesh/commit/b5c05c4c5862525c76d69e8c166e71378f69bda0)]:
  - @graphql-mesh/types@0.103.15
  - @graphql-mesh/utils@0.103.15

## 1.4.4

### Patch Changes

- Updated dependencies
  [[`fc44a1e`](https://github.com/ardatan/graphql-mesh/commit/fc44a1e66c8bc8f27dc7e5e642031d17d75c0db8)]:
  - @graphql-mesh/types@0.103.14
  - @graphql-mesh/utils@0.103.14

## 1.4.3

### Patch Changes

- Updated dependencies
  [[`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a),
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)]:
  - @graphql-mesh/types@0.103.13
  - @graphql-mesh/utils@0.103.13

## 1.4.2

### Patch Changes

- Updated dependencies
  [[`5180b06`](https://github.com/ardatan/graphql-mesh/commit/5180b068568042e764558a19194b8bae69354fe2),
  [`c54e361`](https://github.com/ardatan/graphql-mesh/commit/c54e36110256541e03380b0d537085848169116b)]:
  - @graphql-mesh/utils@0.103.12
  - @graphql-mesh/types@0.103.12

## 1.4.1

### Patch Changes

- Updated dependencies
  [[`3fc1f3e`](https://github.com/ardatan/graphql-mesh/commit/3fc1f3e046c02107d7fecf367756c7196fbe6ce1),
  [`4011203`](https://github.com/ardatan/graphql-mesh/commit/40112034a2e248eda94883a39a3f8682189f4288)]:
  - @graphql-mesh/types@0.103.11
  - @graphql-mesh/utils@0.103.11

## 1.4.0

### Minor Changes

- [#8189](https://github.com/ardatan/graphql-mesh/pull/8189)
  [`83a73ab`](https://github.com/ardatan/graphql-mesh/commit/83a73abef2c156c56d406b266d37fd78c6f4a3e9)
  Thanks [@jjangga0214](https://github.com/jjangga0214)! -
  [#3590](https://github.com/dotansimha/graphql-yoga/pull/3590) Do not throw when \`request\` is not
  available in the context, it can be a WebSockets connection

  - Export helper `extractFromConnectionParams` to get the token from WebSocket `connectionParams`
    when GraphQL WS is used like
    [here](https://the-guild.dev/graphql/yoga-server/docs/features/subscriptions#graphql-over-websocket-protocol-via-graphql-ws)

  ```ts
  import {
    defineConfig,
    extractFromConnectionParams,
    extractFromHeader,
    useJWT
  } from '@graphql-hive/gateway'

  export const gatewayConfig = defineConfig({
    jwt: {
      // So it will look for the token in the connectionParams.my-token field in case of a WebSockets connection
      // It will check WS params and headers, and get the available one
      lookupLocations: [
        extractFromConnectionParams({ name: 'my-token' }),
        extractFromHeader({ name: 'authorization', prefix: 'Bearer ' })
      ]
    }
  })
  ```

## 1.3.10

### Patch Changes

- Updated dependencies
  [[`b750a41`](https://github.com/ardatan/graphql-mesh/commit/b750a410c082d64a04f21023790f2ff2c46f5eb9)]:
  - @graphql-mesh/utils@0.103.10
  - @graphql-mesh/types@0.103.10

## 1.3.9

### Patch Changes

- Updated dependencies
  [[`10ba2c4`](https://github.com/ardatan/graphql-mesh/commit/10ba2c42549dacff9c4e6be87ee50b608be62ddc)]:
  - @graphql-mesh/utils@0.103.9
  - @graphql-mesh/types@0.103.9

## 1.3.8

### Patch Changes

- Updated dependencies
  [[`93fb364`](https://github.com/ardatan/graphql-mesh/commit/93fb3643d90c52084725d79b586ace8ecd570911)]:
  - @graphql-mesh/utils@0.103.8
  - @graphql-mesh/types@0.103.8

## 1.3.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.103.7
  - @graphql-mesh/utils@0.103.7

## 1.3.6

### Patch Changes

- [#8092](https://github.com/ardatan/graphql-mesh/pull/8092)
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/types@^0.103.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.5)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/utils@^0.103.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.5)
    (to `dependencies`)
  - Added dependency [`tslib@^2.4.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.4.0) (to
    `dependencies`)
  - Removed dependency
    [`@graphql-mesh/types@^0.103.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.5)
    (from `peerDependencies`)
  - Removed dependency
    [`@graphql-mesh/utils@^0.103.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.5)
    (from `peerDependencies`)
  - Removed dependency [`tslib@^2.4.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.4.0) (from
    `peerDependencies`)
- Updated dependencies
  [[`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9),
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)]:
  - @graphql-mesh/types@0.103.6
  - @graphql-mesh/utils@0.103.6

## 1.3.5

### Patch Changes

- Updated dependencies
  [[`9f9f6fe`](https://github.com/ardatan/graphql-mesh/commit/9f9f6fe61c74eaa6572866eddd97c348307107a8)]:
  - @graphql-mesh/utils@0.103.5
  - @graphql-mesh/types@0.103.5

## 1.3.4

### Patch Changes

- Updated dependencies
  [[`8fcfe3f`](https://github.com/ardatan/graphql-mesh/commit/8fcfe3f78a0be53e3b474231bfe7ee0594e54f91)]:
  - @graphql-mesh/types@0.103.4
  - @graphql-mesh/utils@0.103.4

## 1.3.3

### Patch Changes

- Updated dependencies
  [[`6360755`](https://github.com/ardatan/graphql-mesh/commit/63607552017ed462c0555ad2e2ec6466c10d7ae4)]:
  - @graphql-mesh/utils@0.103.3
  - @graphql-mesh/types@0.103.3

## 1.3.2

### Patch Changes

- Updated dependencies
  [[`bfd8929`](https://github.com/ardatan/graphql-mesh/commit/bfd89297b0fe4dbdd0fecff8c35c316e874b9a56)]:
  - @graphql-mesh/utils@0.103.2
  - @graphql-mesh/types@0.103.2

## 1.3.1

### Patch Changes

- Updated dependencies
  [[`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac),
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)]:
  - @graphql-mesh/types@0.103.1
  - @graphql-mesh/utils@0.103.1

## 1.3.0

### Patch Changes

- Updated dependencies
  [[`0e49907`](https://github.com/ardatan/graphql-mesh/commit/0e49907cf19d91fe40c28237aa79bd55742b371f),
  [`9873b33`](https://github.com/ardatan/graphql-mesh/commit/9873b33f0cc6c3b3a3c3dc1a0a1cb18c827b8722)]:
  - @graphql-mesh/utils@0.103.0
  - @graphql-mesh/types@0.103.0

## 1.2.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.102.13
  - @graphql-mesh/utils@0.102.13

## 1.2.6

### Patch Changes

- [#7910](https://github.com/ardatan/graphql-mesh/pull/7910)
  [`e3e6201`](https://github.com/ardatan/graphql-mesh/commit/e3e620120c7754c0e9186b9ed8c32a5c3cb81a3f)
  Thanks [@renovate](https://github.com/apps/renovate)! - Bump underlying Yoga package

- Updated dependencies
  [[`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7)]:
  - @graphql-mesh/utils@0.102.12
  - @graphql-mesh/types@0.102.12

## 1.2.5

### Patch Changes

- Updated dependencies
  [[`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af),
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)]:
  - @graphql-mesh/types@0.102.11
  - @graphql-mesh/utils@0.102.11

## 1.2.4

## 1.2.3

### Patch Changes

- Updated dependencies
  [[`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71),
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)]:
  - @graphql-mesh/types@0.102.10
  - @graphql-mesh/utils@0.102.10

## 1.2.2

### Patch Changes

- Updated dependencies
  [[`fad4d27`](https://github.com/ardatan/graphql-mesh/commit/fad4d27bfebb80a374c2041b86ffab509845effe)]:
  - @graphql-mesh/utils@0.102.9
  - @graphql-mesh/types@0.102.9

## 1.2.1

## 1.2.0

### Patch Changes

- Updated dependencies
  [[`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)]:
  - @graphql-mesh/types@0.102.8
  - @graphql-mesh/utils@0.102.8

## 1.1.1

### Patch Changes

- Updated dependencies
  [[`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)]:
  - @graphql-mesh/types@0.102.7
  - @graphql-mesh/utils@0.102.7

## 1.1.0

## 1.0.5

### Patch Changes

- Updated dependencies
  [[`bf588d3`](https://github.com/ardatan/graphql-mesh/commit/bf588d372c0078378aaa24beea2da794af7949e6)]:
  - @graphql-mesh/utils@0.102.6
  - @graphql-mesh/types@0.102.6

## 1.0.4

## 1.0.3

## 1.0.2

## 1.0.1

## 1.0.0

## 0.4.4

## 0.4.3

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
