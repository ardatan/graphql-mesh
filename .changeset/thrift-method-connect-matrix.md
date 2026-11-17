---
'@omnigraph/thrift': minor
'@graphql-mesh/transport-thrift': minor
'@graphql-mesh/transport-rest': patch
'@graphql-mesh/fusion-composition': patch
---

### Why (vs previous release / `master`)

On `master`, Thrift subgraphs are authored and executed like this:

- Loader stamps every RPC with `@fieldTypeMap({ … nested TypeVal bags … })`.
- `@transport` carries a large `options` bag: `clientAnnotations` (serviceName, methodNames, methodAnnotations, methodParameters, …) plus `topTypeMap`.
- Transport `doRequest` reads only those bags. Wire field ids / exact Thrift types (`i16` vs `i32`) live in JSON-ish directive args that are hard to hand-write, review, or AI-generate — GraphQL `Int` cannot carry that distinction.
- There is no loader `protocol` switch: HTTP thrift is always binary Mesh transport. Servers that speak `TJSONProtocol` cannot get Federation `@connect` emit for Hive / Apollo Router.
- IDL `throws` and `oneway` are ignored. Declared throws on a TJSON path would look like success with a missing `"0"` field and become silent `null`.

This release replaces that surface with an explicit compact RPC mapping the transport executes, plus an opt-in TJSON Connectors path.

### Breaking (no dual-read)

**Removed relative to `master` (not executed anymore):**

- `@fieldTypeMap`
- `@transport.options.clientAnnotations` / `topTypeMap`
- Any transport path that preferred legacy field maps when the new directive was absent

**Required after upgrade:** recompose / regenerate Thrift subgraphs from IDL. Hand-written SDL that still has `@fieldTypeMap` will not run until rewritten to `@thrift__rpc` (binary) or `@connect` (JSON).

### What changed

#### Binary — `protocol: 'binary'` (default; replaces `@fieldTypeMap` path)

- Slim `@transport(subgraph, kind: "thrift", location, headers)` — no protocol/options bag; HTTP thrift is always binary.
- Per-field `@thrift__rpc` with compact `args` / `selection` / optional `throws`:

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

- `function` is always the IDL function name.
- `messageType`: `CALL` or `ONEWAY` (from IDL `oneway`). ONEWAY does **not** wait for / decode a reply body.
- `entity: true` via loader `entityMethods` (Federation entity resolver; leave empty for normal RPCs).
- Compact mapping keeps wire types explicit (`1(i32): left`, `$(i16)`, containers, nested maps).
- Multiline mapping strings print as GraphQL `"""` block strings.
- Single-service **generate omits** `service:` (HTTP path is on `@transport(location:)`). Directive arg remains for hand-authored multi-service SDL.
- Transport executes `@thrift__rpc` with **field-id** decode (no `topTypeMap`).

#### JSON — `protocol: 'json'` (new vs `master`)

Emits Federation `@source` + `@connect` (TJSON) instead of thrift `@transport`:

- `Content-Type` / `Accept`: `application/vnd.apache.thrift.json`
- Path `/` for single-service; `/<service>` when loader `serviceName` is set
- Body message type CALL=`1`, ONEWAY=`4`
- `list<Struct>` via `->map(@->{ … })`
- Non-void CALL `isSuccess` requires REPLY plus success field `"0"` (`ne(null)`) so declared throws are not silent nulls; void is REPLY-only; ONEWAY omits `isSuccess`
- `errors.message` covers `TApplicationException` and declared-throw struct messages

#### Exceptions (new vs `master`)

1. **`TApplicationException`:** binary client throws; JSON uses `isSuccess` / `errors`.
2. **IDL `throws`:** `ignoreExceptions` defaults to `true`. Set `false` to emit GraphQL unions + `@thrift__rpc(throws:)` / `doRequest` mapping.

#### Transforms (extension vs `master`)

On `master`, Fusion rename / naming-convention already rewrote `$args…` inside `@connect`. They now also rewrite `$args…` inside `@thrift__rpc(args/selection/throws)` via the same helper — no `@merge` / `@meshSource` for thrift.

### Migration from `master`

1. Upgrade and **recompose** the Thrift subgraph (prefer regenerate from IDL).
2. Replace hand-written `@fieldTypeMap` + transport `options` with `@thrift__rpc` (binary) or loader `protocol: 'json'` (`@source` / `@connect`).
3. Drop Mesh-only thrift transport annotation options that mirrored codegen. Keep HTTP `location` + `headers` on `@transport` for binary.
4. Single-service: do not require `service:` on `@thrift__rpc`. For TJSON multiplex only, set loader `serviceName`.
5. Optional: `ignoreExceptions: false` if declared throws should be union data; `entityMethods: ['getX']` only when that Query field is a Federation entity resolver.

### Authoring notes

- Prefer GraphQL `#` comments **immediately above** `args:` / `selection:` in hand-written SDL. `printSchemaWithDirectives` cannot re-emit those AST-stripped comments.
- Do not dump IDL into field descriptions or stuff `#` inside mapping string values.
- Parser still strips `#` lines inside compact mapping strings (tolerant of older hand edits).

### Packages

- `@omnigraph/thrift` — loader emit; options `protocol`, `entityMethods`, `ignoreExceptions`, `serviceName`
- `@graphql-mesh/transport-thrift` — execute compact mapping, ONEWAY, throws unions
- `@graphql-mesh/transport-rest` — Connectors helpers for TJSON (`ne(null)`, `and`, quote-safe `@` rewrite, …)
- `@graphql-mesh/fusion-composition` — `$args` rewrite for `@thrift__rpc` as well as `@connect`
