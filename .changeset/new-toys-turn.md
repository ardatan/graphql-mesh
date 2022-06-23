---
"@omnigraph/json-schema": patch
---

Do not compile JSON Schemas with ajv if function constructors are not supported. This fixes an issue with Mesh and CF Workers. Previously it throws an error because of "new Function" usage
