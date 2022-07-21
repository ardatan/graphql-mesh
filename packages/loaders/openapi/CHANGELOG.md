# @omnigraph/openapi

## 0.7.6

### Patch Changes

- Updated dependencies [738e2f378]
  - @omnigraph/json-schema@0.24.3
  - @graphql-mesh/types@0.78.3
  - @graphql-mesh/utils@0.37.4
  - json-machete@0.10.3

## 0.7.5

### Patch Changes

- a2ef35c35: ** Use the new `@whatwg-node/fetch` package instead of `cross-undici-fetch`**

  `cross-undici-fetch` has been renamed to `@whatwg-node-fetch`. Now Mesh uses this new package.

  ** BREAKING: Drop `serve.handlers` in favor of the new plugin system **

  Now Mesh uses the new plugin system of GraphQL Yoga that uses WHATWG Fetch API instead of Node specific `serve.handlers`. That means you can use those plugins with any environment even if you are not using Node.js with `mesh start`.

  Please check our docs to see how you can migrate to the new usage.
  https://www.graphql-mesh.com/docs/guides/subscriptions-webhooks#handle-webhook-http-requests

- Updated dependencies [bad0f40ab]
- Updated dependencies [a2ef35c35]
  - @omnigraph/json-schema@0.24.2
  - json-machete@0.10.2
  - @graphql-mesh/types@0.78.2
  - @graphql-mesh/utils@0.37.3

## 0.7.4

### Patch Changes

- @graphql-mesh/types@0.78.1
- @omnigraph/json-schema@0.24.1
- @graphql-mesh/utils@0.37.2
- json-machete@0.10.1

## 0.7.3

### Patch Changes

- Updated dependencies [eade5bb9f]
- Updated dependencies [6e6fd4ab7]
- Updated dependencies [bcd9355ee]
  - json-machete@0.10.0
  - @omnigraph/json-schema@0.24.0
  - @graphql-mesh/utils@0.37.1
  - @graphql-mesh/types@0.78.0

## 0.7.2

### Patch Changes

- Updated dependencies [66f5d0189]
- Updated dependencies [0401c7617]
  - @graphql-mesh/types@0.77.1
  - @graphql-mesh/cross-helpers@0.2.0
  - @omnigraph/json-schema@0.23.0
  - @graphql-mesh/utils@0.37.0
  - json-machete@0.9.2

## 0.7.1

### Patch Changes

- Updated dependencies [b69746d2c]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
  - @omnigraph/json-schema@0.22.0
  - @graphql-mesh/cross-helpers@0.1.7
  - @graphql-mesh/types@0.77.0
  - json-machete@0.9.1
  - @graphql-mesh/utils@0.36.1

## 0.7.0

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
  - @omnigraph/json-schema@0.21.0
  - @graphql-mesh/types@0.76.0

## 0.6.16

### Patch Changes

- Updated dependencies [d4754ad08]
- Updated dependencies [2df026e90]
  - @graphql-mesh/types@0.75.0
  - @omnigraph/json-schema@0.20.7
  - @graphql-mesh/utils@0.35.7
  - json-machete@0.8.15

## 0.6.15

### Patch Changes

- Updated dependencies [ed9ba7f48]
  - @graphql-mesh/types@0.74.2
  - @graphql-mesh/utils@0.35.6
  - @omnigraph/json-schema@0.20.6
  - json-machete@0.8.14

## 0.6.14

### Patch Changes

- Updated dependencies [41cfb46b4]
  - @graphql-mesh/utils@0.35.5
  - json-machete@0.8.13
  - @omnigraph/json-schema@0.20.5
  - @graphql-mesh/types@0.74.1

## 0.6.13

### Patch Changes

- Updated dependencies [13b9b30f7]
  - @graphql-mesh/string-interpolation@0.3.0
  - @graphql-mesh/types@0.74.0
  - @omnigraph/json-schema@0.20.4
  - @graphql-mesh/utils@0.35.4
  - json-machete@0.8.12

## 0.6.12

### Patch Changes

- Updated dependencies [9733f490c]
  - @graphql-mesh/utils@0.35.3
  - json-machete@0.8.11
  - @omnigraph/json-schema@0.20.3
  - @graphql-mesh/types@0.73.3

