---
'@graphql-mesh/grpc': minor
---

**BREAKING**;
 - Now stream responses are regular queries not subscriptions
 - `protoFilePath`, `descriptorSetFilePath` and `useReflection` have been removed. Use `source` instead and if `source` is not provided, reflection will be used instead.
