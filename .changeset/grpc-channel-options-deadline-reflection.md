---
'@omnigraph/grpc': minor
'@graphql-mesh/transport-grpc': minor
'@graphql-mesh/grpc': minor
'@graphql-mesh/types': patch
---

gRPC: honor `requestTimeout` as call deadlines, support `channelOptions`, `reflectionMetadata`, and safe client close when an RPC is named `Close`.

- `requestTimeout` is now applied as a gRPC call deadline (fixes hung requests when the server never responds)
- New `channelOptions` config passes through to the gRPC client (e.g. `grpc.max_receive_message_length`, keepalive); options are serialized as entries so dotted gRPC keys are GraphQL-safe
- New `reflectionMetadata` is sent on gRPC reflection requests (routing / auth metadata for reflection)
- Empty `source` (including `{ file: '' }`) correctly falls back to reflection
- Connection teardown uses `Client.prototype.close` so an RPC named `Close` cannot shadow it
