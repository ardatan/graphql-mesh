---
'@graphql-mesh/transport-grpc': patch
'@omnigraph/grpc': patch
---

Support characters that are invalid for GraphQL but valid for gRPC in metadata definitions.

For example, hyphens (-) are not allowed in GraphQL field names, but they are commonly used in gRPC metadata keys. This change ensures that such characters are preserved when passing metadata from GraphQL Mesh to gRPC services.

```ts
// mesh.config.ts
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadGrpcSubgraph } from '@omnigraph/grpc';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGrpcSubgraph('myService', {
        endpoint: 'localhost:50051',
        source: './service.proto',
        metaData: {
          "x-request-id": "{context.headers['x-request-id']}",  // ← hyphen in key causes issue
        },
      }),
    },
  ],
});
```
