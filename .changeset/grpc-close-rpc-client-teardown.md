---
'@graphql-mesh/transport-grpc': patch
'@graphql-mesh/grpc': patch
---

gRPC: tear down clients via `Client.prototype.close`

If a service defines an RPC named `Close`, that method was previously shadowing the
gRPC client's connection `close()`, so Mesh could not dispose the channel cleanly.
Teardown now always calls `Client.prototype.close`.

No config change is required — services with a `Close` RPC continue to expose that
operation in the GraphQL schema, while gateway/Mesh shutdown still closes the
underlying connection.
