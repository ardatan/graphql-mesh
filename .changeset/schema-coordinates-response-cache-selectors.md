---
'@graphql-mesh/plugin-response-cache': patch
---

`ttlPerCoordinate` / `ttlPerSchemaCoordinate` keep Mesh schema selectors such as `Query.*` alongside Spec Schema Coordinates (`Type`, `Type.field`). Prefer Spec forms when naming one element; selectors still apply by matching selected fields (the lowest matching TTL wins).
