---
'@graphql-mesh/transport-grpc': patch
'@graphql-mesh/types': patch
---

gRPC Client returns `undefined` for empty arrays but the transport should return them as empty
arrays
