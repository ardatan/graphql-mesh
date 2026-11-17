---
'@graphql-mesh/transport-protobuf': major
'@omnigraph/protobuf': major
'@graphql-mesh/grpc': major
---

Breaking: gRPC author/loader surface replaced by generic protobuf RPC.

- Loader package `@omnigraph/protobuf` with `loadProtobufSubgraph(..., { type: 'grpc' })` (same `.proto` parse; Connect/Twirp emit can follow)
- Transport `@graphql-mesh/transport-protobuf`, `kind: "protobuf"`
- `@protobuf__rpc(service, method, args, selection, stream)` — `args` matches `@thrift__rpc(args:)` (not Connectors `body`)
- No `roots` / descriptors on `@transport`; typed id+proto-type mapping strings
- Removed `@grpcMethod`, `@grpcConnectivityState`, `@enum` stamps, connectivity fields
- HTTP dial (Connect/Twirp-style) uses Mesh `fetch` (`context.fetch` / transport `fetch` / `@whatwg-node/fetch`), not bare global fetch

Hand SDL examples: `packages/loaders/grpc/examples/movies-connect.graphql`, `movies-twirp.graphql`.