## 0.6.11

### Patch Changes

- 3c0366d2c: - Support import.meta.env instead of process.env for browsers
  - Ponyfill `util.inspect` only if it is not Node env
- Updated dependencies [3c0366d2c]
- Updated dependencies [3c0366d2c]
  - @graphql-mesh/cross-helpers@0.1.6
  - json-machete@0.8.10
  - @omnigraph/json-schema@0.20.2
  - @graphql-mesh/utils@0.35.2
  - @graphql-mesh/types@0.73.2

## 0.6.10

### Patch Changes

- Updated dependencies [abe9fcc41]
  - @graphql-mesh/utils@0.35.1
  - json-machete@0.8.9
  - @omnigraph/json-schema@0.20.1
  - @graphql-mesh/types@0.73.1

## 0.6.9

### Patch Changes

- 974e703e2: Cleanup dependencies
- Updated dependencies [974e703e2]
- Updated dependencies [19a99c055]
- Updated dependencies [974e703e2]
- Updated dependencies [974e703e2]
- Updated dependencies [893d526ab]
- Updated dependencies [974e703e2]
  - json-machete@0.8.8
  - @omnigraph/json-schema@0.20.0
  - @graphql-mesh/string-interpolation@0.2.0
  - @graphql-mesh/types@0.73.0
  - @graphql-mesh/utils@0.35.0

## 0.6.8

### Patch Changes

- Updated dependencies [43eb3d2c2]
  - @graphql-mesh/utils@0.34.10
  - json-machete@0.8.7
  - @omnigraph/json-schema@0.19.8
  - @graphql-mesh/types@0.72.5

## 0.6.7

### Patch Changes

- Updated dependencies [55ad5ea44]
  - @graphql-mesh/utils@0.34.9
  - json-machete@0.8.6
  - @omnigraph/json-schema@0.19.7
  - @graphql-mesh/types@0.72.4

## 0.6.6

### Patch Changes

- Updated dependencies [31efa964e]
  - @graphql-mesh/utils@0.34.8
  - json-machete@0.8.5
  - @omnigraph/json-schema@0.19.6
  - @graphql-mesh/types@0.72.3

## 0.6.5

### Patch Changes

- json-machete@0.8.4
- @graphql-mesh/utils@0.34.7
- @graphql-mesh/types@0.72.2
- @omnigraph/json-schema@0.19.5

## 0.6.4

### Patch Changes

- Updated dependencies [b9beacca2]
  - json-machete@0.8.3
  - @omnigraph/json-schema@0.19.4
  - @graphql-mesh/utils@0.34.6
  - @graphql-mesh/types@0.72.1

## 0.6.3

### Patch Changes

- Updated dependencies [fa2542468]
  - @graphql-mesh/types@0.72.0
  - @omnigraph/json-schema@0.19.3
  - @graphql-mesh/utils@0.34.5
  - json-machete@0.8.2

## 0.6.2

### Patch Changes

- Updated dependencies [ddbbec8a8]
  - @graphql-mesh/utils@0.34.4
  - json-machete@0.8.1
  - @omnigraph/json-schema@0.19.2
  - @graphql-mesh/types@0.71.4

## 0.6.1

### Patch Changes

- 2e9addd80: Bump cross-undici-fetch for Node 18 compat
- Updated dependencies [2e9addd80]
- Updated dependencies [2e9addd80]
  - json-machete@0.8.0
  - @omnigraph/json-schema@0.19.1
  - @graphql-mesh/utils@0.34.3
  - @graphql-mesh/types@0.71.3

## 0.6.0

### Minor Changes

- 2f395a4b2: feat(openapi): support empty values

### Patch Changes

- Updated dependencies [2f395a4b2]
  - @omnigraph/json-schema@0.19.0

## 0.5.2

### Patch Changes

- @graphql-mesh/types@0.71.2
- @omnigraph/json-schema@0.18.2
- @graphql-mesh/utils@0.34.2
- json-machete@0.7.15

## 0.5.1

### Patch Changes

- 7856f92d3: Bump all packages
- Updated dependencies [7856f92d3]
  - json-machete@0.7.14
  - @omnigraph/json-schema@0.18.1
  - @graphql-mesh/types@0.71.1
  - @graphql-mesh/utils@0.34.1

