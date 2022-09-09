# @graphql-mesh/http

## 0.1.4

### Patch Changes

- Updated dependencies [[`d84f81d94`](https://github.com/Urigo/graphql-mesh/commit/d84f81d9487ce228125863b8b283adab75daff19), [`d84f81d94`](https://github.com/Urigo/graphql-mesh/commit/d84f81d9487ce228125863b8b283adab75daff19)]:
  - @graphql-mesh/runtime@0.44.2
  - @graphql-mesh/utils@0.41.7

## 0.1.3

### Patch Changes

- [#4453](https://github.com/Urigo/graphql-mesh/pull/4453) [`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@whatwg-node/server@0.2.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.2.0) (from `0.1.2`, in `dependencies`)
  - Updated dependency [`@whatwg-node/fetch@0.4.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.4.2) (from `0.3.2`, in `dependencies`)

- Updated dependencies [[`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8), [`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8)]:
  - @graphql-mesh/runtime@0.44.1
  - @graphql-mesh/utils@0.41.6

## 0.1.2

### Patch Changes

- Updated dependencies [[`24afabece`](https://github.com/Urigo/graphql-mesh/commit/24afabece51aee171f902776d3f59b4a17026c49), [`44b868196`](https://github.com/Urigo/graphql-mesh/commit/44b86819695a298e60b1d7b6c54ae2772e8f1588)]:
  - @graphql-mesh/runtime@0.44.0
  - @graphql-mesh/utils@0.41.5

## 0.1.1

### Patch Changes

- Updated dependencies [[`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53), [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53), [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53)]:
  - @graphql-mesh/cross-helpers@0.2.4
  - @graphql-mesh/runtime@0.43.4
  - @graphql-mesh/utils@0.41.4

## 0.1.0

### Minor Changes

- [#4440](https://github.com/Urigo/graphql-mesh/pull/4440) [`b9bb80094`](https://github.com/Urigo/graphql-mesh/commit/b9bb8009407d27440267a5e9a7ec5dbfecc9bf8f) Thanks [@ardatan](https://github.com/ardatan)! - - Drop express and other Node specific server packages

  - Introduce a new platform agnostic HTTP handler package using itty-router and @whatwg-node/server
  - Introduce a new function in the artifacts that allows you to create a platform agnostic HTTP handler;

  For example in CF Workers

  ```ts
  import { createBuiltMeshHTTPHandler } from '../.mesh'

  self.addEventListener('fetch', createBuiltMeshHTTPHandler())
  ```

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/runtime@0.43.3
  - @graphql-mesh/utils@0.41.3
