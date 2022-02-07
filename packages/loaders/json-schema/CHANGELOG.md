# @omnigraph/json-schema

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
