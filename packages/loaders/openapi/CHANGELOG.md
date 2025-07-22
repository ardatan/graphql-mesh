# @omnigraph/openapi

## 0.109.14

### Patch Changes

- Updated dependencies
  [[`00dd66a`](https://github.com/ardatan/graphql-mesh/commit/00dd66af22c98aa1e153149e3df68bca7de83778)]:
  - @graphql-mesh/fusion-composition@0.8.11

## 0.109.13

### Patch Changes

- Updated dependencies
  [[`e2666bc`](https://github.com/ardatan/graphql-mesh/commit/e2666bc151e63f319fe65d2f3e18bdfe1e305b2a)]:
  - @graphql-mesh/utils@0.104.6
  - @graphql-mesh/fusion-composition@0.8.10
  - @omnigraph/json-schema@0.109.7
  - @graphql-mesh/types@0.104.6

## 0.109.12

### Patch Changes

- Updated dependencies
  [[`9d61d75`](https://github.com/ardatan/graphql-mesh/commit/9d61d75c462a577b5fa4fe3285370abb6ea064c8)]:
  - @graphql-mesh/utils@0.104.5
  - @graphql-mesh/fusion-composition@0.8.9
  - @omnigraph/json-schema@0.109.6
  - @graphql-mesh/types@0.104.5

## 0.109.11

### Patch Changes

- [#8655](https://github.com/ardatan/graphql-mesh/pull/8655)
  [`41757dd`](https://github.com/ardatan/graphql-mesh/commit/41757dd63f8d3abde0a6c65130697939185bf468)
  Thanks [@arnaud](https://github.com/arnaud)! - The fix ensures that there is no correct or
  incorrect order of swaggers - whatever their order, schema loading and HATEOAS cross-referencing
  works reliably through coordinated batch processing with proper dependency resolution.

## 0.109.10

### Patch Changes

- Updated dependencies
  [[`6b4c546`](https://github.com/ardatan/graphql-mesh/commit/6b4c5467285d502940316eb430c292e52fb928f2)]:
  - @graphql-mesh/types@0.104.4
  - @graphql-mesh/utils@0.104.4
  - @omnigraph/json-schema@0.109.5
  - @graphql-mesh/fusion-composition@0.8.8

## 0.109.9

### Patch Changes

- [#8641](https://github.com/ardatan/graphql-mesh/pull/8641)
  [`17e3c35`](https://github.com/ardatan/graphql-mesh/commit/17e3c35c0de0dcac6c395a1be63b01fe97bb49b0)
  Thanks [@arnaud](https://github.com/arnaud)! - When there are two operations in the OAS;
  `/products/` and `/products/{id}` Due to the bug in the logic, they conflict and the HATEOAS
  linking can choose the first one without any argument.

- [#8640](https://github.com/ardatan/graphql-mesh/pull/8640)
  [`e254ba8`](https://github.com/ardatan/graphql-mesh/commit/e254ba839f72214e4796ee3515c93c6b0c7f8c2f)
  Thanks [@arnaud](https://github.com/arnaud)! - fix(openapi): support 204 responses which have
  content keys with empty values

## 0.109.8

### Patch Changes

- Updated dependencies
  [[`74672d0`](https://github.com/ardatan/graphql-mesh/commit/74672d0f8906f31d6563eee240ffeea04328bd7d)]:
  - @graphql-mesh/fusion-composition@0.8.7

## 0.109.7

### Patch Changes

- [#8615](https://github.com/ardatan/graphql-mesh/pull/8615)
  [`0af3d0c`](https://github.com/ardatan/graphql-mesh/commit/0af3d0c77a0226b4f2339ba46012b3e00c13e65c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Update graphql-yoga and whatwg-node packages

  In light of https://github.com/ardatan/whatwg-node/pull/2305. Please upgrade as soon as possible!

- Updated dependencies
  [[`0af3d0c`](https://github.com/ardatan/graphql-mesh/commit/0af3d0c77a0226b4f2339ba46012b3e00c13e65c),
  [`0af3d0c`](https://github.com/ardatan/graphql-mesh/commit/0af3d0c77a0226b4f2339ba46012b3e00c13e65c),
  [`0af3d0c`](https://github.com/ardatan/graphql-mesh/commit/0af3d0c77a0226b4f2339ba46012b3e00c13e65c)]:
  - @graphql-mesh/utils@0.104.3
  - @omnigraph/json-schema@0.109.4
  - @graphql-mesh/fusion-composition@0.8.6
  - @graphql-mesh/types@0.104.3

## 0.109.6

### Patch Changes

- Updated dependencies
  [[`3528ddb`](https://github.com/ardatan/graphql-mesh/commit/3528ddb85e13a0d2f4f452d5e79c939634d49e2a)]:
  - @graphql-mesh/fusion-composition@0.8.5

## 0.109.5

### Patch Changes

- Updated dependencies
  [[`3d33f2c`](https://github.com/ardatan/graphql-mesh/commit/3d33f2c366c61f49d8e7658d4191f14ec1066c92),
  [`b432f1d`](https://github.com/ardatan/graphql-mesh/commit/b432f1d5880f849a4d418d23807d4e52f3caeb36)]:
  - @graphql-mesh/fusion-composition@0.8.4

## 0.109.4

### Patch Changes

- Updated dependencies
  [[`cedadc5`](https://github.com/ardatan/graphql-mesh/commit/cedadc5e27f9059eff4cda42f45adbba9ee415cd)]:
  - @graphql-mesh/fusion-composition@0.8.3

## 0.109.3

### Patch Changes

- Updated dependencies
  [[`1b5d072`](https://github.com/ardatan/graphql-mesh/commit/1b5d07211e2e67bc939f1def3d19c45a7a4eb28b)]:
  - @graphql-mesh/utils@0.104.2
  - @graphql-mesh/fusion-composition@0.8.2
  - @omnigraph/json-schema@0.109.3
  - @graphql-mesh/types@0.104.2

## 0.109.2

### Patch Changes

- Updated dependencies []:
  - @omnigraph/json-schema@0.109.2

## 0.109.1

### Patch Changes

- Updated dependencies
  [[`b6c083c`](https://github.com/ardatan/graphql-mesh/commit/b6c083ce9e9305874cf847246fefda3fe068e8b4),
  [`f416982`](https://github.com/ardatan/graphql-mesh/commit/f4169823bce2abf093bd53249d1d1208ea459a5d)]:
  - @graphql-mesh/utils@0.104.1
  - @graphql-mesh/fusion-composition@0.8.1
  - @omnigraph/json-schema@0.109.1
  - @graphql-mesh/types@0.104.1

## 0.109.0

### Patch Changes

- Updated dependencies
  [[`4528794`](https://github.com/ardatan/graphql-mesh/commit/45287948dbfbe07c3f60f9c36253099c549207d9),
  [`4528794`](https://github.com/ardatan/graphql-mesh/commit/45287948dbfbe07c3f60f9c36253099c549207d9)]:
  - @graphql-mesh/utils@0.104.0
  - @graphql-mesh/fusion-composition@0.8.0
  - @omnigraph/json-schema@0.109.0
  - @graphql-mesh/types@0.104.0

## 0.108.25

### Patch Changes

- Updated dependencies
  [[`903124f`](https://github.com/ardatan/graphql-mesh/commit/903124f8245a518aac50ef8d0eff2fef01a206f2)]:
  - @graphql-mesh/utils@0.103.21
  - @graphql-mesh/fusion-composition@0.7.27
  - @omnigraph/json-schema@0.108.23
  - @graphql-mesh/types@0.103.21

## 0.108.24

### Patch Changes

- Updated dependencies
  [[`3f5e0a1`](https://github.com/ardatan/graphql-mesh/commit/3f5e0a13c8a07bd68ec19e4da94f34030cc7d3dc)]:
  - @graphql-mesh/utils@0.103.20
  - @graphql-mesh/fusion-composition@0.7.26
  - @omnigraph/json-schema@0.108.22
  - @graphql-mesh/types@0.103.20

## 0.108.23

### Patch Changes

- Updated dependencies
  [[`d9cf1d3`](https://github.com/ardatan/graphql-mesh/commit/d9cf1d389c6d685a9d6cc50ff4be03380fd085f1)]:
  - @graphql-mesh/types@0.103.19
  - @graphql-mesh/utils@0.103.19
  - @omnigraph/json-schema@0.108.21
  - @graphql-mesh/fusion-composition@0.7.25

## 0.108.22

### Patch Changes

- Updated dependencies
  [[`ab0863b`](https://github.com/ardatan/graphql-mesh/commit/ab0863ba367552e4b1ced1063ae7cb3a5f81b3b2),
  [`ab0863b`](https://github.com/ardatan/graphql-mesh/commit/ab0863ba367552e4b1ced1063ae7cb3a5f81b3b2)]:
  - @graphql-mesh/utils@0.103.18
  - @omnigraph/json-schema@0.108.20
  - @graphql-mesh/fusion-composition@0.7.24
  - @graphql-mesh/types@0.103.18

## 0.108.21

### Patch Changes

- Updated dependencies
  [[`eee582a`](https://github.com/ardatan/graphql-mesh/commit/eee582a4cf78d8f7b0e303b522e6a97bd0ad4f2a)]:
  - @graphql-mesh/utils@0.103.17
  - @graphql-mesh/fusion-composition@0.7.23
  - @omnigraph/json-schema@0.108.19
  - @graphql-mesh/types@0.103.17

## 0.108.20

### Patch Changes

- Updated dependencies
  [[`b44f8b7`](https://github.com/ardatan/graphql-mesh/commit/b44f8b7a413c8adb213b22fb8a243ca6aa06d2bd)]:
  - @omnigraph/json-schema@0.108.18
  - @graphql-mesh/types@0.103.16
  - @graphql-mesh/utils@0.103.16
  - @graphql-mesh/fusion-composition@0.7.22

## 0.108.19

### Patch Changes

- Updated dependencies
  [[`b5c05c4`](https://github.com/ardatan/graphql-mesh/commit/b5c05c4c5862525c76d69e8c166e71378f69bda0)]:
  - @graphql-mesh/types@0.103.15
  - @graphql-mesh/utils@0.103.15
  - @omnigraph/json-schema@0.108.17
  - @graphql-mesh/fusion-composition@0.7.21

## 0.108.18

### Patch Changes

- Updated dependencies
  [[`fc44a1e`](https://github.com/ardatan/graphql-mesh/commit/fc44a1e66c8bc8f27dc7e5e642031d17d75c0db8)]:
  - @graphql-mesh/types@0.103.14
  - @graphql-mesh/utils@0.103.14
  - @omnigraph/json-schema@0.108.16
  - @graphql-mesh/fusion-composition@0.7.20

## 0.108.17

### Patch Changes

- Updated dependencies
  [[`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a),
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a),
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a),
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a),
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)]:
  - @graphql-mesh/cross-helpers@0.4.10
  - @graphql-mesh/fusion-composition@0.7.19
  - @graphql-mesh/types@0.103.13
  - @graphql-mesh/utils@0.103.13
  - @omnigraph/json-schema@0.108.15

## 0.108.16

### Patch Changes

- Updated dependencies []:
  - @omnigraph/json-schema@0.108.14

## 0.108.15

### Patch Changes

- [#8289](https://github.com/ardatan/graphql-mesh/pull/8289)
  [`c54e361`](https://github.com/ardatan/graphql-mesh/commit/c54e36110256541e03380b0d537085848169116b)
  Thanks [@ardatan](https://github.com/ardatan)! - New option `selectQueryOrMutationField` to decide
  which field belongs to which root type explicitly.

  ```ts filename="mesh.config.ts"
  import { defineConfig } from '@graphql-mesh/compose-cli'
  import loadGrpcSubgraph from '@omnigraph/grpc'

  export const composeConfig = defineConfig({
    subgraphs: [
      {
        sourceHandler: loadGrpcSubgraph('MyGrpcApi', {
          /** .. **/

          // Prefix to collect Query method default: list, get
          prefixQueryMethod: ['list', 'get'],

          // Select certain fields as Query or Mutation
          // This overrides `prefixQueryMethod`
          selectQueryOrMutationField: [
            {
              // You can use a pattern matching with *
              fieldName: '*RetrieveMovies',
              type: 'Query'
            },
            // Or you can use a specific field name
            // This will make the field GetMovie available as a Mutation
            // Because it would be Query because of `prefixQueryMethod`
            {
              fieldName: 'GetMovie',
              type: 'Mutation'
            }
          ]
        })
      }
    ]
  })
  ```

- Updated dependencies
  [[`5180b06`](https://github.com/ardatan/graphql-mesh/commit/5180b068568042e764558a19194b8bae69354fe2),
  [`c54e361`](https://github.com/ardatan/graphql-mesh/commit/c54e36110256541e03380b0d537085848169116b),
  [`f1b5e8e`](https://github.com/ardatan/graphql-mesh/commit/f1b5e8ee2f2da7599532b6f2a2e6399c46575789),
  [`78c202e`](https://github.com/ardatan/graphql-mesh/commit/78c202ef8824607e27de1dcc5076c82a02ef86cd)]:
  - @graphql-mesh/utils@0.103.12
  - @graphql-mesh/types@0.103.12
  - @graphql-mesh/fusion-composition@0.7.18
  - @graphql-mesh/string-interpolation@0.5.8
  - @omnigraph/json-schema@0.108.13

## 0.108.14

### Patch Changes

- Updated dependencies
  [[`2ff45ed`](https://github.com/ardatan/graphql-mesh/commit/2ff45ed06c9d0eb717b619e761a8918c97c1a434),
  [`d3656b6`](https://github.com/ardatan/graphql-mesh/commit/d3656b60fe47c74122e9dfad28273426b07b42ab),
  [`d3656b6`](https://github.com/ardatan/graphql-mesh/commit/d3656b60fe47c74122e9dfad28273426b07b42ab)]:
  - @omnigraph/json-schema@0.108.12
  - json-machete@0.97.6

## 0.108.13

### Patch Changes

- Updated dependencies
  [[`3fc1f3e`](https://github.com/ardatan/graphql-mesh/commit/3fc1f3e046c02107d7fecf367756c7196fbe6ce1),
  [`4011203`](https://github.com/ardatan/graphql-mesh/commit/40112034a2e248eda94883a39a3f8682189f4288)]:
  - @graphql-mesh/types@0.103.11
  - @graphql-mesh/utils@0.103.11
  - @omnigraph/json-schema@0.108.11
  - @graphql-mesh/fusion-composition@0.7.17

## 0.108.12

### Patch Changes

- Updated dependencies
  [[`b750a41`](https://github.com/ardatan/graphql-mesh/commit/b750a410c082d64a04f21023790f2ff2c46f5eb9)]:
  - @graphql-mesh/utils@0.103.10
  - @graphql-mesh/fusion-composition@0.7.16
  - @omnigraph/json-schema@0.108.10
  - @graphql-mesh/types@0.103.10

## 0.108.11

### Patch Changes

- Updated dependencies
  [[`10ba2c4`](https://github.com/ardatan/graphql-mesh/commit/10ba2c42549dacff9c4e6be87ee50b608be62ddc)]:
  - @graphql-mesh/utils@0.103.9
  - @graphql-mesh/fusion-composition@0.7.15
  - @omnigraph/json-schema@0.108.9
  - @graphql-mesh/types@0.103.9

## 0.108.10

### Patch Changes

- [#8145](https://github.com/ardatan/graphql-mesh/pull/8145)
  [`38322fc`](https://github.com/ardatan/graphql-mesh/commit/38322fc6df77a6c1a47e7e4a28dc3f808b452c0d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.4)
    (from `10.6.3`, in `dependencies`)
  - Removed dependency
    [`@graphql-tools/delegate@^10.0.28` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.28)
    (from `dependencies`)

## 0.108.9

### Patch Changes

- [#8136](https://github.com/ardatan/graphql-mesh/pull/8136)
  [`c6c11ff`](https://github.com/ardatan/graphql-mesh/commit/c6c11ff22ec213db1371e5300d22d4cf2529fc80)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@10.6.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.3)
    (from `10.6.2`, in `dependencies`)

## 0.108.8

### Patch Changes

- [#8082](https://github.com/ardatan/graphql-mesh/pull/8082)
  [`93fb364`](https://github.com/ardatan/graphql-mesh/commit/93fb3643d90c52084725d79b586ace8ecd570911)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/cross-helpers@^0.4.9` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.9)
    (from `workspace:^`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/fusion-composition@^0.7.13` ↗︎](https://www.npmjs.com/package/@graphql-mesh/fusion-composition/v/0.7.13)
    (from `workspace:^`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/string-interpolation@^0.5.7` ↗︎](https://www.npmjs.com/package/@graphql-mesh/string-interpolation/v/0.5.7)
    (from `workspace:^`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.103.7` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.7)
    (from `workspace:^`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.103.7` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.7)
    (from `workspace:^`, in `dependencies`)
  - Updated dependency
    [`@omnigraph/json-schema@^0.108.7` ↗︎](https://www.npmjs.com/package/@omnigraph/json-schema/v/0.108.7)
    (from `workspace:^`, in `dependencies`)
  - Updated dependency
    [`json-machete@^0.97.5` ↗︎](https://www.npmjs.com/package/json-machete/v/0.97.5) (from
    `workspace:^`, in `dependencies`)
- Updated dependencies
  [[`93fb364`](https://github.com/ardatan/graphql-mesh/commit/93fb3643d90c52084725d79b586ace8ecd570911)]:
  - @graphql-mesh/utils@0.103.8
  - @graphql-mesh/fusion-composition@0.7.14
  - @omnigraph/json-schema@0.108.8
  - @graphql-mesh/types@0.103.8

## 0.108.7

### Patch Changes

- [#7961](https://github.com/ardatan/graphql-mesh/pull/7961)
  [`1a7adbf`](https://github.com/ardatan/graphql-mesh/commit/1a7adbf28f126c0fc8ba834f8a7db886f7fba876)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/fusion-composition@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-mesh/fusion-composition/v/workspace:^)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/utils@^10.6.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.1)
    (to `dependencies`)

- [#7961](https://github.com/ardatan/graphql-mesh/pull/7961)
  [`1a7adbf`](https://github.com/ardatan/graphql-mesh/commit/1a7adbf28f126c0fc8ba834f8a7db886f7fba876)
  Thanks [@ardatan](https://github.com/ardatan)! - HATEOAS Support

- Updated dependencies
  [[`1a7adbf`](https://github.com/ardatan/graphql-mesh/commit/1a7adbf28f126c0fc8ba834f8a7db886f7fba876)]:
  - @omnigraph/json-schema@0.108.7
  - @graphql-mesh/fusion-composition@0.7.13
  - @graphql-mesh/types@0.103.7
  - @graphql-mesh/utils@0.103.7

## 0.108.6

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
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9),
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9),
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)]:
  - @graphql-mesh/cross-helpers@0.4.9
  - @graphql-mesh/string-interpolation@0.5.7
  - @graphql-mesh/types@0.103.6
  - @graphql-mesh/utils@0.103.6
  - @omnigraph/json-schema@0.108.6
  - json-machete@0.97.5

## 0.108.5

### Patch Changes

- [#8007](https://github.com/ardatan/graphql-mesh/pull/8007)
  [`9f9f6fe`](https://github.com/ardatan/graphql-mesh/commit/9f9f6fe61c74eaa6572866eddd97c348307107a8)
  Thanks [@ardatan](https://github.com/ardatan)! - DEBUG logs were accidentially written to the
  output, now it correctly prints logs to the logger not the output
- Updated dependencies
  [[`9f9f6fe`](https://github.com/ardatan/graphql-mesh/commit/9f9f6fe61c74eaa6572866eddd97c348307107a8),
  [`9f9f6fe`](https://github.com/ardatan/graphql-mesh/commit/9f9f6fe61c74eaa6572866eddd97c348307107a8)]:
  - @omnigraph/json-schema@0.108.5
  - @graphql-mesh/utils@0.103.5
  - @graphql-mesh/types@0.103.5

## 0.108.4

### Patch Changes

- Updated dependencies
  [[`8fcfe3f`](https://github.com/ardatan/graphql-mesh/commit/8fcfe3f78a0be53e3b474231bfe7ee0594e54f91)]:
  - @graphql-mesh/types@0.103.4
  - @graphql-mesh/utils@0.103.4
  - @omnigraph/json-schema@0.108.4

## 0.108.3

### Patch Changes

- Updated dependencies
  [[`6360755`](https://github.com/ardatan/graphql-mesh/commit/63607552017ed462c0555ad2e2ec6466c10d7ae4)]:
  - @graphql-mesh/utils@0.103.3
  - @omnigraph/json-schema@0.108.3
  - @graphql-mesh/types@0.103.3

## 0.108.2

### Patch Changes

- Updated dependencies
  [[`bfd8929`](https://github.com/ardatan/graphql-mesh/commit/bfd89297b0fe4dbdd0fecff8c35c316e874b9a56)]:
  - @graphql-mesh/utils@0.103.2
  - @omnigraph/json-schema@0.108.2
  - @graphql-mesh/types@0.103.2

## 0.108.1

### Patch Changes

- Updated dependencies
  [[`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac),
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac),
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac),
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)]:
  - @graphql-mesh/cross-helpers@0.4.8
  - @graphql-mesh/types@0.103.1
  - @graphql-mesh/utils@0.103.1
  - @omnigraph/json-schema@0.108.1

## 0.108.0

### Patch Changes

- Updated dependencies
  [[`0e49907`](https://github.com/ardatan/graphql-mesh/commit/0e49907cf19d91fe40c28237aa79bd55742b371f),
  [`9873b33`](https://github.com/ardatan/graphql-mesh/commit/9873b33f0cc6c3b3a3c3dc1a0a1cb18c827b8722)]:
  - @graphql-mesh/utils@0.103.0
  - @omnigraph/json-schema@0.108.0
  - @graphql-mesh/types@0.103.0

## 0.107.8

### Patch Changes

- Updated dependencies
  [[`10dd636`](https://github.com/ardatan/graphql-mesh/commit/10dd6363c8a8dba762cd3a42c4c5069457a1976b)]:
  - @omnigraph/json-schema@0.107.8

## 0.107.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.102.13
  - @graphql-mesh/utils@0.102.13
  - @omnigraph/json-schema@0.107.7

## 0.107.6

### Patch Changes

- Updated dependencies
  [[`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7),
  [`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7)]:
  - @graphql-mesh/utils@0.102.12
  - @omnigraph/json-schema@0.107.6
  - @graphql-mesh/types@0.102.12

## 0.107.5

### Patch Changes

- [#7838](https://github.com/ardatan/graphql-mesh/pull/7838)
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.28` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.28)
    (from `^10.0.27`, in `dependencies`)
- Updated dependencies
  [[`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af),
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af),
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)]:
  - @graphql-mesh/types@0.102.11
  - @graphql-mesh/utils@0.102.11
  - @omnigraph/json-schema@0.107.5

## 0.107.4

### Patch Changes

- [#7828](https://github.com/ardatan/graphql-mesh/pull/7828)
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.27` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.27)
    (from `^10.0.26`, in `dependencies`)
- Updated dependencies
  [[`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71),
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71),
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)]:
  - @graphql-mesh/types@0.102.10
  - @graphql-mesh/utils@0.102.10
  - @omnigraph/json-schema@0.107.4

## 0.107.3

### Patch Changes

- Updated dependencies
  [[`fad4d27`](https://github.com/ardatan/graphql-mesh/commit/fad4d27bfebb80a374c2041b86ffab509845effe)]:
  - @graphql-mesh/utils@0.102.9
  - @omnigraph/json-schema@0.107.3
  - @graphql-mesh/types@0.102.9

## 0.107.2

### Patch Changes

- [#7769](https://github.com/ardatan/graphql-mesh/pull/7769)
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.26` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.26)
    (from `^10.0.23`, in `dependencies`)
- Updated dependencies
  [[`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)]:
  - @graphql-mesh/types@0.102.8
  - @graphql-mesh/utils@0.102.8
  - @omnigraph/json-schema@0.107.2

## 0.107.1

### Patch Changes

- [#7781](https://github.com/ardatan/graphql-mesh/pull/7781)
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.23` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.23)
    (from `^10.0.21`, in `dependencies`)
- Updated dependencies
  [[`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)]:
  - @graphql-mesh/cross-helpers@0.4.7
  - @graphql-mesh/types@0.102.7
  - @graphql-mesh/utils@0.102.7
  - @omnigraph/json-schema@0.107.1

## 0.107.0

### Minor Changes

- [#7746](https://github.com/ardatan/graphql-mesh/pull/7746)
  [`c8b1309`](https://github.com/ardatan/graphql-mesh/commit/c8b1309a707c358dc446799a986c99e120767d0e)
  Thanks [@renovate](https://github.com/apps/renovate)! - Remove workaround for directives on enums,
  enum values and unions

### Patch Changes

- Updated dependencies
  [[`c8b1309`](https://github.com/ardatan/graphql-mesh/commit/c8b1309a707c358dc446799a986c99e120767d0e)]:
  - @omnigraph/json-schema@0.107.0

## 0.106.9

### Patch Changes

- Updated dependencies
  [[`bf588d3`](https://github.com/ardatan/graphql-mesh/commit/bf588d372c0078378aaa24beea2da794af7949e6)]:
  - @graphql-mesh/utils@0.102.6
  - @omnigraph/json-schema@0.106.8
  - @graphql-mesh/types@0.102.6

## 0.106.8

### Patch Changes

- Updated dependencies
  [[`e0c0a94`](https://github.com/ardatan/graphql-mesh/commit/e0c0a94c4d449f01c245a6bfa47e342b31479e3f),
  [`fd245f2`](https://github.com/ardatan/graphql-mesh/commit/fd245f2619346667038d3fcce9aa097994368815)]:
  - @omnigraph/json-schema@0.106.7

## 0.106.7

### Patch Changes

- Updated dependencies
  [[`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d)]:
  - @graphql-mesh/utils@0.102.5
  - @omnigraph/json-schema@0.106.6
  - @graphql-mesh/types@0.102.5

## 0.106.6

### Patch Changes

- Updated dependencies []:
  - @omnigraph/json-schema@0.106.5

## 0.106.5

### Patch Changes

- [#7576](https://github.com/ardatan/graphql-mesh/pull/7576)
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.21` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.21)
    (from `^10.0.20`, in `dependencies`)
- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/types@0.102.4
  - @graphql-mesh/utils@0.102.4
  - @omnigraph/json-schema@0.106.4

## 0.106.4

### Patch Changes

- [#7572](https://github.com/ardatan/graphql-mesh/pull/7572)
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.20)
    (from `^10.0.19`, in `dependencies`)
- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)]:
  - @graphql-mesh/types@0.102.3
  - @graphql-mesh/utils@0.102.3
  - @omnigraph/json-schema@0.106.3

## 0.106.3

### Patch Changes

- [#7565](https://github.com/ardatan/graphql-mesh/pull/7565)
  [`9118cf4`](https://github.com/ardatan/graphql-mesh/commit/9118cf474ff81b9f44e3c5b3d614fb180a529658)
  Thanks [@ardatan](https://github.com/ardatan)! - Support different ref types in
  `discriminator.mapping`;

  All of the following ref formats are considered as valid;

  ```yml
  discriminator:
    mapping:
      A: '#/components/schemas/A'
      # or
      A: 'A'
      # or
      A: '../components/schemas/A'
  ```

## 0.106.2

### Patch Changes

- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/utils@0.102.2
  - @omnigraph/json-schema@0.106.2
  - @graphql-mesh/types@0.102.2

## 0.106.1

### Patch Changes

- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de)]:
  - @graphql-mesh/utils@0.102.1
  - @omnigraph/json-schema@0.106.1
  - @graphql-mesh/types@0.102.1

## 0.106.0

### Patch Changes

- Updated dependencies
  [[`13fa835`](https://github.com/ardatan/graphql-mesh/commit/13fa835036c3671305fc831fa236f110c33d9965),
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)]:
  - @graphql-mesh/string-interpolation@0.5.6
  - @graphql-mesh/types@0.102.0
  - @graphql-mesh/utils@0.102.0
  - @omnigraph/json-schema@0.106.0

## 0.105.2

### Patch Changes

- [#7518](https://github.com/ardatan/graphql-mesh/pull/7518)
  [`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@omnigraph/json-schema@^0.105.1` ↗︎](https://www.npmjs.com/package/@omnigraph/json-schema/v/0.105.1)
    (from `^0.105.0`, in `dependencies`)
- Updated dependencies
  [[`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)]:
  - @omnigraph/json-schema@0.105.2

## 0.105.1

### Patch Changes

- Updated dependencies []:
  - @omnigraph/json-schema@0.105.1

## 0.105.0

### Patch Changes

- [#7512](https://github.com/ardatan/graphql-mesh/pull/7512)
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.19)
    (from `^10.0.18`, in `dependencies`)
- Updated dependencies
  [[`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)]:
  - @graphql-mesh/cross-helpers@0.4.6
  - @graphql-mesh/types@0.101.0
  - @graphql-mesh/utils@0.101.0
  - @omnigraph/json-schema@0.105.0

## 0.104.0

### Patch Changes

- [#7477](https://github.com/ardatan/graphql-mesh/pull/7477)
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.18` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.18)
    (from `^10.0.17`, in `dependencies`)
- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7),
  [`48868b0`](https://github.com/ardatan/graphql-mesh/commit/48868b0e3ff5e30ba589f250d490f285c0365433),
  [`4d1eb28`](https://github.com/ardatan/graphql-mesh/commit/4d1eb285c2b703c5f80473ad0f316004306fac7f),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7)]:
  - @graphql-mesh/cross-helpers@0.4.5
  - @graphql-mesh/types@0.100.0
  - @graphql-mesh/utils@0.100.0
  - @omnigraph/json-schema@0.104.0
  - json-machete@0.97.4

## 0.103.2

### Patch Changes

- Updated dependencies
  [[`a1bfc49`](https://github.com/ardatan/graphql-mesh/commit/a1bfc492ac3378f22b79a51824407e776b496a84)]:
  - @graphql-mesh/types@0.99.7
  - @graphql-mesh/utils@0.99.7
  - @omnigraph/json-schema@0.103.2

## 0.103.1

### Patch Changes

- [#7447](https://github.com/ardatan/graphql-mesh/pull/7447)
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.17)
    (from `^10.0.16`, in `dependencies`)
- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/types@0.99.6
  - @graphql-mesh/utils@0.99.6
  - @omnigraph/json-schema@0.103.1

## 0.103.0

### Minor Changes

- [#7443](https://github.com/ardatan/graphql-mesh/pull/7443)
  [`8bccd9a`](https://github.com/ardatan/graphql-mesh/commit/8bccd9a2475c49444a8751a1cdc25386fbacc2b7)
  Thanks [@ardatan](https://github.com/ardatan)! - POSSIBLE BREAKING CHANGE WARNING: This change is
  breaking for OpenAPI schemas that have discriminator mapping. It fixes a bug when you have keys in
  the discriminator mapping that are invalid per GraphQL spec. Now in the artifacts `@discriminator`
  directive's `mapping` argument is `[String!]!` instead of `ObjMap`. You should make sure both the
  consumer and the producer of the artifacts are updated to this version.

  ```yaml
  discriminator:
    propertyName: petType
    mapping:
      'pet-cat': '#/components/schemas/Cat'
      'pet-dog': '#/components/schemas/Dog'
  ```

  This OpenAPI used to be translated into;

  ```graphql
  @directive(mapping: { "pet-cat": "#/components/schemas/Cat", "pet-dog": "#/components/schemas/Dog" })
  ```

  But this is invalid in GraphQL spec, so now it's translated into;

  ```graphql
  @directive(mapping: [["pet-cat", "#/components/schemas/Cat"], ["pet-dog", "#/components/schemas/Dog"]])
  ```

### Patch Changes

- Updated dependencies
  [[`a4e53d9`](https://github.com/ardatan/graphql-mesh/commit/a4e53d9407b8dcb4b57fb233b8dddfee770d06f5),
  [`8bccd9a`](https://github.com/ardatan/graphql-mesh/commit/8bccd9a2475c49444a8751a1cdc25386fbacc2b7)]:
  - @omnigraph/json-schema@0.103.0

## 0.102.7

### Patch Changes

- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/utils@0.99.5
  - @omnigraph/json-schema@0.102.7
  - @graphql-mesh/types@0.99.5

## 0.102.6

### Patch Changes

- Updated dependencies
  [[`c4190a9`](https://github.com/ardatan/graphql-mesh/commit/c4190a9ca20a77356ba0ff165cb47da28c43ff2f)]:
  - @omnigraph/json-schema@0.102.6

## 0.102.5

### Patch Changes

- Updated dependencies
  [[`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)]:
  - @graphql-mesh/utils@0.99.4
  - @omnigraph/json-schema@0.102.5
  - @graphql-mesh/types@0.99.4

## 0.102.4

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3
  - @omnigraph/json-schema@0.102.4
  - @graphql-mesh/types@0.99.3

## 0.102.3

### Patch Changes

- Updated dependencies
  [[`ffe0346`](https://github.com/ardatan/graphql-mesh/commit/ffe0346c3378523cb5fcd00d58ae4ca688438d23)]:
  - @omnigraph/json-schema@0.102.3

## 0.102.2

### Patch Changes

- [#7352](https://github.com/ardatan/graphql-mesh/pull/7352)
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.16)
    (from `^10.0.14`, in `dependencies`)
- Updated dependencies
  [[`b01f3ea`](https://github.com/ardatan/graphql-mesh/commit/b01f3eabdc42d8905e8d586a4845e8394c094033),
  [`0bdc18d`](https://github.com/ardatan/graphql-mesh/commit/0bdc18df3d150a61abf987b8829934ed4ca02eed),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e)]:
  - @graphql-mesh/string-interpolation@0.5.5
  - @graphql-mesh/types@0.99.2
  - @graphql-mesh/utils@0.99.2
  - @omnigraph/json-schema@0.102.2

## 0.102.1

### Patch Changes

- [#7316](https://github.com/ardatan/graphql-mesh/pull/7316)
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.14)
    (from `^10.0.12`, in `dependencies`)
- Updated dependencies
  [[`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`22e4dd0`](https://github.com/ardatan/graphql-mesh/commit/22e4dd038b73d38b4cf9eaa407c4e652bec77455),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)]:
  - @graphql-mesh/types@0.99.1
  - @graphql-mesh/utils@0.99.1
  - @omnigraph/json-schema@0.102.1

## 0.102.0

### Patch Changes

- Updated dependencies
  [[`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`27e3cc9`](https://github.com/ardatan/graphql-mesh/commit/27e3cc97c1218863cf2948902bdca050bd71d18a),
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2),
  [`3aa1583`](https://github.com/ardatan/graphql-mesh/commit/3aa1583db989ef79a706873e9e5786d1cf61de89),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`bdefa6f`](https://github.com/ardatan/graphql-mesh/commit/bdefa6ff98a1b67ee7458e9ed233f261f523baae)]:
  - @graphql-mesh/utils@0.99.0
  - @omnigraph/json-schema@0.102.0
  - @graphql-mesh/types@0.99.0

## 0.101.2

### Patch Changes

- Updated dependencies
  [[`a387451`](https://github.com/ardatan/graphql-mesh/commit/a38745126d8f7f58247afad9d4c16213c6dc4a65)]:
  - @omnigraph/json-schema@0.101.2

## 0.101.1

### Patch Changes

- [#7185](https://github.com/ardatan/graphql-mesh/pull/7185)
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.12)
    (from `^10.0.11`, in `dependencies`)
- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)]:
  - @graphql-mesh/cross-helpers@0.4.4
  - @graphql-mesh/types@0.98.10
  - @graphql-mesh/utils@0.98.10
  - @omnigraph/json-schema@0.101.1

## 0.101.0

### Minor Changes

- [#7145](https://github.com/ardatan/graphql-mesh/pull/7145)
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)
  Thanks [@ardatan](https://github.com/ardatan)! - POTENTIAL BREAKING CHANGE:

  Now `@httpOperation` and `@transport` directive serializes headers as `[string, string][]` instead
  of stringified JSON.

  ```diff
  @httpOperation(
  -  operationSpecificHeaders: [["Authorization", "Bearer 123"], ["X-Api-Key", "123"]]
  +  operationSpecificHeaders: "{\"Authorization\": \"Bearer 123\", \"X-Api-Key\": \"123\"}"
  )
  ```

  ```diff
  @transport(
  -  headers: [["Authorization, "Bearer 123"], ["X-Api-Key", "123"]]
  +  headers: "{\"Authorization, \"Bearer 123\", \"X-Api-Key\": \"123\"}"
  )
  ```

  Also incorrect placement of `@transport` has been fixed to `SCHEMA`

  ```diff
  directive @transport on
  -  FIELD_DEFINITION
  +  SCHEMA
  ```

  There is still backwards compatibility but this might look like a breaking change for some users
  during schema validation.

### Patch Changes

- [#7145](https://github.com/ardatan/graphql-mesh/pull/7145)
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)
  Thanks [@Author](https://github.com/Author), [@User](https://github.com/User)! - New Federation
  Composition Approach for the new Mesh v1 alpha; (If you are using Mesh v0 legacy, ignore this
  changelog)

  Now Mesh Compose produces a superset of Federated Supergraph.
  - Drop any options and implementation related to the old `fusiongraph`
  - - The output is a valid supergraph that can be consumed by any Federation router. But if it is
      not Mesh Serve, the subgraph should still be served via Mesh Serve then consumed by that
      Federation router. If it is Mesh Serve, no additional server is needed because Mesh Serve
      already knows the additional directives etc of the transports
  - Compose the subgraphs using `@theguild/federation-composition` package
  - - So benefit from the validation rules of Federation in Mesh Compose
  - Ability to consume existing federated subgraphs
  - - Since the composition is now Federation, we can accept any federated subgraph
  - Implement Federation transform to transform any subgraph to a federated subgraph by adding
    Federation directives (v2 only) . This is on user's own because they add the directives
    manually. And for `__resolveReference`, we use `@merge` directive to mark a root field as an
    entity resolver for Federation
  - Use additional `@source` directive to consume transforms on the subgraph execution (field
    renames etc)
  - Use additional `@resolveTo` directive to consume additional stitched resolvers
  - Use additional `@transport` directive to choose and configure a specific transport for subgraphs
  - Handle unsupported additional directives with another set of additional directives on `Query`
    for example directives on unions, schema definitions, enum values etc and then
    `@extraUnionDirective` added with missing directives for unions then on the runtime these
    directives are added back to the union for the subgraph execution of the transports.

  Basically Mesh Compose uses Federation spec for composition, validation and runtime BUT the output
  is a superset with these additional directives imported via `@composeDirective`;
  - `@merge` (Taken from Stitching Directives) If a custom entity resolver is defined for a root
    field like below, the gateway will pick it up as an entity resolver;

  ```graphql
  type Query {
     fooById(id: ID!): Foo @merge(keyField: 'id', keyArg: 'id', subgraph: Foo)
  }
  ```

  - `@resolveTo` (Taken from v0) This allows to delegate to a field in any subgraph just like Schema
    Extensions in old Schema Stitching approach;

  ```graphql
      extend type Book {

          @resolveTo(
            sourceName: "authors"
            sourceTypeName: "Query"
            sourceFieldName: "authors"
            keyField: "authorId"
            keysArg: "ids"
          )
      }
  ```

  - `@source` Taken from Fusion This allows us to know how the original definition is in the
    subgraph. If this directive exists, the runtime applies the transforms from Schema Stitching
    during the subgraph execution. This directive can exist in arguments, fields, types etc.

  ```graphql
  type Query {
   @source(type: "MyUser") # This means `User` is actually `MyUser` in the actual subgraph
  }

  type User @source(name: "MyUser") {
    id: ID
    name: String
  }
  ```

  - `@transport` Taken from Fusion This allows us to choose a specific transport (rest, mysql,
    graphql-ws, graphql-http etc) for the subgraph execution with some configuration. In the
    runtime, the gateway loads the transports and passes the subgraph schema with annotations if
    needed to get an executor to execute queries against that subgraph.

  ```graphql
  schema @transport(subgraph: "API", kind: "rest", location: "http://0.0.0.0:<api_port>") {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
  ```

  - `@extraSchemaDefinitionDirective` By default, it is not possible to add directives from subgraph
    to the supergraph but it is possible to do the same thing on types or fields. So we add this
    directive to `Query` for the directives we want to add to the schema. Then the runtime picks
    those per `subgraph` to put the directives back to their original places;

  ```graphql
  type Query @extraSchemaDefinitionDirective(
    directives: {transport: [{subgraph: "petstore", kind: "rest", location: "http://0.0.0.0:<petstore_port>/api/v3"}]}
  )  {
  ```

  - `@extraEnumValueDirective` and `@extraTypeDirective` Same for enum values and unions etc that
    are not supported by the composition library

  > Thanks to these directives, subgraphs can be published individually to Hive for example then the
  > supergraph stored there can be handled by Mesh Gateway since the composition is the same. All
  > the additions etc are done on the subgraph level. For the Fed gateways except Mesh Serve,
  > subgraphs can be served individually by Mesh Serve again while they are consumed by any gw like
  > Apollo Router Shareable is enabled by default for non-federated subgraphs

  Documentation PR has details for users; https://github.com/ardatan/graphql-mesh/pull/7109

- Updated dependencies
  [[`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae),
  [`f985978`](https://github.com/ardatan/graphql-mesh/commit/f9859784ad854207e4d32bda11c904b5301610ee),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae),
  [`ac77ce9`](https://github.com/ardatan/graphql-mesh/commit/ac77ce94f1e9a78e2dace14128ea1d6843732d19)]:
  - @omnigraph/json-schema@0.101.0
  - @graphql-mesh/utils@0.98.9
  - @graphql-mesh/types@0.98.9

## 0.100.14

### Patch Changes

- Updated dependencies []:
  - @omnigraph/json-schema@0.100.13

## 0.100.13

### Patch Changes

- Updated dependencies
  [[`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`4c75671`](https://github.com/ardatan/graphql-mesh/commit/4c756717247eb0a8f3431e31e6c86fc97297bd32),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/utils@0.98.8
  - @graphql-mesh/types@0.98.8
  - @omnigraph/json-schema@0.100.12

## 0.100.12

### Patch Changes

- Updated dependencies
  [[`40d9235`](https://github.com/ardatan/graphql-mesh/commit/40d9235fc9b90b5d3b75adc8228b40bc6e476078)]:
  - @omnigraph/json-schema@0.100.11
  - @graphql-mesh/types@0.98.7
  - @graphql-mesh/utils@0.98.7

## 0.100.11

### Patch Changes

- Updated dependencies
  [[`882091b`](https://github.com/ardatan/graphql-mesh/commit/882091b1cb0b76c110b258c7a52a54eec4ad7815)]:
  - @omnigraph/json-schema@0.100.10

## 0.100.10

### Patch Changes

- [#7030](https://github.com/ardatan/graphql-mesh/pull/7030)
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.11)
    (from `^10.0.10`, in `dependencies`)
- Updated dependencies
  [[`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`3288e30`](https://github.com/ardatan/graphql-mesh/commit/3288e302d3a8ed82a6138e33fa5c47aa95493aec),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/cross-helpers@0.4.3
  - @graphql-mesh/types@0.98.6
  - @graphql-mesh/utils@0.98.6
  - @omnigraph/json-schema@0.100.9

## 0.100.9

### Patch Changes

- Updated dependencies
  [[`c4d2249`](https://github.com/ardatan/graphql-mesh/commit/c4d22497b4249f9a0969e1d01efbe0721774ce73)]:
  - @graphql-mesh/utils@0.98.5
  - @omnigraph/json-schema@0.100.8
  - @graphql-mesh/types@0.98.5

## 0.100.8

### Patch Changes

- Updated dependencies
  [[`5bfef52`](https://github.com/ardatan/graphql-mesh/commit/5bfef5249fd8c02dd7063ee84c0edb52a476f58f)]:
  - @omnigraph/json-schema@0.100.7

## 0.100.7

### Patch Changes

- [`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)
  Thanks [@ardatan](https://github.com/ardatan)! - Update GraphQL Tools packages

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @omnigraph/json-schema@0.100.6
  - @graphql-mesh/types@0.98.4
  - @graphql-mesh/utils@0.98.4

## 0.100.6

### Patch Changes

- Updated dependencies
  [[`234d2f9`](https://github.com/ardatan/graphql-mesh/commit/234d2f9d390bd340b0f7bcdb8f335334ff5f60b9),
  [`234d2f9`](https://github.com/ardatan/graphql-mesh/commit/234d2f9d390bd340b0f7bcdb8f335334ff5f60b9)]:
  - @omnigraph/json-schema@0.100.5
  - json-machete@0.97.3

## 0.100.5

### Patch Changes

- [`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @omnigraph/json-schema@0.100.4
  - @graphql-mesh/types@0.98.3
  - @graphql-mesh/utils@0.98.3

## 0.100.4

### Patch Changes

- Updated dependencies
  [[`f6af4b0`](https://github.com/ardatan/graphql-mesh/commit/f6af4b07807f135d131348839230e2923737af79)]:
  - @omnigraph/json-schema@0.100.3

## 0.100.3

### Patch Changes

- [#6910](https://github.com/ardatan/graphql-mesh/pull/6910)
  [`9f41ea8`](https://github.com/ardatan/graphql-mesh/commit/9f41ea85452440f44b3643cdcee3439c582e7fd0)
  Thanks [@ardatan](https://github.com/ardatan)! - When a custom mime type provided in
  `operationHeaders`, it sets all the fields as generic `JSON` scalar. Fixes
  https://github.com/ardatan/graphql-mesh/issues/4460

## 0.100.2

### Patch Changes

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @omnigraph/json-schema@0.100.2
  - @graphql-mesh/cross-helpers@0.4.2
  - @graphql-mesh/types@0.98.2
  - @graphql-mesh/utils@0.98.2

## 0.100.1

### Patch Changes

- Updated dependencies
  [[`3d88cb8`](https://github.com/ardatan/graphql-mesh/commit/3d88cb8ff1829081411fcb2051ad18d7f89536ba),
  [`6044b7f`](https://github.com/ardatan/graphql-mesh/commit/6044b7f8bd72ee3d4460d9f09f303ea6fc4e007b)]:
  - @graphql-mesh/string-interpolation@0.5.4
  - @graphql-mesh/types@0.98.1
  - @graphql-mesh/utils@0.98.1
  - @omnigraph/json-schema@0.100.1

## 0.100.0

### Patch Changes

- [#6872](https://github.com/ardatan/graphql-mesh/pull/6872)
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.6)
    (from `^10.0.3`, in `dependencies`)
- Updated dependencies
  [[`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`6521fa0`](https://github.com/ardatan/graphql-mesh/commit/6521fa0ec66fd5af734d8ca03941d78d852d3a0c),
  [`d793807`](https://github.com/ardatan/graphql-mesh/commit/d793807f43ece9bf797f1b9fc9252ab959753492),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84),
  [`6521fa0`](https://github.com/ardatan/graphql-mesh/commit/6521fa0ec66fd5af734d8ca03941d78d852d3a0c),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)]:
  - @graphql-mesh/types@0.98.0
  - @graphql-mesh/utils@0.98.0
  - @omnigraph/json-schema@0.100.0
  - json-machete@0.97.2

## 0.99.6

### Patch Changes

- Updated dependencies
  [[`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)]:
  - @graphql-mesh/types@0.97.5
  - @graphql-mesh/utils@0.97.5
  - @omnigraph/json-schema@0.99.6

## 0.99.5

### Patch Changes

- Updated dependencies
  [[`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)]:
  - @graphql-mesh/utils@0.97.4
  - @graphql-mesh/types@0.97.4
  - @omnigraph/json-schema@0.99.5

## 0.99.4

### Patch Changes

- Updated dependencies
  [[`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)]:
  - @graphql-mesh/types@0.97.3
  - @graphql-mesh/utils@0.97.3
  - @omnigraph/json-schema@0.99.4

## 0.99.3

### Patch Changes

- Updated dependencies
  [[`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)]:
  - @graphql-mesh/types@0.97.2
  - @graphql-mesh/utils@0.97.2
  - @omnigraph/json-schema@0.99.3

## 0.99.2

### Patch Changes

- Updated dependencies
  [[`9667954`](https://github.com/ardatan/graphql-mesh/commit/96679547598ccdaf765335b13b937248df662d77)]:
  - @omnigraph/json-schema@0.99.2

## 0.99.1

### Patch Changes

- Updated dependencies
  [[`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)]:
  - @graphql-mesh/types@0.97.1
  - @graphql-mesh/utils@0.97.1
  - @omnigraph/json-schema@0.99.1

## 0.99.0

### Patch Changes

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a),
  [`70b05a2`](https://github.com/ardatan/graphql-mesh/commit/70b05a20a948b5ebed5306c14710c8839225cdad)]:
  - @graphql-mesh/types@0.97.0
  - @graphql-mesh/utils@0.97.0
  - @omnigraph/json-schema@0.99.0

## 0.98.2

### Patch Changes

- Updated dependencies
  [[`0f274ef`](https://github.com/ardatan/graphql-mesh/commit/0f274ef8177068da65e50e08607998d0ed63e8b9)]:
  - @graphql-mesh/utils@0.96.6
  - @omnigraph/json-schema@0.98.2
  - @graphql-mesh/types@0.96.6

## 0.98.1

### Patch Changes

- Updated dependencies
  [[`2138dea`](https://github.com/ardatan/graphql-mesh/commit/2138dea53c28fafe92fa1dc4243e3329d401d064),
  [`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)]:
  - @omnigraph/json-schema@0.98.1
  - @graphql-mesh/types@0.96.5
  - @graphql-mesh/utils@0.96.5

## 0.98.0

### Minor Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING: Now getComposerFromSchema,
  addExecutionDirectivesToComposer, getUnionTypeComposers and getContainerTC needs \`subgraphName\`
  argument

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/delegate@^10.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.3)
    (to `dependencies`)
- Updated dependencies
  [[`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211),
  [`ae7b085`](https://github.com/ardatan/graphql-mesh/commit/ae7b085e93ba911f03bbfd2a15ff9ca8be9f4de8),
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)]:
  - @omnigraph/json-schema@0.98.0
  - @graphql-mesh/types@0.96.4
  - @graphql-mesh/utils@0.96.4

## 0.97.5

### Patch Changes

- Updated dependencies
  [[`ac26793`](https://github.com/ardatan/graphql-mesh/commit/ac26793e59f76f0839b61a8030e0eefc7383e640)]:
  - @graphql-mesh/types@0.96.3
  - @omnigraph/json-schema@0.97.4
  - @graphql-mesh/utils@0.96.3

## 0.97.4

### Patch Changes

- [#6413](https://github.com/ardatan/graphql-mesh/pull/6413)
  [`9c5d9f5`](https://github.com/ardatan/graphql-mesh/commit/9c5d9f5909377a0500ea9998319a6c8766eef433)
  Thanks [@soerenuhrbach](https://github.com/soerenuhrbach)! - Fallback format will now be used
  correctly

## 0.97.3

### Patch Changes

- Updated dependencies
  [[`87501f4`](https://github.com/ardatan/graphql-mesh/commit/87501f45127bdc98440e78c591390e3f735ada00)]:
  - @omnigraph/json-schema@0.97.3

## 0.97.2

### Patch Changes

- Updated dependencies
  [[`d758afa`](https://github.com/ardatan/graphql-mesh/commit/d758afa7da55cf3ed6b4ed9e8cccfd0ed67fe658),
  [`4fac014`](https://github.com/ardatan/graphql-mesh/commit/4fac01400544bc6e8b2a4ae55f1a4dd4771bbc5c)]:
  - @graphql-mesh/types@0.96.2
  - @omnigraph/json-schema@0.97.2
  - @graphql-mesh/utils@0.96.2

## 0.97.1

### Patch Changes

- [#6310](https://github.com/ardatan/graphql-mesh/pull/6310)
  [`427ff87`](https://github.com/ardatan/graphql-mesh/commit/427ff871cd13781a4cd3dd0ead54cad3d100d083)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect `required` fields in allOf definitions

- [#6309](https://github.com/ardatan/graphql-mesh/pull/6309)
  [`c51549d`](https://github.com/ardatan/graphql-mesh/commit/c51549d8d93d94b5bbb09ba60f29b37d10c7cc39)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle input unions in query parameters correctly

- [#6313](https://github.com/ardatan/graphql-mesh/pull/6313)
  [`a665baf`](https://github.com/ardatan/graphql-mesh/commit/a665baf90376cbdb552c7cabbb5e90e856c24fd1)
  Thanks [@ardatan](https://github.com/ardatan)! - Merge allOf properties by respecting specific
  type definitions

- Updated dependencies
  [[`427ff87`](https://github.com/ardatan/graphql-mesh/commit/427ff871cd13781a4cd3dd0ead54cad3d100d083),
  [`c51549d`](https://github.com/ardatan/graphql-mesh/commit/c51549d8d93d94b5bbb09ba60f29b37d10c7cc39),
  [`e6c7fde`](https://github.com/ardatan/graphql-mesh/commit/e6c7fde5b4aec4427beee91b9e9c444d99a9ece1),
  [`a665baf`](https://github.com/ardatan/graphql-mesh/commit/a665baf90376cbdb552c7cabbb5e90e856c24fd1)]:
  - @omnigraph/json-schema@0.97.1
  - json-machete@0.97.1
  - @graphql-mesh/types@0.96.1
  - @graphql-mesh/utils@0.96.1

## 0.97.0

### Patch Changes

- Updated dependencies
  [[`7909bcb8c`](https://github.com/ardatan/graphql-mesh/commit/7909bcb8cbae5d1449f242b1da86e143760ab517),
  [`47a50aa6d`](https://github.com/ardatan/graphql-mesh/commit/47a50aa6d1a1bb9766f0895b206756741c0f6769)]:
  - @omnigraph/json-schema@0.97.0
  - json-machete@0.97.0

## 0.96.0

### Patch Changes

- Updated dependencies
  [[`5c6a8f784`](https://github.com/ardatan/graphql-mesh/commit/5c6a8f784a787641b90349e584b49de629cc41ff)]:
  - @omnigraph/json-schema@0.96.0
  - @graphql-mesh/types@0.96.0
  - json-machete@0.96.0
  - @graphql-mesh/utils@0.96.0

## 0.95.12

### Patch Changes

- Updated dependencies
  [[`9b8ba5d47`](https://github.com/ardatan/graphql-mesh/commit/9b8ba5d472b82af9adddee000e0b32af9c97058e),
  [`b4d38c55d`](https://github.com/ardatan/graphql-mesh/commit/b4d38c55df8c4d2aeb98325555979eb09d065906)]:
  - @omnigraph/json-schema@0.95.12
  - @graphql-mesh/string-interpolation@0.5.3
  - @graphql-mesh/utils@0.95.8
  - json-machete@0.95.8
  - @graphql-mesh/types@0.95.8

## 0.95.11

### Patch Changes

- Updated dependencies
  [[`7f467f522`](https://github.com/Urigo/graphql-mesh/commit/7f467f5227c3bb840a2483f6e8f8a2fed9d907e4)]:
  - @omnigraph/json-schema@0.95.11

## 0.95.10

### Patch Changes

- Updated dependencies
  [[`f55e946fc`](https://github.com/Urigo/graphql-mesh/commit/f55e946fc6472ea7b9bb8d85171b94ce79500cfb)]:
  - @omnigraph/json-schema@0.95.10

## 0.95.9

### Patch Changes

- Updated dependencies
  [[`ae5e7c972`](https://github.com/Urigo/graphql-mesh/commit/ae5e7c9728e572ea75c0f4e3b57dad932658155c)]:
  - @omnigraph/json-schema@0.95.9

## 0.95.8

### Patch Changes

- [`a13969c77`](https://github.com/Urigo/graphql-mesh/commit/a13969c77794c44493d7a9426be7e38a6d673c88)
  Thanks [@ardatan](https://github.com/ardatan)! - Support \`deprecated\` in OpenAPI and JSON
  Schemas

- Updated dependencies
  [[`a13969c77`](https://github.com/Urigo/graphql-mesh/commit/a13969c77794c44493d7a9426be7e38a6d673c88)]:
  - @omnigraph/json-schema@0.95.8
  - @graphql-mesh/types@0.95.7
  - json-machete@0.95.7
  - @graphql-mesh/utils@0.95.7

## 0.95.7

### Patch Changes

- Updated dependencies
  [[`8e1056cf9`](https://github.com/Urigo/graphql-mesh/commit/8e1056cf91b0e7069499f5102aaed163a0168597)]:
  - @graphql-mesh/string-interpolation@0.5.2
  - @omnigraph/json-schema@0.95.7
  - @graphql-mesh/utils@0.95.6
  - json-machete@0.95.6
  - @graphql-mesh/types@0.95.6

## 0.95.6

### Patch Changes

- Updated dependencies
  [[`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781),
  [`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781)]:
  - @graphql-mesh/cross-helpers@0.4.1
  - @graphql-mesh/types@0.95.5
  - json-machete@0.95.5
  - @omnigraph/json-schema@0.95.6
  - @graphql-mesh/utils@0.95.5

## 0.95.5

### Patch Changes

- Updated dependencies
  [[`625e5d787`](https://github.com/Urigo/graphql-mesh/commit/625e5d7878d44abd7c9d1542bf5cdcd4e37e2411)]:
  - @graphql-mesh/types@0.95.4
  - json-machete@0.95.4
  - @omnigraph/json-schema@0.95.5
  - @graphql-mesh/utils@0.95.4

## 0.95.4

### Patch Changes

- Updated dependencies
  [[`33ae7a89a`](https://github.com/Urigo/graphql-mesh/commit/33ae7a89a13f40ebbe0a01620e378fe4a914df7f)]:
  - @graphql-mesh/types@0.95.3
  - @graphql-mesh/utils@0.95.3
  - json-machete@0.95.3
  - @omnigraph/json-schema@0.95.4

## 0.95.3

### Patch Changes

- [#5643](https://github.com/Urigo/graphql-mesh/pull/5643)
  [`94afd25a0`](https://github.com/Urigo/graphql-mesh/commit/94afd25a05581715fb9a0f360859fddba9698fca)
  Thanks [@cweckesser](https://github.com/cweckesser)! - Fix issue regarding allOf operator that
  prevents overlapping sub-properties of objects provided to the operator from being merged
- Updated dependencies
  [[`94afd25a0`](https://github.com/Urigo/graphql-mesh/commit/94afd25a05581715fb9a0f360859fddba9698fca)]:
  - @omnigraph/json-schema@0.95.3

## 0.95.2

### Patch Changes

- Updated dependencies
  [[`d8da4b282`](https://github.com/Urigo/graphql-mesh/commit/d8da4b282ab15ab6d0ea24c78c172e31fa1170ea)]:
  - @graphql-mesh/types@0.95.2
  - json-machete@0.95.2
  - @omnigraph/json-schema@0.95.2
  - @graphql-mesh/utils@0.95.2

## 0.95.1

### Patch Changes

- Updated dependencies
  [[`7cdc69e04`](https://github.com/Urigo/graphql-mesh/commit/7cdc69e0454ab99ea5c3b8072ac28da8f81a8796)]:
  - @graphql-mesh/types@0.95.1
  - json-machete@0.95.1
  - @omnigraph/json-schema@0.95.1
  - @graphql-mesh/utils@0.95.1

## 0.95.0

### Patch Changes

- Updated dependencies
  [[`bb50c4f94`](https://github.com/Urigo/graphql-mesh/commit/bb50c4f941caa59d69186d1415dce5773596e8bc)]:
  - @graphql-mesh/types@0.95.0
  - json-machete@0.95.0
  - @omnigraph/json-schema@0.95.0
  - @graphql-mesh/utils@0.95.0

## 0.94.10

### Patch Changes

- Updated dependencies
  [[`513512887`](https://github.com/Urigo/graphql-mesh/commit/5135128872392291df84c44158f4fcba13cf5b5e),
  [`d1310cdff`](https://github.com/Urigo/graphql-mesh/commit/d1310cdff53c53d5342e28b7c0c1af1dd25c6c75)]:
  - @omnigraph/json-schema@0.94.9
  - @graphql-mesh/utils@0.94.6
  - json-machete@0.94.6
  - @graphql-mesh/types@0.94.6

## 0.94.9

### Patch Changes

- Updated dependencies
  [[`f11e9b307`](https://github.com/Urigo/graphql-mesh/commit/f11e9b307f1336d5ead9a75befdb61de963c6c5b)]:
  - @graphql-mesh/utils@0.94.5
  - json-machete@0.94.5
  - @omnigraph/json-schema@0.94.8
  - @graphql-mesh/types@0.94.5

## 0.94.8

### Patch Changes

- Updated dependencies
  [[`ff1678eea`](https://github.com/Urigo/graphql-mesh/commit/ff1678eeabec67edaa4991b938ef81437cd9361e)]:
  - @graphql-mesh/types@0.94.4
  - json-machete@0.94.4
  - @omnigraph/json-schema@0.94.7
  - @graphql-mesh/utils@0.94.4

## 0.94.7

### Patch Changes

- Updated dependencies
  [[`fba66c6fc`](https://github.com/Urigo/graphql-mesh/commit/fba66c6fc7a0ca15393df8ae5382d97eb0ae8fcf)]:
  - @graphql-mesh/string-interpolation@0.5.1
  - @omnigraph/json-schema@0.94.6
  - @graphql-mesh/utils@0.94.3
  - json-machete@0.94.3
  - @graphql-mesh/types@0.94.3

## 0.94.6

### Patch Changes

- Updated dependencies
  [[`d0d4917f4`](https://github.com/Urigo/graphql-mesh/commit/d0d4917f405d7d6acfba62abef38909e1398ce7c)]:
  - @graphql-mesh/types@0.94.2
  - json-machete@0.94.2
  - @omnigraph/json-schema@0.94.5
  - @graphql-mesh/utils@0.94.2

## 0.94.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.94.1
  - json-machete@0.94.1
  - @omnigraph/json-schema@0.94.4
  - @graphql-mesh/utils@0.94.1

## 0.94.4

### Patch Changes

- Updated dependencies
  [[`298e1c180`](https://github.com/Urigo/graphql-mesh/commit/298e1c18067585b0b65ba444d55f005277dfb4d1)]:
  - @omnigraph/json-schema@0.94.3

## 0.94.3

### Patch Changes

- [#5560](https://github.com/Urigo/graphql-mesh/pull/5560)
  [`4ee9c784d`](https://github.com/Urigo/graphql-mesh/commit/4ee9c784de487a613288eb4b037fc11fd89f31dd)
  Thanks [@devsergiy](https://github.com/devsergiy)! - Fix skipping $resolvedRef property for path
  and responses objects

## 0.94.2

### Patch Changes

- [`98a5ccc55`](https://github.com/Urigo/graphql-mesh/commit/98a5ccc55eb68f4e45acc134573c3baa36dc6aae)
  Thanks [@ardatan](https://github.com/ardatan)! - Update packages

- Updated dependencies
  [[`98a5ccc55`](https://github.com/Urigo/graphql-mesh/commit/98a5ccc55eb68f4e45acc134573c3baa36dc6aae)]:
  - @omnigraph/json-schema@0.94.2

## 0.94.1

### Patch Changes

- [#5517](https://github.com/Urigo/graphql-mesh/pull/5517)
  [`1e9710693`](https://github.com/Urigo/graphql-mesh/commit/1e9710693085ed4932690653b1fe81e381727088)
  Thanks [@devsergiy](https://github.com/devsergiy)! - Fix plain string json encoding of enums

- Updated dependencies
  [[`1e9710693`](https://github.com/Urigo/graphql-mesh/commit/1e9710693085ed4932690653b1fe81e381727088)]:
  - @omnigraph/json-schema@0.94.1

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
    [`@omnigraph/json-schema@^0.93.2` ↗︎](https://www.npmjs.com/package/@omnigraph/json-schema/v/0.93.2)
    (from `^0.93.1`, in `dependencies`)

- [#5503](https://github.com/Urigo/graphql-mesh/pull/5503)
  [`3039224b2`](https://github.com/Urigo/graphql-mesh/commit/3039224b2d9f25c2e203fba6ed7aa461cfa4424f)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle inheritance gracefully

- [#5464](https://github.com/Urigo/graphql-mesh/pull/5464)
  [`ba449bcae`](https://github.com/Urigo/graphql-mesh/commit/ba449bcae85de4731796e6d1ec02273149807afa)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle local references correctly

- Updated dependencies
  [[`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`3d9218360`](https://github.com/Urigo/graphql-mesh/commit/3d9218360dff838b9d3c731c92b3b6e8ad52e2c7),
  [`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`4296a55f4`](https://github.com/Urigo/graphql-mesh/commit/4296a55f4a6fb1c8e1701403cfe88067255ae9b7),
  [`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`bc438f835`](https://github.com/Urigo/graphql-mesh/commit/bc438f83549599a544d956ccbb931cf44fb834f4),
  [`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`bc438f835`](https://github.com/Urigo/graphql-mesh/commit/bc438f83549599a544d956ccbb931cf44fb834f4),
  [`01fb0cc85`](https://github.com/Urigo/graphql-mesh/commit/01fb0cc858dfbf2cd931d1b08b0749a0b82b232c),
  [`ef520d91e`](https://github.com/Urigo/graphql-mesh/commit/ef520d91e6d1800ed63ef016ed74084261788371),
  [`ba449bcae`](https://github.com/Urigo/graphql-mesh/commit/ba449bcae85de4731796e6d1ec02273149807afa),
  [`3039224b2`](https://github.com/Urigo/graphql-mesh/commit/3039224b2d9f25c2e203fba6ed7aa461cfa4424f)]:
  - @graphql-mesh/cross-helpers@0.4.0
  - @graphql-mesh/string-interpolation@0.5.0
  - @graphql-mesh/types@0.94.0
  - @graphql-mesh/utils@0.94.0
  - @omnigraph/json-schema@0.94.0
  - json-machete@0.94.0

## 0.93.2

### Patch Changes

- [#5441](https://github.com/Urigo/graphql-mesh/pull/5441)
  [`5a6b66034`](https://github.com/Urigo/graphql-mesh/commit/5a6b6603437b93f8543c3bf35668c64f1a8a510c)
  Thanks [@devsergiy](https://github.com/devsergiy)! - Fix handling reserved operations names
  (Query,Mutation) used as names of components Allow to use `simple` style of query params

- [#5452](https://github.com/Urigo/graphql-mesh/pull/5452)
  [`8db1e91a8`](https://github.com/Urigo/graphql-mesh/commit/8db1e91a89806cb1f8e6a84a10dc42d02abd0ee3)
  Thanks [@devsergiy](https://github.com/devsergiy)! - skip extension fields in path object make
  comma style default for array param and undefined style

- Updated dependencies
  [[`272c3f9b4`](https://github.com/Urigo/graphql-mesh/commit/272c3f9b4c7f68672e81c05cda5da5ef0e571d88),
  [`5a6b66034`](https://github.com/Urigo/graphql-mesh/commit/5a6b6603437b93f8543c3bf35668c64f1a8a510c),
  [`0db5f9127`](https://github.com/Urigo/graphql-mesh/commit/0db5f912789cbcf5d197f4985a5f9d364b32fc27)]:
  - @omnigraph/json-schema@0.93.2

## 0.93.1

### Patch Changes

- [#5365](https://github.com/Urigo/graphql-mesh/pull/5365)
  [`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@omnigraph/json-schema@^0.93.0` ↗︎](https://www.npmjs.com/package/@omnigraph/json-schema/v/0.93.0)
    (from `^1.0.0`, in `dependencies`)
  - Updated dependency
    [`json-machete@^0.93.0` ↗︎](https://www.npmjs.com/package/json-machete/v/0.93.0) (from
    `^1.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@^0.93.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.93.0)
    (from `^1.0.0`, in `peerDependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.93.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.93.0)
    (from `^1.0.0`, in `peerDependencies`)
- Updated dependencies
  [[`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8),
  [`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8),
  [`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8),
  [`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8)]:
  - @graphql-mesh/types@0.93.1
  - @graphql-mesh/utils@0.93.1
  - @omnigraph/json-schema@0.93.1
  - json-machete@0.93.1

## 1.0.0

### Patch Changes

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
  - json-machete@1.0.0
  - @omnigraph/json-schema@1.0.0

## 0.19.27

### Patch Changes

- [#4934](https://github.com/Urigo/graphql-mesh/pull/4934)
  [`cc754dbb1`](https://github.com/Urigo/graphql-mesh/commit/cc754dbb1cce63cd06f4e3b8ba2b4439d4927089)
  Thanks [@hunterpetersen](https://github.com/hunterpetersen)! - Ignore non object path fields

- Updated dependencies
  [[`870de5dae`](https://github.com/Urigo/graphql-mesh/commit/870de5dae08a7e43d9aa0f52d5d504cffb4d8fc8),
  [`aea134764`](https://github.com/Urigo/graphql-mesh/commit/aea1347645c322437ed6ccfadabcfc23065bc9c8),
  [`a1e08193b`](https://github.com/Urigo/graphql-mesh/commit/a1e08193be3ac8cab5f6f8c84025f934134369b6),
  [`c14a6af5e`](https://github.com/Urigo/graphql-mesh/commit/c14a6af5e16c03dfe60617738ed8610f81bc9ae8),
  [`abc0c8747`](https://github.com/Urigo/graphql-mesh/commit/abc0c8747b274e011f5b8387233fe96d4f702035),
  [`6aa7da6f8`](https://github.com/Urigo/graphql-mesh/commit/6aa7da6f8492adb1af5598e501d089b7b008637a)]:
  - @graphql-mesh/types@0.91.13
  - @omnigraph/json-schema@0.39.0
  - @graphql-mesh/string-interpolation@0.4.4
  - @graphql-mesh/utils@0.43.21

## 0.19.26

### Patch Changes

- [#5252](https://github.com/Urigo/graphql-mesh/pull/5252)
  [`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)
  Thanks [@ardatan](https://github.com/ardatan)! - Make shared packages peer dependency

- Updated dependencies
  [[`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)]:
  - @graphql-mesh/string-interpolation@0.4.3
  - @omnigraph/json-schema@0.38.24
  - @graphql-mesh/cross-helpers@0.3.4
  - json-machete@0.18.20
  - @graphql-mesh/types@0.91.12
  - @graphql-mesh/utils@0.43.20

## 0.19.25

### Patch Changes

- Updated dependencies
  [[`7e7096695`](https://github.com/Urigo/graphql-mesh/commit/7e709669564fa427332b8af00bc66234485f3d54),
  [`7e7096695`](https://github.com/Urigo/graphql-mesh/commit/7e709669564fa427332b8af00bc66234485f3d54)]:
  - @graphql-mesh/types@0.91.11
  - @omnigraph/json-schema@0.38.23
  - json-machete@0.18.19
  - @graphql-mesh/utils@0.43.19

## 0.19.24

### Patch Changes

- Updated dependencies
  [[`3f658a771`](https://github.com/Urigo/graphql-mesh/commit/3f658a7711cd68bc7451c1494699c5ffb8e919ce),
  [`3f658a771`](https://github.com/Urigo/graphql-mesh/commit/3f658a7711cd68bc7451c1494699c5ffb8e919ce),
  [`3f658a771`](https://github.com/Urigo/graphql-mesh/commit/3f658a7711cd68bc7451c1494699c5ffb8e919ce)]:
  - @omnigraph/json-schema@0.38.22
  - @graphql-mesh/utils@0.43.18
  - json-machete@0.18.18
  - @graphql-mesh/types@0.91.10

## 0.19.23

### Patch Changes

- Updated dependencies
  [[`a272fdbca`](https://github.com/Urigo/graphql-mesh/commit/a272fdbca655b17119fb1dcb1c44498f387b1edc)]:
  - @graphql-mesh/types@0.91.9
  - json-machete@0.18.17
  - @omnigraph/json-schema@0.38.21
  - @graphql-mesh/utils@0.43.17

## 0.19.22

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.91.8
  - json-machete@0.18.16
  - @omnigraph/json-schema@0.38.20
  - @graphql-mesh/utils@0.43.16

## 0.19.21

### Patch Changes

- Updated dependencies
  [[`30d4c7cac`](https://github.com/Urigo/graphql-mesh/commit/30d4c7cacfd904076863808e7f82316dd791f08b)]:
  - @omnigraph/json-schema@0.38.19

## 0.19.20

### Patch Changes

- Updated dependencies
  [[`accc99a6e`](https://github.com/Urigo/graphql-mesh/commit/accc99a6e54bbd62fd99057813c692b7149a6c4a)]:
  - @omnigraph/json-schema@0.38.18

## 0.19.19

### Patch Changes

- Updated dependencies
  [[`fa2c010c1`](https://github.com/Urigo/graphql-mesh/commit/fa2c010c13f95ce401c345a1330d8fddabeebc17)]:
  - @graphql-mesh/utils@0.43.15
  - json-machete@0.18.15
  - @omnigraph/json-schema@0.38.17
  - @graphql-mesh/types@0.91.7

## 0.19.18

### Patch Changes

- Updated dependencies
  [[`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391),
  [`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391)]:
  - @graphql-mesh/types@0.91.6
  - @graphql-mesh/utils@0.43.14
  - json-machete@0.18.14
  - @omnigraph/json-schema@0.38.16

## 0.19.17

### Patch Changes

- [`6b4b0e16d`](https://github.com/Urigo/graphql-mesh/commit/6b4b0e16d35907e69990daededd9d400b00a365b)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not count \`servers\` under operation as an
  HTTP method

## 0.19.16

### Patch Changes

- Updated dependencies
  [[`5c19f8d6f`](https://github.com/Urigo/graphql-mesh/commit/5c19f8d6f79f2d9bfbeb6458c8dc7a1729c37db9)]:
  - @graphql-mesh/types@0.91.5
  - json-machete@0.18.13
  - @omnigraph/json-schema@0.38.15
  - @graphql-mesh/utils@0.43.13

## 0.19.15

### Patch Changes

- Updated dependencies
  [[`63ab17f0b`](https://github.com/Urigo/graphql-mesh/commit/63ab17f0bd402b5a3923d752ba715f556f3beadd)]:
  - @graphql-mesh/types@0.91.4
  - json-machete@0.18.12
  - @omnigraph/json-schema@0.38.14
  - @graphql-mesh/utils@0.43.12

## 0.19.14

### Patch Changes

- Updated dependencies
  [[`bb58a5d9e`](https://github.com/Urigo/graphql-mesh/commit/bb58a5d9e41fd359180da97d8c1b5d628fa31ad3)]:
  - json-machete@0.18.11
  - @omnigraph/json-schema@0.38.13

## 0.19.13

### Patch Changes

- Updated dependencies
  [[`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e),
  [`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e)]:
  - @graphql-mesh/types@0.91.3
  - @graphql-mesh/utils@0.43.11
  - json-machete@0.18.10
  - @omnigraph/json-schema@0.38.12

## 0.19.12

### Patch Changes

- Updated dependencies
  [[`975715275`](https://github.com/Urigo/graphql-mesh/commit/9757152751e37062bca4ba114bee65a0c79a3d4d),
  [`989a47802`](https://github.com/Urigo/graphql-mesh/commit/989a478027b703ab969d529f09bc83071fe4f96f)]:
  - @graphql-mesh/cross-helpers@0.3.3
  - json-machete@0.18.9
  - @graphql-mesh/types@0.91.2
  - @omnigraph/json-schema@0.38.11
  - @graphql-mesh/utils@0.43.10

## 0.19.11

### Patch Changes

- Updated dependencies
  [[`d694ccc1f`](https://github.com/Urigo/graphql-mesh/commit/d694ccc1f5a2cbc3ed97778a3210594005f2830b)]:
  - @graphql-mesh/utils@0.43.9
  - json-machete@0.18.8
  - @omnigraph/json-schema@0.38.10
  - @graphql-mesh/types@0.91.1

## 0.19.10

### Patch Changes

- Updated dependencies
  [[`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`e246b4d63`](https://github.com/Urigo/graphql-mesh/commit/e246b4d63b3c7f2b56c5447d771cc68f6fd6b354),
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`7e8bb87dd`](https://github.com/Urigo/graphql-mesh/commit/7e8bb87ddf4cb1210db6873334bdd18007cc0552)]:
  - @graphql-mesh/cross-helpers@0.3.2
  - @graphql-mesh/types@0.91.0
  - @graphql-mesh/utils@0.43.8
  - @omnigraph/json-schema@0.38.9
  - json-machete@0.18.7

## 0.19.9

### Patch Changes

- Updated dependencies
  [[`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72),
  [`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72),
  [`bcf29dfd0`](https://github.com/Urigo/graphql-mesh/commit/bcf29dfd02d19cf5c770b83fc627f059569a0fac)]:
  - @graphql-mesh/types@0.90.0
  - @graphql-mesh/utils@0.43.7
  - json-machete@0.18.6
  - @omnigraph/json-schema@0.38.8

## 0.19.8

### Patch Changes

- Updated dependencies
  [[`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5),
  [`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5)]:
  - @graphql-mesh/types@0.89.5
  - @graphql-mesh/utils@0.43.6
  - json-machete@0.18.5
  - @omnigraph/json-schema@0.38.7

## 0.19.7

### Patch Changes

- [#4930](https://github.com/Urigo/graphql-mesh/pull/4930)
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Prettier fixes

- [#5020](https://github.com/Urigo/graphql-mesh/pull/5020)
  [`d573d203f`](https://github.com/Urigo/graphql-mesh/commit/d573d203f8bb04ff75cb4d83ba0deaa2bf9818a7)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Use local cookies handler, remove
  itty-router-extras

- Updated dependencies
  [[`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`ad938f485`](https://github.com/Urigo/graphql-mesh/commit/ad938f485a9b881a0379284ac582c6c599aa1117),
  [`bb5abc15d`](https://github.com/Urigo/graphql-mesh/commit/bb5abc15d8ff9227f5fc9fafe78d1befc7ae0797),
  [`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664),
  [`fb9113d5b`](https://github.com/Urigo/graphql-mesh/commit/fb9113d5bfc4865d51f9cb1bd3236c7c0c27b170),
  [`ad938f485`](https://github.com/Urigo/graphql-mesh/commit/ad938f485a9b881a0379284ac582c6c599aa1117),
  [`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`1a3642884`](https://github.com/Urigo/graphql-mesh/commit/1a364288400848e9b238bfdd4e98323f38a88289),
  [`debb1c80e`](https://github.com/Urigo/graphql-mesh/commit/debb1c80ef94af789c7e9eda2ceea882f3d2c83b),
  [`d573d203f`](https://github.com/Urigo/graphql-mesh/commit/d573d203f8bb04ff75cb4d83ba0deaa2bf9818a7)]:
  - @graphql-mesh/cross-helpers@0.3.1
  - @graphql-mesh/types@0.89.4
  - @graphql-mesh/utils@0.43.5
  - @omnigraph/json-schema@0.38.6
  - @graphql-mesh/string-interpolation@0.4.2
  - json-machete@0.18.4

## 0.19.6

### Patch Changes

- Updated dependencies
  [[`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9),
  [`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9)]:
  - @graphql-mesh/types@0.89.3
  - @graphql-mesh/utils@0.43.4
  - json-machete@0.18.3
  - @omnigraph/json-schema@0.38.5

## 0.19.5

### Patch Changes

- [#4922](https://github.com/Urigo/graphql-mesh/pull/4922)
  [`766be703f`](https://github.com/Urigo/graphql-mesh/commit/766be703f88bbac7a5d1a15cc506cb186791fcf2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`openapi-types@12.1.0` ↗︎](https://www.npmjs.com/package/openapi-types/v/12.1.0) (from
    `12.0.2`, in `dependencies`)

## 0.19.4

### Patch Changes

- [#4914](https://github.com/Urigo/graphql-mesh/pull/4914)
  [`839e2458f`](https://github.com/Urigo/graphql-mesh/commit/839e2458f57fb57105a6b35c9b9a777c53c834f0)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid '.' imports for ESM support

- Updated dependencies
  [[`839e2458f`](https://github.com/Urigo/graphql-mesh/commit/839e2458f57fb57105a6b35c9b9a777c53c834f0)]:
  - @omnigraph/json-schema@0.38.4

## 0.19.3

### Patch Changes

- Updated dependencies
  [[`deb9912e0`](https://github.com/Urigo/graphql-mesh/commit/deb9912e0bc2ae782c9570b60a7224b47af341eb)]:
  - @omnigraph/json-schema@0.38.3
  - @graphql-mesh/string-interpolation@0.4.1
  - @graphql-mesh/types@0.89.2
  - @graphql-mesh/utils@0.43.3
  - json-machete@0.18.2

## 0.19.2

### Patch Changes

- Updated dependencies
  [[`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43),
  [`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43)]:
  - @graphql-mesh/types@0.89.1
  - @graphql-mesh/utils@0.43.2
  - json-machete@0.18.1
  - @omnigraph/json-schema@0.38.2

## 0.19.1

### Patch Changes

- Updated dependencies
  [[`d880342f6`](https://github.com/Urigo/graphql-mesh/commit/d880342f63926df994b66157d3781b0ae090648c)]:
  - @omnigraph/json-schema@0.38.1

## 0.19.0

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
  - json-machete@0.18.0
  - @omnigraph/json-schema@0.38.0
  - @graphql-mesh/types@0.89.0
  - @graphql-mesh/utils@0.43.1

## 0.18.0

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
  [`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f),
  [`1a28c92c2`](https://github.com/Urigo/graphql-mesh/commit/1a28c92c2d67b89b48581b7bb1414d1404428cdb),
  [`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f)]:
  - @graphql-mesh/cross-helpers@0.3.0
  - @graphql-mesh/string-interpolation@0.4.0
  - @graphql-mesh/types@0.88.0
  - @graphql-mesh/utils@0.43.0
  - @omnigraph/json-schema@0.37.0
  - json-machete@0.17.0

## 0.17.11

### Patch Changes

- Updated dependencies
  [[`eba73c626`](https://github.com/Urigo/graphql-mesh/commit/eba73c6261a2fdde8ece31915202203b70ff0e5f),
  [`979e8dcc6`](https://github.com/Urigo/graphql-mesh/commit/979e8dcc6c59f5a2f04588f8c0b6dd3e6eea3332)]:
  - @graphql-mesh/utils@0.42.9
  - @omnigraph/json-schema@0.36.11
  - json-machete@0.16.5
  - @graphql-mesh/types@0.87.1

## 0.17.10

### Patch Changes

- Updated dependencies
  [[`0d9771428`](https://github.com/Urigo/graphql-mesh/commit/0d97714284a6eea31c2c9420addd4a1518584924),
  [`686b3301b`](https://github.com/Urigo/graphql-mesh/commit/686b3301b2441bc095a379d95e77686b4f5ceb70)]:
  - @graphql-mesh/types@0.87.0
  - json-machete@0.16.4
  - @omnigraph/json-schema@0.36.10
  - @graphql-mesh/utils@0.42.8

## 0.17.9

### Patch Changes

- Updated dependencies
  [[`b390ecd1d`](https://github.com/Urigo/graphql-mesh/commit/b390ecd1dacd11fe74b81d6ee9b4678d9759c2e8)]:
  - @omnigraph/json-schema@0.36.9

## 0.17.8

### Patch Changes

- [#4825](https://github.com/Urigo/graphql-mesh/pull/4825)
  [`3d8f23adb`](https://github.com/Urigo/graphql-mesh/commit/3d8f23adb28ca102b19433eca5baf8d341ac7305)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes on handling plural anyOf types

- Updated dependencies
  [[`3d8f23adb`](https://github.com/Urigo/graphql-mesh/commit/3d8f23adb28ca102b19433eca5baf8d341ac7305)]:
  - json-machete@0.16.3
  - @omnigraph/json-schema@0.36.8

## 0.17.7

### Patch Changes

- [#4777](https://github.com/Urigo/graphql-mesh/pull/4777)
  [`baa4fbf82`](https://github.com/Urigo/graphql-mesh/commit/baa4fbf82af4a8787b9cab8c99e9177e3491ecf8)
  Thanks [@dr3](https://github.com/dr3)! - Allow pascal-cased `Query` and `Mutation` values for
  `selectQueryOrMutationField`

- [#4792](https://github.com/Urigo/graphql-mesh/pull/4792)
  [`d63bd93e0`](https://github.com/Urigo/graphql-mesh/commit/d63bd93e0feedf7bcdb4dc49c22e3c09d11ee8ea)
  Thanks [@ardatan](https://github.com/ardatan)! - Add suffix to the existing "Subscription" types
  to avoid conflicts

- [#4784](https://github.com/Urigo/graphql-mesh/pull/4784)
  [`27d26125f`](https://github.com/Urigo/graphql-mesh/commit/27d26125f10a75883a8af98542f57e0a9fa1611c)
  Thanks [@dr3](https://github.com/dr3)! - Use `string` for untyped parameters

- [#4781](https://github.com/Urigo/graphql-mesh/pull/4781)
  [`6084e4153`](https://github.com/Urigo/graphql-mesh/commit/6084e4153e49cca3341eb11017c5611f8348499a)
  Thanks [@dr3](https://github.com/dr3)! - Use JSON scalar for the object types without any explicit
  fields

- Updated dependencies
  [[`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33),
  [`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33),
  [`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33),
  [`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33),
  [`76deb32d1`](https://github.com/Urigo/graphql-mesh/commit/76deb32d1c036bc8da171be55582ec3f7b9c5015),
  [`baa4fbf82`](https://github.com/Urigo/graphql-mesh/commit/baa4fbf82af4a8787b9cab8c99e9177e3491ecf8),
  [`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33),
  [`d63bd93e0`](https://github.com/Urigo/graphql-mesh/commit/d63bd93e0feedf7bcdb4dc49c22e3c09d11ee8ea),
  [`6084e4153`](https://github.com/Urigo/graphql-mesh/commit/6084e4153e49cca3341eb11017c5611f8348499a),
  [`cf9c6d5e0`](https://github.com/Urigo/graphql-mesh/commit/cf9c6d5e00e41f2403bcb9ad1a6e403390ff3ec6)]:
  - @graphql-mesh/cross-helpers@0.2.10
  - @graphql-mesh/types@0.86.0
  - @graphql-mesh/utils@0.42.7
  - @omnigraph/json-schema@0.36.7
  - json-machete@0.16.2

## 0.17.6

### Patch Changes

- Updated dependencies
  [[`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a),
  [`d9c5c1195`](https://github.com/Urigo/graphql-mesh/commit/d9c5c119522a1c4cad455d62818e07a2b8f41005),
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a),
  [`85e5071d0`](https://github.com/Urigo/graphql-mesh/commit/85e5071d084d5372830213511f55f4a30a17bb33),
  [`d9c5c1195`](https://github.com/Urigo/graphql-mesh/commit/d9c5c119522a1c4cad455d62818e07a2b8f41005),
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a),
  [`85e5071d0`](https://github.com/Urigo/graphql-mesh/commit/85e5071d084d5372830213511f55f4a30a17bb33),
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a),
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a),
  [`c55e68381`](https://github.com/Urigo/graphql-mesh/commit/c55e683816bd5668fa9e520e6e434363a2a78425)]:
  - @graphql-mesh/cross-helpers@0.2.9
  - @graphql-mesh/types@0.85.7
  - @graphql-mesh/utils@0.42.6
  - @omnigraph/json-schema@0.36.6
  - json-machete@0.16.1

## 0.17.5

### Patch Changes

- Updated dependencies
  [[`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a),
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a),
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a),
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a),
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a),
  [`ee19b91c1`](https://github.com/Urigo/graphql-mesh/commit/ee19b91c1621d6ab95f503be85d1adff8d43bece)]:
  - @graphql-mesh/cross-helpers@0.2.8
  - @graphql-mesh/types@0.85.6
  - @graphql-mesh/utils@0.42.5
  - @omnigraph/json-schema@0.36.5
  - json-machete@0.16.0

## 0.17.4

### Patch Changes

- Updated dependencies
  [[`d5f2d950e`](https://github.com/Urigo/graphql-mesh/commit/d5f2d950e6318a74c062c9dbc436d5e9c0e8d59d)]:
  - json-machete@0.15.14
  - @graphql-mesh/utils@0.42.4
  - @omnigraph/json-schema@0.36.4
  - @graphql-mesh/types@0.85.5

## 0.17.3

### Patch Changes

- Updated dependencies
  [[`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd),
  [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd),
  [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd),
  [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd),
  [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd)]:
  - @graphql-mesh/cross-helpers@0.2.7
  - @graphql-mesh/types@0.85.4
  - @graphql-mesh/utils@0.42.3
  - @omnigraph/json-schema@0.36.3
  - json-machete@0.15.13

## 0.17.2

### Patch Changes

- [#4732](https://github.com/Urigo/graphql-mesh/pull/4732)
  [`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/string-interpolation@0.3.3` ↗︎](https://www.npmjs.com/package/@graphql-mesh/string-interpolation/v/0.3.3)
    (from `0.3.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@0.85.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.85.2)
    (from `0.85.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@0.42.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.42.1)
    (from `0.42.0`, in `dependencies`)
  - Updated dependency
    [`@omnigraph/json-schema@0.36.1` ↗︎](https://www.npmjs.com/package/@omnigraph/json-schema/v/0.36.1)
    (from `0.36.0`, in `dependencies`)
  - Updated dependency
    [`json-machete@0.15.11` ↗︎](https://www.npmjs.com/package/json-machete/v/0.15.11) (from
    `0.15.10`, in `dependencies`)
- Updated dependencies
  [[`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56),
  [`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56),
  [`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56),
  [`7245981d7`](https://github.com/Urigo/graphql-mesh/commit/7245981d7ffce1cfb5883564825518b0af4e5b4a),
  [`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56)]:
  - @graphql-mesh/types@0.85.3
  - @graphql-mesh/utils@0.42.2
  - @omnigraph/json-schema@0.36.2
  - json-machete@0.15.12

## 0.17.1

### Patch Changes

- Updated dependencies
  [[`5c87cfc60`](https://github.com/Urigo/graphql-mesh/commit/5c87cfc60501213e8701482b093490ec1a5fce23),
  [`c72d904dc`](https://github.com/Urigo/graphql-mesh/commit/c72d904dc11adfd3b6ee1695b1aaeae6ab64e1e9),
  [`09c286994`](https://github.com/Urigo/graphql-mesh/commit/09c28699441cda92f79e4e9b8464e7be5f46a786),
  [`c72d904dc`](https://github.com/Urigo/graphql-mesh/commit/c72d904dc11adfd3b6ee1695b1aaeae6ab64e1e9)]:
  - @graphql-mesh/string-interpolation@0.3.3
  - @omnigraph/json-schema@0.36.1
  - @graphql-mesh/types@0.85.2
  - json-machete@0.15.11
  - @graphql-mesh/utils@0.42.1

## 0.17.0

### Minor Changes

- [#4708](https://github.com/Urigo/graphql-mesh/pull/4708)
  [`1d61fbcec`](https://github.com/Urigo/graphql-mesh/commit/1d61fbcecb8d5b286bb1c2e727bdf7d233c566da)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING:
  - ":" character is now sanitized as "_" instead of "\_COLON_"
  - If a path starts with a variable like "{" in an OAS operation, "by\_" prefix is no longer added.

### Patch Changes

- Updated dependencies
  [[`398af2bf6`](https://github.com/Urigo/graphql-mesh/commit/398af2bf602182ca315bc8d99d2237ad1a16ee48),
  [`1d61fbcec`](https://github.com/Urigo/graphql-mesh/commit/1d61fbcecb8d5b286bb1c2e727bdf7d233c566da),
  [`a8d681274`](https://github.com/Urigo/graphql-mesh/commit/a8d6812742bbbdac53f8ecd76780459fc1950208)]:
  - @graphql-mesh/types@0.85.1
  - @graphql-mesh/utils@0.42.0
  - @omnigraph/json-schema@0.36.0
  - json-machete@0.15.10

## 0.16.10

### Patch Changes

- Updated dependencies
  [[`9d3b3cdf1`](https://github.com/Urigo/graphql-mesh/commit/9d3b3cdf1f921e1906b4b9be8c837ff0504d4d5d),
  [`56f852b39`](https://github.com/Urigo/graphql-mesh/commit/56f852b393e15e384ed055bc6037a055feaa57e8)]:
  - @omnigraph/json-schema@0.35.10

## 0.16.9

### Patch Changes

- Updated dependencies
  [[`6fb57d3ba`](https://github.com/Urigo/graphql-mesh/commit/6fb57d3ba6ce68e47d9f5dbf54e57d178441fa18),
  [`814f2d516`](https://github.com/Urigo/graphql-mesh/commit/814f2d51692df593fcf368765e9c8a0ce99f46bd)]:
  - @graphql-mesh/types@0.85.0
  - json-machete@0.15.9
  - @omnigraph/json-schema@0.35.9
  - @graphql-mesh/utils@0.41.22

## 0.16.8

### Patch Changes

- Updated dependencies
  [[`637e9e9d8`](https://github.com/Urigo/graphql-mesh/commit/637e9e9d8a702cf28cde48137a0f73bab7628f6d)]:
  - @graphql-mesh/types@0.84.10
  - json-machete@0.15.8
  - @omnigraph/json-schema@0.35.8
  - @graphql-mesh/utils@0.41.21

## 0.16.7

### Patch Changes

- Updated dependencies
  [[`48171a006`](https://github.com/Urigo/graphql-mesh/commit/48171a0064c788d6e8ebed7a4f7aa67a5577cdc5),
  [`48171a006`](https://github.com/Urigo/graphql-mesh/commit/48171a0064c788d6e8ebed7a4f7aa67a5577cdc5),
  [`dd831a7d1`](https://github.com/Urigo/graphql-mesh/commit/dd831a7d1256400d1b7441cfb99b517cf856ce5b)]:
  - @omnigraph/json-schema@0.35.7
  - json-machete@0.15.7
  - @graphql-mesh/types@0.84.9
  - @graphql-mesh/utils@0.41.20

## 0.16.6

### Patch Changes

- Updated dependencies
  [[`5b44abcd2`](https://github.com/Urigo/graphql-mesh/commit/5b44abcd2aaa765ee329539112d9dface063efa6)]:
  - @graphql-mesh/utils@0.41.19
  - json-machete@0.15.6
  - @omnigraph/json-schema@0.35.6
  - @graphql-mesh/types@0.84.8

## 0.16.5

### Patch Changes

- Updated dependencies
  [[`ffb301435`](https://github.com/Urigo/graphql-mesh/commit/ffb3014353c17d23a03cf8001eba606c85c2043f),
  [`ffb301435`](https://github.com/Urigo/graphql-mesh/commit/ffb3014353c17d23a03cf8001eba606c85c2043f)]:
  - @graphql-mesh/types@0.84.7
  - @graphql-mesh/utils@0.41.18
  - json-machete@0.15.5
  - @omnigraph/json-schema@0.35.5

## 0.16.4

### Patch Changes

- Updated dependencies
  [[`31a64714a`](https://github.com/Urigo/graphql-mesh/commit/31a64714a3e47dc41b950b3e1cfd1a49e7ff2d8a),
  [`31a64714a`](https://github.com/Urigo/graphql-mesh/commit/31a64714a3e47dc41b950b3e1cfd1a49e7ff2d8a)]:
  - @graphql-mesh/types@0.84.6
  - @graphql-mesh/utils@0.41.17
  - json-machete@0.15.4
  - @omnigraph/json-schema@0.35.4

## 0.16.3

### Patch Changes

- Updated dependencies
  [[`88ab8f9ae`](https://github.com/Urigo/graphql-mesh/commit/88ab8f9ae32a4d0f52c978d625082abe075bebe4)]:
  - @graphql-mesh/utils@0.41.16
  - json-machete@0.15.3
  - @omnigraph/json-schema@0.35.3
  - @graphql-mesh/types@0.84.5

## 0.16.2

### Patch Changes

- Updated dependencies
  [[`186e37bcd`](https://github.com/Urigo/graphql-mesh/commit/186e37bcd94c6eae16b30abd2f4c8b04d2ef422e)]:
  - @graphql-mesh/utils@0.41.15
  - json-machete@0.15.2
  - @omnigraph/json-schema@0.35.2
  - @graphql-mesh/types@0.84.4

## 0.16.1

### Patch Changes

- Updated dependencies
  [[`93f4ed55d`](https://github.com/Urigo/graphql-mesh/commit/93f4ed55de7b9f2a55e11bf1df4ab7b4c59b3825),
  [`d08ed0e77`](https://github.com/Urigo/graphql-mesh/commit/d08ed0e77a274ceaccff6c7a2b2c80326ca5d035)]:
  - @graphql-mesh/utils@0.41.14
  - @omnigraph/json-schema@0.35.1
  - json-machete@0.15.1
  - @graphql-mesh/types@0.84.3

## 0.16.0

### Minor Changes

- [#4556](https://github.com/Urigo/graphql-mesh/pull/4556)
  [`10f469e10`](https://github.com/Urigo/graphql-mesh/commit/10f469e109105edaa2ba4d9111bc671ba58baae8)
  Thanks [@ardatan](https://github.com/ardatan)! - If a component(response, requestBody, header or
  parameter) defined in OpenAPI schema, and its schema doesn't have a title, use the component
  object's title for that schema

  ```yaml
  components:
    parameters:
      Foo:
        title: Foo
        in: query
        schema:
          # OAS Loader adds the following title
          # title: Foo_parameter
          type: string
          enum:
            - a
            - b
  ```

### Patch Changes

- [#4556](https://github.com/Urigo/graphql-mesh/pull/4556)
  [`10f469e10`](https://github.com/Urigo/graphql-mesh/commit/10f469e109105edaa2ba4d9111bc671ba58baae8)
  Thanks [@ardatan](https://github.com/ardatan)! - For `const` definitions, force `{value}_const`
  pattern for the generated titles instead of path based names

- Updated dependencies
  [[`10f469e10`](https://github.com/Urigo/graphql-mesh/commit/10f469e109105edaa2ba4d9111bc671ba58baae8),
  [`10f469e10`](https://github.com/Urigo/graphql-mesh/commit/10f469e109105edaa2ba4d9111bc671ba58baae8),
  [`10f469e10`](https://github.com/Urigo/graphql-mesh/commit/10f469e109105edaa2ba4d9111bc671ba58baae8)]:
  - json-machete@0.15.0
  - @omnigraph/json-schema@0.35.0

## 0.15.4

### Patch Changes

- Updated dependencies
  [[`ff251e4c7`](https://github.com/Urigo/graphql-mesh/commit/ff251e4c7654306d3030774447c991788768e148)]:
  - @graphql-mesh/types@0.84.2
  - json-machete@0.14.14
  - @omnigraph/json-schema@0.34.4
  - @graphql-mesh/utils@0.41.13

## 0.15.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.84.1
  - json-machete@0.14.13
  - @omnigraph/json-schema@0.34.3
  - @graphql-mesh/utils@0.41.12

## 0.15.2

### Patch Changes

- Updated dependencies
  [[`3cdb71eb7`](https://github.com/Urigo/graphql-mesh/commit/3cdb71eb7e8d524497ba4cf5ce46753dc8b2d9fa)]:
  - @omnigraph/json-schema@0.34.2

## 0.15.1

### Patch Changes

- Updated dependencies
  [[`077e65c18`](https://github.com/Urigo/graphql-mesh/commit/077e65c1857aaefa2689f33decc9e72ded281c94),
  [`ee1cb6f76`](https://github.com/Urigo/graphql-mesh/commit/ee1cb6f7620f71fd824e69f4171cfef6c5d51794)]:
  - @graphql-mesh/types@0.84.0
  - json-machete@0.14.12
  - @omnigraph/json-schema@0.34.1
  - @graphql-mesh/utils@0.41.11

## 0.15.0

### Minor Changes

- [#4484](https://github.com/Urigo/graphql-mesh/pull/4484)
  [`80013a3cd`](https://github.com/Urigo/graphql-mesh/commit/80013a3cd836bcc6239b83b4eb0c27a7f7ef2cd7)
  Thanks [@ardatan](https://github.com/ardatan)! - If a union type has a single element, do not
  create that union type but use the element directly

### Patch Changes

- Updated dependencies
  [[`80013a3cd`](https://github.com/Urigo/graphql-mesh/commit/80013a3cd836bcc6239b83b4eb0c27a7f7ef2cd7)]:
  - @omnigraph/json-schema@0.34.0
  - @graphql-mesh/types@0.83.5
  - json-machete@0.14.11
  - @graphql-mesh/utils@0.41.10

## 0.14.11

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
    [`@omnigraph/json-schema@0.33.6` ↗︎](https://www.npmjs.com/package/@omnigraph/json-schema/v/0.33.6)
    (from `0.33.0`, in `dependencies`)
  - Updated dependency
    [`json-machete@0.14.9` ↗︎](https://www.npmjs.com/package/json-machete/v/0.14.9) (from `0.14.3`,
    in `dependencies`)

- [`317f6b454`](https://github.com/Urigo/graphql-mesh/commit/317f6b454db59e351cf6360df5575248cb579dd4)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump fetch and server packages and avoid using
  Response.redirect which needs a full path but instead Response with Location header works better

- Updated dependencies
  [[`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2),
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2),
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2),
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2),
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2),
  [`317f6b454`](https://github.com/Urigo/graphql-mesh/commit/317f6b454db59e351cf6360df5575248cb579dd4)]:
  - @graphql-mesh/cross-helpers@0.2.6
  - @graphql-mesh/types@0.83.4
  - @graphql-mesh/utils@0.41.9
  - @omnigraph/json-schema@0.33.7
  - json-machete@0.14.10

## 0.14.10

### Patch Changes

- Updated dependencies
  [[`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f),
  [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f),
  [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f),
  [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f),
  [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f)]:
  - @graphql-mesh/cross-helpers@0.2.5
  - @graphql-mesh/types@0.83.3
  - @graphql-mesh/utils@0.41.8
  - @omnigraph/json-schema@0.33.6
  - json-machete@0.14.9

## 0.14.9

### Patch Changes

- Updated dependencies
  [[`d84f81d94`](https://github.com/Urigo/graphql-mesh/commit/d84f81d9487ce228125863b8b283adab75daff19)]:
  - @graphql-mesh/utils@0.41.7
  - json-machete@0.14.8
  - @omnigraph/json-schema@0.33.5
  - @graphql-mesh/types@0.83.2

## 0.14.8

### Patch Changes

- Updated dependencies
  [[`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8),
  [`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8),
  [`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8)]:
  - @graphql-mesh/utils@0.41.6
  - @omnigraph/json-schema@0.33.4
  - json-machete@0.14.7
  - @graphql-mesh/types@0.83.1

## 0.14.7

### Patch Changes

- Updated dependencies
  [[`a56ebcec5`](https://github.com/Urigo/graphql-mesh/commit/a56ebcec503402fbdb3d4e3561fd2e38e4dd5c43),
  [`24afabece`](https://github.com/Urigo/graphql-mesh/commit/24afabece51aee171f902776d3f59b4a17026c49),
  [`44b868196`](https://github.com/Urigo/graphql-mesh/commit/44b86819695a298e60b1d7b6c54ae2772e8f1588)]:
  - @graphql-mesh/types@0.83.0
  - json-machete@0.14.6
  - @omnigraph/json-schema@0.33.3
  - @graphql-mesh/utils@0.41.5

## 0.14.6

### Patch Changes

- Updated dependencies
  [[`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53),
  [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53),
  [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53),
  [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53),
  [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53)]:
  - @graphql-mesh/cross-helpers@0.2.4
  - @graphql-mesh/types@0.82.3
  - @graphql-mesh/utils@0.41.4
  - @omnigraph/json-schema@0.33.2
  - json-machete@0.14.5

## 0.14.5

### Patch Changes

- Updated dependencies
  [[`b9bb80094`](https://github.com/Urigo/graphql-mesh/commit/b9bb8009407d27440267a5e9a7ec5dbfecc9bf8f),
  [`b9bb80094`](https://github.com/Urigo/graphql-mesh/commit/b9bb8009407d27440267a5e9a7ec5dbfecc9bf8f)]:
  - @omnigraph/json-schema@0.33.1
  - @graphql-mesh/types@0.82.2
  - json-machete@0.14.4
  - @graphql-mesh/utils@0.41.3

## 0.14.4

### Patch Changes

- [#4426](https://github.com/Urigo/graphql-mesh/pull/4426)
  [`3571324cd`](https://github.com/Urigo/graphql-mesh/commit/3571324cdca5d731d67ee1cc8829225986360409)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect original type for GraphQL Codegen TS
  definitions while generating a scalar type based on a RegExp pattern

- Updated dependencies
  [[`3571324cd`](https://github.com/Urigo/graphql-mesh/commit/3571324cdca5d731d67ee1cc8829225986360409),
  [`3571324cd`](https://github.com/Urigo/graphql-mesh/commit/3571324cdca5d731d67ee1cc8829225986360409)]:
  - @omnigraph/json-schema@0.33.0
  - json-machete@0.14.3

## 0.14.3

### Patch Changes

- [#4418](https://github.com/Urigo/graphql-mesh/pull/4418)
  [`59dbb1985`](https://github.com/Urigo/graphql-mesh/commit/59dbb1985b07a250f0113d70e0f55e467dc17812)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`openapi-types@12.0.2` ↗︎](https://www.npmjs.com/package/openapi-types/v/12.0.2) (from
    `12.0.0`, in `dependencies`)

- [`e1891993c`](https://github.com/Urigo/graphql-mesh/commit/e1891993c1b638987b62ea93f5571f656f668ccc)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect descriptions for binary/file fields and
  number fields with minimum and maximum

- Updated dependencies
  [[`3165827f7`](https://github.com/Urigo/graphql-mesh/commit/3165827f74b48a914b9604b024cd1318c211aa14),
  [`e1891993c`](https://github.com/Urigo/graphql-mesh/commit/e1891993c1b638987b62ea93f5571f656f668ccc)]:
  - @graphql-mesh/types@0.82.1
  - json-machete@0.14.2
  - @omnigraph/json-schema@0.32.2
  - @graphql-mesh/utils@0.41.2

## 0.14.2

### Patch Changes

- [#4419](https://github.com/Urigo/graphql-mesh/pull/4419)
  [`2772150e7`](https://github.com/Urigo/graphql-mesh/commit/2772150e7230ed796aa8e7a33337c96eb2fb0a76)
  Thanks [@ardatan](https://github.com/ardatan)! - fix(openapi): allow user to override accept from
  the schema

## 0.14.1

### Patch Changes

- [#4412](https://github.com/Urigo/graphql-mesh/pull/4412)
  [`7e9482723`](https://github.com/Urigo/graphql-mesh/commit/7e94827235f4abb81d7434d26c55d4fd9a07bdd5)
  Thanks [@ardatan](https://github.com/ardatan)! - Accept an array for "type" property in JSON
  Schema because it was broken and causing a bug that creates an invalid `undefined` scalar type.

  ```json
  {
    "type": ["string", "number", "boolean", "integer", "array"]
  }
  ```

- Updated dependencies
  [[`7e9482723`](https://github.com/Urigo/graphql-mesh/commit/7e94827235f4abb81d7434d26c55d4fd9a07bdd5),
  [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9),
  [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9)]:
  - json-machete@0.14.1
  - @graphql-mesh/types@0.82.0
  - @omnigraph/json-schema@0.32.1
  - @graphql-mesh/utils@0.41.1

## 0.14.0

### Minor Changes

- [#4378](https://github.com/Urigo/graphql-mesh/pull/4378)
  [`5742f4598`](https://github.com/Urigo/graphql-mesh/commit/5742f4598fe32bbbdb78b65ea8d6e1e4723308aa)
  Thanks [@ardatan](https://github.com/ardatan)! - If an object type has a discriminator, it becomes
  an interface type and any other allOf references with that implements that interface

- [#4369](https://github.com/Urigo/graphql-mesh/pull/4369)
  [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Support non-string link parameters

- [#4369](https://github.com/Urigo/graphql-mesh/pull/4369)
  [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - If you pass a function to operationHeaders,
  it takes the operation config as second parameter including path, method and other details about
  the request

- [#4376](https://github.com/Urigo/graphql-mesh/pull/4376)
  [`3473a2686`](https://github.com/Urigo/graphql-mesh/commit/3473a2686284f824b46af823ff4be42ae5c008f8)
  Thanks [@ardatan](https://github.com/ardatan)! - Support links on non-object fields

- [#4396](https://github.com/Urigo/graphql-mesh/pull/4396)
  [`df37c40f4`](https://github.com/Urigo/graphql-mesh/commit/df37c40f47c6c53949f5d5f71e062c09fe5e1bd0)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop webhook plugin and automatically handle
  webhooks. See the documentation for more information

- [#4369](https://github.com/Urigo/graphql-mesh/pull/4369)
  [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Introduce "destructObject" in query
  stringify options to spread the parameter content into the query parameters in order to support
  OAS explode: true behavior with query parameters that are objects

- [#4375](https://github.com/Urigo/graphql-mesh/pull/4375)
  [`0b3517539`](https://github.com/Urigo/graphql-mesh/commit/0b3517539024b1ae63a046c8ba6bedfb111a7395)
  Thanks [@ardatan](https://github.com/ardatan)! - `multipart/form-data` and **File Uploads**
  support (`type: string`, `format: binary`)

  If there is `type: string` and `format: binary` definitions in a schema type definition, it is
  considered as `File` scalar type and resolved as **WHATWG**
  [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) object. When the request
  content-type is `multipart/form-data`, the handler creates a **WHATWG**
  [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/File) object and puts the input
  arguments in it.

- [#4379](https://github.com/Urigo/graphql-mesh/pull/4379)
  [`7f0d02686`](https://github.com/Urigo/graphql-mesh/commit/7f0d026868b55e011d26fe41ecbb5173e9d195ed)
  Thanks [@ardatan](https://github.com/ardatan)! - Support readOnly and writeOnly. Now the fields
  flagged as writeOnly are not included in object types while writeOnly ones are not included in the
  input types, too.

### Patch Changes

- [#4405](https://github.com/Urigo/graphql-mesh/pull/4405)
  [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle multiple content types correctly

- [#4405](https://github.com/Urigo/graphql-mesh/pull/4405)
  [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88)
  Thanks [@ardatan](https://github.com/ardatan)! - Remove properties if an array definition has one

- [#4405](https://github.com/Urigo/graphql-mesh/pull/4405)
  [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88)
  Thanks [@ardatan](https://github.com/ardatan)! - Skip creating a scalar type if the given pattern
  is invalid

- Updated dependencies
  [[`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd),
  [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f),
  [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd),
  [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f),
  [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f),
  [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd),
  [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f),
  [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd),
  [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f),
  [`5742f4598`](https://github.com/Urigo/graphql-mesh/commit/5742f4598fe32bbbdb78b65ea8d6e1e4723308aa),
  [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b),
  [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b),
  [`3473a2686`](https://github.com/Urigo/graphql-mesh/commit/3473a2686284f824b46af823ff4be42ae5c008f8),
  [`df37c40f4`](https://github.com/Urigo/graphql-mesh/commit/df37c40f47c6c53949f5d5f71e062c09fe5e1bd0),
  [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88),
  [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88),
  [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd),
  [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f),
  [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88),
  [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b),
  [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f),
  [`0b3517539`](https://github.com/Urigo/graphql-mesh/commit/0b3517539024b1ae63a046c8ba6bedfb111a7395),
  [`7a4023a2c`](https://github.com/Urigo/graphql-mesh/commit/7a4023a2cac2dacc8e78e10dabee65427b9a5e54),
  [`7f0d02686`](https://github.com/Urigo/graphql-mesh/commit/7f0d026868b55e011d26fe41ecbb5173e9d195ed),
  [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f)]:
  - @graphql-mesh/cross-helpers@0.2.3
  - @graphql-mesh/types@0.81.0
  - @graphql-mesh/utils@0.41.0
  - @omnigraph/json-schema@0.32.0
  - json-machete@0.14.0

## 0.13.0

### Minor Changes

- [#4364](https://github.com/Urigo/graphql-mesh/pull/4364)
  [`32b3a63c2`](https://github.com/Urigo/graphql-mesh/commit/32b3a63c29a823dde830f7571a2e5b0213e03b12)
  Thanks [@ardatan](https://github.com/ardatan)! - - Respect `explode: true` or `explode: false` in
  query parameter definitions in OAS
  - Introduce a new `queryStringOptionsByParam` option to define `queryStringOptions` for each query
    parameter

### Patch Changes

- Updated dependencies
  [[`32b3a63c2`](https://github.com/Urigo/graphql-mesh/commit/32b3a63c29a823dde830f7571a2e5b0213e03b12)]:
  - @omnigraph/json-schema@0.31.0

## 0.12.0

### Minor Changes

- [#4357](https://github.com/Urigo/graphql-mesh/pull/4357)
  [`be79b20a5`](https://github.com/Urigo/graphql-mesh/commit/be79b20a59b14d5d79bfeb260e4ecabc58c26efb)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - BREAKING CHANGE: instead of oasFilePath,
  use source instead

### Patch Changes

- Updated dependencies
  [[`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824),
  [`be79b20a5`](https://github.com/Urigo/graphql-mesh/commit/be79b20a59b14d5d79bfeb260e4ecabc58c26efb),
  [`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824)]:
  - @graphql-mesh/utils@0.40.0
  - json-machete@0.13.2
  - @graphql-mesh/types@0.80.2
  - @omnigraph/json-schema@0.30.0

## 0.11.2

### Patch Changes

- Updated dependencies
  [[`cd13405f5`](https://github.com/Urigo/graphql-mesh/commit/cd13405f5b358af364158c7b5fd36fa08b1d4a60)]:
  - @omnigraph/json-schema@0.29.2

## 0.11.1

### Patch Changes

- Updated dependencies
  [[`f23e14eba`](https://github.com/Urigo/graphql-mesh/commit/f23e14ebaf7c6a869207edc43b0e2a8114d0d21f)]:
  - @graphql-mesh/utils@0.39.0
  - json-machete@0.13.1
  - @omnigraph/json-schema@0.29.1
  - @graphql-mesh/types@0.80.1

## 0.11.0

### Minor Changes

- [#4342](https://github.com/Urigo/graphql-mesh/pull/4342)
  [`ca6d6206b`](https://github.com/Urigo/graphql-mesh/commit/ca6d6206b02dfaa42eafa83442a04b33bbdf2db9)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - ## Some improvements on OAS handling
  - If there are no parameters defined in OAS links, the handler exposes the arguments of the
    original operation.
  - If the name of the link definition is not valid for GraphQL, the handler sanitizes it.

* [#4327](https://github.com/Urigo/graphql-mesh/pull/4327)
  [`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - ## BREAKING CHANGES
  - Named types are no longer deduplicated automatically, so this might introduce new types on your
    side. Also the types with unknown content are always reflected as "JSON"/"Any" scalar type
  - `noDeduplicate` option has been dropped, because it is no longer needed.

### Patch Changes

- [#4343](https://github.com/Urigo/graphql-mesh/pull/4343)
  [`ab89f98cf`](https://github.com/Urigo/graphql-mesh/commit/ab89f98cf7b9a0dceb3b03aed5528b001c3f2496)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Add \_ prefix if the type is Subscription
  to avoid conflict with the root "Subscription" type

* [#4343](https://github.com/Urigo/graphql-mesh/pull/4343)
  [`ab89f98cf`](https://github.com/Urigo/graphql-mesh/commit/ab89f98cf7b9a0dceb3b03aed5528b001c3f2496)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Some additional tests

* Updated dependencies
  [[`de7081cdb`](https://github.com/Urigo/graphql-mesh/commit/de7081cdbb4c6ddb8ff60ac15089a19f70ee3a3a),
  [`ab89f98cf`](https://github.com/Urigo/graphql-mesh/commit/ab89f98cf7b9a0dceb3b03aed5528b001c3f2496),
  [`de7081cdb`](https://github.com/Urigo/graphql-mesh/commit/de7081cdbb4c6ddb8ff60ac15089a19f70ee3a3a),
  [`ca6d6206b`](https://github.com/Urigo/graphql-mesh/commit/ca6d6206b02dfaa42eafa83442a04b33bbdf2db9),
  [`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319)]:
  - @omnigraph/json-schema@0.29.0
  - json-machete@0.13.0
  - @graphql-mesh/types@0.80.0
  - @graphql-mesh/utils@0.38.1

## 0.10.0

### Minor Changes

- [#4322](https://github.com/Urigo/graphql-mesh/pull/4322)
  [`738335788`](https://github.com/Urigo/graphql-mesh/commit/7383357880685447189085204c984e632d36aa61)
  Thanks [@ardatan](https://github.com/ardatan)! - POSSIBLE BREAKING CHANGE: Previously if the
  parameter name was not valid for GraphQL and sanitized like `product-tag` to `product_tag`, it was
  ignored. Now it has been fixed but this change might be a breaking change for you if the actual
  parameter schema is `integer` while it is represented as `string` today. This also fixes an issue
  with ignored default values.

### Patch Changes

- Updated dependencies
  [[`738335788`](https://github.com/Urigo/graphql-mesh/commit/7383357880685447189085204c984e632d36aa61)]:
  - @omnigraph/json-schema@0.28.0

## 0.9.0

### Minor Changes

- [#4235](https://github.com/Urigo/graphql-mesh/pull/4235)
  [`b162269f7`](https://github.com/Urigo/graphql-mesh/commit/b162269f70a90594962792ffaaa40d3a7ee9f4e4)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - - Support
  "$request.query" and "$request.path" usages in
  [OpenAPI runtime expressions](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#runtimeExpression)
  - Fix `Field not found` error when an OpenAPI link refers to an operation which is not `Mutation`
  - Do not use AJV and check field names in the received object to resolve the type name for a union
    field
  - Fix `queryParams` which allows you to pass query parameters for all operations
  - Handle cookie paramters correctly defined in the OpenAPI document by trimming empty values
  - Respect the mime types defined in the OpenAPI document. Now it creates a union for each mime
    type defined in the document, and resolve it by the mime type.
  - Respect JSON examples given in the OpenAPI document correctly even if they are strings with JSON
    content.
  - Normalize(lowercase header names) and merge final operation headers correctly from different
    places `operationHeaders` from the bundle and configuration plus `headers` defined for that
    specific operation.
  - Do not ignore operationHeaders defined in the configuration even if there are some already
    defined in the bundle

  **BREAKING CHANGES:**
  - If a JSON Schema type cannot be represented in GraphQL (object without properties etc.), it will
    no longer use `Any` type but `JSON` type instead which is a scalar from `graphql-scalars`.

  - Due to the improvements in `healJSONSchema` some of types that are not named in the JSON Schema
    might be named in a different way. Please make sure the content of the types are correct and
    report us on GitHub if they are represented incorrectly.

  - UUID format is now represented as `UUID` scalar type which is a scalar from `graphql-scalars`.

  - HTTP Errors are now in a more descriptive way. If your consumer respects them strictly, they
    will probably need to update their implementation.

  ```diff
  {
    "url": "http://www.google.com/api",
    "method": "GET",
  - "status": 401,
  + "statusCode": 401,
  + "statusText": "Unauthorized",
  - "responseJson": {}
  + "responseBody": {}
  }
  ```

  - `requestSchema` and `requestSample` are no longer used for query parameters in GET operations,
    but instead we introduced new `argTypeMap` and `queryParamArgMap` to define schemas for query
    parameters.

  For JSON Schema Handler configuration, the following changes are **NEEDED**;

  ```diff
  - requestSample: { some_flag: true }
  + queryParamArgMap:
  +   some_flag: some_flag
  + argTypeMap:
  +   some_flag:
  +     type: boolean
  ```

  or just use the string interpolation;

  ```yaml
  path: /mypath?some_flag={args.some_flag}
  ```

  - Query parameters no longer uses `input`, and they become an argument of that operation directly.

  In the generated GraphQL Schema;

  ```diff
  - someOp(input: SomeInput): OpResult
  - input SomeInput {
  -  some_flag: Boolean
  - }
  + someOp(some_flag: Boolean): OpResult
  ```

  - `argTypeMap` no longer takes GraphQL type names but instead it can take JSON Schema pointer or
    JSON Schema definition itself. New `argTypeMap` can configure any argument even if it is defined
    in the headers.

  ```diff
  argTypeMap:
  - some_flag: Boolean
  + some_flag:
  +   type: boolean
  ```

### Patch Changes

- Updated dependencies
  [[`b162269f7`](https://github.com/Urigo/graphql-mesh/commit/b162269f70a90594962792ffaaa40d3a7ee9f4e4),
  [`2ad667d96`](https://github.com/Urigo/graphql-mesh/commit/2ad667d964545ed47170cfa4f9393282edc2073b)]:
  - @graphql-mesh/types@0.79.0
  - @graphql-mesh/utils@0.38.0
  - @omnigraph/json-schema@0.27.0
  - json-machete@0.12.0
  - @graphql-mesh/string-interpolation@0.3.2

## 0.8.2

### Patch Changes

- Updated dependencies
  [[`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2),
  [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968),
  [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2),
  [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968),
  [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2),
  [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968),
  [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2),
  [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2)]:
  - @graphql-mesh/cross-helpers@0.2.2
  - @graphql-mesh/string-interpolation@0.3.1
  - @graphql-mesh/types@0.78.8
  - @graphql-mesh/utils@0.37.9
  - @omnigraph/json-schema@0.26.2
  - json-machete@0.11.2

## 0.8.1

### Patch Changes

- Updated dependencies
  [[`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73),
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73),
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73),
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73),
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73),
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)]:
  - @graphql-mesh/cross-helpers@0.2.1
  - @graphql-mesh/types@0.78.7
  - @graphql-mesh/utils@0.37.8
  - @omnigraph/json-schema@0.26.1
  - json-machete@0.11.1

## 0.8.0

### Minor Changes

- [#4262](https://github.com/Urigo/graphql-mesh/pull/4262)
  [`be784e653`](https://github.com/Urigo/graphql-mesh/commit/be784e6533f0c66774d1251382082f0a426e0978)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle callbacks as GraphQL Subscriptions

* [#4247](https://github.com/Urigo/graphql-mesh/pull/4247)
  [`31fc25974`](https://github.com/Urigo/graphql-mesh/commit/31fc259744b77a6a649487562f59e97f2e08e3aa)
  Thanks [@ardatan](https://github.com/ardatan)! - Accept a code file for `operationHeaders`

  Now you can generate headers dynamically from the resolver data dynamically like below;

  ```yaml
  operationHeaders: ./myOperationHeaders.ts
  ```

  And in `myOperationHeaders.ts`

  ```ts filename="myOperationHeaders.ts"
  export default function myOperationHeaders({ context }: ResolverData) {
    const someToken = context.request.headers.get('some-token')
    const anotherToken = await someLogicThatReturnsAnotherToken(someToken)
    return {
      'x-bar-token': anotherToken
    }
  }
  ```

### Patch Changes

- [#4262](https://github.com/Urigo/graphql-mesh/pull/4262)
  [`be784e653`](https://github.com/Urigo/graphql-mesh/commit/be784e6533f0c66774d1251382082f0a426e0978)
  Thanks [@ardatan](https://github.com/ardatan)! - Refactor runtime expression handling in OpenAPI &
  JSON Schema handlers

- Updated dependencies
  [[`be784e653`](https://github.com/Urigo/graphql-mesh/commit/be784e6533f0c66774d1251382082f0a426e0978),
  [`be784e653`](https://github.com/Urigo/graphql-mesh/commit/be784e6533f0c66774d1251382082f0a426e0978),
  [`31fc25974`](https://github.com/Urigo/graphql-mesh/commit/31fc259744b77a6a649487562f59e97f2e08e3aa)]:
  - @omnigraph/json-schema@0.26.0

## 0.7.11

### Patch Changes

- [#4246](https://github.com/Urigo/graphql-mesh/pull/4246)
  [`d0498f79b`](https://github.com/Urigo/graphql-mesh/commit/d0498f79bfc43060d279bad329337de307c13118)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect "noDeduplication" flag while creating the
  bundle

* [#4239](https://github.com/Urigo/graphql-mesh/pull/4239)
  [`755d3d487`](https://github.com/Urigo/graphql-mesh/commit/755d3d487c3069664a96e71732fa25aa2d161b1b)
  Thanks [@ardatan](https://github.com/ardatan)! - - Set response type to "String" if the response
  content type is "text/\*" defined in the OpenAPI document
  - Fix the issue when "allOf" or "anyOf" is used with an enum type and an object type
* Updated dependencies
  [[`755d3d487`](https://github.com/Urigo/graphql-mesh/commit/755d3d487c3069664a96e71732fa25aa2d161b1b),
  [`669abf58f`](https://github.com/Urigo/graphql-mesh/commit/669abf58f86faf5f9d678cf9ad103143488960d6)]:
  - @omnigraph/json-schema@0.25.0
  - json-machete@0.11.0

## 0.7.10

### Patch Changes

- [#4237](https://github.com/Urigo/graphql-mesh/pull/4237)
  [`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18)
  Thanks [@ardatan](https://github.com/ardatan)! - - Respect `pattern` of `number` types
  - Dereference first-level circular dependencies properly in `dereferenceObject`
  - Do not make the schema single if there is one `allOf` or `anyOf` element but with properties

* [#4216](https://github.com/Urigo/graphql-mesh/pull/4216)
  [`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b)
  Thanks [@ardatan](https://github.com/ardatan)! - Rewrite JSON Schema visitor and support circular
  dependencies in a better way

  Now `visitJSONSchema` takes two different visitor functions instead of `enter` and `leave`,
  previously we used to handle only `leave`.

  Also `generateInterfaceFromSharedFields` has been dropped for now because it wasn't working as
  expected.

- [#4221](https://github.com/Urigo/graphql-mesh/pull/4221)
  [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect "\$ref" in parameters

* [#4221](https://github.com/Urigo/graphql-mesh/pull/4221)
  [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect global parameters object on top of method
  objects like;
  ```yaml
  parameters: # Take this as well
    - name: foo
      ...
  get:
    parameters:
      - name: bar
  ```
* Updated dependencies
  [[`78552ab23`](https://github.com/Urigo/graphql-mesh/commit/78552ab2387450dfa406fa6d5f49ae6f46b0c410),
  [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834),
  [`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18),
  [`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b),
  [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834),
  [`961e07113`](https://github.com/Urigo/graphql-mesh/commit/961e07113161a54823644a1fecb39e2b5066544e)]:
  - @omnigraph/json-schema@0.24.6
  - json-machete@0.10.6
  - @graphql-mesh/utils@0.37.7
  - @graphql-mesh/types@0.78.6

## 0.7.9

### Patch Changes

- 583da37fc: Fix an issue while concatenating query parameters for POST requests

  Before; `http://localhost:3000/test?foo=barbaz=qux`

  After; `http://localhost:3000/test?foo=bar&barbaz=qux`

## 0.7.8

### Patch Changes

- Updated dependencies [c88a34d82]
  - @omnigraph/json-schema@0.24.5
  - @graphql-mesh/types@0.78.5
  - @graphql-mesh/utils@0.37.6
  - json-machete@0.10.5

## 0.7.7

### Patch Changes

- Updated dependencies [30d046724]
  - @graphql-mesh/utils@0.37.5
  - json-machete@0.10.4
  - @omnigraph/json-schema@0.24.4
  - @graphql-mesh/types@0.78.4

## 0.7.6

### Patch Changes

- Updated dependencies [738e2f378]
  - @omnigraph/json-schema@0.24.3
  - @graphql-mesh/types@0.78.3
  - @graphql-mesh/utils@0.37.4
  - json-machete@0.10.3

## 0.7.5

### Patch Changes

- a2ef35c35: ** Use the new `@whatwg-node/fetch` package instead of `cross-undici-fetch`**

  `cross-undici-fetch` has been renamed to `@whatwg-node-fetch`. Now Mesh uses this new package.

  ** BREAKING: Drop `serve.handlers` in favor of the new plugin system **

  Now Mesh uses the new plugin system of GraphQL Yoga that uses WHATWG Fetch API instead of Node
  specific `serve.handlers`. That means you can use those plugins with any environment even if you
  are not using Node.js with `mesh start`.

  Please check our docs to see how you can migrate to the new usage.
  https://www.graphql-mesh.com/docs/guides/subscriptions-webhooks#handle-webhook-http-requests

- Updated dependencies [bad0f40ab]
- Updated dependencies [a2ef35c35]
  - @omnigraph/json-schema@0.24.2
  - json-machete@0.10.2
  - @graphql-mesh/types@0.78.2
  - @graphql-mesh/utils@0.37.3

## 0.7.4

### Patch Changes

- @graphql-mesh/types@0.78.1
- @omnigraph/json-schema@0.24.1
- @graphql-mesh/utils@0.37.2
- json-machete@0.10.1

## 0.7.3

### Patch Changes

- Updated dependencies [eade5bb9f]
- Updated dependencies [6e6fd4ab7]
- Updated dependencies [bcd9355ee]
  - json-machete@0.10.0
  - @omnigraph/json-schema@0.24.0
  - @graphql-mesh/utils@0.37.1
  - @graphql-mesh/types@0.78.0

## 0.7.2

### Patch Changes

- Updated dependencies [66f5d0189]
- Updated dependencies [0401c7617]
  - @graphql-mesh/types@0.77.1
  - @graphql-mesh/cross-helpers@0.2.0
  - @omnigraph/json-schema@0.23.0
  - @graphql-mesh/utils@0.37.0
  - json-machete@0.9.2

## 0.7.1

### Patch Changes

- Updated dependencies [b69746d2c]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
  - @omnigraph/json-schema@0.22.0
  - @graphql-mesh/cross-helpers@0.1.7
  - @graphql-mesh/types@0.77.0
  - json-machete@0.9.1
  - @graphql-mesh/utils@0.36.1

## 0.7.0

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
  - json-machete@0.9.0
  - @omnigraph/json-schema@0.21.0
  - @graphql-mesh/types@0.76.0

## 0.6.16

### Patch Changes

- Updated dependencies [d4754ad08]
- Updated dependencies [2df026e90]
  - @graphql-mesh/types@0.75.0
  - @omnigraph/json-schema@0.20.7
  - @graphql-mesh/utils@0.35.7
  - json-machete@0.8.15

## 0.6.15

### Patch Changes

- Updated dependencies [ed9ba7f48]
  - @graphql-mesh/types@0.74.2
  - @graphql-mesh/utils@0.35.6
  - @omnigraph/json-schema@0.20.6
  - json-machete@0.8.14

## 0.6.14

### Patch Changes

- Updated dependencies [41cfb46b4]
  - @graphql-mesh/utils@0.35.5
  - json-machete@0.8.13
  - @omnigraph/json-schema@0.20.5
  - @graphql-mesh/types@0.74.1

## 0.6.13

### Patch Changes

- Updated dependencies [13b9b30f7]
  - @graphql-mesh/string-interpolation@0.3.0
  - @graphql-mesh/types@0.74.0
  - @omnigraph/json-schema@0.20.4
  - @graphql-mesh/utils@0.35.4
  - json-machete@0.8.12

## 0.6.12

### Patch Changes

- Updated dependencies [9733f490c]
  - @graphql-mesh/utils@0.35.3
  - json-machete@0.8.11
  - @omnigraph/json-schema@0.20.3
  - @graphql-mesh/types@0.73.3

## 0.6.11

### Patch Changes

- 3c0366d2c: - Support import.meta.env instead of process.env for browsers
  - Ponyfill `util.inspect` only if it is not Node env
- Updated dependencies [3c0366d2c]
- Updated dependencies [3c0366d2c]
  - @graphql-mesh/cross-helpers@0.1.6
  - json-machete@0.8.10
  - @omnigraph/json-schema@0.20.2
  - @graphql-mesh/utils@0.35.2
  - @graphql-mesh/types@0.73.2

## 0.6.10

### Patch Changes

- Updated dependencies [abe9fcc41]
  - @graphql-mesh/utils@0.35.1
  - json-machete@0.8.9
  - @omnigraph/json-schema@0.20.1
  - @graphql-mesh/types@0.73.1

## 0.6.9

### Patch Changes

- 974e703e2: Cleanup dependencies
- Updated dependencies [974e703e2]
- Updated dependencies [19a99c055]
- Updated dependencies [974e703e2]
- Updated dependencies [974e703e2]
- Updated dependencies [893d526ab]
- Updated dependencies [974e703e2]
  - json-machete@0.8.8
  - @omnigraph/json-schema@0.20.0
  - @graphql-mesh/string-interpolation@0.2.0
  - @graphql-mesh/types@0.73.0
  - @graphql-mesh/utils@0.35.0

## 0.6.8

### Patch Changes

- Updated dependencies [43eb3d2c2]
  - @graphql-mesh/utils@0.34.10
  - json-machete@0.8.7
  - @omnigraph/json-schema@0.19.8
  - @graphql-mesh/types@0.72.5

## 0.6.7

### Patch Changes

- Updated dependencies [55ad5ea44]
  - @graphql-mesh/utils@0.34.9
  - json-machete@0.8.6
  - @omnigraph/json-schema@0.19.7
  - @graphql-mesh/types@0.72.4

## 0.6.6

### Patch Changes

- Updated dependencies [31efa964e]
  - @graphql-mesh/utils@0.34.8
  - json-machete@0.8.5
  - @omnigraph/json-schema@0.19.6
  - @graphql-mesh/types@0.72.3

## 0.6.5

### Patch Changes

- json-machete@0.8.4
- @graphql-mesh/utils@0.34.7
- @graphql-mesh/types@0.72.2
- @omnigraph/json-schema@0.19.5

## 0.6.4

### Patch Changes

- Updated dependencies [b9beacca2]
  - json-machete@0.8.3
  - @omnigraph/json-schema@0.19.4
  - @graphql-mesh/utils@0.34.6
  - @graphql-mesh/types@0.72.1

## 0.6.3

### Patch Changes

- Updated dependencies [fa2542468]
  - @graphql-mesh/types@0.72.0
  - @omnigraph/json-schema@0.19.3
  - @graphql-mesh/utils@0.34.5
  - json-machete@0.8.2

## 0.6.2

### Patch Changes

- Updated dependencies [ddbbec8a8]
  - @graphql-mesh/utils@0.34.4
  - json-machete@0.8.1
  - @omnigraph/json-schema@0.19.2
  - @graphql-mesh/types@0.71.4

## 0.6.1

### Patch Changes

- 2e9addd80: Bump cross-undici-fetch for Node 18 compat
- Updated dependencies [2e9addd80]
- Updated dependencies [2e9addd80]
  - json-machete@0.8.0
  - @omnigraph/json-schema@0.19.1
  - @graphql-mesh/utils@0.34.3
  - @graphql-mesh/types@0.71.3

## 0.6.0

### Minor Changes

- 2f395a4b2: feat(openapi): support empty values

### Patch Changes

- Updated dependencies [2f395a4b2]
  - @omnigraph/json-schema@0.19.0

## 0.5.2

### Patch Changes

- @graphql-mesh/types@0.71.2
- @omnigraph/json-schema@0.18.2
- @graphql-mesh/utils@0.34.2
- json-machete@0.7.15

## 0.5.1

### Patch Changes

- 7856f92d3: Bump all packages
- Updated dependencies [7856f92d3]
  - json-machete@0.7.14
  - @omnigraph/json-schema@0.18.1
  - @graphql-mesh/types@0.71.1
  - @graphql-mesh/utils@0.34.1

## 0.5.0

### Minor Changes

- 331b62637: feat(json-schema/openapi): support OpenAPI links and json pointer syntax in string
  interpolation

### Patch Changes

- 331b62637: fix(openapi): sanitize operationId before settings it as a GraphQL field name in the
  root type
- 331b62637: fix(openapi): handle empty responses(204) correctly
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [f963b57ce]
- Updated dependencies [0644f31f2]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
  - json-machete@0.7.13
  - @omnigraph/json-schema@0.18.0
  - @graphql-mesh/types@0.71.0
  - @graphql-mesh/utils@0.34.0

## 0.4.9

### Patch Changes

- json-machete@0.7.12
- @graphql-mesh/utils@0.33.6
- @omnigraph/json-schema@0.17.26
- @graphql-mesh/types@0.70.6

## 0.4.8

### Patch Changes

- @graphql-mesh/types@0.70.5
- @omnigraph/json-schema@0.17.25
- @graphql-mesh/utils@0.33.5
- json-machete@0.7.11

## 0.4.7

### Patch Changes

- Updated dependencies [35a55e841]
  - json-machete@0.7.10
  - @omnigraph/json-schema@0.17.24
  - @graphql-mesh/types@0.70.4
  - @graphql-mesh/utils@0.33.4

## 0.4.6

### Patch Changes

- @graphql-mesh/types@0.70.3
- @omnigraph/json-schema@0.17.23
- @graphql-mesh/utils@0.33.3
- json-machete@0.7.9

## 0.4.5

### Patch Changes

- Updated dependencies [d64c74b75]
  - json-machete@0.7.8
  - @omnigraph/json-schema@0.17.22

## 0.4.4

### Patch Changes

- Updated dependencies [b02f5b008]
- Updated dependencies [114629e47]
  - @graphql-mesh/types@0.70.2
  - json-machete@0.7.7
  - @omnigraph/json-schema@0.17.21
  - @graphql-mesh/utils@0.33.2

## 0.4.3

### Patch Changes

- Updated dependencies [26e69dbe9]
  - @omnigraph/json-schema@0.17.20

## 0.4.2

### Patch Changes

- 2d5c6c72a: add Git repository link in package.json
- Updated dependencies [2d5c6c72a]
  - json-machete@0.7.6
  - @omnigraph/json-schema@0.17.19
  - @graphql-mesh/types@0.70.1
  - @graphql-mesh/utils@0.33.1

## 0.4.1

### Patch Changes

- Updated dependencies [d567be7b5]
  - @graphql-mesh/types@0.70.0
  - @graphql-mesh/utils@0.33.0
  - @omnigraph/json-schema@0.17.18
  - json-machete@0.7.5

## 0.4.0

### Minor Changes

- f30dba61e: feat(openapi): add fallbackFormat

### Patch Changes

- Updated dependencies [f30dba61e]
  - @graphql-mesh/types@0.69.0
  - @omnigraph/json-schema@0.17.17
  - @graphql-mesh/utils@0.32.2
  - json-machete@0.7.4

## 0.3.28

### Patch Changes

- Updated dependencies [c53203723]
  - json-machete@0.7.3
  - @omnigraph/json-schema@0.17.16

## 0.3.27

### Patch Changes

- e67f6a621: fix(openapi): handle argTypeMap correctly
- Updated dependencies [c6f0314ac]
  - json-machete@0.7.2
  - @omnigraph/json-schema@0.17.15

## 0.3.26

### Patch Changes

- 3448c3177: fix(openapi): sanitize dynamic argument names
  - @omnigraph/json-schema@0.17.14
  - @graphql-mesh/utils@0.32.1
  - json-machete@0.7.1

## 0.3.25

### Patch Changes

- Updated dependencies [67fb11706]
  - json-machete@0.7.0
  - @graphql-mesh/utils@0.32.0
  - @omnigraph/json-schema@0.17.13

## 0.3.24

### Patch Changes

- Updated dependencies [b2c537c2a]
  - @graphql-mesh/utils@0.31.0
  - json-machete@0.6.1
  - @omnigraph/json-schema@0.17.12

## 0.3.23

### Patch Changes

- Updated dependencies [b45dac0c0]
- Updated dependencies [b45dac0c0]
  - json-machete@0.6.0
  - @omnigraph/json-schema@0.17.11

## 0.3.22

### Patch Changes

- @omnigraph/json-schema@0.17.10
- @graphql-mesh/utils@0.30.2
- json-machete@0.5.20

## 0.3.21

### Patch Changes

- @omnigraph/json-schema@0.17.9
- @graphql-mesh/utils@0.30.1
- json-machete@0.5.19

## 0.3.20

### Patch Changes

- Updated dependencies [01bac6bb5]
- Updated dependencies [01bac6bb5]
  - @omnigraph/json-schema@0.17.8
  - @graphql-mesh/utils@0.30.0
  - json-machete@0.5.18

## 0.3.19

### Patch Changes

- Updated dependencies [268db0462]
  - @graphql-mesh/utils@0.29.0
  - json-machete@0.5.17
  - @omnigraph/json-schema@0.17.7

## 0.3.18

### Patch Changes

- @omnigraph/json-schema@0.17.6
- @graphql-mesh/utils@0.28.5
- json-machete@0.5.16

## 0.3.17

### Patch Changes

- @omnigraph/json-schema@0.17.5
- @graphql-mesh/utils@0.28.4
- json-machete@0.5.15

## 0.3.16

### Patch Changes

- Updated dependencies [f11d8b9c8]
  - @omnigraph/json-schema@0.17.4
  - @graphql-mesh/utils@0.28.3
  - json-machete@0.5.14

## 0.3.15

### Patch Changes

- Updated dependencies [fb876e99c]
  - @graphql-mesh/utils@0.28.2
  - @omnigraph/json-schema@0.17.3
  - json-machete@0.5.13

## 0.3.14

### Patch Changes

- @omnigraph/json-schema@0.17.2
- @graphql-mesh/utils@0.28.1
- json-machete@0.5.12

## 0.3.13

### Patch Changes

- 6f07de8fe: fix: do not import process from env
- b481fbc39: enhance: add tslib to dependencies to reduce bundle size
- Updated dependencies [6f07de8fe]
- Updated dependencies [6f07de8fe]
- Updated dependencies [b481fbc39]
  - @graphql-mesh/utils@0.28.0
  - @omnigraph/json-schema@0.17.1
  - json-machete@0.5.11

## 0.3.12

### Patch Changes

- c12e30ae5: fix(openapi): correct types for path params

## 0.3.11

### Patch Changes

- Updated dependencies [21de17a3d]
- Updated dependencies [3f4bb09a9]
  - @omnigraph/json-schema@0.17.0
  - @graphql-mesh/utils@0.27.9
  - json-machete@0.5.10

## 0.3.10

### Patch Changes

- @omnigraph/json-schema@0.16.2
- @graphql-mesh/utils@0.27.8
- json-machete@0.5.9

## 0.3.9

### Patch Changes

- Updated dependencies [ca6bb5ff3]
- Updated dependencies [ca6bb5ff3]
  - json-machete@0.5.8
  - @graphql-mesh/utils@0.27.7
  - @omnigraph/json-schema@0.16.1

## 0.3.8

### Patch Changes

- Updated dependencies [275f82b53]
  - @omnigraph/json-schema@0.16.0

## 0.3.7

### Patch Changes

- Updated dependencies [c84d9e95e]
  - @omnigraph/json-schema@0.15.1

## 0.3.6

### Patch Changes

- Updated dependencies [12256ec58]
- Updated dependencies [e3f941db5]
  - @omnigraph/json-schema@0.15.0
  - @graphql-mesh/utils@0.27.6
  - json-machete@0.5.7

## 0.3.5

### Patch Changes

- Updated dependencies [1815865c3]
  - @omnigraph/json-schema@0.14.3
  - @graphql-mesh/utils@0.27.5
  - json-machete@0.5.6

## 0.3.4

### Patch Changes

- @omnigraph/json-schema@0.14.2
- @graphql-mesh/utils@0.27.4
- json-machete@0.5.5

## 0.3.3

### Patch Changes

- @omnigraph/json-schema@0.14.1
- @graphql-mesh/utils@0.27.3
- json-machete@0.5.4

## 0.3.2

### Patch Changes

- 0454c0f8a: fix(openapi): Interpolated required argument should be ID! not String!

## 0.3.1

### Patch Changes

- a00a88a97: fix(openapi): fix an issue when an arg is required

## 0.3.0

### Minor Changes

- 15e1f68c5: feat(json-schema): respect given samples in mocks transform

### Patch Changes

- Updated dependencies [c71b29004]
- Updated dependencies [15e1f68c5]
  - @graphql-mesh/utils@0.27.2
  - @omnigraph/json-schema@0.14.0
  - json-machete@0.5.3

## 0.2.0

### Minor Changes

- 240ec7b38: feat(openapi): selectQueryOrMutationField flag to choose what field belongs to what
  root type

### Patch Changes

- Updated dependencies [fcbd12a35]
- Updated dependencies [3a21004c9]
  - @graphql-mesh/utils@0.27.1
  - @omnigraph/json-schema@0.13.6
  - json-machete@0.5.2

## 0.1.7

### Patch Changes

- fb974bf73: fix(openapi): escape slashes in the content mimetype keys

## 0.1.6

### Patch Changes

- Updated dependencies [05ec30255]
  - @omnigraph/json-schema@0.13.5

## 0.1.5

### Patch Changes

- Updated dependencies [1c8827604]
  - json-machete@0.5.1
  - @omnigraph/json-schema@0.13.4

## 0.1.4

### Patch Changes

- Updated dependencies [49e9ca808]
- Updated dependencies [49e9ca808]
  - json-machete@0.5.0
  - @omnigraph/json-schema@0.13.3

## 0.1.3

### Patch Changes

- Updated dependencies [900a01355]
  - @graphql-mesh/utils@0.27.0
  - json-machete@0.4.3
  - @omnigraph/json-schema@0.13.2

## 0.1.2

### Patch Changes

- @omnigraph/json-schema@0.13.1
- @graphql-mesh/utils@0.26.4
- json-machete@0.4.2

## 0.1.1

### Patch Changes

- Updated dependencies [a79268b3a]
  - @omnigraph/json-schema@0.13.0
  - @graphql-mesh/utils@0.26.3
  - json-machete@0.4.1

## 0.1.0

### Minor Changes

- 020431bdc: feat(json-schema/openapi/raml): respect error status codes

### Patch Changes

- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
  - json-machete@0.4.0
  - @omnigraph/json-schema@0.12.0
  - @graphql-mesh/utils@0.26.2

## 0.0.8

### Patch Changes

- 50684ddbf: fix(openapi): add lowercased method prefix
- Updated dependencies [113091148]
- Updated dependencies [6bb4cf673]
  - @graphql-mesh/utils@0.26.1
  - @omnigraph/json-schema@0.11.2
  - json-machete@0.3.7

## 0.0.7

### Patch Changes

- Updated dependencies [92d687133]
- Updated dependencies [92d687133]
- Updated dependencies [92d687133]
  - @omnigraph/json-schema@0.11.1
  - json-machete@0.3.6

## 0.0.6

### Patch Changes

- Updated dependencies [b69233517]
  - @omnigraph/json-schema@0.11.0

## 0.0.5

### Patch Changes

- Updated dependencies [6d76179e4]
  - @omnigraph/json-schema@0.10.0

## 0.0.4

### Patch Changes

- Updated dependencies [e30494c95]
  - @omnigraph/json-schema@0.9.0

## 0.0.3

### Patch Changes

- Updated dependencies [8e52fd06a]
- Updated dependencies [1ab0aebbc]
- Updated dependencies [56e2257fa]
- Updated dependencies [56e2257fa]
  - json-machete@0.3.5
  - @omnigraph/json-schema@0.8.0
  - @graphql-mesh/utils@0.26.0

## 0.0.2

### Patch Changes

- Updated dependencies [2b876f2b8]
  - @graphql-mesh/utils@0.25.0
  - json-machete@0.3.4
  - @omnigraph/json-schema@0.7.4

## 0.0.1

### Patch Changes

- d907351c5: new OpenAPI Handler
- Updated dependencies [d907351c5]
- Updated dependencies [80eb8e92b]
- Updated dependencies [d907351c5]
- Updated dependencies [d907351c5]
  - json-machete@0.3.3
  - @omnigraph/json-schema@0.7.3
  - @graphql-mesh/utils@0.24.2
