---
'@omnigraph/thrift': minor
'@graphql-mesh/transport-thrift': minor
'@graphql-mesh/transport-rest': patch
---

**Breaking cutover (no dual-read):** `@fieldTypeMap` / `@thrift__method` / `topTypeMap` / `clientAnnotations` are removed. Binary subgraphs must use `@thrift__rpc`; JSON uses Federation `@connect` / `@source`. There is no legacy execution fallback.

### What you get

- **Binary (`protocol: 'binary'`, default):** `@transport(kind/location/headers)` + per-field `@thrift__rpc(function, args, selection, messageType, entity?, throws?)`. Transport executes the compact `args`/`selection` mapping (field-id decode). ONEWAY does not wait for a reply.
- **JSON (`protocol: 'json'`):** TJSON `@source` + `@connect` with `isSuccess` / `errors`. ONEWAY body uses message type `4`. Non-void CALL requires success field `"0"` (`ne(null)`) so IDL `throws` are not silent nulls.
- **`ignoreExceptions: false`:** IDL `throws` become GraphQL unions; binary maps throw field ids via `@thrift__rpc(throws:)`.

### Migration

1. Recompose / regenerate the Thrift subgraph (loader emits the new directives).
2. Replace any hand-written `@fieldTypeMap` + `topTypeMap` with `@thrift__rpc` compact mapping, e.g. `args: "1(i32): $args.left"` / `selection: "$(i32)"`.
3. Drop Mesh-only thrift transport options that mirrored codegen annotations; keep HTTP `location` + `headers` on `@transport`.
4. Single-service: omit `service:` on `@thrift__rpc` (path is already in `@transport(location:)`). For TJSON multi-service multiplex only, set loader `serviceName` so `@connect` posts to `/<service>`.
5. Optional: `ignoreExceptions: false` if you want declared throws as union data instead of GraphQL errors.

### Authoring notes

- Prefer GraphQL `#` comments **immediately above** `args:` / `selection:` in hand-written SDL (same idea as `@connect`). `printSchemaWithDirectives` cannot re-emit those AST-stripped comments; do not rely on field description dumps or `#` lines stuffed inside the mapping strings.
- Generated `args` / `selection` / TJSON `body` values that contain newlines print as GraphQL `"""` block strings for readability.
- Transforms that rename GraphQL args/fields can rewrite `$args…` inside `@thrift__rpc(args/selection)` (and `@connect` body/selection) the same way Connectors-oriented transforms already target mapping strings — no extra `@merge` / `@meshSource`-style thrift directives are required for that model.
