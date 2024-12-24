# @graphql-mesh/include

## 0.2.9

### Patch Changes

- Updated dependencies
  [[`b750a41`](https://github.com/ardatan/graphql-mesh/commit/b750a410c082d64a04f21023790f2ff2c46f5eb9)]:
  - @graphql-mesh/utils@0.103.10

## 0.2.8

### Patch Changes

- Updated dependencies
  [[`10ba2c4`](https://github.com/ardatan/graphql-mesh/commit/10ba2c42549dacff9c4e6be87ee50b608be62ddc)]:
  - @graphql-mesh/utils@0.103.9

## 0.2.7

### Patch Changes

- [#8082](https://github.com/ardatan/graphql-mesh/pull/8082)
  [`93fb364`](https://github.com/ardatan/graphql-mesh/commit/93fb3643d90c52084725d79b586ace8ecd570911)
  Thanks [@ardatan](https://github.com/ardatan)! - Import enhancements

- Updated dependencies
  [[`93fb364`](https://github.com/ardatan/graphql-mesh/commit/93fb3643d90c52084725d79b586ace8ecd570911)]:
  - @graphql-mesh/utils@0.103.8

## 0.2.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.103.7

## 0.2.5

### Patch Changes

- Updated dependencies
  [[`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)]:
  - @graphql-mesh/utils@0.103.6

## 0.2.4

### Patch Changes

- [#8007](https://github.com/ardatan/graphql-mesh/pull/8007)
  [`9f9f6fe`](https://github.com/ardatan/graphql-mesh/commit/9f9f6fe61c74eaa6572866eddd97c348307107a8)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/utils@^0.103.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.103.4)
    (to `dependencies`)

- [#8007](https://github.com/ardatan/graphql-mesh/pull/8007)
  [`9f9f6fe`](https://github.com/ardatan/graphql-mesh/commit/9f9f6fe61c74eaa6572866eddd97c348307107a8)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on imports

- Updated dependencies
  [[`9f9f6fe`](https://github.com/ardatan/graphql-mesh/commit/9f9f6fe61c74eaa6572866eddd97c348307107a8)]:
  - @graphql-mesh/utils@0.103.5

## 0.2.3

### Patch Changes

- [#7725](https://github.com/ardatan/graphql-mesh/pull/7725)
  [`4da6db4`](https://github.com/ardatan/graphql-mesh/commit/4da6db4c8eb570b7bdd3a2de0b026a8fff1a20b2)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`jiti@^2.0.0` ↗︎](https://www.npmjs.com/package/jiti/v/2.0.0) (from
    `^1.21.6`, in `dependencies`)

## 0.2.2

### Patch Changes

- [`f1ce73e`](https://github.com/ardatan/graphql-mesh/commit/f1ce73e30040b461f78885352e0c9d292b8b0589)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix bundle imports

## 0.2.1

### Patch Changes

- [`0443063`](https://github.com/ardatan/graphql-mesh/commit/04430632fb2fd5f90c264ad6ca9a0eb89a789c05)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve Windows support

## 0.2.0

### Minor Changes

- [#7596](https://github.com/ardatan/graphql-mesh/pull/7596)
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Module hooks using sucrase transpiling only
  TS with tsconfig paths support

- [#7596](https://github.com/ardatan/graphql-mesh/pull/7596)
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - No more
  @graphql-mesh/include/register-tsconfig-paths

### Patch Changes

- [#7596](https://github.com/ardatan/graphql-mesh/pull/7596)
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Added dependency [`sucrase@^3.35.0` ↗︎](https://www.npmjs.com/package/sucrase/v/3.35.0) (to
    `dependencies`)

## 0.1.0

### Minor Changes

- [#7494](https://github.com/ardatan/graphql-mesh/pull/7494)
  [`0594ffd`](https://github.com/ardatan/graphql-mesh/commit/0594ffdd5dacb99d73cfa351439ce8356c3aff2a)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Optional `nativeImport` argument when
  including to use the native `import` function instead of jiti

### Patch Changes

- [#7493](https://github.com/ardatan/graphql-mesh/pull/7493)
  [`78b7569`](https://github.com/ardatan/graphql-mesh/commit/78b7569dda8b797a28883ab34543b6b80f3d825a)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Return noop unregister function if no
  tsconfig paths have been registered

- [#7493](https://github.com/ardatan/graphql-mesh/pull/7493)
  [`78b7569`](https://github.com/ardatan/graphql-mesh/commit/78b7569dda8b797a28883ab34543b6b80f3d825a)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Nothing to register if tsconfig does not
  contain paths

## 0.0.1

### Patch Changes

- [#7427](https://github.com/ardatan/graphql-mesh/pull/7427)
  [`8be81d2`](https://github.com/ardatan/graphql-mesh/commit/8be81d25aac222f37ba7bc44592c39b0f53ace95)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Library for importing and transpiling
  TypeScript and JavaScript module during runtime
