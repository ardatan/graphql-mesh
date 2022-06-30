# @graphql-mesh/config

## 4.0.0

### Patch Changes

- 0401c7617: Fix: Resolve `customFetch` properly and write the import statement properly in the artifacts

  If given `customFetch` path is relative, it wasn't reflected properly in the generated artifacts so artifacts were failing. Now it is resolved correctly based on the given working directory(`baseDir`).

- Updated dependencies [66f5d0189]
- Updated dependencies [0401c7617]
  - @graphql-mesh/types@0.77.1
  - @graphql-mesh/cross-helpers@0.2.0
  - @graphql-mesh/runtime@0.40.0
  - @graphql-mesh/utils@0.37.0
  - @graphql-mesh/cache-localforage@0.6.16
  - @graphql-mesh/merger-bare@0.14.2
  - @graphql-mesh/merger-stitching@0.15.60
  - @graphql-mesh/store@0.8.19

## 3.0.1

### Patch Changes

- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
  - @graphql-mesh/cross-helpers@0.1.7
  - @graphql-mesh/types@0.77.0
  - @graphql-mesh/store@0.8.18
  - @graphql-mesh/utils@0.36.1
  - @graphql-mesh/cache-localforage@0.6.15
  - @graphql-mesh/merger-bare@0.14.1
  - @graphql-mesh/merger-stitching@0.15.59
  - @graphql-mesh/runtime@0.39.1

## 3.0.0

### Minor Changes

- ee592adbf: Directives Approach for Additional Type Definitions and Resolvers;

  Before we use declarative approach for `additionalResolvers` that is added besides `additionalTypeDefs` which might be confusing once the project grows.
  And now we introduce new `@resolveTo` directive which has the same declarative syntax inside the SDL instead of the configuration file.

  Before;

  ```yaml
  additionalTypeDefs: |
    extend type Book {
      author: Author
    }

  additionalResolvers:
    - targetTypeName: Book
      targetFieldName: author
      sourceName: Author
      sourceTypeName: Query
      sourceFieldName: authorById
      requiredSelectionSet: '{ id }'
      sourceArgs:
        id: '{root.id}'
  ```

  After:

  ```graphql
  extend type Book {
    author: Author @resolveTo(
      sourceName: "Author",
      sourceTypeName: "Query",
      sourceFieldName: "author",
      requiredSelectionSet: "{ id }",
      sourceArgs:
        id: "{root.id}"
    )
  }
  ```

- a0950ac6f: Breaking Change:

  - Now you can set a global `customFetch` instead of setting `customFetch` individually for each handler. `customFetch` configuration field for each handler will no longer work. And also `customFetch` needs to be the path of the code file that exports the function as `default`. `moduleName#exportName` is not supported for now.

  - While programmatically creating the handlers, now you also need `fetchFn` to be passed to the constructor;

  ```ts
  new GraphQLHandler({
    ...,
    fetchFn: myFetchFn,
  })
  ```

  - `readFileOrUrl`'s second `config` parameter is now required. Also this second parameter should take an object with `cwd`, `importFn`, `fetch` and `logger`. You can see the diff of handler's codes as an example.

### Patch Changes

- Updated dependencies [19d06f6c9]
- Updated dependencies [19d06f6c9]
- Updated dependencies [a0950ac6f]
  - @graphql-mesh/utils@0.36.0
  - @graphql-mesh/merger-bare@0.14.0
  - @graphql-mesh/runtime@0.39.0
  - @graphql-mesh/types@0.76.0
  - @graphql-mesh/cache-localforage@0.6.14
  - @graphql-mesh/merger-stitching@0.15.58
  - @graphql-mesh/store@0.8.17

## 2.0.0

### Minor Changes

- d4754ad08: Response Cache Plugin

### Patch Changes

- Updated dependencies [d4754ad08]
- Updated dependencies [2df026e90]
  - @graphql-mesh/runtime@0.38.0
  - @graphql-mesh/types@0.75.0
  - @graphql-mesh/cache-localforage@0.6.13
  - @graphql-mesh/merger-bare@0.13.55
  - @graphql-mesh/merger-stitching@0.15.57
  - @graphql-mesh/store@0.8.16
  - @graphql-mesh/utils@0.35.7

## 1.0.1

### Patch Changes

- ed9ba7f48: fix(config): generate artifacts by respecting the order of transforms & sources
- Updated dependencies [ed9ba7f48]
  - @graphql-mesh/types@0.74.2
  - @graphql-mesh/utils@0.35.6
  - @graphql-mesh/cache-localforage@0.6.12
  - @graphql-mesh/merger-bare@0.13.54
  - @graphql-mesh/merger-stitching@0.15.56
  - @graphql-mesh/runtime@0.37.1
  - @graphql-mesh/store@0.8.15

## 1.0.0

### Patch Changes

- Updated dependencies [ab93f1697]
  - @graphql-mesh/runtime@0.37.0

## 0.37.6

### Patch Changes

- 41cfb46b4: Dynamically import additional resolvers instead of static imports
- Updated dependencies [41cfb46b4]
  - @graphql-mesh/utils@0.35.5
  - @graphql-mesh/cache-localforage@0.6.11
  - @graphql-mesh/merger-bare@0.13.53
  - @graphql-mesh/merger-stitching@0.15.55
  - @graphql-mesh/runtime@0.36.1
  - @graphql-mesh/store@0.8.14
  - @graphql-mesh/types@0.74.1

## 1.0.0

### Patch Changes

- Updated dependencies [13b9b30f7]
  - @graphql-mesh/runtime@0.36.0
  - @graphql-mesh/types@0.74.0
  - @graphql-mesh/utils@0.35.4
  - @graphql-mesh/cache-localforage@0.6.10
  - @graphql-mesh/merger-bare@0.13.52
  - @graphql-mesh/merger-stitching@0.15.54
  - @graphql-mesh/store@0.8.13

## 0.37.5

### Patch Changes

- Updated dependencies [9733f490c]
  - @graphql-mesh/utils@0.35.3
  - @graphql-mesh/cache-localforage@0.6.9
  - @graphql-mesh/merger-bare@0.13.51
  - @graphql-mesh/merger-stitching@0.15.53
  - @graphql-mesh/runtime@0.35.4
  - @graphql-mesh/store@0.8.12
  - @graphql-mesh/types@0.73.3

## 0.37.4

### Patch Changes

- 2332ee785: Remove unused dependencies
- Updated dependencies [930bbd3ee]
  - @graphql-mesh/runtime@0.35.3

## 0.37.3

### Patch Changes

- d17d55881: fix(cli/config): use correct logger prefix

## 0.37.2

### Patch Changes

- 3c0366d2c: - Support import.meta.env instead of process.env for browsers
  - Ponyfill `util.inspect` only if it is not Node env
- Updated dependencies [3c0366d2c]
- Updated dependencies [3c0366d2c]
  - @graphql-mesh/cross-helpers@0.1.6
  - @graphql-mesh/utils@0.35.2
  - @graphql-mesh/store@0.8.11
  - @graphql-mesh/cache-localforage@0.6.8
  - @graphql-mesh/merger-bare@0.13.50
  - @graphql-mesh/merger-stitching@0.15.52
  - @graphql-mesh/runtime@0.35.2
  - @graphql-mesh/types@0.73.2

## 0.37.1

### Patch Changes

- Updated dependencies [abe9fcc41]
  - @graphql-mesh/utils@0.35.1
  - @graphql-mesh/cache-localforage@0.6.7
  - @graphql-mesh/merger-bare@0.13.49
  - @graphql-mesh/merger-stitching@0.15.51
  - @graphql-mesh/runtime@0.35.1
  - @graphql-mesh/store@0.8.10
  - @graphql-mesh/types@0.73.1

## 0.37.0

### Minor Changes

- 974e703e2: Generate more readable code and cleanup the artifacts

  No more export `documentsInSDL`, use `documents` array instead coming from `MeshInstance`
  No more export `rawConfig` but instead `rawServeConfig` to expose `ServeConfig`

- 893d526ab: POC: Mesh Declarative Plugin System

### Patch Changes

- 974e703e2: Cleanup dependencies
- Updated dependencies [974e703e2]
- Updated dependencies [19a99c055]
- Updated dependencies [974e703e2]
- Updated dependencies [974e703e2]
- Updated dependencies [893d526ab]
- Updated dependencies [974e703e2]
  - @graphql-mesh/merger-stitching@0.15.50
  - @graphql-mesh/runtime@0.35.0
  - @graphql-mesh/store@0.8.9
  - @graphql-mesh/types@0.73.0
  - @graphql-mesh/utils@0.35.0
  - @graphql-mesh/cache-localforage@0.6.6
  - @graphql-mesh/cross-helpers@0.1.5
  - @graphql-mesh/merger-bare@0.13.48

## 0.36.5

### Patch Changes

- Updated dependencies [43eb3d2c2]
  - @graphql-mesh/utils@0.34.10
  - @graphql-mesh/cache-localforage@0.6.5
  - @graphql-mesh/merger-bare@0.13.47
  - @graphql-mesh/merger-stitching@0.15.49
  - @graphql-mesh/runtime@0.34.10
  - @graphql-mesh/store@0.8.8
  - @graphql-mesh/types@0.72.5

## 0.36.4

### Patch Changes

- 55ad5ea44: Cleanup generated artifacts
- Updated dependencies [55ad5ea44]
  - @graphql-mesh/cache-localforage@0.6.4
  - @graphql-mesh/cross-helpers@0.1.4
  - @graphql-mesh/utils@0.34.9
  - @graphql-mesh/store@0.8.7
  - @graphql-mesh/merger-bare@0.13.46
  - @graphql-mesh/merger-stitching@0.15.48
  - @graphql-mesh/runtime@0.34.9
  - @graphql-mesh/types@0.72.4

## 0.36.3

### Patch Changes

