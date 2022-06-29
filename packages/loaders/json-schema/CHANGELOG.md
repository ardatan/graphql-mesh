# @omnigraph/json-schema

## 0.22.0

### Minor Changes

- b69746d2c: feat(json-schema): new exposeResponseMetadata flag to expose the details of the HTTP responses received from the upstream

  ```yml
  responseSchema: ...
  exposeResponseMetadata: true
  ```

  Now you will have another field called `$response` in the response type;

  ```graphql
  type MyResponseType {
    myFooField: String
    _response: ResponseMetadata
  }

  type ResponseMetadata {
    url: URL
    status: Int
    method: String
    headers: JSON
    body: String
  }
  ```

### Patch Changes

- 12e1e5d72: Do not compile JSON Schemas with ajv if function constructors are not supported. This fixes an issue with Mesh and CF Workers. Previously it throws an error because of "new Function" usage
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
  - @graphql-mesh/cross-helpers@0.1.7
  - @graphql-mesh/types@0.77.0
  - json-machete@0.9.1
  - @graphql-mesh/utils@0.36.1

## 0.21.0

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
  - json-machete@0.9.0
  - @graphql-mesh/types@0.76.0

## 0.20.7

### Patch Changes

- Updated dependencies [d4754ad08]
- Updated dependencies [2df026e90]
  - @graphql-mesh/types@0.75.0
  - @graphql-mesh/utils@0.35.7
  - json-machete@0.8.15

## 0.20.6

### Patch Changes

- Updated dependencies [ed9ba7f48]
  - @graphql-mesh/types@0.74.2
  - @graphql-mesh/utils@0.35.6
  - json-machete@0.8.14

## 0.20.5

### Patch Changes

- Updated dependencies [41cfb46b4]
  - @graphql-mesh/utils@0.35.5
  - json-machete@0.8.13
  - @graphql-mesh/types@0.74.1

## 0.20.4

### Patch Changes

- Updated dependencies [13b9b30f7]
  - @graphql-mesh/string-interpolation@0.3.0
  - @graphql-mesh/types@0.74.0
  - @graphql-mesh/utils@0.35.4
  - json-machete@0.8.12

## 0.20.3

### Patch Changes

- Updated dependencies [9733f490c]
  - @graphql-mesh/utils@0.35.3
  - json-machete@0.8.11
  - @graphql-mesh/types@0.73.3

## 0.20.2

### Patch Changes

- 3c0366d2c: - Support import.meta.env instead of process.env for browsers
  - Ponyfill `util.inspect` only if it is not Node env
- Updated dependencies [3c0366d2c]
- Updated dependencies [3c0366d2c]
  - @graphql-mesh/cross-helpers@0.1.6
  - json-machete@0.8.10
  - @graphql-mesh/utils@0.35.2
  - @graphql-mesh/types@0.73.2

## 0.20.1

### Patch Changes

- Updated dependencies [abe9fcc41]
  - @graphql-mesh/utils@0.35.1
  - json-machete@0.8.9
  - @graphql-mesh/types@0.73.1

## 0.20.0

### Minor Changes

- 974e703e2: No longer import entire lodash library but instead individual smaller packages

### Patch Changes

- 974e703e2: Cleanup dependencies
- Updated dependencies [974e703e2]
- Updated dependencies [19a99c055]
- Updated dependencies [974e703e2]
- Updated dependencies [974e703e2]
- Updated dependencies [893d526ab]
- Updated dependencies [974e703e2]
  - json-machete@0.8.8
  - @graphql-mesh/string-interpolation@0.2.0
  - @graphql-mesh/types@0.73.0
  - @graphql-mesh/utils@0.35.0

## 0.19.8

### Patch Changes

- Updated dependencies [43eb3d2c2]
  - @graphql-mesh/utils@0.34.10
  - json-machete@0.8.7
  - @graphql-mesh/types@0.72.5

