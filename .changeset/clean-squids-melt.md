---
'json-machete': patch
'@omnigraph/openapi': patch
---

Accept an array for "type" property in JSON Schema because it was broken and causing a bug that creates an invalid `undefined` scalar type.

```json
{
  "type": [
      "string",
      "number",
      "boolean",
      "integer",
      "array"
  ]
}
```
