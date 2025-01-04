# @omnigraph/grpc

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
