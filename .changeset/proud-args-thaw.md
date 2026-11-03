---
'@graphql-mesh/transport-rest': patch
---

Support frozen resolver arguments in REST operations

Executors like `@graphql-tools/executor` pass a shared frozen object as the arguments of fields that have no arguments. The REST operation resolver writes to its arguments, which threw `Cannot add property input, object is not extensible`. The resolver copies frozen arguments before writing to them.
