---
'@omnigraph/openapi': patch
---

Clean OpenAPI operation/callback `description` before falling back to `summary`, so whitespace-only descriptions do not suppress a non-empty summary.
