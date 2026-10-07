---
'@omnigraph/openapi': patch
'@omnigraph/json-schema': patch
---

Swagger 2.0 `in: body` parameters are the request payload and should stay on the `input` argument. Since 0.112 a required body was also recorded under the parameter name, usually `body`. That name is not a real field, so it was filled in as a required `body: JSON!` argument and `input` became nullable. Existing operations that pass the payload via `input` then failed validation. Body parameters are now only `input`, and a required body keeps that argument non-null. OpenAPI 3 `requestBody` is unchanged.
