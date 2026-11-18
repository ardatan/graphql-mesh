---
'@graphql-mesh/transport-protobuf': minor
'@omnigraph/protobuf': minor
'@graphql-mesh/grpc': minor
'@graphql-mesh/fusion-composition': minor
---

Breaking cutover: gRPC author/loader/transport surface replaced by a generic protobuf RPC stack that matches Mesh’s other typed-RPC author surfaces.

### Why

Hand-written and AI-authored SDL should describe protobuf RPCs without opaque `roots` / FileDescriptorSet bags on `@transport`. One transport kind covers gRPC dial today and HTTP unary via `http(s)://` locations. Field wire layout lives in typed `args` / `selection` mapping strings (field id + protobuf type), not in embedded descriptors.

### Packages / entrypoints

| Before | After |
| --- | --- |
| `@omnigraph/grpc` / `loadGrpcSubgraph` | `@omnigraph/protobuf` / `loadProtobufSubgraph` |
| `@graphql-mesh/transport-grpc` | `@graphql-mesh/transport-protobuf` |
| `@transport(kind: "grpc")` | `@transport(kind: "protobuf")` |

Legacy Mesh handler package `@graphql-mesh/grpc` still exists but depends on the new transport name.

### Author surface

- Directive: `@protobuf__rpc(service, method, args, selection, stream, entity)`
- `args` encodes GraphQL field arguments into the request message
- `selection` decodes the response message into GraphQL fields
- Mapping dialect uses **id + type** (e.g. `2(int64): year`); loader emits indented multiline strings with `#` comments (GraphQL `"""` block strings)
- Recursive messages use cycle-aware `message&` / `message&N`; mutual request recursion emits relative binds so nested scopes do not reuse root `input.*` field lists
- Package folders are `packages/loaders/protobuf` and `packages/transports/protobuf`
- No `@grpcMethod`, `@grpcConnectivityState`, `@enum` stamps, or synthetic connectivity fields
- No `options.roots` on `@transport`

### Transforms (Mesh composition, `packages/fusion/composition`)

Rename / naming-convention rewrite `@protobuf__rpc(args|selection)` binds to the public GraphQL names (no Mesh `@source` / `@meshSource`). ById semantic conventions stamp `@key` + `entity: true` instead of Mesh `@merge`.

- Field renames are **type-scoped** (e.g. `Review.year` does not rewrite `Movie.year`; a root field rename does not rewrite the same name on an unrelated input/object type)
- `#` comment lines are ignored while rewriting binds
- When a parent field rename and an argument rename diverge, the transform emits dual `$this.<parentPath>|$args.<argsPath>`. Runtime prefers a present parent key, then the explicit args path. Single-form `$this.path` still means parent-or-args with the same path
- `createNamingConventionTransform({ fieldArgumentNames })` feeds arg renames into that protobuf pass even when no fields are renamed

### Loader config

```ts
import { loadProtobufSubgraph } from '@omnigraph/protobuf';

loadProtobufSubgraph('movies', {
  type: 'grpc', // reserved for future HTTP-oriented emit conventions
  endpoint: 'localhost:50051',
  source: { file: './service.proto' },
});
```

Same `.proto` / reflection parse for all `type` values. Day one emit targets gRPC dial (`host:port`). HTTP unary can be hand-authored now via HTTPS `location`; loader emit for additional dial shapes can land later without a new package.

### Dial

- Non-HTTP `location` (e.g. `localhost:50051`) → gRPC channel + length-prefixed frames
- `http(s)://…` → unary HTTP POST to `{location}/{Service}/{Method}`
- Default HTTP `Content-Type` is `application/proto`; override via `@transport(headers:)` when a server expects `application/protobuf`
- HTTP path uses Mesh fetch: `context.fetch` / transport `fetch` / `@whatwg-node/fetch` (same as REST), not bare global `fetch`

E2E: `e2e/protobuf-http` runs hand `@protobuf__rpc` SDL against HTTP protobuf upstreams (flat hand args use `$args.*`; loader Input RPCs use `input.<field>`).

### Migration

1. Replace dependency `@omnigraph/grpc` → `@omnigraph/protobuf` and `@graphql-mesh/transport-grpc` → `@graphql-mesh/transport-protobuf`.
2. Replace `loadGrpcSubgraph` with `loadProtobufSubgraph` and set `type: 'grpc'`.
3. Recompose: expect `kind: "protobuf"` and `@protobuf__rpc` instead of `kind: "grpc"` / `@grpcMethod` / `@enum` / connectivity fields / `options.roots`.
4. Hand-written subgraphs: rewrite field directives to `@protobuf__rpc` with explicit `args` / `selection` mappings; drop connectivity Query fields.
5. Flat hand GraphQL args should bind with `$args.<name>` (or `$this…|$args…` after divergent renames). Loader-emitted Input RPCs keep `input.<field>` paths; nested input field renames are type-scoped and do not follow argument rename maps.
6. Gateway: register `transports.protobuf` (or rely on `@graphql-mesh/transport-protobuf` resolution by kind).
7. Snapshot / e2e updates: composed SDL and any tests asserting old directive names, roots JSON, Mesh `@source` / `@merge` on protobuf RPC, or non-dual `$this` after divergent renames will break on purpose.

Hand HTTP protobuf SDL examples: `packages/loaders/protobuf/examples/movies-connect.graphql`, `movies-twirp.graphql`.
