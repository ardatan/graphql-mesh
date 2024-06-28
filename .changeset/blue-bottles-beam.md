---
'@graphql-mesh/serve-runtime': patch
---

Disable validation of the operations on the gateway while using Mesh Server as a proxy

```ts filename="mesh.config.ts"
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli'

export default defineServeConfig({
  proxy: {
    endpoint: 'https://my-service.com/graphql',
  },
  skipValidation: true
})
```

This will disable the validation of the operations, and send the operations directly to the upstream service.
