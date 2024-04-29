---
"@omnigraph/openapi": patch
---

When a custom mime type provided in `operationHeaders`, it sets all the fields as generic `JSON` scalar.
Fixes https://github.com/ardatan/graphql-mesh/issues/4460
