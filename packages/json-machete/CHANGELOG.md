# json-machete

## 0.13.1

### Patch Changes

- Updated dependencies [[`f23e14eba`](https://github.com/Urigo/graphql-mesh/commit/f23e14ebaf7c6a869207edc43b0e2a8114d0d21f)]:
  - @graphql-mesh/utils@0.39.0
  - @graphql-mesh/types@0.80.1

## 0.13.0

### Minor Changes

- [#4342](https://github.com/Urigo/graphql-mesh/pull/4342) [`ca6d6206b`](https://github.com/Urigo/graphql-mesh/commit/ca6d6206b02dfaa42eafa83442a04b33bbdf2db9) Thanks [@gilgardosh](https://github.com/gilgardosh)! - ## Some improvements on OAS handling
  - If there are no parameters defined in OAS links, the handler exposes the arguments of the original operation.
  - If the name of the link definition is not valid for GraphQL, the handler sanitizes it.

* [#4327](https://github.com/Urigo/graphql-mesh/pull/4327) [`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319) Thanks [@gilgardosh](https://github.com/gilgardosh)! - ## BREAKING CHANGES
  - Named types are no longer deduplicated automatically, so this might introduce new types on your side. Also the types with unknown content are always reflected as "JSON"/"Any" scalar type
  - `noDeduplicate` option has been dropped, because it is no longer needed.

### Patch Changes

- [#4348](https://github.com/Urigo/graphql-mesh/pull/4348) [`de7081cdb`](https://github.com/Urigo/graphql-mesh/commit/de7081cdbb4c6ddb8ff60ac15089a19f70ee3a3a) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@whatwg-node/fetch@^0.3.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/null) (from `^0.2.7`, in `dependencies`)

- Updated dependencies [[`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319)]:
  - @graphql-mesh/types@0.80.0
  - @graphql-mesh/utils@0.38.1

## 0.12.0

### Minor Changes

- [#4235](https://github.com/Urigo/graphql-mesh/pull/4235) [`b162269f7`](https://github.com/Urigo/graphql-mesh/commit/b162269f70a90594962792ffaaa40d3a7ee9f4e4) Thanks [@gilgardosh](https://github.com/gilgardosh)! - - Support "$request.query" and "$request.path" usages in [OpenAPI runtime expressions](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#runtimeExpression)

  - Fix `Field not found` error when an OpenAPI link refers to an operation which is not `Mutation`
  - Do not use AJV and check field names in the received object to resolve the type name for a union field
  - Fix `queryParams` which allows you to pass query parameters for all operations
  - Handle cookie paramters correctly defined in the OpenAPI document by trimming empty values
  - Respect the mime types defined in the OpenAPI document. Now it creates a union for each mime type defined in the document, and resolve it by the mime type.
  - Respect JSON examples given in the OpenAPI document correctly even if they are strings with JSON content.
  - Normalize(lowercase header names) and merge final operation headers correctly from different places `operationHeaders` from the bundle and configuration plus `headers` defined for that specific operation.
  - Do not ignore operationHeaders defined in the configuration even if there are some already defined in the bundle

  **BREAKING CHANGES:**

  - If a JSON Schema type cannot be represented in GraphQL (object without properties etc.), it will no longer use `Any` type but `JSON` type instead which is a scalar from `graphql-scalars`.

  - Due to the improvements in `healJSONSchema` some of types that are not named in the JSON Schema might be named in a different way. Please make sure the content of the types are correct and report us on GitHub if they are represented incorrectly.

  - UUID format is now represented as `UUID` scalar type which is a scalar from `graphql-scalars`.

  - HTTP Errors are now in a more descriptive way. If your consumer respects them strictly, they will probably need to update their implementation.

  ```diff
  {
    "url": "http://www.google.com/api",
    "method": "GET",
  - "status": 401,
  + "statusCode": 401,
  + "statusText": "Unauthorized",
  - "responseJson": {}
  + "responseBody": {}
  }
  ```

  - `requestSchema` and `requestSample` are no longer used for query parameters in GET operations, but instead we introduced new `argTypeMap` and `queryParamsArgMap` to define schemas for query parameters.

  For JSON Schema Handler configuration, the following changes are **NEEDED**;

  ```diff
  - requestSample: { some_flag: true }
  + queryParamsArgMap:
  +   some_flag: some_flag
  + argTypeMap:
  +   some_flag:
  +     type: boolean
  ```

  or just use the string interpolation;

  ```yaml
  path: /mypath?some_flag={args.some_flag}
  ```

  - Query parameters no longer uses `input`, and they become an argument of that operation directly.

  In the generated GraphQL Schema;

  ```diff
  - someOp(input: SomeInput): OpResult
  - input SomeInput {
  -  some_flag: Boolean
  - }
  + someOp(some_flag: Boolean): OpResult
  ```

  - `argTypeMap` no longer takes GraphQL type names but instead it can take JSON Schema pointer or JSON Schema definition itself. New `argTypeMap` can configure any argument even if it is defined in the headers.

  ```diff
  argTypeMap:
  - some_flag: Boolean
  + some_flag:
  +   type: boolean
  ```

### Patch Changes

- Updated dependencies [[`b162269f7`](https://github.com/Urigo/graphql-mesh/commit/b162269f70a90594962792ffaaa40d3a7ee9f4e4)]:
  - @graphql-mesh/types@0.79.0
  - @graphql-mesh/utils@0.38.0

## 0.11.2

### Patch Changes

- [#4275](https://github.com/Urigo/graphql-mesh/pull/4275) [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.0) (was `8.9.1`, in `dependencies`)

- Updated dependencies [[`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968)]:
  - @graphql-mesh/cross-helpers@0.2.2
  - @graphql-mesh/types@0.78.8
  - @graphql-mesh/utils@0.37.9

## 0.11.1

### Patch Changes

- [#4263](https://github.com/Urigo/graphql-mesh/pull/4263) [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.9.1) (was `8.9.0`, in `dependencies`)

- Updated dependencies [[`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)]:
  - @graphql-mesh/cross-helpers@0.2.1
  - @graphql-mesh/types@0.78.7
  - @graphql-mesh/utils@0.37.8

## 0.11.0

### Minor Changes

- [#4241](https://github.com/Urigo/graphql-mesh/pull/4241) [`669abf58f`](https://github.com/Urigo/graphql-mesh/commit/669abf58f86faf5f9d678cf9ad103143488960d6) Thanks [@ardatan](https://github.com/ardatan)! - ## New debug logging for `healJSONSchema`
  JSON Schema loader tries to fix your JSON Schema while creating a final bundle for Mesh. Usually it works and it has a chance to have a different result rather than you expect. In the long term, if you don't fix your JSON Schema, you might get different results once the internals of `healJSONSchema` is changed.

  In order to see which parts of your schema need to be fixed, you can enable the debug mode with `DEBUG=healJSONSchema` environment variable.

  ## New debug details in the field descriptions with `DEBUG=fieldDetails`

  Now you can see which operation has which HTTP request details in the field description with the new debug mode.
  ![image](https://user-images.githubusercontent.com/20847995/182913565-a9d9c521-519b-4d57-88a9-13ea3edab96a.png)

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
