---
'@omnigraph/thrift': minor
'@graphql-mesh/transport-thrift': minor
'@graphql-mesh/transport-rest': patch
---

**Breaking:** Thrift loader no longer emits or dual-reads legacy `@fieldTypeMap` / `@thrift__method`. Binary transport executes compact `@thrift__rpc(args/selection)` only; JSON uses TJSON `@connect`/`@source`.

`@thrift__rpc` carries `function`, `messageType` (CALL|ONEWAY), optional `entity`/`throws`. ONEWAY emits TJSON message type `4` and does not wait for a reply. `isSuccess` requires REPLY plus success field `"0"` (`ne(null)`) so declared IDL throws are not silent nulls. Optional `ignoreExceptions: false` models throws as GraphQL unions and maps exception field ids in `doRequest`. IDL comments are `#` lines above args/selection mapping bodies (not field description dumps).