## 0.5.0

### Minor Changes

- 331b62637: feat(json-schema/openapi): support OpenAPI links and json pointer syntax in string interpolation

### Patch Changes

- 331b62637: fix(openapi): sanitize operationId before settings it as a GraphQL field name in the root type
- 331b62637: fix(openapi): handle empty responses(204) correctly
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [f963b57ce]
- Updated dependencies [0644f31f2]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
  - json-machete@0.7.13
  - @omnigraph/json-schema@0.18.0
  - @graphql-mesh/types@0.71.0
  - @graphql-mesh/utils@0.34.0

## 0.4.9

### Patch Changes

- json-machete@0.7.12
- @graphql-mesh/utils@0.33.6
- @omnigraph/json-schema@0.17.26
- @graphql-mesh/types@0.70.6

## 0.4.8

### Patch Changes

- @graphql-mesh/types@0.70.5
- @omnigraph/json-schema@0.17.25
- @graphql-mesh/utils@0.33.5
- json-machete@0.7.11

## 0.4.7

### Patch Changes

- Updated dependencies [35a55e841]
  - json-machete@0.7.10
  - @omnigraph/json-schema@0.17.24
  - @graphql-mesh/types@0.70.4
  - @graphql-mesh/utils@0.33.4

## 0.4.6

### Patch Changes

- @graphql-mesh/types@0.70.3
- @omnigraph/json-schema@0.17.23
- @graphql-mesh/utils@0.33.3
- json-machete@0.7.9

## 0.4.5

### Patch Changes

- Updated dependencies [d64c74b75]
  - json-machete@0.7.8
  - @omnigraph/json-schema@0.17.22

## 0.4.4

### Patch Changes

- Updated dependencies [b02f5b008]
- Updated dependencies [114629e47]
  - @graphql-mesh/types@0.70.2
  - json-machete@0.7.7
  - @omnigraph/json-schema@0.17.21
  - @graphql-mesh/utils@0.33.2

## 0.4.3

### Patch Changes

- Updated dependencies [26e69dbe9]
  - @omnigraph/json-schema@0.17.20

## 0.4.2

### Patch Changes

- 2d5c6c72a: add Git repository link in package.json
- Updated dependencies [2d5c6c72a]
  - json-machete@0.7.6
  - @omnigraph/json-schema@0.17.19
  - @graphql-mesh/types@0.70.1
  - @graphql-mesh/utils@0.33.1

## 0.4.1

### Patch Changes

- Updated dependencies [d567be7b5]
  - @graphql-mesh/types@0.70.0
  - @graphql-mesh/utils@0.33.0
  - @omnigraph/json-schema@0.17.18
  - json-machete@0.7.5

## 0.4.0

### Minor Changes

- f30dba61e: feat(openapi): add fallbackFormat

### Patch Changes

- Updated dependencies [f30dba61e]
  - @graphql-mesh/types@0.69.0
  - @omnigraph/json-schema@0.17.17
  - @graphql-mesh/utils@0.32.2
  - json-machete@0.7.4

## 0.3.28

### Patch Changes

- Updated dependencies [c53203723]
  - json-machete@0.7.3
  - @omnigraph/json-schema@0.17.16

## 0.3.27

### Patch Changes

- e67f6a621: fix(openapi): handle argTypeMap correctly
- Updated dependencies [c6f0314ac]
  - json-machete@0.7.2
  - @omnigraph/json-schema@0.17.15

## 0.3.26

### Patch Changes

- 3448c3177: fix(openapi): sanitize dynamic argument names
  - @omnigraph/json-schema@0.17.14
  - @graphql-mesh/utils@0.32.1
  - json-machete@0.7.1

## 0.3.25

### Patch Changes

- Updated dependencies [67fb11706]
  - json-machete@0.7.0
  - @graphql-mesh/utils@0.32.0
  - @omnigraph/json-schema@0.17.13

## 0.3.24

### Patch Changes

- Updated dependencies [b2c537c2a]
  - @graphql-mesh/utils@0.31.0
  - json-machete@0.6.1
  - @omnigraph/json-schema@0.17.12

## 0.3.23

### Patch Changes

- Updated dependencies [b45dac0c0]
- Updated dependencies [b45dac0c0]
  - json-machete@0.6.0
  - @omnigraph/json-schema@0.17.11