- Updated dependencies [31efa964e]
  - @graphql-mesh/utils@0.34.8
  - @graphql-mesh/cache-localforage@0.6.3
  - @graphql-mesh/merger-bare@0.13.45
  - @graphql-mesh/merger-stitching@0.15.47
  - @graphql-mesh/runtime@0.34.8
  - @graphql-mesh/store@0.8.6
  - @graphql-mesh/types@0.72.3

## 0.36.2

### Patch Changes

- Updated dependencies [66b9b3ddc]
  - @graphql-mesh/cross-helpers@0.1.3
  - @graphql-mesh/store@0.8.5
  - @graphql-mesh/utils@0.34.7
  - @graphql-mesh/merger-stitching@0.15.46
  - @graphql-mesh/types@0.72.2
  - @graphql-mesh/cache-localforage@0.6.2
  - @graphql-mesh/merger-bare@0.13.44
  - @graphql-mesh/runtime@0.34.7

## 0.36.1

### Patch Changes

- Updated dependencies [b9beacca2]
  - @graphql-mesh/utils@0.34.6
  - @graphql-mesh/cache-localforage@0.6.1
  - @graphql-mesh/merger-bare@0.13.43
  - @graphql-mesh/merger-stitching@0.15.45
  - @graphql-mesh/runtime@0.34.6
  - @graphql-mesh/store@0.8.4
  - @graphql-mesh/types@0.72.1

## 0.36.0

### Minor Changes

- fa2542468: Use Localforage by default and drop inmemory-lru

### Patch Changes

- Updated dependencies [efe797ff9]
- Updated dependencies [fa2542468]
  - @graphql-mesh/runtime@0.34.5
  - @graphql-mesh/cache-localforage@0.6.0
  - @graphql-mesh/types@0.72.0
  - @graphql-mesh/merger-bare@0.13.42
  - @graphql-mesh/merger-stitching@0.15.44
  - @graphql-mesh/store@0.8.3
  - @graphql-mesh/utils@0.34.5

## 0.35.4

### Patch Changes

- Updated dependencies [ddbbec8a8]
  - @graphql-mesh/utils@0.34.4
  - @graphql-mesh/cache-inmemory-lru@0.6.18
  - @graphql-mesh/merger-bare@0.13.41
  - @graphql-mesh/merger-stitching@0.15.43
  - @graphql-mesh/runtime@0.34.4
  - @graphql-mesh/store@0.8.2
  - @graphql-mesh/types@0.71.4

## 0.35.3

### Patch Changes

- Updated dependencies [2e9addd80]
  - @graphql-mesh/utils@0.34.3
  - @graphql-mesh/cache-inmemory-lru@0.6.17
  - @graphql-mesh/merger-bare@0.13.40
  - @graphql-mesh/merger-stitching@0.15.42
  - @graphql-mesh/runtime@0.34.3
  - @graphql-mesh/store@0.8.1
  - @graphql-mesh/types@0.71.3

## 0.35.2

### Patch Changes

- Updated dependencies [8c8b304e5]
  - @graphql-mesh/store@0.8.0
  - @graphql-mesh/merger-stitching@0.15.41
  - @graphql-mesh/types@0.71.2
  - @graphql-mesh/cache-inmemory-lru@0.6.16
  - @graphql-mesh/merger-bare@0.13.39
  - @graphql-mesh/runtime@0.34.2
  - @graphql-mesh/utils@0.34.2

## 0.35.1

### Patch Changes

- 7856f92d3: Bump all packages
- Updated dependencies [7856f92d3]
  - @graphql-mesh/cache-inmemory-lru@0.6.15
  - @graphql-mesh/cross-helpers@0.1.2
  - @graphql-mesh/merger-bare@0.13.38
  - @graphql-mesh/merger-stitching@0.15.40
  - @graphql-mesh/runtime@0.34.1
  - @graphql-mesh/store@0.7.8
  - @graphql-mesh/types@0.71.1
  - @graphql-mesh/utils@0.34.1

## 0.35.0

### Minor Changes

- f963b57ce: Improve Logging Experience

### Patch Changes

- Updated dependencies [f963b57ce]
- Updated dependencies [0644f31f2]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
  - @graphql-mesh/runtime@0.34.0
  - @graphql-mesh/types@0.71.0
  - @graphql-mesh/utils@0.34.0
  - @graphql-mesh/cache-inmemory-lru@0.6.14
  - @graphql-mesh/merger-bare@0.13.37
  - @graphql-mesh/merger-stitching@0.15.39
  - @graphql-mesh/store@0.7.7

## 0.34.6

### Patch Changes

- Updated dependencies [cf0836a64]
  - @graphql-mesh/cross-helpers@0.1.1
  - @graphql-mesh/store@0.7.6
  - @graphql-mesh/utils@0.33.6
  - @graphql-mesh/merger-stitching@0.15.38
  - @graphql-mesh/types@0.70.6
  - @graphql-mesh/cache-inmemory-lru@0.6.13
  - @graphql-mesh/merger-bare@0.13.36
  - @graphql-mesh/runtime@0.33.15

## 0.34.5

### Patch Changes

- Updated dependencies [b974d9bd0]
  - @graphql-mesh/merger-stitching@0.15.37
  - @graphql-mesh/runtime@0.33.14

## 0.34.4

### Patch Changes

- Updated dependencies [c0387e8ac]
- Updated dependencies [decbe5fbb]
  - @graphql-mesh/runtime@0.33.13
  - @graphql-mesh/store@0.7.5
  - @graphql-mesh/merger-stitching@0.15.36
  - @graphql-mesh/types@0.70.5
  - @graphql-mesh/cache-inmemory-lru@0.6.12
  - @graphql-mesh/merger-bare@0.13.35
  - @graphql-mesh/utils@0.33.5

## 0.34.3

### Patch Changes

- 35a55e841: Bump GraphQL Tools packages
- Updated dependencies [35a55e841]
  - @graphql-mesh/merger-bare@0.13.34
  - @graphql-mesh/merger-stitching@0.15.35
  - @graphql-mesh/runtime@0.33.12
  - @graphql-mesh/store@0.7.4
  - @graphql-mesh/types@0.70.4
  - @graphql-mesh/utils@0.33.4
  - @graphql-mesh/cache-inmemory-lru@0.6.11

## 0.34.2

### Patch Changes

- Updated dependencies [1dbe6b6c3]
  - @graphql-mesh/runtime@0.33.11

## 0.34.1

### Patch Changes

- Updated dependencies [4fa959de3]
  - @graphql-mesh/store@0.7.3
  - @graphql-mesh/merger-stitching@0.15.34
  - @graphql-mesh/types@0.70.3
  - @graphql-mesh/cache-inmemory-lru@0.6.10
  - @graphql-mesh/merger-bare@0.13.33
  - @graphql-mesh/runtime@0.33.10
  - @graphql-mesh/utils@0.33.3

## 0.34.0

### Minor Changes

- 101adc246: Allow custom package prefixes besides @graphql-mesh/\*

## 0.33.5

### Patch Changes

- Updated dependencies [b02f5b008]
  - @graphql-mesh/types@0.70.2
  - @graphql-mesh/cache-inmemory-lru@0.6.9
  - @graphql-mesh/merger-bare@0.13.32
  - @graphql-mesh/merger-stitching@0.15.33
  - @graphql-mesh/runtime@0.33.9
  - @graphql-mesh/store@0.7.2
  - @graphql-mesh/utils@0.33.2

## 0.33.4

### Patch Changes

- 2d5c6c72a: add Git repository link in package.json
- Updated dependencies [2d5c6c72a]
  - @graphql-mesh/cache-inmemory-lru@0.6.8
  - @graphql-mesh/merger-bare@0.13.31
  - @graphql-mesh/merger-stitching@0.15.32
  - @graphql-mesh/runtime@0.33.8
  - @graphql-mesh/store@0.7.1
  - @graphql-mesh/types@0.70.1
  - @graphql-mesh/utils@0.33.1

## 0.33.3

### Patch Changes

- Updated dependencies [d567be7b5]
- Updated dependencies [d567be7b5]
  - @graphql-mesh/types@0.70.0
  - @graphql-mesh/utils@0.33.0
  - @graphql-mesh/store@0.7.0
  - @graphql-mesh/cache-inmemory-lru@0.6.7
  - @graphql-mesh/merger-bare@0.13.30
  - @graphql-mesh/merger-stitching@0.15.31
  - @graphql-mesh/runtime@0.33.7

## 0.33.2

### Patch Changes

- Updated dependencies [f30dba61e]
  - @graphql-mesh/types@0.69.0
  - @graphql-mesh/cache-inmemory-lru@0.6.6
  - @graphql-mesh/merger-bare@0.13.29
  - @graphql-mesh/merger-stitching@0.15.30
  - @graphql-mesh/runtime@0.33.6
  - @graphql-mesh/store@0.6.2
  - @graphql-mesh/utils@0.32.2

## 0.33.1

### Patch Changes

- Updated dependencies [be61de529]
  - @graphql-mesh/types@0.68.3
  - @graphql-mesh/cache-inmemory-lru@0.6.5
  - @graphql-mesh/merger-bare@0.13.28
  - @graphql-mesh/merger-stitching@0.15.29
  - @graphql-mesh/runtime@0.33.5
  - @graphql-mesh/store@0.6.1
  - @graphql-mesh/utils@0.32.1

## 0.33.0

### Minor Changes

- 67fb11706: enhance: improve cross-platform support

### Patch Changes

- Updated dependencies [b1a6df928]
- Updated dependencies [67fb11706]
  - @graphql-mesh/types@0.68.2
  - @graphql-mesh/store@0.6.0
  - @graphql-mesh/utils@0.32.0
  - @graphql-mesh/cache-inmemory-lru@0.6.4
  - @graphql-mesh/merger-bare@0.13.27
  - @graphql-mesh/merger-stitching@0.15.28
  - @graphql-mesh/runtime@0.33.4

