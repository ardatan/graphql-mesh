---
'@omnigraph/json-schema': minor
---

Use more accurate scalar types if minimum and maximum exist for number types (`NonNegativeFloat`, `NonPositiveFloat`, `NegativeFloat`, `PositiveFloat`, `NonNegativeInt`, `NonPositiveInt`, `NegativeInt`, `PositiveInt`).

Also use `Byte` for `format: byte`

Now `const` generates an enum instead of a scalar type with a better name.
