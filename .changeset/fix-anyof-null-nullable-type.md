---
"@omnigraph/json-schema": patch
---

Treat `anyOf`/`oneOf` with a `{ type: "null" }` branch as a nullable version of the remaining type instead of falling through to a generic object.
