---
'@graphql-mesh/cli': minor
'@graphql-mesh/http': minor
---

- Drop express and other Node specific server packages
- Introduce a new platform agnostic HTTP handler package using itty-router and @whatwg-node/server
- Introduce a new function in the artifacts that allows you to create a platform agnostic HTTP handler;

For example in CF Workers
```ts
import { createBuiltMeshHTTPHandler } from '../.mesh';

self.addEventListener('fetch', createBuiltMeshHTTPHandler());
```