## 0.3.22

### Patch Changes

- @omnigraph/json-schema@0.17.10
- @graphql-mesh/utils@0.30.2
- json-machete@0.5.20

## 0.3.21

### Patch Changes

- @omnigraph/json-schema@0.17.9
- @graphql-mesh/utils@0.30.1
- json-machete@0.5.19

## 0.3.20

### Patch Changes

- Updated dependencies [01bac6bb5]
- Updated dependencies [01bac6bb5]
  - @omnigraph/json-schema@0.17.8
  - @graphql-mesh/utils@0.30.0
  - json-machete@0.5.18

## 0.3.19

### Patch Changes

- Updated dependencies [268db0462]
  - @graphql-mesh/utils@0.29.0
  - json-machete@0.5.17
  - @omnigraph/json-schema@0.17.7

## 0.3.18

### Patch Changes

- @omnigraph/json-schema@0.17.6
- @graphql-mesh/utils@0.28.5
- json-machete@0.5.16

## 0.3.17

### Patch Changes

- @omnigraph/json-schema@0.17.5
- @graphql-mesh/utils@0.28.4
- json-machete@0.5.15

## 0.3.16

### Patch Changes

- Updated dependencies [f11d8b9c8]
  - @omnigraph/json-schema@0.17.4
  - @graphql-mesh/utils@0.28.3
  - json-machete@0.5.14

## 0.3.15

### Patch Changes

- Updated dependencies [fb876e99c]
  - @graphql-mesh/utils@0.28.2
  - @omnigraph/json-schema@0.17.3
  - json-machete@0.5.13

## 0.3.14

### Patch Changes

- @omnigraph/json-schema@0.17.2
- @graphql-mesh/utils@0.28.1
- json-machete@0.5.12

## 0.3.13

### Patch Changes

- 6f07de8fe: fix: do not import process from env
- b481fbc39: enhance: add tslib to dependencies to reduce bundle size
- Updated dependencies [6f07de8fe]
- Updated dependencies [6f07de8fe]
- Updated dependencies [b481fbc39]
  - @graphql-mesh/utils@0.28.0
  - @omnigraph/json-schema@0.17.1
  - json-machete@0.5.11

## 0.3.12

### Patch Changes

- c12e30ae5: fix(openapi): correct types for path params

## 0.3.11

### Patch Changes

- Updated dependencies [21de17a3d]
- Updated dependencies [3f4bb09a9]
  - @omnigraph/json-schema@0.17.0
  - @graphql-mesh/utils@0.27.9
  - json-machete@0.5.10

## 0.3.10

### Patch Changes

- @omnigraph/json-schema@0.16.2
- @graphql-mesh/utils@0.27.8
- json-machete@0.5.9

## 0.3.9

### Patch Changes

- Updated dependencies [ca6bb5ff3]
- Updated dependencies [ca6bb5ff3]
  - json-machete@0.5.8
  - @graphql-mesh/utils@0.27.7
  - @omnigraph/json-schema@0.16.1

## 0.3.8

### Patch Changes

- Updated dependencies [275f82b53]
  - @omnigraph/json-schema@0.16.0

## 0.3.7

### Patch Changes

- Updated dependencies [c84d9e95e]
  - @omnigraph/json-schema@0.15.1

## 0.3.6

### Patch Changes

- Updated dependencies [12256ec58]
- Updated dependencies [e3f941db5]
  - @omnigraph/json-schema@0.15.0
  - @graphql-mesh/utils@0.27.6
  - json-machete@0.5.7

## 0.3.5

### Patch Changes

- Updated dependencies [1815865c3]
  - @omnigraph/json-schema@0.14.3
  - @graphql-mesh/utils@0.27.5
  - json-machete@0.5.6

## 0.3.4

### Patch Changes

- @omnigraph/json-schema@0.14.2
- @graphql-mesh/utils@0.27.4
- json-machete@0.5.5

## 0.3.3

### Patch Changes

- @omnigraph/json-schema@0.14.1
- @graphql-mesh/utils@0.27.3
- json-machete@0.5.4

## 0.3.2

### Patch Changes

- 0454c0f8a: fix(openapi): Interpolated required argument should be ID! not String!

