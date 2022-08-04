# json-machete

## 0.10.6

### Patch Changes

- [#4221](https://github.com/Urigo/graphql-mesh/pull/4221) [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834) Thanks [@ardatan](https://github.com/ardatan)! - Respect "required" field in anyOf and allOf schemas and fix the bug that puts an Any schema if this kind of schema is present

* [#4237](https://github.com/Urigo/graphql-mesh/pull/4237) [`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18) Thanks [@ardatan](https://github.com/ardatan)! - - Respect `pattern` of `number` types
  - Dereference first-level circular dependencies properly in `dereferenceObject`
  - Do not make the schema single if there is one `allOf` or `anyOf` element but with properties

- [#4216](https://github.com/Urigo/graphql-mesh/pull/4216) [`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b) Thanks [@ardatan](https://github.com/ardatan)! - Rewrite JSON Schema visitor and support circular dependencies in a better way

  Now `visitJSONSchema` takes two different visitor functions instead of `enter` and `leave`, previously we used to handle only `leave`.

  Also `generateInterfaceFromSharedFields` has been dropped for now because it wasn't working as expected.

* [#4221](https://github.com/Urigo/graphql-mesh/pull/4221) [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834) Thanks [@ardatan](https://github.com/ardatan)! - Use single "Any" schema for unknown types defined in "required" in order to prevent duplication

* Updated dependencies [[`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18)]:
  - @graphql-mesh/utils@0.37.7

## 0.10.5

### Patch Changes

- @graphql-mesh/utils@0.37.6

## 0.10.4

### Patch Changes

- Updated dependencies [30d046724]
  - @graphql-mesh/utils@0.37.5

## 0.10.3

### Patch Changes

- @graphql-mesh/utils@0.37.4

## 0.10.2

### Patch Changes

- a2ef35c35: ** Use the new `@whatwg-node/fetch` package instead of `cross-undici-fetch`**

  `cross-undici-fetch` has been renamed to `@whatwg-node-fetch`. Now Mesh uses this new package.

  ** BREAKING: Drop `serve.handlers` in favor of the new plugin system **

  Now Mesh uses the new plugin system of GraphQL Yoga that uses WHATWG Fetch API instead of Node specific `serve.handlers`. That means you can use those plugins with any environment even if you are not using Node.js with `mesh start`.

  Please check our docs to see how you can migrate to the new usage.
  https://www.graphql-mesh.com/docs/guides/subscriptions-webhooks#handle-webhook-http-requests

- Updated dependencies [a2ef35c35]
  - @graphql-mesh/utils@0.37.3

## 0.10.1

### Patch Changes

- @graphql-mesh/utils@0.37.2

## 0.10.0

### Minor Changes

- eade5bb9f: **New `noDeduplication` flag**

  By default, JSON Schema handler tries to deduplicate similar JSON Schema types;

  Let's say we have the following JSON Schema;

  ```json
  {
    "definitions": {
      "Book": {
        "type": "object",
        "title": "Book",
        "properties": {
          "title": {
            "type": "string"
          },
          "author": {
            "type": "string"
          },
          "price": {
            "type": "number"
          },
          "similarBooks": {
            "type": "array",
            "items": {
              "$ref": "#/definitions/SimilarBook"
            }
          }
        }
      },
      "SimilarBook": {
        "type": "object",
        "title": "Book",
        "properties": {
          "title": {
            "type": "string"
          },
          "author": {
            "type": "string"
          },
          "price": {
            "type": "number"
          },
          "similarBooks": {
            "type": "array",
            "items": {
              "$ref": "#/definitions/SimilarBook"
            }
          }
        }
      }
    }
  }
  ```

  And the result will be the following by default;

  ```graphql
  type Book {
    title: String
    author: String
    price: Float
    similarBooks: [Book]
  }
  ```

  But if you set this flag true, it will not deduplicate similar JSON Schema types;

  ```graphql
  type Book {
    title: String
    author: String
    price: Float
    similarBooks: [SimilarBook]
  }

  type SimilarBook {
    title: String
    author: String
    price: Float
    similarBooks: [SimilarBook]
  }
  ```

### Patch Changes

- Updated dependencies [6e6fd4ab7]
  - @graphql-mesh/utils@0.37.1

## 0.9.2

### Patch Changes

- Updated dependencies [0401c7617]
  - @graphql-mesh/cross-helpers@0.2.0
  - @graphql-mesh/utils@0.37.0

## 0.9.1

### Patch Changes

- Updated dependencies [12e1e5d72]
  - @graphql-mesh/cross-helpers@0.1.7
  - @graphql-mesh/utils@0.36.1

## 0.9.0

### Minor Changes

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

## 0.8.15

### Patch Changes

- @graphql-mesh/utils@0.35.7

## 0.8.14

### Patch Changes

- Updated dependencies [ed9ba7f48]
  - @graphql-mesh/utils@0.35.6

## 0.8.13

### Patch Changes

- Updated dependencies [41cfb46b4]
  - @graphql-mesh/utils@0.35.5

## 0.8.12

### Patch Changes

- @graphql-mesh/utils@0.35.4

## 0.8.11

### Patch Changes

- Updated dependencies [9733f490c]
  - @graphql-mesh/utils@0.35.3

## 0.8.10

### Patch Changes

- 3c0366d2c: - Support import.meta.env instead of process.env for browsers
  - Ponyfill `util.inspect` only if it is not Node env
- Updated dependencies [3c0366d2c]
- Updated dependencies [3c0366d2c]
  - @graphql-mesh/cross-helpers@0.1.6
  - @graphql-mesh/utils@0.35.2

## 0.8.9

### Patch Changes

- Updated dependencies [abe9fcc41]
  - @graphql-mesh/utils@0.35.1

## 0.8.8

### Patch Changes

- 974e703e2: Cleanup dependencies
- Updated dependencies [974e703e2]
- Updated dependencies [974e703e2]
- Updated dependencies [974e703e2]
  - @graphql-mesh/utils@0.35.0
  - @graphql-mesh/cross-helpers@0.1.5

## 0.8.7

### Patch Changes

- Updated dependencies [43eb3d2c2]
  - @graphql-mesh/utils@0.34.10

## 0.8.6

### Patch Changes

- Updated dependencies [55ad5ea44]
  - @graphql-mesh/cross-helpers@0.1.4
  - @graphql-mesh/utils@0.34.9

## 0.8.5

### Patch Changes

- Updated dependencies [31efa964e]
  - @graphql-mesh/utils@0.34.8

## 0.8.4

### Patch Changes

- Updated dependencies [66b9b3ddc]
  - @graphql-mesh/cross-helpers@0.1.3
  - @graphql-mesh/utils@0.34.7

## 0.8.3

### Patch Changes

- b9beacca2: Bump cross-undici-fetch for Node 14 compatibility and performance improvements
- Updated dependencies [b9beacca2]
  - @graphql-mesh/utils@0.34.6

## 0.8.2

### Patch Changes

- @graphql-mesh/utils@0.34.5

## 0.8.1

### Patch Changes

- Updated dependencies [ddbbec8a8]
  - @graphql-mesh/utils@0.34.4

## 0.8.0

### Minor Changes

- 2e9addd80: Use platform agnostic json-pointer instead of json-ptr

### Patch Changes

- 2e9addd80: Bump cross-undici-fetch for Node 18 compat
- Updated dependencies [2e9addd80]
  - @graphql-mesh/utils@0.34.3

## 0.7.15

### Patch Changes

- @graphql-mesh/utils@0.34.2

## 0.7.14

### Patch Changes

- 7856f92d3: Bump all packages
- Updated dependencies [7856f92d3]
  - @graphql-mesh/cross-helpers@0.1.2
  - @graphql-mesh/utils@0.34.1

## 0.7.13

### Patch Changes

- 331b62637: fix(json-machete): Heal generated schemas
- 331b62637: fix(json-machete): if anyOf/oneOf/allOf is singular, use that single value directly
- Updated dependencies [f963b57ce]
- Updated dependencies [0644f31f2]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
  - @graphql-mesh/utils@0.34.0

## 0.7.12

### Patch Changes

- Updated dependencies [cf0836a64]
  - @graphql-mesh/cross-helpers@0.1.1
  - @graphql-mesh/utils@0.33.6

## 0.7.11

### Patch Changes

- @graphql-mesh/utils@0.33.5

## 0.7.10

### Patch Changes

- 35a55e841: Bump GraphQL Tools packages
- Updated dependencies [35a55e841]
  - @graphql-mesh/utils@0.33.4

## 0.7.9

### Patch Changes

- @graphql-mesh/utils@0.33.3

## 0.7.8

### Patch Changes

- d64c74b75: fix(json-machete): ignore null values in dereferenceObject

## 0.7.7

### Patch Changes

- 114629e47: fix(json-machete): respect int64 types
  - @graphql-mesh/utils@0.33.2

## 0.7.6

### Patch Changes

- 2d5c6c72a: add Git repository link in package.json
- Updated dependencies [2d5c6c72a]
  - @graphql-mesh/utils@0.33.1

## 0.7.5

### Patch Changes

- Updated dependencies [d567be7b5]
  - @graphql-mesh/utils@0.33.0

## 0.7.4

### Patch Changes

- @graphql-mesh/utils@0.32.2

## 0.7.3

### Patch Changes

- c53203723: fix(json-machete): revert old behavior

## 0.7.2

### Patch Changes

- c6f0314ac: fix(json-machete): use util back

## 0.7.1

### Patch Changes

- @graphql-mesh/utils@0.32.1

## 0.7.0

### Minor Changes

- 67fb11706: enhance: improve cross-platform support

### Patch Changes

- Updated dependencies [67fb11706]
  - @graphql-mesh/utils@0.32.0

## 0.6.1

### Patch Changes

- Updated dependencies [b2c537c2a]
  - @graphql-mesh/utils@0.31.0

## 0.6.0

### Minor Changes

- b45dac0c0: feat(json-machete): add missing format if example is provided

## 0.5.20

### Patch Changes

- @graphql-mesh/utils@0.30.2

## 0.5.19

### Patch Changes

- @graphql-mesh/utils@0.30.1

## 0.5.18

### Patch Changes

- Updated dependencies [01bac6bb5]
- Updated dependencies [01bac6bb5]
  - @graphql-mesh/utils@0.30.0

## 0.5.17

### Patch Changes

- Updated dependencies [268db0462]
  - @graphql-mesh/utils@0.29.0

## 0.5.16

### Patch Changes

- @graphql-mesh/utils@0.28.5

## 0.5.15

### Patch Changes

- @graphql-mesh/utils@0.28.4

## 0.5.14

### Patch Changes

- @graphql-mesh/utils@0.28.3

## 0.5.13

### Patch Changes

- Updated dependencies [fb876e99c]
  - @graphql-mesh/utils@0.28.2

## 0.5.12

### Patch Changes

- @graphql-mesh/utils@0.28.1

## 0.5.11

### Patch Changes

- b481fbc39: enhance: add tslib to dependencies to reduce bundle size
- Updated dependencies [6f07de8fe]
- Updated dependencies [6f07de8fe]
- Updated dependencies [b481fbc39]
  - @graphql-mesh/utils@0.28.0

## 0.5.10

### Patch Changes

- Updated dependencies [3f4bb09a9]
  - @graphql-mesh/utils@0.27.9

## 0.5.9

### Patch Changes

- @graphql-mesh/utils@0.27.8

## 0.5.8

### Patch Changes

- ca6bb5ff3: fix(json-machete): respect items prop in object type
- Updated dependencies [ca6bb5ff3]
  - @graphql-mesh/utils@0.27.7

## 0.5.7

### Patch Changes

- @graphql-mesh/utils@0.27.6

## 0.5.6

### Patch Changes

- Updated dependencies [1815865c3]
  - @graphql-mesh/utils@0.27.5

## 0.5.5

### Patch Changes

- @graphql-mesh/utils@0.27.4

## 0.5.4

### Patch Changes

- @graphql-mesh/utils@0.27.3

## 0.5.3

### Patch Changes

- Updated dependencies [c71b29004]
  - @graphql-mesh/utils@0.27.2

## 0.5.2

### Patch Changes

- Updated dependencies [fcbd12a35]
  - @graphql-mesh/utils@0.27.1

## 0.5.1

### Patch Changes

- 1c8827604: fix(openapi): respect definition name

## 0.5.0

### Minor Changes

- 49e9ca808: feat(json-machete): trim descriptions

## 0.4.3

### Patch Changes

- Updated dependencies [900a01355]
  - @graphql-mesh/utils@0.27.0

## 0.4.2

### Patch Changes

- @graphql-mesh/utils@0.26.4

## 0.4.1

### Patch Changes

- @graphql-mesh/utils@0.26.3

## 0.4.0

### Minor Changes

- 020431bdc: enhance(json-machete): do not look for annotated schemas

### Patch Changes

- @graphql-mesh/utils@0.26.2

## 0.3.7

### Patch Changes

- Updated dependencies [113091148]
  - @graphql-mesh/utils@0.26.1

## 0.3.6

### Patch Changes

- 92d687133: fix(json-machete): respect reference titles while dereferencing

## 0.3.5

### Patch Changes

- 8e52fd06a: fix: handle references correctly
- Updated dependencies [56e2257fa]
- Updated dependencies [56e2257fa]
  - @graphql-mesh/utils@0.26.0

## 0.3.4

### Patch Changes

- Updated dependencies [2b876f2b8]
  - @graphql-mesh/utils@0.25.0

## 0.3.3

### Patch Changes

- d907351c5: fix(json-machete): respect object.items pattern
- d907351c5: new OpenAPI Handler
- Updated dependencies [d907351c5]
  - @graphql-mesh/utils@0.24.2

## 0.3.2

### Patch Changes

- Updated dependencies [26d685f2a]
  - @graphql-mesh/utils@0.24.1

## 0.3.1

### Patch Changes

- Updated dependencies [cfca98d34]
  - @graphql-mesh/utils@0.24.0

## 0.3.0

### Minor Changes

- 5666484d6: update cross-undici-fetch

### Patch Changes

- Updated dependencies [5666484d6]
  - @graphql-mesh/utils@0.23.0

## 0.2.1

### Patch Changes

- Updated dependencies [6c216c309]
  - @graphql-mesh/utils@0.22.2

## 0.2.0

### Minor Changes

- e8cc53f11: feat(json-schema): support schemaHeaders for sample and schemas

### Patch Changes

- Updated dependencies [c22eb1b5e]
  - @graphql-mesh/utils@0.22.1

## 0.1.0

### Minor Changes

- f40b0d42c: Refactor JSON Schema handler code
- f40b0d42c: enhance(json-schema): better auto naming

### Patch Changes

- 1cc0acb9a: fix: normalize imported modules
- Updated dependencies [ec0d1d639]
- Updated dependencies [1cc0acb9a]
  - @graphql-mesh/utils@0.22.0

## 0.0.27

### Patch Changes

- 3bded2bad: fix(json-machete): stringify circular objects correctly to compare for deduplicating schema

## 0.0.26

### Patch Changes

- 8de12b4d8: fix(json-machete): dereference imported json files correctly

## 0.0.25

### Patch Changes

- 27c26392d: bump versions
  - @graphql-mesh/utils@0.21.1

## 0.0.24

### Patch Changes

- Updated dependencies [875d0e48d]
  - @graphql-mesh/utils@0.21.0

## 0.0.23

### Patch Changes

- @graphql-mesh/utils@0.20.1

## 0.0.22

### Patch Changes

- Updated dependencies [09f81dd74]
- Updated dependencies [09f81dd74]
  - @graphql-mesh/utils@0.20.0

## 0.0.21

### Patch Changes

- Updated dependencies [0dc08e5cc]
  - @graphql-mesh/utils@0.19.0

## 0.0.20

### Patch Changes

- ac95631ea: fix(compareJSONSchemas): check nullability with "== null"

## 0.0.19

### Patch Changes

- @graphql-mesh/utils@0.18.1

## 0.0.18

### Patch Changes

- Updated dependencies [4ec7a14ba]
- Updated dependencies [811960cdc]
  - @graphql-mesh/utils@0.18.0

## 0.0.17

### Patch Changes

- @graphql-mesh/utils@0.17.2

## 0.0.16

### Patch Changes

- @graphql-mesh/utils@0.17.1

## 0.0.15

### Patch Changes

- Updated dependencies [7bd145769]
  - @graphql-mesh/utils@0.17.0

## 0.0.14

### Patch Changes

- Updated dependencies [472c5887b]
  - @graphql-mesh/utils@0.16.3

## 0.0.13

### Patch Changes

- @graphql-mesh/utils@0.16.2

## 0.0.12

### Patch Changes

- Updated dependencies [46a4f7b73]
- Updated dependencies [aa804d043]
  - @graphql-mesh/utils@0.16.1

## 0.0.11

### Patch Changes

- Updated dependencies [9eff8a396]
  - @graphql-mesh/utils@0.16.0

## 0.0.10

### Patch Changes

- Updated dependencies [f4f30741d]
  - @graphql-mesh/utils@0.15.0

## 0.0.9

### Patch Changes

- Updated dependencies [4545fe72d]
- Updated dependencies [d189b4034]
  - @graphql-mesh/utils@0.14.0

## 0.0.8

### Patch Changes

- Updated dependencies [fc51c574d]
  - @graphql-mesh/utils@0.13.7

## 0.0.7

### Patch Changes

- @graphql-mesh/utils@0.13.6

## 0.0.6

### Patch Changes

- Updated dependencies [7080a2f1d]
  - @graphql-mesh/utils@0.13.5

## 0.0.5

### Patch Changes

- Updated dependencies [0c97b4b75]
  - @graphql-mesh/utils@0.13.4

## 0.0.4

### Patch Changes

- @graphql-mesh/utils@0.13.3

## 0.0.3

### Patch Changes

- Updated dependencies [49c8ceb38]
  - @graphql-mesh/utils@0.13.2

## 0.0.2

### Patch Changes

- @graphql-mesh/utils@0.13.1

## 0.0.1

### Patch Changes

- d55f30c89: NEW LIBRARY
- Updated dependencies [885ea439a]
- Updated dependencies [d8051f87d]
  - @graphql-mesh/utils@0.13.0
