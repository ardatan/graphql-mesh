---
'@graphql-mesh/serve-runtime': minor
---

New `transportOptions` configuration property for passing custom transport options per subgraph for
specific transport kinds

For example, adding subscriptions support for Apollo Federation v2 subgraphs:

```ts
import { defineConfig } from '@graphql-mesh/serve-cli';
import { HTTPTransportOptions } from '@graphql-mesh/transport-http';

export const serveConfig = defineConfig({
  transportOptions: {
    // apply options to all subgraphs
    '*': {
      // on the "http" transport kind
      http: {
        // custom http transport options
        subscriptions: {
          ws: {
            path: '/subscriptions',
          },
        },
      } satisfies HTTPTransportOptions,
    },
  },
});
```
