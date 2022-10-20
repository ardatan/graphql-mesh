---
'@omnigraph/openapi': minor
'@graphql-mesh/utils': minor
---

BREAKING:
- ":" character is now sanitized as "_" instead of "\_COLON_"
- If a path starts with a variable like "{" in an OAS operation, "by_" prefix is no longer added.
