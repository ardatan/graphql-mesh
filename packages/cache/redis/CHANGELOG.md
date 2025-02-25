# @graphql-mesh/cache-redis

## 0.103.22

### Patch Changes

- [#8433](https://github.com/ardatan/graphql-mesh/pull/8433)
  [`903124f`](https://github.com/ardatan/graphql-mesh/commit/903124f8245a518aac50ef8d0eff2fef01a206f2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.6` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.6)
    (from `^0.0.5`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/types@0.103.21

## 0.103.21

### Patch Changes

- [#8431](https://github.com/ardatan/graphql-mesh/pull/8431)
  [`3f5e0a1`](https://github.com/ardatan/graphql-mesh/commit/3f5e0a13c8a07bd68ec19e4da94f34030cc7d3dc)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency
    [`@graphql-mesh/utils@^0.103.19` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.19)
    (from `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/types@0.103.20

## 0.103.20

### Patch Changes

- Updated dependencies
  [[`d9cf1d3`](https://github.com/ardatan/graphql-mesh/commit/d9cf1d389c6d685a9d6cc50ff4be03380fd085f1)]:
  - @graphql-mesh/types@0.103.19
  - @graphql-mesh/utils@0.103.19

## 0.103.19

### Patch Changes

- Updated dependencies
  [[`ab0863b`](https://github.com/ardatan/graphql-mesh/commit/ab0863ba367552e4b1ced1063ae7cb3a5f81b3b2)]:
  - @graphql-mesh/utils@0.103.18
  - @graphql-mesh/types@0.103.18

## 0.103.18

### Patch Changes

- Updated dependencies
  [[`eee582a`](https://github.com/ardatan/graphql-mesh/commit/eee582a4cf78d8f7b0e303b522e6a97bd0ad4f2a)]:
  - @graphql-mesh/utils@0.103.17
  - @graphql-mesh/types@0.103.17

## 0.103.17

### Patch Changes

- Updated dependencies
  [[`b44f8b7`](https://github.com/ardatan/graphql-mesh/commit/b44f8b7a413c8adb213b22fb8a243ca6aa06d2bd)]:
  - @graphql-mesh/types@0.103.16
  - @graphql-mesh/utils@0.103.16

## 0.103.16

### Patch Changes

- Updated dependencies
  [[`b5c05c4`](https://github.com/ardatan/graphql-mesh/commit/b5c05c4c5862525c76d69e8c166e71378f69bda0)]:
  - @graphql-mesh/types@0.103.15
  - @graphql-mesh/utils@0.103.15

## 0.103.15

### Patch Changes

- [#8260](https://github.com/ardatan/graphql-mesh/pull/8260)
  [`fc44a1e`](https://github.com/ardatan/graphql-mesh/commit/fc44a1e66c8bc8f27dc7e5e642031d17d75c0db8)
  Thanks [@ardatan](https://github.com/ardatan)! - Support REDIS_FAMILY to set family of the IP
  address (IPv4 or IPv6).

  This enhancement allows you to explicitly specify the IP address family when connecting to Redis
  instances:

  - 4: Force IPv4
  - 6: Force IPv6
  - 0: Automatic (default)

  This is particularly useful in network environments where specific IP protocols are required or
  when troubleshooting connection issues.

- [#8260](https://github.com/ardatan/graphql-mesh/pull/8260)
  [`fc44a1e`](https://github.com/ardatan/graphql-mesh/commit/fc44a1e66c8bc8f27dc7e5e642031d17d75c0db8)
  Thanks [@ardatan](https://github.com/ardatan)! - Support Redis Sentinels -
  [See more](https://github.com/redis/ioredis?tab=readme-ov-file#sentinel)

- Updated dependencies
  [[`fc44a1e`](https://github.com/ardatan/graphql-mesh/commit/fc44a1e66c8bc8f27dc7e5e642031d17d75c0db8)]:
  - @graphql-mesh/types@0.103.14
  - @graphql-mesh/utils@0.103.14

## 0.103.14

### Patch Changes

- Updated dependencies
  [[`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a),
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a),
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)]:
  - @graphql-mesh/cross-helpers@0.4.10
  - @graphql-mesh/types@0.103.13
  - @graphql-mesh/utils@0.103.13

## 0.103.13

### Patch Changes

- [#8268](https://github.com/ardatan/graphql-mesh/pull/8268)
  [`f1b5e8e`](https://github.com/ardatan/graphql-mesh/commit/f1b5e8ee2f2da7599532b6f2a2e6399c46575789)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `PX` instead of `EX` to handle milliseconds
  as TTL

- Updated dependencies
  [[`5180b06`](https://github.com/ardatan/graphql-mesh/commit/5180b068568042e764558a19194b8bae69354fe2),
  [`c54e361`](https://github.com/ardatan/graphql-mesh/commit/c54e36110256541e03380b0d537085848169116b),
  [`78c202e`](https://github.com/ardatan/graphql-mesh/commit/78c202ef8824607e27de1dcc5076c82a02ef86cd)]:
  - @graphql-mesh/utils@0.103.12
  - @graphql-mesh/types@0.103.12
  - @graphql-mesh/string-interpolation@0.5.8

## 0.103.12

### Patch Changes

- Updated dependencies
  [[`3fc1f3e`](https://github.com/ardatan/graphql-mesh/commit/3fc1f3e046c02107d7fecf367756c7196fbe6ce1),
  [`4011203`](https://github.com/ardatan/graphql-mesh/commit/40112034a2e248eda94883a39a3f8682189f4288)]:
  - @graphql-mesh/types@0.103.11
  - @graphql-mesh/utils@0.103.11

## 0.103.11

### Patch Changes

- Updated dependencies
  [[`b750a41`](https://github.com/ardatan/graphql-mesh/commit/b750a410c082d64a04f21023790f2ff2c46f5eb9)]:
  - @graphql-mesh/utils@0.103.10
  - @graphql-mesh/types@0.103.10

## 0.103.10

### Patch Changes

- Updated dependencies
  [[`10ba2c4`](https://github.com/ardatan/graphql-mesh/commit/10ba2c42549dacff9c4e6be87ee50b608be62ddc)]:
  - @graphql-mesh/utils@0.103.9
  - @graphql-mesh/types@0.103.9

## 0.103.9

### Patch Changes

- [`e58b4ac`](https://github.com/ardatan/graphql-mesh/commit/e58b4acc19e0bc53c0c27727c9033ecdbe8b9a36)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `SCAN` instead of `KEYS` to avoid the error
  `ERR KEYS command is disabled because total number of keys is too large, please use SCAN`

## 0.103.8

### Patch Changes

- Updated dependencies
  [[`93fb364`](https://github.com/ardatan/graphql-mesh/commit/93fb3643d90c52084725d79b586ace8ecd570911)]:
  - @graphql-mesh/utils@0.103.8
  - @graphql-mesh/types@0.103.8

## 0.103.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.103.7
  - @graphql-mesh/utils@0.103.7

## 0.103.6

### Patch Changes

- [#8092](https://github.com/ardatan/graphql-mesh/pull/8092)
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/cross-helpers@^0.4.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.8)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/types@^0.103.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.5)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/utils@^0.103.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.5)
    (to `dependencies`)
  - Added dependency [`tslib@^2.4.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.4.0) (to
    `dependencies`)
  - Removed dependency
    [`@graphql-mesh/cross-helpers@^0.4.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.8)
    (from `peerDependencies`)
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
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9),
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9),
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)]:
  - @graphql-mesh/cross-helpers@0.4.9
  - @graphql-mesh/string-interpolation@0.5.7
  - @graphql-mesh/types@0.103.6
  - @graphql-mesh/utils@0.103.6

## 0.103.5

### Patch Changes

- Updated dependencies
  [[`9f9f6fe`](https://github.com/ardatan/graphql-mesh/commit/9f9f6fe61c74eaa6572866eddd97c348307107a8)]:
  - @graphql-mesh/utils@0.103.5
  - @graphql-mesh/types@0.103.5

## 0.103.4

### Patch Changes

- Updated dependencies
  [[`8fcfe3f`](https://github.com/ardatan/graphql-mesh/commit/8fcfe3f78a0be53e3b474231bfe7ee0594e54f91)]:
  - @graphql-mesh/types@0.103.4
  - @graphql-mesh/utils@0.103.4

## 0.103.3

### Patch Changes

- Updated dependencies
  [[`6360755`](https://github.com/ardatan/graphql-mesh/commit/63607552017ed462c0555ad2e2ec6466c10d7ae4)]:
  - @graphql-mesh/utils@0.103.3
  - @graphql-mesh/types@0.103.3

## 0.103.2

### Patch Changes

- Updated dependencies
  [[`bfd8929`](https://github.com/ardatan/graphql-mesh/commit/bfd89297b0fe4dbdd0fecff8c35c316e874b9a56)]:
  - @graphql-mesh/utils@0.103.2
  - @graphql-mesh/types@0.103.2

## 0.103.1

### Patch Changes

- Updated dependencies
  [[`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac),
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac),
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)]:
  - @graphql-mesh/cross-helpers@0.4.8
  - @graphql-mesh/types@0.103.1
  - @graphql-mesh/utils@0.103.1

## 0.103.0

### Patch Changes

- Updated dependencies
  [[`0e49907`](https://github.com/ardatan/graphql-mesh/commit/0e49907cf19d91fe40c28237aa79bd55742b371f),
  [`9873b33`](https://github.com/ardatan/graphql-mesh/commit/9873b33f0cc6c3b3a3c3dc1a0a1cb18c827b8722)]:
  - @graphql-mesh/utils@0.103.0
  - @graphql-mesh/types@0.103.0

## 0.102.13

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.102.13
  - @graphql-mesh/utils@0.102.13

## 0.102.12

### Patch Changes

- Updated dependencies
  [[`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7)]:
  - @graphql-mesh/utils@0.102.12
  - @graphql-mesh/types@0.102.12

## 0.102.11

### Patch Changes

- Updated dependencies
  [[`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af),
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)]:
  - @graphql-mesh/types@0.102.11
  - @graphql-mesh/utils@0.102.11

## 0.102.10

### Patch Changes

- Updated dependencies
  [[`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71),
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)]:
  - @graphql-mesh/types@0.102.10
  - @graphql-mesh/utils@0.102.10

## 0.102.9

### Patch Changes

- Updated dependencies
  [[`fad4d27`](https://github.com/ardatan/graphql-mesh/commit/fad4d27bfebb80a374c2041b86ffab509845effe)]:
  - @graphql-mesh/utils@0.102.9
  - @graphql-mesh/types@0.102.9

## 0.102.8

### Patch Changes

- Updated dependencies
  [[`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)]:
  - @graphql-mesh/types@0.102.8
  - @graphql-mesh/utils@0.102.8

## 0.102.7

### Patch Changes

- Updated dependencies
  [[`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)]:
  - @graphql-mesh/cross-helpers@0.4.7
  - @graphql-mesh/types@0.102.7
  - @graphql-mesh/utils@0.102.7

## 0.102.6

### Patch Changes

- Updated dependencies
  [[`bf588d3`](https://github.com/ardatan/graphql-mesh/commit/bf588d372c0078378aaa24beea2da794af7949e6)]:
  - @graphql-mesh/utils@0.102.6
  - @graphql-mesh/types@0.102.6

## 0.102.5

### Patch Changes

- [#7595](https://github.com/ardatan/graphql-mesh/pull/7595)
  [`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.4)
    (from `^0.0.3`, in `dependencies`)

- [#7596](https://github.com/ardatan/graphql-mesh/pull/7596)
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.5)
    (from `^0.0.4`, in `dependencies`)

- [#7597](https://github.com/ardatan/graphql-mesh/pull/7597)
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.5)
    (from `^0.0.4`, in `dependencies`)
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

- [#7555](https://github.com/ardatan/graphql-mesh/pull/7555)
  [`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.3` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.3)
    (from `^0.0.2`, in `dependencies`)
- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/utils@0.102.2
  - @graphql-mesh/types@0.102.2

## 0.102.1

### Patch Changes

- [#7553](https://github.com/ardatan/graphql-mesh/pull/7553)
  [`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.2)
    (from `^0.0.1`, in `dependencies`)
- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de)]:
  - @graphql-mesh/utils@0.102.1
  - @graphql-mesh/types@0.102.1

## 0.102.0

### Patch Changes

- Updated dependencies
  [[`13fa835`](https://github.com/ardatan/graphql-mesh/commit/13fa835036c3671305fc831fa236f110c33d9965),
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)]:
  - @graphql-mesh/string-interpolation@0.5.6
  - @graphql-mesh/types@0.102.0
  - @graphql-mesh/utils@0.102.0

## 0.101.0

### Patch Changes

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
    [`@whatwg-node/disposablestack@^0.0.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.1)
    (to `dependencies`)
- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/utils@0.99.5
  - @graphql-mesh/types@0.99.5

## 0.99.4

### Patch Changes

- Updated dependencies
  [[`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)]:
  - @graphql-mesh/utils@0.99.4
  - @graphql-mesh/types@0.99.4

## 0.99.3

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3
  - @graphql-mesh/types@0.99.3

## 0.99.2

### Patch Changes

- Updated dependencies
  [[`b01f3ea`](https://github.com/ardatan/graphql-mesh/commit/b01f3eabdc42d8905e8d586a4845e8394c094033),
  [`0bdc18d`](https://github.com/ardatan/graphql-mesh/commit/0bdc18df3d150a61abf987b8829934ed4ca02eed),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e)]:
  - @graphql-mesh/string-interpolation@0.5.5
  - @graphql-mesh/types@0.99.2
  - @graphql-mesh/utils@0.99.2

## 0.99.1

### Patch Changes

- Updated dependencies
  [[`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)]:
  - @graphql-mesh/types@0.99.1
  - @graphql-mesh/utils@0.99.1

## 0.99.0

### Patch Changes

- Updated dependencies
  [[`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00)]:
  - @graphql-mesh/utils@0.99.0
  - @graphql-mesh/types@0.99.0

## 0.98.10

### Patch Changes

- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)]:
  - @graphql-mesh/cross-helpers@0.4.4
  - @graphql-mesh/types@0.98.10
  - @graphql-mesh/utils@0.98.10

## 0.98.9

### Patch Changes

- Updated dependencies
  [[`f985978`](https://github.com/ardatan/graphql-mesh/commit/f9859784ad854207e4d32bda11c904b5301610ee),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)]:
  - @graphql-mesh/utils@0.98.9
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

- Updated dependencies
  [[`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)]:
  - @graphql-mesh/types@0.98.0
  - @graphql-mesh/utils@0.98.0

## 0.97.5

### Patch Changes

- Updated dependencies
  [[`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)]:
  - @graphql-mesh/types@0.97.5
  - @graphql-mesh/utils@0.97.5

## 0.97.4

### Patch Changes

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
  - @graphql-mesh/utils@0.97.3

## 0.97.2

### Patch Changes

- Updated dependencies
  [[`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)]:
  - @graphql-mesh/types@0.97.2
  - @graphql-mesh/utils@0.97.2

## 0.97.1

### Patch Changes

- Updated dependencies
  [[`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)]:
  - @graphql-mesh/types@0.97.1
  - @graphql-mesh/utils@0.97.1

## 0.97.0

### Patch Changes

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a),
  [`70b05a2`](https://github.com/ardatan/graphql-mesh/commit/70b05a20a948b5ebed5306c14710c8839225cdad)]:
  - @graphql-mesh/types@0.97.0
  - @graphql-mesh/utils@0.97.0

## 0.96.6

### Patch Changes

- Updated dependencies
  [[`0f274ef`](https://github.com/ardatan/graphql-mesh/commit/0f274ef8177068da65e50e08607998d0ed63e8b9)]:
  - @graphql-mesh/utils@0.96.6
  - @graphql-mesh/types@0.96.6

## 0.96.5

### Patch Changes

- Updated dependencies
  [[`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)]:
  - @graphql-mesh/types@0.96.5
  - @graphql-mesh/utils@0.96.5

## 0.96.4

### Patch Changes

- Updated dependencies
  [[`ae7b085`](https://github.com/ardatan/graphql-mesh/commit/ae7b085e93ba911f03bbfd2a15ff9ca8be9f4de8)]:
  - @graphql-mesh/types@0.96.4
  - @graphql-mesh/utils@0.96.4

## 0.96.3

### Patch Changes

- Updated dependencies
  [[`ac26793`](https://github.com/ardatan/graphql-mesh/commit/ac26793e59f76f0839b61a8030e0eefc7383e640)]:
  - @graphql-mesh/types@0.96.3
  - @graphql-mesh/utils@0.96.3

## 0.96.2

### Patch Changes

- Updated dependencies
  [[`d758afa`](https://github.com/ardatan/graphql-mesh/commit/d758afa7da55cf3ed6b4ed9e8cccfd0ed67fe658),
  [`4fac014`](https://github.com/ardatan/graphql-mesh/commit/4fac01400544bc6e8b2a4ae55f1a4dd4771bbc5c)]:
  - @graphql-mesh/types@0.96.2
  - @graphql-mesh/utils@0.96.2

## 0.96.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.96.1
  - @graphql-mesh/utils@0.96.1

## 0.96.0

### Patch Changes

- Updated dependencies
  [[`5c6a8f784`](https://github.com/ardatan/graphql-mesh/commit/5c6a8f784a787641b90349e584b49de629cc41ff)]:
  - @graphql-mesh/types@0.96.0
  - @graphql-mesh/utils@0.96.0

## 0.95.12

### Patch Changes

- Updated dependencies
  [[`b4d38c55d`](https://github.com/ardatan/graphql-mesh/commit/b4d38c55df8c4d2aeb98325555979eb09d065906)]:
  - @graphql-mesh/string-interpolation@0.5.3
  - @graphql-mesh/utils@0.95.8
  - @graphql-mesh/types@0.95.8

## 0.95.11

### Patch Changes

- Updated dependencies
  [[`a13969c77`](https://github.com/Urigo/graphql-mesh/commit/a13969c77794c44493d7a9426be7e38a6d673c88)]:
  - @graphql-mesh/types@0.95.7
  - @graphql-mesh/utils@0.95.7

## 0.95.10

### Patch Changes

- Updated dependencies
  [[`8e1056cf9`](https://github.com/Urigo/graphql-mesh/commit/8e1056cf91b0e7069499f5102aaed163a0168597)]:
  - @graphql-mesh/string-interpolation@0.5.2
  - @graphql-mesh/utils@0.95.6
  - @graphql-mesh/types@0.95.6

## 0.95.9

### Patch Changes

- Updated dependencies
  [[`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781),
  [`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781)]:
  - @graphql-mesh/cross-helpers@0.4.1
  - @graphql-mesh/types@0.95.5
  - @graphql-mesh/utils@0.95.5

## 0.95.8

### Patch Changes

- [#5970](https://github.com/Urigo/graphql-mesh/pull/5970)
  [`96bef0c8f`](https://github.com/Urigo/graphql-mesh/commit/96bef0c8fd58f2a31ec3bb020ea222ba66c7af86)
  Thanks [@BabakScript](https://github.com/BabakScript)! - Avoid setting lazyConnect in case it's
  set false

## 0.95.7

### Patch Changes

- [#5963](https://github.com/Urigo/graphql-mesh/pull/5963)
  [`625e5d787`](https://github.com/Urigo/graphql-mesh/commit/625e5d7878d44abd7c9d1542bf5cdcd4e37e2411)
  Thanks [@BabakScript](https://github.com/BabakScript)! - Add lazyConnect to cache-redis

- Updated dependencies
  [[`625e5d787`](https://github.com/Urigo/graphql-mesh/commit/625e5d7878d44abd7c9d1542bf5cdcd4e37e2411)]:
  - @graphql-mesh/types@0.95.4
  - @graphql-mesh/utils@0.95.4

## 0.95.6

### Patch Changes

- Updated dependencies
  [[`33ae7a89a`](https://github.com/Urigo/graphql-mesh/commit/33ae7a89a13f40ebbe0a01620e378fe4a914df7f)]:
  - @graphql-mesh/types@0.95.3
  - @graphql-mesh/utils@0.95.3

## 0.95.5

### Patch Changes

- [#5838](https://github.com/Urigo/graphql-mesh/pull/5838)
  [`8380e8cb6`](https://github.com/Urigo/graphql-mesh/commit/8380e8cb6e2c7ebb3c5b66da4cc1753e0eadeab9)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency [`ioredis@^5.3.2` ↗︎](https://www.npmjs.com/package/ioredis/v/5.3.2) (from
    `5.3.2`, in `dependencies`)
  - Updated dependency
    [`ioredis-mock@^8.8.3` ↗︎](https://www.npmjs.com/package/ioredis-mock/v/8.8.3) (from `8.8.3`,
    in `dependencies`)

- [#5838](https://github.com/Urigo/graphql-mesh/pull/5838)
  [`8380e8cb6`](https://github.com/Urigo/graphql-mesh/commit/8380e8cb6e2c7ebb3c5b66da4cc1753e0eadeab9)
  Thanks [@ardatan](https://github.com/ardatan)! - Debug messages for Redis

## 0.95.4

### Patch Changes

- [#5834](https://github.com/Urigo/graphql-mesh/pull/5834)
  [`eba22f979`](https://github.com/Urigo/graphql-mesh/commit/eba22f9794efe7fa7ae01056c703f639e3062985)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`ioredis-mock@8.8.3` ↗︎](https://www.npmjs.com/package/ioredis-mock/v/8.8.3) (from `8.8.2`, in
    `dependencies`)

## 0.95.3

### Patch Changes

- [#5828](https://github.com/Urigo/graphql-mesh/pull/5828)
  [`4a54f1803`](https://github.com/Urigo/graphql-mesh/commit/4a54f18034a22fc104b6e08ab90c73c84121d43c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`ioredis-mock@8.8.2` ↗︎](https://www.npmjs.com/package/ioredis-mock/v/8.8.2) (from `8.8.1`, in
    `dependencies`)

## 0.95.2

### Patch Changes

- Updated dependencies
  [[`d8da4b282`](https://github.com/Urigo/graphql-mesh/commit/d8da4b282ab15ab6d0ea24c78c172e31fa1170ea)]:
  - @graphql-mesh/types@0.95.2
  - @graphql-mesh/utils@0.95.2

## 0.95.1

### Patch Changes

- Updated dependencies
  [[`7cdc69e04`](https://github.com/Urigo/graphql-mesh/commit/7cdc69e0454ab99ea5c3b8072ac28da8f81a8796)]:
  - @graphql-mesh/types@0.95.1
  - @graphql-mesh/utils@0.95.1

## 0.95.0

### Patch Changes

- Updated dependencies
  [[`bb50c4f94`](https://github.com/Urigo/graphql-mesh/commit/bb50c4f941caa59d69186d1415dce5773596e8bc)]:
  - @graphql-mesh/types@0.95.0
  - @graphql-mesh/utils@0.95.0

## 0.94.6

### Patch Changes

- Updated dependencies
  [[`d1310cdff`](https://github.com/Urigo/graphql-mesh/commit/d1310cdff53c53d5342e28b7c0c1af1dd25c6c75)]:
  - @graphql-mesh/utils@0.94.6
  - @graphql-mesh/types@0.94.6

## 0.94.5

### Patch Changes

- Updated dependencies
  [[`f11e9b307`](https://github.com/Urigo/graphql-mesh/commit/f11e9b307f1336d5ead9a75befdb61de963c6c5b)]:
  - @graphql-mesh/utils@0.94.5
  - @graphql-mesh/types@0.94.5

## 0.94.4

### Patch Changes

- [#5684](https://github.com/Urigo/graphql-mesh/pull/5684)
  [`49d1cf5d9`](https://github.com/Urigo/graphql-mesh/commit/49d1cf5d90a48e3606296f8aa3432ca8cb893226)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`ioredis-mock@8.8.1` ↗︎](https://www.npmjs.com/package/ioredis-mock/v/8.8.1) (from `8.7.0`, in
    `dependencies`)
- Updated dependencies
  [[`ff1678eea`](https://github.com/Urigo/graphql-mesh/commit/ff1678eeabec67edaa4991b938ef81437cd9361e)]:
  - @graphql-mesh/types@0.94.4
  - @graphql-mesh/utils@0.94.4

## 0.94.3

### Patch Changes

- Updated dependencies
  [[`fba66c6fc`](https://github.com/Urigo/graphql-mesh/commit/fba66c6fc7a0ca15393df8ae5382d97eb0ae8fcf)]:
  - @graphql-mesh/string-interpolation@0.5.1
  - @graphql-mesh/utils@0.94.3
  - @graphql-mesh/types@0.94.3

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
    [`ioredis-mock@8.7.0` ↗︎](https://www.npmjs.com/package/ioredis-mock/v/8.7.0) (from `8.6.0`, in
    `dependencies`)
- Updated dependencies
  [[`cff645677`](https://github.com/Urigo/graphql-mesh/commit/cff645677c680e248ed718e5bb98ece5a41f9c0f),
  [`cff645677`](https://github.com/Urigo/graphql-mesh/commit/cff645677c680e248ed718e5bb98ece5a41f9c0f),
  [`72fe781c1`](https://github.com/Urigo/graphql-mesh/commit/72fe781c15f20ad2af792b8245aedfdcc742e048),
  [`a597261db`](https://github.com/Urigo/graphql-mesh/commit/a597261dbb4f18c47bf7323695e853950ae500df)]:
  - @graphql-mesh/types@1.0.0
  - @graphql-mesh/utils@1.0.0

## 0.11.23

### Patch Changes

- [#5322](https://github.com/Urigo/graphql-mesh/pull/5322)
  [`d54b8cf29`](https://github.com/Urigo/graphql-mesh/commit/d54b8cf29490e86988c0b68a129372557d93e7a2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`ioredis-mock@8.5.0` ↗︎](https://www.npmjs.com/package/ioredis-mock/v/8.5.0) (from `8.4.0`, in
    `dependencies`)

- [#5324](https://github.com/Urigo/graphql-mesh/pull/5324)
  [`3d4d11ac8`](https://github.com/Urigo/graphql-mesh/commit/3d4d11ac82c57549eeb6cec5ed651de102cc9205)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`ioredis-mock@8.6.0` ↗︎](https://www.npmjs.com/package/ioredis-mock/v/8.6.0) (from `8.5.0`, in
    `dependencies`)

- [#5328](https://github.com/Urigo/graphql-mesh/pull/5328)
  [`0d73b3f71`](https://github.com/Urigo/graphql-mesh/commit/0d73b3f71e847d751eea130df62d795c3b06a192)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`ioredis@5.3.2` ↗︎](https://www.npmjs.com/package/ioredis/v/5.3.2) (from
    `5.3.1`, in `dependencies`)
- Updated dependencies
  [[`0d73b3f71`](https://github.com/Urigo/graphql-mesh/commit/0d73b3f71e847d751eea130df62d795c3b06a192),
  [`0d73b3f71`](https://github.com/Urigo/graphql-mesh/commit/0d73b3f71e847d751eea130df62d795c3b06a192),
  [`ed2232e71`](https://github.com/Urigo/graphql-mesh/commit/ed2232e715c1dadc3817d8b3b469f75ddbae6ac6)]:
  - @graphql-mesh/types@0.91.15
  - @graphql-mesh/utils@0.43.23

## 0.11.22

### Patch Changes

- [#5265](https://github.com/Urigo/graphql-mesh/pull/5265)
  [`e281e3a27`](https://github.com/Urigo/graphql-mesh/commit/e281e3a27b937813789cbcdce3d6fd716f434aad)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`ioredis-mock@8.4.0` ↗︎](https://www.npmjs.com/package/ioredis-mock/v/8.4.0) (from `8.2.7`, in
    `dependencies`)
- Updated dependencies
  [[`870de5dae`](https://github.com/Urigo/graphql-mesh/commit/870de5dae08a7e43d9aa0f52d5d504cffb4d8fc8),
  [`aea134764`](https://github.com/Urigo/graphql-mesh/commit/aea1347645c322437ed6ccfadabcfc23065bc9c8),
  [`a1e08193b`](https://github.com/Urigo/graphql-mesh/commit/a1e08193be3ac8cab5f6f8c84025f934134369b6),
  [`abc0c8747`](https://github.com/Urigo/graphql-mesh/commit/abc0c8747b274e011f5b8387233fe96d4f702035),
  [`6aa7da6f8`](https://github.com/Urigo/graphql-mesh/commit/6aa7da6f8492adb1af5598e501d089b7b008637a)]:
  - @graphql-mesh/types@0.91.13
  - @graphql-mesh/string-interpolation@0.4.4
  - @graphql-mesh/utils@0.43.21

## 0.11.21

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

## 0.11.20

### Patch Changes

- [#5250](https://github.com/Urigo/graphql-mesh/pull/5250)
  [`1105e4399`](https://github.com/Urigo/graphql-mesh/commit/1105e439934c319d87267832e0edcc4a8dd423f4)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`ioredis-mock@8.2.7` ↗︎](https://www.npmjs.com/package/ioredis-mock/v/8.2.7) (from `8.2.6`, in
    `dependencies`)
- Updated dependencies
  [[`7e7096695`](https://github.com/Urigo/graphql-mesh/commit/7e709669564fa427332b8af00bc66234485f3d54)]:
  - @graphql-mesh/types@0.91.11
  - @graphql-mesh/utils@0.43.19

## 0.11.19

### Patch Changes

- Updated dependencies
  [[`3f658a771`](https://github.com/Urigo/graphql-mesh/commit/3f658a7711cd68bc7451c1494699c5ffb8e919ce)]:
  - @graphql-mesh/utils@0.43.18
  - @graphql-mesh/types@0.91.10

## 0.11.18

### Patch Changes

- Updated dependencies
  [[`a272fdbca`](https://github.com/Urigo/graphql-mesh/commit/a272fdbca655b17119fb1dcb1c44498f387b1edc)]:
  - @graphql-mesh/types@0.91.9
  - @graphql-mesh/utils@0.43.17

## 0.11.17

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.91.8
  - @graphql-mesh/utils@0.43.16

## 0.11.16

### Patch Changes

- Updated dependencies
  [[`fa2c010c1`](https://github.com/Urigo/graphql-mesh/commit/fa2c010c13f95ce401c345a1330d8fddabeebc17)]:
  - @graphql-mesh/utils@0.43.15
  - @graphql-mesh/types@0.91.7

## 0.11.15

### Patch Changes

- Updated dependencies
  [[`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391),
  [`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391)]:
  - @graphql-mesh/types@0.91.6
  - @graphql-mesh/utils@0.43.14

## 0.11.14

### Patch Changes

- Updated dependencies
  [[`5c19f8d6f`](https://github.com/Urigo/graphql-mesh/commit/5c19f8d6f79f2d9bfbeb6458c8dc7a1729c37db9)]:
  - @graphql-mesh/types@0.91.5
  - @graphql-mesh/utils@0.43.13

## 0.11.13

### Patch Changes

- Updated dependencies
  [[`63ab17f0b`](https://github.com/Urigo/graphql-mesh/commit/63ab17f0bd402b5a3923d752ba715f556f3beadd)]:
  - @graphql-mesh/types@0.91.4
  - @graphql-mesh/utils@0.43.12

## 0.11.12

### Patch Changes

- Updated dependencies
  [[`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e),
  [`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e)]:
  - @graphql-mesh/types@0.91.3
  - @graphql-mesh/utils@0.43.11

## 0.11.11

### Patch Changes

- Updated dependencies
  [[`975715275`](https://github.com/Urigo/graphql-mesh/commit/9757152751e37062bca4ba114bee65a0c79a3d4d),
  [`989a47802`](https://github.com/Urigo/graphql-mesh/commit/989a478027b703ab969d529f09bc83071fe4f96f)]:
  - @graphql-mesh/cross-helpers@0.3.3
  - @graphql-mesh/types@0.91.2
  - @graphql-mesh/utils@0.43.10

## 0.11.10

### Patch Changes

- Updated dependencies
  [[`d694ccc1f`](https://github.com/Urigo/graphql-mesh/commit/d694ccc1f5a2cbc3ed97778a3210594005f2830b)]:
  - @graphql-mesh/utils@0.43.9
  - @graphql-mesh/types@0.91.1

## 0.11.9

### Patch Changes

- [#5091](https://github.com/Urigo/graphql-mesh/pull/5091)
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`ioredis@5.3.1` ↗︎](https://www.npmjs.com/package/ioredis/v/5.3.1) (from
    `5.3.0`, in `dependencies`)
  - Updated dependency
    [`ioredis-mock@8.2.6` ↗︎](https://www.npmjs.com/package/ioredis-mock/v/8.2.6) (from `8.2.5`, in
    `dependencies`)
- Updated dependencies
  [[`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`7e8bb87dd`](https://github.com/Urigo/graphql-mesh/commit/7e8bb87ddf4cb1210db6873334bdd18007cc0552)]:
  - @graphql-mesh/cross-helpers@0.3.2
  - @graphql-mesh/types@0.91.0
  - @graphql-mesh/utils@0.43.8

## 0.11.8

### Patch Changes

- [#5087](https://github.com/Urigo/graphql-mesh/pull/5087)
  [`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`ioredis-mock@8.2.5` ↗︎](https://www.npmjs.com/package/ioredis-mock/v/8.2.5) (from `8.2.2`, in
    `dependencies`)
- Updated dependencies
  [[`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72),
  [`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72),
  [`bcf29dfd0`](https://github.com/Urigo/graphql-mesh/commit/bcf29dfd02d19cf5c770b83fc627f059569a0fac)]:
  - @graphql-mesh/types@0.90.0
  - @graphql-mesh/utils@0.43.7

## 0.11.7

### Patch Changes

- [#5073](https://github.com/Urigo/graphql-mesh/pull/5073)
  [`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`ioredis@5.3.0` ↗︎](https://www.npmjs.com/package/ioredis/v/5.3.0) (from
    `5.2.5`, in `dependencies`)
- Updated dependencies
  [[`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5),
  [`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5)]:
  - @graphql-mesh/types@0.89.5
  - @graphql-mesh/utils@0.43.6

## 0.11.6

### Patch Changes

- [#5061](https://github.com/Urigo/graphql-mesh/pull/5061)
  [`cd389e465`](https://github.com/Urigo/graphql-mesh/commit/cd389e465c12e24cfb443ffb843a03843c4028ec)
  Thanks [@ardatan](https://github.com/ardatan)! - Convert `port` to `string` just in case the user
  gives a number

## 0.11.5

### Patch Changes

- [#5034](https://github.com/Urigo/graphql-mesh/pull/5034)
  [`7bba730b0`](https://github.com/Urigo/graphql-mesh/commit/7bba730b0ec024633ed12c040050558e68697824)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`ioredis@5.2.5` ↗︎](https://www.npmjs.com/package/ioredis/v/5.2.5) (from
    `5.2.4`, in `dependencies`)

- [#4930](https://github.com/Urigo/graphql-mesh/pull/4930)
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Prettier fixes

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

## 0.11.4

### Patch Changes

- Updated dependencies
  [[`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9),
  [`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9)]:
  - @graphql-mesh/types@0.89.3
  - @graphql-mesh/utils@0.43.4

## 0.11.3

### Patch Changes

- Updated dependencies
  [[`deb9912e0`](https://github.com/Urigo/graphql-mesh/commit/deb9912e0bc2ae782c9570b60a7224b47af341eb)]:
  - @graphql-mesh/string-interpolation@0.4.1
  - @graphql-mesh/types@0.89.2
  - @graphql-mesh/utils@0.43.3

## 0.11.2

### Patch Changes

- Updated dependencies
  [[`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43),
  [`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43)]:
  - @graphql-mesh/types@0.89.1
  - @graphql-mesh/utils@0.43.2

## 0.11.1

### Patch Changes

- Updated dependencies
  [[`3edaa00ac`](https://github.com/Urigo/graphql-mesh/commit/3edaa00ac772d519e351e620bfa670514db886e5)]:
  - @graphql-mesh/types@0.89.0
  - @graphql-mesh/utils@0.43.1

## 0.11.0

### Minor Changes

- [#4821](https://github.com/Urigo/graphql-mesh/pull/4821)
  [`1a28c92c2`](https://github.com/Urigo/graphql-mesh/commit/1a28c92c2d67b89b48581b7bb1414d1404428cdb)
  Thanks [@ardatan](https://github.com/ardatan)! - Update build flow to fully support both CommonJS
  and ESM

### Patch Changes

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

## 0.10.47

### Patch Changes

- Updated dependencies
  [[`eba73c626`](https://github.com/Urigo/graphql-mesh/commit/eba73c6261a2fdde8ece31915202203b70ff0e5f)]:
  - @graphql-mesh/utils@0.42.9
  - @graphql-mesh/types@0.87.1

## 0.10.46

### Patch Changes

- Updated dependencies
  [[`0d9771428`](https://github.com/Urigo/graphql-mesh/commit/0d97714284a6eea31c2c9420addd4a1518584924),
  [`686b3301b`](https://github.com/Urigo/graphql-mesh/commit/686b3301b2441bc095a379d95e77686b4f5ceb70)]:
  - @graphql-mesh/types@0.87.0
  - @graphql-mesh/utils@0.42.8

## 0.10.45

### Patch Changes

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

## 0.10.44

### Patch Changes

- [#4779](https://github.com/Urigo/graphql-mesh/pull/4779)
  [`85e5071d0`](https://github.com/Urigo/graphql-mesh/commit/85e5071d084d5372830213511f55f4a30a17bb33)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`ioredis@5.2.4` ↗︎](https://www.npmjs.com/package/ioredis/v/5.2.4) (from
    `5.2.3`, in `dependencies`)
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

## 0.10.43

### Patch Changes

- Updated dependencies
  [[`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a),
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a),
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a)]:
  - @graphql-mesh/cross-helpers@0.2.8
  - @graphql-mesh/types@0.85.6
  - @graphql-mesh/utils@0.42.5

## 0.10.42

### Patch Changes

- Updated dependencies
  [[`d5f2d950e`](https://github.com/Urigo/graphql-mesh/commit/d5f2d950e6318a74c062c9dbc436d5e9c0e8d59d)]:
  - @graphql-mesh/utils@0.42.4
  - @graphql-mesh/types@0.85.5

## 0.10.41

### Patch Changes

- Updated dependencies
  [[`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd),
  [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd),
  [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd)]:
  - @graphql-mesh/cross-helpers@0.2.7
  - @graphql-mesh/types@0.85.4
  - @graphql-mesh/utils@0.42.3

## 0.10.40

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

## 0.10.39

### Patch Changes

- Updated dependencies
  [[`5c87cfc60`](https://github.com/Urigo/graphql-mesh/commit/5c87cfc60501213e8701482b093490ec1a5fce23),
  [`09c286994`](https://github.com/Urigo/graphql-mesh/commit/09c28699441cda92f79e4e9b8464e7be5f46a786)]:
  - @graphql-mesh/string-interpolation@0.3.3
  - @graphql-mesh/types@0.85.2
  - @graphql-mesh/utils@0.42.1

## 0.10.38

### Patch Changes

- Updated dependencies
  [[`398af2bf6`](https://github.com/Urigo/graphql-mesh/commit/398af2bf602182ca315bc8d99d2237ad1a16ee48),
  [`1d61fbcec`](https://github.com/Urigo/graphql-mesh/commit/1d61fbcecb8d5b286bb1c2e727bdf7d233c566da)]:
  - @graphql-mesh/types@0.85.1
  - @graphql-mesh/utils@0.42.0

## 0.10.37

### Patch Changes

- Updated dependencies
  [[`6fb57d3ba`](https://github.com/Urigo/graphql-mesh/commit/6fb57d3ba6ce68e47d9f5dbf54e57d178441fa18),
  [`814f2d516`](https://github.com/Urigo/graphql-mesh/commit/814f2d51692df593fcf368765e9c8a0ce99f46bd)]:
  - @graphql-mesh/types@0.85.0
  - @graphql-mesh/utils@0.41.22

## 0.10.36

### Patch Changes

- Updated dependencies
  [[`637e9e9d8`](https://github.com/Urigo/graphql-mesh/commit/637e9e9d8a702cf28cde48137a0f73bab7628f6d)]:
  - @graphql-mesh/types@0.84.10
  - @graphql-mesh/utils@0.41.21

## 0.10.35

### Patch Changes

- Updated dependencies
  [[`dd831a7d1`](https://github.com/Urigo/graphql-mesh/commit/dd831a7d1256400d1b7441cfb99b517cf856ce5b)]:
  - @graphql-mesh/types@0.84.9
  - @graphql-mesh/utils@0.41.20

## 0.10.34

### Patch Changes

- Updated dependencies
  [[`5b44abcd2`](https://github.com/Urigo/graphql-mesh/commit/5b44abcd2aaa765ee329539112d9dface063efa6)]:
  - @graphql-mesh/utils@0.41.19
  - @graphql-mesh/types@0.84.8

## 0.10.33

### Patch Changes

- Updated dependencies
  [[`ffb301435`](https://github.com/Urigo/graphql-mesh/commit/ffb3014353c17d23a03cf8001eba606c85c2043f),
  [`ffb301435`](https://github.com/Urigo/graphql-mesh/commit/ffb3014353c17d23a03cf8001eba606c85c2043f)]:
  - @graphql-mesh/types@0.84.7
  - @graphql-mesh/utils@0.41.18

## 0.10.32

### Patch Changes

- Updated dependencies
  [[`31a64714a`](https://github.com/Urigo/graphql-mesh/commit/31a64714a3e47dc41b950b3e1cfd1a49e7ff2d8a),
  [`31a64714a`](https://github.com/Urigo/graphql-mesh/commit/31a64714a3e47dc41b950b3e1cfd1a49e7ff2d8a)]:
  - @graphql-mesh/types@0.84.6
  - @graphql-mesh/utils@0.41.17

## 0.10.31

### Patch Changes

- Updated dependencies
  [[`88ab8f9ae`](https://github.com/Urigo/graphql-mesh/commit/88ab8f9ae32a4d0f52c978d625082abe075bebe4)]:
  - @graphql-mesh/utils@0.41.16
  - @graphql-mesh/types@0.84.5

## 0.10.30

### Patch Changes

- Updated dependencies
  [[`186e37bcd`](https://github.com/Urigo/graphql-mesh/commit/186e37bcd94c6eae16b30abd2f4c8b04d2ef422e)]:
  - @graphql-mesh/utils@0.41.15
  - @graphql-mesh/types@0.84.4

## 0.10.29

### Patch Changes

- Updated dependencies
  [[`93f4ed55d`](https://github.com/Urigo/graphql-mesh/commit/93f4ed55de7b9f2a55e11bf1df4ab7b4c59b3825)]:
  - @graphql-mesh/utils@0.41.14
  - @graphql-mesh/types@0.84.3

## 0.10.28

### Patch Changes

- Updated dependencies
  [[`ff251e4c7`](https://github.com/Urigo/graphql-mesh/commit/ff251e4c7654306d3030774447c991788768e148)]:
  - @graphql-mesh/types@0.84.2
  - @graphql-mesh/utils@0.41.13

## 0.10.27

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.84.1
  - @graphql-mesh/utils@0.41.12

## 0.10.26

### Patch Changes

- Updated dependencies
  [[`077e65c18`](https://github.com/Urigo/graphql-mesh/commit/077e65c1857aaefa2689f33decc9e72ded281c94),
  [`ee1cb6f76`](https://github.com/Urigo/graphql-mesh/commit/ee1cb6f7620f71fd824e69f4171cfef6c5d51794)]:
  - @graphql-mesh/types@0.84.0
  - @graphql-mesh/utils@0.41.11

## 0.10.25

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.83.5
  - @graphql-mesh/utils@0.41.10

## 0.10.24

### Patch Changes

- [#4439](https://github.com/Urigo/graphql-mesh/pull/4439)
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/types@0.83.3` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.83.3)
    (from `0.82.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@0.41.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.41.8)
    (from `0.41.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/cross-helpers@0.2.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.2.5)
    (from `0.2.3`, in `dependencies`)

- Updated dependencies
  [[`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2),
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2),
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2)]:
  - @graphql-mesh/cross-helpers@0.2.6
  - @graphql-mesh/types@0.83.4
  - @graphql-mesh/utils@0.41.9

## 0.10.23

### Patch Changes

- Updated dependencies
  [[`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f),
  [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f),
  [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f)]:
  - @graphql-mesh/cross-helpers@0.2.5
  - @graphql-mesh/types@0.83.3
  - @graphql-mesh/utils@0.41.8

## 0.10.22

### Patch Changes

- Updated dependencies
  [[`d84f81d94`](https://github.com/Urigo/graphql-mesh/commit/d84f81d9487ce228125863b8b283adab75daff19)]:
  - @graphql-mesh/utils@0.41.7
  - @graphql-mesh/types@0.83.2

## 0.10.21

### Patch Changes

- Updated dependencies
  [[`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8)]:
  - @graphql-mesh/utils@0.41.6
  - @graphql-mesh/types@0.83.1

## 0.10.20

### Patch Changes

- Updated dependencies
  [[`a56ebcec5`](https://github.com/Urigo/graphql-mesh/commit/a56ebcec503402fbdb3d4e3561fd2e38e4dd5c43),
  [`24afabece`](https://github.com/Urigo/graphql-mesh/commit/24afabece51aee171f902776d3f59b4a17026c49),
  [`44b868196`](https://github.com/Urigo/graphql-mesh/commit/44b86819695a298e60b1d7b6c54ae2772e8f1588)]:
  - @graphql-mesh/types@0.83.0
  - @graphql-mesh/utils@0.41.5

## 0.10.19

### Patch Changes

- Updated dependencies
  [[`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53),
  [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53),
  [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53)]:
  - @graphql-mesh/cross-helpers@0.2.4
  - @graphql-mesh/types@0.82.3
  - @graphql-mesh/utils@0.41.4

## 0.10.18

### Patch Changes

- Updated dependencies
  [[`b9bb80094`](https://github.com/Urigo/graphql-mesh/commit/b9bb8009407d27440267a5e9a7ec5dbfecc9bf8f)]:
  - @graphql-mesh/types@0.82.2
  - @graphql-mesh/utils@0.41.3

## 0.10.17

### Patch Changes

- Updated dependencies
  [[`3165827f7`](https://github.com/Urigo/graphql-mesh/commit/3165827f74b48a914b9604b024cd1318c211aa14)]:
  - @graphql-mesh/types@0.82.1
  - @graphql-mesh/utils@0.41.2

## 0.10.16

### Patch Changes

- Updated dependencies
  [[`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9),
  [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9)]:
  - @graphql-mesh/types@0.82.0
  - @graphql-mesh/utils@0.41.1

## 0.10.15

### Patch Changes

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

## 0.10.14

### Patch Changes

- [`51cd8f65b`](https://github.com/Urigo/graphql-mesh/commit/51cd8f65b9fcd88ae7e6a70220a84a3306376c86)
  Thanks [@ardatan](https://github.com/ardatan)! - dependency updates:

  - Updated dependency [`ioredis@5.2.3` ↗︎](https://www.npmjs.com/package/ioredis/v/5.2.3) (from
    `5.2.2`, in `dependencies`)

- Updated dependencies
  [[`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824),
  [`be79b20a5`](https://github.com/Urigo/graphql-mesh/commit/be79b20a59b14d5d79bfeb260e4ecabc58c26efb),
  [`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824)]:
  - @graphql-mesh/utils@0.40.0
  - @graphql-mesh/types@0.80.2

## 0.10.13

### Patch Changes

- Updated dependencies
  [[`f23e14eba`](https://github.com/Urigo/graphql-mesh/commit/f23e14ebaf7c6a869207edc43b0e2a8114d0d21f)]:
  - @graphql-mesh/utils@0.39.0
  - @graphql-mesh/types@0.80.1

## 0.10.12

### Patch Changes

- Updated dependencies
  [[`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319)]:
  - @graphql-mesh/types@0.80.0
  - @graphql-mesh/utils@0.38.1

## 0.10.11

### Patch Changes

- Updated dependencies
  [[`b162269f7`](https://github.com/Urigo/graphql-mesh/commit/b162269f70a90594962792ffaaa40d3a7ee9f4e4),
  [`2ad667d96`](https://github.com/Urigo/graphql-mesh/commit/2ad667d964545ed47170cfa4f9393282edc2073b)]:
  - @graphql-mesh/types@0.79.0
  - @graphql-mesh/utils@0.38.0
  - @graphql-mesh/string-interpolation@0.3.2

## 0.10.10

### Patch Changes

- Updated dependencies
  [[`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2),
  [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968),
  [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2),
  [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968),
  [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2),
  [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968)]:
  - @graphql-mesh/cross-helpers@0.2.2
  - @graphql-mesh/string-interpolation@0.3.1
  - @graphql-mesh/types@0.78.8
  - @graphql-mesh/utils@0.37.9

## 0.10.9

### Patch Changes

- Updated dependencies
  [[`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73),
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73),
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73),
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)]:
  - @graphql-mesh/cross-helpers@0.2.1
  - @graphql-mesh/types@0.78.7
  - @graphql-mesh/utils@0.37.8

## 0.10.8

### Patch Changes

- Updated dependencies
  [[`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18),
  [`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b)]:
  - @graphql-mesh/utils@0.37.7
  - @graphql-mesh/types@0.78.6

## 0.10.7

### Patch Changes

- Updated dependencies [c88a34d82]
  - @graphql-mesh/types@0.78.5
  - @graphql-mesh/utils@0.37.6

## 0.10.6

### Patch Changes

- Updated dependencies [30d046724]
  - @graphql-mesh/utils@0.37.5
  - @graphql-mesh/types@0.78.4

## 0.10.5

### Patch Changes

- Updated dependencies [738e2f378]
  - @graphql-mesh/types@0.78.3
  - @graphql-mesh/utils@0.37.4

## 0.10.4

### Patch Changes

- Updated dependencies [a2ef35c35]
  - @graphql-mesh/types@0.78.2
  - @graphql-mesh/utils@0.37.3

## 0.10.3

### Patch Changes

- @graphql-mesh/types@0.78.1
- @graphql-mesh/utils@0.37.2

## 0.10.2

### Patch Changes

- Updated dependencies [6e6fd4ab7]
- Updated dependencies [bcd9355ee]
  - @graphql-mesh/utils@0.37.1
  - @graphql-mesh/types@0.78.0

## 0.10.1

### Patch Changes

- Updated dependencies [66f5d0189]
- Updated dependencies [0401c7617]
  - @graphql-mesh/types@0.77.1
  - @graphql-mesh/cross-helpers@0.2.0
  - @graphql-mesh/utils@0.37.0

## 0.10.0

### Minor Changes

- 12e1e5d72: **New Cloudflare KV Cache support!**

  Now you can basically use Cloudflare Workers' KV Caching system within Mesh;

  ```yaml
  cache:
    cfKv:
      namespace: MESH
  ```

  **Breaking changes for other cache packages**

  Now cache implementations should implement `getKeysByPrefix` that returns keys starting with the
  given prefix.

  **Response Cache Plugin Improvements**

  Response Cache plugin needs some complicated cache storage. So the relational entries related to
  specific cached responses and entities are now kept as seperate cache entries. Thanks to new
  `getKeysByPrefix`, we can now get a response by an entity id for example easier which is more
  performant.

### Patch Changes

- 19ac24889: fix(redis): add missing string interpolation for URL parameter

  ```yaml
  cache:
    redis:
      url: '{env.REDIS_DSN}'
  ```

  This wasn't working before and user gets a random parse error.

- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
  - @graphql-mesh/cross-helpers@0.1.7
  - @graphql-mesh/types@0.77.0
  - @graphql-mesh/utils@0.36.1

## 0.9.14

### Patch Changes

- Updated dependencies [19d06f6c9]
- Updated dependencies [19d06f6c9]
- Updated dependencies [a0950ac6f]
  - @graphql-mesh/utils@0.36.0
  - @graphql-mesh/types@0.76.0
  - @graphql-mesh/cache-localforage@0.6.14

## 0.9.13

### Patch Changes

- Updated dependencies [d4754ad08]
- Updated dependencies [2df026e90]
  - @graphql-mesh/types@0.75.0
  - @graphql-mesh/cache-localforage@0.6.13
  - @graphql-mesh/utils@0.35.7

## 0.9.12

### Patch Changes

- Updated dependencies [ed9ba7f48]
  - @graphql-mesh/types@0.74.2
  - @graphql-mesh/utils@0.35.6
  - @graphql-mesh/cache-localforage@0.6.12

## 0.9.11

### Patch Changes

- Updated dependencies [41cfb46b4]
  - @graphql-mesh/utils@0.35.5
  - @graphql-mesh/cache-localforage@0.6.11
  - @graphql-mesh/types@0.74.1

## 0.9.10

### Patch Changes

- Updated dependencies [13b9b30f7]
  - @graphql-mesh/string-interpolation@0.3.0
  - @graphql-mesh/types@0.74.0
  - @graphql-mesh/utils@0.35.4
  - @graphql-mesh/cache-localforage@0.6.10

## 0.9.9

### Patch Changes

- Updated dependencies [9733f490c]
  - @graphql-mesh/utils@0.35.3
  - @graphql-mesh/cache-localforage@0.6.9
  - @graphql-mesh/types@0.73.3

## 0.9.8

### Patch Changes

- 3c0366d2c: - Support import.meta.env instead of process.env for browsers
  - Ponyfill `util.inspect` only if it is not Node env
- Updated dependencies [3c0366d2c]
- Updated dependencies [3c0366d2c]
  - @graphql-mesh/cross-helpers@0.1.6
  - @graphql-mesh/utils@0.35.2
  - @graphql-mesh/cache-localforage@0.6.8
  - @graphql-mesh/types@0.73.2

## 0.9.7

### Patch Changes

- Updated dependencies [abe9fcc41]
  - @graphql-mesh/utils@0.35.1
  - @graphql-mesh/cache-localforage@0.6.7
  - @graphql-mesh/types@0.73.1

## 0.9.6

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
  - @graphql-mesh/cache-localforage@0.6.6

## 0.9.5

### Patch Changes

- Updated dependencies [43eb3d2c2]
  - @graphql-mesh/utils@0.34.10
  - @graphql-mesh/cache-localforage@0.6.5
  - @graphql-mesh/types@0.72.5

## 0.9.4

### Patch Changes

- Updated dependencies [55ad5ea44]
  - @graphql-mesh/cache-localforage@0.6.4
  - @graphql-mesh/utils@0.34.9
  - @graphql-mesh/types@0.72.4

## 0.9.3

### Patch Changes

- Updated dependencies [31efa964e]
  - @graphql-mesh/utils@0.34.8
  - @graphql-mesh/cache-localforage@0.6.3
  - @graphql-mesh/types@0.72.3

## 0.9.2

### Patch Changes

- @graphql-mesh/utils@0.34.7
- @graphql-mesh/types@0.72.2
- @graphql-mesh/cache-localforage@0.6.2

## 0.9.1

### Patch Changes

- Updated dependencies [b9beacca2]
  - @graphql-mesh/utils@0.34.6
  - @graphql-mesh/cache-localforage@0.6.1
  - @graphql-mesh/types@0.72.1

## 0.9.0

### Minor Changes

- fa2542468: Use Localforage by default and drop inmemory-lru

### Patch Changes

- Updated dependencies [fa2542468]
  - @graphql-mesh/cache-localforage@0.6.0
  - @graphql-mesh/types@0.72.0
  - @graphql-mesh/utils@0.34.5

## 0.8.12

### Patch Changes

- Updated dependencies [ddbbec8a8]
  - @graphql-mesh/utils@0.34.4
  - @graphql-mesh/cache-inmemory-lru@0.6.18
  - @graphql-mesh/types@0.71.4

## 0.8.11

### Patch Changes

- Updated dependencies [2e9addd80]
  - @graphql-mesh/utils@0.34.3
  - @graphql-mesh/cache-inmemory-lru@0.6.17
  - @graphql-mesh/types@0.71.3

## 0.8.10

### Patch Changes

- @graphql-mesh/types@0.71.2
- @graphql-mesh/cache-inmemory-lru@0.6.16
- @graphql-mesh/utils@0.34.2

## 0.8.9

### Patch Changes

- 7856f92d3: Bump all packages
- Updated dependencies [7856f92d3]
  - @graphql-mesh/cache-inmemory-lru@0.6.15
  - @graphql-mesh/types@0.71.1
  - @graphql-mesh/utils@0.34.1

## 0.8.8

### Patch Changes

- Updated dependencies [f963b57ce]
- Updated dependencies [0644f31f2]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
  - @graphql-mesh/types@0.71.0
  - @graphql-mesh/utils@0.34.0
  - @graphql-mesh/cache-inmemory-lru@0.6.14

## 0.8.7

### Patch Changes

- @graphql-mesh/utils@0.33.6
- @graphql-mesh/types@0.70.6
- @graphql-mesh/cache-inmemory-lru@0.6.13

## 0.8.6

### Patch Changes

- @graphql-mesh/types@0.70.5
- @graphql-mesh/cache-inmemory-lru@0.6.12
- @graphql-mesh/utils@0.33.5

## 0.8.5

### Patch Changes

- Updated dependencies [35a55e841]
  - @graphql-mesh/types@0.70.4
  - @graphql-mesh/utils@0.33.4
  - @graphql-mesh/cache-inmemory-lru@0.6.11

## 0.8.4

### Patch Changes

- @graphql-mesh/types@0.70.3
- @graphql-mesh/cache-inmemory-lru@0.6.10
- @graphql-mesh/utils@0.33.3

## 0.8.3

### Patch Changes

- Updated dependencies [b02f5b008]
  - @graphql-mesh/types@0.70.2
  - @graphql-mesh/cache-inmemory-lru@0.6.9
  - @graphql-mesh/utils@0.33.2

## 0.8.2

### Patch Changes

- 2d5c6c72a: add Git repository link in package.json
- Updated dependencies [2d5c6c72a]
  - @graphql-mesh/cache-inmemory-lru@0.6.8
  - @graphql-mesh/types@0.70.1
  - @graphql-mesh/utils@0.33.1

## 0.8.1

### Patch Changes

- Updated dependencies [d567be7b5]
  - @graphql-mesh/types@0.70.0
  - @graphql-mesh/utils@0.33.0
  - @graphql-mesh/cache-inmemory-lru@0.6.7

## 0.8.0

### Minor Changes

- b8cebb0c6: Bump redis to v5

## 0.7.27

### Patch Changes

- Updated dependencies [f30dba61e]
  - @graphql-mesh/types@0.69.0
  - @graphql-mesh/cache-inmemory-lru@0.6.6
  - @graphql-mesh/utils@0.32.2

## 0.7.26

### Patch Changes

- Updated dependencies [be61de529]
  - @graphql-mesh/types@0.68.3
  - @graphql-mesh/cache-inmemory-lru@0.6.5
  - @graphql-mesh/utils@0.32.1

## 0.7.25

### Patch Changes

- Updated dependencies [b1a6df928]
- Updated dependencies [67fb11706]
  - @graphql-mesh/types@0.68.2
  - @graphql-mesh/utils@0.32.0
  - @graphql-mesh/cache-inmemory-lru@0.6.4

## 0.7.24

### Patch Changes

- Updated dependencies [b2c537c2a]
  - @graphql-mesh/utils@0.31.0
  - @graphql-mesh/types@0.68.1
  - @graphql-mesh/cache-inmemory-lru@0.6.3

## 0.7.23

### Patch Changes

- Updated dependencies [6c318b91a]
  - @graphql-mesh/types@0.68.0
  - @graphql-mesh/cache-inmemory-lru@0.6.2
  - @graphql-mesh/utils@0.30.2

## 0.7.22

### Patch Changes

- @graphql-mesh/types@0.67.1
- @graphql-mesh/cache-inmemory-lru@0.6.1
- @graphql-mesh/utils@0.30.1

## 0.7.21

### Patch Changes

- Updated dependencies [01bac6bb5]
- Updated dependencies [01bac6bb5]
  - @graphql-mesh/cache-inmemory-lru@0.6.0
  - @graphql-mesh/types@0.67.0
  - @graphql-mesh/utils@0.30.0

## 0.7.20

### Patch Changes

- Updated dependencies [268db0462]
  - @graphql-mesh/utils@0.29.0
  - @graphql-mesh/cache-inmemory-lru@0.5.59
  - @graphql-mesh/types@0.66.6

## 0.7.19

### Patch Changes

- Updated dependencies [2ffb1f287]
  - @graphql-mesh/types@0.66.5
  - @graphql-mesh/cache-inmemory-lru@0.5.58
  - @graphql-mesh/utils@0.28.5

## 0.7.18

### Patch Changes

- Updated dependencies [6d2d46480]
  - @graphql-mesh/types@0.66.4
  - @graphql-mesh/cache-inmemory-lru@0.5.57
  - @graphql-mesh/utils@0.28.4

## 0.7.17

### Patch Changes

- 7ffa86e84: fix(redis): close redis connection when destroy

## 0.7.16

### Patch Changes

- @graphql-mesh/types@0.66.3
- @graphql-mesh/cache-inmemory-lru@0.5.56
- @graphql-mesh/utils@0.28.3

## 0.7.15

### Patch Changes

- Updated dependencies [fb876e99c]
  - @graphql-mesh/types@0.66.2
  - @graphql-mesh/utils@0.28.2
  - @graphql-mesh/cache-inmemory-lru@0.5.55

## 0.7.14

### Patch Changes

- Updated dependencies [98ff961ff]
  - @graphql-mesh/types@0.66.1
  - @graphql-mesh/cache-inmemory-lru@0.5.54
  - @graphql-mesh/utils@0.28.1

## 0.7.13

### Patch Changes

- 6f07de8fe: fix: do not import process from env
- b481fbc39: enhance: add tslib to dependencies to reduce bundle size
- Updated dependencies [6f07de8fe]
- Updated dependencies [6f07de8fe]
- Updated dependencies [b481fbc39]
  - @graphql-mesh/types@0.66.0
  - @graphql-mesh/utils@0.28.0
  - @graphql-mesh/cache-inmemory-lru@0.5.53

## 0.7.12

### Patch Changes

- Updated dependencies [21de17a3d]
- Updated dependencies [3f4bb09a9]
  - @graphql-mesh/types@0.65.0
  - @graphql-mesh/utils@0.27.9
  - @graphql-mesh/cache-inmemory-lru@0.5.52

## 0.7.11

### Patch Changes

- Updated dependencies [8b8eb5158]
- Updated dependencies [8b8eb5158]
  - @graphql-mesh/types@0.64.2
  - @graphql-mesh/cache-inmemory-lru@0.5.51
  - @graphql-mesh/utils@0.27.8

## 0.7.10

### Patch Changes

- Updated dependencies [ca6bb5ff3]
  - @graphql-mesh/utils@0.27.7
  - @graphql-mesh/cache-inmemory-lru@0.5.50
  - @graphql-mesh/types@0.64.1

## 0.7.9

### Patch Changes

- Updated dependencies [08b250e04]
  - @graphql-mesh/types@0.64.0
  - @graphql-mesh/cache-inmemory-lru@0.5.49
  - @graphql-mesh/utils@0.27.6

## 0.7.8

### Patch Changes

- Updated dependencies [1815865c3]
  - @graphql-mesh/types@0.63.1
  - @graphql-mesh/utils@0.27.5
  - @graphql-mesh/cache-inmemory-lru@0.5.48

## 0.7.7

### Patch Changes

- Updated dependencies [b6eca9baa]
- Updated dependencies [b6eca9baa]
  - @graphql-mesh/types@0.63.0
  - @graphql-mesh/cache-inmemory-lru@0.5.47
  - @graphql-mesh/utils@0.27.4

## 0.7.6

### Patch Changes

- Updated dependencies [0d43ecf19]
  - @graphql-mesh/types@0.62.2
  - @graphql-mesh/cache-inmemory-lru@0.5.46
  - @graphql-mesh/utils@0.27.3

## 0.7.5

### Patch Changes

- Updated dependencies [c71b29004]
- Updated dependencies [447bc3697]
  - @graphql-mesh/utils@0.27.2
  - @graphql-mesh/types@0.62.1
  - @graphql-mesh/cache-inmemory-lru@0.5.45

## 0.7.4

### Patch Changes

- Updated dependencies [240ec7b38]
- Updated dependencies [fcbd12a35]
  - @graphql-mesh/types@0.62.0
  - @graphql-mesh/utils@0.27.1
  - @graphql-mesh/cache-inmemory-lru@0.5.44

## 0.7.3

### Patch Changes

- Updated dependencies [900a01355]
  - @graphql-mesh/utils@0.27.0
  - @graphql-mesh/cache-inmemory-lru@0.5.43

## 0.7.2

### Patch Changes

- Updated dependencies [66ca1a366]
  - @graphql-mesh/types@0.61.0
  - @graphql-mesh/cache-inmemory-lru@0.5.42
  - @graphql-mesh/utils@0.26.4

## 0.7.1

### Patch Changes

- Updated dependencies [a79268b3a]
- Updated dependencies [a79268b3a]
  - @graphql-mesh/types@0.60.0
  - @graphql-mesh/cache-inmemory-lru@0.5.41
  - @graphql-mesh/utils@0.26.3

## 0.7.0

### Minor Changes

- 020431bdc: feat(redis): fallback to inmemory cache and support env interpolation

### Patch Changes

- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
  - @graphql-mesh/types@0.59.0
  - @graphql-mesh/cache-inmemory-lru@0.5.40
  - @graphql-mesh/utils@0.26.2

## 0.6.33

### Patch Changes

- Updated dependencies [113091148]
- Updated dependencies [6bb4cf673]
  - @graphql-mesh/utils@0.26.1
  - @graphql-mesh/types@0.58.0

## 0.6.32

### Patch Changes

- Updated dependencies [1ab0aebbc]
- Updated dependencies [56e2257fa]
- Updated dependencies [56e2257fa]
  - @graphql-mesh/types@0.57.2
  - @graphql-mesh/utils@0.26.0

## 0.6.31

### Patch Changes

- Updated dependencies [2b876f2b8]
  - @graphql-mesh/utils@0.25.0

## 0.6.30

### Patch Changes

- Updated dependencies [d907351c5]
  - @graphql-mesh/types@0.57.1
  - @graphql-mesh/utils@0.24.2

## 0.6.29

### Patch Changes

- Updated dependencies [26d685f2a]
  - @graphql-mesh/utils@0.24.1

## 0.6.28

### Patch Changes

- Updated dependencies [cfca98d34]
  - @graphql-mesh/types@0.57.0
  - @graphql-mesh/utils@0.24.0

## 0.6.27

### Patch Changes

- Updated dependencies [5666484d6]
  - @graphql-mesh/utils@0.23.0

## 0.6.26

### Patch Changes

- Updated dependencies [6c216c309]
  - @graphql-mesh/utils@0.22.2

## 0.6.25

### Patch Changes

- Updated dependencies [c22eb1b5e]
  - @graphql-mesh/utils@0.22.1

## 0.6.24

### Patch Changes

- Updated dependencies [ec0d1d639]
- Updated dependencies [1cc0acb9a]
  - @graphql-mesh/types@0.56.0
  - @graphql-mesh/utils@0.22.0

## 0.6.23

### Patch Changes

- Updated dependencies [1b332487c]
  - @graphql-mesh/types@0.55.0
  - @graphql-mesh/utils@0.21.1

## 0.6.22

### Patch Changes

- Updated dependencies [875d0e48d]
  - @graphql-mesh/utils@0.21.0

## 0.6.21

### Patch Changes

- Updated dependencies [761b16ed9]
  - @graphql-mesh/types@0.54.1
  - @graphql-mesh/utils@0.20.1

## 0.6.20

### Patch Changes

- Updated dependencies [09f81dd74]
- Updated dependencies [09f81dd74]
  - @graphql-mesh/types@0.54.0
  - @graphql-mesh/utils@0.20.0

## 0.6.19

### Patch Changes

- Updated dependencies [0dc08e5cc]
  - @graphql-mesh/utils@0.19.0

## 0.6.18

### Patch Changes

- Updated dependencies [6f57be0c1]
  - @graphql-mesh/types@0.53.0
  - @graphql-mesh/utils@0.18.1

## 0.6.17

### Patch Changes

- Updated dependencies [4ec7a14ba]
- Updated dependencies [811960cdc]
- Updated dependencies [6f5ffe766]
  - @graphql-mesh/utils@0.18.0
  - @graphql-mesh/types@0.52.0

## 0.6.16

### Patch Changes

- Updated dependencies [256abf5f7]
  - @graphql-mesh/types@0.51.0
  - @graphql-mesh/utils@0.17.2

## 0.6.15

### Patch Changes

- Updated dependencies [8c9b709ae]
  - @graphql-mesh/types@0.50.0
  - @graphql-mesh/utils@0.17.1

## 0.6.14

### Patch Changes

- Updated dependencies [7bd145769]
  - @graphql-mesh/utils@0.17.0

## 0.6.13

### Patch Changes

- Updated dependencies [472c5887b]
  - @graphql-mesh/utils@0.16.3

## 0.6.12

### Patch Changes

- Updated dependencies [6ce43ddac]
  - @graphql-mesh/types@0.49.0
  - @graphql-mesh/utils@0.16.2

## 0.6.11

### Patch Changes

- Updated dependencies [46a4f7b73]
- Updated dependencies [aa804d043]
- Updated dependencies [67552c8f8]
  - @graphql-mesh/utils@0.16.1
  - @graphql-mesh/types@0.48.0

## 0.6.10

### Patch Changes

- Updated dependencies [9eff8a396]
  - @graphql-mesh/types@0.47.0
  - @graphql-mesh/utils@0.16.0

## 0.6.9

### Patch Changes

- Updated dependencies [f4f30741d]
  - @graphql-mesh/utils@0.15.0

## 0.6.8

### Patch Changes

- Updated dependencies [4545fe72d]
- Updated dependencies [d189b4034]
- Updated dependencies [f23820ed0]
- Updated dependencies [06d688e70]
  - @graphql-mesh/types@0.46.0
  - @graphql-mesh/utils@0.14.0

## 0.6.7

### Patch Changes

- fc51c574d: Dependency updates
- Updated dependencies [fc51c574d]
  - @graphql-mesh/types@0.45.2
  - @graphql-mesh/utils@0.13.7

## 0.6.6

### Patch Changes

- Updated dependencies [1c2667489]
  - @graphql-mesh/types@0.45.1
  - @graphql-mesh/utils@0.13.6

## 0.6.5

### Patch Changes

- Updated dependencies [7080a2f1d]
  - @graphql-mesh/utils@0.13.5

## 0.6.4

### Patch Changes

- Updated dependencies [6266d1774]
- Updated dependencies [94606e7b9]
- Updated dependencies [2b8dae1cb]
- Updated dependencies [0c97b4b75]
  - @graphql-mesh/types@0.45.0
  - @graphql-mesh/utils@0.13.4

## 0.6.3

### Patch Changes

- Updated dependencies [25d10cc23]
  - @graphql-mesh/types@0.44.2
  - @graphql-mesh/utils@0.13.3

## 0.6.2

### Patch Changes

- Updated dependencies [49c8ceb38]
  - @graphql-mesh/types@0.44.1
  - @graphql-mesh/utils@0.13.2

## 0.6.1

### Patch Changes

- Updated dependencies [1ee417e3d]
  - @graphql-mesh/types@0.44.0
  - @graphql-mesh/utils@0.13.1

## 0.6.0

### Minor Changes

- 816411ea7: Add url option to redis

## 0.5.12

### Patch Changes

- Updated dependencies [885ea439a]
- Updated dependencies [d8051f87d]
- Updated dependencies [d8051f87d]
  - @graphql-mesh/types@0.43.0
  - @graphql-mesh/utils@0.13.0

## 0.5.11

### Patch Changes

- 02cf272a2: enhance(redis): enable auto-pipelining and remove dataloader

## 0.5.10

### Patch Changes

- Updated dependencies [bdb58dfec]
  - @graphql-mesh/utils@0.12.0

## 0.5.9

### Patch Changes

- Updated dependencies [7d0e33660]
  - @graphql-mesh/utils@0.11.4

## 0.5.8

### Patch Changes

- Updated dependencies [cfb517b3d]
  - @graphql-mesh/types@0.42.0

## 0.5.7

### Patch Changes

- Updated dependencies [3c4c51100]
  - @graphql-mesh/utils@0.11.3

## 0.5.6

### Patch Changes

- Updated dependencies [e6acdbd7d]
  - @graphql-mesh/types@0.41.1
  - @graphql-mesh/utils@0.11.2

## 0.5.5

### Patch Changes

- Updated dependencies [69c89666d]
  - @graphql-mesh/utils@0.11.1

## 0.5.4

### Patch Changes

- Updated dependencies [214b7a23c]
  - @graphql-mesh/types@0.41.0

## 0.5.3

### Patch Changes

- Updated dependencies [0d2f7bfcd]
  - @graphql-mesh/types@0.40.0

## 0.5.2

### Patch Changes

- Updated dependencies [1caa8ffd3]
  - @graphql-mesh/utils@0.11.0

## 0.5.1

### Patch Changes

- Updated dependencies [6c90e0e39]
  - @graphql-mesh/types@0.39.0

## 0.5.0

### Minor Changes

- 346fe9c61: Performance improvements and OData fixes

### Patch Changes

- Updated dependencies [346fe9c61]
  - @graphql-mesh/types@0.38.0
  - @graphql-mesh/utils@0.10.0

## 0.4.53

### Patch Changes

- Updated dependencies [4b57f7496]
- Updated dependencies [4b57f7496]
  - @graphql-mesh/types@0.37.0

## 0.4.52

### Patch Changes

- b77148a04: fix(npm-publish): bump all versions to publish again
- Updated dependencies [b77148a04]
  - @graphql-mesh/types@0.36.1

## 0.4.51

### Patch Changes

- Updated dependencies [634a8a134]
- Updated dependencies [6b8b23a4e]
  - @graphql-mesh/types@0.36.0

## 0.4.50

### Patch Changes

- Updated dependencies [191a663a]
  - @graphql-mesh/types@0.35.1

## 0.4.49

### Patch Changes

- Updated dependencies [b9ca0c30]
  - @graphql-mesh/types@0.35.0

## 0.4.48

### Patch Changes

- Updated dependencies [55327fd6]
  - @graphql-mesh/types@0.34.1

## 0.4.47

### Patch Changes

- Updated dependencies [76051dd7]
  - @graphql-mesh/types@0.34.0

## 0.4.46

### Patch Changes

- Updated dependencies [646d6bdb]
  - @graphql-mesh/types@0.33.0

## 0.4.45

### Patch Changes

- Updated dependencies [68d6b117]
  - @graphql-mesh/types@0.32.0

## 0.4.44

### Patch Changes

- Updated dependencies [212f2d66]
  - @graphql-mesh/types@0.31.1

## 0.4.43

### Patch Changes

- Updated dependencies [77327988]
  - @graphql-mesh/types@0.31.0

## 0.4.42

### Patch Changes

- Updated dependencies [48f38a4a]
  - @graphql-mesh/types@0.30.1

## 0.4.41

### Patch Changes

- Updated dependencies [938cca26]
  - @graphql-mesh/types@0.30.0

## 0.4.40

### Patch Changes

- Updated dependencies [8ef29de1]
  - @graphql-mesh/types@0.29.4

## 0.4.39

### Patch Changes

- Updated dependencies [a02d86c3]
- Updated dependencies [a02d86c3]
- Updated dependencies [a02d86c3]
  - @graphql-mesh/types@0.29.3

## 0.4.38

### Patch Changes

- Updated dependencies [8e8848e1]
  - @graphql-mesh/types@0.29.2

## 0.4.37

### Patch Changes

- Updated dependencies [e8994875]
  - @graphql-mesh/types@0.29.1

## 0.4.36

### Patch Changes

- Updated dependencies [c767df01]
- Updated dependencies [183cfa96]
  - @graphql-mesh/types@0.29.0

## 0.4.35

### Patch Changes

- Updated dependencies [a22fc6f3]
  - @graphql-mesh/types@0.28.0

## 0.4.34

### Patch Changes

- Updated dependencies [c1de3e43]
  - @graphql-mesh/types@0.27.0

## 0.4.33

### Patch Changes

- Updated dependencies [75f6dff9]
- Updated dependencies [c4f207a7]
  - @graphql-mesh/types@0.26.0

## 0.4.32

### Patch Changes

- Updated dependencies [0df817d0]
  - @graphql-mesh/types@0.25.0

## 0.4.31

### Patch Changes

- Updated dependencies [b6262481]
  - @graphql-mesh/types@0.24.0

## 0.4.30

### Patch Changes

- Updated dependencies [e5b38574]
  - @graphql-mesh/types@0.23.3

## 0.4.29

### Patch Changes

- Updated dependencies [c614e796]
  - @graphql-mesh/types@0.23.2

## 0.4.28

### Patch Changes

- Updated dependencies [59d77fb8]
  - @graphql-mesh/types@0.23.1

## 0.4.27

### Patch Changes

- Updated dependencies [e5cd44f5]
  - @graphql-mesh/types@0.23.0

## 0.4.26

### Patch Changes

- Updated dependencies [2fd59a83]
  - @graphql-mesh/types@0.22.0

## 0.4.25

### Patch Changes

- Updated dependencies [c064e3a8]
  - @graphql-mesh/types@0.21.1

## 0.4.24

### Patch Changes

- Updated dependencies [03f41cd0]
  - @graphql-mesh/types@0.21.0

## 0.4.23

### Patch Changes

- Updated dependencies [1e7fd602]
  - @graphql-mesh/types@0.20.1

## 0.4.22

### Patch Changes

- Updated dependencies [2d14fcc3]
- Updated dependencies [2d14fcc3]
  - @graphql-mesh/types@0.20.0

## 0.4.21

### Patch Changes

- aa359dc5: fix(redis-cache): stringify before saving values
- Updated dependencies [c1b073de]
  - @graphql-mesh/types@0.19.0

## 0.4.20

### Patch Changes

- Updated dependencies [5628fb14]
  - @graphql-mesh/types@0.18.0

## 0.4.19

### Patch Changes

- Updated dependencies [0560e806]
  - @graphql-mesh/types@0.17.1

## 0.4.18

### Patch Changes

- Updated dependencies [c26c8c56]
  - @graphql-mesh/types@0.17.0

## 0.4.17

### Patch Changes

- Updated dependencies [3770af72]
  - @graphql-mesh/types@0.16.1

## 0.4.16

### Patch Changes

- Updated dependencies [3ee10180]
  - @graphql-mesh/types@0.16.0

## 0.4.15

### Patch Changes

- Updated dependencies [0f17c58c]
  - @graphql-mesh/types@0.15.0

## 0.4.14

### Patch Changes

- Updated dependencies [937c87d2]
  - @graphql-mesh/types@0.14.1

## 0.4.13

### Patch Changes

- Updated dependencies [1e0445ee]
  - @graphql-mesh/types@0.14.0

## 0.4.12

### Patch Changes

- Updated dependencies [b50a68e3]
  - @graphql-mesh/types@0.13.0

## 0.4.11

### Patch Changes

- Updated dependencies [e2b34219]
- Updated dependencies [9a7a55c4]
  - @graphql-mesh/types@0.12.0

## 0.4.10

### Patch Changes

- a3b42cfd: fix(runtime): handle transforms correctly for single source
- Updated dependencies [2dedda3c]
- Updated dependencies [a3b42cfd]
  - @graphql-mesh/types@0.11.3

## 0.4.9

### Patch Changes

- Updated dependencies [6d624576]
  - @graphql-mesh/types@0.11.2

## 0.4.8

### Patch Changes

- Updated dependencies [405cec23]
  - @graphql-mesh/types@0.11.1

## 0.4.7

### Patch Changes

- Updated dependencies [48d89de2]
  - @graphql-mesh/types@0.11.0

## 0.4.6

### Patch Changes

- Updated dependencies [79adf4b6]
  - @graphql-mesh/types@0.10.0

## 0.4.5

### Patch Changes

- Updated dependencies [2d5cc25b]
  - @graphql-mesh/types@0.9.2

## 0.4.4

### Patch Changes

- Updated dependencies [93ad5255]
  - @graphql-mesh/types@0.9.1

## 0.4.3

### Patch Changes

- Updated dependencies [c8d9695e]
  - @graphql-mesh/types@0.9.0

## 0.4.2

### Patch Changes

- Updated dependencies [d2e56567]
  - @graphql-mesh/types@0.8.1

## 0.4.1

### Patch Changes

- Updated dependencies [a789c312]
  - @graphql-mesh/types@0.8.0

## 0.4.0

### Minor Changes

- 718e7a16: fix(runtime): fix browser support

### Patch Changes

- Updated dependencies [718e7a16]
  - @graphql-mesh/types@0.7.0

## 0.3.2

### Patch Changes

- Updated dependencies [5067ac73]
- Updated dependencies [a76d74bb]
  - @graphql-mesh/types@0.6.0

## 0.3.1

### Patch Changes

- Updated dependencies [dde7878b]
  - @graphql-mesh/types@0.5.1

## 0.3.0

### Minor Changes

- 705c4626: introduce an independent config package

### Patch Changes

- Updated dependencies [705c4626]
  - @graphql-mesh/types@0.5.0

## 0.2.18

### Patch Changes

- Updated dependencies [854dc550]
- Updated dependencies [6f21094b]
  - @graphql-mesh/types@0.4.0

## 0.2.17

### Patch Changes

- Updated dependencies [3c131332]
  - @graphql-mesh/types@0.3.1

## 0.2.16

### Patch Changes

- Updated dependencies [ccede377]
  - @graphql-mesh/types@0.3.0
