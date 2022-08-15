# @graphql-mesh/new-openapi

## 0.6.2

### Patch Changes

- Updated dependencies [[`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968)]:
  - @graphql-mesh/store@0.8.28
  - @graphql-mesh/types@0.78.8
  - @graphql-mesh/utils@0.37.9
  - @omnigraph/openapi@0.8.2

## 0.6.1

### Patch Changes

- Updated dependencies [[`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)]:
  - @graphql-mesh/store@0.8.27
  - @graphql-mesh/types@0.78.7
  - @graphql-mesh/utils@0.37.8
  - @omnigraph/openapi@0.8.1

## 0.6.0

### Minor Changes

- [#4247](https://github.com/Urigo/graphql-mesh/pull/4247) [`31fc25974`](https://github.com/Urigo/graphql-mesh/commit/31fc259744b77a6a649487562f59e97f2e08e3aa) Thanks [@ardatan](https://github.com/ardatan)! - Accept a code file for `operationHeaders`

  Now you can generate headers dynamically from the resolver data dynamically like below;

  ```yml
  operationHeaders: ./myOperationHeaders.ts
  ```

  And in `myOperationHeaders.ts`

  ```ts
  export default function myOperationHeaders({ context }: ResolverData) {
    const someToken = context.request.headers.get('some-token')
    const anotherToken = await someLogicThatReturnsAnotherToken(someToken)
    return {
      'x-bar-token': anotherToken
    }
  }
  ```

### Patch Changes

- Updated dependencies [[`be784e653`](https://github.com/Urigo/graphql-mesh/commit/be784e6533f0c66774d1251382082f0a426e0978), [`be784e653`](https://github.com/Urigo/graphql-mesh/commit/be784e6533f0c66774d1251382082f0a426e0978), [`31fc25974`](https://github.com/Urigo/graphql-mesh/commit/31fc259744b77a6a649487562f59e97f2e08e3aa)]:
  - @omnigraph/openapi@0.8.0

## 0.5.11

### Patch Changes

- Updated dependencies [[`d0498f79b`](https://github.com/Urigo/graphql-mesh/commit/d0498f79bfc43060d279bad329337de307c13118), [`755d3d487`](https://github.com/Urigo/graphql-mesh/commit/755d3d487c3069664a96e71732fa25aa2d161b1b)]:
  - @omnigraph/openapi@0.7.11

## 0.5.10

### Patch Changes

- Updated dependencies [[`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18), [`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b), [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834), [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834)]:
  - @omnigraph/openapi@0.7.10
  - @graphql-mesh/utils@0.37.7
  - @graphql-mesh/types@0.78.6
  - @graphql-mesh/store@0.8.26

## 0.5.9

### Patch Changes

- Updated dependencies [583da37fc]
  - @omnigraph/openapi@0.7.9

## 0.5.8

### Patch Changes

- Updated dependencies [c88a34d82]
  - @graphql-mesh/types@0.78.5
  - @omnigraph/openapi@0.7.8
  - @graphql-mesh/store@0.8.25
  - @graphql-mesh/utils@0.37.6

## 0.5.7

### Patch Changes

- Updated dependencies [30d046724]
  - @graphql-mesh/utils@0.37.5
  - @omnigraph/openapi@0.7.7
  - @graphql-mesh/store@0.8.24
  - @graphql-mesh/types@0.78.4

## 0.5.6

### Patch Changes

- Updated dependencies [738e2f378]
  - @graphql-mesh/types@0.78.3
  - @omnigraph/openapi@0.7.6
  - @graphql-mesh/store@0.8.23
  - @graphql-mesh/utils@0.37.4

## 0.5.5

### Patch Changes

- Updated dependencies [a2ef35c35]
  - @omnigraph/openapi@0.7.5
  - @graphql-mesh/types@0.78.2
  - @graphql-mesh/utils@0.37.3
  - @graphql-mesh/store@0.8.22

## 0.5.4

### Patch Changes

- Updated dependencies [2e89d814b]
  - @graphql-mesh/store@0.8.21
  - @graphql-mesh/types@0.78.1
  - @omnigraph/openapi@0.7.4
  - @graphql-mesh/utils@0.37.2

## 0.5.3

### Patch Changes

- Updated dependencies [6e6fd4ab7]
- Updated dependencies [bcd9355ee]
  - @graphql-mesh/utils@0.37.1
  - @graphql-mesh/types@0.78.0
  - @omnigraph/openapi@0.7.3
  - @graphql-mesh/store@0.8.20

## 0.5.2

### Patch Changes

- Updated dependencies [66f5d0189]
- Updated dependencies [0401c7617]
  - @graphql-mesh/types@0.77.1
  - @graphql-mesh/utils@0.37.0
  - @omnigraph/openapi@0.7.2
  - @graphql-mesh/store@0.8.19

## 0.5.1

### Patch Changes

- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
  - @graphql-mesh/types@0.77.0
  - @omnigraph/openapi@0.7.1
  - @graphql-mesh/store@0.8.18
  - @graphql-mesh/utils@0.36.1

## 0.5.0

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
  - @omnigraph/openapi@0.7.0
  - @graphql-mesh/types@0.76.0
  - @graphql-mesh/store@0.8.17

## 0.4.28

### Patch Changes

- Updated dependencies [d4754ad08]
- Updated dependencies [2df026e90]
  - @graphql-mesh/types@0.75.0
  - @omnigraph/openapi@0.6.16
  - @graphql-mesh/store@0.8.16
  - @graphql-mesh/utils@0.35.7

## 0.4.27

### Patch Changes

- Updated dependencies [ed9ba7f48]
  - @graphql-mesh/types@0.74.2
  - @graphql-mesh/utils@0.35.6
  - @omnigraph/openapi@0.6.15
  - @graphql-mesh/store@0.8.15

## 0.4.26

### Patch Changes

- Updated dependencies [41cfb46b4]
  - @graphql-mesh/utils@0.35.5
  - @omnigraph/openapi@0.6.14
  - @graphql-mesh/store@0.8.14
  - @graphql-mesh/types@0.74.1

## 0.4.25

### Patch Changes

- Updated dependencies [13b9b30f7]
  - @graphql-mesh/types@0.74.0
  - @omnigraph/openapi@0.6.13
  - @graphql-mesh/utils@0.35.4
  - @graphql-mesh/store@0.8.13

## 0.4.24

### Patch Changes

- Updated dependencies [9733f490c]
  - @graphql-mesh/utils@0.35.3
  - @omnigraph/openapi@0.6.12
  - @graphql-mesh/store@0.8.12
  - @graphql-mesh/types@0.73.3

## 0.4.23

### Patch Changes

- Updated dependencies [3c0366d2c]
- Updated dependencies [3c0366d2c]
  - @omnigraph/openapi@0.6.11
  - @graphql-mesh/utils@0.35.2
  - @graphql-mesh/store@0.8.11
  - @graphql-mesh/types@0.73.2

## 0.4.22

### Patch Changes

- Updated dependencies [abe9fcc41]
  - @graphql-mesh/utils@0.35.1
  - @omnigraph/openapi@0.6.10
  - @graphql-mesh/store@0.8.10
  - @graphql-mesh/types@0.73.1

## 0.4.21

### Patch Changes

- 974e703e2: Cleanup dependencies
- Updated dependencies [974e703e2]
- Updated dependencies [19a99c055]
- Updated dependencies [974e703e2]
- Updated dependencies [974e703e2]
- Updated dependencies [893d526ab]
- Updated dependencies [974e703e2]
  - @omnigraph/openapi@0.6.9
  - @graphql-mesh/store@0.8.9
  - @graphql-mesh/types@0.73.0
  - @graphql-mesh/utils@0.35.0

## 0.4.20

### Patch Changes

- Updated dependencies [43eb3d2c2]
  - @graphql-mesh/utils@0.34.10
  - @omnigraph/openapi@0.6.8
  - @graphql-mesh/store@0.8.8
  - @graphql-mesh/types@0.72.5

## 0.4.19

### Patch Changes

- Updated dependencies [55ad5ea44]
  - @graphql-mesh/utils@0.34.9
  - @graphql-mesh/store@0.8.7
  - @omnigraph/openapi@0.6.7
  - @graphql-mesh/types@0.72.4

## 0.4.18

### Patch Changes

- Updated dependencies [31efa964e]
  - @graphql-mesh/utils@0.34.8
  - @omnigraph/openapi@0.6.6
  - @graphql-mesh/store@0.8.6
  - @graphql-mesh/types@0.72.3

## 0.4.17

### Patch Changes

- Updated dependencies [66b9b3ddc]
  - @graphql-mesh/store@0.8.5
  - @graphql-mesh/utils@0.34.7
  - @graphql-mesh/types@0.72.2
  - @omnigraph/openapi@0.6.5

## 0.4.16

### Patch Changes

- Updated dependencies [b9beacca2]
  - @graphql-mesh/utils@0.34.6
  - @omnigraph/openapi@0.6.4
  - @graphql-mesh/store@0.8.4
  - @graphql-mesh/types@0.72.1

## 0.4.15

### Patch Changes

- Updated dependencies [fa2542468]
  - @graphql-mesh/types@0.72.0
  - @omnigraph/openapi@0.6.3
  - @graphql-mesh/store@0.8.3
  - @graphql-mesh/utils@0.34.5

## 0.4.14

### Patch Changes

- Updated dependencies [ddbbec8a8]
  - @graphql-mesh/utils@0.34.4
  - @omnigraph/openapi@0.6.2
  - @graphql-mesh/store@0.8.2
  - @graphql-mesh/types@0.71.4

## 0.4.13

### Patch Changes

- Updated dependencies [2e9addd80]
  - @omnigraph/openapi@0.6.1
  - @graphql-mesh/utils@0.34.3
  - @graphql-mesh/store@0.8.1
  - @graphql-mesh/types@0.71.3

## 0.4.12

### Patch Changes

- Updated dependencies [2f395a4b2]
  - @omnigraph/openapi@0.6.0

## 0.4.11

### Patch Changes

- Updated dependencies [8c8b304e5]
  - @graphql-mesh/store@0.8.0
  - @graphql-mesh/types@0.71.2
  - @omnigraph/openapi@0.5.2
  - @graphql-mesh/utils@0.34.2

## 0.4.10

### Patch Changes

- 7856f92d3: Bump all packages
- Updated dependencies [7856f92d3]
  - @omnigraph/openapi@0.5.1
  - @graphql-mesh/store@0.7.8
  - @graphql-mesh/types@0.71.1
  - @graphql-mesh/utils@0.34.1

## 0.4.9

### Patch Changes

- Updated dependencies [331b62637]
- Updated dependencies [f963b57ce]
- Updated dependencies [0644f31f2]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
  - @omnigraph/openapi@0.5.0
  - @graphql-mesh/types@0.71.0
  - @graphql-mesh/utils@0.34.0
  - @graphql-mesh/store@0.7.7

## 0.4.8

### Patch Changes

- @graphql-mesh/store@0.7.6
- @graphql-mesh/utils@0.33.6
- @omnigraph/openapi@0.4.9
- @graphql-mesh/types@0.70.6

## 0.4.7

### Patch Changes

- Updated dependencies [decbe5fbb]
  - @graphql-mesh/store@0.7.5
  - @graphql-mesh/types@0.70.5
  - @omnigraph/openapi@0.4.8
  - @graphql-mesh/utils@0.33.5

## 0.4.6

### Patch Changes

- Updated dependencies [35a55e841]
  - @graphql-mesh/store@0.7.4
  - @graphql-mesh/types@0.70.4
  - @graphql-mesh/utils@0.33.4
  - @omnigraph/openapi@0.4.7

## 0.4.5

### Patch Changes

- Updated dependencies [4fa959de3]
  - @graphql-mesh/store@0.7.3
  - @graphql-mesh/types@0.70.3
  - @omnigraph/openapi@0.4.6
  - @graphql-mesh/utils@0.33.3

## 0.4.4

### Patch Changes

- @omnigraph/openapi@0.4.5

## 0.4.3

### Patch Changes

- Updated dependencies [b02f5b008]
  - @graphql-mesh/types@0.70.2
  - @omnigraph/openapi@0.4.4
  - @graphql-mesh/store@0.7.2
  - @graphql-mesh/utils@0.33.2

## 0.4.2

### Patch Changes

- @omnigraph/openapi@0.4.3

## 0.4.1

### Patch Changes

- 2d5c6c72a: add Git repository link in package.json
- Updated dependencies [2d5c6c72a]
  - @omnigraph/openapi@0.4.2
  - @graphql-mesh/store@0.7.1
  - @graphql-mesh/types@0.70.1
  - @graphql-mesh/utils@0.33.1

## 0.4.0

### Minor Changes

- d567be7b5: feat(json-schema): support bundles from different sources

### Patch Changes

- Updated dependencies [d567be7b5]
- Updated dependencies [d567be7b5]
  - @graphql-mesh/types@0.70.0
  - @graphql-mesh/utils@0.33.0
  - @graphql-mesh/store@0.7.0
  - @omnigraph/openapi@0.4.1

## 0.3.0

### Minor Changes

- f30dba61e: feat(openapi): pass fallbackFormat for the urls that don't have an extension
- f30dba61e: feat(openapi): add fallbackFormat

### Patch Changes

- Updated dependencies [f30dba61e]
  - @omnigraph/openapi@0.4.0
  - @graphql-mesh/types@0.69.0
  - @graphql-mesh/store@0.6.2
  - @graphql-mesh/utils@0.32.2

## 0.2.8

### Patch Changes

- @omnigraph/openapi@0.3.28

## 0.2.7

### Patch Changes

- Updated dependencies [e67f6a621]
  - @omnigraph/openapi@0.3.27

## 0.2.6

### Patch Changes

- Updated dependencies [3448c3177]
- Updated dependencies [be61de529]
  - @omnigraph/openapi@0.3.26
  - @graphql-mesh/types@0.68.3
  - @graphql-mesh/store@0.6.1
  - @graphql-mesh/utils@0.32.1

## 0.2.5

### Patch Changes

- Updated dependencies [b1a6df928]
- Updated dependencies [67fb11706]
  - @graphql-mesh/types@0.68.2
  - @graphql-mesh/store@0.6.0
  - @graphql-mesh/utils@0.32.0
  - @omnigraph/openapi@0.3.25

## 0.2.4

### Patch Changes

- Updated dependencies [b2c537c2a]
  - @graphql-mesh/store@0.5.0
  - @graphql-mesh/utils@0.31.0
  - @graphql-mesh/types@0.68.1
  - @omnigraph/openapi@0.3.24

## 0.2.3

### Patch Changes

- @omnigraph/openapi@0.3.23

## 0.2.2

### Patch Changes

- Updated dependencies [6c318b91a]
  - @graphql-mesh/types@0.68.0
  - @graphql-mesh/store@0.4.2
  - @graphql-mesh/utils@0.30.2
  - @omnigraph/openapi@0.3.22

## 0.2.1

### Patch Changes

- Updated dependencies [4c7b90a87]
  - @graphql-mesh/store@0.4.1
  - @graphql-mesh/types@0.67.1
  - @graphql-mesh/utils@0.30.1
  - @omnigraph/openapi@0.3.21

## 0.2.0

### Minor Changes

- 01bac6bb5: enhance: reduce memory consumption

### Patch Changes

- 01bac6bb5: fix - align graphql-tools versions
- Updated dependencies [01bac6bb5]
- Updated dependencies [01bac6bb5]
  - @graphql-mesh/store@0.4.0
  - @graphql-mesh/types@0.67.0
  - @graphql-mesh/utils@0.30.0
  - @omnigraph/openapi@0.3.20

## 0.1.20

### Patch Changes

- Updated dependencies [268db0462]
  - @graphql-mesh/utils@0.29.0
  - @omnigraph/openapi@0.3.19
  - @graphql-mesh/store@0.3.29
  - @graphql-mesh/types@0.66.6

## 0.1.19

### Patch Changes

- Updated dependencies [2ffb1f287]
  - @graphql-mesh/types@0.66.5
  - @graphql-mesh/store@0.3.28
  - @graphql-mesh/utils@0.28.5
  - @omnigraph/openapi@0.3.18

## 0.1.18

### Patch Changes

- Updated dependencies [6d2d46480]
  - @graphql-mesh/types@0.66.4
  - @graphql-mesh/store@0.3.27
  - @graphql-mesh/utils@0.28.4
  - @omnigraph/openapi@0.3.17

## 0.1.17

### Patch Changes

- Updated dependencies [f11d8b9c8]
  - @graphql-mesh/store@0.3.26
  - @omnigraph/openapi@0.3.16
  - @graphql-mesh/types@0.66.3
  - @graphql-mesh/utils@0.28.3

## 0.1.16

### Patch Changes

- Updated dependencies [fb876e99c]
  - @graphql-mesh/types@0.66.2
  - @graphql-mesh/utils@0.28.2
  - @omnigraph/openapi@0.3.15
  - @graphql-mesh/store@0.3.25

## 0.1.15

### Patch Changes

- Updated dependencies [98ff961ff]
  - @graphql-mesh/types@0.66.1
  - @graphql-mesh/utils@0.28.1
  - @omnigraph/openapi@0.3.14
  - @graphql-mesh/store@0.3.24

## 0.1.14

### Patch Changes

- b481fbc39: enhance: add tslib to dependencies to reduce bundle size
- Updated dependencies [6f07de8fe]
- Updated dependencies [6f07de8fe]
- Updated dependencies [b481fbc39]
  - @graphql-mesh/types@0.66.0
  - @graphql-mesh/utils@0.28.0
  - @omnigraph/openapi@0.3.13
  - @graphql-mesh/store@0.3.23

## 0.1.13

### Patch Changes

- Updated dependencies [c12e30ae5]
  - @omnigraph/openapi@0.3.12

## 0.1.12

### Patch Changes

- Updated dependencies [21de17a3d]
- Updated dependencies [3f4bb09a9]
  - @graphql-mesh/types@0.65.0
  - @graphql-mesh/utils@0.27.9
  - @omnigraph/openapi@0.3.11
  - @graphql-mesh/store@0.3.22

## 0.1.11

### Patch Changes

- Updated dependencies [8b8eb5158]
- Updated dependencies [8b8eb5158]
  - @graphql-mesh/types@0.64.2
  - @graphql-mesh/utils@0.27.8
  - @omnigraph/openapi@0.3.10
  - @graphql-mesh/store@0.3.21

## 0.1.10

### Patch Changes

- Updated dependencies [ca6bb5ff3]
  - @graphql-mesh/utils@0.27.7
  - @omnigraph/openapi@0.3.9
  - @graphql-mesh/store@0.3.20
  - @graphql-mesh/types@0.64.1

## 0.1.9

### Patch Changes

- @omnigraph/openapi@0.3.8

## 0.1.8

### Patch Changes

- @omnigraph/openapi@0.3.7

## 0.1.7

### Patch Changes

- Updated dependencies [08b250e04]
  - @graphql-mesh/types@0.64.0
  - @omnigraph/openapi@0.3.6
  - @graphql-mesh/utils@0.27.6
  - @graphql-mesh/store@0.3.19

## 0.1.6

### Patch Changes

- Updated dependencies [1815865c3]
  - @graphql-mesh/store@0.3.18
  - @graphql-mesh/types@0.63.1
  - @graphql-mesh/utils@0.27.5
  - @omnigraph/openapi@0.3.5

## 0.1.5

### Patch Changes

- Updated dependencies [b6eca9baa]
- Updated dependencies [b6eca9baa]
  - @graphql-mesh/types@0.63.0
  - @graphql-mesh/utils@0.27.4
  - @omnigraph/openapi@0.3.4
  - @graphql-mesh/store@0.3.17

## 0.1.4

### Patch Changes

- Updated dependencies [0d43ecf19]
  - @graphql-mesh/types@0.62.2
  - @graphql-mesh/utils@0.27.3
  - @omnigraph/openapi@0.3.3
  - @graphql-mesh/store@0.3.16

## 0.1.3

### Patch Changes

- Updated dependencies [0454c0f8a]
  - @omnigraph/openapi@0.3.2

## 0.1.2

### Patch Changes

- Updated dependencies [a00a88a97]
  - @omnigraph/openapi@0.3.1

## 0.1.1

### Patch Changes

- Updated dependencies [c71b29004]
- Updated dependencies [15e1f68c5]
- Updated dependencies [447bc3697]
  - @graphql-mesh/utils@0.27.2
  - @omnigraph/openapi@0.3.0
  - @graphql-mesh/types@0.62.1
  - @graphql-mesh/store@0.3.15

## 0.1.0

### Minor Changes

- 240ec7b38: feat(openapi): selectQueryOrMutationField flag to choose what field belongs to what root type

### Patch Changes

- Updated dependencies [240ec7b38]
- Updated dependencies [fcbd12a35]
  - @omnigraph/openapi@0.2.0
  - @graphql-mesh/types@0.62.0
  - @graphql-mesh/utils@0.27.1
  - @graphql-mesh/store@0.3.14

## 0.0.16

### Patch Changes

- Updated dependencies [fb974bf73]
  - @omnigraph/openapi@0.1.7

## 0.0.15

### Patch Changes

- @omnigraph/openapi@0.1.6

## 0.0.14

### Patch Changes

- @omnigraph/openapi@0.1.5

## 0.0.13

### Patch Changes

- @omnigraph/openapi@0.1.4

## 0.0.12

### Patch Changes

- Updated dependencies [900a01355]
  - @graphql-mesh/utils@0.27.0
  - @omnigraph/openapi@0.1.3
  - @graphql-mesh/store@0.3.13

## 0.0.11

### Patch Changes

- Updated dependencies [66ca1a366]
  - @graphql-mesh/types@0.61.0
  - @graphql-mesh/utils@0.26.4
  - @omnigraph/openapi@0.1.2
  - @graphql-mesh/store@0.3.12

## 0.0.10

### Patch Changes

- Updated dependencies [a79268b3a]
- Updated dependencies [a79268b3a]
  - @graphql-mesh/types@0.60.0
  - @graphql-mesh/utils@0.26.3
  - @omnigraph/openapi@0.1.1
  - @graphql-mesh/store@0.3.11

## 0.0.9

### Patch Changes

- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
  - @omnigraph/openapi@0.1.0
  - @graphql-mesh/types@0.59.0
  - @graphql-mesh/utils@0.26.2
  - @graphql-mesh/store@0.3.10

## 0.0.8

### Patch Changes

- Updated dependencies [113091148]
- Updated dependencies [6bb4cf673]
- Updated dependencies [50684ddbf]
  - @graphql-mesh/utils@0.26.1
  - @graphql-mesh/types@0.58.0
  - @omnigraph/openapi@0.0.8
  - @graphql-mesh/store@0.3.9

## 0.0.7

### Patch Changes

- @omnigraph/openapi@0.0.7

## 0.0.6

### Patch Changes

- @omnigraph/openapi@0.0.6

## 0.0.5

### Patch Changes

- @omnigraph/openapi@0.0.5

## 0.0.4

### Patch Changes

- @omnigraph/openapi@0.0.4

## 0.0.3

### Patch Changes

- Updated dependencies [1ab0aebbc]
- Updated dependencies [56e2257fa]
- Updated dependencies [56e2257fa]
  - @graphql-mesh/types@0.57.2
  - @graphql-mesh/utils@0.26.0
  - @omnigraph/openapi@0.0.3
  - @graphql-mesh/store@0.3.8

## 0.0.2

### Patch Changes

- Updated dependencies [2b876f2b8]
  - @graphql-mesh/utils@0.25.0
  - @omnigraph/openapi@0.0.2
  - @graphql-mesh/store@0.3.7

## 0.0.1

### Patch Changes

- d907351c5: new OpenAPI Handler
- Updated dependencies [d907351c5]
  - @omnigraph/openapi@0.0.1
  - @graphql-mesh/types@0.57.1
  - @graphql-mesh/utils@0.24.2
  - @graphql-mesh/store@0.3.6
