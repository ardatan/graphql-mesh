---
'@omnigraph/grpc': patch
'@graphql-mesh/grpc': patch
---

gRPC: treat missing or empty `source` as reflection

Omitting `source`, setting it to `''`, or using `{ file: '' }` now correctly falls
back to gRPC server reflection instead of failing to load a proto/descriptor.

```ts
import { defineConfig } from '@graphql-mesh/compose-cli'
import loadGrpcSubgraph from '@omnigraph/grpc'

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGrpcSubgraph('MyGrpcApi', {
        endpoint: 'localhost:50051',
        // source omitted → reflection
      }),
    },
  ],
})
```

Legacy Mesh (empty file path also reflects):

```yaml
sources:
  - name: MyGrpcApi
    handler:
      grpc:
        endpoint: localhost:50051
        # source omitted or empty → reflection
```
