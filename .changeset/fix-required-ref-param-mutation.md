---
"@omnigraph/openapi": patch
"@omnigraph/json-schema": patch
---

Stop mutating shared `$ref` parameter schemas when one operation marks the param required. Required args are collected per operation instead.
