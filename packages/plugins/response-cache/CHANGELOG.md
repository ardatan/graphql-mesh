# @graphql-mesh/plugin-response-cache

## 0.1.11

### Patch Changes

- Updated dependencies [[`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)]:
  - @graphql-mesh/cross-helpers@0.2.1
  - @graphql-mesh/types@0.78.7
  - @graphql-mesh/utils@0.37.8

## 0.1.10

### Patch Changes

- Updated dependencies [[`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18), [`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b)]:
  - @graphql-mesh/utils@0.37.7
  - @graphql-mesh/types@0.78.6

## 0.1.9

### Patch Changes

- Updated dependencies [c88a34d82]
  - @graphql-mesh/types@0.78.5
  - @graphql-mesh/utils@0.37.6

## 0.1.8

### Patch Changes

- Updated dependencies [30d046724]
  - @graphql-mesh/utils@0.37.5
  - @graphql-mesh/types@0.78.4

## 0.1.7

### Patch Changes

- Updated dependencies [738e2f378]
  - @graphql-mesh/types@0.78.3
  - @graphql-mesh/utils@0.37.4

## 0.1.6

### Patch Changes

- Updated dependencies [a2ef35c35]
  - @graphql-mesh/types@0.78.2
  - @graphql-mesh/utils@0.37.3

## 0.1.5

### Patch Changes

- @graphql-mesh/types@0.78.1
- @graphql-mesh/utils@0.37.2

## 0.1.4

### Patch Changes

- Updated dependencies [6e6fd4ab7]
- Updated dependencies [bcd9355ee]
  - @graphql-mesh/utils@0.37.1
  - @graphql-mesh/types@0.78.0

## 0.1.3

### Patch Changes

- Updated dependencies [66f5d0189]
- Updated dependencies [0401c7617]
  - @graphql-mesh/types@0.77.1
  - @graphql-mesh/cross-helpers@0.2.0
  - @graphql-mesh/utils@0.37.0

## 0.1.2

### Patch Changes

- 12e1e5d72: **New Cloudflare KV Cache support!**

  Now you can basically use Cloudflare Workers' KV Caching system within Mesh;

  ```yaml
  cache:
    cfKv:
      namespace: MESH
  ```

  **Breaking changes for other cache packages**

  Now cache implementations should implement `getKeysByPrefix` that returns keys starting with the given prefix.

  **Response Cache Plugin Improvements**

  Response Cache plugin needs some complicated cache storage. So the relational entries related to specific cached responses and entities are now kept as seperate cache entries. Thanks to new `getKeysByPrefix`, we can now get a response by an entity id for example easier which is more performant.

- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
  - @graphql-mesh/cross-helpers@0.1.7
  - @graphql-mesh/types@0.77.0
  - @graphql-mesh/utils@0.36.1

## 0.1.1

### Patch Changes

- Updated dependencies [a0950ac6f]
  - @graphql-mesh/types@0.76.0

## 0.1.0

### Minor Changes

- d4754ad08: Response Cache Plugin

### Patch Changes

- Updated dependencies [d4754ad08]
- Updated dependencies [2df026e90]
  - @graphql-mesh/types@0.75.0
