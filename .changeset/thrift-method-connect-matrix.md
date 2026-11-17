---
'@omnigraph/thrift': minor
'@graphql-mesh/transport-thrift': minor
'@graphql-mesh/transport-rest': patch
---

Thrift loader emits `@thrift__method` (binary/compact) with optional `entity: true`, and TJSON `@connect`/`@source` when `protocol: 'json'`. Transport honors `protocol` and `@thrift__method(method)`. Connectors `$()` lit arrays/objects gain `$args` embeds (`size`/`slice`) for TJSON envelopes. E2E matrix: Hive×binary|json, Apollo Router×json.
