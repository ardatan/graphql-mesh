# @graphql-mesh/plugin-operation-headers

## 0.7.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.9.2

## 0.7.1

### Patch Changes

- Updated dependencies
  [[`bc70d78`](https://github.com/ardatan/graphql-mesh/commit/bc70d78c7542d1ca46fe65a9886da880e7e574b7)]:
  - @graphql-mesh/serve-runtime@0.9.1

## 0.7.0

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

## 0.6.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.8.6

## 0.6.5

### Patch Changes

- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/serve-runtime@0.8.5
  - @graphql-mesh/types@0.102.4
  - @graphql-mesh/utils@0.102.4

## 0.6.4

### Patch Changes

- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)]:
  - @graphql-mesh/serve-runtime@0.8.4
  - @graphql-mesh/types@0.102.3
  - @graphql-mesh/utils@0.102.3

## 0.6.3

### Patch Changes

- Updated dependencies
  [[`3ea4ea7`](https://github.com/ardatan/graphql-mesh/commit/3ea4ea7e62f4a957a3733eab59ccefd37d8b9e8e),
  [`46f847d`](https://github.com/ardatan/graphql-mesh/commit/46f847d47e9ced84a0010c5f3a9aae5702e0f96f),
  [`416897a`](https://github.com/ardatan/graphql-mesh/commit/416897a9b8924d309e685faf92325391f7d7f687)]:
  - @graphql-mesh/serve-runtime@0.8.3

## 0.6.2

### Patch Changes

- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a),
  [`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/serve-runtime@0.8.2
  - @graphql-mesh/utils@0.102.2
  - @graphql-mesh/types@0.102.2

## 0.6.1

### Patch Changes

- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de),
  [`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de)]:
  - @graphql-mesh/serve-runtime@0.8.1
  - @graphql-mesh/utils@0.102.1
  - @graphql-mesh/types@0.102.1

## 0.6.0

### Patch Changes

- Updated dependencies
  [[`86acf63`](https://github.com/ardatan/graphql-mesh/commit/86acf6382b15e00fde87b718e84bb86e682621a8),
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373),
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)]:
  - @graphql-mesh/serve-runtime@0.8.0
  - @graphql-mesh/types@0.102.0
  - @graphql-mesh/utils@0.102.0

## 0.5.3

### Patch Changes

- Updated dependencies
  [[`eeab8fe`](https://github.com/ardatan/graphql-mesh/commit/eeab8fe6bd5d930a1faed22f8c78e302876de7af),
  [`eeab8fe`](https://github.com/ardatan/graphql-mesh/commit/eeab8fe6bd5d930a1faed22f8c78e302876de7af)]:
  - @graphql-mesh/serve-runtime@0.7.3

## 0.5.2

### Patch Changes

- [#7518](https://github.com/ardatan/graphql-mesh/pull/7518)
  [`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/serve-runtime@^0.7.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/serve-runtime/v/0.7.1)
    (from `^0.7.0`, in `peerDependencies`)
- Updated dependencies
  [[`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)]:
  - @graphql-mesh/serve-runtime@0.7.2

## 0.5.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.7.1

## 0.5.0

### Patch Changes

- Updated dependencies
  [[`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`1a9746f`](https://github.com/ardatan/graphql-mesh/commit/1a9746f6ca9b517230a0337d5a852bf05707303a),
  [`1d24997`](https://github.com/ardatan/graphql-mesh/commit/1d249977bbc1180f15ea0e11eece6cce1e8f2de1),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`e509a25`](https://github.com/ardatan/graphql-mesh/commit/e509a259d3080db1300c9f38ae149f648fc9159f),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`83b8cdc`](https://github.com/ardatan/graphql-mesh/commit/83b8cdc937fcb7e3cc4e2ee7a3ae3c1f12ccaf31),
  [`e509a25`](https://github.com/ardatan/graphql-mesh/commit/e509a259d3080db1300c9f38ae149f648fc9159f),
  [`e509a25`](https://github.com/ardatan/graphql-mesh/commit/e509a259d3080db1300c9f38ae149f648fc9159f),
  [`83b8cdc`](https://github.com/ardatan/graphql-mesh/commit/83b8cdc937fcb7e3cc4e2ee7a3ae3c1f12ccaf31)]:
  - @graphql-mesh/serve-runtime@0.7.0
  - @graphql-mesh/types@0.101.0
  - @graphql-mesh/utils@0.101.0

## 0.4.0

### Patch Changes

- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`d5a4cd4`](https://github.com/ardatan/graphql-mesh/commit/d5a4cd4ff93984b62d9670cc286886e62de1bc55),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7),
  [`4d1eb28`](https://github.com/ardatan/graphql-mesh/commit/4d1eb285c2b703c5f80473ad0f316004306fac7f),
  [`e2d3270`](https://github.com/ardatan/graphql-mesh/commit/e2d3270c7f32bf0a77b657546a2335572aeb0b79),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7)]:
  - @graphql-mesh/serve-runtime@0.6.0
  - @graphql-mesh/types@0.100.0
  - @graphql-mesh/utils@0.100.0

## 0.3.11

### Patch Changes

- Updated dependencies
  [[`a1bfc49`](https://github.com/ardatan/graphql-mesh/commit/a1bfc492ac3378f22b79a51824407e776b496a84)]:
  - @graphql-mesh/types@0.99.7
  - @graphql-mesh/utils@0.99.7
  - @graphql-mesh/serve-runtime@0.5.11

## 0.3.10

### Patch Changes

- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`2041e8d`](https://github.com/ardatan/graphql-mesh/commit/2041e8dafcae602aed96e51f4e9ab38113c3ccde),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/serve-runtime@0.5.10
  - @graphql-mesh/types@0.99.6
  - @graphql-mesh/utils@0.99.6

## 0.3.9

### Patch Changes

- Updated dependencies
  [[`6fc03b6`](https://github.com/ardatan/graphql-mesh/commit/6fc03b6f138ebc81a477fbf0c222ab6e1d882497),
  [`6fc03b6`](https://github.com/ardatan/graphql-mesh/commit/6fc03b6f138ebc81a477fbf0c222ab6e1d882497)]:
  - @graphql-mesh/serve-runtime@0.5.9

## 0.3.8

### Patch Changes

- Updated dependencies
  [[`7cd4d35`](https://github.com/ardatan/graphql-mesh/commit/7cd4d35100489550cef5815acd424ad85a71ec27)]:
  - @graphql-mesh/serve-runtime@0.5.8

## 0.3.7

### Patch Changes

- Updated dependencies
  [[`1905f53`](https://github.com/ardatan/graphql-mesh/commit/1905f53a65e6c73d1d305770dcfc4cba34798a09)]:
  - @graphql-mesh/serve-runtime@0.5.7

## 0.3.6

### Patch Changes

- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4),
  [`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/serve-runtime@0.5.6
  - @graphql-mesh/utils@0.99.5
  - @graphql-mesh/types@0.99.5

## 0.3.5

### Patch Changes

- Updated dependencies
  [[`ec31e60`](https://github.com/ardatan/graphql-mesh/commit/ec31e608c271f14554fcef5519a12c4366e87f38),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)]:
  - @graphql-mesh/serve-runtime@0.5.5
  - @graphql-mesh/utils@0.99.4
  - @graphql-mesh/types@0.99.4

## 0.3.4

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3
  - @graphql-mesh/serve-runtime@0.5.4
  - @graphql-mesh/types@0.99.3

## 0.3.3

### Patch Changes

- Updated dependencies
  [[`f47c900`](https://github.com/ardatan/graphql-mesh/commit/f47c900d19e8c634d39e9dd90bfb1acc4f892a1f)]:
  - @graphql-mesh/serve-runtime@0.5.3

## 0.3.2

### Patch Changes

- Updated dependencies
  [[`9f6624e`](https://github.com/ardatan/graphql-mesh/commit/9f6624e327a555b3de201e67ca9f5dabca44e238),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730)]:
  - @graphql-mesh/serve-runtime@0.5.2
  - @graphql-mesh/types@0.99.2
  - @graphql-mesh/utils@0.99.2

## 0.3.1

### Patch Changes

- Updated dependencies
  [[`db05fc3`](https://github.com/ardatan/graphql-mesh/commit/db05fc3d3205ac8e2730099cf453a7a113a5d770),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`db05fc3`](https://github.com/ardatan/graphql-mesh/commit/db05fc3d3205ac8e2730099cf453a7a113a5d770)]:
  - @graphql-mesh/serve-runtime@0.5.1
  - @graphql-mesh/types@0.99.1
  - @graphql-mesh/utils@0.99.1

## 0.3.0

### Patch Changes

- Updated dependencies
  [[`27e3cc9`](https://github.com/ardatan/graphql-mesh/commit/27e3cc97c1218863cf2948902bdca050bd71d18a),
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2),
  [`26549a9`](https://github.com/ardatan/graphql-mesh/commit/26549a9832b4e18afdb22e4615a9951d69a5922b),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`7b35444`](https://github.com/ardatan/graphql-mesh/commit/7b35444dcc15c6d22eb1b26c080c7b78ee8aef8e),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`a2306d2`](https://github.com/ardatan/graphql-mesh/commit/a2306d2c53c9d3cf071aec6e550dc5fff976bfb2),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`eefbfbe`](https://github.com/ardatan/graphql-mesh/commit/eefbfbe94d72fa6f5cf60a8cf363cae039aece89),
  [`de7517e`](https://github.com/ardatan/graphql-mesh/commit/de7517e653babaeabbd80a941a0210c491601725)]:
  - @graphql-mesh/serve-runtime@0.5.0
  - @graphql-mesh/utils@0.99.0
  - @graphql-mesh/types@0.99.0

## 0.2.4

### Patch Changes

- Updated dependencies
  [[`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`28961ed`](https://github.com/ardatan/graphql-mesh/commit/28961edfb6b4ef998fff1af6759c892c3481ba7a),
  [`25fd39a`](https://github.com/ardatan/graphql-mesh/commit/25fd39abc37fdad867707073604150b40eace062),
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)]:
  - @graphql-mesh/serve-runtime@0.4.4
  - @graphql-mesh/types@0.98.10
  - @graphql-mesh/utils@0.98.10

## 0.2.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.4.3

## 0.2.2

### Patch Changes

- Updated dependencies
  [[`141c3a6`](https://github.com/ardatan/graphql-mesh/commit/141c3a6664afdbe4202986cdc06f5fe018d5863a)]:
  - @graphql-mesh/serve-runtime@0.4.2

## 0.2.1

### Patch Changes

- Updated dependencies
  [[`d68c464`](https://github.com/ardatan/graphql-mesh/commit/d68c4642c9993c37a48004fc0d1f0574f557ca43)]:
  - @graphql-mesh/serve-runtime@0.4.1

## 0.2.0

### Patch Changes

- Updated dependencies
  [[`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae),
  [`f985978`](https://github.com/ardatan/graphql-mesh/commit/f9859784ad854207e4d32bda11c904b5301610ee),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)]:
  - @graphql-mesh/serve-runtime@0.4.0
  - @graphql-mesh/utils@0.98.9
  - @graphql-mesh/types@0.98.9

## 0.1.12

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.3.12

## 0.1.11

### Patch Changes

- Updated dependencies
  [[`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`4c75671`](https://github.com/ardatan/graphql-mesh/commit/4c756717247eb0a8f3431e31e6c86fc97297bd32),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/serve-runtime@0.3.11
  - @graphql-mesh/utils@0.98.8
  - @graphql-mesh/types@0.98.8

## 0.1.10

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.98.7
  - @graphql-mesh/utils@0.98.7
  - @graphql-mesh/serve-runtime@0.3.10

## 0.1.9

### Patch Changes

- Updated dependencies
  [[`56f5449`](https://github.com/ardatan/graphql-mesh/commit/56f54491e0770ca9621120c202201fd7ef3fd3fe)]:
  - @graphql-mesh/serve-runtime@0.3.9

## 0.1.8

### Patch Changes

- Updated dependencies
  [[`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/serve-runtime@0.3.8
  - @graphql-mesh/types@0.98.6
  - @graphql-mesh/utils@0.98.6

## 0.1.7

### Patch Changes

- Updated dependencies
  [[`c4d2249`](https://github.com/ardatan/graphql-mesh/commit/c4d22497b4249f9a0969e1d01efbe0721774ce73)]:
  - @graphql-mesh/utils@0.98.5
  - @graphql-mesh/serve-runtime@0.3.7
  - @graphql-mesh/types@0.98.5

## 0.1.6

### Patch Changes

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @graphql-mesh/serve-runtime@0.3.6
  - @graphql-mesh/types@0.98.4
  - @graphql-mesh/utils@0.98.4

## 0.1.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.3.5

## 0.1.4

### Patch Changes

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @graphql-mesh/serve-runtime@0.3.4
  - @graphql-mesh/types@0.98.3
  - @graphql-mesh/utils@0.98.3

## 0.1.3

### Patch Changes

- Updated dependencies
  [[`da798ac`](https://github.com/ardatan/graphql-mesh/commit/da798acf85cf7da8cd45609725dde751b4ef24a3),
  [`da798ac`](https://github.com/ardatan/graphql-mesh/commit/da798acf85cf7da8cd45609725dde751b4ef24a3)]:
  - @graphql-mesh/serve-runtime@0.3.3

## 0.1.2

### Patch Changes

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/serve-runtime@0.3.2
  - @graphql-mesh/types@0.98.2
  - @graphql-mesh/utils@0.98.2

## 0.1.1

### Patch Changes

- Updated dependencies
  [[`6044b7f`](https://github.com/ardatan/graphql-mesh/commit/6044b7f8bd72ee3d4460d9f09f303ea6fc4e007b)]:
  - @graphql-mesh/types@0.98.1
  - @graphql-mesh/utils@0.98.1
  - @graphql-mesh/serve-runtime@0.3.1

## 0.1.0

### Patch Changes

- Updated dependencies
  [[`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`b372de6`](https://github.com/ardatan/graphql-mesh/commit/b372de6ac72e871ebdc731c0f3f67c16f04bb405),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)]:
  - @graphql-mesh/serve-runtime@0.3.0
  - @graphql-mesh/types@0.98.0
  - @graphql-mesh/utils@0.98.0

## 0.0.12

### Patch Changes

- Updated dependencies
  [[`05aabae`](https://github.com/ardatan/graphql-mesh/commit/05aabae48ad17f80847eb153e5fd4a96b7643d5d)]:
  - @graphql-mesh/serve-runtime@0.2.12

## 0.0.11

### Patch Changes

- Updated dependencies
  [[`9ac2245`](https://github.com/ardatan/graphql-mesh/commit/9ac2245273a561449cfc17dcafc67d0c43baf33e)]:
  - @graphql-mesh/serve-runtime@0.2.11

## 0.0.10

### Patch Changes

- Updated dependencies
  [[`8924438`](https://github.com/ardatan/graphql-mesh/commit/8924438131a7320ef160573539bddfb024bbe343)]:
  - @graphql-mesh/serve-runtime@0.2.10

## 0.0.9

### Patch Changes

- Updated dependencies
  [[`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)]:
  - @graphql-mesh/types@0.97.5
  - @graphql-mesh/utils@0.97.5
  - @graphql-mesh/serve-runtime@0.2.9

## 0.0.8

### Patch Changes

- Updated dependencies
  [[`f293329`](https://github.com/ardatan/graphql-mesh/commit/f2933295532d0760bb731e055dd2bd6e9cb2a63b)]:
  - @graphql-mesh/serve-runtime@0.2.8

## 0.0.7

### Patch Changes

- Updated dependencies
  [[`1639001`](https://github.com/ardatan/graphql-mesh/commit/16390018bd54946fbfbd2bfb8eb3ba7682966a12)]:
  - @graphql-mesh/serve-runtime@0.2.7

## 0.0.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.2.6

## 0.0.5

### Patch Changes

- Updated dependencies
  [[`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)]:
  - @graphql-mesh/utils@0.97.4
  - @graphql-mesh/types@0.97.4
  - @graphql-mesh/serve-runtime@0.2.5

## 0.0.4

### Patch Changes

- Updated dependencies
  [[`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)]:
  - @graphql-mesh/types@0.97.3
  - @graphql-mesh/utils@0.97.3
  - @graphql-mesh/serve-runtime@0.2.4

## 0.0.3

### Patch Changes

- Updated dependencies
  [[`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)]:
  - @graphql-mesh/types@0.97.2
  - @graphql-mesh/utils@0.97.2
  - @graphql-mesh/serve-runtime@0.2.3

## 0.0.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.2.2

## 0.0.1

### Patch Changes

- [#6610](https://github.com/ardatan/graphql-mesh/pull/6610)
  [`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)
  Thanks [@ardatan](https://github.com/ardatan)! - New Plugin: Operation Headers

- Updated dependencies
  [[`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)]:
  - @graphql-mesh/types@0.97.1
  - @graphql-mesh/utils@0.97.1
  - @graphql-mesh/serve-runtime@0.2.1
