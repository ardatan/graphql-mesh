# @graphql-mesh/types

## 0.103.21

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.103.21

## 0.103.20

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.103.20

## 0.103.19

### Patch Changes

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

- Updated dependencies []:
  - @graphql-mesh/store@0.103.19

## 0.103.18

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.103.18

## 0.103.17

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.103.17

## 0.103.16

### Patch Changes

- [#8375](https://github.com/ardatan/graphql-mesh/pull/8375)
  [`b44f8b7`](https://github.com/ardatan/graphql-mesh/commit/b44f8b7a413c8adb213b22fb8a243ca6aa06d2bd)
  Thanks [@ardatan](https://github.com/ardatan)! - More clear key-value pairs in the logs

- Updated dependencies []:
  - @graphql-mesh/store@0.103.16

## 0.103.15

### Patch Changes

- [`b5c05c4`](https://github.com/ardatan/graphql-mesh/commit/b5c05c4c5862525c76d69e8c166e71378f69bda0)
  Thanks [@ardatan](https://github.com/ardatan)! - Export again accidentially removed RedisConfig

- Updated dependencies []:
  - @graphql-mesh/store@0.103.15

## 0.103.14

### Patch Changes

- [#8260](https://github.com/ardatan/graphql-mesh/pull/8260)
  [`fc44a1e`](https://github.com/ardatan/graphql-mesh/commit/fc44a1e66c8bc8f27dc7e5e642031d17d75c0db8)
  Thanks [@ardatan](https://github.com/ardatan)! - Support Redis Sentinels -
  [See more](https://github.com/redis/ioredis?tab=readme-ov-file#sentinel)

- Updated dependencies []:
  - @graphql-mesh/store@0.103.14

## 0.103.13

### Patch Changes

- [#8362](https://github.com/ardatan/graphql-mesh/pull/8362)
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.0)
    (from `^10.6.0`, in `dependencies`)
- Updated dependencies
  [[`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)]:
  - @graphql-mesh/store@0.103.13

## 0.103.12

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

- Updated dependencies []:
  - @graphql-mesh/store@0.103.12

## 0.103.11

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

- Updated dependencies []:
  - @graphql-mesh/store@0.103.11

## 0.103.10

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.103.10

## 0.103.9

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.103.9

## 0.103.8

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.103.8

## 0.103.7

### Patch Changes

- Updated dependencies
  [[`c2349ef`](https://github.com/ardatan/graphql-mesh/commit/c2349ef8029b2e555e9dc8afc1b0ee436ba4d85e),
  [`e82d900`](https://github.com/ardatan/graphql-mesh/commit/e82d900361e539eb39afed2a328339df92551419)]:
  - @graphql-mesh/store@0.103.7

## 0.103.6

### Patch Changes

- [#8092](https://github.com/ardatan/graphql-mesh/pull/8092)
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/store@^0.103.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/store/v/0.103.5)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (to `dependencies`)
  - Added dependency [`tslib@^2.4.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.4.0) (to
    `dependencies`)
  - Removed dependency
    [`@graphql-mesh/store@^0.103.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/store/v/0.103.5)
    (from `peerDependencies`)
  - Removed dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (from `peerDependencies`)
  - Removed dependency [`tslib@^2.4.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.4.0) (from
    `peerDependencies`)
- Updated dependencies
  [[`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)]:
  - @graphql-mesh/store@0.103.6

## 0.103.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.103.5

## 0.103.4

### Patch Changes

- [`8fcfe3f`](https://github.com/ardatan/graphql-mesh/commit/8fcfe3f78a0be53e3b474231bfe7ee0594e54f91)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix compatibility between MeshPlugin and
  GatewayPlugin

- Updated dependencies []:
  - @graphql-mesh/store@0.103.4

## 0.103.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.103.3

## 0.103.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.103.2

## 0.103.1

### Patch Changes

- [#7978](https://github.com/ardatan/graphql-mesh/pull/7978)
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (from `^10.5.5`, in `peerDependencies`)
- Updated dependencies
  [[`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)]:
  - @graphql-mesh/store@0.103.1

## 0.103.0

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.103.0

## 0.102.13

### Patch Changes

- Updated dependencies
  [[`fcf18fb`](https://github.com/ardatan/graphql-mesh/commit/fcf18fb79cc5091c15d5d0fd37e7519dbd069c56)]:
  - @graphql-mesh/store@0.102.13

## 0.102.12

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.102.12

## 0.102.11

### Patch Changes

- [#7838](https://github.com/ardatan/graphql-mesh/pull/7838)
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@^9.0.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/9.0.10)
    (from `^9.0.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.28` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.28)
    (from `^10.0.27`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.102.11

## 0.102.10

### Patch Changes

- [#7828](https://github.com/ardatan/graphql-mesh/pull/7828)
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@^9.0.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/9.0.9)
    (from `^9.0.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.27` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.27)
    (from `^10.0.26`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.102.10

## 0.102.9

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.102.9

## 0.102.8

### Patch Changes

- [#7769](https://github.com/ardatan/graphql-mesh/pull/7769)
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@^9.0.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/9.0.8)
    (from `^9.0.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.26` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.26)
    (from `^10.0.23`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.102.8

## 0.102.7

### Patch Changes

- [#7781](https://github.com/ardatan/graphql-mesh/pull/7781)
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@^9.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/9.0.5)
    (from `^9.0.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.23` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.23)
    (from `^10.0.21`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.5.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.5)
    (from `^10.5.3`, in `peerDependencies`)
- Updated dependencies
  [[`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)]:
  - @graphql-mesh/store@0.102.7

## 0.102.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.102.6

## 0.102.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.102.5

## 0.102.4

### Patch Changes

- [#7576](https://github.com/ardatan/graphql-mesh/pull/7576)
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.21` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.21)
    (from `^10.0.20`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.102.4

## 0.102.3

### Patch Changes

- [#7572](https://github.com/ardatan/graphql-mesh/pull/7572)
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.20)
    (from `^10.0.19`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.102.3

## 0.102.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.102.2

## 0.102.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.102.1

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

- Updated dependencies []:
  - @graphql-mesh/store@0.102.0

## 0.101.0

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
    [`@graphql-tools/delegate@^10.0.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.19)
    (from `^10.0.18`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.5.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.3)
    (from `^10.5.2`, in `peerDependencies`)
- Updated dependencies
  [[`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6)]:
  - @graphql-mesh/store@0.101.0

## 0.100.0

### Patch Changes

- [#7477](https://github.com/ardatan/graphql-mesh/pull/7477)
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.18` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.18)
    (from `^10.0.17`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.3.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.3.4)
    (from `^10.2.3`, in `peerDependencies`)
- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c)]:
  - @graphql-mesh/store@0.100.0

## 0.99.7

### Patch Changes

- [`a1bfc49`](https://github.com/ardatan/graphql-mesh/commit/a1bfc492ac3378f22b79a51824407e776b496a84)
  Thanks [@ardatan](https://github.com/ardatan)! - Removed non-functional \`trustProxy\` option in
  the config schema This might cause a non-functional config schemna validation warning This change
  does not have any impact on the functionality of the Mesh
- Updated dependencies []:
  - @graphql-mesh/store@0.99.7

## 0.99.6

### Patch Changes

- [#7447](https://github.com/ardatan/graphql-mesh/pull/7447)
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.17)
    (from `^10.0.16`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.99.6

## 0.99.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.99.5

## 0.99.4

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.99.4

## 0.99.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.99.3

## 0.99.2

### Patch Changes

- [#7352](https://github.com/ardatan/graphql-mesh/pull/7352)
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.16)
    (from `^10.0.14`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.99.2

## 0.99.1

### Patch Changes

- [#7316](https://github.com/ardatan/graphql-mesh/pull/7316)
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.14)
    (from `^10.0.12`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.99.1

## 0.99.0

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.99.0

## 0.98.10

### Patch Changes

- [#7185](https://github.com/ardatan/graphql-mesh/pull/7185)
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@^10.0.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.12)
    (from `^10.0.11`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (from `^10.2.1`, in `peerDependencies`)

- [#7183](https://github.com/ardatan/graphql-mesh/pull/7183)
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)
  Thanks [@ardatan](https://github.com/ardatan)! - By default, Mesh does not allow extra parameters
  in the request body other than `query`, `operationName`, `extensions`, and `variables`, then
  throws 400 HTTP Error. This change adds a new option called `extraParamNames` to allow extra
  parameters in the request body.

  ```yaml
  serve:
    extraParamNames:
      - extraParam1
      - extraParam2
  ```

  ```ts
  const res = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'query { __typename }',
      extraParam1: 'value1',
      extraParam2: 'value2'
    })
  })

  console.assert(res.status === 200)
  ```

- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)]:
  - @graphql-mesh/store@0.98.10

## 0.98.9

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.98.9

## 0.98.8

### Patch Changes

- [#7118](https://github.com/ardatan/graphql-mesh/pull/7118)
  [`4c75671`](https://github.com/ardatan/graphql-mesh/commit/4c756717247eb0a8f3431e31e6c86fc97297bd32)
  Thanks [@kamilkowalski](https://github.com/kamilkowalski)! - `logger` configuration option only
  accepts a string

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `Disposable` pattern for plugins and
  transports

- Updated dependencies []:
  - @graphql-mesh/store@0.98.8

## 0.98.7

### Patch Changes

- Updated dependencies
  [[`19e90eb`](https://github.com/ardatan/graphql-mesh/commit/19e90ebc82b6636b9e89118efe672b67459514c1)]:
  - @graphql-mesh/store@0.98.7

## 0.98.6

### Patch Changes

- [#7030](https://github.com/ardatan/graphql-mesh/pull/7030)
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@^9.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/9.0.3)
    (from `^9.0.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.11)
    (from `^10.0.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.1)
    (from `^10.2.0`, in `peerDependencies`)
- Updated dependencies
  [[`e569774`](https://github.com/ardatan/graphql-mesh/commit/e569774dd6491dd64093323b751f4926cf428932),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/store@0.98.6

## 0.98.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.98.5

## 0.98.4

### Patch Changes

- [`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)
  Thanks [@ardatan](https://github.com/ardatan)! - Update GraphQL Tools packages

- Updated dependencies []:
  - @graphql-mesh/store@0.98.4

## 0.98.3

### Patch Changes

- [`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies []:
  - @graphql-mesh/store@0.98.3

## 0.98.2

### Patch Changes

- [`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/store@0.98.2

## 0.98.1

### Patch Changes

- [#6903](https://github.com/ardatan/graphql-mesh/pull/6903)
  [`6044b7f`](https://github.com/ardatan/graphql-mesh/commit/6044b7f8bd72ee3d4460d9f09f303ea6fc4e007b)
  Thanks [@ardatan](https://github.com/ardatan)! - Previously GraphQL Yoga also had a health check
  endpoint in `/health` path while Mesh's health check endpoint is `/healthcheck`. Now they are both
  aligned. Also now you can customize the health check endpoint within Mesh Configuration using
  `serve.healthCheckEndpoint` key. Default value is `/healthcheck.

  ```yaml
  serve:
    healthCheckEndpoint: /health
  ```

  **Action Required:** If you are using GraphQL Yoga's endpoint `/health`, instead of
  `/healthcheck`, you should update your health check endpoint to `/health` in the configuration
  like above to keep the behavior.

- Updated dependencies []:
  - @graphql-mesh/store@0.98.1

## 0.98.0

### Patch Changes

- [#6872](https://github.com/ardatan/graphql-mesh/pull/6872)
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@^9.0.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/9.0.2)
    (from `^9.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.6)
    (from `^10.0.0`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.98.0

## 0.97.5

### Patch Changes

- [`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)
  Thanks [@ardatan](https://github.com/ardatan)! - Ability to configure subgraphs

- Updated dependencies []:
  - @graphql-mesh/store@0.97.5

## 0.97.4

### Patch Changes

- [`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)
  Thanks [@ardatan](https://github.com/ardatan)! - Update types in Hive plugin

- Updated dependencies []:
  - @graphql-mesh/store@0.97.4

## 0.97.3

### Patch Changes

- [`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes on Prometheus plugin

- Updated dependencies []:
  - @graphql-mesh/store@0.97.3

## 0.97.2

### Patch Changes

- [`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)
  Thanks [@ardatan](https://github.com/ardatan)! - Track Fusion subgraphs

- Updated dependencies []:
  - @graphql-mesh/store@0.97.2

## 0.97.1

### Patch Changes

- [#6610](https://github.com/ardatan/graphql-mesh/pull/6610)
  [`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)
  Thanks [@ardatan](https://github.com/ardatan)! - New Plugin: Operation Headers

- Updated dependencies []:
  - @graphql-mesh/store@0.97.1

## 0.97.0

### Minor Changes

- [#6608](https://github.com/ardatan/graphql-mesh/pull/6608)
  [`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - setURL and setOptions in onFetch hook

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.97.0

## 0.96.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.96.6

## 0.96.5

### Patch Changes

- [#6553](https://github.com/ardatan/graphql-mesh/pull/6553)
  [`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Correct additional envelop plugins docs

- Updated dependencies []:
  - @graphql-mesh/store@0.96.5

## 0.96.4

### Patch Changes

- [#6505](https://github.com/ardatan/graphql-mesh/pull/6505)
  [`ae7b085`](https://github.com/ardatan/graphql-mesh/commit/ae7b085e93ba911f03bbfd2a15ff9ca8be9f4de8)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Allow to configure persisted operations
  behaviour

- Updated dependencies []:
  - @graphql-mesh/store@0.96.4

## 0.96.3

### Patch Changes

- [`ac26793`](https://github.com/ardatan/graphql-mesh/commit/ac26793e59f76f0839b61a8030e0eefc7383e640)
  Thanks [@ardatan](https://github.com/ardatan)! - `operationHeaders` in Supergraph Handler

- Updated dependencies []:
  - @graphql-mesh/store@0.96.3

## 0.96.2

### Patch Changes

- [`d758afa`](https://github.com/ardatan/graphql-mesh/commit/d758afa7da55cf3ed6b4ed9e8cccfd0ed67fe658)
  Thanks [@ardatan](https://github.com/ardatan)! - `filterDeprecatedFields` and
  `filterDeprecatedTypes` options

- [#6264](https://github.com/ardatan/graphql-mesh/pull/6264)
  [`4fac014`](https://github.com/ardatan/graphql-mesh/commit/4fac01400544bc6e8b2a4ae55f1a4dd4771bbc5c)
  Thanks [@ardatan](https://github.com/ardatan)! - Implement polling

- Updated dependencies
  [[`4fac014`](https://github.com/ardatan/graphql-mesh/commit/4fac01400544bc6e8b2a4ae55f1a4dd4771bbc5c)]:
  - @graphql-mesh/store@0.96.2

## 0.96.1

### Patch Changes

- Updated dependencies
  [[`0825974`](https://github.com/ardatan/graphql-mesh/commit/08259742cf6ef1243e1d4124e90d91af0c05d383)]:
  - @graphql-mesh/store@0.96.1

## 0.96.0

### Minor Changes

- [#6222](https://github.com/ardatan/graphql-mesh/pull/6222)
  [`5c6a8f784`](https://github.com/ardatan/graphql-mesh/commit/5c6a8f784a787641b90349e584b49de629cc41ff)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING: Drop bundles, you can use the SDL
  output from the artifacts later as a `source` of the handler

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.96.0

## 0.95.8

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.95.8

## 0.95.7

### Patch Changes

- [`a13969c77`](https://github.com/Urigo/graphql-mesh/commit/a13969c77794c44493d7a9426be7e38a6d673c88)
  Thanks [@ardatan](https://github.com/ardatan)! - Support \`deprecated\` in OpenAPI and JSON
  Schemas

- Updated dependencies []:
  - @graphql-mesh/store@0.95.7

## 0.95.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.95.6

## 0.95.5

### Patch Changes

- [`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781)
  Thanks [@ardatan](https://github.com/ardatan)! - Update types

- Updated dependencies []:
  - @graphql-mesh/store@0.95.5

## 0.95.4

### Patch Changes

- [#5963](https://github.com/Urigo/graphql-mesh/pull/5963)
  [`625e5d787`](https://github.com/Urigo/graphql-mesh/commit/625e5d7878d44abd7c9d1542bf5cdcd4e37e2411)
  Thanks [@BabakScript](https://github.com/BabakScript)! - Add lazyConnect to cache-redis

- Updated dependencies []:
  - @graphql-mesh/store@0.95.4

## 0.95.3

### Patch Changes

- [`33ae7a89a`](https://github.com/Urigo/graphql-mesh/commit/33ae7a89a13f40ebbe0a01620e378fe4a914df7f)
  Thanks [@ardatan](https://github.com/ardatan)! - Cleanup and fix SIGKILL issue

- Updated dependencies []:
  - @graphql-mesh/store@0.95.3

## 0.95.2

### Patch Changes

- [`d8da4b282`](https://github.com/Urigo/graphql-mesh/commit/d8da4b282ab15ab6d0ea24c78c172e31fa1170ea)
  Thanks [@ardatan](https://github.com/ardatan)! - New `autoSelectionSetWithDepth` option in the
  incontext sdk to avoid users to write manual selection sets if return types don't match
- Updated dependencies []:
  - @graphql-mesh/store@0.95.2

## 0.95.1

### Patch Changes

- [#5744](https://github.com/Urigo/graphql-mesh/pull/5744)
  [`7cdc69e04`](https://github.com/Urigo/graphql-mesh/commit/7cdc69e0454ab99ea5c3b8072ac28da8f81a8796)
  Thanks [@ardatan](https://github.com/ardatan)! - New Supergraph handler

- Updated dependencies []:
  - @graphql-mesh/store@0.95.1

## 0.95.0

### Minor Changes

- [#5749](https://github.com/Urigo/graphql-mesh/pull/5749)
  [`bb50c4f94`](https://github.com/Urigo/graphql-mesh/commit/bb50c4f941caa59d69186d1415dce5773596e8bc)
  Thanks [@ardatan](https://github.com/ardatan)! - `enabled` flag to enable/disable Hive Client

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.95.0

## 0.94.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.94.6

## 0.94.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.94.5

## 0.94.4

### Patch Changes

- [#5673](https://github.com/Urigo/graphql-mesh/pull/5673)
  [`ff1678eea`](https://github.com/Urigo/graphql-mesh/commit/ff1678eeabec67edaa4991b938ef81437cd9361e)
  Thanks [@ardatan](https://github.com/ardatan)! - SSL Configuration

- Updated dependencies
  [[`52673c705`](https://github.com/Urigo/graphql-mesh/commit/52673c7054a677908902e9249bc7e701923ff1b3)]:
  - @graphql-mesh/store@0.94.4

## 0.94.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.94.3

## 0.94.2

### Patch Changes

- [#5633](https://github.com/Urigo/graphql-mesh/pull/5633)
  [`d0d4917f4`](https://github.com/Urigo/graphql-mesh/commit/d0d4917f405d7d6acfba62abef38909e1398ce7c)
  Thanks [@ardatan](https://github.com/ardatan)! - Request Batching on the gateway

- Updated dependencies []:
  - @graphql-mesh/store@0.94.2

## 0.94.1

### Patch Changes

- Updated dependencies
  [[`b85a5b1d3`](https://github.com/Urigo/graphql-mesh/commit/b85a5b1d37f4d1c778c6a3527fe60e39fb8b3e94)]:
  - @graphql-mesh/store@0.94.1

## 0.94.0

### Minor Changes

- [#5342](https://github.com/Urigo/graphql-mesh/pull/5342)
  [`01fb0cc85`](https://github.com/Urigo/graphql-mesh/commit/01fb0cc858dfbf2cd931d1b08b0749a0b82b232c)
  Thanks [@cweckesser](https://github.com/cweckesser)! - The rename transform uses an ignore list to
  skip renaming certain types in a schema. It should be possible to manually enable/disable the
  usage of the exclusion list via configuration.

- [#5449](https://github.com/Urigo/graphql-mesh/pull/5449)
  [`ef520d91e`](https://github.com/Urigo/graphql-mesh/commit/ef520d91e6d1800ed63ef016ed74084261788371)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support and require Node 16 or
  higher

### Patch Changes

- [#5446](https://github.com/Urigo/graphql-mesh/pull/5446)
  [`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@^9.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/9.0.0)
    (from `^8.4.25`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.0)
    (from `^9.0.32`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^9.2.1 || ^10.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.2.1)
    (from `^9.2.1`, in `peerDependencies`)
- Updated dependencies
  [[`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`ef520d91e`](https://github.com/Urigo/graphql-mesh/commit/ef520d91e6d1800ed63ef016ed74084261788371)]:
  - @graphql-mesh/store@0.94.0

## 0.93.2

### Patch Changes

- [#5370](https://github.com/Urigo/graphql-mesh/pull/5370)
  [`f17c6c8b6`](https://github.com/Urigo/graphql-mesh/commit/f17c6c8b6d47328ad0727079b1be2b685553830c)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on HTTP2 plugin

## 0.93.1

### Patch Changes

- [#5365](https://github.com/Urigo/graphql-mesh/pull/5365)
  [`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/store@^0.93.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/store/v/0.93.0)
    (from `^1.0.0`, in `peerDependencies`)
- Updated dependencies
  [[`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8)]:
  - @graphql-mesh/store@0.93.1

## 1.0.0

### Minor Changes

- [#5337](https://github.com/Urigo/graphql-mesh/pull/5337)
  [`a597261db`](https://github.com/Urigo/graphql-mesh/commit/a597261dbb4f18c47bf7323695e853950ae500df)
  Thanks [@cweckesser](https://github.com/cweckesser)! - If a schema defines root types which names
  are not the standard/expected ones ("Query", "Mutation" and "Subscription") when using the
  encapsulation transform, the encapsulation will not succeed. The proposed solution is to allow
  parameterizing the root type names, for the cases where they don't follow the standard/expected
  ones. The new parameters are optional and have default values (the "standard" values).

### Patch Changes

- [#5340](https://github.com/Urigo/graphql-mesh/pull/5340)
  [`cff645677`](https://github.com/Urigo/graphql-mesh/commit/cff645677c680e248ed718e5bb98ece5a41f9c0f)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.32` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.32)
    (from `9.0.31`, in `dependencies`)

- [#5356](https://github.com/Urigo/graphql-mesh/pull/5356)
  [`72fe781c1`](https://github.com/Urigo/graphql-mesh/commit/72fe781c15f20ad2af792b8245aedfdcc742e048)
  Thanks [@ardatan](https://github.com/ardatan)! - Rearrange dependencies

- Updated dependencies []:
  - @graphql-mesh/store@1.0.0

## 0.91.15

### Patch Changes

- [#5328](https://github.com/Urigo/graphql-mesh/pull/5328)
  [`0d73b3f71`](https://github.com/Urigo/graphql-mesh/commit/0d73b3f71e847d751eea130df62d795c3b06a192)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.25` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.25)
    (from `8.4.24`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.31` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.31)
    (from `9.0.30`, in `dependencies`)

- [#5333](https://github.com/Urigo/graphql-mesh/pull/5333)
  [`ed2232e71`](https://github.com/Urigo/graphql-mesh/commit/ed2232e715c1dadc3817d8b3b469f75ddbae6ac6)
  Thanks [@ardatan](https://github.com/ardatan)! - New Serialize Headers plugin

## 0.91.14

### Patch Changes

- [#5291](https://github.com/Urigo/graphql-mesh/pull/5291)
  [`20de686dc`](https://github.com/Urigo/graphql-mesh/commit/20de686dcd414112c841cd2c11b1567b82bee134)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.23` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.23)
    (from `8.4.22`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.29` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.29)
    (from `9.0.28`, in `dependencies`)

- [#5301](https://github.com/Urigo/graphql-mesh/pull/5301)
  [`3926ac41a`](https://github.com/Urigo/graphql-mesh/commit/3926ac41ac3405ea352b5a945d33770c5bf5d3c2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.24` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.24)
    (from `8.4.23`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.30` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.30)
    (from `9.0.29`, in `dependencies`)

## 0.91.13

### Patch Changes

- [#5266](https://github.com/Urigo/graphql-mesh/pull/5266)
  [`870de5dae`](https://github.com/Urigo/graphql-mesh/commit/870de5dae08a7e43d9aa0f52d5d504cffb4d8fc8)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.22` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.22)
    (from `8.4.21`, in `dependencies`)

- [#3915](https://github.com/Urigo/graphql-mesh/pull/3915)
  [`aea134764`](https://github.com/Urigo/graphql-mesh/commit/aea1347645c322437ed6ccfadabcfc23065bc9c8)
  Thanks [@MarkLyck](https://github.com/MarkLyck)! - add contextOptions to allow customization of
  jwt claims

- [#5261](https://github.com/Urigo/graphql-mesh/pull/5261)
  [`a1e08193b`](https://github.com/Urigo/graphql-mesh/commit/a1e08193be3ac8cab5f6f8c84025f934134369b6)
  Thanks [@ardatan](https://github.com/ardatan)! - `timeout` option for HTTP requests

## 0.91.12

### Patch Changes

- [#5252](https://github.com/Urigo/graphql-mesh/pull/5252)
  [`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)
  Thanks [@ardatan](https://github.com/ardatan)! - Make shared packages peer dependency

- Updated dependencies
  [[`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)]:
  - @graphql-mesh/store@0.9.20

## 0.91.11

### Patch Changes

- [#5192](https://github.com/Urigo/graphql-mesh/pull/5192)
  [`7e7096695`](https://github.com/Urigo/graphql-mesh/commit/7e709669564fa427332b8af00bc66234485f3d54)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-typed-document-node/core@3.2.0` ↗︎](https://www.npmjs.com/package/@graphql-typed-document-node/core/v/3.2.0)
    (from `3.1.2`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.9.19

## 0.91.10

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.9.18

## 0.91.9

### Patch Changes

- [#5220](https://github.com/Urigo/graphql-mesh/pull/5220)
  [`a272fdbca`](https://github.com/Urigo/graphql-mesh/commit/a272fdbca655b17119fb1dcb1c44498f387b1edc)
  Thanks [@ardatan](https://github.com/ardatan)! - Conditional pattern based caching

- Updated dependencies []:
  - @graphql-mesh/store@0.9.17

## 0.91.8

### Patch Changes

- Updated dependencies
  [[`b86d420d4`](https://github.com/Urigo/graphql-mesh/commit/b86d420d4fdf1132f3485c35087aaecbce45a728)]:
  - @graphql-mesh/store@0.9.16

## 0.91.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.9.15

## 0.91.6

### Patch Changes

- [#5183](https://github.com/Urigo/graphql-mesh/pull/5183)
  [`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.21` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.21)
    (from `8.4.20`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.28` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.28)
    (from `9.0.27`, in `dependencies`)
  - Updated dependency
    [`@graphql-typed-document-node/core@3.1.2` ↗︎](https://www.npmjs.com/package/@graphql-typed-document-node/core/v/3.1.2)
    (from `3.1.1`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.9.14

## 0.91.5

### Patch Changes

- [#5153](https://github.com/Urigo/graphql-mesh/pull/5153)
  [`5c19f8d6f`](https://github.com/Urigo/graphql-mesh/commit/5c19f8d6f79f2d9bfbeb6458c8dc7a1729c37db9)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix `createBuiltMeshHTTPHandler`'s context
  generic

- Updated dependencies []:
  - @graphql-mesh/store@0.9.13

## 0.91.4

### Patch Changes

- [#5145](https://github.com/Urigo/graphql-mesh/pull/5145)
  [`63ab17f0b`](https://github.com/Urigo/graphql-mesh/commit/63ab17f0bd402b5a3923d752ba715f556f3beadd)
  Thanks [@madorb](https://github.com/madorb)! - `fetchRequestHeaders`, `fetchResponseHeaders`,
  `httpRequestHeaders` and `httpResponseHeaders`

- Updated dependencies []:
  - @graphql-mesh/store@0.9.12

## 0.91.3

### Patch Changes

- [#5135](https://github.com/Urigo/graphql-mesh/pull/5135)
  [`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.20)
    (from `8.4.19`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.27` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.27)
    (from `9.0.26`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.9.11

## 0.91.2

### Patch Changes

- [`989a47802`](https://github.com/Urigo/graphql-mesh/commit/989a478027b703ab969d529f09bc83071fe4f96f)
  Thanks [@ardatan](https://github.com/ardatan)! - Options for self hosting

- Updated dependencies []:
  - @graphql-mesh/store@0.9.10

## 0.91.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.9.9

## 0.91.0

### Minor Changes

- [`7e8bb87dd`](https://github.com/Urigo/graphql-mesh/commit/7e8bb87ddf4cb1210db6873334bdd18007cc0552)
  Thanks [@ardatan](https://github.com/ardatan)! - Allow users to change the version of the
  federation spec

### Patch Changes

- [#5091](https://github.com/Urigo/graphql-mesh/pull/5091)
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.19)
    (from `8.4.17`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.26` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.26)
    (from `9.0.24`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@9.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.2.1)
    (from `9.1.4`, in `dependencies`)
- Updated dependencies
  [[`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e)]:
  - @graphql-mesh/store@0.9.8

## 0.90.0

### Minor Changes

- [`bcf29dfd0`](https://github.com/Urigo/graphql-mesh/commit/bcf29dfd02d19cf5c770b83fc627f059569a0fac)
  Thanks [@ardatan](https://github.com/ardatan)! - Now you can customize the names of the metrics

### Patch Changes

- [#5087](https://github.com/Urigo/graphql-mesh/pull/5087)
  [`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.17)
    (from `8.4.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.24` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.24)
    (from `9.0.23`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.9.7

## 0.89.5

### Patch Changes

- [#5073](https://github.com/Urigo/graphql-mesh/pull/5073)
  [`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.16)
    (from `8.4.15`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.23` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.23)
    (from `9.0.22`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.9.6

## 0.89.4

### Patch Changes

- [#5028](https://github.com/Urigo/graphql-mesh/pull/5028)
  [`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.15` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.15)
    (from `8.4.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.22` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.22)
    (from `9.0.21`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@9.1.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.4)
    (from `9.1.3`, in `dependencies`)

- [#4930](https://github.com/Urigo/graphql-mesh/pull/4930)
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Prettier fixes

- Updated dependencies
  [[`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664)]:
  - @graphql-mesh/store@0.9.5

## 0.89.3

### Patch Changes

- [#4963](https://github.com/Urigo/graphql-mesh/pull/4963)
  [`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.14)
    (from `8.4.13`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.21` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.21)
    (from `9.0.20`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.9.4

## 0.89.2

### Patch Changes

- [#4910](https://github.com/Urigo/graphql-mesh/pull/4910)
  [`deb9912e0`](https://github.com/Urigo/graphql-mesh/commit/deb9912e0bc2ae782c9570b60a7224b47af341eb)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes for ESM

- Updated dependencies []:
  - @graphql-mesh/store@0.9.3

## 0.89.1

### Patch Changes

- [#4906](https://github.com/Urigo/graphql-mesh/pull/4906)
  [`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.13)
    (from `8.4.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.20)
    (from `9.0.19`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.9.2

## 0.89.0

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

- Updated dependencies []:
  - @graphql-mesh/store@0.9.1

## 0.88.0

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
    [`@graphql-tools/batch-delegate@8.4.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.12)
    (from `8.4.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.19)
    (from `9.0.17`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@9.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.3)
    (from `9.1.1`, in `dependencies`)
- Updated dependencies
  [[`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f),
  [`1a28c92c2`](https://github.com/Urigo/graphql-mesh/commit/1a28c92c2d67b89b48581b7bb1414d1404428cdb)]:
  - @graphql-mesh/store@0.9.0

## 0.87.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.8.65

## 0.87.0

### Minor Changes

- [`686b3301b`](https://github.com/Urigo/graphql-mesh/commit/686b3301b2441bc095a379d95e77686b4f5ceb70)
  Thanks [@ardatan](https://github.com/ardatan)! - **BREAKING** - Drop `customServerHandler`

### Patch Changes

- [#4854](https://github.com/Urigo/graphql-mesh/pull/4854)
  [`0d9771428`](https://github.com/Urigo/graphql-mesh/commit/0d97714284a6eea31c2c9420addd4a1518584924)
  Thanks [@ardatan](https://github.com/ardatan)! - New GraphQL Hive plugin

- Updated dependencies []:
  - @graphql-mesh/store@0.8.64

## 0.86.0

### Minor Changes

- [#4789](https://github.com/Urigo/graphql-mesh/pull/4789)
  [`76deb32d1`](https://github.com/Urigo/graphql-mesh/commit/76deb32d1c036bc8da171be55582ec3f7b9c5015)
  Thanks [@ardatan](https://github.com/ardatan)! - _BREAKING_ - Local schemas, SDLs and
  introspections are now provided as `source` instead of `introspection` or `schema`. See the docs
  for more information.

### Patch Changes

- [#4790](https://github.com/Urigo/graphql-mesh/pull/4790)
  [`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.8)
    (from `8.4.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.15` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.15)
    (from `9.0.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@9.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.0)
    (from `9.0.1`, in `dependencies`)

- [#4806](https://github.com/Urigo/graphql-mesh/pull/4806)
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.9)
    (from `8.4.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.16)
    (from `9.0.15`, in `dependencies`)

- [#4809](https://github.com/Urigo/graphql-mesh/pull/4809)
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.10)
    (from `8.4.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.17)
    (from `9.0.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@9.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.1)
    (from `9.1.0`, in `dependencies`)

- [#4777](https://github.com/Urigo/graphql-mesh/pull/4777)
  [`baa4fbf82`](https://github.com/Urigo/graphql-mesh/commit/baa4fbf82af4a8787b9cab8c99e9177e3491ecf8)
  Thanks [@dr3](https://github.com/dr3)! - Allow pascal-cased `Query` and `Mutation` values for
  `selectQueryOrMutationField`

- Updated dependencies
  [[`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33)]:
  - @graphql-mesh/store@0.8.63

## 0.85.7

### Patch Changes

- [#4773](https://github.com/Urigo/graphql-mesh/pull/4773)
  [`d9c5c1195`](https://github.com/Urigo/graphql-mesh/commit/d9c5c119522a1c4cad455d62818e07a2b8f41005)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.5)
    (from `8.4.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.12)
    (from `9.0.10`, in `dependencies`)

- [#4775](https://github.com/Urigo/graphql-mesh/pull/4775)
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.0.1)
    (from `8.13.1`, in `dependencies`)

- [#4779](https://github.com/Urigo/graphql-mesh/pull/4779)
  [`85e5071d0`](https://github.com/Urigo/graphql-mesh/commit/85e5071d084d5372830213511f55f4a30a17bb33)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.7)
    (from `8.4.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.14)
    (from `9.0.12`, in `dependencies`)

- [`c55e68381`](https://github.com/Urigo/graphql-mesh/commit/c55e683816bd5668fa9e520e6e434363a2a78425)
  Thanks [@ardatan](https://github.com/ardatan)! - _BREAKING_ - `wsdl` renamed to `source` so you
  should update your configuration file

- Updated dependencies
  [[`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a)]:
  - @graphql-mesh/store@0.8.62

## 0.85.6

### Patch Changes

- [#4765](https://github.com/Urigo/graphql-mesh/pull/4765)
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.3)
    (from `8.4.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.10)
    (from `9.0.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.13.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.13.1)
    (from `8.13.0`, in `dependencies`)
- Updated dependencies
  [[`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a)]:
  - @graphql-mesh/store@0.8.61

## 0.85.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.8.60

## 0.85.4

### Patch Changes

- [#4745](https://github.com/Urigo/graphql-mesh/pull/4745)
  [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.2)
    (from `8.4.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.9)
    (from `9.0.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.13.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.13.0)
    (from `8.12.0`, in `dependencies`)
- Updated dependencies
  [[`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd)]:
  - @graphql-mesh/store@0.8.59

## 0.85.3

### Patch Changes

- [#4732](https://github.com/Urigo/graphql-mesh/pull/4732)
  [`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/store@0.8.57` ↗︎](https://www.npmjs.com/package/@graphql-mesh/store/v/0.8.57)
    (from `0.8.56`, in `dependencies`)
- Updated dependencies
  [[`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56)]:
  - @graphql-mesh/store@0.8.58

## 0.85.2

### Patch Changes

- [`09c286994`](https://github.com/Urigo/graphql-mesh/commit/09c28699441cda92f79e4e9b8464e7be5f46a786)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix on handling envelop plugins

- Updated dependencies []:
  - @graphql-mesh/store@0.8.57

## 0.85.1

### Patch Changes

- [`398af2bf6`](https://github.com/Urigo/graphql-mesh/commit/398af2bf602182ca315bc8d99d2237ad1a16ee48)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix a bug causing the plugin is registered twice
  with onPluginInit's addPlugin

- Updated dependencies []:
  - @graphql-mesh/store@0.8.56

## 0.85.0

### Minor Changes

- [`814f2d516`](https://github.com/Urigo/graphql-mesh/commit/814f2d51692df593fcf368765e9c8a0ce99f46bd)
  Thanks [@ardatan](https://github.com/ardatan)! - Add `endpoint` option to expose it via HTTP
  server

### Patch Changes

- [`6fb57d3ba`](https://github.com/Urigo/graphql-mesh/commit/6fb57d3ba6ce68e47d9f5dbf54e57d178441fa18)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes

- Updated dependencies []:
  - @graphql-mesh/store@0.8.55

## 0.84.10

### Patch Changes

- [#4646](https://github.com/Urigo/graphql-mesh/pull/4646)
  [`637e9e9d8`](https://github.com/Urigo/graphql-mesh/commit/637e9e9d8a702cf28cde48137a0f73bab7628f6d)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes for Federation 2 support

- Updated dependencies []:
  - @graphql-mesh/store@0.8.54

## 0.84.9

### Patch Changes

- [#4638](https://github.com/Urigo/graphql-mesh/pull/4638)
  [`dd831a7d1`](https://github.com/Urigo/graphql-mesh/commit/dd831a7d1256400d1b7441cfb99b517cf856ce5b)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Snapshot transform in favor of Snapshot
  plugin

- Updated dependencies []:
  - @graphql-mesh/store@0.8.53

## 0.84.8

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.8.52

## 0.84.7

### Patch Changes

- [#4604](https://github.com/Urigo/graphql-mesh/pull/4604)
  [`ffb301435`](https://github.com/Urigo/graphql-mesh/commit/ffb3014353c17d23a03cf8001eba606c85c2043f)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.1)
    (from `8.3.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.8)
    (from `9.0.6`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.8.51

## 0.84.6

### Patch Changes

- [#4605](https://github.com/Urigo/graphql-mesh/pull/4605)
  [`31a64714a`](https://github.com/Urigo/graphql-mesh/commit/31a64714a3e47dc41b950b3e1cfd1a49e7ff2d8a)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-delegate@8.4.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.4.1)
    (from `8.3.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.8)
    (from `9.0.6`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/store@0.8.50

## 0.84.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.8.49

## 0.84.4

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.8.48

## 0.84.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.8.47

## 0.84.2

### Patch Changes

- [`ff251e4c7`](https://github.com/Urigo/graphql-mesh/commit/ff251e4c7654306d3030774447c991788768e148)
  Thanks [@ardatan](https://github.com/ardatan)! - See the new configuration schema for the new
  options

- Updated dependencies []:
  - @graphql-mesh/store@0.8.46

## 0.84.1

### Patch Changes

- Updated dependencies
  [[`b444a9c1c`](https://github.com/Urigo/graphql-mesh/commit/b444a9c1c5a48962f76e111b9121124847ea9db6)]:
  - @graphql-mesh/store@0.8.45

## 0.84.0

### Minor Changes

- [#4498](https://github.com/Urigo/graphql-mesh/pull/4498)
  [`ee1cb6f76`](https://github.com/Urigo/graphql-mesh/commit/ee1cb6f7620f71fd824e69f4171cfef6c5d51794)
  Thanks [@santino](https://github.com/santino)! - Introduce 'bare' mode on naming-convention
  transform

### Patch Changes

- [#4499](https://github.com/Urigo/graphql-mesh/pull/4499)
  [`077e65c18`](https://github.com/Urigo/graphql-mesh/commit/077e65c1857aaefa2689f33decc9e72ded281c94)
  Thanks [@ardatan](https://github.com/ardatan)! - New Operation Field Permissions plugin

- Updated dependencies []:
  - @graphql-mesh/store@0.8.44

## 0.83.5

### Patch Changes

- Updated dependencies
  [[`add1020c9`](https://github.com/Urigo/graphql-mesh/commit/add1020c903fc47850054165968ee602fe2b3cc5)]:
  - @graphql-mesh/store@0.8.43

## 0.83.4

### Patch Changes

- [#4439](https://github.com/Urigo/graphql-mesh/pull/4439)
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.9)
    (from `8.3.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/store@0.8.41` ↗︎](https://www.npmjs.com/package/@graphql-mesh/store/v/0.8.41)
    (from `0.8.35`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.6)
    (from `9.0.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.12.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.12.0)
    (from `8.10.1`, in `dependencies`)

- Updated dependencies
  [[`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2)]:
  - @graphql-mesh/store@0.8.42

## 0.83.3

### Patch Changes

- [#4466](https://github.com/Urigo/graphql-mesh/pull/4466)
  [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.9)
    (from `8.3.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.6)
    (from `9.0.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.12.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.12.0)
    (from `8.11.0`, in `dependencies`)

- Updated dependencies
  [[`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f)]:
  - @graphql-mesh/store@0.8.41

## 0.83.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.8.40

## 0.83.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.8.39

## 0.83.0

### Minor Changes

- [`44b868196`](https://github.com/Urigo/graphql-mesh/commit/44b86819695a298e60b1d7b6c54ae2772e8f1588)
  Thanks [@ardatan](https://github.com/ardatan)! - Use In Context SDK for wrapping resolvers for
  better tracing

### Patch Changes

- [#4451](https://github.com/Urigo/graphql-mesh/pull/4451)
  [`a56ebcec5`](https://github.com/Urigo/graphql-mesh/commit/a56ebcec503402fbdb3d4e3561fd2e38e4dd5c43)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix TypeScript typings for additional scalars;

  For example;

  - `BigInt` should be `bigint`
  - `PositiveInt` should be `int`
  - `File` should be `File`
  - `NonEmptyString` should be `string`
  - `DateTime` should be `Date`

- [`24afabece`](https://github.com/Urigo/graphql-mesh/commit/24afabece51aee171f902776d3f59b4a17026c49)
  Thanks [@ardatan](https://github.com/ardatan)! - Enable Automatic Type Merging by default

- Updated dependencies []:
  - @graphql-mesh/store@0.8.38

## 0.82.3

### Patch Changes

- [#4443](https://github.com/Urigo/graphql-mesh/pull/4443)
  [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.8)
    (from `8.3.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.5)
    (from `9.0.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.11.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.11.0)
    (from `8.10.1`, in `dependencies`)

- Updated dependencies
  [[`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53)]:
  - @graphql-mesh/store@0.8.37

## 0.82.2

### Patch Changes

- [#4440](https://github.com/Urigo/graphql-mesh/pull/4440)
  [`b9bb80094`](https://github.com/Urigo/graphql-mesh/commit/b9bb8009407d27440267a5e9a7ec5dbfecc9bf8f)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump graphql-compose to fix incompatibility
  issues with non Node.js environments

- Updated dependencies []:
  - @graphql-mesh/store@0.8.36

## 0.82.1

### Patch Changes

- [#4422](https://github.com/Urigo/graphql-mesh/pull/4422)
  [`3165827f7`](https://github.com/Urigo/graphql-mesh/commit/3165827f74b48a914b9604b024cd1318c211aa14)
  Thanks [@ardatan](https://github.com/ardatan)! - 🚀🚀🚀 **New StatsD plugin** 🚀🚀🚀

  You can learn more about tracing and monitoring in GraphQL with different plugins (StatsD,
  Prometheus, NewRelic and more) in our documentation.
  [Tracing and Monitoring in GraphQL Mesh](http://www.graphql-mesh.com/docs/guides/monitoring-and-tracing)

- Updated dependencies []:
  - @graphql-mesh/store@0.8.35

## 0.82.0

### Minor Changes

- [#4411](https://github.com/Urigo/graphql-mesh/pull/4411)
  [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9)
  Thanks [@ardatan](https://github.com/ardatan)! - New Prometheus Plugin

- [#4411](https://github.com/Urigo/graphql-mesh/pull/4411)
  [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9)
  Thanks [@ardatan](https://github.com/ardatan)! - Plugin factories now can return promises

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.8.34

## 0.81.0

### Minor Changes

- [#4396](https://github.com/Urigo/graphql-mesh/pull/4396)
  [`df37c40f4`](https://github.com/Urigo/graphql-mesh/commit/df37c40f47c6c53949f5d5f71e062c09fe5e1bd0)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop webhook plugin and automatically handle
  webhooks. See the documentation for more information

- [#4404](https://github.com/Urigo/graphql-mesh/pull/4404)
  [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f)
  Thanks [@ardatan](https://github.com/ardatan)! - New `onFetch` hook!

- [#4398](https://github.com/Urigo/graphql-mesh/pull/4398)
  [`7a4023a2c`](https://github.com/Urigo/graphql-mesh/commit/7a4023a2cac2dacc8e78e10dabee65427b9a5e54)
  Thanks [@ardatan](https://github.com/ardatan)! - Newrelic Plugin

- [#4409](https://github.com/Urigo/graphql-mesh/pull/4409)
  [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f)
  Thanks [@ardatan](https://github.com/ardatan)! - New onDelegate hook

### Patch Changes

- [#4380](https://github.com/Urigo/graphql-mesh/pull/4380)
  [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.4)
    (from `9.0.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.1)
    (from `8.10.0`, in `dependencies`)

- [#4389](https://github.com/Urigo/graphql-mesh/pull/4389)
  [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.4)
    (from `9.0.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.1)
    (from `8.10.0`, in `dependencies`)

- [#4409](https://github.com/Urigo/graphql-mesh/pull/4409)
  [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-tools/batch-delegate@8.3.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.7)
    (to `dependencies`)

- Updated dependencies
  [[`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd),
  [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f)]:
  - @graphql-mesh/store@0.8.33

## 0.80.2

### Patch Changes

- [#4357](https://github.com/Urigo/graphql-mesh/pull/4357)
  [`be79b20a5`](https://github.com/Urigo/graphql-mesh/commit/be79b20a59b14d5d79bfeb260e4ecabc58c26efb)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - ## Breaking changes

  OpenAPI has been completely rewritten based on JSON Schema handler from scratch. It's now more
  stable and supports more features. However, it produces different output and takes different
  configuration options.

  Please check the migration guide to learn how to migrate your existing OpenAPI handler
  configuration.
  [Migration Guide from 0.31 to 0.32](https://www.graphql-mesh.com/docs/migration/openapi-0.31-0.32)

  This rewrite has been done under `@graphql-mesh/new-openapi` name so far, and you can check its
  changelog to see the progress.
  [`@graphql-mesh/new-openapi`'s `CHANGELOG`](https://github.com/Urigo/graphql-mesh/blob/99b5691e216b1ae7f46c3db1b3e91345e5351df8/packages/handlers/new-openapi/CHANGELOG.md)

- Updated dependencies []:
  - @graphql-mesh/store@0.8.32

## 0.80.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.8.31

## 0.80.0

### Minor Changes

- [#4327](https://github.com/Urigo/graphql-mesh/pull/4327)
  [`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - ## BREAKING CHANGES
  - Named types are no longer deduplicated automatically, so this might introduce new types on your
    side. Also the types with unknown content are always reflected as "JSON"/"Any" scalar type
  - `noDeduplicate` option has been dropped, because it is no longer needed.

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/store@0.8.30

## 0.79.0

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

- Updated dependencies []:
  - @graphql-mesh/store@0.8.29

## 0.78.8

### Patch Changes

- [#4275](https://github.com/Urigo/graphql-mesh/pull/4275)
  [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.1)
    (was `9.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.0)
    (was `8.9.1`, in `dependencies`)

* [#4298](https://github.com/Urigo/graphql-mesh/pull/4298)
  [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.3)
    (was `9.0.1`, in `dependencies`)

* Updated dependencies
  [[`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2)]:
  - @graphql-mesh/store@0.8.28

## 0.78.7

### Patch Changes

- [#4263](https://github.com/Urigo/graphql-mesh/pull/4263)
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@9.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.0)
    (was `8.8.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@8.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.9.1)
    (was `8.9.0`, in `dependencies`)

* [#4263](https://github.com/Urigo/graphql-mesh/pull/4263)
  [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)
  Thanks [@renovate](https://github.com/apps/renovate)! - Mock Transform has been deprecated in
  favor of Mock plugin.

* Updated dependencies
  [[`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)]:
  - @graphql-mesh/store@0.8.27

## 0.78.6

### Patch Changes

- [#4216](https://github.com/Urigo/graphql-mesh/pull/4216)
  [`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b)
  Thanks [@ardatan](https://github.com/ardatan)! - Rewrite JSON Schema visitor and support circular
  dependencies in a better way

  Now `visitJSONSchema` takes two different visitor functions instead of `enter` and `leave`,
  previously we used to handle only `leave`.

  Also `generateInterfaceFromSharedFields` has been dropped for now because it wasn't working as
  expected.

- Updated dependencies []:
  - @graphql-mesh/store@0.8.26

## 0.78.5

### Patch Changes

- c88a34d82: Now you can configure JSON Schema handler how to stringify query parameters;

  ```yaml
  queryStringOptions:
    indices: false
    arrayFormat: brackets
  ```

  Check out the configuration schema to see the options;
  https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/json-schema/yaml-config.graphql#L25

  - @graphql-mesh/store@0.8.25

## 0.78.4

### Patch Changes

- @graphql-mesh/store@0.8.24

## 0.78.3

### Patch Changes

- 738e2f378: Do not visit union elements if links or exposeResponseMetadata is not used during
  schema generation
  - @graphql-mesh/store@0.8.23

## 0.78.2

### Patch Changes

- a2ef35c35: ** Use the new `@whatwg-node/fetch` package instead of `cross-undici-fetch`**

  `cross-undici-fetch` has been renamed to `@whatwg-node-fetch`. Now Mesh uses this new package.

  ** BREAKING: Drop `serve.handlers` in favor of the new plugin system **

  Now Mesh uses the new plugin system of GraphQL Yoga that uses WHATWG Fetch API instead of Node
  specific `serve.handlers`. That means you can use those plugins with any environment even if you
  are not using Node.js with `mesh start`.

  Please check our docs to see how you can migrate to the new usage.
  https://www.graphql-mesh.com/docs/guides/subscriptions-webhooks#handle-webhook-http-requests

  - @graphql-mesh/store@0.8.22

## 0.78.1

### Patch Changes

- Updated dependencies [2e89d814b]
  - @graphql-mesh/store@0.8.21

## 0.78.0

### Minor Changes

- bcd9355ee: Breaking change in merger API;

  Before a merger should return a `GraphQLSchema`, not it needs to return `SubschemaConfig` from
  `@graphql-tools/delegate` package. The idea is to prevent the schema from being wrap to reduce the
  execution complexity. Now if merger returns an executor, it will be used directly as an executor
  inside Envelop's pipeline. Also it can return `transforms` which will be applied during execution
  while schema transforms are applied on build time without any modification in the resolvers.

  If there are some root transforms, those are applied together with the source transforms on the
  execution level in case of a single source.

### Patch Changes

- @graphql-mesh/store@0.8.20

## 0.77.1

### Patch Changes

- 66f5d0189: **New `credentials` configuration option**

  Previously it wasn't possible to configure `credentials` of outgoing `Request` object passed to
  `fetch`. And the default behavior was `same-origin`. Now it is possible to configure it and you
  can also remove it completely for the environments (e.g. CF Workers) to avoid errors like
  `'credentials' hasn't been implemented yet` etc.

  ```yaml
  graphql:
    endpoint: ...
    credentials: disable
  ```

  - @graphql-mesh/store@0.8.19

## 0.77.0

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

- 12e1e5d72: New Rate Limit plugin
  - @graphql-mesh/store@0.8.18

## 0.76.0

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

- @graphql-mesh/store@0.8.17

## 0.75.0

### Minor Changes

- d4754ad08: Response Cache Plugin

### Patch Changes

- 2df026e90: issue: https://github.com/Urigo/graphql-mesh/issues/3425 grpc: add prefix for query
  method
  - @graphql-mesh/store@0.8.16

## 0.74.2

### Patch Changes

- ed9ba7f48: Small improvements for relaxing event loop
  - @graphql-mesh/store@0.8.15

## 0.74.1

### Patch Changes

- @graphql-mesh/store@0.8.14

## 0.74.0

### Minor Changes

- 13b9b30f7: Add interpolation strings to the generated MeshContext type

### Patch Changes

- @graphql-mesh/store@0.8.13

## 0.73.3

### Patch Changes

- @graphql-mesh/store@0.8.12

## 0.73.2

### Patch Changes

- @graphql-mesh/store@0.8.11

## 0.73.1

### Patch Changes

- @graphql-mesh/store@0.8.10

## 0.73.0

### Minor Changes

- 19a99c055: feat(cli/serve): Now you can configure proxy handling settings
- 974e703e2: Generate more readable code and cleanup the artifacts

  No more export `documentsInSDL`, use `documents` array instead coming from `MeshInstance` No more
  export `rawConfig` but instead `rawServeConfig` to expose `ServeConfig`

- 893d526ab: POC: Mesh Declarative Plugin System

### Patch Changes

- 974e703e2: Cleanup dependencies
- Updated dependencies [974e703e2]
  - @graphql-mesh/store@0.8.9

## 0.72.5

### Patch Changes

- @graphql-mesh/store@0.8.8

## 0.72.4

### Patch Changes

- @graphql-mesh/store@0.8.7

## 0.72.3

### Patch Changes

- @graphql-mesh/store@0.8.6

## 0.72.2

### Patch Changes

- Updated dependencies [66b9b3ddc]
  - @graphql-mesh/store@0.8.5

## 0.72.1

### Patch Changes

- @graphql-mesh/store@0.8.4

## 0.72.0

### Minor Changes

- fa2542468: Use Localforage by default and drop inmemory-lru

### Patch Changes

- @graphql-mesh/store@0.8.3

## 0.71.4

### Patch Changes

- @graphql-mesh/store@0.8.2

## 0.71.3

### Patch Changes

- @graphql-mesh/store@0.8.1

## 0.71.2

### Patch Changes

- Updated dependencies [8c8b304e5]
  - @graphql-mesh/store@0.8.0

## 0.71.1

### Patch Changes

- 7856f92d3: Bump all packages
- Updated dependencies [7856f92d3]
  - @graphql-mesh/store@0.7.8

## 0.71.0

### Minor Changes

- f963b57ce: Improve Logging Experience
- 331b62637: feat(json-schema): provide different response schemas for different http status codes

### Patch Changes

- @graphql-mesh/store@0.7.7

## 0.70.6

### Patch Changes

- @graphql-mesh/store@0.7.6

## 0.70.5

### Patch Changes

- Updated dependencies [decbe5fbb]
  - @graphql-mesh/store@0.7.5

## 0.70.4

### Patch Changes

- 35a55e841: Bump GraphQL Tools packages
- Updated dependencies [35a55e841]
  - @graphql-mesh/store@0.7.4

## 0.70.3

### Patch Changes

- Updated dependencies [4fa959de3]
  - @graphql-mesh/store@0.7.3

## 0.70.2

### Patch Changes

- b02f5b008: enhance(cli): leave body parsing to yoga and cache dns with mesh caching
  - @graphql-mesh/store@0.7.2

## 0.70.1

### Patch Changes

- 2d5c6c72a: add Git repository link in package.json
- Updated dependencies [2d5c6c72a]
  - @graphql-mesh/store@0.7.1

## 0.70.0

### Minor Changes

- d567be7b5: feat(json-schema): support bundles from different sources

### Patch Changes

- Updated dependencies [d567be7b5]
  - @graphql-mesh/store@0.7.0

## 0.69.0

### Minor Changes

- f30dba61e: feat(openapi): add fallbackFormat

### Patch Changes

- @graphql-mesh/store@0.6.2

## 0.68.3

### Patch Changes

- be61de529: bump dependencies
  - @graphql-mesh/store@0.6.1

## 0.68.2

### Patch Changes

- b1a6df928: Added @graphql-mesh/transform-hoist-field package
- Updated dependencies [67fb11706]
  - @graphql-mesh/store@0.6.0

## 0.68.1

### Patch Changes

- Updated dependencies [b2c537c2a]
  - @graphql-mesh/store@0.5.0

## 0.68.0

### Minor Changes

- 6c318b91a: New Rate Limit Transform

### Patch Changes

- @graphql-mesh/store@0.4.2

## 0.67.1

### Patch Changes

- Updated dependencies [4c7b90a87]
  - @graphql-mesh/store@0.4.1

## 0.67.0

### Minor Changes

- 01bac6bb5: enhance: reduce memory consumption

### Patch Changes

- 01bac6bb5: fix - align graphql-tools versions
- Updated dependencies [01bac6bb5]
- Updated dependencies [01bac6bb5]
  - @graphql-mesh/store@0.4.0

## 0.66.6

### Patch Changes

- @graphql-mesh/store@0.3.29

## 0.66.5

### Patch Changes

- 2ffb1f287: fix: json schema reference
  - @graphql-mesh/store@0.3.28

## 0.66.4

### Patch Changes

- 6d2d46480: bump graphql-tools
  - @graphql-mesh/store@0.3.27

## 0.66.3

### Patch Changes

- Updated dependencies [f11d8b9c8]
  - @graphql-mesh/store@0.3.26

## 0.66.2

### Patch Changes

- fb876e99c: fix: bump fixed delegate package
  - @graphql-mesh/store@0.3.25

## 0.66.1

### Patch Changes

- 98ff961ff: enhance: New Transform Prune to prune schema outside of handlers and other transforms
  - @graphql-mesh/store@0.3.24

## 0.66.0

### Minor Changes

- 6f07de8fe: feat(graphql): custom fetch strategies

### Patch Changes

- 6f07de8fe: fix: do not import process from env
- b481fbc39: enhance: add tslib to dependencies to reduce bundle size
- Updated dependencies [b481fbc39]
  - @graphql-mesh/store@0.3.23

## 0.65.0

### Minor Changes

- 21de17a3d: feat(json-schema): ability to provide additional request body with requestBaseBody in
  the config

### Patch Changes

- @graphql-mesh/store@0.3.22

## 0.64.2

### Patch Changes

- 8b8eb5158: feat(naming-convention): add support for `fieldArgumentNames`
- 8b8eb5158: feat(transforms): `rename` support for ObjectFieldArguments
  - @graphql-mesh/store@0.3.21

## 0.64.1

### Patch Changes

- @graphql-mesh/store@0.3.20

## 0.64.0

### Minor Changes

- 08b250e04: feat(cli/serve): replace graphql-helix&graphql-upload with graphql-yoga

### Patch Changes

- @graphql-mesh/store@0.3.19

## 0.63.1

### Patch Changes

- 1815865c3: fix: bump fixed graphql-tools
- Updated dependencies [1815865c3]
  - @graphql-mesh/store@0.3.18

## 0.63.0

### Minor Changes

- b6eca9baa: feat(serve): use YogaGraphiQL instead of custom GraphiQL package
- b6eca9baa: feat(core): Envelop integration

### Patch Changes

- @graphql-mesh/store@0.3.17

## 0.62.2

### Patch Changes

- 0d43ecf19: fix(runtime): add mock info if not present
  - @graphql-mesh/store@0.3.16

## 0.62.1

### Patch Changes

- 447bc3697: fix(types): add missing store dependency
  - @graphql-mesh/store@0.3.15

## 0.62.0

### Minor Changes

- 240ec7b38: feat(openapi): selectQueryOrMutationField flag to choose what field belongs to what
  root type

## 0.61.0

### Minor Changes

- 66ca1a366: feat(cli): ability to provide custom codegen config

## 0.60.0

### Minor Changes

- a79268b3a: feat(raml): ability to select operation type by fieldname

### Patch Changes

- a79268b3a: enhance(types): more strict incontext sdk types

## 0.59.0

### Minor Changes

- 020431bdc: feat(json-schema/openapi/raml): respect error status codes
- 020431bdc: feat(redis): fallback to inmemory cache and support env interpolation
- 020431bdc: feat(cli): built-in typescript support

## 0.58.0

### Minor Changes

- 6bb4cf673: feat(prefix): allow to prefix only fields

## 0.57.2

### Patch Changes

- 1ab0aebbc: feat(json-schema): better error handling

## 0.57.1

### Patch Changes

- d907351c5: new OpenAPI Handler

## 0.57.0

### Minor Changes

- cfca98d34: feat(utils): drop graphql-subscriptions and use events for PubSub Impl

## 0.56.0

### Minor Changes

- ec0d1d639: enhance: avoid sync require but collect import sync

## 0.55.0

### Minor Changes

- 1b332487c: feat(soap): ability to select query or mutation

## 0.54.1

### Patch Changes

- 761b16ed9: fix(serve): fix critical bug

## 0.54.0

### Minor Changes

- 09f81dd74: GraphQL v16 compatibility
- 09f81dd74: GraphQL v16 compability

## 0.53.0

### Minor Changes

- 6f57be0c1: feat(json-schema): expose GraphQL Tools loader compatible with loadSchema

## 0.52.0

### Minor Changes

- 811960cdc: feat(runtime): use factory functions for debug messages
- 6f5ffe766: Add rename functionality to replace-field transform

## 0.51.0

### Minor Changes

- 256abf5f7: enhance: do not use context of orchestrator but internally

## 0.50.0

### Minor Changes

- 8c9b709ae: Introduce new replace-field transform

## 0.49.0

### Minor Changes

- 6ce43ddac: feat(type-merging): additional type merging configuration for edge cases

## 0.48.0

### Minor Changes

- 67552c8f8: feat(types): update prefix transform

## 0.47.0

### Minor Changes

- 9eff8a396: enhance(logging): ability to filter debug messages

## 0.46.0

### Minor Changes

- 4545fe72d: Some improvements on additional resolvers;

  - Now you can point to the nested fields in `keyArgs`; e.g. `keysArg: "where.ids"`
  - You don't need `returnType` for abstract types anymore, because it's inferred from the type of
    `targetFieldName`.

- f23820ed0: feat(types): update in-context SDK types
- 06d688e70: feat(config): new skipSSLValidation configuration field that disabled SSL check on HTTP
  requests

## 0.45.2

### Patch Changes

- fc51c574d: Dependency updates

## 0.45.1

### Patch Changes

- 1c2667489: fix(graphql): Replace old flags with subscriptionsProtocol

## 0.45.0

### Minor Changes

- 6266d1774: feat(cli): ability to use a custom server handler
- 2b8dae1cb: feat(cli): generate operations for sdk

### Patch Changes

- 94606e7b9: Enable flags for regular expressions in rename transform

## 0.44.2

### Patch Changes

- 25d10cc23: fix(types): do not resolve json module

## 0.44.1

### Patch Changes

- 49c8ceb38: fix(core): bump packages to fix variables issue

## 0.44.0

### Minor Changes

- 1ee417e3d: feat(mysql): ability to select some specific tables

## 0.43.0

### Minor Changes

- 885ea439a: New MeshStore approach

### Patch Changes

- d8051f87d: GraphQLHandler endpoint validation

## 0.42.0

### Minor Changes

- cfb517b3d: feat(types): make baseDir optional

## 0.41.1

### Patch Changes

- e6acdbd7d: enhance(runtime): do not compose unnecessary resolvers

## 0.41.0

### Minor Changes

- 214b7a23c: feat(runtime): Type Merging support

## 0.40.0

### Minor Changes

- 0d2f7bfcd: Added the config option `useWebSocketLegacyProtocol` for the graphql handler that
  enables the use of the `graphql-ws` protocol for subscriptions to the handlers source.

## 0.39.0

### Minor Changes

- 6c90e0e39: Add wrap mode to resolvers-composition transform (#1928)

## 0.38.0

### Minor Changes

- 346fe9c61: Performance improvements and OData fixes

## 0.37.0

### Minor Changes

- 4b57f7496: feat(serve): ability to configure opening browser window feature
- 4b57f7496: support introspection cache

## 0.36.1

### Patch Changes

- b77148a04: fix(npm-publish): bump all versions to publish again

## 0.36.0

### Minor Changes

- 634a8a134: feat(config): introduce introspection cache

### Patch Changes

- 6b8b23a4e: feat(openapi): allow source spec inline injection

## 0.35.1

### Patch Changes

- 191a663a: fix(types): endpoint doesn't need to be required

## 0.35.0

### Minor Changes

- b9ca0c30: Make Transforms and Handlers base-dir aware

## 0.34.1

### Patch Changes

- 55327fd6: fix(config): support arrays and singular values for additionalTypeDefs

## 0.34.0

### Minor Changes

- 76051dd7: feat(serve): ability to change GraphQL endpoint path

## 0.33.0

### Minor Changes

- 646d6bdb: feat(rename-transform): add bare option

## 0.32.0

### Minor Changes

- 68d6b117: feat(postgraphile): add ability to disable live queries and subscriptions

## 0.31.1

### Patch Changes

- 212f2d66: fix(postgraphile): caching

## 0.31.0

### Minor Changes

- 77327988: feat(runtime): Live Queries Support

## 0.30.1

### Patch Changes

- 48f38a4a: fix(config): allow array of strings in cors configuration

## 0.30.0

### Minor Changes

- 938cca26: feat(json-schema): allow custom error property with errorMessageField

## 0.29.4

### Patch Changes

- 8ef29de1: feat(soap): ability to provide custom headers

## 0.29.3

### Patch Changes

- a02d86c3: feat(serve): add HTTPS support
- a02d86c3: fix(runtime): patch graphql-compose schemas to support @defer and @stream
- a02d86c3: feat(serve): ability to change binding hostname

## 0.29.2

### Patch Changes

- 8e8848e1: feat(serve): ability to change maxRequestBodySize

## 0.29.1

### Patch Changes

- e8994875: feat(serve): ability to change maxFileSize and maxFiles for graphql-upload

## 0.29.0

### Minor Changes

- 183cfa96: feat(grpc): add reflection and file descriptor set support

  This change adds two new features to the gRPC handler.

  - Reflection support
  - File descriptor set support

  Both of these features make it easier for `graphql-mesh` to automatically create a schema for
  gRPC.

  ### `useReflection: boolean`

  This config option enables `graphql-mesh` to generate a schema by querying the gRPC reflection
  endpoints. This feature is enabled by the
  [`grpc-reflection-js`](https://github.com/redhoyasa/grpc-reflection-js) package.

  ### `descriptorSetFilePath: object | string`

  This config option enabled `graphql-mesh` to generate a schema by importing either a
  binary-encoded file descriptor set file or a JSON file descriptor set file. This config works just
  like `protoFilePath` and can be a string or an object containing the file and proto loader
  options.

  Binary-encoded file descriptor sets can be created by using `protoc` with the
  `--descriptor_set_out` option. Example:

  ```sh
  protoc -I . --descriptor_set_out=./my-descriptor-set.bin ./my-rpc.proto
  ```

  JSON file descriptor sets can be created using
  [`protobufjs/protobuf.js`](https://github.com/protobufjs/protobuf.js#using-json-descriptors).

### Patch Changes

- c767df01: fix(fs): fix fs handling issues for non Node environments

## 0.28.0

### Minor Changes

- a22fc6f3: feat(openapi): customize target root type for an operation and generic payload argument
  name

## 0.27.0

### Minor Changes

- c1de3e43: feat(cli): add `playground` option to serve configuration

## 0.26.0

### Minor Changes

- 75f6dff9: feat(graphql): ability to disable batch execution
- c4f207a7: feat(postgraphile): ability to provide custom pgPool instance

## 0.25.0

### Minor Changes

- 0df817d0: feat(graphql): support exported schemaHeaders

## 0.24.0

### Minor Changes

- b6262481: feat(snapshot): add respectSelectionSet for advanced snapshot

## 0.23.3

### Patch Changes

- e5b38574: introduce extend transform

## 0.23.2

### Patch Changes

- c614e796: fix(types): fix config schema

## 0.23.1

### Patch Changes

- 59d77fb8: fix(encapsulate): fix transform config

## 0.23.0

### Minor Changes

- e5cd44f5: feat(rename): support rename transform

## 0.22.0

### Minor Changes

- 2fd59a83: feat(graphql): add useSSEForSubscription option to use SSE for Subscriptions instead of
  WebSocket

## 0.21.1

### Patch Changes

- c064e3a8: Fix minor issues with schema wrapping, updated types

## 0.21.0

### Minor Changes

- 03f41cd0: feat(graphql): support exported GraphQLSchema from code files

## 0.20.1

### Patch Changes

- 1e7fd602: feat(graphql): add `multipart` option to support file uploads

## 0.20.0

### Minor Changes

- 2d14fcc3: bump graphql-tools to v7

### Patch Changes

- 2d14fcc3: fix(json-schema): make method optional to create nonexecutable schema

## 0.19.0

### Minor Changes

- c1b073de: feat(runtime): support TypedDocumentNode

## 0.18.0

### Minor Changes

- 5628fb14: feat(mysql): add an ability to use existing Pool instance

## 0.17.1

### Patch Changes

- 0560e806: feat(fhir): new FHIR handler

## 0.17.0

### Minor Changes

- c26c8c56: feat(json-schema): support baseSchema

## 0.16.1

### Patch Changes

- 3770af72: feat(openapi): addLinitArgument is configurable

  fix(openapi): auto generated limit value is not mandatory

  fix(openapi): generate limit parameter for composed types

## 0.16.0

### Minor Changes

- 3ee10180: feat(json-schema): add argTypeMap to operation config to provide custom types for args

## 0.15.0

### Minor Changes

- 0f17c58c: feat(openapi): handle callbacks as subscriptions

## 0.14.1

### Patch Changes

- 937c87d2: Add 'useHTTPS' flag to gRPC config to allow SSL connections without providing a root CA

## 0.14.0

### Minor Changes

- 1e0445ee: feat(neo4j): add typeDefs option to provide custom schema

## 0.13.0

### Minor Changes

- b50a68e3: feat(serve): support cookies and static file serving

## 0.12.0

### Minor Changes

- e2b34219: improve introspection caching
- 9a7a55c4: feat(openapi): add sourceFormat option to provide schema format explicitly

## 0.11.3

### Patch Changes

- 2dedda3c: enhance(json-schema): support programmatic json schemas and improve caching
- a3b42cfd: fix(runtime): handle transforms correctly for single source

## 0.11.2

### Patch Changes

- 6d624576: fix(types): fix Any scalar type in json schema

## 0.11.1

### Patch Changes

- 405cec23: enhance(types): improve typings for PubSub

## 0.11.0

### Minor Changes

- 48d89de2: feat(runtime): replace hooks with pubsub logic

## 0.10.0

### Minor Changes

- 79adf4b6: feat(config): support functions as config property

## 0.9.2

### Patch Changes

- 2d5cc25b: chore(types): update config schema

## 0.9.1

### Patch Changes

- 93ad5255: fix(json-schema): update types

## 0.9.0

### Minor Changes

- c8d9695e: feat(cli): support --require flag to load dotenv etc

## 0.8.1

### Patch Changes

- d2e56567: fix(merging): prune schema while merging

## 0.8.0

### Minor Changes

- a789c312: feat(stitching): use batch execution

## 0.7.0

### Minor Changes

- 718e7a16: fix(runtime): fix browser support

## 0.6.0

### Minor Changes

- a76d74bb: feat(config): able to configure serve command in mesh config file

### Patch Changes

- 5067ac73: fix(serve): fix typo

## 0.5.1

### Patch Changes

- dde7878b: fix(runtime): handle empty arrays

## 0.5.0

### Minor Changes

- 705c4626: introduce an independent config package

## 0.4.0

### Minor Changes

- 6f21094b: feat(postgraphile): add more configuration options

### Patch Changes

- 854dc550: fix(localforage-cache): handle ttl better

## 0.3.1

### Patch Changes

- 3c131332: feat(cache): introduce new caching strategy localforage

## 0.3.0

### Minor Changes

- ccede377: Introduce includeHttpDetails to include HTTP response details to the result
