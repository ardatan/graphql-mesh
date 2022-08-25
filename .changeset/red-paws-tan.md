---
"json-machete": minor
"@omnigraph/json-schema": minor
"@graphql-mesh/openapi": minor
"@omnigraph/openapi": minor
---

## "multipart/form-data" and File Uploads support(type: string, format: binary)
If there is `type: string` and `format: binary` definitions in a schema type definition, it is considered as `File` scalar type and resolved as WHATWG [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) object.
When the request content-type is `multipart/form-data`, the handler creates a WHATWG [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/File) object and puts the input arguments in it.
