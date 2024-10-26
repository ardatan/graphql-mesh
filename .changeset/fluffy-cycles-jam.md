---
'@graphql-mesh/fusion-runtime': patch
'@graphql-mesh/transport-ws': patch
'@graphql-hive/gateway': patch
'@graphql-mesh/serve-cli': patch
---

WebSocket connections are now cached against the whole `connectionParams` object and forwarded
`headers`. The fixes WebSocket connection being reused wrongly when `connectionParams.token` is
stable while other fields are changing.