## 0.32.0

### Minor Changes

- b2c537c2a: feat - cross-platform support

### Patch Changes

- Updated dependencies [b2c537c2a]
  - @graphql-mesh/store@0.5.0
  - @graphql-mesh/utils@0.31.0
  - @graphql-mesh/cross-helpers@0.1.0
  - @graphql-mesh/merger-stitching@0.15.27
  - @graphql-mesh/types@0.68.1
  - @graphql-mesh/cache-inmemory-lru@0.6.3
  - @graphql-mesh/merger-bare@0.13.26
  - @graphql-mesh/runtime@0.33.3

## 0.31.12

### Patch Changes

- Updated dependencies [6c318b91a]
- Updated dependencies [afdac7faf]
  - @graphql-mesh/types@0.68.0
  - @graphql-mesh/runtime@0.33.2
  - @graphql-mesh/cache-inmemory-lru@0.6.2
  - @graphql-mesh/merger-bare@0.13.25
  - @graphql-mesh/merger-stitching@0.15.26
  - @graphql-mesh/store@0.4.2
  - @graphql-mesh/utils@0.30.2

## 0.31.11

### Patch Changes

- Updated dependencies [4c7b90a87]
  - @graphql-mesh/store@0.4.1
  - @graphql-mesh/merger-stitching@0.15.25
  - @graphql-mesh/types@0.67.1
  - @graphql-mesh/cache-inmemory-lru@0.6.1
  - @graphql-mesh/merger-bare@0.13.24
  - @graphql-mesh/runtime@0.33.1
  - @graphql-mesh/utils@0.30.1

## 0.31.10

### Patch Changes

- 01bac6bb5: fix - align graphql-tools versions
- Updated dependencies [01bac6bb5]
- Updated dependencies [01bac6bb5]
  - @graphql-mesh/cache-inmemory-lru@0.6.0
  - @graphql-mesh/merger-bare@0.13.23
  - @graphql-mesh/merger-stitching@0.15.24
  - @graphql-mesh/runtime@0.33.0
  - @graphql-mesh/store@0.4.0
  - @graphql-mesh/types@0.67.0
  - @graphql-mesh/utils@0.30.0

## 0.31.9

### Patch Changes

- Updated dependencies [268db0462]
  - @graphql-mesh/runtime@0.32.0
  - @graphql-mesh/utils@0.29.0
  - @graphql-mesh/cache-inmemory-lru@0.5.59
  - @graphql-mesh/merger-bare@0.13.22
  - @graphql-mesh/merger-stitching@0.15.23
  - @graphql-mesh/store@0.3.29
  - @graphql-mesh/types@0.66.6

## 0.31.8

### Patch Changes

- Updated dependencies [2ffb1f287]
  - @graphql-mesh/types@0.66.5
  - @graphql-mesh/cache-inmemory-lru@0.5.58
  - @graphql-mesh/merger-bare@0.13.21
  - @graphql-mesh/merger-stitching@0.15.22
  - @graphql-mesh/runtime@0.31.13
  - @graphql-mesh/store@0.3.28
  - @graphql-mesh/utils@0.28.5

## 0.31.7

### Patch Changes

- Updated dependencies [6d2d46480]
- Updated dependencies [634363331]
  - @graphql-mesh/types@0.66.4
  - @graphql-mesh/merger-bare@0.13.20
  - @graphql-mesh/merger-stitching@0.15.21
  - @graphql-mesh/runtime@0.31.12
  - @graphql-mesh/cache-inmemory-lru@0.5.57
  - @graphql-mesh/store@0.3.27
  - @graphql-mesh/utils@0.28.4

## 0.31.6

### Patch Changes

- Updated dependencies [d7fac7dc6]
  - @graphql-mesh/merger-stitching@0.15.20

## 0.31.5

### Patch Changes

- f11d8b9c8: fix: add implicit dependencies
- Updated dependencies [f11d8b9c8]
  - @graphql-mesh/runtime@0.31.11
  - @graphql-mesh/store@0.3.26
  - @graphql-mesh/merger-stitching@0.15.19
  - @graphql-mesh/types@0.66.3
  - @graphql-mesh/cache-inmemory-lru@0.5.56
  - @graphql-mesh/merger-bare@0.13.19
  - @graphql-mesh/utils@0.28.3

## 0.31.4

### Patch Changes

- Updated dependencies [fb876e99c]
  - @graphql-mesh/merger-stitching@0.15.18
  - @graphql-mesh/runtime@0.31.10
  - @graphql-mesh/types@0.66.2
  - @graphql-mesh/utils@0.28.2
  - @graphql-mesh/cache-inmemory-lru@0.5.55
  - @graphql-mesh/merger-bare@0.13.18
  - @graphql-mesh/store@0.3.25

## 0.31.3

### Patch Changes

- 81a9b9f69: fix(config): fix all path elements on Windows

## 0.31.2

### Patch Changes

- b9cb28503: fix(config): fix paths for additional envelop plugins and resolvers on Windows

## 0.31.1

### Patch Changes

- Updated dependencies [98ff961ff]
  - @graphql-mesh/types@0.66.1
  - @graphql-mesh/cache-inmemory-lru@0.5.54
  - @graphql-mesh/merger-bare@0.13.17
  - @graphql-mesh/merger-stitching@0.15.17
  - @graphql-mesh/runtime@0.31.9
  - @graphql-mesh/utils@0.28.1
  - @graphql-mesh/store@0.3.24

## 0.31.0

### Minor Changes

- 6f07de8fe: feat(cli/config): add customization options to CLI

### Patch Changes

- 6f07de8fe: fix: do not import process from env
- b481fbc39: enhance: add tslib to dependencies to reduce bundle size
- Updated dependencies [6f07de8fe]
- Updated dependencies [6f07de8fe]
- Updated dependencies [b481fbc39]
  - @graphql-mesh/types@0.66.0
  - @graphql-mesh/utils@0.28.0
  - @graphql-mesh/runtime@0.31.8
  - @graphql-mesh/cache-inmemory-lru@0.5.53
  - @graphql-mesh/merger-bare@0.13.16
  - @graphql-mesh/merger-stitching@0.15.16
  - @graphql-mesh/store@0.3.23

## 0.30.7

### Patch Changes

- Updated dependencies [21de17a3d]
- Updated dependencies [3f4bb09a9]
  - @graphql-mesh/types@0.65.0
  - @graphql-mesh/utils@0.27.9
  - @graphql-mesh/cache-inmemory-lru@0.5.52
  - @graphql-mesh/merger-bare@0.13.15
  - @graphql-mesh/merger-stitching@0.15.15
  - @graphql-mesh/runtime@0.31.7
  - @graphql-mesh/store@0.3.22

## 0.30.6

### Patch Changes

- Updated dependencies [8b8eb5158]
- Updated dependencies [8b8eb5158]
  - @graphql-mesh/types@0.64.2
  - @graphql-mesh/cache-inmemory-lru@0.5.51
  - @graphql-mesh/merger-bare@0.13.14
  - @graphql-mesh/merger-stitching@0.15.14
  - @graphql-mesh/runtime@0.31.6
  - @graphql-mesh/utils@0.27.8
  - @graphql-mesh/store@0.3.21

## 0.30.5

### Patch Changes

- Updated dependencies [ca6bb5ff3]
  - @graphql-mesh/utils@0.27.7
  - @graphql-mesh/cache-inmemory-lru@0.5.50
  - @graphql-mesh/merger-bare@0.13.13
  - @graphql-mesh/merger-stitching@0.15.13
  - @graphql-mesh/runtime@0.31.5
  - @graphql-mesh/store@0.3.20
  - @graphql-mesh/types@0.64.1

## 0.30.4

### Patch Changes

- Updated dependencies [c84d9e95e]
  - @graphql-mesh/runtime@0.31.4

## 0.30.3

### Patch Changes

- Updated dependencies [08b250e04]
  - @graphql-mesh/types@0.64.0
  - @graphql-mesh/cache-inmemory-lru@0.5.49
  - @graphql-mesh/merger-bare@0.13.12
  - @graphql-mesh/merger-stitching@0.15.12
  - @graphql-mesh/runtime@0.31.3
  - @graphql-mesh/utils@0.27.6
  - @graphql-mesh/store@0.3.19

## 0.30.2

### Patch Changes

- 1815865c3: fix: bump fixed graphql-tools
- Updated dependencies [1815865c3]
  - @graphql-mesh/merger-bare@0.13.11
  - @graphql-mesh/merger-stitching@0.15.11
  - @graphql-mesh/runtime@0.31.2
  - @graphql-mesh/store@0.3.18
  - @graphql-mesh/types@0.63.1
  - @graphql-mesh/utils@0.27.5
  - @graphql-mesh/cache-inmemory-lru@0.5.48

## 0.30.1

### Patch Changes

- f0f2b69a0: fix(config): take correct merger during build
- f0f2b69a0: fix(config): pass importFn to cache constructor
- Updated dependencies [f202f53af]
  - @graphql-mesh/merger-bare@0.13.10
  - @graphql-mesh/merger-stitching@0.15.10
  - @graphql-mesh/runtime@0.31.1

## 0.30.0

### Minor Changes

- b6eca9baa: feat(core): Envelop integration

### Patch Changes

- Updated dependencies [b6eca9baa]
- Updated dependencies [b6eca9baa]
  - @graphql-mesh/types@0.63.0
  - @graphql-mesh/runtime@0.31.0
  - @graphql-mesh/cache-inmemory-lru@0.5.47
  - @graphql-mesh/merger-bare@0.13.9
  - @graphql-mesh/merger-stitching@0.15.9
  - @graphql-mesh/utils@0.27.4
  - @graphql-mesh/store@0.3.17

## 0.29.5

### Patch Changes

