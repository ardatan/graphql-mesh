---
"@graphql-mesh/runtime": patch
---

Log unexpected non GraphQL errors with the stack trace

Previously, it was not possible to see the stack trace of unexpected errors that were not related to GraphQL. This change logs the stack trace of such errors.
