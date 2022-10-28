# @graphql-mesh/cross-helpers

## 0.2.7

### Patch Changes

- [#4745](https://github.com/Urigo/graphql-mesh/pull/4745) [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`@graphql-tools/utils@8.13.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.13.0) (from `8.12.0`, in `dependencies`)

## 0.2.6

### Patch Changes

- [#4439](https://github.com/Urigo/graphql-mesh/pull/4439) [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2) Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.12.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.12.0) (from `8.10.1`, in `dependencies`)

## 0.2.5

### Patch Changes

- [#4466](https://github.com/Urigo/graphql-mesh/pull/4466) [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.12.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.12.0) (from `8.11.0`, in `dependencies`)

## 0.2.4

### Patch Changes

- [#4443](https://github.com/Urigo/graphql-mesh/pull/4443) [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.11.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.11.0) (from `8.10.1`, in `dependencies`)

## 0.2.3

### Patch Changes

- [#4380](https://github.com/Urigo/graphql-mesh/pull/4380) [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd) Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.1) (from `8.10.0`, in `dependencies`)

- [#4389](https://github.com/Urigo/graphql-mesh/pull/4389) [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.1) (from `8.10.0`, in `dependencies`)

## 0.2.2

### Patch Changes

- [#4275](https://github.com/Urigo/graphql-mesh/pull/4275) [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.0) (was `8.9.1`, in `dependencies`)

## 0.2.1

### Patch Changes

- [#4263](https://github.com/Urigo/graphql-mesh/pull/4263) [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.9.1) (was `8.9.0`, in `dependencies`)

## 0.2.0

### Minor Changes

- 0401c7617: **Improvements on string interpolation ({env.sth} or {context.headers.sth}) for different environments**

  As we mention in most of our docs, we usually expect a key-value `header` object in the context.
  But Fetch-like environments don't have this kind of object but instead `Headers` object which is a kind `Map`.
  Now Mesh can detect this and automatically convert it to the key-value object especially for Yoga users.

  Also Mesh now handles `env` in a better way for non-Node environments;

  Consider `import.meta.env` as `env` if available, else take `globalThis` as `env`.

## 0.1.7

### Patch Changes

- 12e1e5d72: Do not use index.js because esbuild doesn't pick the correct one in that case

## 0.1.6

### Patch Changes

- 3c0366d2c: - Support import.meta.env instead of process.env for browsers
  - Ponyfill `util.inspect` only if it is not Node env

## 0.1.5

### Patch Changes

- 974e703e2: Cleanup dependencies

## 0.1.4

### Patch Changes

- 55ad5ea44: Fix browser support

## 0.1.3

### Patch Changes

- 66b9b3ddc: Fixes for JSON handling and react native

## 0.1.2

### Patch Changes

- 7856f92d3: Bump all packages

## 0.1.1

### Patch Changes

- cf0836a64: fix: browser errors

## 0.1.0

### Minor Changes

- b2c537c2a: feat - cross-platform support
