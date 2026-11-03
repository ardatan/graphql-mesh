---
"@graphql-mesh/apollo-link": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Prefer `fakePromise` / `handleMaybePromise` from `@whatwg-node/promise-helpers`

#### Example
```ts
import { MeshApolloLink } from '@graphql-mesh/apollo-link'
import { ApolloClient, InMemoryCache } from '@apollo/client'

const client = new ApolloClient({
  link: new MeshApolloLink({ mesh }),
  cache: new InMemoryCache(),
})
```
