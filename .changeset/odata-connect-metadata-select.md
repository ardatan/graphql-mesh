---
'@graphql-mesh/transport-rest': minor
---

When `@source` / `@connect` sends `Accept: application/json;odata.metadata=…`, `transport-rest` treats the connector as OData and appends `$select` / `$expand` from the GraphQL selection (property renames from Connectors `selection` aliases). Apollo Router ignores the Hive-only projection and still sends the same Accept header, so results match with fuller payloads.
