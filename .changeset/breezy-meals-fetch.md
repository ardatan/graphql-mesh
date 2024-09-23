---
'@graphql-hive/gateway': minor
'@graphql-mesh/serve-cli': minor
'@graphql-mesh/transport-ws': minor
---

Add support for upstream WebSocket subscriptions in Docker and binary distributions.

Subscriptions can now use WebSockets for transport between gateway and subgraphs when used with
Docker or binaries versions.

The HTTP headers of the incoming client's request can now be forwarded to the upstream in the
upgrade request:

```ts
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
