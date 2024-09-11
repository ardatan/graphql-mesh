# @graphql-mesh/include

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
