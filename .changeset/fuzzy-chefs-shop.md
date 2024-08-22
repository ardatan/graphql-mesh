---
'@graphql-mesh/serve-runtime': patch
'@graphql-mesh/serve-cli': patch
---

New plugin to set a custom agent;

```ts
import { readFileSync } from 'fs'
import { Agent } from 'https'
import { defineConfig, useCustomAgent } from '@graphql-mesh/serve-cli'

const agent = new Agent({
  ca: readFileSync('/path/to/ca.crt')
  // or
  rejectUnauthorized: false
})

export const serveConfig = defineConfig({
  plugins: () => [
    useCustomAgent(
      // This function will be called for each URL to determine if the custom agent should be used
      ({ url }) =>
        url === 'https://example.com'
          ? agent
          : undefined
    )
  ]
})
```
