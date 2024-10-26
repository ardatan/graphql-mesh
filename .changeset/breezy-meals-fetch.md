---
'@graphql-hive/gateway': minor
'@graphql-mesh/serve-cli': minor
'@graphql-mesh/transport-ws': minor
---

Add support for upstream WebSocket subscriptions in Docker and binary distributions.

The HTTP headers of the incoming client's request can now be forwarded to the upstream in the
[WebSocket HTTP upgrade request](https://developer.mozilla.org/en-US/docs/Web/HTTP/Protocol_upgrade_mechanism#upgrading_http1.1_connections):

```ts
import { defineConfig } from '@graphql-hive/gateway';

export const gatewayConfig = defineConfig({
  transportEntries: {
    ['*.http']: {
      options: {
        subscriptions: {
          kind: 'ws',
          location: '/subscriptions',
          headers: [
            ['authentication', '{context.headers.authentication}'],
          ],
        },
      },
    },
  },
});
```