## 0.3.1

### Patch Changes

- a00a88a97: fix(openapi): fix an issue when an arg is required

## 0.3.0

### Minor Changes

- 15e1f68c5: feat(json-schema): respect given samples in mocks transform

### Patch Changes

- Updated dependencies [c71b29004]
- Updated dependencies [15e1f68c5]
  - @graphql-mesh/utils@0.27.2
  - @omnigraph/json-schema@0.14.0
  - json-machete@0.5.3

## 0.2.0

### Minor Changes

- 240ec7b38: feat(openapi): selectQueryOrMutationField flag to choose what field belongs to what root type

### Patch Changes

- Updated dependencies [fcbd12a35]
- Updated dependencies [3a21004c9]
  - @graphql-mesh/utils@0.27.1
  - @omnigraph/json-schema@0.13.6
  - json-machete@0.5.2

## 0.1.7

### Patch Changes

- fb974bf73: fix(openapi): escape slashes in the content mimetype keys

## 0.1.6

### Patch Changes

- Updated dependencies [05ec30255]
  - @omnigraph/json-schema@0.13.5

## 0.1.5

### Patch Changes

- Updated dependencies [1c8827604]
  - json-machete@0.5.1
  - @omnigraph/json-schema@0.13.4

## 0.1.4

### Patch Changes

- Updated dependencies [49e9ca808]
- Updated dependencies [49e9ca808]
  - json-machete@0.5.0
  - @omnigraph/json-schema@0.13.3

## 0.1.3

### Patch Changes

- Updated dependencies [900a01355]
  - @graphql-mesh/utils@0.27.0
  - json-machete@0.4.3
  - @omnigraph/json-schema@0.13.2

## 0.1.2

### Patch Changes

- @omnigraph/json-schema@0.13.1
- @graphql-mesh/utils@0.26.4
- json-machete@0.4.2

## 0.1.1

### Patch Changes

- Updated dependencies [a79268b3a]
  - @omnigraph/json-schema@0.13.0
  - @graphql-mesh/utils@0.26.3
  - json-machete@0.4.1

## 0.1.0

### Minor Changes

- 020431bdc: feat(json-schema/openapi/raml): respect error status codes

### Patch Changes

- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
  - json-machete@0.4.0
  - @omnigraph/json-schema@0.12.0
  - @graphql-mesh/utils@0.26.2

## 0.0.8

### Patch Changes

- 50684ddbf: fix(openapi): add lowercased method prefix
- Updated dependencies [113091148]
- Updated dependencies [6bb4cf673]
  - @graphql-mesh/utils@0.26.1
  - @omnigraph/json-schema@0.11.2
  - json-machete@0.3.7

## 0.0.7

### Patch Changes

- Updated dependencies [92d687133]
- Updated dependencies [92d687133]
- Updated dependencies [92d687133]
  - @omnigraph/json-schema@0.11.1
  - json-machete@0.3.6

## 0.0.6

### Patch Changes

- Updated dependencies [b69233517]
  - @omnigraph/json-schema@0.11.0

## 0.0.5

### Patch Changes

- Updated dependencies [6d76179e4]
  - @omnigraph/json-schema@0.10.0

## 0.0.4

### Patch Changes

- Updated dependencies [e30494c95]
  - @omnigraph/json-schema@0.9.0

## 0.0.3

### Patch Changes

- Updated dependencies [8e52fd06a]
- Updated dependencies [1ab0aebbc]
- Updated dependencies [56e2257fa]
- Updated dependencies [56e2257fa]
  - json-machete@0.3.5
  - @omnigraph/json-schema@0.8.0
  - @graphql-mesh/utils@0.26.0

## 0.0.2

### Patch Changes

- Updated dependencies [2b876f2b8]
  - @graphql-mesh/utils@0.25.0
  - json-machete@0.3.4
  - @omnigraph/json-schema@0.7.4

## 0.0.1

### Patch Changes

- d907351c5: new OpenAPI Handler
- Updated dependencies [d907351c5]
- Updated dependencies [80eb8e92b]
- Updated dependencies [d907351c5]
- Updated dependencies [d907351c5]
  - json-machete@0.3.3
  - @omnigraph/json-schema@0.7.3
  - @graphql-mesh/utils@0.24.2
