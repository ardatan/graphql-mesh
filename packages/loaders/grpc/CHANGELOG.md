# @omnigraph/grpc

## 0.2.5

### Patch Changes

- [#8433](https://github.com/ardatan/graphql-mesh/pull/8433)
  [`903124f`](https://github.com/ardatan/graphql-mesh/commit/903124f8245a518aac50ef8d0eff2fef01a206f2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.6` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.6)
    (from `^0.0.5`, in `dependencies`)

## 0.2.4

### Patch Changes

- [#8375](https://github.com/ardatan/graphql-mesh/pull/8375)
  [`b44f8b7`](https://github.com/ardatan/graphql-mesh/commit/b44f8b7a413c8adb213b22fb8a243ca6aa06d2bd)
  Thanks [@ardatan](https://github.com/ardatan)! - More clear key-value pairs in the logs

## 0.2.3

### Patch Changes

- [#8362](https://github.com/ardatan/graphql-mesh/pull/8362)
  [`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.8.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.8.0)
    (from `^10.6.0`, in `dependencies`)
- Updated dependencies
  [[`ce5e094`](https://github.com/ardatan/graphql-mesh/commit/ce5e0941e5a9445a0844d7225cf950a813011e9a)]:
  - @graphql-mesh/cross-helpers@0.4.10

## 0.2.2

### Patch Changes

- [#8289](https://github.com/ardatan/graphql-mesh/pull/8289)
  [`c54e361`](https://github.com/ardatan/graphql-mesh/commit/c54e36110256541e03380b0d537085848169116b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency [`micromatch@^4.0.8` ↗︎](https://www.npmjs.com/package/micromatch/v/4.0.8) (to
    `dependencies`)

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
  [[`78c202e`](https://github.com/ardatan/graphql-mesh/commit/78c202ef8824607e27de1dcc5076c82a02ef86cd)]:
  - @graphql-mesh/string-interpolation@0.5.8

## 0.2.1

### Patch Changes

- [#8270](https://github.com/ardatan/graphql-mesh/pull/8270)
  [`d3656b6`](https://github.com/ardatan/graphql-mesh/commit/d3656b60fe47c74122e9dfad28273426b07b42ab)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`graphql-compose@^9.1.0` ↗︎](https://www.npmjs.com/package/graphql-compose/v/9.1.0) (from
    `^9.0.11`, in `dependencies`)

## 0.2.0

### Minor Changes

- [#8203](https://github.com/ardatan/graphql-mesh/pull/8203)
  [`c541164`](https://github.com/ardatan/graphql-mesh/commit/c541164f9d02fcc70389ee768610921ff0e622e6)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle multiple gRPC services correctly in a
  supergraph

  Previously multiple directives on Query type conflicting, which needs to be fixed on Gateway
  runtime later, but for now, it should be already in the transport directive. And this change fixes
  the issue before the gateway runtime fix.

  Generated schema will be different so this can be considered a breaking change but it will be no
  functional change for the existing users.

## 0.1.3

### Patch Changes

- Updated dependencies
  [[`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9),
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)]:
  - @graphql-mesh/cross-helpers@0.4.9
  - @graphql-mesh/string-interpolation@0.5.7

## 0.1.2

### Patch Changes

- [#7978](https://github.com/ardatan/graphql-mesh/pull/7978)
  [`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.0)
    (from `^10.5.5`, in `dependencies`)
- Updated dependencies
  [[`92d3ce1`](https://github.com/ardatan/graphql-mesh/commit/92d3ce10bcfdb1bbf63165f77bdb5acd713c88ac)]:
  - @graphql-mesh/cross-helpers@0.4.8

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.7.13

## 0.1.0

### Minor Changes

- [#7866](https://github.com/ardatan/graphql-mesh/pull/7866)
  [`0788b5d`](https://github.com/ardatan/graphql-mesh/commit/0788b5d76b7439af804781a33cb3c065c524dd63)
  Thanks [@renovate](https://github.com/apps/renovate)! - Use shared TransportOptions scalar in all
  transport directive definitions

## 0.0.1

### Patch Changes

- Updated dependencies
  [[`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)]:
  - @graphql-mesh/transport-common@0.7.12
