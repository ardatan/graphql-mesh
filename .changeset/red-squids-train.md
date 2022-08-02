---
"json-machete": patch
"@omnigraph/json-schema": patch
"@omnigraph/openapi": patch
"@graphql-mesh/types": patch
---

Rewrite JSON Schema visitor and support circular dependencies in a better way

Now `visitJSONSchema` takes two different visitor functions instead of `enter` and `leave`, previously we used to handle only `leave`.
