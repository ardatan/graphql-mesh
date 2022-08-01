---
"@omnigraph/openapi": patch
---

Fix an issue while concatenating query parameters for POST requests

Before;
`http://localhost:3000/test?foo=barbaz=qux`

After;
`http://localhost:3000/test?foo=bar&barbaz=qux`
