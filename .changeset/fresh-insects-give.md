---
'@omnigraph/json-schema': patch
'@omnigraph/openapi': patch
'@omnigraph/raml': patch
---

DEBUG logs were accidentially written to the output, now it correctly prints logs to the logger not
the output