- Updated dependencies [0d43ecf19]
  - @graphql-mesh/runtime@0.30.4
  - @graphql-mesh/types@0.62.2
  - @graphql-mesh/cache-inmemory-lru@0.5.46
  - @graphql-mesh/merger-bare@0.13.8
  - @graphql-mesh/merger-stitching@0.15.8
  - @graphql-mesh/utils@0.27.3
  - @graphql-mesh/store@0.3.16

## 0.29.4

### Patch Changes

- Updated dependencies [3272bb516]
  - @graphql-mesh/runtime@0.30.3

## 0.29.3

### Patch Changes

- Updated dependencies [c71b29004]
- Updated dependencies [447bc3697]
  - @graphql-mesh/utils@0.27.2
  - @graphql-mesh/types@0.62.1
  - @graphql-mesh/cache-inmemory-lru@0.5.45
  - @graphql-mesh/merger-bare@0.13.7
  - @graphql-mesh/merger-stitching@0.15.7
  - @graphql-mesh/runtime@0.30.2
  - @graphql-mesh/store@0.3.15

## 0.29.2

### Patch Changes

- Updated dependencies [240ec7b38]
- Updated dependencies [fcbd12a35]
- Updated dependencies [fcbd12a35]
  - @graphql-mesh/types@0.62.0
  - @graphql-mesh/utils@0.27.1
  - @graphql-mesh/runtime@0.30.1
  - @graphql-mesh/cache-inmemory-lru@0.5.44
  - @graphql-mesh/merger-bare@0.13.6
  - @graphql-mesh/merger-stitching@0.15.6
  - @graphql-mesh/store@0.3.14

## 0.29.1

### Patch Changes

- Updated dependencies [900a01355]
- Updated dependencies [900a01355]
  - @graphql-mesh/utils@0.27.0
  - @graphql-mesh/runtime@0.30.0
  - @graphql-mesh/cache-inmemory-lru@0.5.43
  - @graphql-mesh/merger-bare@0.13.5
  - @graphql-mesh/merger-stitching@0.15.5
  - @graphql-mesh/store@0.3.13

## 0.29.0

### Minor Changes

- 66ca1a366: enhance(config): use print/parse for additionalTypeDefs in artifacts

### Patch Changes

- Updated dependencies [66ca1a366]
  - @graphql-mesh/types@0.61.0
  - @graphql-mesh/cache-inmemory-lru@0.5.42
  - @graphql-mesh/merger-bare@0.13.4
  - @graphql-mesh/merger-stitching@0.15.4
  - @graphql-mesh/runtime@0.29.3
  - @graphql-mesh/utils@0.26.4
  - @graphql-mesh/store@0.3.12

## 0.28.1

### Patch Changes

- Updated dependencies [a79268b3a]
- Updated dependencies [a79268b3a]
  - @graphql-mesh/types@0.60.0
  - @graphql-mesh/cache-inmemory-lru@0.5.41
  - @graphql-mesh/merger-bare@0.13.3
  - @graphql-mesh/merger-stitching@0.15.3
  - @graphql-mesh/runtime@0.29.2
  - @graphql-mesh/utils@0.26.3
  - @graphql-mesh/store@0.3.11

## 0.28.0

### Minor Changes

- 020431bdc: feat(cli): built-in typescript support

### Patch Changes

- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
  - @graphql-mesh/types@0.59.0
  - @graphql-mesh/cache-inmemory-lru@0.5.40
  - @graphql-mesh/merger-bare@0.13.2
  - @graphql-mesh/merger-stitching@0.15.2
  - @graphql-mesh/runtime@0.29.1
  - @graphql-mesh/utils@0.26.2
  - @graphql-mesh/store@0.3.10

## 0.27.5

### Patch Changes

- Updated dependencies [113091148]
- Updated dependencies [6bb4cf673]
- Updated dependencies [6601a949e]
- Updated dependencies [6601a949e]
  - @graphql-mesh/utils@0.26.1
  - @graphql-mesh/types@0.58.0
  - @graphql-mesh/runtime@0.29.0
  - @graphql-mesh/cache-inmemory-lru@0.5.39
  - @graphql-mesh/merger-bare@0.13.1
  - @graphql-mesh/merger-stitching@0.15.1
  - @graphql-mesh/store@0.3.9

## 0.27.4

### Patch Changes

- Updated dependencies [1ab0aebbc]
- Updated dependencies [f60bcb083]
- Updated dependencies [56e2257fa]
- Updated dependencies [56e2257fa]
  - @graphql-mesh/types@0.57.2
  - @graphql-mesh/merger-bare@0.13.0
  - @graphql-mesh/merger-stitching@0.15.0
  - @graphql-mesh/runtime@0.28.0
  - @graphql-mesh/utils@0.26.0
  - @graphql-mesh/cache-inmemory-lru@0.5.38
  - @graphql-mesh/store@0.3.8

## 0.27.3

### Patch Changes

- Updated dependencies [2b876f2b8]
  - @graphql-mesh/utils@0.25.0
  - @graphql-mesh/cache-inmemory-lru@0.5.37
  - @graphql-mesh/merger-bare@0.12.9
  - @graphql-mesh/merger-stitching@0.14.11
  - @graphql-mesh/runtime@0.27.1
  - @graphql-mesh/store@0.3.7

## 0.27.2

### Patch Changes

- Updated dependencies [d907351c5]
- Updated dependencies [80eb8e92b]
  - @graphql-mesh/types@0.57.1
  - @graphql-mesh/utils@0.24.2
  - @graphql-mesh/runtime@0.27.0
  - @graphql-mesh/cache-inmemory-lru@0.5.36
  - @graphql-mesh/merger-bare@0.12.8
  - @graphql-mesh/merger-stitching@0.14.10
  - @graphql-mesh/store@0.3.6

## 0.27.1

### Patch Changes

- Updated dependencies [26d685f2a]
  - @graphql-mesh/utils@0.24.1
  - @graphql-mesh/cache-inmemory-lru@0.5.35
  - @graphql-mesh/merger-bare@0.12.7
  - @graphql-mesh/merger-stitching@0.14.9
  - @graphql-mesh/runtime@0.26.10
  - @graphql-mesh/store@0.3.5

## 0.27.0

### Minor Changes

- cfca98d34: feat(utils): drop graphql-subscriptions and use events for PubSub Impl

### Patch Changes

- Updated dependencies [cfca98d34]
  - @graphql-mesh/types@0.57.0
  - @graphql-mesh/utils@0.24.0
  - @graphql-mesh/cache-inmemory-lru@0.5.34
  - @graphql-mesh/merger-bare@0.12.6
  - @graphql-mesh/merger-stitching@0.14.8
  - @graphql-mesh/runtime@0.26.9
  - @graphql-mesh/store@0.3.4

## 0.26.3

### Patch Changes

- Updated dependencies [5666484d6]
  - @graphql-mesh/utils@0.23.0
  - @graphql-mesh/cache-inmemory-lru@0.5.33
  - @graphql-mesh/merger-bare@0.12.5
  - @graphql-mesh/merger-stitching@0.14.7
  - @graphql-mesh/runtime@0.26.8
  - @graphql-mesh/store@0.3.3

## 0.26.2

### Patch Changes

- Updated dependencies [6c216c309]
  - @graphql-mesh/utils@0.22.2
  - @graphql-mesh/cache-inmemory-lru@0.5.32
  - @graphql-mesh/merger-bare@0.12.4
  - @graphql-mesh/merger-stitching@0.14.6
  - @graphql-mesh/runtime@0.26.7
  - @graphql-mesh/store@0.3.2

## 0.26.1

### Patch Changes

- Updated dependencies [c22eb1b5e]
  - @graphql-mesh/utils@0.22.1
  - @graphql-mesh/cache-inmemory-lru@0.5.31
  - @graphql-mesh/merger-bare@0.12.3
  - @graphql-mesh/merger-stitching@0.14.5
  - @graphql-mesh/runtime@0.26.6
  - @graphql-mesh/store@0.3.1

## 0.26.0

### Minor Changes

- ec0d1d639: enhance: avoid sync require but collect import sync

### Patch Changes

- 1cc0acb9a: fix: normalize imported modules
- Updated dependencies [ec0d1d639]
- Updated dependencies [ec0d1d639]
- Updated dependencies [1cc0acb9a]
  - @graphql-mesh/store@0.3.0
  - @graphql-mesh/types@0.56.0
  - @graphql-mesh/utils@0.22.0
  - @graphql-mesh/merger-stitching@0.14.4
  - @graphql-mesh/cache-inmemory-lru@0.5.30
  - @graphql-mesh/merger-bare@0.12.2
  - @graphql-mesh/runtime@0.26.5

## 0.25.5

### Patch Changes

- Updated dependencies [3bded2bad]
  - @graphql-mesh/runtime@0.26.4

## 0.25.4

### Patch Changes

- Updated dependencies [1b332487c]
  - @graphql-mesh/types@0.55.0
  - @graphql-mesh/cache-inmemory-lru@0.5.29
  - @graphql-mesh/merger-bare@0.12.1
  - @graphql-mesh/merger-stitching@0.14.3
  - @graphql-mesh/runtime@0.26.3
  - @graphql-mesh/utils@0.21.1
  - @graphql-mesh/store@0.2.3

## 0.25.3

### Patch Changes

- Updated dependencies [875d0e48d]
  - @graphql-mesh/merger-bare@0.12.0
  - @graphql-mesh/utils@0.21.0
  - @graphql-mesh/cache-inmemory-lru@0.5.28
  - @graphql-mesh/merger-stitching@0.14.2
  - @graphql-mesh/runtime@0.26.2
  - @graphql-mesh/store@0.2.2

## 0.25.2

### Patch Changes

- Updated dependencies [761b16ed9]
  - @graphql-mesh/types@0.54.1
  - @graphql-mesh/cache-inmemory-lru@0.5.27
  - @graphql-mesh/merger-bare@0.11.1
  - @graphql-mesh/merger-stitching@0.14.1
  - @graphql-mesh/runtime@0.26.1
  - @graphql-mesh/utils@0.20.1
  - @graphql-mesh/store@0.2.1

