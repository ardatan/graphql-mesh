---
"@omnigraph/json-schema": patch
"@omnigraph/openapi": patch
---

- Set response type to "String" if the response content type is "text/\*" defined in the OpenAPI document
- Fix the issue when "allOf" or "anyOf" is used with an enum type and an object type
