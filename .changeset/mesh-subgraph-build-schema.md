---
'@graphql-mesh/subgraph': minor
---

Add `@graphql-mesh/subgraph` with `buildSubgraphSchema`.

Pass generated or hand-written Mesh subgraph SDL (or a `GraphQLSchema`) and get an executable Federation subgraph schema: transports wire directive execution automatically, Federation Spec draft `@lookup` / `@is` / `@internal` become entity resolvers for `Query._entities`, and `Query._service { sdl }` is installed for Apollo Router / Hive Gateway. Serve the result on any GraphQL server.

```ts
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@graphql-mesh/subgraph';

const schema = await buildSubgraphSchema(typeDefs, { fetch });
const yoga = createYoga({ schema });
```

Mesh `@merge` remains supported for list/batch entry fields; `@lookup` is single-object only.