## 0.25.1

### Patch Changes

- Updated dependencies [0f476c201]
  - @graphql-mesh/runtime@0.26.0

## 0.25.0

### Minor Changes

- 09f81dd74: GraphQL v16 compatibility
- 09f81dd74: GraphQL v16 compability

### Patch Changes

- Updated dependencies [09f81dd74]
- Updated dependencies [267573a16]
- Updated dependencies [09f81dd74]
  - @graphql-mesh/merger-bare@0.11.0
  - @graphql-mesh/merger-stitching@0.14.0
  - @graphql-mesh/runtime@0.25.0
  - @graphql-mesh/store@0.2.0
  - @graphql-mesh/types@0.54.0
  - @graphql-mesh/utils@0.20.0
  - @graphql-mesh/cache-inmemory-lru@0.5.26

## 0.24.4

### Patch Changes

- Updated dependencies [0dc08e5cc]
  - @graphql-mesh/utils@0.19.0
  - @graphql-mesh/cache-inmemory-lru@0.5.25
  - @graphql-mesh/merger-bare@0.10.2
  - @graphql-mesh/merger-stitching@0.13.2
  - @graphql-mesh/runtime@0.24.1
  - @graphql-mesh/store@0.1.19

## 0.24.3

### Patch Changes

- Updated dependencies [eb3f68e4d]
  - @graphql-mesh/runtime@0.24.0

## 0.24.2

### Patch Changes

- f04d44327: fix(config): fix build

## 0.24.1

### Patch Changes

- 3a90e217e: Use bracket notation for handlers + transforms
- Updated dependencies [6f57be0c1]
  - @graphql-mesh/types@0.53.0
  - @graphql-mesh/cache-inmemory-lru@0.5.24
  - @graphql-mesh/merger-bare@0.10.1
  - @graphql-mesh/merger-stitching@0.13.1
  - @graphql-mesh/runtime@0.23.1
  - @graphql-mesh/utils@0.18.1
  - @graphql-mesh/store@0.1.18

## 0.24.0

### Minor Changes

- 4ec7a14ba: enhance: memoize parse/print document node

### Patch Changes

- Updated dependencies [4ec7a14ba]
- Updated dependencies [811960cdc]
- Updated dependencies [6f5ffe766]
  - @graphql-mesh/runtime@0.23.0
  - @graphql-mesh/utils@0.18.0
  - @graphql-mesh/merger-bare@0.10.0
  - @graphql-mesh/merger-stitching@0.13.0
  - @graphql-mesh/types@0.52.0
  - @graphql-mesh/cache-inmemory-lru@0.5.23
  - @graphql-mesh/store@0.1.17

## 0.23.8

### Patch Changes

- Updated dependencies [256abf5f7]
  - @graphql-mesh/runtime@0.22.0
  - @graphql-mesh/types@0.51.0
  - @graphql-mesh/cache-inmemory-lru@0.5.22
  - @graphql-mesh/merger-bare@0.9.27
  - @graphql-mesh/merger-stitching@0.12.7
  - @graphql-mesh/utils@0.17.2
  - @graphql-mesh/store@0.1.16

## 0.23.7

### Patch Changes

- Updated dependencies [8c9b709ae]
  - @graphql-mesh/types@0.50.0
  - @graphql-mesh/cache-inmemory-lru@0.5.21
  - @graphql-mesh/merger-bare@0.9.26
  - @graphql-mesh/merger-stitching@0.12.6
  - @graphql-mesh/runtime@0.21.2
  - @graphql-mesh/utils@0.17.1
  - @graphql-mesh/store@0.1.15

## 0.23.6

### Patch Changes

- Updated dependencies [7bd145769]
  - @graphql-mesh/utils@0.17.0
  - @graphql-mesh/cache-inmemory-lru@0.5.20
  - @graphql-mesh/merger-bare@0.9.25
  - @graphql-mesh/merger-stitching@0.12.5
  - @graphql-mesh/runtime@0.21.1
  - @graphql-mesh/store@0.1.14

## 0.23.5

### Patch Changes

- Updated dependencies [472c5887b]
- Updated dependencies [4263ed47e]
  - @graphql-mesh/utils@0.16.3
  - @graphql-mesh/runtime@0.21.0
  - @graphql-mesh/cache-inmemory-lru@0.5.19
  - @graphql-mesh/merger-bare@0.9.24
  - @graphql-mesh/merger-stitching@0.12.4
  - @graphql-mesh/store@0.1.13

## 0.23.4

### Patch Changes

- Updated dependencies [6ce43ddac]
  - @graphql-mesh/types@0.49.0
  - @graphql-mesh/cache-inmemory-lru@0.5.18
  - @graphql-mesh/merger-bare@0.9.23
  - @graphql-mesh/merger-stitching@0.12.3
  - @graphql-mesh/runtime@0.20.2
  - @graphql-mesh/utils@0.16.2
  - @graphql-mesh/store@0.1.12

## 0.23.3

### Patch Changes

- Updated dependencies [46a4f7b73]
- Updated dependencies [aa804d043]
- Updated dependencies [67552c8f8]
  - @graphql-mesh/utils@0.16.1
  - @graphql-mesh/types@0.48.0
  - @graphql-mesh/cache-inmemory-lru@0.5.17
  - @graphql-mesh/merger-bare@0.9.22
  - @graphql-mesh/merger-stitching@0.12.2
  - @graphql-mesh/runtime@0.20.1
  - @graphql-mesh/store@0.1.11

## 0.23.2

### Patch Changes

- Updated dependencies [1ac321346]
  - @graphql-mesh/merger-stitching@0.12.1

## 0.23.1

### Patch Changes

- Updated dependencies [f63907c73]
  - @graphql-mesh/merger-stitching@0.12.0

## 0.23.0

### Minor Changes

- 9eff8a396: enhance(logging): ability to filter debug messages

### Patch Changes

- Updated dependencies [9eff8a396]
  - @graphql-mesh/runtime@0.20.0
  - @graphql-mesh/types@0.47.0
  - @graphql-mesh/utils@0.16.0
  - @graphql-mesh/cache-inmemory-lru@0.5.16
  - @graphql-mesh/merger-bare@0.9.21
  - @graphql-mesh/merger-stitching@0.11.1
  - @graphql-mesh/store@0.1.10

## 0.22.0

### Minor Changes

- f4f30741d: enhance(config): use bare merger if there is only one source
- f4f30741d: enhance(artifacts): no more execute additional resolvers during build

### Patch Changes

- Updated dependencies [f4f30741d]
- Updated dependencies [f4f30741d]
  - @graphql-mesh/merger-stitching@0.11.0
  - @graphql-mesh/utils@0.15.0
  - @graphql-mesh/cache-inmemory-lru@0.5.15
  - @graphql-mesh/merger-bare@0.9.20
  - @graphql-mesh/runtime@0.19.1
  - @graphql-mesh/store@0.1.9

## 0.21.0

### Minor Changes

- 4545fe72d: Some improvements on additional resolvers;

  - Now you can point to the nested fields in `keyArgs`; e.g. `keysArg: "where.ids"`
  - You don't need `returnType` for abstract types anymore, because it's inferred from the type of `targetFieldName`.

- 06d688e70: feat(config): new skipSSLValidation configuration field that disabled SSL check on HTTP requests

### Patch Changes

- Updated dependencies [4545fe72d]
- Updated dependencies [d189b4034]
- Updated dependencies [f23820ed0]
- Updated dependencies [06d688e70]
  - @graphql-mesh/runtime@0.19.0
  - @graphql-mesh/types@0.46.0
  - @graphql-mesh/utils@0.14.0
  - @graphql-mesh/cache-inmemory-lru@0.5.14
  - @graphql-mesh/merger-stitching@0.10.8
  - @graphql-mesh/store@0.1.8

## 0.20.1

### Patch Changes

- fc51c574d: Dependency updates
- Updated dependencies [fc51c574d]
  - @graphql-mesh/cache-inmemory-lru@0.5.13
  - @graphql-mesh/merger-stitching@0.10.7
  - @graphql-mesh/runtime@0.18.7
  - @graphql-mesh/store@0.1.7
  - @graphql-mesh/types@0.45.2
  - @graphql-mesh/utils@0.13.7

## 0.20.0

### Minor Changes

- 3ddf29c8e: enhance(config/cli): breaking change by moving findAndParseConfig to cli package and remove parseConfig

## 0.19.8

### Patch Changes

- Updated dependencies [1c2667489]
  - @graphql-mesh/types@0.45.1
  - @graphql-mesh/cache-inmemory-lru@0.5.12
  - @graphql-mesh/merger-stitching@0.10.6
  - @graphql-mesh/runtime@0.18.6
  - @graphql-mesh/utils@0.13.6
  - @graphql-mesh/store@0.1.6

## 0.19.7

### Patch Changes

- Updated dependencies [7080a2f1d]
  - @graphql-mesh/utils@0.13.5
  - @graphql-mesh/cache-inmemory-lru@0.5.11
  - @graphql-mesh/merger-stitching@0.10.5
  - @graphql-mesh/runtime@0.18.5
  - @graphql-mesh/store@0.1.5

## 0.19.6

### Patch Changes

- 0c97b4b75: fix(config): Yarn PnP Support
- Updated dependencies [6266d1774]
- Updated dependencies [94606e7b9]
- Updated dependencies [cb70939cc]
- Updated dependencies [2b8dae1cb]
- Updated dependencies [0c97b4b75]
  - @graphql-mesh/types@0.45.0
  - @graphql-mesh/merger-stitching@0.10.4
  - @graphql-mesh/runtime@0.18.4
  - @graphql-mesh/utils@0.13.4
  - @graphql-mesh/cache-inmemory-lru@0.5.10
  - @graphql-mesh/store@0.1.4

