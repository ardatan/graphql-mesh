---
'@omnigraph/openapi': patch
---

When there are two operations in the OAS;
`/products/` and `/products/{id}`
Due to the bug in the logic, they conflict and the HATEOAS linking can choose the first one without any argument.
