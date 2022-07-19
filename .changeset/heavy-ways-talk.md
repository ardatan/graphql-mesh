---
"@graphql-mesh/thrift": patch
"@graphql-mesh/runtime": patch
"@graphql-mesh/store": patch
---

Now if there is only one error to be thrown, throw it as it is instead of using AggregateError in SDK and handlers
