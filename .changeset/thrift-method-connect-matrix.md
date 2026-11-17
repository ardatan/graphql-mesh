---
'@omnigraph/thrift': minor
'@graphql-mesh/transport-thrift': minor
'@graphql-mesh/transport-rest': patch
'@graphql-mesh/fusion-composition': patch
---

### Why

The old Thrift authoring surface was hard to write, review, and share:

- Wire layout lived in opaque `@fieldTypeMap` + `topTypeMap` bags. Field ids and exact Thrift types (`i16` vs `i32`) were easy to get wrong; GraphQL `Int` cannot carry that distinction.
- Binary thrift was Mesh-native only. There was no Apollo Router-compatible emit path for servers that speak `TJSONProtocol`.
- IDL `throws` / `oneway` were ignored. TJSON `@connect` had no reliable `isSuccess` / `errors` story for `TApplicationException` or declared throws (REPLY with a non-`0` field id looked like success and became silent `null`).

This release replaces that with an explicit RPC directive for binary thrift (the transport executes it) and Federation Connectors emit for JSON so Hive and Apollo Router can both run the TJSON path.

### Breaking (no dual-read)

**Removed / no longer executed:**

- `@fieldTypeMap`
- `@thrift__method` (if present in older drafts)
- `topTypeMap` / `clientAnnotations` on `@transport`
- Transport dual-read that preferred legacy field maps when `@thrift__rpc` was absent

**Required after upgrade:** recompose / regenerate Thrift subgraphs. Hand-written SDL that still has `@fieldTypeMap` will not run until rewritten to `@thrift__rpc` (binary) or `@connect` (JSON).

### What you get

#### Binary — `protocol: 'binary'` (default)

- Slim `@transport(subgraph, kind: "thrift", location, headers)` — HTTP thrift is always binary; no protocol/options bag on transport.
- Per-field `@thrift__rpc`:

```graphql
directive @thrift__rpc(
  subgraph: String
  service: String
  function: String!
  args: String!
  selection: String!
  throws: String
  messageType: ThriftMessageType = CALL
  entity: Boolean
) on FIELD_DEFINITION
```

- `function` is always the IDL function name (not inferred from the GraphQL field name).
- `messageType`: `CALL` or `ONEWAY` (from IDL `oneway`). ONEWAY does **not** wait for / decode a reply body.
- `entity: true` via loader `entityMethods`.
- Compact `args` / `selection` keep wire types explicit (`1(i32): left`, `$(i16)`, `list`/`set` of structs with element fields, nested `map<…>` parsed at depth-0 commas).
- Multiline mapping strings print as GraphQL `"""` block strings.
- Single-service **generate omits** `service:` — the HTTP path is already on `@transport(location:)`. The directive arg remains for hand-authored multi-service SDL.
- Transport executes `@thrift__rpc(args/selection)` with **field-id** decode. Top-level `list`/`set` of structs projects each element through the field mapping (not raw id `Map`s).

#### JSON — `protocol: 'json'`

Emits Federation `@source` + `@connect` (TJSON) instead of thrift `@transport`:

- `Content-Type` / `Accept`: `application/vnd.apache.thrift.json`
- Path `/` for single-service; `/<service>` only when loader `serviceName` is set (multiplex)
- Body: `$([1, "<fn>", <msgType>, 1, { … }])` — CALL=`1`, ONEWAY=`4`
- `list<Struct>` request mapping via `->map(@->{ … id-tagged fields … })`
- `selection` peels envelope index `4` / success field `"0"`
- Non-void CALL: `isSuccess: $->get(2)->eq(2)->and($->get(4)->get("0")->ne(null))` so declared throws are not silent nulls
- Void CALL: REPLY-only `isSuccess`; ONEWAY omits `isSuccess` (HTTP status alone)
- `errors.message` covers `TApplicationException` (`"1".str`) and declared-throw structs (`"1".rec.…`)

#### Exceptions

1. **`TApplicationException`:** binary client throws; JSON uses `isSuccess` / `errors`.
2. **IDL `throws`:** loader `ignoreExceptions` defaults to `true` (errors). Set `ignoreExceptions: false` to emit GraphQL unions + `@thrift__rpc(throws:)` and map throw field ids in `doRequest` (success wrapped as `{ value, __typename }`).

### Migration

1. **Upgrade and recompose** the Thrift subgraph (loader emits the new directives). Prefer regenerating from IDL over hand-editing composed SDL.
2. **Replace hand-written legacy bindings**

Before:

```graphql
add(request: AddRequestInput): Int
  @fieldTypeMap(…)  # plus topTypeMap / clientAnnotations on @transport
```

After (binary):

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

After (JSON): use loader `protocol: 'json'` so compose emits `@source` / `@connect` with TJSON `body` / `selection` / `isSuccess` / `errors`.

3. **Drop** Mesh-only thrift transport annotation options that mirrored codegen. Keep HTTP `location` + `headers` on `@transport` for binary.
4. **Single-service:** do not require `service:` on `@thrift__rpc`. For TJSON multi-service multiplex only, set loader `serviceName`.
5. **Optional:** `ignoreExceptions: false` if declared throws should appear as union data instead of GraphQL errors.
6. **Transforms:** Fusion rename / naming-convention (and prefix-via-rename) rewrite `$args…` inside both `@connect` path/body/selection **and** `@thrift__rpc(args/selection/throws)` — same helper, no extra `@merge` / `@meshSource`-style thrift directives.

### Authoring notes

- Prefer GraphQL `#` comments **immediately above** `args:` / `selection:` in hand-written SDL (same idea as `@connect`). `printSchemaWithDirectives` cannot re-emit those AST-stripped comments.
- Do not dump IDL text into GraphQL field descriptions or stuff `#` lines inside the mapping string values for “documentation.”
- Parser still strips `#` lines if they appear inside compact mapping strings (tolerant of older hand edits).

### Packages

- `@omnigraph/thrift` — loader emit (`@thrift__rpc` / TJSON `@connect`), options (`protocol`, `entityMethods`, `ignoreExceptions`, `serviceName`)
- `@graphql-mesh/transport-thrift` — execute compact mapping, ONEWAY, throws unions
- `@graphql-mesh/transport-rest` — Connectors helpers used by TJSON (`ne(null)`, `and`, quote-safe `@` rewrite, etc.)
- `@graphql-mesh/fusion-composition` — rename/naming-convention rewrite `$args` inside `@thrift__rpc` as well as `@connect`
