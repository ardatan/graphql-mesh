---
'@graphql-mesh/grpc': minor
'@graphql-mesh/transport-grpc': minor
'@omnigraph/grpc': minor
---

Handle multiple gRPC services correctly in a supergraph

Previously multiple directives on Query type conflicting, which needs to be fixed on Gateway runtime later, but for now, it should be already in the transport directive. And this change fixes the issue before the gateway runtime fix.

Generated schema will be different so this can be considered a breaking change but it will be no functional change for the existing users.
