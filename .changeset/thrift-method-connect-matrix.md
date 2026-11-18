---
'@omnigraph/thrift': minor
'@graphql-mesh/transport-thrift': minor
'@graphql-mesh/transport-connect': patch
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
- `map<*, struct>` args expand the value struct field ids (same recursion as list/set-of-struct). `list/set<map<*, scalar>>` keeps the full nested wire token (e.g. `list<map<string, i32>>`) so binary regenerate does not drop the method. Nested scalar containers (e.g. `list<list<i32>>`) keep the full token; nested containers that would drop struct field ids (e.g. `list<map<string, list<Item>>>`) fail at generate until descriptors are preserved.
- `function` is always the IDL name. Single-service generate **omits** `service:` (path is on `@transport`).
- `messageType: ONEWAY` does not wait for / decode a reply.
- `entity: true` only via loader `entityMethods` (Federation entity Query fields).
- Transport executes `@thrift__rpc` by field id (no `topTypeMap`). Compact parse keeps `map<*, struct>` as MAP (`keyType` + `valType.fields`), not STRUCT, and `list/set<map<*, struct>>` as LIST/SET → MAP → STRUCT so value field ids (e.g. `7: value`) survive.
- Example/e2e calculator codegen runs `scripts/patch-thrift-oneway-zip.mjs` after `@creditkarma/thrift-typescript` so oneway `process_zip` keeps an empty body (upstream 3.7.6 still emits REPLY/EXCEPTION).
- Service mappings and typedef aliases resolve only after every named type is registered (forward refs resolve correctly).
- GraphQL enum members always use **names**. Binary uses plain `i32` leaves with Connectors-style `->match` on `@thrift__rpc` args/selection (same shape as TJSON `@connect`); no Mesh `@enum` on thrift. Recursive struct **arguments** fail at generate (no silent empty truncation).

#### JSON — `protocol: 'json'`

Emits `@source` + `@connect` (TJSON) instead of thrift `@transport`:

- `Content-Type` / `Accept`: `application/vnd.apache.thrift.json`
- Path `/`, or `/<service>` when `serviceName` is set
- Body message types CALL=`1`, ONEWAY=`4`
- `isSuccess` / `errors` so declared throws and `TApplicationException` are not silent nulls; ONEWAY omits `isSuccess`
- Bool scalars encode as TJSON integers `0`/`1` (`->match`). Enum args/selections bake name <-> i32 `->match` (root scalars, root list/set, and list/set enum fields inside structs, including union `$({ … })` selections).
- **Fail at generate** (prefer scalar/struct args, binary, or hand-author `@connect`; Hive Mesh supports `->concat`): `map<*, bool>`, **list/set args**, and maps whose values are struct/list/set/map (Connectors cannot rewrite map values / LitArray has no element spread).
- Void/ONEWAY `@connect(selection:)` uses `$(null)` (bare `null` is a field path). `ignoreExceptions: false` unions emit a single `$({ … })` selection; void success is `ok: $->get(4)->size->eq(0)`; struct success stamps `field0: $->get(4)->get("0")->ne(null)` and both the loader and REST `processDirectives` resolveType treat that stamp as authoritative when present (Hive may keep `value: { left: undefined }` / `message: undefined` on replies). Declared throws also stamp `__throw_<TypeName>` from the reply field id; shared exception field projections gate on throw-field presence then coalesce with `$(a ?? b)` so an absent throw’s empty `$({…})` projection cannot hide the active exception’s struct/scalar value. Binary still uses `__typename`. Nested enum containers (e.g. `list<list<State>>`) fail at generate on the binary path (same spirit as nested struct containers) until name↔i32 `->match` can be preserved.

#### Exceptions

1. **`TApplicationException`:** binary throws; JSON uses `isSuccess` / `errors`.
2. **IDL `throws`:** `ignoreExceptions` defaults to `true`. Set `false` for GraphQL unions + `@thrift__rpc(throws:)`. Union `resolveType` matches exception members on **defined** field values (not key presence alone).

#### Transforms / Connectors eval

- Mesh rename / naming-convention rewrite `$args…` inside `@thrift__rpc(args/selection/throws)` the same way as `@connect`. HTTP path templates still rename `$args` when the literal path contains apostrophes. No `@merge` / `@meshSource` for thrift.
- Mesh Connectors eval: trailing NamedSelection after `$()` stays on the subselection path; `->map` / `->filter` preserve bare `@` match-arm wildcards (`[@, "other"]`).

### Migration

1. Upgrade and **recompose** (prefer regenerate from IDL).
2. Replace hand-written `@fieldTypeMap` / `@thrift__method` + transport `options` with `@thrift__rpc` or `protocol: 'json'`.
3. Keep binary `@transport` to `location` + `headers` only.
4. Single-service: no `service:` required on `@thrift__rpc`. TJSON multiplex: set `serviceName`.
5. Optional: `ignoreExceptions: false`; `entityMethods: ['getX']` only for Federation entity resolvers.
6. If IDL uses list/set args or composite/bool map values on the JSON path, switch those RPCs to binary, change the IDL, or hand-author the `@connect` body.

**Before** (old composed field):

```graphql
add(request: AddRequestInput): Int @fieldTypeMap(…)
# wire layout lived in @transport(options: { topTypeMap, clientAnnotations })
```

**After** (binary generate):

```graphql
add(request: AddRequestInput): Int @thrift__rpc(
  function: "add"
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
- `@graphql-mesh/transport-thrift` — execute compact mapping (incl. `i32->match` coerce), ONEWAY, throws unions
- `@graphql-mesh/transport-connect` — Connectors helpers for TJSON / `$()` / match wildcards
- `@graphql-mesh/fusion-composition` — `$args` rewrite for `@thrift__rpc` and HTTP paths
