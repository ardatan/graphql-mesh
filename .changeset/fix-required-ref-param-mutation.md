---
"@omnigraph/openapi": patch
---

Fix shared `$ref` parameter objects being mutated when marked as `required`

**Root cause:** When processing path/query/header/body parameters, the code resolved a `$ref` to the shared parameter object and then mutated it directly (e.g. setting `required: true` or modifying its schema). Because all operations that referenced the same `$ref` shared the same in-memory object, the mutation would corrupt the parameter definition for every other operation that used the same `$ref`.

**Fix:** The code now shallow-clones the parameter object before applying any per-operation mutations, so shared parameter definitions are never modified.

**Before:**

```yaml
# OpenAPI spec — two operations share $ref: '#/parameters/q'
parameters:
  q:
    name: q
    in: formData
    description: The formula to check
    type: string

paths:
  /math/check/{type}:
    post:
      parameters:
        - $ref: '#/parameters/q'   # <-- shared ref; was mutated by the first operation
  /math/check2/{type}:
    post:
      parameters:
        - $ref: '#/parameters/q'   # <-- saw the mutated (corrupted) version
```

```graphql
# Before — q parameter missing or incorrectly required/optional
# depending on the processing order of the two operations
type Mutation {
  post_math_check_by_type(type: String!): JSON
  post_math_check2_by_type(type: String!): JSON
}
```

**After:**

```graphql
# After — each operation gets its own clean clone; q is present and correct
type Mutation {
  post_math_check_by_type(type: String!, q: JSON!): JSON
  post_math_check2_by_type(type: String!, q: JSON!): JSON
}
```
