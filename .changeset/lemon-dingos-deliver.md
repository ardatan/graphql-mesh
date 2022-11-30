---
'@graphql-mesh/grpc': minor
---

**BREAKING**: now `metaData` accepts interpolation strings not from `context` directly so if you
have `{headers.connection}`, you have to change it to `{context.headers.connection}`
