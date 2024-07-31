---
'@graphql-mesh/serve-runtime': patch
---

New plugin to apply compression between subgraphs, gateway and the client
So Mesh can compress the request before sending it to the subgraph and decompress the response.
Then do the same for the response from the subgraph to the client.

```ts filename="mesh.config.ts"
import { defineConfig, useContentEncoding } from '@graphql-mesh/serve-cli'

export default defineConfig({
  plugins: () => [
    useContentEncoding({
      subgraphs: ['*'] // Enable compression for all subgraphs
      // subgraphs: ['subgraph1', 'subgraph2'] // Enable compression for specific subgraphs
    })
  ]
})
```
