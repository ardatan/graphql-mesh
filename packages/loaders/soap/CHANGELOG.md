# @omnigraph/soap

## 0.106.2

### Patch Changes

- Updated dependencies
  [[`903124f`](https://github.com/ardatan/graphql-mesh/commit/903124f8245a518aac50ef8d0eff2fef01a206f2)]:
  - @graphql-mesh/utils@0.103.21
  - @graphql-mesh/transport-soap@0.9.2
  - @graphql-mesh/types@0.103.21

## 0.106.1

### Patch Changes

- [#8431](https://github.com/ardatan/graphql-mesh/pull/8431)
  [`3f5e0a1`](https://github.com/ardatan/graphql-mesh/commit/3f5e0a13c8a07bd68ec19e4da94f34030cc7d3dc)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/promise-helpers@^1.0.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.0.0)
    (to `dependencies`)
- Updated dependencies
  [[`3f5e0a1`](https://github.com/ardatan/graphql-mesh/commit/3f5e0a13c8a07bd68ec19e4da94f34030cc7d3dc)]:
  - @graphql-mesh/utils@0.103.20
  - @graphql-mesh/transport-soap@0.9.1
  - @graphql-mesh/types@0.103.20

## 0.106.0

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
  - @graphql-mesh/transport-soap@0.9.0
  - @graphql-mesh/types@0.103.19
  - @graphql-mesh/utils@0.103.19

## 0.105.18

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
    (from `^0.10.0`, in `dependencies`)
- Updated dependencies
  [[`5aaf455`](https://github.com/ardatan/graphql-mesh/commit/5aaf4559ac3dc3d08db4011a4351b96b8b25d1a3),
  [`ab0863b`](https://github.com/ardatan/graphql-mesh/commit/ab0863ba367552e4b1ced1063ae7cb3a5f81b3b2),
  [`ab0863b`](https://github.com/ardatan/graphql-mesh/commit/ab0863ba367552e4b1ced1063ae7cb3a5f81b3b2)]:
  - @graphql-mesh/transport-soap@0.8.18
  - @graphql-mesh/utils@0.103.18
  - @graphql-mesh/types@0.103.18

## 0.105.17

### Patch Changes

- Updated dependencies
  [[`eee582a`](https://github.com/ardatan/graphql-mesh/commit/eee582a4cf78d8f7b0e303b522e6a97bd0ad4f2a)]:
  - @graphql-mesh/utils@0.103.17
  - @graphql-mesh/transport-soap@0.8.17
  - @graphql-mesh/types@0.103.17

## 0.105.16

### Patch Changes

- Updated dependencies
  [[`b44f8b7`](https://github.com/ardatan/graphql-mesh/commit/b44f8b7a413c8adb213b22fb8a243ca6aa06d2bd)]:
  - @graphql-mesh/types@0.103.16
  - @graphql-mesh/utils@0.103.16
  - @graphql-mesh/transport-soap@0.8.16

## 0.105.15

### Patch Changes

- Updated dependencies
  [[`b5c05c4`](https://github.com/ardatan/graphql-mesh/commit/b5c05c4c5862525c76d69e8c166e71378f69bda0)]:
  - @graphql-mesh/types@0.103.15
  - @graphql-mesh/utils@0.103.15
  - @graphql-mesh/transport-soap@0.8.15

## 0.105.14

### Patch Changes

- Updated dependencies
  [[`fc44a1e`](https://github.com/ardatan/graphql-mesh/commit/fc44a1e66c8bc8f27dc7e5e642031d17d75c0db8)]:
  - @graphql-mesh/types@0.103.14
  - @graphql-mesh/utils@0.103.14
  - @graphql-mesh/transport-soap@0.8.14

## 0.105.13

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
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a),
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)]:
  - @graphql-mesh/cross-helpers@0.4.10
  - @graphql-mesh/transport-soap@0.8.13
  - @graphql-mesh/types@0.103.13
  - @graphql-mesh/utils@0.103.13

## 0.105.12

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
  [`40274c3`](https://github.com/ardatan/graphql-mesh/commit/40274c3d50218686512de3ccf7c5d2cf3c23783c),
  [`78c202e`](https://github.com/ardatan/graphql-mesh/commit/78c202ef8824607e27de1dcc5076c82a02ef86cd)]:
  - @graphql-mesh/utils@0.103.12
  - @graphql-mesh/types@0.103.12
  - @graphql-mesh/transport-soap@0.8.12
  - @graphql-mesh/string-interpolation@0.5.8

## 0.105.11

### Patch Changes

- [#8196](https://github.com/ardatan/graphql-mesh/pull/8196)
  [`3fc1f3e`](https://github.com/ardatan/graphql-mesh/commit/3fc1f3e046c02107d7fecf367756c7196fbe6ce1)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/transport-common@^0.7.25` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/0.7.25)
    (to `dependencies`)

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
  - @graphql-mesh/transport-soap@0.8.11
  - @graphql-mesh/types@0.103.11
  - @graphql-mesh/utils@0.103.11

## 0.105.10

### Patch Changes

- Updated dependencies
  [[`b750a41`](https://github.com/ardatan/graphql-mesh/commit/b750a410c082d64a04f21023790f2ff2c46f5eb9)]:
  - @graphql-mesh/utils@0.103.10
  - @graphql-mesh/transport-soap@0.8.10
  - @graphql-mesh/types@0.103.10

## 0.105.9

### Patch Changes

- Updated dependencies
  [[`10ba2c4`](https://github.com/ardatan/graphql-mesh/commit/10ba2c42549dacff9c4e6be87ee50b608be62ddc)]:
  - @graphql-mesh/utils@0.103.9
  - @graphql-mesh/transport-soap@0.8.9
  - @graphql-mesh/types@0.103.9

## 0.105.8

### Patch Changes

- Updated dependencies
  [[`93fb364`](https://github.com/ardatan/graphql-mesh/commit/93fb3643d90c52084725d79b586ace8ecd570911)]:
  - @graphql-mesh/utils@0.103.8
  - @graphql-mesh/transport-soap@0.8.8
  - @graphql-mesh/types@0.103.8

## 0.105.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.103.7
  - @graphql-mesh/utils@0.103.7
  - @graphql-mesh/transport-soap@0.8.7

## 0.105.6

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
  - Added dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (to `dependencies`)
  - Removed dependency
    [`@graphql-mesh/types@^0.103.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.103.5)
    (from `peerDependencies`)
  - Removed dependency
    [`@graphql-mesh/utils@^0.103.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.5)
    (from `peerDependencies`)
  - Removed dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (from `peerDependencies`)
- Updated dependencies
  [[`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9),
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9),
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9),
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9),
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)]:
  - @graphql-mesh/cross-helpers@0.4.9
  - @graphql-mesh/string-interpolation@0.5.7
  - @graphql-mesh/transport-soap@0.8.6
  - @graphql-mesh/types@0.103.6
  - @graphql-mesh/utils@0.103.6

## 0.105.5

### Patch Changes

- Updated dependencies
  [[`9f9f6fe`](https://github.com/ardatan/graphql-mesh/commit/9f9f6fe61c74eaa6572866eddd97c348307107a8)]:
  - @graphql-mesh/utils@0.103.5
  - @graphql-mesh/transport-soap@0.8.5
  - @graphql-mesh/types@0.103.5

## 0.105.4

### Patch Changes

- Updated dependencies
  [[`8fcfe3f`](https://github.com/ardatan/graphql-mesh/commit/8fcfe3f78a0be53e3b474231bfe7ee0594e54f91)]:
  - @graphql-mesh/types@0.103.4
  - @graphql-mesh/utils@0.103.4
  - @graphql-mesh/transport-soap@0.8.4

## 0.105.3

### Patch Changes

- Updated dependencies
  [[`6360755`](https://github.com/ardatan/graphql-mesh/commit/63607552017ed462c0555ad2e2ec6466c10d7ae4)]:
  - @graphql-mesh/utils@0.103.3
  - @graphql-mesh/transport-soap@0.8.3
  - @graphql-mesh/types@0.103.3

## 0.105.2

### Patch Changes

- Updated dependencies
  [[`bfd8929`](https://github.com/ardatan/graphql-mesh/commit/bfd89297b0fe4dbdd0fecff8c35c316e874b9a56)]:
  - @graphql-mesh/utils@0.103.2
  - @graphql-mesh/transport-soap@0.8.2
  - @graphql-mesh/types@0.103.2

## 0.105.1

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
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac),
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)]:
  - @graphql-mesh/cross-helpers@0.4.8
  - @graphql-mesh/transport-soap@0.8.1
  - @graphql-mesh/types@0.103.1
  - @graphql-mesh/utils@0.103.1

## 0.105.0

### Patch Changes

- Updated dependencies
  [[`0e49907`](https://github.com/ardatan/graphql-mesh/commit/0e49907cf19d91fe40c28237aa79bd55742b371f),
  [`9873b33`](https://github.com/ardatan/graphql-mesh/commit/9873b33f0cc6c3b3a3c3dc1a0a1cb18c827b8722)]:
  - @graphql-mesh/utils@0.103.0
  - @graphql-mesh/transport-soap@0.8.0
  - @graphql-mesh/types@0.103.0

## 0.104.14

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.102.13
  - @graphql-mesh/utils@0.102.13
  - @graphql-mesh/transport-soap@0.7.14

## 0.104.13

### Patch Changes

- [#7914](https://github.com/ardatan/graphql-mesh/pull/7914)
  [`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.0)
    (from `^0.9.15`, in `dependencies`)
- Updated dependencies
  [[`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7),
  [`eee53b9`](https://github.com/ardatan/graphql-mesh/commit/eee53b9f455653166c39bca627b3261fbefe4eb7)]:
  - @graphql-mesh/transport-soap@0.7.13
  - @graphql-mesh/utils@0.102.12
  - @graphql-mesh/types@0.102.12

## 0.104.12

### Patch Changes

- Updated dependencies
  [[`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af),
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)]:
  - @graphql-mesh/types@0.102.11
  - @graphql-mesh/utils@0.102.11
  - @graphql-mesh/transport-soap@0.7.12

## 0.104.11

### Patch Changes

- Updated dependencies
  [[`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71),
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)]:
  - @graphql-mesh/types@0.102.10
  - @graphql-mesh/utils@0.102.10
  - @graphql-mesh/transport-soap@0.7.11

## 0.104.10

### Patch Changes

- Updated dependencies
  [[`fad4d27`](https://github.com/ardatan/graphql-mesh/commit/fad4d27bfebb80a374c2041b86ffab509845effe)]:
  - @graphql-mesh/utils@0.102.9
  - @graphql-mesh/transport-soap@0.7.10
  - @graphql-mesh/types@0.102.9

## 0.104.9

### Patch Changes

- Updated dependencies
  [[`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)]:
  - @graphql-mesh/types@0.102.8
  - @graphql-mesh/utils@0.102.8
  - @graphql-mesh/transport-soap@0.7.9

## 0.104.8

### Patch Changes

- [#7781](https://github.com/ardatan/graphql-mesh/pull/7781)
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.5.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.5)
    (from `^10.5.3`, in `peerDependencies`)
- Updated dependencies
  [[`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)]:
  - @graphql-mesh/cross-helpers@0.4.7
  - @graphql-mesh/transport-soap@0.7.8
  - @graphql-mesh/types@0.102.7
  - @graphql-mesh/utils@0.102.7

## 0.104.7

### Patch Changes

- [`900e84c`](https://github.com/ardatan/graphql-mesh/commit/900e84c9846f84e84746860cf3f1c4724e64f377)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Bump potential CVE dependencies

- Updated dependencies
  [[`bf588d3`](https://github.com/ardatan/graphql-mesh/commit/bf588d372c0078378aaa24beea2da794af7949e6),
  [`900e84c`](https://github.com/ardatan/graphql-mesh/commit/900e84c9846f84e84746860cf3f1c4724e64f377)]:
  - @graphql-mesh/utils@0.102.6
  - @graphql-mesh/transport-soap@0.7.7
  - @graphql-mesh/types@0.102.6

## 0.104.6

### Patch Changes

- Updated dependencies
  [[`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d)]:
  - @graphql-mesh/utils@0.102.5
  - @graphql-mesh/transport-soap@0.7.6
  - @graphql-mesh/types@0.102.5

## 0.104.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-soap@0.7.5

## 0.104.4

### Patch Changes

- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/types@0.102.4
  - @graphql-mesh/utils@0.102.4
  - @graphql-mesh/transport-soap@0.7.4

## 0.104.3

### Patch Changes

- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)]:
  - @graphql-mesh/types@0.102.3
  - @graphql-mesh/utils@0.102.3
  - @graphql-mesh/transport-soap@0.7.3

## 0.104.2

### Patch Changes

- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/utils@0.102.2
  - @graphql-mesh/transport-soap@0.7.2
  - @graphql-mesh/types@0.102.2

## 0.104.1

### Patch Changes

- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de),
  [`60bfc22`](https://github.com/ardatan/graphql-mesh/commit/60bfc2240108af0a599a66451517a146cace879d)]:
  - @graphql-mesh/utils@0.102.1
  - @graphql-mesh/transport-soap@0.7.1
  - @graphql-mesh/types@0.102.1

## 0.104.0

### Patch Changes

- Updated dependencies
  [[`13fa835`](https://github.com/ardatan/graphql-mesh/commit/13fa835036c3671305fc831fa236f110c33d9965),
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)]:
  - @graphql-mesh/string-interpolation@0.5.6
  - @graphql-mesh/types@0.102.0
  - @graphql-mesh/utils@0.102.0
  - @graphql-mesh/transport-soap@0.7.0

## 0.103.2

### Patch Changes

- [#7518](https://github.com/ardatan/graphql-mesh/pull/7518)
  [`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/transport-soap@^0.6.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-soap/v/0.6.1)
    (from `^0.6.0`, in `dependencies`)
- Updated dependencies
  [[`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)]:
  - @graphql-mesh/transport-soap@0.6.2

## 0.103.1

### Patch Changes

- Updated dependencies
  [[`67e1062`](https://github.com/ardatan/graphql-mesh/commit/67e10629c70ec553234c1ffc99af4b89ddb31985)]:
  - @graphql-mesh/transport-soap@0.6.1

## 0.103.0

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
  - @graphql-mesh/transport-soap@0.6.0
  - @graphql-mesh/types@0.101.0
  - @graphql-mesh/utils@0.101.0

## 0.102.0

### Patch Changes

- [#7477](https://github.com/ardatan/graphql-mesh/pull/7477)
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.3.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.3.4)
    (from `^10.2.3`, in `peerDependencies`)
- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7),
  [`4d1eb28`](https://github.com/ardatan/graphql-mesh/commit/4d1eb285c2b703c5f80473ad0f316004306fac7f),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7)]:
  - @graphql-mesh/cross-helpers@0.4.5
  - @graphql-mesh/transport-soap@0.5.0
  - @graphql-mesh/types@0.100.0
  - @graphql-mesh/utils@0.100.0

## 0.101.7

### Patch Changes

- Updated dependencies
  [[`a1bfc49`](https://github.com/ardatan/graphql-mesh/commit/a1bfc492ac3378f22b79a51824407e776b496a84)]:
  - @graphql-mesh/types@0.99.7
  - @graphql-mesh/utils@0.99.7
  - @graphql-mesh/transport-soap@0.4.7

## 0.101.6

### Patch Changes

- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/types@0.99.6
  - @graphql-mesh/utils@0.99.6
  - @graphql-mesh/transport-soap@0.4.6

## 0.101.5

### Patch Changes

- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/utils@0.99.5
  - @graphql-mesh/transport-soap@0.4.5
  - @graphql-mesh/types@0.99.5

## 0.101.4

### Patch Changes

- Updated dependencies
  [[`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)]:
  - @graphql-mesh/utils@0.99.4
  - @graphql-mesh/transport-soap@0.4.4
  - @graphql-mesh/types@0.99.4

## 0.101.3

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3
  - @graphql-mesh/transport-soap@0.4.3
  - @graphql-mesh/types@0.99.3

## 0.101.2

### Patch Changes

- Updated dependencies
  [[`b01f3ea`](https://github.com/ardatan/graphql-mesh/commit/b01f3eabdc42d8905e8d586a4845e8394c094033),
  [`0bdc18d`](https://github.com/ardatan/graphql-mesh/commit/0bdc18df3d150a61abf987b8829934ed4ca02eed),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e)]:
  - @graphql-mesh/string-interpolation@0.5.5
  - @graphql-mesh/types@0.99.2
  - @graphql-mesh/utils@0.99.2
  - @graphql-mesh/transport-soap@0.4.2

## 0.101.1

### Patch Changes

- Updated dependencies
  [[`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)]:
  - @graphql-mesh/types@0.99.1
  - @graphql-mesh/utils@0.99.1
  - @graphql-mesh/transport-soap@0.4.1

## 0.101.0

### Patch Changes

- Updated dependencies
  [[`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00)]:
  - @graphql-mesh/utils@0.99.0
  - @graphql-mesh/transport-soap@0.4.0
  - @graphql-mesh/types@0.99.0

## 0.100.2

### Patch Changes

- [`da0c516`](https://github.com/ardatan/graphql-mesh/commit/da0c51659cc622082a04799cffb69dd8bd99f954)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the inverted nullability generation

  If SOAP has `nillable: true`, the generated type was non-nullable, and now it has been fixed to be
  nullable as expected.

## 0.100.1

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
  - @graphql-mesh/transport-soap@0.3.1
  - @graphql-mesh/types@0.98.10
  - @graphql-mesh/utils@0.98.10

## 0.100.0

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
  - Updated dependency
    [`graphql-compose@^9.0.11` ↗︎](https://www.npmjs.com/package/graphql-compose/v/9.0.11) (from
    `^9.0.10`, in `dependencies`)
- Updated dependencies
  [[`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae),
  [`f985978`](https://github.com/ardatan/graphql-mesh/commit/f9859784ad854207e4d32bda11c904b5301610ee),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)]:
  - @graphql-mesh/transport-soap@0.3.0
  - @graphql-mesh/utils@0.98.9
  - @graphql-mesh/types@0.98.9

## 0.99.4

### Patch Changes

- Updated dependencies
  [[`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`4c75671`](https://github.com/ardatan/graphql-mesh/commit/4c756717247eb0a8f3431e31e6c86fc97297bd32),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/utils@0.98.8
  - @graphql-mesh/types@0.98.8
  - @graphql-mesh/transport-soap@0.2.8

## 0.99.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.98.7
  - @graphql-mesh/utils@0.98.7
  - @graphql-mesh/transport-soap@0.2.7

## 0.99.2

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
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/cross-helpers@0.4.3
  - @graphql-mesh/transport-soap@0.2.6
  - @graphql-mesh/types@0.98.6
  - @graphql-mesh/utils@0.98.6

## 0.99.1

### Patch Changes

- Updated dependencies
  [[`c4d2249`](https://github.com/ardatan/graphql-mesh/commit/c4d22497b4249f9a0969e1d01efbe0721774ce73)]:
  - @graphql-mesh/utils@0.98.5
  - @graphql-mesh/types@0.98.5
  - @graphql-mesh/transport-soap@0.2.5

## 0.99.0

### Minor Changes

- [#6980](https://github.com/ardatan/graphql-mesh/pull/6980)
  [`e8fdfa3`](https://github.com/ardatan/graphql-mesh/commit/e8fdfa354a6ddae4f4fd57378d1b64c71aa57095)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Enable non-http WSDL definitions attributes

### Patch Changes

- [#6992](https://github.com/ardatan/graphql-mesh/pull/6992)
  [`bd5cea3`](https://github.com/ardatan/graphql-mesh/commit/bd5cea366a75f4593e151a278e9b475eae2fd624)
  Thanks [@ardatan](https://github.com/ardatan)! - Support documents without any prefixes on W3
  definitions like `xs` etc.

  WSDL definitions might not have any prefix for W3 definitions as in here;

  ```xml
  <xs:schema />
  ```

  Unlike this one;

  ```xml
  <schema />
  ```

  Both are supported, previously it was throwing while looking for a namespace prefix for W3. Now it
  considers W3 to be the default/global namespace if there is no explicit prefix for it in the
  document.

  ```xml
  <wsdl:definitions xmlns:xsd="http://www.w3.org/2001/XMLSchema" />
  ```

- [#6992](https://github.com/ardatan/graphql-mesh/pull/6992)
  [`bd5cea3`](https://github.com/ardatan/graphql-mesh/commit/bd5cea366a75f4593e151a278e9b475eae2fd624)
  Thanks [@ardatan](https://github.com/ardatan)! - Support new numeric types; `integer`,
  `negativeInteger`, `nonNegativeInteger`, `nonPositiveInteger` and `positiveInteger` as scalar
  types

  See all the numeric types in SOAP; https://www.w3schools.com/xml/schema_dtypes_numeric.asp

- [#6992](https://github.com/ardatan/graphql-mesh/pull/6992)
  [`bd5cea3`](https://github.com/ardatan/graphql-mesh/commit/bd5cea366a75f4593e151a278e9b475eae2fd624)
  Thanks [@ardatan](https://github.com/ardatan)! - Support extended enum types, before it was
  supporting `string` only but it might be other types of enums which are not string. In GraphQL,
  there is not such a thing like `Enum<T>` so all enums are just enums.

## 0.98.4

### Patch Changes

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @graphql-mesh/types@0.98.4
  - @graphql-mesh/utils@0.98.4
  - @graphql-mesh/transport-soap@0.2.4

## 0.98.3

### Patch Changes

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @graphql-mesh/types@0.98.3
  - @graphql-mesh/utils@0.98.3
  - @graphql-mesh/transport-soap@0.2.3

## 0.98.2

### Patch Changes

- [`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/transport-soap@0.2.2
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
  - @graphql-mesh/transport-soap@0.2.1

## 0.98.0

### Patch Changes

- Updated dependencies
  [[`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)]:
  - @graphql-mesh/types@0.98.0
  - @graphql-mesh/utils@0.98.0
  - @graphql-mesh/transport-soap@0.2.0

## 0.97.5

### Patch Changes

- Updated dependencies
  [[`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)]:
  - @graphql-mesh/types@0.97.5
  - @graphql-mesh/utils@0.97.5
  - @graphql-mesh/transport-soap@0.1.5

## 0.97.4

### Patch Changes

- Updated dependencies
  [[`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)]:
  - @graphql-mesh/utils@0.97.4
  - @graphql-mesh/types@0.97.4
  - @graphql-mesh/transport-soap@0.1.4

## 0.97.3

### Patch Changes

- Updated dependencies
  [[`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)]:
  - @graphql-mesh/types@0.97.3
  - @graphql-mesh/utils@0.97.3
  - @graphql-mesh/transport-soap@0.1.3

## 0.97.2

### Patch Changes

- Updated dependencies
  [[`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)]:
  - @graphql-mesh/types@0.97.2
  - @graphql-mesh/utils@0.97.2
  - @graphql-mesh/transport-soap@0.1.2

## 0.97.1

### Patch Changes

- Updated dependencies
  [[`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)]:
  - @graphql-mesh/types@0.97.1
  - @graphql-mesh/utils@0.97.1
  - @graphql-mesh/transport-soap@0.1.1

## 0.97.0

### Patch Changes

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a),
  [`70b05a2`](https://github.com/ardatan/graphql-mesh/commit/70b05a20a948b5ebed5306c14710c8839225cdad)]:
  - @graphql-mesh/types@0.97.0
  - @graphql-mesh/utils@0.97.0
  - @graphql-mesh/transport-soap@0.1.0

## 0.96.7

### Patch Changes

- Updated dependencies
  [[`0f274ef`](https://github.com/ardatan/graphql-mesh/commit/0f274ef8177068da65e50e08607998d0ed63e8b9)]:
  - @graphql-mesh/utils@0.96.6
  - @graphql-mesh/types@0.96.6
  - @graphql-mesh/transport-soap@0.0.3

## 0.96.6

### Patch Changes

- Updated dependencies
  [[`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)]:
  - @graphql-mesh/types@0.96.5
  - @graphql-mesh/transport-soap@0.0.2
  - @graphql-mesh/utils@0.96.5

## 0.96.5

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@^4.3.4` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.3.4) (from
    `4.3.4`, in `dependencies`)
  - Updated dependency
    [`graphql-compose@^9.0.10` ↗︎](https://www.npmjs.com/package/graphql-compose/v/9.0.10) (from
    `9.0.10`, in `dependencies`)
  - Added dependency
    [`@graphql-mesh/transport-soap@^0.0.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-soap/v/0.0.0)
    (to `dependencies`)
  - Added dependency
    [`@whatwg-node/fetch@^0.9.15` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.15)
    (to `dependencies`)
- Updated dependencies
  [[`ae7b085`](https://github.com/ardatan/graphql-mesh/commit/ae7b085e93ba911f03bbfd2a15ff9ca8be9f4de8),
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)]:
  - @graphql-mesh/types@0.96.4
  - @graphql-mesh/transport-soap@0.0.1
  - @graphql-mesh/utils@0.96.4

## 0.96.4

### Patch Changes

- [#6453](https://github.com/ardatan/graphql-mesh/pull/6453)
  [`083b00b`](https://github.com/ardatan/graphql-mesh/commit/083b00bded973ded6c8f4dc362df34049f9c893c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@4.3.3` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.3.3) (from
    `4.3.2`, in `dependencies`)
- Updated dependencies
  [[`ac26793`](https://github.com/ardatan/graphql-mesh/commit/ac26793e59f76f0839b61a8030e0eefc7383e640)]:
  - @graphql-mesh/types@0.96.3
  - @graphql-mesh/utils@0.96.3

## 0.96.3

### Patch Changes

- [`d51e219`](https://github.com/ardatan/graphql-mesh/commit/d51e219e6214dad333f12080c39c32b3191c6cec)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve root value method

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

## 0.95.10

### Patch Changes

- Updated dependencies
  [[`b4d38c55d`](https://github.com/ardatan/graphql-mesh/commit/b4d38c55df8c4d2aeb98325555979eb09d065906)]:
  - @graphql-mesh/string-interpolation@0.5.3
  - @graphql-mesh/utils@0.95.8
  - @graphql-mesh/types@0.95.8

## 0.95.9

### Patch Changes

- [#6060](https://github.com/Urigo/graphql-mesh/pull/6060)
  [`ae5e7c972`](https://github.com/Urigo/graphql-mesh/commit/ae5e7c9728e572ea75c0f4e3b57dad932658155c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`graphql-scalars@^1.22.4` ↗︎](https://www.npmjs.com/package/graphql-scalars/v/1.22.4) (from
    `^1.22.2`, in `dependencies`)

## 0.95.8

### Patch Changes

- Updated dependencies
  [[`a13969c77`](https://github.com/Urigo/graphql-mesh/commit/a13969c77794c44493d7a9426be7e38a6d673c88)]:
  - @graphql-mesh/types@0.95.7
  - @graphql-mesh/utils@0.95.7

## 0.95.7

### Patch Changes

- [#6028](https://github.com/Urigo/graphql-mesh/pull/6028)
  [`2d5bea984`](https://github.com/Urigo/graphql-mesh/commit/2d5bea9842573f474dc2f61bc4d9f1842873fac4)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@4.3.2` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.3.2) (from
    `4.2.7`, in `dependencies`)

## 0.95.6

### Patch Changes

- Updated dependencies
  [[`8e1056cf9`](https://github.com/Urigo/graphql-mesh/commit/8e1056cf91b0e7069499f5102aaed163a0168597)]:
  - @graphql-mesh/string-interpolation@0.5.2
  - @graphql-mesh/utils@0.95.6
  - @graphql-mesh/types@0.95.6

## 0.95.5

### Patch Changes

- Updated dependencies
  [[`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781),
  [`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781)]:
  - @graphql-mesh/cross-helpers@0.4.1
  - @graphql-mesh/types@0.95.5
  - @graphql-mesh/utils@0.95.5

## 0.95.4

### Patch Changes

- Updated dependencies
  [[`625e5d787`](https://github.com/Urigo/graphql-mesh/commit/625e5d7878d44abd7c9d1542bf5cdcd4e37e2411)]:
  - @graphql-mesh/types@0.95.4
  - @graphql-mesh/utils@0.95.4

## 0.95.3

### Patch Changes

- Updated dependencies
  [[`33ae7a89a`](https://github.com/Urigo/graphql-mesh/commit/33ae7a89a13f40ebbe0a01620e378fe4a914df7f)]:
  - @graphql-mesh/types@0.95.3
  - @graphql-mesh/utils@0.95.3

## 0.95.2

### Patch Changes

- Updated dependencies
  [[`d8da4b282`](https://github.com/Urigo/graphql-mesh/commit/d8da4b282ab15ab6d0ea24c78c172e31fa1170ea)]:
  - @graphql-mesh/types@0.95.2
  - @graphql-mesh/utils@0.95.2

## 0.95.1

### Patch Changes

- [#5758](https://github.com/Urigo/graphql-mesh/pull/5758)
  [`8844268ec`](https://github.com/Urigo/graphql-mesh/commit/8844268ecfea3f7cd3f30b553581a912610bd480)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@4.2.7` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.2.7) (from
    `4.2.6`, in `dependencies`)
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

## 0.94.9

### Patch Changes

- Updated dependencies
  [[`d1310cdff`](https://github.com/Urigo/graphql-mesh/commit/d1310cdff53c53d5342e28b7c0c1af1dd25c6c75)]:
  - @graphql-mesh/utils@0.94.6
  - @graphql-mesh/types@0.94.6

## 0.94.8

### Patch Changes

- Updated dependencies
  [[`f11e9b307`](https://github.com/Urigo/graphql-mesh/commit/f11e9b307f1336d5ead9a75befdb61de963c6c5b)]:
  - @graphql-mesh/utils@0.94.5
  - @graphql-mesh/types@0.94.5

## 0.94.7

### Patch Changes

- [#5690](https://github.com/Urigo/graphql-mesh/pull/5690)
  [`238a4063f`](https://github.com/Urigo/graphql-mesh/commit/238a4063fba0bcad4ad6e7095272cf31504cbd36)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`fast-xml-parser@4.2.6` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.2.6) (from
    `4.2.5`, in `dependencies`)

- [#5691](https://github.com/Urigo/graphql-mesh/pull/5691)
  [`12a751e8e`](https://github.com/Urigo/graphql-mesh/commit/12a751e8e6b5b4cbd0d8b6018f37a1140a118198)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/cross-helpers@^0.4.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.0)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/string-interpolation@^0.5.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/string-interpolation/v/0.5.1)
    (to `dependencies`)

- [#5691](https://github.com/Urigo/graphql-mesh/pull/5691)
  [`12a751e8e`](https://github.com/Urigo/graphql-mesh/commit/12a751e8e6b5b4cbd0d8b6018f37a1140a118198)
  Thanks [@ardatan](https://github.com/ardatan)! - Better error handling and string interpolation
  for `schemaHeaders` and `operationHeaders`

- Updated dependencies
  [[`ff1678eea`](https://github.com/Urigo/graphql-mesh/commit/ff1678eeabec67edaa4991b938ef81437cd9361e)]:
  - @graphql-mesh/types@0.94.4
  - @graphql-mesh/utils@0.94.4

## 0.94.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.94.3
  - @graphql-mesh/types@0.94.3

## 0.94.5

### Patch Changes

- Updated dependencies
  [[`d0d4917f4`](https://github.com/Urigo/graphql-mesh/commit/d0d4917f405d7d6acfba62abef38909e1398ce7c)]:
  - @graphql-mesh/types@0.94.2
  - @graphql-mesh/utils@0.94.2

## 0.94.4

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.94.1
  - @graphql-mesh/utils@0.94.1

## 0.94.3

### Patch Changes

- [#5601](https://github.com/Urigo/graphql-mesh/pull/5601)
  [`cb399b206`](https://github.com/Urigo/graphql-mesh/commit/cb399b20672514f8e47b769e254e9812301d1c69)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`fast-xml-parser@4.2.5` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.2.5) (from
    `4.2.4`, in `dependencies`)

- [#5602](https://github.com/Urigo/graphql-mesh/pull/5602)
  [`98654caf9`](https://github.com/Urigo/graphql-mesh/commit/98654caf91bfcf0367cb371e5d6c4a075c25e4dd)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@4.2.5` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.2.5) (from
    `4.2.4`, in `dependencies`)

## 0.94.2

### Patch Changes

- [`98a5ccc55`](https://github.com/Urigo/graphql-mesh/commit/98a5ccc55eb68f4e45acc134573c3baa36dc6aae)
  Thanks [@ardatan](https://github.com/ardatan)! - Update packages

## 0.94.1

### Patch Changes

- [#5519](https://github.com/Urigo/graphql-mesh/pull/5519)
  [`abd90f4ee`](https://github.com/Urigo/graphql-mesh/commit/abd90f4ee26b93037c1af4bc499b3364faa3d7c8)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@4.2.4` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.2.4) (from
    `4.2.3`, in `dependencies`)

## 0.94.0

### Minor Changes

- [#5449](https://github.com/Urigo/graphql-mesh/pull/5449)
  [`ef520d91e`](https://github.com/Urigo/graphql-mesh/commit/ef520d91e6d1800ed63ef016ed74084261788371)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support and require Node 16 or
  higher

### Patch Changes

- [#5446](https://github.com/Urigo/graphql-mesh/pull/5446)
  [`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^9.2.1 || ^10.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.2.1)
    (from `^9.2.1`, in `peerDependencies`)

- [#5515](https://github.com/Urigo/graphql-mesh/pull/5515)
  [`3a3f79a9d`](https://github.com/Urigo/graphql-mesh/commit/3a3f79a9d39d2ee21e8d41e4e7a9b6585be5192a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@4.2.3` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.2.3) (from
    `4.2.2`, in `dependencies`)
- Updated dependencies
  [[`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`4296a55f4`](https://github.com/Urigo/graphql-mesh/commit/4296a55f4a6fb1c8e1701403cfe88067255ae9b7),
  [`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`01fb0cc85`](https://github.com/Urigo/graphql-mesh/commit/01fb0cc858dfbf2cd931d1b08b0749a0b82b232c),
  [`ef520d91e`](https://github.com/Urigo/graphql-mesh/commit/ef520d91e6d1800ed63ef016ed74084261788371)]:
  - @graphql-mesh/types@0.94.0
  - @graphql-mesh/utils@0.94.0

## 0.93.2

### Patch Changes

- [#5431](https://github.com/Urigo/graphql-mesh/pull/5431)
  [`2b72a06f5`](https://github.com/Urigo/graphql-mesh/commit/2b72a06f5a847f471da84942a3667395a401c2e3)
  Thanks [@devsergiy](https://github.com/devsergiy)! - Fix creating soap executor for a service with
  mutations only

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
    [`fast-xml-parser@4.2.1` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.2.1) (from
    `4.2.0`, in `dependencies`)

- [#5345](https://github.com/Urigo/graphql-mesh/pull/5345)
  [`0da46e1e6`](https://github.com/Urigo/graphql-mesh/commit/0da46e1e6de9d9f49e1a4444784689a992f4e678)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@4.2.2` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.2.2) (from
    `4.2.1`, in `dependencies`)
- Updated dependencies
  [[`cff645677`](https://github.com/Urigo/graphql-mesh/commit/cff645677c680e248ed718e5bb98ece5a41f9c0f),
  [`cff645677`](https://github.com/Urigo/graphql-mesh/commit/cff645677c680e248ed718e5bb98ece5a41f9c0f),
  [`72fe781c1`](https://github.com/Urigo/graphql-mesh/commit/72fe781c15f20ad2af792b8245aedfdcc742e048),
  [`a597261db`](https://github.com/Urigo/graphql-mesh/commit/a597261dbb4f18c47bf7323695e853950ae500df)]:
  - @graphql-mesh/types@1.0.0
  - @graphql-mesh/utils@1.0.0

## 0.4.23

### Patch Changes

- [#5322](https://github.com/Urigo/graphql-mesh/pull/5322)
  [`d54b8cf29`](https://github.com/Urigo/graphql-mesh/commit/d54b8cf29490e86988c0b68a129372557d93e7a2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@4.2.0` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.2.0) (from
    `4.1.3`, in `dependencies`)
- Updated dependencies
  [[`0d73b3f71`](https://github.com/Urigo/graphql-mesh/commit/0d73b3f71e847d751eea130df62d795c3b06a192),
  [`0d73b3f71`](https://github.com/Urigo/graphql-mesh/commit/0d73b3f71e847d751eea130df62d795c3b06a192),
  [`ed2232e71`](https://github.com/Urigo/graphql-mesh/commit/ed2232e715c1dadc3817d8b3b469f75ddbae6ac6)]:
  - @graphql-mesh/types@0.91.15
  - @graphql-mesh/utils@0.43.23

## 0.4.22

### Patch Changes

- [#5252](https://github.com/Urigo/graphql-mesh/pull/5252)
  [`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)
  Thanks [@ardatan](https://github.com/ardatan)! - Make shared packages peer dependency

- Updated dependencies
  [[`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)]:
  - @graphql-mesh/types@0.91.12
  - @graphql-mesh/utils@0.43.20

## 0.4.21

### Patch Changes

- Updated dependencies
  [[`7e7096695`](https://github.com/Urigo/graphql-mesh/commit/7e709669564fa427332b8af00bc66234485f3d54)]:
  - @graphql-mesh/types@0.91.11
  - @graphql-mesh/utils@0.43.19

## 0.4.20

### Patch Changes

- Updated dependencies
  [[`3f658a771`](https://github.com/Urigo/graphql-mesh/commit/3f658a7711cd68bc7451c1494699c5ffb8e919ce)]:
  - @graphql-mesh/utils@0.43.18
  - @graphql-mesh/types@0.91.10

## 0.4.19

### Patch Changes

- Updated dependencies
  [[`a272fdbca`](https://github.com/Urigo/graphql-mesh/commit/a272fdbca655b17119fb1dcb1c44498f387b1edc)]:
  - @graphql-mesh/types@0.91.9
  - @graphql-mesh/utils@0.43.17

## 0.4.18

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.91.8
  - @graphql-mesh/utils@0.43.16

## 0.4.17

### Patch Changes

- [#5215](https://github.com/Urigo/graphql-mesh/pull/5215)
  [`30d4c7cac`](https://github.com/Urigo/graphql-mesh/commit/30d4c7cacfd904076863808e7f82316dd791f08b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`graphql-scalars@^1.20.4` ↗︎](https://www.npmjs.com/package/graphql-scalars/v/1.20.4) (from
    `1.20.1`, in `dependencies`)

## 0.4.16

### Patch Changes

- Updated dependencies
  [[`fa2c010c1`](https://github.com/Urigo/graphql-mesh/commit/fa2c010c13f95ce401c345a1330d8fddabeebc17)]:
  - @graphql-mesh/utils@0.43.15
  - @graphql-mesh/types@0.91.7

## 0.4.15

### Patch Changes

- [#5183](https://github.com/Urigo/graphql-mesh/pull/5183)
  [`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@4.1.3` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.1.3) (from
    `4.1.2`, in `dependencies`)
- Updated dependencies
  [[`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391),
  [`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391)]:
  - @graphql-mesh/types@0.91.6
  - @graphql-mesh/utils@0.43.14

## 0.4.14

### Patch Changes

- Updated dependencies
  [[`5c19f8d6f`](https://github.com/Urigo/graphql-mesh/commit/5c19f8d6f79f2d9bfbeb6458c8dc7a1729c37db9)]:
  - @graphql-mesh/types@0.91.5
  - @graphql-mesh/utils@0.43.13

## 0.4.13

### Patch Changes

- Updated dependencies
  [[`63ab17f0b`](https://github.com/Urigo/graphql-mesh/commit/63ab17f0bd402b5a3923d752ba715f556f3beadd)]:
  - @graphql-mesh/types@0.91.4
  - @graphql-mesh/utils@0.43.12

## 0.4.12

### Patch Changes

- Updated dependencies
  [[`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e),
  [`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e)]:
  - @graphql-mesh/types@0.91.3
  - @graphql-mesh/utils@0.43.11

## 0.4.11

### Patch Changes

- Updated dependencies
  [[`989a47802`](https://github.com/Urigo/graphql-mesh/commit/989a478027b703ab969d529f09bc83071fe4f96f)]:
  - @graphql-mesh/types@0.91.2
  - @graphql-mesh/utils@0.43.10

## 0.4.10

### Patch Changes

- Updated dependencies
  [[`d694ccc1f`](https://github.com/Urigo/graphql-mesh/commit/d694ccc1f5a2cbc3ed97778a3210594005f2830b)]:
  - @graphql-mesh/utils@0.43.9
  - @graphql-mesh/types@0.91.1

## 0.4.9

### Patch Changes

- [#5091](https://github.com/Urigo/graphql-mesh/pull/5091)
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@9.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.2.1)
    (from `9.1.4`, in `dependencies`)
  - Updated dependency
    [`fast-xml-parser@4.1.2` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.1.2) (from
    `4.0.15`, in `dependencies`)
- Updated dependencies
  [[`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`7e8bb87dd`](https://github.com/Urigo/graphql-mesh/commit/7e8bb87ddf4cb1210db6873334bdd18007cc0552)]:
  - @graphql-mesh/types@0.91.0
  - @graphql-mesh/utils@0.43.8

## 0.4.8

### Patch Changes

- Updated dependencies
  [[`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72),
  [`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72),
  [`bcf29dfd0`](https://github.com/Urigo/graphql-mesh/commit/bcf29dfd02d19cf5c770b83fc627f059569a0fac)]:
  - @graphql-mesh/types@0.90.0
  - @graphql-mesh/utils@0.43.7

## 0.4.7

### Patch Changes

- [#5073](https://github.com/Urigo/graphql-mesh/pull/5073)
  [`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@4.0.15` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.0.15) (from
    `4.0.14`, in `dependencies`)
- Updated dependencies
  [[`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5),
  [`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5)]:
  - @graphql-mesh/types@0.89.5
  - @graphql-mesh/utils@0.43.6

## 0.4.6

### Patch Changes

- [#5056](https://github.com/Urigo/graphql-mesh/pull/5056)
  [`b001113f0`](https://github.com/Urigo/graphql-mesh/commit/b001113f0f99a070bc0a840b3c2472eafe8be0c9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@4.0.14` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.0.14) (from
    `4.0.13`, in `dependencies`)

## 0.4.5

### Patch Changes

- [#5048](https://github.com/Urigo/graphql-mesh/pull/5048)
  [`abe88f1a2`](https://github.com/Urigo/graphql-mesh/commit/abe88f1a2d3f08760f3460d520b88873357f9789)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`fast-xml-parser@4.0.13` ↗︎](https://www.npmjs.com/package/fast-xml-parser/v/4.0.13) (from
    `3.21.1`, in `dependencies`)

## 0.4.4

### Patch Changes

- [#5028](https://github.com/Urigo/graphql-mesh/pull/5028)
  [`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@9.1.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.4)
    (from `9.1.3`, in `dependencies`)

- [#4930](https://github.com/Urigo/graphql-mesh/pull/4930)
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Prettier fixes

- Updated dependencies
  [[`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664),
  [`d573d203f`](https://github.com/Urigo/graphql-mesh/commit/d573d203f8bb04ff75cb4d83ba0deaa2bf9818a7)]:
  - @graphql-mesh/types@0.89.4
  - @graphql-mesh/utils@0.43.5

## 0.4.3

### Patch Changes

- Updated dependencies
  [[`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9),
  [`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9)]:
  - @graphql-mesh/types@0.89.3
  - @graphql-mesh/utils@0.43.4

## 0.4.2

### Patch Changes

- Updated dependencies
  [[`deb9912e0`](https://github.com/Urigo/graphql-mesh/commit/deb9912e0bc2ae782c9570b60a7224b47af341eb)]:
  - @graphql-mesh/types@0.89.2
  - @graphql-mesh/utils@0.43.3

## 0.4.1

### Patch Changes

- Updated dependencies
  [[`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43),
  [`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43)]:
  - @graphql-mesh/types@0.89.1
  - @graphql-mesh/utils@0.43.2

## 0.4.0

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

## 0.3.0

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
    [`@graphql-tools/utils@9.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.3)
    (from `9.1.1`, in `dependencies`)
- Updated dependencies
  [[`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f),
  [`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f),
  [`1a28c92c2`](https://github.com/Urigo/graphql-mesh/commit/1a28c92c2d67b89b48581b7bb1414d1404428cdb)]:
  - @graphql-mesh/types@0.88.0
  - @graphql-mesh/utils@0.43.0

## 0.2.3

### Patch Changes

- Updated dependencies
  [[`eba73c626`](https://github.com/Urigo/graphql-mesh/commit/eba73c6261a2fdde8ece31915202203b70ff0e5f)]:
  - @graphql-mesh/utils@0.42.9
  - @graphql-mesh/types@0.87.1

## 0.2.2

### Patch Changes

- Updated dependencies
  [[`0d9771428`](https://github.com/Urigo/graphql-mesh/commit/0d97714284a6eea31c2c9420addd4a1518584924),
  [`686b3301b`](https://github.com/Urigo/graphql-mesh/commit/686b3301b2441bc095a379d95e77686b4f5ceb70)]:
  - @graphql-mesh/types@0.87.0
  - @graphql-mesh/utils@0.42.8

## 0.2.1

### Patch Changes

- [#4790](https://github.com/Urigo/graphql-mesh/pull/4790)
  [`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@9.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.0)
    (from `9.0.1`, in `dependencies`)

- [#4806](https://github.com/Urigo/graphql-mesh/pull/4806)
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`graphql-scalars@1.20.1` ↗︎](https://www.npmjs.com/package/graphql-scalars/v/1.20.1) (from
    `1.20.0`, in `dependencies`)

- [#4809](https://github.com/Urigo/graphql-mesh/pull/4809)
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@9.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.1)
    (from `9.1.0`, in `dependencies`)
- Updated dependencies
  [[`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33),
  [`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33),
  [`76deb32d1`](https://github.com/Urigo/graphql-mesh/commit/76deb32d1c036bc8da171be55582ec3f7b9c5015),
  [`baa4fbf82`](https://github.com/Urigo/graphql-mesh/commit/baa4fbf82af4a8787b9cab8c99e9177e3491ecf8),
  [`cf9c6d5e0`](https://github.com/Urigo/graphql-mesh/commit/cf9c6d5e00e41f2403bcb9ad1a6e403390ff3ec6)]:
  - @graphql-mesh/types@0.86.0
  - @graphql-mesh/utils@0.42.7

## 0.2.0

### Minor Changes

- [`c55e68381`](https://github.com/Urigo/graphql-mesh/commit/c55e683816bd5668fa9e520e6e434363a2a78425)
  Thanks [@ardatan](https://github.com/ardatan)! - _BREAKING_ - `wsdl` renamed to `source` so you
  should update your configuration file

### Patch Changes

- [#4775](https://github.com/Urigo/graphql-mesh/pull/4775)
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.0.1)
    (from `8.13.1`, in `dependencies`)
- Updated dependencies
  [[`d9c5c1195`](https://github.com/Urigo/graphql-mesh/commit/d9c5c119522a1c4cad455d62818e07a2b8f41005),
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a),
  [`85e5071d0`](https://github.com/Urigo/graphql-mesh/commit/85e5071d084d5372830213511f55f4a30a17bb33),
  [`d9c5c1195`](https://github.com/Urigo/graphql-mesh/commit/d9c5c119522a1c4cad455d62818e07a2b8f41005),
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a),
  [`85e5071d0`](https://github.com/Urigo/graphql-mesh/commit/85e5071d084d5372830213511f55f4a30a17bb33),
  [`c55e68381`](https://github.com/Urigo/graphql-mesh/commit/c55e683816bd5668fa9e520e6e434363a2a78425)]:
  - @graphql-mesh/types@0.85.7
  - @graphql-mesh/utils@0.42.6

## 0.1.2

### Patch Changes

- [#4765](https://github.com/Urigo/graphql-mesh/pull/4765)
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@8.13.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.13.1)
    (from `8.13.0`, in `dependencies`)
- Updated dependencies
  [[`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a),
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a)]:
  - @graphql-mesh/types@0.85.6
  - @graphql-mesh/utils@0.42.5

## 0.1.1

### Patch Changes

- [#4758](https://github.com/Urigo/graphql-mesh/pull/4758)
  [`6b4b83fdc`](https://github.com/Urigo/graphql-mesh/commit/6b4b83fdc3b6360de5f6fc2e26eefbff4c4173a8)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@8.13.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.13.0)
    (from `8.12.0`, in `dependencies`)
  - Updated dependency
    [`graphql-compose@9.0.10` ↗︎](https://www.npmjs.com/package/graphql-compose/v/9.0.10) (from
    `9.0.9`, in `dependencies`)
  - Updated dependency
    [`graphql-scalars@1.20.0` ↗︎](https://www.npmjs.com/package/graphql-scalars/v/1.20.0) (from
    `1.19.0`, in `dependencies`)

## 0.1.0

### Minor Changes

- [#3137](https://github.com/Urigo/graphql-mesh/pull/3137)
  [`672c62d50`](https://github.com/Urigo/graphql-mesh/commit/672c62d50526d0a076d18305be5b61dbb3018f62)
  Thanks [@ardatan](https://github.com/ardatan)! - **BREAKING** Rewrite SOAP Handler

  The generated API is completely different now because of the new handler. The new handler is based
  on the new `@omnigraph/soap` package. The fields in the generated schema now follows the XML
  structure.

### Patch Changes

- Updated dependencies
  [[`d5f2d950e`](https://github.com/Urigo/graphql-mesh/commit/d5f2d950e6318a74c062c9dbc436d5e9c0e8d59d)]:
  - @graphql-mesh/utils@0.42.4
  - @graphql-mesh/types@0.85.5
