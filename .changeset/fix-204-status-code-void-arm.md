---
'@omnigraph/json-schema': patch
---

Keep HTTP 204 (No Content) arms in status-code response unions.

OpenAPI encodes a `204` response as `{ type: 'null' }` inside a `oneOf` that also
carries a `statusCodeOneOfIndexMap` comment. The OpenAPI 3.1 nullability strip
introduced for `#8719` treated that `{ type: 'null' }` member as a nullability
marker and removed it, so success outcomes disappeared from the generated GraphQL
union (e.g. `DELETE` + `204`/`404` collapsed to only the error type, or a union of
errors without `Void_container`).

Skip the `{ type: 'null' }` strip when the schema is a status-code response union
(`$comment` starts with `statusCodeOneOfIndexMap:`). Data-schema nullability via
`anyOf`/`oneOf` with `{ type: 'null' }` is unchanged.
