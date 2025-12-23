---
'@omnigraph/openapi': patch
---

- Support `discriminator` for OpenAPI documents with the definitions defined in `definitions` instead
of `components.schemas`
- Also while handling [Inheritance and Polymorphism](https://swagger.io/docs/specification/v3_0/data-models/inheritance-and-polymorphism/)
to look up for types in `discriminator.mapping`, if the pointers are not used, also check `title` to find the correct definition.
