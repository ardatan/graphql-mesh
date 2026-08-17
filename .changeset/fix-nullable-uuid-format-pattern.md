---
"@omnigraph/json-schema": patch
---

Reuse a single format scalar when a shared primitive `$ref` has both `format` and `pattern`, including nullable `anyOf`/`oneOf` wrappers (e.g. SmallRye UUID).
