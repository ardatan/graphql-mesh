---
'@graphql-mesh/fusion-composition': patch
---

Federation transform config keys are parsed as Spec Schema Coordinates (`Type` or `Type.field`) via `parseSchemaCoordinate`. Argument and directive coordinates are rejected with a clear error. Validation and `@key` resolveReference errors cite Spec coordinates (e.g. `Query.fooById`). Hoist-field missing-path errors use `Type.field`. Mesh filter selectors and globs are unchanged.
