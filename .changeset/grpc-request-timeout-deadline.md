---
'@omnigraph/grpc': minor
'@graphql-mesh/transport-grpc': minor
'@graphql-mesh/grpc': minor
---

gRPC: apply `requestTimeout` as a real per-call deadline

Previously `requestTimeout` was not enforced as a gRPC deadline, so a hung upstream
could leave the GraphQL request waiting indefinitely. It is now set on each call via
`CallOptions.deadline` (`Date.now() + requestTimeout`).

```ts
import { defineConfig } from '@graphql-mesh/compose-cli'
import loadGrpcSubgraph from '@omnigraph/grpc'

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGrpcSubgraph('MyGrpcApi', {
        endpoint: 'localhost:50051',
        // Fail the call if the server does not respond within 5s
        requestTimeout: 5000,
      }),
    },
  ],
})
```

Legacy Mesh:

```yaml
sources:
  - name: MyGrpcApi
    handler:
      grpc:
        endpoint: localhost:50051
        requestTimeout: 5000
```