## 0.19.5

### Patch Changes

- Updated dependencies [25d10cc23]
  - @graphql-mesh/types@0.44.2
  - @graphql-mesh/cache-inmemory-lru@0.5.9
  - @graphql-mesh/merger-stitching@0.10.3
  - @graphql-mesh/runtime@0.18.3
  - @graphql-mesh/utils@0.13.3
  - @graphql-mesh/store@0.1.3

## 0.19.4

### Patch Changes

- Updated dependencies [49c8ceb38]
  - @graphql-mesh/merger-stitching@0.10.2
  - @graphql-mesh/runtime@0.18.2
  - @graphql-mesh/types@0.44.1
  - @graphql-mesh/utils@0.13.2
  - @graphql-mesh/cache-inmemory-lru@0.5.8
  - @graphql-mesh/store@0.1.2

## 0.19.3

### Patch Changes

- Updated dependencies [1ee417e3d]
  - @graphql-mesh/types@0.44.0
  - @graphql-mesh/cache-inmemory-lru@0.5.7
  - @graphql-mesh/merger-stitching@0.10.1
  - @graphql-mesh/runtime@0.18.1
  - @graphql-mesh/utils@0.13.1
  - @graphql-mesh/store@0.1.1

## 0.19.2

### Patch Changes

- e42206753: fix(config): update redis configuration

## 0.19.1

### Patch Changes

- a5f086a58: fix(config): fix type issues on earlier Node versions

## 0.19.0

### Minor Changes

- e5fdcfdcc: fix(config): do not ignore additional resolvers while building artifacts

### Patch Changes

- Updated dependencies [e5fdcfdcc]
  - @graphql-mesh/runtime@0.18.0

## 0.18.0

### Minor Changes

- 885ea439a: New MeshStore approach

### Patch Changes

- Updated dependencies [885ea439a]
- Updated dependencies [d8051f87d]
- Updated dependencies [885ea439a]
- Updated dependencies [d8051f87d]
  - @graphql-mesh/store@0.1.0
  - @graphql-mesh/types@0.43.0
  - @graphql-mesh/utils@0.13.0
  - @graphql-mesh/merger-stitching@0.10.0
  - @graphql-mesh/cache-inmemory-lru@0.5.6
  - @graphql-mesh/runtime@0.17.1

## 0.17.0

### Minor Changes

- 01cf89298: feat(runtime/config): enable Type Merging

### Patch Changes

- Updated dependencies [01cf89298]
  - @graphql-mesh/runtime@0.17.0

## 0.16.6

### Patch Changes

- Updated dependencies [bdb58dfec]
  - @graphql-mesh/utils@0.12.0
  - @graphql-mesh/merger-stitching@0.9.8
  - @graphql-mesh/runtime@0.16.6

## 0.16.5

### Patch Changes

- Updated dependencies [7d0e33660]
  - @graphql-mesh/utils@0.11.4
  - @graphql-mesh/merger-stitching@0.9.7
  - @graphql-mesh/runtime@0.16.5

## 0.16.4

### Patch Changes

- Updated dependencies [cfb517b3d]
  - @graphql-mesh/types@0.42.0
  - @graphql-mesh/cache-inmemory-lru@0.5.5
  - @graphql-mesh/merger-stitching@0.9.6
  - @graphql-mesh/runtime@0.16.4

## 0.16.3

### Patch Changes

- Updated dependencies [3c4c51100]
  - @graphql-mesh/merger-stitching@0.9.5
  - @graphql-mesh/runtime@0.16.3
  - @graphql-mesh/utils@0.11.3

## 0.16.2

### Patch Changes

- e6acdbd7d: enhance(runtime): do not compose unnecessary resolvers
- Updated dependencies [e6acdbd7d]
  - @graphql-mesh/merger-stitching@0.9.4
  - @graphql-mesh/runtime@0.16.2
  - @graphql-mesh/types@0.41.1
  - @graphql-mesh/utils@0.11.2
  - @graphql-mesh/cache-inmemory-lru@0.5.4

## 0.16.1

### Patch Changes

- Updated dependencies [69c89666d]
  - @graphql-mesh/utils@0.11.1
  - @graphql-mesh/merger-stitching@0.9.3
  - @graphql-mesh/runtime@0.16.1

## 0.16.0

### Minor Changes

- 214b7a23c: feat(runtime): Type Merging support

### Patch Changes

- Updated dependencies [214b7a23c]
  - @graphql-mesh/runtime@0.16.0
  - @graphql-mesh/types@0.41.0
  - @graphql-mesh/cache-inmemory-lru@0.5.3
  - @graphql-mesh/merger-stitching@0.9.2

## 0.15.7

### Patch Changes

- Updated dependencies [1f4655ee6]
  - @graphql-mesh/runtime@0.15.0

## 0.15.6

### Patch Changes

- Updated dependencies [0d2f7bfcd]
  - @graphql-mesh/types@0.40.0
  - @graphql-mesh/cache-inmemory-lru@0.5.2
  - @graphql-mesh/merger-stitching@0.9.1
  - @graphql-mesh/runtime@0.14.1

## 0.15.5

### Patch Changes

- Updated dependencies [1caa8ffd3]
  - @graphql-mesh/merger-stitching@0.9.0
  - @graphql-mesh/runtime@0.14.0
  - @graphql-mesh/utils@0.11.0

## 0.15.4

### Patch Changes

- Updated dependencies [6c90e0e39]
  - @graphql-mesh/types@0.39.0
  - @graphql-mesh/cache-inmemory-lru@0.5.1
  - @graphql-mesh/merger-stitching@0.8.1
  - @graphql-mesh/runtime@0.13.4

## 0.15.3

### Patch Changes

- Updated dependencies [346fe9c61]
- Updated dependencies [f89497389]
  - @graphql-mesh/cache-inmemory-lru@0.5.0
  - @graphql-mesh/merger-stitching@0.8.0
  - @graphql-mesh/types@0.38.0
  - @graphql-mesh/utils@0.10.0
  - @graphql-mesh/runtime@0.13.3

## 0.15.2

### Patch Changes

- Updated dependencies [4b57f7496]
- Updated dependencies [4b57f7496]
  - @graphql-mesh/types@0.37.0
  - @graphql-mesh/cache-inmemory-lru@0.4.53
  - @graphql-mesh/merger-stitching@0.7.37
  - @graphql-mesh/runtime@0.13.2

## 0.15.1

### Patch Changes

- b77148a04: fix(npm-publish): bump all versions to publish again
- Updated dependencies [b77148a04]
  - @graphql-mesh/cache-inmemory-lru@0.4.52
  - @graphql-mesh/merger-stitching@0.7.36
  - @graphql-mesh/runtime@0.13.1
  - @graphql-mesh/types@0.36.1
  - @graphql-mesh/utils@0.9.2

## 0.15.0

### Minor Changes

- 634a8a134: feat(config): introduce introspection cache

### Patch Changes

- Updated dependencies [634a8a134]
- Updated dependencies [6b8b23a4e]
- Updated dependencies [2c3312f1a]
- Updated dependencies [d12c7d978]
  - @graphql-mesh/runtime@0.13.0
  - @graphql-mesh/types@0.36.0
  - @graphql-mesh/utils@0.9.1
  - @graphql-mesh/cache-inmemory-lru@0.4.51
  - @graphql-mesh/merger-stitching@0.7.35

## 0.14.3

### Patch Changes

- Updated dependencies [0b175305a]
  - @graphql-mesh/runtime@0.12.0

## 0.14.2

### Patch Changes

- 939f9beb5: fix(config): move Object.keys fix outside of source code

## 0.14.1

### Patch Changes

- 191a663a: enhance(config): no need to load stitching merger lazily
- Updated dependencies [191a663a]
  - @graphql-mesh/types@0.35.1
  - @graphql-mesh/cache-inmemory-lru@0.4.50
  - @graphql-mesh/merger-stitching@0.7.34
  - @graphql-mesh/runtime@0.11.9

## 0.14.0

### Minor Changes

- b9ca0c30: Make Transforms and Handlers base-dir aware

### Patch Changes

- Updated dependencies [b9ca0c30]
  - @graphql-mesh/types@0.35.0
  - @graphql-mesh/utils@0.9.0
  - @graphql-mesh/cache-inmemory-lru@0.4.49
  - @graphql-mesh/merger-stitching@0.7.33
  - @graphql-mesh/runtime@0.11.8

## 0.13.7

### Patch Changes

- Updated dependencies [cf58cd5c]
  - @graphql-mesh/runtime@0.11.7

## 0.13.6

### Patch Changes

- Updated dependencies [ec89a923]
- Updated dependencies [ec89a923]
  - @graphql-mesh/utils@0.8.8
  - @graphql-mesh/runtime@0.11.6
  - @graphql-mesh/merger-stitching@0.7.32

## 0.13.5

### Patch Changes

- Updated dependencies [55327fd6]
  - @graphql-mesh/types@0.34.1
  - @graphql-mesh/cache-inmemory-lru@0.4.48
  - @graphql-mesh/merger-stitching@0.7.31
  - @graphql-mesh/runtime@0.11.5

## 0.13.4

### Patch Changes

- Updated dependencies [76051dd7]
  - @graphql-mesh/types@0.34.0
  - @graphql-mesh/cache-inmemory-lru@0.4.47
  - @graphql-mesh/merger-stitching@0.7.30
  - @graphql-mesh/runtime@0.11.4

## 0.13.3

### Patch Changes

- Updated dependencies [646d6bdb]
  - @graphql-mesh/types@0.33.0
  - @graphql-mesh/cache-inmemory-lru@0.4.46
  - @graphql-mesh/merger-stitching@0.7.29
  - @graphql-mesh/runtime@0.11.3

## 0.13.2

### Patch Changes

