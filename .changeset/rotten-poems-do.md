---
'@graphql-mesh/runtime': patch
'@graphql-mesh/plugin-http-cache': patch
'@graphql-mesh/plugin-http-details-extensions': patch
'@graphql-mesh/plugin-deduplicate-request': patch
---

**BREAKING**

Previously HTTP Caching was respected by GraphQL Mesh by default. Now this has been seperated into a different plugin. Please check our docs if you want to bring this functionality back in your gateway.

[HTTP Caching Plugin](/docs/plugins/http-cache)

Previously some details about underlying HTTP requests were exposed via `includeHttpDetailsInExtensions: true` flag or `DEBUG=1` env var. Now you need to install this plugin to get the same functionality;

[HTTP Details in Extensions Plugin](/docs/plugins/http-details-extensions)

Previously Mesh automatically deduplicate the similar HTTP requests per GraphQL Context by default, now you need to install the following plugin;

[Deduplicate HTTP Requests Plugin](/docs/plugins/deduplicate-request)
