---
'@graphql-mesh/serve-runtime': patch
---

Support Hive CDN in proxy mode
If Hive CDN endpoint is provided, the runtime won't introspect the schema from the endpoint, and fetch it from Hive CDN.
