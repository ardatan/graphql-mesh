---
'@omnigraph/mongo': major
'@graphql-mesh/transport-mongo': major
'@graphql-mesh/mongoose': major
---

## TL;DR

New Mongo subgraph stack: `@omnigraph/mongo` + `@graphql-mesh/transport-mongo` with hand-writable
`@mongo` and transport `kind: "mongo"`.

Mongoose is compose/bootstrap only (models -> types + directives). Runtime uses the native MongoDB
driver and executes `FIND_ONE` / `FIND_MANY` / `COUNT` from Connectors-style `where` / `selection`
mappings (same family as `@sql` / `@thrift__rpc`).

**Legacy v0 handler:** `@graphql-mesh/mongoose` keeps the same YAML entrypoint
(`connectionString` / `models` / `discriminators`) and now shells into the new stack under the hood
(same pattern as mysql/tuql -> SQL).

## Why

v0 mongoose handlers wrap `graphql-compose-mongoose` at runtime, so the schema cannot be
hand-authored or AI-edited like other Mesh directive transports. This stack splits introspection
emit from execution.

## Loader

```ts
import { loadMongoSubgraph } from '@omnigraph/mongo';

loadMongoSubgraph('users', {
  endpoint: 'mongodb://localhost:27017/test',
  models: [{ name: 'User', path: './src/models#User' }],
})
```

## `@mongo` surface (first slice)

| Arg | Role |
| --- | --- |
| `collection` | Mongo collection name |
| `kind` | `FIND_ONE` \| `FIND_MANY` \| `COUNT` (more kinds sketched; writes/aggregate later) |
| `where` | Equality/join predicates and structured client where (`$args.where`, spreads) |
| `sort` / `limit` / `skip` | Separate planner binders |
| `selection` | Mongo paths -> GraphQL fields |

Root field names keep the v0 mongoose pattern (`User_findById`, `User_findMany`, …). Client filter
arg is `where: *Where` (aligned with the SQL stack; v0 used `filter`).

## Consumer migration

| Before (v0 mongoose handler) | After (new stack) |
| --- | --- |
| Runtime `composeWithMongoose` resolvers | Same YAML handler, or `loadMongoSubgraph` + `transport-mongo` |
| `User_findMany(filter: …)` | `User_findMany(where: …)` |
| Full graphql-compose-mongoose op set | First slice: `findById` / `findMany` / `findOne` / `count` |
| Opaque resolvers | Hand-writable `@mongo(where/selection/…)` |

Website docs and remaining ops (connection, writes, dataloaders) are deferred.
