---
"@omnigraph/json-schema": patch
---

Reuse a single scalar when a shared primitive `$ref` has both `format` and `pattern` whose GraphQL names would collide (e.g. SmallRye UUID), including nullable `anyOf`/`oneOf` wrappers. Keep `@regexp` when the names differ.