- Updated dependencies [68d6b117]
  - @graphql-mesh/types@0.32.0
  - @graphql-mesh/cache-inmemory-lru@0.4.45
  - @graphql-mesh/merger-stitching@0.7.28
  - @graphql-mesh/runtime@0.11.2

## 0.13.1

### Patch Changes

- Updated dependencies [212f2d66]
  - @graphql-mesh/types@0.31.1
  - @graphql-mesh/cache-inmemory-lru@0.4.44
  - @graphql-mesh/merger-stitching@0.7.27
  - @graphql-mesh/runtime@0.11.1

## 0.13.0

### Minor Changes

- 77327988: feat(runtime): Live Queries Support

### Patch Changes

- Updated dependencies [77327988]
  - @graphql-mesh/runtime@0.11.0
  - @graphql-mesh/types@0.31.0
  - @graphql-mesh/cache-inmemory-lru@0.4.43
  - @graphql-mesh/merger-stitching@0.7.26

## 0.12.6

### Patch Changes

- Updated dependencies [48f38a4a]
  - @graphql-mesh/types@0.30.1
  - @graphql-mesh/cache-inmemory-lru@0.4.42
  - @graphql-mesh/merger-stitching@0.7.25
  - @graphql-mesh/runtime@0.10.26

## 0.12.5

### Patch Changes

- Updated dependencies [938cca26]
  - @graphql-mesh/types@0.30.0
  - @graphql-mesh/cache-inmemory-lru@0.4.41
  - @graphql-mesh/merger-stitching@0.7.24
  - @graphql-mesh/runtime@0.10.25

## 0.12.4

### Patch Changes

- Updated dependencies [8ef29de1]
  - @graphql-mesh/types@0.29.4
  - @graphql-mesh/cache-inmemory-lru@0.4.40
  - @graphql-mesh/merger-stitching@0.7.23
  - @graphql-mesh/runtime@0.10.24

## 0.12.3

### Patch Changes

- Updated dependencies [a02d86c3]
- Updated dependencies [a02d86c3]
- Updated dependencies [a02d86c3]
  - @graphql-mesh/types@0.29.3
  - @graphql-mesh/runtime@0.10.23
  - @graphql-mesh/cache-inmemory-lru@0.4.39
  - @graphql-mesh/merger-stitching@0.7.22

## 0.12.2

### Patch Changes

- Updated dependencies [69d2198d]
  - @graphql-mesh/utils@0.8.7
  - @graphql-mesh/merger-stitching@0.7.21
  - @graphql-mesh/runtime@0.10.22

## 0.12.1

### Patch Changes

- Updated dependencies [bf6c517d]
  - @graphql-mesh/runtime@0.10.21

## 0.12.0

### Minor Changes

- 63e12ef3: Better config validations, allow to set --dir in cli for base path

## 0.11.20

### Patch Changes

- Updated dependencies [8e8848e1]
  - @graphql-mesh/types@0.29.2
  - @graphql-mesh/cache-inmemory-lru@0.4.38
  - @graphql-mesh/merger-stitching@0.7.20
  - @graphql-mesh/runtime@0.10.20

## 0.11.19

### Patch Changes

- Updated dependencies [7e970f09]
  - @graphql-mesh/utils@0.8.6
  - @graphql-mesh/merger-stitching@0.7.19
  - @graphql-mesh/runtime@0.10.19

## 0.11.18

### Patch Changes

- Updated dependencies [e8994875]
  - @graphql-mesh/types@0.29.1
  - @graphql-mesh/cache-inmemory-lru@0.4.37
  - @graphql-mesh/merger-stitching@0.7.18
  - @graphql-mesh/runtime@0.10.18

## 0.11.17

### Patch Changes

- Updated dependencies [8d345721]
  - @graphql-mesh/utils@0.8.5
  - @graphql-mesh/merger-stitching@0.7.17
  - @graphql-mesh/runtime@0.10.17

## 0.11.16

### Patch Changes

- Updated dependencies [c767df01]
- Updated dependencies [183cfa96]
- Updated dependencies [b3d7ecbf]
  - @graphql-mesh/runtime@0.10.16
  - @graphql-mesh/types@0.29.0
  - @graphql-mesh/utils@0.8.4
  - @graphql-mesh/cache-inmemory-lru@0.4.36
  - @graphql-mesh/merger-stitching@0.7.16

## 0.11.15

### Patch Changes

- Updated dependencies [a22fc6f3]
  - @graphql-mesh/types@0.28.0
  - @graphql-mesh/cache-inmemory-lru@0.4.35
  - @graphql-mesh/merger-stitching@0.7.15
  - @graphql-mesh/runtime@0.10.15

## 0.11.14

### Patch Changes

- Updated dependencies [c1de3e43]
  - @graphql-mesh/types@0.27.0
  - @graphql-mesh/cache-inmemory-lru@0.4.34
  - @graphql-mesh/merger-stitching@0.7.14
  - @graphql-mesh/runtime@0.10.14

## 0.11.13

### Patch Changes

- Updated dependencies [75f6dff9]
- Updated dependencies [c4f207a7]
  - @graphql-mesh/types@0.26.0
  - @graphql-mesh/cache-inmemory-lru@0.4.33
  - @graphql-mesh/merger-stitching@0.7.13
  - @graphql-mesh/runtime@0.10.13

## 0.11.12

### Patch Changes

- Updated dependencies [0df817d0]
  - @graphql-mesh/types@0.25.0
  - @graphql-mesh/cache-inmemory-lru@0.4.32
  - @graphql-mesh/merger-stitching@0.7.12
  - @graphql-mesh/runtime@0.10.12

## 0.11.11

### Patch Changes

- 08c2966e: chore(config): update ajv
- Updated dependencies [08c2966e]
  - @graphql-mesh/utils@0.8.3
  - @graphql-mesh/merger-stitching@0.7.11
  - @graphql-mesh/runtime@0.10.11

## 0.11.10

### Patch Changes

- Updated dependencies [b6262481]
  - @graphql-mesh/types@0.24.0
  - @graphql-mesh/cache-inmemory-lru@0.4.31
  - @graphql-mesh/merger-stitching@0.7.10
  - @graphql-mesh/runtime@0.10.10

## 0.11.9

### Patch Changes

- Updated dependencies [e5b38574]
  - @graphql-mesh/types@0.23.3
  - @graphql-mesh/cache-inmemory-lru@0.4.30
  - @graphql-mesh/merger-stitching@0.7.9
  - @graphql-mesh/runtime@0.10.9

## 0.11.8

### Patch Changes

- Updated dependencies [c85a54eb]
  - @graphql-mesh/utils@0.8.2
  - @graphql-mesh/merger-stitching@0.7.8
  - @graphql-mesh/runtime@0.10.8

## 0.11.7

### Patch Changes

- Updated dependencies [c614e796]
  - @graphql-mesh/types@0.23.2
  - @graphql-mesh/cache-inmemory-lru@0.4.29
  - @graphql-mesh/merger-stitching@0.7.7
  - @graphql-mesh/runtime@0.10.7

## 0.11.6

### Patch Changes

- Updated dependencies [59d77fb8]
  - @graphql-mesh/types@0.23.1
  - @graphql-mesh/cache-inmemory-lru@0.4.28
  - @graphql-mesh/merger-stitching@0.7.6
  - @graphql-mesh/runtime@0.10.6

## 0.11.5

### Patch Changes

- 0129bebb: fixed generated .d.ts files for the config package
- Updated dependencies [e5cd44f5]
  - @graphql-mesh/types@0.23.0
  - @graphql-mesh/cache-inmemory-lru@0.4.27
  - @graphql-mesh/merger-stitching@0.7.5
  - @graphql-mesh/runtime@0.10.5

## 0.11.4

### Patch Changes

- Updated dependencies [2fd59a83]
  - @graphql-mesh/types@0.22.0
  - @graphql-mesh/cache-inmemory-lru@0.4.26
  - @graphql-mesh/merger-stitching@0.7.4
  - @graphql-mesh/runtime@0.10.4

## 0.11.3

### Patch Changes

- Updated dependencies [c064e3a8]
  - @graphql-mesh/types@0.21.1
  - @graphql-mesh/utils@0.8.1
  - @graphql-mesh/cache-inmemory-lru@0.4.25
  - @graphql-mesh/merger-stitching@0.7.3
  - @graphql-mesh/runtime@0.10.3

## 0.11.2

### Patch Changes

- Updated dependencies [1f0b2f1f]
- Updated dependencies [03f41cd0]
  - @graphql-mesh/merger-stitching@0.7.2
  - @graphql-mesh/runtime@0.10.2
  - @graphql-mesh/types@0.21.0
  - @graphql-mesh/cache-inmemory-lru@0.4.24

## 0.11.1

### Patch Changes

- Updated dependencies [1e7fd602]
  - @graphql-mesh/types@0.20.1
  - @graphql-mesh/cache-inmemory-lru@0.4.23
  - @graphql-mesh/merger-stitching@0.7.1
  - @graphql-mesh/runtime@0.10.1

## 0.11.0

### Minor Changes

- 2d14fcc3: bump graphql-tools to v7

### Patch Changes

- Updated dependencies [2d14fcc3]
- Updated dependencies [2d14fcc3]
  - @graphql-mesh/types@0.20.0
  - @graphql-mesh/merger-stitching@0.7.0
  - @graphql-mesh/runtime@0.10.0
  - @graphql-mesh/utils@0.8.0
  - @graphql-mesh/cache-inmemory-lru@0.4.22

## 0.10.19

### Patch Changes

- bf3e1d3a: feat(config): support code files in additionalTypeDefs

## 0.10.18

### Patch Changes

- Updated dependencies [c9a272f7]
  - @graphql-mesh/runtime@0.9.0

## 0.10.17

### Patch Changes

- Updated dependencies [c1b073de]
  - @graphql-mesh/runtime@0.8.0
  - @graphql-mesh/types@0.19.0
  - @graphql-mesh/utils@0.7.0
  - @graphql-mesh/cache-inmemory-lru@0.4.21
  - @graphql-mesh/merger-stitching@0.6.21

