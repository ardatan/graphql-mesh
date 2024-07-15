---
'@graphql-mesh/transport-http-callback': patch
---

Support for HTTP Callback protocol for subscriptions

```ts
    reviews: {
      kind: 'hybrid',
      options: {
        subscriptions: {
          kind: 'http-callback',
        },
      } satisfies HybridTransportOptions<HTTPCallbackTransportOptions>,
    },
```

Learn more about protocol; https://www.apollographql.com/docs/router/executing-operations/subscription-callback-protocol/
