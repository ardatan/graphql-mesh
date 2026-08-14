---
"@omnigraph/json-schema": patch
"@omnigraph/openapi": patch
---

Fix `discriminator.mapping` ignored for `$ref` variants in `anyOf`/`oneOf`

**Root cause:** When a JSON Schema used `anyOf` or `oneOf` together with a `discriminator.mapping`, the mapping keys were not applied to the resulting GraphQL union member types when those variants were `$ref` references. The discriminator mapping was only considered for inline schemas, so every `$ref` variant got the wrong (default-derived) type name in its `@discriminator` directive.

**Fix:** The mapping lookup now runs against the resolved `$ref` name as well as the inline title/type, so the correct alias is applied in all cases.

**Before:**

```yaml
# OpenAPI spec
Pet:
  oneOf:
    - $ref: '#/components/schemas/Cat'
    - $ref: '#/components/schemas/Dog'
  discriminator:
    propertyName: petType
    mapping:
      cat: '#/components/schemas/Cat'
      dog: '#/components/schemas/Dog'
```

```graphql
# Generated GraphQL (wrong — mapping keys were ignored)
union Pet @discriminator(field: "petType", mapping: [{value: "Cat", type: "Cat"}, {value: "Dog", type: "Dog"}]) = Cat | Dog
```

**After:**

```graphql
# Generated GraphQL (correct — mapping keys are used)
union Pet @discriminator(field: "petType", mapping: [{value: "cat", type: "Cat"}, {value: "dog", type: "Dog"}]) = Cat | Dog
```