## 0.19.7

### Patch Changes

- Updated dependencies [55ad5ea44]
  - @graphql-mesh/utils@0.34.9
  - json-machete@0.8.6
  - @graphql-mesh/types@0.72.4

## 0.19.6

### Patch Changes

- Updated dependencies [31efa964e]
  - @graphql-mesh/utils@0.34.8
  - json-machete@0.8.5
  - @graphql-mesh/types@0.72.3

## 0.19.5

### Patch Changes

- json-machete@0.8.4
- @graphql-mesh/utils@0.34.7
- @graphql-mesh/types@0.72.2

## 0.19.4

### Patch Changes

- b9beacca2: Bump cross-undici-fetch for Node 14 compatibility and performance improvements
- Updated dependencies [b9beacca2]
  - json-machete@0.8.3
  - @graphql-mesh/utils@0.34.6
  - @graphql-mesh/types@0.72.1

## 0.19.3

### Patch Changes

- Updated dependencies [fa2542468]
  - @graphql-mesh/types@0.72.0
  - @graphql-mesh/utils@0.34.5
  - json-machete@0.8.2

## 0.19.2

### Patch Changes

- Updated dependencies [ddbbec8a8]
  - @graphql-mesh/utils@0.34.4
  - json-machete@0.8.1
  - @graphql-mesh/types@0.71.4

## 0.19.1

### Patch Changes

- 2e9addd80: Bump cross-undici-fetch for Node 18 compat
- Updated dependencies [2e9addd80]
- Updated dependencies [2e9addd80]
  - json-machete@0.8.0
  - @graphql-mesh/utils@0.34.3
  - @graphql-mesh/types@0.71.3

## 0.19.0

### Minor Changes

- 2f395a4b2: feat(openapi): support empty values

## 0.18.2

### Patch Changes

- @graphql-mesh/types@0.71.2
- @graphql-mesh/utils@0.34.2
- json-machete@0.7.15

## 0.18.1

### Patch Changes

- 7856f92d3: Bump all packages
- Updated dependencies [7856f92d3]
  - json-machete@0.7.14
  - @graphql-mesh/types@0.71.1
  - @graphql-mesh/utils@0.34.1

## 0.18.0

### Minor Changes

- 331b62637: feat(openapi): add queryParams config to provide common query params for a source
- 331b62637: feat(json-schema/openapi): support OpenAPI links and json pointer syntax in string interpolation

### Patch Changes

- Updated dependencies [331b62637]
- Updated dependencies [f963b57ce]
- Updated dependencies [0644f31f2]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
  - json-machete@0.7.13
  - @graphql-mesh/types@0.71.0
  - @graphql-mesh/utils@0.34.0

## 0.17.26

### Patch Changes

- json-machete@0.7.12
- @graphql-mesh/utils@0.33.6
- @graphql-mesh/types@0.70.6

## 0.17.25

### Patch Changes

- @graphql-mesh/types@0.70.5
- @graphql-mesh/utils@0.33.5
- json-machete@0.7.11

## 0.17.24

### Patch Changes

- 35a55e841: Bump GraphQL Tools packages
- Updated dependencies [35a55e841]
  - json-machete@0.7.10
  - @graphql-mesh/types@0.70.4
  - @graphql-mesh/utils@0.33.4

## 0.17.23

### Patch Changes

- @graphql-mesh/types@0.70.3
- @graphql-mesh/utils@0.33.3
- json-machete@0.7.9

## 0.17.22

### Patch Changes

- Updated dependencies [d64c74b75]
  - json-machete@0.7.8

## 0.17.21

### Patch Changes

- Updated dependencies [b02f5b008]
- Updated dependencies [114629e47]
  - @graphql-mesh/types@0.70.2
  - json-machete@0.7.7
  - @graphql-mesh/utils@0.33.2

## 0.17.20

### Patch Changes

- 26e69dbe9: fix(json-schema): stringify arrays without indices

