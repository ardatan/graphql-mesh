---
'@graphql-mesh/transport-common': patch
'@graphql-mesh/transport-http': patch
'@graphql-mesh/fusion-runtime': patch
'@graphql-mesh/serve-runtime': patch
---

Ability to manipulate transport entry through `transportEntries`.

For example, you can add extra headers to a subgraph

```ts
transportEntries: {
  products: {
    // This adds extra headers to the subgraph configuration
    headers: [
      // This forwards `authorization` from the upstream to downstream
      ['authorization', '{context.headers.authorization}'],
      // Or some static value
      ['x-extra', process.env.SOME_THING]
    ]
  }
}
```
