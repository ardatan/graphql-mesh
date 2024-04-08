# @graphql-mesh/supergraph

## 0.3.2

### Patch Changes

- [#6790](https://github.com/ardatan/graphql-mesh/pull/6790)
  [`afe0cc5`](https://github.com/ardatan/graphql-mesh/commit/afe0cc5ddfc7a1291dc878c61793b58850ae848b)
  Thanks [@ardatan](https://github.com/ardatan)! - Better error messages in case of Supergraph SDL
  endpoint returns invalid result or it is down

  If the endpoint is down;

  ```
  Failed to generate the schema for the source "supergraph"
  Failed to load supergraph SDL from http://down-sdl-source.com/my-sdl.graphql:
  Couldn't resolve host name
  ```

  If the endpoint returns invalid result;

  ```
  Failed to generate the schema for the source "supergraph"
  Supergraph source must be a valid GraphQL SDL string or a parsed DocumentNode, but got an invalid result from ./fixtures/supergraph-invalid.graphql instead.
  Got result: type Query {

  Got error: Syntax Error: Expected Name, found <EOF>.
  ```

## 0.3.1

### Patch Changes

- [#6758](https://github.com/ardatan/graphql-mesh/pull/6758)
  [`425afee`](https://github.com/ardatan/graphql-mesh/commit/425afee8e95d115469daa011ddc64b1f48c95daa)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix interpolation of headers and endpoint
  configuration for each subgraph

## 0.3.0

### Minor Changes

- [`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)
  Thanks [@ardatan](https://github.com/ardatan)! - Ability to configure subgraphs

### Patch Changes

- Updated dependencies
  [[`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)]:
  - @graphql-mesh/types@0.97.5
  - @graphql-mesh/store@0.97.5
  - @graphql-mesh/utils@0.97.5

## 0.2.4

### Patch Changes

- Updated dependencies
  [[`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)]:
  - @graphql-mesh/utils@0.97.4
  - @graphql-mesh/types@0.97.4
  - @graphql-mesh/store@0.97.4

## 0.2.3

### Patch Changes

- Updated dependencies
  [[`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)]:
  - @graphql-mesh/types@0.97.3
  - @graphql-mesh/store@0.97.3
  - @graphql-mesh/utils@0.97.3

## 0.2.2

### Patch Changes

- Updated dependencies
  [[`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)]:
  - @graphql-mesh/types@0.97.2
  - @graphql-mesh/store@0.97.2
  - @graphql-mesh/utils@0.97.2

## 0.2.1

### Patch Changes

- Updated dependencies
  [[`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)]:
  - @graphql-mesh/types@0.97.1
  - @graphql-mesh/store@0.97.1
  - @graphql-mesh/utils@0.97.1

## 0.2.0

### Patch Changes

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a),
  [`70b05a2`](https://github.com/ardatan/graphql-mesh/commit/70b05a20a948b5ebed5306c14710c8839225cdad)]:
  - @graphql-mesh/types@0.97.0
  - @graphql-mesh/utils@0.97.0
  - @graphql-mesh/store@0.97.0

## 0.1.6

### Patch Changes

- Updated dependencies
  [[`0f274ef`](https://github.com/ardatan/graphql-mesh/commit/0f274ef8177068da65e50e08607998d0ed63e8b9)]:
  - @graphql-mesh/utils@0.96.6
  - @graphql-mesh/store@0.96.6
  - @graphql-mesh/types@0.96.6

## 0.1.5

### Patch Changes

- [`0a700e3`](https://github.com/ardatan/graphql-mesh/commit/0a700e304706645a2e72d87df8b57773287a38b2)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix URL handling

- Updated dependencies
  [[`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)]:
  - @graphql-mesh/types@0.96.5
  - @graphql-mesh/store@0.96.5
  - @graphql-mesh/utils@0.96.5

## 0.1.4

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/federation@^1.1.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/1.1.12)
    (from `^1.1.1`, in `dependencies`)
- Updated dependencies
  [[`ae7b085`](https://github.com/ardatan/graphql-mesh/commit/ae7b085e93ba911f03bbfd2a15ff9ca8be9f4de8)]:
  - @graphql-mesh/types@0.96.4
  - @graphql-mesh/store@0.96.4
  - @graphql-mesh/utils@0.96.4

## 0.1.3

### Patch Changes

- [`ac26793`](https://github.com/ardatan/graphql-mesh/commit/ac26793e59f76f0839b61a8030e0eefc7383e640)
  Thanks [@ardatan](https://github.com/ardatan)! - `operationHeaders` in Supergraph Handler

- Updated dependencies
  [[`ac26793`](https://github.com/ardatan/graphql-mesh/commit/ac26793e59f76f0839b61a8030e0eefc7383e640)]:
  - @graphql-mesh/types@0.96.3
  - @graphql-mesh/store@0.96.3
  - @graphql-mesh/utils@0.96.3

## 0.1.2

### Patch Changes

- Updated dependencies
  [[`d758afa`](https://github.com/ardatan/graphql-mesh/commit/d758afa7da55cf3ed6b4ed9e8cccfd0ed67fe658),
  [`4fac014`](https://github.com/ardatan/graphql-mesh/commit/4fac01400544bc6e8b2a4ae55f1a4dd4771bbc5c)]:
  - @graphql-mesh/types@0.96.2
  - @graphql-mesh/store@0.96.2
  - @graphql-mesh/utils@0.96.2

## 0.1.1

### Patch Changes

- Updated dependencies
  [[`0825974`](https://github.com/ardatan/graphql-mesh/commit/08259742cf6ef1243e1d4124e90d91af0c05d383)]:
  - @graphql-mesh/store@0.96.1
  - @graphql-mesh/types@0.96.1
  - @graphql-mesh/utils@0.96.1

## 0.1.0

### Patch Changes

- Updated dependencies
  [[`5c6a8f784`](https://github.com/ardatan/graphql-mesh/commit/5c6a8f784a787641b90349e584b49de629cc41ff)]:
  - @graphql-mesh/types@0.96.0
  - @graphql-mesh/store@0.96.0
  - @graphql-mesh/utils@0.96.0

## 0.0.8

### Patch Changes

- Updated dependencies
  [[`b4d38c55d`](https://github.com/ardatan/graphql-mesh/commit/b4d38c55df8c4d2aeb98325555979eb09d065906)]:
  - @graphql-mesh/string-interpolation@0.5.3
  - @graphql-mesh/utils@0.95.8
  - @graphql-mesh/store@0.95.8
  - @graphql-mesh/types@0.95.8

## 0.0.7

### Patch Changes

- Updated dependencies
  [[`a13969c77`](https://github.com/Urigo/graphql-mesh/commit/a13969c77794c44493d7a9426be7e38a6d673c88)]:
  - @graphql-mesh/types@0.95.7
  - @graphql-mesh/store@0.95.7
  - @graphql-mesh/utils@0.95.7

## 0.0.6

### Patch Changes

- Updated dependencies
  [[`8e1056cf9`](https://github.com/Urigo/graphql-mesh/commit/8e1056cf91b0e7069499f5102aaed163a0168597)]:
  - @graphql-mesh/string-interpolation@0.5.2
  - @graphql-mesh/utils@0.95.6
  - @graphql-mesh/store@0.95.6
  - @graphql-mesh/types@0.95.6

## 0.0.5

### Patch Changes

- Updated dependencies
  [[`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781),
  [`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781)]:
  - @graphql-mesh/cross-helpers@0.4.1
  - @graphql-mesh/types@0.95.5
  - @graphql-mesh/store@0.95.5
  - @graphql-mesh/utils@0.95.5

## 0.0.4

### Patch Changes

- Updated dependencies
  [[`625e5d787`](https://github.com/Urigo/graphql-mesh/commit/625e5d7878d44abd7c9d1542bf5cdcd4e37e2411)]:
  - @graphql-mesh/types@0.95.4
  - @graphql-mesh/store@0.95.4
  - @graphql-mesh/utils@0.95.4

## 0.0.3

### Patch Changes

- Updated dependencies
  [[`33ae7a89a`](https://github.com/Urigo/graphql-mesh/commit/33ae7a89a13f40ebbe0a01620e378fe4a914df7f)]:
  - @graphql-mesh/types@0.95.3
  - @graphql-mesh/utils@0.95.3
  - @graphql-mesh/store@0.95.3

## 0.0.2

### Patch Changes

- Updated dependencies
  [[`d8da4b282`](https://github.com/Urigo/graphql-mesh/commit/d8da4b282ab15ab6d0ea24c78c172e31fa1170ea)]:
  - @graphql-mesh/types@0.95.2
  - @graphql-mesh/store@0.95.2
  - @graphql-mesh/utils@0.95.2

## 0.0.1

### Patch Changes

- [#5744](https://github.com/Urigo/graphql-mesh/pull/5744)
  [`7cdc69e04`](https://github.com/Urigo/graphql-mesh/commit/7cdc69e0454ab99ea5c3b8072ac28da8f81a8796)
  Thanks [@ardatan](https://github.com/ardatan)! - New Supergraph handler

- Updated dependencies
  [[`7cdc69e04`](https://github.com/Urigo/graphql-mesh/commit/7cdc69e0454ab99ea5c3b8072ac28da8f81a8796)]:
  - @graphql-mesh/types@0.95.1
  - @graphql-mesh/store@0.95.1
  - @graphql-mesh/utils@0.95.1