## 0.17.19

### Patch Changes

- 2d5c6c72a: add Git repository link in package.json
- Updated dependencies [2d5c6c72a]
  - json-machete@0.7.6
  - @graphql-mesh/types@0.70.1
  - @graphql-mesh/utils@0.33.1

## 0.17.18

### Patch Changes

- Updated dependencies [d567be7b5]
  - @graphql-mesh/types@0.70.0
  - @graphql-mesh/utils@0.33.0
  - json-machete@0.7.5

## 0.17.17

### Patch Changes

- Updated dependencies [f30dba61e]
  - @graphql-mesh/types@0.69.0
  - @graphql-mesh/utils@0.32.2
  - json-machete@0.7.4

## 0.17.16

### Patch Changes

- Updated dependencies [c53203723]
  - json-machete@0.7.3

## 0.17.15

### Patch Changes

- Updated dependencies [c6f0314ac]
  - json-machete@0.7.2

## 0.17.14

### Patch Changes

- Updated dependencies [be61de529]
  - @graphql-mesh/types@0.68.3
  - @graphql-mesh/utils@0.32.1
  - json-machete@0.7.1

## 0.17.13

### Patch Changes

- Updated dependencies [b1a6df928]
- Updated dependencies [67fb11706]
  - @graphql-mesh/types@0.68.2
  - json-machete@0.7.0
  - @graphql-mesh/utils@0.32.0

## 0.17.12

### Patch Changes

- Updated dependencies [b2c537c2a]
  - @graphql-mesh/utils@0.31.0
  - @graphql-mesh/types@0.68.1
  - json-machete@0.6.1

## 0.17.11

### Patch Changes

- b45dac0c0: fix(json-schema): handle union response types correctly
- Updated dependencies [b45dac0c0]
  - json-machete@0.6.0

## 0.17.10

### Patch Changes

- Updated dependencies [6c318b91a]
  - @graphql-mesh/types@0.68.0
  - @graphql-mesh/utils@0.30.2
  - json-machete@0.5.20

## 0.17.9

### Patch Changes

- @graphql-mesh/types@0.67.1
- @graphql-mesh/utils@0.30.1
- json-machete@0.5.19

## 0.17.8

### Patch Changes

- 01bac6bb5: fix - align graphql-tools versions
- Updated dependencies [01bac6bb5]
- Updated dependencies [01bac6bb5]
  - @graphql-mesh/types@0.67.0
  - @graphql-mesh/utils@0.30.0
  - json-machete@0.5.18

## 0.17.7

### Patch Changes

- Updated dependencies [268db0462]
  - @graphql-mesh/utils@0.29.0
  - json-machete@0.5.17
  - @graphql-mesh/types@0.66.6

## 0.17.6

### Patch Changes

- Updated dependencies [2ffb1f287]
  - @graphql-mesh/types@0.66.5
  - @graphql-mesh/utils@0.28.5
  - json-machete@0.5.16

## 0.17.5

### Patch Changes

- Updated dependencies [6d2d46480]
  - @graphql-mesh/types@0.66.4
  - @graphql-mesh/utils@0.28.4
  - json-machete@0.5.15

## 0.17.4

### Patch Changes

- f11d8b9c8: fix: add implicit dependencies
  - @graphql-mesh/types@0.66.3
  - @graphql-mesh/utils@0.28.3
  - json-machete@0.5.14

## 0.17.3

### Patch Changes

- Updated dependencies [fb876e99c]
  - @graphql-mesh/types@0.66.2
  - @graphql-mesh/utils@0.28.2
  - json-machete@0.5.13

## 0.17.2

### Patch Changes

- Updated dependencies [98ff961ff]
  - @graphql-mesh/types@0.66.1
  - @graphql-mesh/utils@0.28.1
  - json-machete@0.5.12

## 0.17.1

### Patch Changes

