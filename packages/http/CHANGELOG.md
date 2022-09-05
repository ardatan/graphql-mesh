# @graphql-mesh/http

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
