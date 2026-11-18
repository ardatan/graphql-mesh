---
'@omnigraph/mongo': major
'@graphql-mesh/transport-mongo': major
'@graphql-mesh/mongoose': major
'@graphql-mesh/fusion-composition': patch
---

## TL;DR

New Mongo subgraph stack: `@omnigraph/mongo` + `@graphql-mesh/transport-mongo` with hand-writable
op-specific `@mongo__*` directives and transport `kind: "mongo"`.

Mongoose is compose/bootstrap only. Runtime uses the native MongoDB driver.

**Legacy v0 handler:** `@graphql-mesh/mongoose` keeps the same YAML entrypoint and shells into the
new stack (like mysql/tuql -> SQL).

## Decisions

- GraphQL roots mirror MongoDB collection methods: `findOneUser` / `findUsers` /
  `countDocumentsUsers` / `insertOneUser` / `updateOneUser` / `deleteManyUsers` / `aggregateUsers`
  ([method reference](https://www.mongodb.com/docs/manual/reference/method/))
- Op directives: `@mongo__findOne` / `@mongo__find` / `@mongo__count` /
  `@mongo__connection` / `@mongo__pagination` / `@mongo__aggregate` /
  `@mongo__insertOne|insertMany` / `@mongo__updateOne|updateMany` / `@mongo__deleteOne|deleteMany`
  (SDL client API ≠ directive binders; legacy `@mongo(kind:)` still executed)
- Client args: typed `query: *QueryInput` (`and` / `or` / `not` + field ops) +
  `sort: [*Sort!]` (`id_asc` / `age_desc`; transport maps to `{ field: 1|-1 }`).
  Query operators use Mongo names without `$` (`gte`, `in`, `and`, … → `$gte` / `$in` /
  `$and`; also accepts native `{ $gte }` and `_gte`)
- Projection = GraphQL selection set + `@mongo__*(selection:)` (findOne's projection)
- Directive binders: `query` / `selection` / `sort` / `set` / `pipeline`
- `update` stays JSON for `$set` / `$inc` / … update operators
- `document` / `documents` for insertOne / insertMany
- Sole PK GraphQL type: `ID` (`id` arg convenience for findById)
- Scalars: `graphql-scalars` (`ObjectID`, `DateTime`, `Byte`, `JSON`) + local `Decimal128`
- Mutation payloads include typed `error: MongoError` when selected
- Nested Mongoose paths emit Embedded / DocumentArray object types + enums + descriptions
- `ref` paths emit nested `@mongo__findOne` / `@mongo__find` populate fields
- Fusion `rewriteConnectArgReferences` rewrites `$args` / `$this` in all `mongo__*` (and legacy `mongo`)

## Consumer migration

| Before (v0 mongoose) | After |
| --- | --- |
| Runtime `composeWithMongoose` | Same YAML handler or `loadMongoSubgraph` |
| `User_findById(_id)` / `User_findMany(filter)` | `findUserById(id)` / `findUsers(query)` |
| `User_createOne(record)` | `insertOneUser(document)` |
| Opaque resolvers | `@mongo__find(query/sort/selection/…)` |

Website docs deferred. First npm publish of the new packages is required before CI alphas.
