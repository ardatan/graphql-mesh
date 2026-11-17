---
'@omnigraph/thrift': minor
'@graphql-mesh/transport-thrift': minor
'@graphql-mesh/transport-rest': patch
'@graphql-mesh/fusion-composition': patch
---

### TL;DR

If you load Thrift from IDL and **recompose** after upgrading, you are mostly done.

- **Breaking:** `@fieldTypeMap` / `@thrift__method` / `topTypeMap` / `clientAnnotations` are removed (no dual-read). Regenerate composed SDL.
- **Default:** binary HTTP Thrift via slim `@transport` + per-field `@thrift__rpc` (readable compact `args` / `selection`).
- **Opt-in:** `protocol: 'json'` emits Federation `@source` / `@connect` (TJSON) for Hive and Apollo Router.
- **Optional:** `ignoreExceptions`, `entityMethods`, `serviceName`.

### Why

The old surface stamped opaque `@fieldTypeMap` bags and a large `@transport.options` (`clientAnnotations`, `topTypeMap`). Field ids and exact Thrift types (`i16` vs `i32`) were hard to hand-write or review; GraphQL `Int` cannot carry that distinction. Binary was Mesh-only (no Router-friendly TJSON emit). IDL `throws` / `oneway` were ignored, so JSON throws could become silent `null`.

### Breaking

**Removed / no longer executed:** `@fieldTypeMap`, `@thrift__method` (older draft name), `@transport.options.clientAnnotations` / `topTypeMap`, and any transport path that preferred those bags when the new directive was absent.

**Required:** recompose / regenerate Thrift subgraphs from IDL. Hand-written `@fieldTypeMap` / `@thrift__method` SDL will not run until rewritten to `@thrift__rpc` (binary) or `@connect` (JSON).

### What changed

#### Binary — `protocol: 'binary'` (default)

- Slim `@transport(subgraph, kind: "thrift", location, headers)` — no options bag.
- Per-field `@thrift__rpc(function, args, selection, throws?, messageType, entity?)`.
- Compact mapping keeps wire types explicit (`1(i32): left`, `$(i16)`, containers, nested maps); multiline values print as `"""`.
- `function` is always the IDL name. Single-service generate **omits** `service:` (path is on `@transport`).
- `messageType: ONEWAY` does not wait for / decode a reply.
- `entity: true` only via loader `entityMethods` (Federation entity Query fields).
- Transport executes `@thrift__rpc` by field id (no `topTypeMap`).
- GraphQL enum values are Thrift i32 integers. Recursive struct **arguments** fail at generate (no silent empty truncation).

#### JSON — `protocol: 'json'`

Emits `@source` + `@connect` (TJSON) instead of thrift `@transport`:

- `Content-Type` / `Accept`: `application/vnd.apache.thrift.json`
- Path `/`, or `/<service>` when `serviceName` is set
- Body message types CALL=`1`, ONEWAY=`4`
- `isSuccess` / `errors` so declared throws and `TApplicationException` are not silent nulls; ONEWAY omits `isSuccess`

#### Exceptions

1. **`TApplicationException`:** binary throws; JSON uses `isSuccess` / `errors`.
2. **IDL `throws`:** `ignoreExceptions` defaults to `true`. Set `false` for GraphQL unions + `@thrift__rpc(throws:)`.

#### Transforms

Fusion rename / naming-convention rewrite `$args…` inside `@thrift__rpc(args/selection/throws)` the same way as `@connect`. No `@merge` / `@meshSource` for thrift.

### Migration

1. Upgrade and **recompose** (prefer regenerate from IDL).
2. Replace hand-written `@fieldTypeMap` / `@thrift__method` + transport `options` with `@thrift__rpc` or `protocol: 'json'`.
3. Keep binary `@transport` to `location` + `headers` only.
4. Single-service: no `service:` required on `@thrift__rpc`. TJSON multiplex: set `serviceName`.
5. Optional: `ignoreExceptions: false`; `entityMethods: ['getX']` only for Federation entity resolvers.

Example (binary) after generate:

```graphql
add(request: AddRequestInput): Int @thrift__rpc(
  function: "add"
  # Add left and right from the request struct.
  args: """
  1(struct): $args.request {
    1(i32): left
    2(i32): right
  }
  """
  selection: "$(i32)"
  messageType: CALL
)
```

### Packages

- `@omnigraph/thrift` — loader emit; `protocol`, `entityMethods`, `ignoreExceptions`, `serviceName`
- `@graphql-mesh/transport-thrift` — execute compact mapping, ONEWAY, throws unions
- `@graphql-mesh/transport-rest` — Connectors helpers for TJSON
- `@graphql-mesh/fusion-composition` — `$args` rewrite for `@thrift__rpc` as well as `@connect`
