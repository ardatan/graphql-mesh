---
'@graphql-mesh/utils': patch
---

Auto merge types from subscriptions in additional type defs

This means that the `sourceName` directive does not need to be provided to the `@resolveTo` directive, instead the resolver will automatically find the subgraph that requires fields available in the subscription event.

```diff
import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli'

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('products', {
        endpoint: `http://localhost:3000/graphql`
      })
    }
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend schema {
      subscription: Subscription
    }
    type Subscription {
      newProduct: Product! @resolveTo(
        pubsubTopic: "new_product"
-       sourceName: "products"
      )
    }
  `
})
```
