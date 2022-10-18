---
'@graphql-mesh/runtime': patch
'@graphql-mesh/plugin-http-cache': patch
---

**BREAKING**

Previously HTTP Caching is respected by GraphQL Mesh by default. Now this has been seperated into a different plugin. Please check our docs if you want to bring this functionality back in your gateway.

[HTTP Caching Plugin](/docs/plugins/http-cache)
