---
'@graphql-mesh/transport-protobuf': major
'@omnigraph/grpc': major
'@graphql-mesh/grpc': major
---

Breaking: gRPC author surface replaced by generic protobuf transport.

- `@transport(kind: "protobuf")` (package `@graphql-mesh/transport-protobuf`; was `kind: "grpc"` / `transport-grpc`)
- Field binding via `@protobuf__rpc(service, method, body, selection, stream)` with **id + protobuf type** mapping strings (no embedded `roots` / descriptors on `@transport`)
- Removed `@grpcMethod`, `@grpcConnectivityState`, `@enum` stamps, and synthetic connectivity fields
- gRPC loader still reads `.proto` / reflection at emit time and writes typed `body`/`selection`; dial is inferred from `location` (`host:port` → gRPC, `https://` → HTTP Connect/Twirp-style `application/proto`)

Hand-authored Connect/Twirp SDL examples: `packages/loaders/grpc/examples/movies-connect.graphql`, `movies-twirp.graphql`.
