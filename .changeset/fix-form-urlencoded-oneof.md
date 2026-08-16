---
"@omnigraph/openapi": patch
---

Prefer `application/x-www-form-urlencoded` for request bodies when it is listed before JSON (OAuth token endpoints with `oneOf` + discriminator).
