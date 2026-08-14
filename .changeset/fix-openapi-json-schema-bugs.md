---
"@omnigraph/json-schema": patch
"@omnigraph/openapi": patch
---

Fix several OpenAPI/JSON Schema schema-generation bugs:

**1. `discriminator.mapping` ignored for `$ref` variants in `anyOf`/`oneOf`**

When a JSON Schema uses `anyOf` or `oneOf` with `discriminator.mapping`, the mapping keys were not applied to the resulting GraphQL union member types when those variants were `$ref` references. The discriminator mapping is now applied correctly so the generated `@discriminator` directives carry the right type names.

**2. `anyOf: [X, { type: 'null' }]` was turned into a union instead of nullable X**

Previously, `anyOf` where exactly one variant is `{ type: 'null' }` and the rest is a single concrete type (scalar or object) was incorrectly converted into a `UnionTypeComposer` that included a phantom `Void` field or member. Now it is treated as a nullable version of the concrete type, setting `nullable: true` on the result and returning the concrete type directly — matching the JSON Schema intent and producing a cleaner GraphQL schema.

**3. `allOf` of objects containing shared `NonNull` nested fields caused a type-merge crash**

When two `allOf` sub-schemas both declared the same nested object property (e.g. `info`), and one side marked that property as `required` (making it `NonNull` in the composer), the deep merge attempted to unwrap and merge the wrapped `NonNullComposer` with a plain `ObjectTypeComposer`. This raised a runtime error. The merge logic now correctly unwraps `NonNull`/`List` wrappers before recursing, then re-applies the non-null wrapper to the merged result.

**4. `required` parameters that are `$ref`s were mutated in place**

When processing path/query/header parameters, the code resolved a `$ref` to a shared parameter object and then mutated it to add `required: true` (because the parameter appeared in the operation's `required` array). This corrupted the shared schema object for every other operation that referenced the same `$ref`. The fix dereferences to a shallow clone before adding the `required` flag, so shared parameter definitions are never modified.
