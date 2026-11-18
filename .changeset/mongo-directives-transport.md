---
'@omnigraph/mongo': major
'@graphql-mesh/transport-mongo': major
'@graphql-mesh/mongoose': major
---

## TL;DR

New Mongo subgraph stack: `@omnigraph/mongo` + `@graphql-mesh/transport-mongo` with hand-writable
`@mongo` and transport `kind: "mongo"`.

Mongoose is compose/bootstrap only. Runtime uses the native MongoDB driver for
find/count/connection/pagination/CRUD/aggregate via Connectors-style `where` / `orderBy` /
`selection` / `set` / `pipeline`.

**Legacy v0 handler:** `@graphql-mesh/mongoose` keeps the same YAML entrypoint and shells into the
new stack (like mysql/tuql -> SQL).

## Decisions

- GraphQL roots + args aligned with the SQL stack: `user` / `users` / `allUsers` / `createUser`,
  client args `where` / `orderBy` / `input`
- Directive binders: `where` / `orderBy` (no `filter` / `sort` aliases)
- Sole PK GraphQL type: `ID` (`id` arg, not `_id`)
- Scalars: `graphql-scalars` (`ObjectID`, `DateTime`, `Byte`, `JSON`) + local `Decimal128`
- Mutation payloads include typed `error: MongoError` (v0 compose parity when selected)
- `aggregateUsers(where, pipeline)` + multi-stage pipeline rewrite (`$match: "$args.where"`)
- `ref` paths emit nested `@mongo` populate fields

## Consumer migration

| Before (v0 mongoose) | After |
| --- | --- |
| Runtime `composeWithMongoose` | Same YAML handler or `loadMongoSubgraph` |
| `User_findById(_id)` / `User_findMany(filter)` | `user(id)` / `users(where)` |
| `User_createOne(record)` | `createUser(input)` |
| Opaque resolvers | `@mongo(where/orderBy/selection/set/…)` |

Website docs deferred. First npm publish of the new packages is required before CI alphas.