- 6f07de8fe: fix: do not import process from env
- b481fbc39: enhance: add tslib to dependencies to reduce bundle size
- Updated dependencies [6f07de8fe]
- Updated dependencies [6f07de8fe]
- Updated dependencies [b481fbc39]
  - @graphql-mesh/types@0.66.0
  - @graphql-mesh/utils@0.28.0
  - json-machete@0.5.11

## 0.17.0

### Minor Changes

- 21de17a3d: feat(json-schema): ability to provide additional request body with requestBaseBody in the config

### Patch Changes

- Updated dependencies [21de17a3d]
- Updated dependencies [3f4bb09a9]
  - @graphql-mesh/types@0.65.0
  - @graphql-mesh/utils@0.27.9
  - json-machete@0.5.10

## 0.16.2

### Patch Changes

- Updated dependencies [8b8eb5158]
- Updated dependencies [8b8eb5158]
  - @graphql-mesh/types@0.64.2
  - @graphql-mesh/utils@0.27.8
  - json-machete@0.5.9

## 0.16.1

### Patch Changes

- Updated dependencies [ca6bb5ff3]
- Updated dependencies [ca6bb5ff3]
  - json-machete@0.5.8
  - @graphql-mesh/utils@0.27.7
  - @graphql-mesh/types@0.64.1

## 0.16.0

### Minor Changes

- 275f82b53: enhance(json-schema): graphql-upload is no longer needed

## 0.15.1

### Patch Changes

- c84d9e95e: enhance(json-schema): add a debug message about adding response metadata to the final response object

## 0.15.0

### Minor Changes

- e3f941db5: feat(json-schema): make input argument nonnullable if any of fields is nonnulalble

### Patch Changes

- 12256ec58: fix(json-schema): fix array normalization
- Updated dependencies [08b250e04]
  - @graphql-mesh/types@0.64.0
  - @graphql-mesh/utils@0.27.6
  - json-machete@0.5.7

## 0.14.3

### Patch Changes

- 1815865c3: fix: bump fixed graphql-tools
- Updated dependencies [1815865c3]
  - @graphql-mesh/types@0.63.1
  - @graphql-mesh/utils@0.27.5
  - json-machete@0.5.6

## 0.14.2

### Patch Changes

- Updated dependencies [b6eca9baa]
- Updated dependencies [b6eca9baa]
  - @graphql-mesh/types@0.63.0
  - @graphql-mesh/utils@0.27.4
  - json-machete@0.5.5

## 0.14.1

### Patch Changes

- Updated dependencies [0d43ecf19]
  - @graphql-mesh/types@0.62.2
  - @graphql-mesh/utils@0.27.3
  - json-machete@0.5.4

## 0.14.0

### Minor Changes

- 15e1f68c5: feat(json-schema): respect given samples in mocks transform

### Patch Changes

- Updated dependencies [c71b29004]
- Updated dependencies [447bc3697]
  - @graphql-mesh/utils@0.27.2
  - @graphql-mesh/types@0.62.1
  - json-machete@0.5.3

## 0.13.6

### Patch Changes

- 3a21004c9: fix(json-schema): encode query parameters
- Updated dependencies [240ec7b38]
- Updated dependencies [fcbd12a35]
  - @graphql-mesh/types@0.62.0
  - @graphql-mesh/utils@0.27.1
  - json-machete@0.5.2

## 0.13.5

### Patch Changes

- 05ec30255: fix(json-schema): revert breaking change in the API (export getComposerFromJSONSchema)

## 0.13.4

### Patch Changes

- Updated dependencies [1c8827604]
  - json-machete@0.5.1

## 0.13.3

### Patch Changes

- 49e9ca808: fix(json-schema): use Any scalar for empty responses
- Updated dependencies [49e9ca808]
  - json-machete@0.5.0

## 0.13.2

### Patch Changes

- Updated dependencies [900a01355]
  - @graphql-mesh/utils@0.27.0
  - json-machete@0.4.3

