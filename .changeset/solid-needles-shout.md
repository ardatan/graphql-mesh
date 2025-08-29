---
'@graphql-mesh/config': patch
'@graphql-mesh/types': patch
'@graphql-mesh/utils': patch
---

Support Type Merging within additional type defs for subscriptions

This allows subscription events to resolve fields from other subgraphs.

For example, if you have a `products` subgraph like this:

```gql filename="products.graphql"
type Query {
  hello: String!
}
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
}
```

we need add the subscription fields like this:

```ts filename="mesh.config.ts"
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
      newProduct: Product! @resolveTo(pubsubTopic: "new_product", sourceName: "products")
    }
  `
})
```

you can subscribe to Hive Gateway like this:

```graphql
subscription {
  newProduct {
    name
    price
  }
}
```

emit an event to the Redis instance on the `new_product` topic
this:

```redis
PUBLISH new_product '{"id":"roomba70x"}'
```

The subscriber will then receive the following event:

```json
{
  "data": {
    "newProduct": {
      "name": "Roomba 70x",
      "price": 279.99
    }
  }
}
```

Because Hive Gateway merged the `Product` type from the `products` subgraph into the root schema, it can resolve the `name` and `price` fields even though they are not defined in the `additionalTypeDefs`.
