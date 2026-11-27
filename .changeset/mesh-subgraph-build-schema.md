---
'@graphql-mesh/subgraph': minor
---

Add `@graphql-mesh/subgraph` with `buildSubgraphSchema`.

Pass generated or hand-written Mesh subgraph SDL (or a `GraphQLSchema`) and get an executable Federation subgraph schema: transports wire directive execution automatically, Federation Spec draft `@lookup` / `@is` / `@internal` become entity resolvers for `Query._entities`, and `Query._service { sdl }` is installed for Apollo Router / Hive Gateway. Serve the result on any GraphQL server.

The first argument matches `@apollo/subgraph`: a `{ typeDefs, resolvers }` schema config, an array of modules, or bare Mesh SDL. Mesh runtime options (`fetch`, `pubsub`, transports, …) go in the second argument. The return is `MaybePromise<GraphQLSchema>` (await when transports are async).

```ts
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@graphql-mesh/subgraph';

const schema = await buildSubgraphSchema({ typeDefs, resolvers }, { fetch });
// or: await buildSubgraphSchema([{ typeDefs, resolvers }], { fetch })
// or SDL-only: await buildSubgraphSchema(typeDefs, { fetch })
const yoga = createYoga({ schema });
```

Mesh `@merge` remains supported for list/batch entry fields; `@lookup` is single-object only.

Mesh stitching `@source` / `@meshSource` (not Apollo SCHEMA `@source`) apply reverse-rename transforms like stamped subgraph SDL. Pass optional `pubsub` to wire `@pubsubOperation` / `@pubsubPublish`; omit it for a clear no-op.

`@transport(location:)` / Connect `@source` / protocol endpoints are the **upstream API**. The URL registered with Apollo Router, Hive Gateway, or Rover is the **served subgraph** (this process), not that upstream.
