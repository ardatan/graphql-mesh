---
'@omnigraph/grpc': minor
'@graphql-mesh/transport-grpc': minor
'@graphql-mesh/grpc': minor
'@graphql-mesh/types': patch
---

gRPC: pass `channelOptions` through to the gRPC client

Use this for message size limits, keepalive, and other
[channel args](https://grpc.github.io/grpc/core/group__grpc__arg__keys.html).
Options are stored as entries so dotted keys like `grpc.max_receive_message_length`
stay GraphQL-safe in the composed schema.

```ts
import { defineConfig } from '@graphql-mesh/compose-cli'
import loadGrpcSubgraph from '@omnigraph/grpc'

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGrpcSubgraph('MyGrpcApi', {
        endpoint: 'localhost:50051',
        channelOptions: {
          'grpc.max_receive_message_length': 10_000_000,
          'grpc.keepalive_time_ms': 10_000,
          'grpc.keepalive_timeout_ms': 5_000,
          'grpc.keepalive_permit_without_calls': 1
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
        channelOptions:
          grpc.max_receive_message_length: 10000000
          grpc.keepalive_time_ms: 10000
```