## 0.13.1

### Patch Changes

- Updated dependencies [66ca1a366]
  - @graphql-mesh/types@0.61.0
  - @graphql-mesh/utils@0.26.4
  - json-machete@0.4.2

## 0.13.0

### Minor Changes

- a79268b3a: feat(json-schema): handle default error responses correctly

### Patch Changes

- Updated dependencies [a79268b3a]
- Updated dependencies [a79268b3a]
  - @graphql-mesh/types@0.60.0
  - @graphql-mesh/utils@0.26.3
  - json-machete@0.4.1

## 0.12.0

### Minor Changes

- 020431bdc: feat(json-schema/openapi/raml): respect error status codes

### Patch Changes

- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
  - json-machete@0.4.0
  - @graphql-mesh/types@0.59.0
  - @graphql-mesh/utils@0.26.2

## 0.11.2

### Patch Changes

- 6bb4cf673: enhance(json-schema): remove the need of info
- Updated dependencies [113091148]
- Updated dependencies [6bb4cf673]
  - @graphql-mesh/utils@0.26.1
  - @graphql-mesh/types@0.58.0
  - json-machete@0.3.7

## 0.11.1

### Patch Changes

- 92d687133: fix(json-schema): boolean types shouldn't be enums
- 92d687133: fix(json-schema): handle additionalProperties as a part of the actual type
- 92d687133: fix(json-machete): respect reference titles while dereferencing
- Updated dependencies [92d687133]
  - json-machete@0.3.6

## 0.11.0

### Minor Changes

- b69233517: feat(json-schema): detailed description for DEBUG mode

## 0.10.0

### Minor Changes

- 6d76179e4: feat(json-schema): return text in the error if response is not json as expected

## 0.9.0

### Minor Changes

- e30494c95: feat: better error messages

## 0.8.0

### Minor Changes

- 1ab0aebbc: feat(json-schema): better error handling

### Patch Changes

- Updated dependencies [8e52fd06a]
- Updated dependencies [1ab0aebbc]
- Updated dependencies [56e2257fa]
- Updated dependencies [56e2257fa]
  - json-machete@0.3.5
  - @graphql-mesh/types@0.57.2
  - @graphql-mesh/utils@0.26.0

## 0.7.4

### Patch Changes

- Updated dependencies [2b876f2b8]
  - @graphql-mesh/utils@0.25.0
  - json-machete@0.3.4

## 0.7.3

### Patch Changes

- 80eb8e92b: fix(json-schema): workaround for falsy enum values
- d907351c5: fix(json-schema): consume array results with singular return types
  fix(json-schema): handle dynamic values from env in schemaHeaders
- Updated dependencies [d907351c5]
- Updated dependencies [d907351c5]
  - json-machete@0.3.3
  - @graphql-mesh/types@0.57.1
  - @graphql-mesh/utils@0.24.2

## 0.7.2

### Patch Changes

- 4fe346123: fix(json-schema): prevent collision with requestTypeName and responseTypeName

## 0.7.1

### Patch Changes

- Updated dependencies [26d685f2a]
  - @graphql-mesh/utils@0.24.1
  - json-machete@0.3.2

## 0.7.0

### Minor Changes

- baf004f78: feat(json-schema): respect baseUrl given on loading bundle

### Patch Changes

- Updated dependencies [cfca98d34]
  - @graphql-mesh/types@0.57.0
  - @graphql-mesh/utils@0.24.0
  - json-machete@0.3.1

## 0.6.0

### Minor Changes

- 5666484d6: update cross-undici-fetch

### Patch Changes

- Updated dependencies [5666484d6]
  - json-machete@0.3.0
  - @graphql-mesh/utils@0.23.0

## 0.5.1

### Patch Changes

