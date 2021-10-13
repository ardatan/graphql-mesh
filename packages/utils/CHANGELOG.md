# @graphql-mesh/utils

## 0.18.0

### Minor Changes

- 4ec7a14ba: enhance: memoize parse/print document node
- 811960cdc: feat(runtime): use factory functions for debug messages

### Patch Changes

- Updated dependencies [811960cdc]
- Updated dependencies [6f5ffe766]
  - @graphql-mesh/types@0.52.0

## 0.17.2

### Patch Changes

- Updated dependencies [256abf5f7]
  - @graphql-mesh/types@0.51.0

## 0.17.1

### Patch Changes

- Updated dependencies [8c9b709ae]
  - @graphql-mesh/types@0.50.0

## 0.17.0

### Minor Changes

- 7bd145769: feat(utils): use JIT for subscriptions as well

## 0.16.3

### Patch Changes

- 472c5887b: enhance(readFileOrUrl): remove unnecessary caching

## 0.16.2

### Patch Changes

- Updated dependencies [6ce43ddac]
  - @graphql-mesh/types@0.49.0

## 0.16.1

### Patch Changes

- 46a4f7b73: fix(utils): hashObject should always return a string
- aa804d043: enhance(utils): improve rmdirs
- Updated dependencies [67552c8f8]
  - @graphql-mesh/types@0.48.0

## 0.16.0

### Minor Changes

- 9eff8a396: enhance(logging): ability to filter debug messages

### Patch Changes

- Updated dependencies [9eff8a396]
  - @graphql-mesh/types@0.47.0

## 0.15.0

### Minor Changes

- f4f30741d: enhance(artifacts): no more execute additional resolvers during build

## 0.14.0

### Minor Changes

- 4545fe72d: Some improvements on additional resolvers;

  - Now you can point to the nested fields in `keyArgs`; e.g. `keysArg: "where.ids"`
  - You don't need `returnType` for abstract types anymore, because it's inferred from the type of `targetFieldName`.

- d189b4034: feat(json-schema): handle non-latin or non-string values correctly

### Patch Changes

- Updated dependencies [4545fe72d]
- Updated dependencies [f23820ed0]
- Updated dependencies [06d688e70]
  - @graphql-mesh/types@0.46.0

## 0.13.7

### Patch Changes

- fc51c574d: Dependency updates
- Updated dependencies [fc51c574d]
  - @graphql-mesh/types@0.45.2

## 0.13.6

### Patch Changes

- Updated dependencies [1c2667489]
  - @graphql-mesh/types@0.45.1

## 0.13.5

### Patch Changes

- 7080a2f1d: Fix baseDir imports for cli generated artifacts

## 0.13.4

### Patch Changes

- 0c97b4b75: fix(config): Yarn PnP Support
- Updated dependencies [6266d1774]
- Updated dependencies [94606e7b9]
- Updated dependencies [2b8dae1cb]
  - @graphql-mesh/types@0.45.0

## 0.13.3

### Patch Changes

- Updated dependencies [25d10cc23]
  - @graphql-mesh/types@0.44.2

## 0.13.2

### Patch Changes

- 49c8ceb38: fix(core): bump packages to fix variables issue
- Updated dependencies [49c8ceb38]
  - @graphql-mesh/types@0.44.1

## 0.13.1

### Patch Changes

- Updated dependencies [1ee417e3d]
  - @graphql-mesh/types@0.44.0

## 0.13.0

### Minor Changes

- 885ea439a: New MeshStore approach

### Patch Changes

- d8051f87d: use fallbackFormat in readUrlWithCache
- Updated dependencies [885ea439a]
- Updated dependencies [d8051f87d]
  - @graphql-mesh/types@0.43.0

## 0.12.0

### Minor Changes

- bdb58dfec: chore(deps): bump object-hash

## 0.11.4

### Patch Changes

- 7d0e33660: fix(utils): support annotations in argTypeMap

## 0.11.3

### Patch Changes

- 3c4c51100: enhance(runtime): skip validation on schema delegation

## 0.11.2

### Patch Changes

- e6acdbd7d: enhance(runtime): do not compose unnecessary resolvers

## 0.11.1

### Patch Changes

- 69c89666d: chore(utils): bump string interpolator version

## 0.11.0

### Minor Changes

- 1caa8ffd3: enhance(runtime): use graphql-jit to improve the performance

## 0.10.0

### Minor Changes

- 346fe9c61: Performance improvements and OData fixes

## 0.9.2

### Patch Changes

- b77148a04: fix(npm-publish): bump all versions to publish again

## 0.9.1

### Patch Changes

- 2c3312f1a: use fallbackFormat in readUrlWithCache
- d12c7d978: fix(utils): use mkdir before emit output

## 0.9.0

### Minor Changes

- b9ca0c30: Make Transforms and Handlers base-dir aware

## 0.8.8

### Patch Changes

- ec89a923: fix(utils): ensure directory exists in writeJSON

## 0.8.7

### Patch Changes

- 69d2198d: fix readFileWithCache: isAbsolute issue (https://github.com/Urigo/graphql-mesh/issues/1505)

## 0.8.6

### Patch Changes

- 7e970f09: fix(utils): handle more complex interpolation strings

## 0.8.5

### Patch Changes

- 8d345721: fix(utils): fix pathExists issue

## 0.8.4

### Patch Changes

- c767df01: fix(fs): fix fs handling issues for non Node environments
- b3d7ecbf: chore(deps): replace fs-extra with native fs

## 0.8.3

### Patch Changes

- 08c2966e: chore(config): update js-yaml

## 0.8.2

### Patch Changes

- c85a54eb: fix(utils): handle multiple transforms properly

## 0.8.1

### Patch Changes

- c064e3a8: Fix minor issues with schema wrapping, updated types

## 0.8.0

### Minor Changes

- 2d14fcc3: bump graphql-tools to v7

## 0.7.0

### Minor Changes

- c1b073de: feat(runtime): support TypedDocumentNode

## 0.6.0

### Minor Changes

- 9a7a55c4: feat(openapi): add sourceFormat option to provide schema format explicitly

## 0.5.4

### Patch Changes

- a3b42cfd: fix(runtime): handle transforms correctly for single source

## 0.5.3

### Patch Changes

- 79adf4b6: fix(utils): loadModuleExpression keep value if not string

## 0.5.2

### Patch Changes

- 9900d2fa: fix(runtime): handle noWrap transforms correctly
- 9900d2fa: chore(utils): move groupTransforms under utils

## 0.5.1

### Patch Changes

- 8f53be10: fix(utils): do not try to parse empty strings

## 0.5.0

### Minor Changes

- a789c312: feat(stitching): use batch execution

## 0.4.0

### Minor Changes

- 718e7a16: fix(runtime): fix browser support

## 0.3.0

### Minor Changes

- 705c4626: introduce an independent config package