## 0.10.16

### Patch Changes

- Updated dependencies [5628fb14]
  - @graphql-mesh/types@0.18.0
  - @graphql-mesh/cache-inmemory-lru@0.4.20
  - @graphql-mesh/merger-stitching@0.6.20
  - @graphql-mesh/runtime@0.7.15

## 0.10.15

### Patch Changes

- Updated dependencies [0560e806]
  - @graphql-mesh/types@0.17.1
  - @graphql-mesh/cache-inmemory-lru@0.4.19
  - @graphql-mesh/merger-stitching@0.6.19
  - @graphql-mesh/runtime@0.7.14

## 0.10.14

### Patch Changes

- Updated dependencies [c26c8c56]
  - @graphql-mesh/types@0.17.0
  - @graphql-mesh/cache-inmemory-lru@0.4.18
  - @graphql-mesh/merger-stitching@0.6.18
  - @graphql-mesh/runtime@0.7.13

## 0.10.13

### Patch Changes

- Updated dependencies [3770af72]
  - @graphql-mesh/types@0.16.1
  - @graphql-mesh/cache-inmemory-lru@0.4.17
  - @graphql-mesh/merger-stitching@0.6.17
  - @graphql-mesh/runtime@0.7.12

## 0.10.12

### Patch Changes

- Updated dependencies [8d2628b8]
  - @graphql-mesh/merger-stitching@0.6.16

## 0.10.11

### Patch Changes

- Updated dependencies [3ee10180]
  - @graphql-mesh/types@0.16.0
  - @graphql-mesh/cache-inmemory-lru@0.4.16
  - @graphql-mesh/merger-stitching@0.6.15
  - @graphql-mesh/runtime@0.7.11

## 0.10.10

### Patch Changes

- Updated dependencies [0f17c58c]
  - @graphql-mesh/types@0.15.0
  - @graphql-mesh/cache-inmemory-lru@0.4.15
  - @graphql-mesh/merger-stitching@0.6.14
  - @graphql-mesh/runtime@0.7.10

## 0.10.9

### Patch Changes

- Updated dependencies [937c87d2]
  - @graphql-mesh/types@0.14.1
  - @graphql-mesh/cache-inmemory-lru@0.4.14
  - @graphql-mesh/merger-stitching@0.6.13
  - @graphql-mesh/runtime@0.7.9

## 0.10.8

### Patch Changes

- Updated dependencies [f6dae19b]
  - @graphql-mesh/runtime@0.7.8

## 0.10.7

### Patch Changes

- Updated dependencies [bd26407b]
  - @graphql-mesh/runtime@0.7.7

## 0.10.6

### Patch Changes

- Updated dependencies [1e0445ee]
  - @graphql-mesh/types@0.14.0
  - @graphql-mesh/cache-inmemory-lru@0.4.13
  - @graphql-mesh/merger-stitching@0.6.12
  - @graphql-mesh/runtime@0.7.6

## 0.10.5

### Patch Changes

- Updated dependencies [b50a68e3]
  - @graphql-mesh/types@0.13.0
  - @graphql-mesh/cache-inmemory-lru@0.4.12
  - @graphql-mesh/merger-stitching@0.6.11
  - @graphql-mesh/runtime@0.7.5

## 0.10.4

### Patch Changes

- Updated dependencies [3b658014]
- Updated dependencies [e2b34219]
- Updated dependencies [9a7a55c4]
- Updated dependencies [3b658014]
  - @graphql-mesh/merger-stitching@0.6.10
  - @graphql-mesh/types@0.12.0
  - @graphql-mesh/utils@0.6.0
  - @graphql-mesh/runtime@0.7.4
  - @graphql-mesh/cache-inmemory-lru@0.4.11

## 0.10.3

### Patch Changes

- a3b42cfd: fix(runtime): handle transforms correctly for single source
- Updated dependencies [864ca71d]
- Updated dependencies [2dedda3c]
- Updated dependencies [a3b42cfd]
  - @graphql-mesh/merger-stitching@0.6.9
  - @graphql-mesh/types@0.11.3
  - @graphql-mesh/cache-inmemory-lru@0.4.10
  - @graphql-mesh/runtime@0.7.3
  - @graphql-mesh/utils@0.5.4

## 0.10.2

### Patch Changes

- 6d624576: fix(types): fix Any scalar type in json schema
- Updated dependencies [6d624576]
  - @graphql-mesh/types@0.11.2
  - @graphql-mesh/cache-inmemory-lru@0.4.9
  - @graphql-mesh/merger-stitching@0.6.8
  - @graphql-mesh/runtime@0.7.2

## 0.10.1

### Patch Changes

- 405cec23: enhance(types): improve typings for PubSub
- Updated dependencies [405cec23]
  - @graphql-mesh/types@0.11.1
  - @graphql-mesh/cache-inmemory-lru@0.4.8
  - @graphql-mesh/merger-stitching@0.6.7
  - @graphql-mesh/runtime@0.7.1

## 0.10.0

### Minor Changes

- 48d89de2: feat(serve): able to provide custom handlers for webhooks
- 48d89de2: feat(runtime): replace hooks with pubsub logic

### Patch Changes

- Updated dependencies [2e7d4fb0]
- Updated dependencies [48d89de2]
  - @graphql-mesh/runtime@0.7.0
  - @graphql-mesh/types@0.11.0
  - @graphql-mesh/cache-inmemory-lru@0.4.7
  - @graphql-mesh/merger-stitching@0.6.6

## 0.9.0

### Minor Changes

- 79adf4b6: feat(config): support functions as config property

### Patch Changes

- Updated dependencies [79adf4b6]
- Updated dependencies [79adf4b6]
- Updated dependencies [2241323d]
  - @graphql-mesh/utils@0.5.3
  - @graphql-mesh/types@0.10.0
  - @graphql-mesh/merger-stitching@0.6.5
  - @graphql-mesh/runtime@0.6.5
  - @graphql-mesh/cache-inmemory-lru@0.4.6

## 0.8.4

### Patch Changes

- Updated dependencies [2d5cc25b]
  - @graphql-mesh/types@0.9.2
  - @graphql-mesh/cache-inmemory-lru@0.4.5
  - @graphql-mesh/merger-stitching@0.6.4
  - @graphql-mesh/runtime@0.6.4

## 0.8.3

### Patch Changes

- Updated dependencies [93ad5255]
  - @graphql-mesh/types@0.9.1
  - @graphql-mesh/cache-inmemory-lru@0.4.4
  - @graphql-mesh/merger-stitching@0.6.3
  - @graphql-mesh/runtime@0.6.3

## 0.8.2

### Patch Changes

- Updated dependencies [9900d2fa]
- Updated dependencies [9900d2fa]
  - @graphql-mesh/merger-stitching@0.6.2
  - @graphql-mesh/runtime@0.6.2
  - @graphql-mesh/utils@0.5.2

## 0.8.1

### Patch Changes

- Updated dependencies [c8d9695e]
- Updated dependencies [8f53be10]
  - @graphql-mesh/types@0.9.0
  - @graphql-mesh/utils@0.5.1
  - @graphql-mesh/cache-inmemory-lru@0.4.3
  - @graphql-mesh/merger-stitching@0.6.1
  - @graphql-mesh/runtime@0.6.1

## 0.8.0

### Minor Changes

- 6aef18be: enhance(config): support custom handlers, transforms and cache impl. in yaml/json config schema

### Patch Changes

- Updated dependencies [d2e56567]
- Updated dependencies [6aef18be]
- Updated dependencies [6aef18be]
  - @graphql-mesh/merger-stitching@0.6.0
  - @graphql-mesh/types@0.8.1
  - @graphql-mesh/runtime@0.6.0
  - @graphql-mesh/cache-inmemory-lru@0.4.2

## 0.7.0

### Minor Changes

- a789c312: feat(stitching): use batch execution

### Patch Changes

- Updated dependencies [a789c312]
  - @graphql-mesh/merger-stitching@0.5.0
  - @graphql-mesh/runtime@0.5.0
  - @graphql-mesh/types@0.8.0
  - @graphql-mesh/utils@0.5.0
  - @graphql-mesh/cache-inmemory-lru@0.4.1

## 0.6.0

### Minor Changes

- 718e7a16: fix(runtime): fix browser support

### Patch Changes

- Updated dependencies [718e7a16]
  - @graphql-mesh/cache-inmemory-lru@0.4.0
  - @graphql-mesh/merger-stitching@0.4.0
  - @graphql-mesh/runtime@0.4.0
  - @graphql-mesh/types@0.7.0
  - @graphql-mesh/utils@0.4.0

## 0.5.0

### Minor Changes

- a76d74bb: feat(config): able to configure serve command in mesh config file

### Patch Changes

- Updated dependencies [5067ac73]
- Updated dependencies [a76d74bb]
  - @graphql-mesh/types@0.6.0
  - @graphql-mesh/cache-inmemory-lru@0.3.2
  - @graphql-mesh/merger-stitching@0.3.2
  - @graphql-mesh/runtime@0.3.2

## 0.4.1

### Patch Changes

- Updated dependencies [dde7878b]
  - @graphql-mesh/runtime@0.3.1
  - @graphql-mesh/types@0.5.1
  - @graphql-mesh/cache-inmemory-lru@0.3.1
  - @graphql-mesh/merger-stitching@0.3.1

## 0.4.0

### Minor Changes

- 705c4626: introduce an independent config package

### Patch Changes

- Updated dependencies [705c4626]
  - @graphql-mesh/cache-inmemory-lru@0.3.0
  - @graphql-mesh/merger-stitching@0.3.0
  - @graphql-mesh/runtime@0.3.0
  - @graphql-mesh/types@0.5.0
  - @graphql-mesh/utils@0.3.0
