---
"@omnigraph/json-schema": patch
"@omnigraph/openapi": patch
---

Fix `anyOf: [X, { type: 'null' }]` incorrectly generating a union instead of a nullable type

**Root cause:** When a JSON Schema used `anyOf` where exactly one variant was `{ type: 'null' }` and the other was a single concrete type (scalar or object), the code would create a `UnionTypeComposer` that included a phantom `Void` member. This violated the JSON Schema intent — `anyOf: [X, null]` means "X or null", not a union of X and Void.

**Fix:** The code now detects this pattern and, instead of creating a union, sets `nullable: true` on the result and returns the concrete type directly.

**Before:**

```json
{
  "title": "MaybeString",
  "anyOf": [{ "type": "string" }, { "type": "null" }]
}
```

```graphql
# Generated GraphQL (wrong — union with phantom Void member)
union MaybeString = String | Void
```

**After:**

```graphql
# Generated GraphQL (correct — nullable scalar, no union)
# The field using MaybeString becomes nullable String
scalar String  # returned with nullable: true
```
