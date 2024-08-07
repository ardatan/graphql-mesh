---
'@graphql-mesh/serve-runtime': patch
---

Support Hive CDN in proxy mode
If Hive CDN endpoint is provided, the runtime won't introspect the schema from the endpoint, and fetch it from Hive CDN.

By default, Mesh Serve introspects the schema from the endpoint. And it fails, it skips the
validation and schema aware features. But if Hive CDN endpoint and key have been provided in the
configuration, Mesh Serve will fetch the schema from the Hive CDN.

```ts filename="mesh.config.ts"
import { defineConfig } from '@graphql-mesh/serve-cli'

export const serveConfig = defineConfig({
  proxy: {
    endpoint: 'https://example.com/graphql'
  },
  hive: {
    endpoint: 'https://cdn.graphql-hive.com/artifacts/v1/0123-3434/sdl',
    key: 'SOME_HIVE_KEY'
  }
})
```
