# @graphql-mesh/transport-soap

## 0.9.2

### Patch Changes

- Updated dependencies
  [[`903124f`](https://github.com/ardatan/graphql-mesh/commit/903124f8245a518aac50ef8d0eff2fef01a206f2)]:
  - @graphql-mesh/utils@0.103.21
  - @graphql-mesh/types@0.103.21

## 0.9.1

### Patch Changes

- Updated dependencies
  [[`3f5e0a1`](https://github.com/ardatan/graphql-mesh/commit/3f5e0a13c8a07bd68ec19e4da94f34030cc7d3dc)]:
  - @graphql-mesh/utils@0.103.20
  - @graphql-mesh/types@0.103.20

## 0.9.0

### Minor Changes

- [#8414](https://github.com/ardatan/graphql-mesh/pull/8414)
  [`d9cf1d3`](https://github.com/ardatan/graphql-mesh/commit/d9cf1d389c6d685a9d6cc50ff4be03380fd085f1)
  Thanks [@ardatan](https://github.com/ardatan)! - Auto detection of SOAP version to decide SOAP
  namespace; For SOAP 1.1, it is set to `http://schemas.xmlsoap.org/soap/envelope/` and for SOAP
  1.2, it is set to `http://www.w3.org/2003/05/soap-envelope`.

  If you want to use a custom namespace, you can set it like below;

  ```ts
  import { defineConfig } from '@graphql-mesh/compose-cli'
  import { loadSOAPSubgraph } from '@omnigraph/soap'

  export const composeConfig = defineConfig({
    subgraphs: [
      {
        sourceHandler: loadSOAPSubgraph('CountryInfo', {
          source:
            'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL',
          soapNamespace: 'http://foo.com/schemas/soap/envelope'
        })
      }
    ]
  })
  ```

### Patch Changes

- Updated dependencies
  [[`d9cf1d3`](https://github.com/ardatan/graphql-mesh/commit/d9cf1d389c6d685a9d6cc50ff4be03380fd085f1)]:
  - @graphql-mesh/types@0.103.19
  - @graphql-mesh/utils@0.103.19

## 0.8.18

### Patch Changes

- [#8405](https://github.com/ardatan/graphql-mesh/pull/8405)
  [`5aaf455`](https://github.com/ardatan/graphql-mesh/commit/5aaf4559ac3dc3d08db4011a4351b96b8b25d1a3)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`fast-xml-parser@^5.0.0` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/5.0.0) (from
    `^4.5.0`, in `dependencies`)

- [#8409](https://github.com/ardatan/graphql-mesh/pull/8409)
  [`ab0863b`](https://github.com/ardatan/graphql-mesh/commit/ab0863ba367552e4b1ced1063ae7cb3a5f81b3b2)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.4)
    (from `^0.9.15 || ^0.10.0`, in `dependencies`)
- Updated dependencies
  [[`ab0863b`](https://github.com/ardatan/graphql-mesh/commit/ab0863ba367552e4b1ced1063ae7cb3a5f81b3b2)]:
  - @graphql-mesh/utils@0.103.18
  - @graphql-mesh/types@0.103.18

## 0.8.17

### Patch Changes

- Updated dependencies
  [[`eee582a`](https://github.com/ardatan/graphql-mesh/commit/eee582a4cf78d8f7b0e303b522e6a97bd0ad4f2a)]:
  - @graphql-mesh/utils@0.103.17
  - @graphql-mesh/types@0.103.17

## 0.8.16

### Patch Changes

- Updated dependencies
  [[`b44f8b7`](https://github.com/ardatan/graphql-mesh/commit/b44f8b7a413c8adb213b22fb8a243ca6aa06d2bd)]:
  - @graphql-mesh/types@0.103.16
  - @graphql-mesh/utils@0.103.16

## 0.8.15

### Patch Changes

- Updated dependencies
  [[`b5c05c4`](https://github.com/ardatan/graphql-mesh/commit/b5c05c4c5862525c76d69e8c166e71378f69bda0)]:
  - @graphql-mesh/types@0.103.15
  - @graphql-mesh/utils@0.103.15

## 0.8.14

### Patch Changes

- Updated dependencies
  [[`fc44a1e`](https://github.com/ardatan/graphql-mesh/commit/fc44a1e66c8bc8f27dc7e5e642031d17d75c0db8)]:
  - @graphql-mesh/types@0.103.14
  - @graphql-mesh/utils@0.103.14

## 0.8.13

### Patch Changes

- [#8362](https://github.com/ardatan/graphql-mesh/pull/8362)
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.0)
    (from `^10.6.0`, in `dependencies`)
- Updated dependencies
  [[`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a),
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a),
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)]:
  - @graphql-mesh/cross-helpers@0.4.10
  - @graphql-mesh/types@0.103.13
  - @graphql-mesh/utils@0.103.13

## 0.8.12

### Patch Changes

- [#8282](https://github.com/ardatan/graphql-mesh/pull/8282)
  [`40274c3`](https://github.com/ardatan/graphql-mesh/commit/40274c3d50218686512de3ccf7c5d2cf3c23783c)
  Thanks [@ardatan](https://github.com/ardatan)! - Some SOAP API endpoints need `SOAPAction` HTTP
  header that points to the action path defined in the WSDL. This fixes that issue for those
  endpoints.
  [Learn more about SOAPAction header](https://www.ibm.com/docs/en/baw/22.x?topic=binding-protocol-headers)
- Updated dependencies
  [[`5180b06`](https://github.com/ardatan/graphql-mesh/commit/5180b068568042e764558a19194b8bae69354fe2),
  [`c54e361`](https://github.com/ardatan/graphql-mesh/commit/c54e36110256541e03380b0d537085848169116b),
  [`78c202e`](https://github.com/ardatan/graphql-mesh/commit/78c202ef8824607e27de1dcc5076c82a02ef86cd)]:
  - @graphql-mesh/utils@0.103.12
  - @graphql-mesh/types@0.103.12
  - @graphql-mesh/string-interpolation@0.5.8

## 0.8.11

### Patch Changes

- [#8196](https://github.com/ardatan/graphql-mesh/pull/8196)
  [`3fc1f3e`](https://github.com/ardatan/graphql-mesh/commit/3fc1f3e046c02107d7fecf367756c7196fbe6ce1)
  Thanks [@ardatan](https://github.com/ardatan)! - - You can now choose the name of the alias you
  want to use for SOAP body;

  ```ts filename="mesh.config.ts" {4}
  import { defineConfig } from '@graphql-mesh/compose-cli'

  export const composeConfig = defineConfig({
    sources: [
      {
        sourceHandler: loadSOAPSubgraph('CountryInfo', {
          source:
            'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL',
          bodyAlias: 'my-body'
        })
      }
    ]
  })
  ```

  - Then it will generate a body like below by using the alias;

  ```xml
  <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:my-body="http://foo.com/">
     <soap:Body>
        <my-body:Foo>
            <my-body:Bar>baz</my-body:Bar>
        </my-body:Foo>
     </soap:Body>
  </soap:Envelope>
  ```

  If you want to add SOAP headers to the request body like below;

  ```xml
  <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:header="http://foo.com/">
     <soap:Header>
        <header:MyHeader>
           <header:UserName>user</header:UserName>
           <header:Password>password</header:Password>
        </header:MyHeader>
     </soap:Header>
  ```

  You can add the headers to the configuration like below;

  ```ts filename="mesh.config.ts" {2,7-9}
  import { defineConfig } from '@graphql-mesh/compose-cli'
  import { loadSOAPSubgraph } from '@omnigraph/soap'

  export const composeConfig = defineConfig({
    subgraphs: [
      {
        sourceHandler: loadSOAPSubgraph('CountryInfo', {
          source:
            'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL',
          soapHeaders: {
            alias: 'header',
            namespace: 'http://foo.com',
            headers: {
              MyHeader: {
                UserName: 'user',
                Password: 'password'
              }
            }
          }
        })
      }
    ]
  })
  ```

- Updated dependencies
  [[`3fc1f3e`](https://github.com/ardatan/graphql-mesh/commit/3fc1f3e046c02107d7fecf367756c7196fbe6ce1),
  [`4011203`](https://github.com/ardatan/graphql-mesh/commit/40112034a2e248eda94883a39a3f8682189f4288)]:
  - @graphql-mesh/types@0.103.11
  - @graphql-mesh/utils@0.103.11

## 0.8.10

### Patch Changes

- Updated dependencies
  [[`b750a41`](https://github.com/ardatan/graphql-mesh/commit/b750a410c082d64a04f21023790f2ff2c46f5eb9)]:
  - @graphql-mesh/utils@0.103.10
  - @graphql-mesh/types@0.103.10

## 0.8.9

### Patch Changes

- Updated dependencies
  [[`10ba2c4`](https://github.com/ardatan/graphql-mesh/commit/10ba2c42549dacff9c4e6be87ee50b608be62ddc)]:
  - @graphql-mesh/utils@0.103.9
  - @graphql-mesh/types@0.103.9

## 0.8.8

### Patch Changes

- Updated dependencies
  [[`93fb364`](https://github.com/ardatan/graphql-mesh/commit/93fb3643d90c52084725d79b586ace8ecd570911)]:
  - @graphql-mesh/utils@0.103.8
  - @graphql-mesh/types@0.103.8

## 0.8.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.103.7
  - @graphql-mesh/utils@0.103.7

## 0.8.6

### Patch Changes

- [#8092](https://github.com/ardatan/graphql-mesh/pull/8092)
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/cross-helpers@^0.4.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.8)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/transport-common@^0.7.13` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/0.7.13)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/types@^0.103.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.5)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/executor@^1.3.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.2)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (to `dependencies`)
  - Added dependency
    [`@whatwg-node/fetch@^0.9.15 || ^0.10.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.15)
    (to `dependencies`)
  - Added dependency [`tslib@^2.4.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.4.0) (to
    `dependencies`)
  - Removed dependency
    [`@graphql-mesh/cross-helpers@^0.4.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.8)
    (from `peerDependencies`)
  - Removed dependency
    [`@graphql-mesh/transport-common@^0.7.13` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/0.7.13)
    (from `peerDependencies`)
  - Removed dependency
    [`@graphql-mesh/types@^0.103.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.5)
    (from `peerDependencies`)
  - Removed dependency
    [`@graphql-tools/executor@^1.3.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.2)
    (from `peerDependencies`)
  - Removed dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (from `peerDependencies`)
  - Removed dependency
    [`@whatwg-node/fetch@^0.9.15 || ^0.10.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.15)
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

## 0.8.5

### Patch Changes

- Updated dependencies
  [[`9f9f6fe`](https://github.com/ardatan/graphql-mesh/commit/9f9f6fe61c74eaa6572866eddd97c348307107a8)]:
  - @graphql-mesh/utils@0.103.5
  - @graphql-mesh/types@0.103.5

## 0.8.4

### Patch Changes

- Updated dependencies
  [[`8fcfe3f`](https://github.com/ardatan/graphql-mesh/commit/8fcfe3f78a0be53e3b474231bfe7ee0594e54f91)]:
  - @graphql-mesh/types@0.103.4
  - @graphql-mesh/utils@0.103.4

## 0.8.3

### Patch Changes

- Updated dependencies
  [[`6360755`](https://github.com/ardatan/graphql-mesh/commit/63607552017ed462c0555ad2e2ec6466c10d7ae4)]:
  - @graphql-mesh/utils@0.103.3
  - @graphql-mesh/types@0.103.3

## 0.8.2

### Patch Changes

- Updated dependencies
  [[`bfd8929`](https://github.com/ardatan/graphql-mesh/commit/bfd89297b0fe4dbdd0fecff8c35c316e874b9a56)]:
  - @graphql-mesh/utils@0.103.2
  - @graphql-mesh/types@0.103.2

## 0.8.1

### Patch Changes

- [#7978](https://github.com/ardatan/graphql-mesh/pull/7978)
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (from `^10.5.5`, in `peerDependencies`)
- Updated dependencies
  [[`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac),
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac),
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)]:
  - @graphql-mesh/cross-helpers@0.4.8
  - @graphql-mesh/types@0.103.1
  - @graphql-mesh/utils@0.103.1

## 0.8.0

### Patch Changes

- Updated dependencies
  [[`0e49907`](https://github.com/ardatan/graphql-mesh/commit/0e49907cf19d91fe40c28237aa79bd55742b371f),
  [`9873b33`](https://github.com/ardatan/graphql-mesh/commit/9873b33f0cc6c3b3a3c3dc1a0a1cb18c827b8722)]:
  - @graphql-mesh/utils@0.103.0
  - @graphql-mesh/types@0.103.0

## 0.7.14

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.102.13
  - @graphql-mesh/utils@0.102.13

## 0.7.13

### Patch Changes

- [#7914](https://github.com/ardatan/graphql-mesh/pull/7914)
  [`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.9.15 || ^0.10.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.15)
    (from `^0.9.15`, in `peerDependencies`)
- Updated dependencies
  [[`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7)]:
  - @graphql-mesh/utils@0.102.12
  - @graphql-mesh/types@0.102.12
  - @graphql-mesh/transport-common@0.7.13

## 0.7.12

### Patch Changes

- Updated dependencies
  [[`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af),
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af),
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)]:
  - @graphql-mesh/transport-common@0.7.12
  - @graphql-mesh/types@0.102.11
  - @graphql-mesh/utils@0.102.11

## 0.7.11

### Patch Changes

- Updated dependencies
  [[`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71),
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71),
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)]:
  - @graphql-mesh/transport-common@0.7.11
  - @graphql-mesh/types@0.102.10
  - @graphql-mesh/utils@0.102.10

## 0.7.10

### Patch Changes

- Updated dependencies
  [[`fad4d27`](https://github.com/ardatan/graphql-mesh/commit/fad4d27bfebb80a374c2041b86ffab509845effe)]:
  - @graphql-mesh/utils@0.102.9
  - @graphql-mesh/types@0.102.9
  - @graphql-mesh/transport-common@0.7.10

## 0.7.9

### Patch Changes

- Updated dependencies
  [[`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)]:
  - @graphql-mesh/transport-common@0.7.9
  - @graphql-mesh/types@0.102.8
  - @graphql-mesh/utils@0.102.8

## 0.7.8

### Patch Changes

- [#7781](https://github.com/ardatan/graphql-mesh/pull/7781)
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.3.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.2)
    (from `^1.3.1`, in `peerDependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.5.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.5)
    (from `^10.5.3`, in `peerDependencies`)
- Updated dependencies
  [[`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)]:
  - @graphql-mesh/cross-helpers@0.4.7
  - @graphql-mesh/transport-common@0.7.8
  - @graphql-mesh/types@0.102.7
  - @graphql-mesh/utils@0.102.7

## 0.7.7

### Patch Changes

- [`900e84c`](https://github.com/ardatan/graphql-mesh/commit/900e84c9846f84e84746860cf3f1c4724e64f377)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Bump potential CVE dependencies

- Updated dependencies
  [[`bf588d3`](https://github.com/ardatan/graphql-mesh/commit/bf588d372c0078378aaa24beea2da794af7949e6)]:
  - @graphql-mesh/utils@0.102.6
  - @graphql-mesh/types@0.102.6
  - @graphql-mesh/transport-common@0.7.7

## 0.7.6

### Patch Changes

- Updated dependencies
  [[`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d)]:
  - @graphql-mesh/utils@0.102.5
  - @graphql-mesh/types@0.102.5
  - @graphql-mesh/transport-common@0.7.6

## 0.7.5

### Patch Changes

- Updated dependencies
  [[`5146df0`](https://github.com/ardatan/graphql-mesh/commit/5146df0fd3313227d5d7df2beb726ca89e13923f)]:
  - @graphql-mesh/transport-common@0.7.5

## 0.7.4

### Patch Changes

- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/transport-common@0.7.4
  - @graphql-mesh/types@0.102.4
  - @graphql-mesh/utils@0.102.4

## 0.7.3

### Patch Changes

- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)]:
  - @graphql-mesh/transport-common@0.7.3
  - @graphql-mesh/types@0.102.3
  - @graphql-mesh/utils@0.102.3

## 0.7.2

### Patch Changes

- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/utils@0.102.2
  - @graphql-mesh/types@0.102.2
  - @graphql-mesh/transport-common@0.7.2

## 0.7.1

### Patch Changes

- [#7013](https://github.com/ardatan/graphql-mesh/pull/7013)
  [`60bfc22`](https://github.com/ardatan/graphql-mesh/commit/60bfc2240108af0a599a66451517a146cace879d)
  Thanks [@ardatan](https://github.com/ardatan)! - Introduce a standard Upstream Error Format for
  HTTP-based sources;

  So all sources throw an error will have the extensions in the following format;

  ```json
  {
    "extensions": {
      "request": {
        // The details of the request made to the upstream service
        "endpoint": "https://api.example.com",
        "method": "GET"
      },
      "response": {
        // The details of the HTTP response from the upstream service
        "status": 401,
        "statusText": "Unauthorized",
        "headers": {
          "content-type": "application/json"
        },
        "body": {
          // The raw body returned by the upstream service
          "error-message": "Unauthorized access"
        }
      }
    }
  }
  ```

- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de),
  [`60bfc22`](https://github.com/ardatan/graphql-mesh/commit/60bfc2240108af0a599a66451517a146cace879d)]:
  - @graphql-mesh/utils@0.102.1
  - @graphql-mesh/transport-common@0.7.1
  - @graphql-mesh/types@0.102.1

## 0.7.0

### Patch Changes

- Updated dependencies
  [[`13fa835`](https://github.com/ardatan/graphql-mesh/commit/13fa835036c3671305fc831fa236f110c33d9965),
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)]:
  - @graphql-mesh/string-interpolation@0.5.6
  - @graphql-mesh/types@0.102.0
  - @graphql-mesh/utils@0.102.0
  - @graphql-mesh/transport-common@0.7.0

## 0.6.2

### Patch Changes

- [#7518](https://github.com/ardatan/graphql-mesh/pull/7518)
  [`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-common@^0.6.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/0.6.1)
    (from `^0.6.0`, in `peerDependencies`)

## 0.6.1

### Patch Changes

- [#7516](https://github.com/ardatan/graphql-mesh/pull/7516)
  [`67e1062`](https://github.com/ardatan/graphql-mesh/commit/67e10629c70ec553234c1ffc99af4b89ddb31985)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Transport's kind doesn't need to be typed

- Updated dependencies
  [[`67e1062`](https://github.com/ardatan/graphql-mesh/commit/67e10629c70ec553234c1ffc99af4b89ddb31985)]:
  - @graphql-mesh/transport-common@0.6.1

## 0.6.0

### Patch Changes

- [#7497](https://github.com/ardatan/graphql-mesh/pull/7497)
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.5.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.2)
    (from `^10.3.4`, in `peerDependencies`)

- [#7512](https://github.com/ardatan/graphql-mesh/pull/7512)
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.5.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.3)
    (from `^10.5.2`, in `peerDependencies`)
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
  - @graphql-mesh/transport-common@0.6.0
  - @graphql-mesh/types@0.101.0
  - @graphql-mesh/utils@0.101.0

## 0.5.0

### Patch Changes

- [#7477](https://github.com/ardatan/graphql-mesh/pull/7477)
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.3.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.3.4)
    (from `^10.2.3`, in `peerDependencies`)
  - Added dependency
    [`@graphql-tools/executor@^1.3.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.1)
    (to `peerDependencies`)
- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7),
  [`4d1eb28`](https://github.com/ardatan/graphql-mesh/commit/4d1eb285c2b703c5f80473ad0f316004306fac7f),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7)]:
  - @graphql-mesh/cross-helpers@0.4.5
  - @graphql-mesh/transport-common@0.5.0
  - @graphql-mesh/types@0.100.0
  - @graphql-mesh/utils@0.100.0

## 0.4.7

### Patch Changes

- Updated dependencies
  [[`a1bfc49`](https://github.com/ardatan/graphql-mesh/commit/a1bfc492ac3378f22b79a51824407e776b496a84)]:
  - @graphql-mesh/types@0.99.7
  - @graphql-mesh/utils@0.99.7
  - @graphql-mesh/transport-common@0.4.7

## 0.4.6

### Patch Changes

- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/transport-common@0.4.6
  - @graphql-mesh/types@0.99.6
  - @graphql-mesh/utils@0.99.6

## 0.4.5

### Patch Changes

- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/utils@0.99.5
  - @graphql-mesh/types@0.99.5
  - @graphql-mesh/transport-common@0.4.5

## 0.4.4

### Patch Changes

- Updated dependencies
  [[`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)]:
  - @graphql-mesh/utils@0.99.4
  - @graphql-mesh/types@0.99.4
  - @graphql-mesh/transport-common@0.4.4

## 0.4.3

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3
  - @graphql-mesh/types@0.99.3
  - @graphql-mesh/transport-common@0.4.3

## 0.4.2

### Patch Changes

- Updated dependencies
  [[`b01f3ea`](https://github.com/ardatan/graphql-mesh/commit/b01f3eabdc42d8905e8d586a4845e8394c094033),
  [`0bdc18d`](https://github.com/ardatan/graphql-mesh/commit/0bdc18df3d150a61abf987b8829934ed4ca02eed),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730)]:
  - @graphql-mesh/string-interpolation@0.5.5
  - @graphql-mesh/transport-common@0.4.2
  - @graphql-mesh/types@0.99.2
  - @graphql-mesh/utils@0.99.2

## 0.4.1

### Patch Changes

- Updated dependencies
  [[`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)]:
  - @graphql-mesh/transport-common@0.4.1
  - @graphql-mesh/types@0.99.1
  - @graphql-mesh/utils@0.99.1

## 0.4.0

### Patch Changes

- Updated dependencies
  [[`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)]:
  - @graphql-mesh/transport-common@0.4.0
  - @graphql-mesh/utils@0.99.0
  - @graphql-mesh/types@0.99.0

## 0.3.1

### Patch Changes

- [#7185](https://github.com/ardatan/graphql-mesh/pull/7185)
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (from `^10.2.1`, in `peerDependencies`)
- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)]:
  - @graphql-mesh/cross-helpers@0.4.4
  - @graphql-mesh/transport-common@0.3.1
  - @graphql-mesh/types@0.98.10
  - @graphql-mesh/utils@0.98.10

## 0.3.0

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
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/utils@^0.98.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.98.8)
    (to `dependencies`)

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
  [[`f985978`](https://github.com/ardatan/graphql-mesh/commit/f9859784ad854207e4d32bda11c904b5301610ee),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)]:
  - @graphql-mesh/utils@0.98.9
  - @graphql-mesh/transport-common@0.3.0
  - @graphql-mesh/types@0.98.9

## 0.2.8

### Patch Changes

- Updated dependencies
  [[`4c75671`](https://github.com/ardatan/graphql-mesh/commit/4c756717247eb0a8f3431e31e6c86fc97297bd32),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/types@0.98.8
  - @graphql-mesh/transport-common@0.2.8

## 0.2.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.98.7
  - @graphql-mesh/transport-common@0.2.7

## 0.2.6

### Patch Changes

- [#7030](https://github.com/ardatan/graphql-mesh/pull/7030)
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.1)
    (from `^10.2.0`, in `peerDependencies`)
- Updated dependencies
  [[`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/cross-helpers@0.4.3
  - @graphql-mesh/transport-common@0.2.6
  - @graphql-mesh/types@0.98.6

## 0.2.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.98.5
  - @graphql-mesh/transport-common@0.2.5

## 0.2.4

### Patch Changes

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @graphql-mesh/transport-common@0.2.4
  - @graphql-mesh/types@0.98.4

## 0.2.3

### Patch Changes

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @graphql-mesh/transport-common@0.2.3
  - @graphql-mesh/types@0.98.3

## 0.2.2

### Patch Changes

- [`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/transport-common@0.2.2
  - @graphql-mesh/cross-helpers@0.4.2
  - @graphql-mesh/types@0.98.2

## 0.2.1

### Patch Changes

- Updated dependencies
  [[`3d88cb8`](https://github.com/ardatan/graphql-mesh/commit/3d88cb8ff1829081411fcb2051ad18d7f89536ba),
  [`6044b7f`](https://github.com/ardatan/graphql-mesh/commit/6044b7f8bd72ee3d4460d9f09f303ea6fc4e007b)]:
  - @graphql-mesh/string-interpolation@0.5.4
  - @graphql-mesh/types@0.98.1
  - @graphql-mesh/transport-common@0.2.1

## 0.2.0

### Patch Changes

- Updated dependencies
  [[`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)]:
  - @graphql-mesh/transport-common@0.2.0
  - @graphql-mesh/types@0.98.0

## 0.1.5

### Patch Changes

- Updated dependencies
  [[`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)]:
  - @graphql-mesh/types@0.97.5
  - @graphql-mesh/transport-common@0.1.5

## 0.1.4

### Patch Changes

- Updated dependencies
  [[`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)]:
  - @graphql-mesh/types@0.97.4
  - @graphql-mesh/transport-common@0.1.4

## 0.1.3

### Patch Changes

- Updated dependencies
  [[`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)]:
  - @graphql-mesh/types@0.97.3
  - @graphql-mesh/transport-common@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies
  [[`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)]:
  - @graphql-mesh/types@0.97.2
  - @graphql-mesh/transport-common@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies
  [[`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)]:
  - @graphql-mesh/types@0.97.1
  - @graphql-mesh/transport-common@0.1.1

## 0.1.0

### Patch Changes

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a)]:
  - @graphql-mesh/types@0.97.0
  - @graphql-mesh/transport-common@0.1.0

## 0.0.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.96.6
  - @graphql-mesh/transport-common@0.0.3

## 0.0.2

### Patch Changes

- Updated dependencies
  [[`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)]:
  - @graphql-mesh/types@0.96.5
  - @graphql-mesh/transport-common@0.0.2

## 0.0.1

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - New Fusion packages

- Updated dependencies
  [[`ae7b085`](https://github.com/ardatan/graphql-mesh/commit/ae7b085e93ba911f03bbfd2a15ff9ca8be9f4de8),
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)]:
  - @graphql-mesh/types@0.96.4
  - @graphql-mesh/transport-common@0.0.1
