---
'@graphql-mesh/transport-protobuf': major
'@omnigraph/protobuf': major
'@graphql-mesh/grpc': major
'@graphql-mesh/fusion-composition': minor
---

Breaking cutover: gRPC author/loader/transport surface replaced by a generic protobuf RPC stack (same posture as the Thrift `@thrift__rpc` redesign).

### Why

Hand-written and AI-authored SDL should describe protobuf RPCs without opaque `roots` / FileDescriptorSet bags on `@transport`. One transport kind covers gRPC today and Connect/Twirp-style HTTP later. Field wire layout lives in typed `args` / `selection` mapping strings (field id + protobuf type), not in embedded descriptors.

### Packages / entrypoints

| Before | After |
| --- | --- |
| `@omnigraph/grpc` / `loadGrpcSubgraph` | `@omnigraph/protobuf` / `loadProtobufSubgraph` |
| `@graphql-mesh/transport-grpc` | `@graphql-mesh/transport-protobuf` |
| `@transport(kind: "grpc")` | `@transport(kind: "protobuf")` |

Legacy Mesh handler package `@graphql-mesh/grpc` still exists but depends on the new transport name.

### Author surface

- Directive: `@protobuf__rpc(service, method, args, selection, stream, entity)`
- `args` encodes GraphQL arguments into the request message (aligned with `@thrift__rpc(args:)`, **not** Connectors `body`)
- `selection` decodes the response message into GraphQL fields
- Mapping dialect uses **id + type** (e.g. `2(int64): year`); loader emits indented multiline strings with `#` comments for readability (GraphQL `"""` block strings)
- Rename / naming-convention transforms follow the Connectors posture: rewrite `@protobuf__rpc(args|selection)` binds to the public GraphQL names (no Mesh `@source` / `@meshSource`). ById semantic conventions stamp `@key` + `entity: true` instead of Mesh `@merge`
- Package directories are `packages/loaders/protobuf` and `packages/transports/protobuf` (npm names `@omnigraph/protobuf` / `@graphql-mesh/transport-protobuf`)
- No `@grpcMethod`, `@grpcConnectivityState`, `@enum` stamps, or synthetic connectivity fields
- No `options.roots` on `@transport`

### Loader config

```ts
import { loadProtobufSubgraph } from '@omnigraph/protobuf';

loadProtobufSubgraph('movies', {
  type: 'grpc', // reserved for future 'connect' | 'twirp' emit conventions
  endpoint: 'localhost:50051',
  source: { file: './service.proto' },
});
```

Same `.proto` / reflection parse for all `type` values. Day one emit targets gRPC dial (`host:port`). Connect/Twirp can be hand-authored now via HTTPS `location`; loader emit for those types can land later without a new package.

### Dial

- Non-HTTP `location` (e.g. `localhost:50051`) → gRPC channel + length-prefixed frames
- `http(s)://…` → unary HTTP POST to `{location}/{Service}/{Method}`
- Default HTTP `Content-Type` is `application/proto` (Connect unary binary); override via `@transport(headers:)` (Twirp binary needs `[["Content-Type", "application/protobuf"]]`)
- HTTP path uses Mesh fetch: `context.fetch` / transport `fetch` / `@whatwg-node/fetch` (same as REST), not bare global `fetch`

E2E: `e2e/protobuf-http` runs hand `@protobuf__rpc` SDL against official `@connectrpc/connect-node` and `twirp-ts` servers.

### Migration

1. Replace dependency `@omnigraph/grpc` → `@omnigraph/protobuf` and `@graphql-mesh/transport-grpc` → `@graphql-mesh/transport-protobuf`.
2. Replace `loadGrpcSubgraph` with `loadProtobufSubgraph` and set `type: 'grpc'`.
3. Recompose: expect `kind: "protobuf"` and `@protobuf__rpc` instead of `kind: "grpc"` / `@grpcMethod` / `@enum` / connectivity fields / `options.roots`.
4. Hand-written subgraphs: rewrite field directives to `@protobuf__rpc` with explicit `args` / `selection` mappings; drop connectivity Query fields.
5. Gateway: register `transports.protobuf` (or rely on `@graphql-mesh/transport-protobuf` resolution by kind).
6. Snapshot / e2e updates: composed SDL and any tests asserting old directive names or roots JSON will break on purpose.

Hand SDL examples (Connect / Twirp, no dedicated loaders): `packages/loaders/protobuf/examples/movies-connect.graphql`, `movies-twirp.graphql`.
