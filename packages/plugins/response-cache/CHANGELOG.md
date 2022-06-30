# @graphql-mesh/plugin-response-cache

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

  ```yml
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
