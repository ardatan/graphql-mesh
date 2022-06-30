# @graphql-mesh/cross-helpers

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
