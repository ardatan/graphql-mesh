---
'@graphql-hive/gateway': patch
'@graphql-mesh/serve-cli': patch
---

Add support for upstream WebSocket subscriptions.

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
