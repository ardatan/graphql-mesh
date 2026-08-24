---
'@omnigraph/grpc': minor
'@graphql-mesh/transport-grpc': minor
'@graphql-mesh/grpc': minor
'@graphql-mesh/types': patch
---

gRPC: add `reflectionMetadata` for server-reflection requests

Send routing / auth metadata only when loading the schema via gRPC reflection
(no `source`). Runtime RPC metadata remains `metaData`; HTTP headers for a remote
`.graphql` SDL remain `schemaHeaders`.

```ts
import { defineConfig } from '@graphql-mesh/compose-cli'
import loadGrpcSubgraph from '@omnigraph/grpc'

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGrpcSubgraph('MyGrpcApi', {
        endpoint: 'localhost:50051',
        // No `source` → schema loaded via reflection
        reflectionMetadata: {
          'grpc-service': 'proto.MyGrpcService',
          authorization: 'Bearer {env.REFLECTION_TOKEN}',
        },
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
        reflectionMetadata:
          grpc-service: proto.MyGrpcService
          authorization: 'Bearer {env.REFLECTION_TOKEN}'
```
