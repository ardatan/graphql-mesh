---
'@omnigraph/thrift': minor
'@graphql-mesh/transport-thrift': minor
'@graphql-mesh/transport-rest': patch
---

Thrift loader emits `@thrift__rpc` (`function`, `messageType` CALL|ONEWAY, optional `entity`) for binary/compact, and TJSON `@connect`/`@source` with `isSuccess`/`errors` when `protocol: 'json'`. Optional `ignoreExceptions: false` models IDL `throws` as GraphQL unions. Transport honors `protocol`, RPC function name, and ONEWAY. E2E: Hive×binary|json + exception smoke, Apollo Router×json.
