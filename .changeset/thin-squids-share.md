---
'@omnigraph/soap': patch
---

Fix the inverted nullability generation

If SOAP has `nillable: true`, the generated type was non-nullable, and now it has been fixed to be nullable as expected.

