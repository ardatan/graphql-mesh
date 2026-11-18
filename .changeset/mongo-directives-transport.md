---
'@omnigraph/mongo': major
'@graphql-mesh/transport-mongo': major
'@graphql-mesh/mongoose': major
---

## TL;DR

New Mongo subgraph stack: `@omnigraph/mongo` + `@graphql-mesh/transport-mongo` with hand-writable
`@mongo` and transport `kind: "mongo"`.

Mongoose is compose/bootstrap only. Runtime uses the native MongoDB driver.

**Legacy v0 handler:** `@graphql-mesh/mongoose` keeps the same YAML entrypoint and shells into the
new stack (like mysql/tuql -> SQL).

## Decisions

- GraphQL roots mirror MongoDB collection methods: `findOneUser` / `findUsers` /
  `countDocumentsUsers` / `insertOneUser` / `updateOneUser` / `deleteManyUsers` / `aggregateUsers`
  ([method reference](https://www.mongodb.com/docs/manual/reference/method/))
- Client args: typed `query: *QueryInput` / `sort: *SortInput` (Mongo predicate names without `$`:
  `gte`, `in`, …; transport maps to `$gte` / `$in`; also accepts native `{ $gte }` and `_gte` aliases)
- Projection = GraphQL selection set + `@mongo(selection:)` (findOne's projection)
- Directive binders: `query` / `selection` / `sort` / `set` / `pipeline`
- `update` stays JSON for `$set` / `$inc` / … update operators
- `document` / `documents` for insertOne / insertMany
- Sole PK GraphQL type: `ID` (`id` arg convenience for findById)
- Scalars: `graphql-scalars` (`ObjectID`, `DateTime`, `Byte`, `JSON`) + local `Decimal128`
- Mutation payloads include typed `error: MongoError` when selected
- Nested Mongoose paths emit Embedded / DocumentArray object types + enums + descriptions
- `ref` paths emit nested `@mongo` populate fields

## Consumer migration

| Before (v0 mongoose) | After |
| --- | --- |
| Runtime `composeWithMongoose` | Same YAML handler or `loadMongoSubgraph` |
| `User_findById(_id)` / `User_findMany(filter)` | `findUserById(id)` / `findUsers(filter)` |
| `User_createOne(record)` | `insertOneUser(document)` |
| Opaque resolvers | `@mongo(filter/sort/selection/set/…)` |

Website docs deferred. First npm publish of the new packages is required before CI alphas.