- 6c216c309: fix(json-schema): do not process arrays if there is no clue
- 6c216c309: fix(json-schema): handle descriptions correctly
- 8d233db89: fix(json-schema): respect arrays in request object
- Updated dependencies [6c216c309]
  - @graphql-mesh/utils@0.22.2
  - json-machete@0.2.1

## 0.5.0

### Minor Changes

- e8cc53f11: feat(json-schema): support schemaHeaders for sample and schemas

### Patch Changes

- Updated dependencies [c22eb1b5e]
- Updated dependencies [e8cc53f11]
  - @graphql-mesh/utils@0.22.1
  - json-machete@0.2.0

## 0.4.0

### Minor Changes

- f40b0d42c: Refactor JSON Schema handler code
- f40b0d42c: enhance(json-schema): better auto naming

### Patch Changes

- Updated dependencies [f40b0d42c]
- Updated dependencies [f40b0d42c]
- Updated dependencies [ec0d1d639]
- Updated dependencies [1cc0acb9a]
  - json-machete@0.1.0
  - @graphql-mesh/types@0.56.0
  - @graphql-mesh/utils@0.22.0

## 0.3.5

### Patch Changes

- 3bded2bad: enhance(json-schema): use correct GraphQLJSON scalar
- Updated dependencies [3bded2bad]
  - json-machete@0.0.27

## 0.3.4

### Patch Changes

- 8de12b4d8: fix(json-machete): dereference imported json files correctly
- Updated dependencies [8de12b4d8]
  - json-machete@0.0.26

## 0.3.3

### Patch Changes

- 27c26392d: bump versions
- Updated dependencies [27c26392d]
- Updated dependencies [1b332487c]
  - json-machete@0.0.25
  - @graphql-mesh/types@0.55.0
  - @graphql-mesh/utils@0.21.1

## 0.3.2

### Patch Changes

- Updated dependencies [875d0e48d]
  - @graphql-mesh/utils@0.21.0
  - json-machete@0.0.24

## 0.3.1

### Patch Changes

- Updated dependencies [761b16ed9]
  - @graphql-mesh/types@0.54.1
  - @graphql-mesh/utils@0.20.1
  - json-machete@0.0.23

## 0.3.0

### Minor Changes

- b7241ebb6: feat(json-schema): Binary Operation support

## 0.2.0

### Minor Changes

- c4d8be6f4: enhance: use undici for Node >v16
- 09f81dd74: GraphQL v16 compatibility
- 267573a16: enhance: resolve all promises
- 09f81dd74: GraphQL v16 compability

### Patch Changes

- Updated dependencies [09f81dd74]
- Updated dependencies [09f81dd74]
  - @graphql-mesh/types@0.54.0
  - @graphql-mesh/utils@0.20.0
  - json-machete@0.0.22

## 0.1.7

### Patch Changes

- 592afa2b9: fix(json-schema): if responseSchema not defined, pass the HTTP response as-is

## 0.1.6

### Patch Changes

- 0a1756f9c: fix(json-schema): handle subscriptions correctly

## 0.1.5

### Patch Changes

- Updated dependencies [0dc08e5cc]
  - @graphql-mesh/utils@0.19.0
  - json-machete@0.0.21

## 0.1.4

### Patch Changes

- Updated dependencies [ac95631ea]
  - json-machete@0.0.20

## 0.1.3

### Patch Changes

- 932ce6063: fix(json-schema): sanitize invalid property names for GraphQL

## 0.1.2

### Patch Changes

- 47c4fb402: fix(json-schema): correct TS type for const scalars

## 0.1.1

### Patch Changes

- 963e064f0: chore: update scalars to support included codegen support

## 0.1.0

### Minor Changes

- 6f57be0c1: feat(json-schema): expose GraphQL Tools loader compatible with loadSchema

### Patch Changes

- Updated dependencies [6f57be0c1]
  - @graphql-mesh/types@0.53.0
  - @graphql-mesh/utils@0.18.1
  - json-machete@0.0.19
