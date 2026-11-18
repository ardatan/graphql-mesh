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
- Client args: typed `filter: *FilterInput` (`and` / `or` / `not` + field ops; compose-mongoose
  style) + `sort: [*Sort!]` (`id_asc` / `age_desc`; transport maps to `{ field: 1|-1 }`).
  Field operators use Mongo names without `$` (`gte`, `in`, `and`, … → `$gte` / `$in` /
  `$and`; also accepts native `{ $gte }` and `_gte`)
- Projection = GraphQL selection set + `@mongo__*(selection:)` (findOne's projection)
- Directive binders: `query` (← `$args.filter`) / `selection` / `sort` / `set` / `pipeline`
- `update: *UpdateInput` with Mongo update ops without `$` (`set` / `inc` / `unset` / … →
  `$set` / `$inc` / `$unset`; `_set` aliases + native `$set` still accepted; array mods JSON)
- `document` / `documents` for insertOne / insertMany
- BSON ObjectId (GraphQL field `id` ← `_id`, ById args, refs, `recordId`) uses
  `ObjectID` scalar + `ObjectIDQueryOperators` (not opaque GraphQL `ID`)
- Scalars: `graphql-scalars` (`ObjectID`, `DateTime`, `Byte`, `JSON`) + local `Decimal128`
- Mutation payloads include typed `error: MongoError` when selected
- Nested Mongoose paths emit Embedded / DocumentArray object types + enums + descriptions
- `ref` paths emit nested `@mongo__findOne` / `@mongo__find` populate fields
- Fusion `rewriteConnectArgReferences` rewrites `$args` / `$this` in all `mongo__*` (and legacy `mongo`); `$this` renames are one-shot (no cascade), `#` comments are quote-safe, and selection rewrites skip quoted literals
- Bulk writes reject vacuous `$or` / `not` of match-nothing filters; required fields reject null after BSON coerce, `$unset`, and `$rename`
- String `_id` models require `id: String!` on create, keep BSON string inserts/cursors/payloads, and scope empty-input placeholders per collection
- ObjectId coercion and required-field checks are keyed by collection+path (same bare field name can differ across models)
- Connection cursors still reject array-backed sort keys (correct multikey keyset needs `$expr`/`$min`/`$max`, not multikey `$gt`)
- `MongoModelConfig`: exactly one of `model` | `schema` | `path`; flat `fields` (only/remove/required);
  discriminator subtypes auto-read from `schema.discriminatorMapping`
- `queryAndMutations`: opt out of individual Query/Mutation roots (`false` omits; keys follow
  Mongo collection methods: `insertOne` / `deleteMany` / `countDocuments` / …)
- `naming?: Partial<MongoNaming>` on `loadMongoSubgraph` / `loadGraphQLSchemaFromMongo`
  (`insertOneField` / `deleteManyField` / `countDocumentsField` / …)

## Consumer migration

| Before (v0 mongoose) | After |
| --- | --- |
| Runtime `composeWithMongoose` | Same YAML handler or `loadMongoSubgraph` |
| `User_findById(_id)` / `User_findMany(filter)` | `findUserById(id)` / `findUsers(filter)` |
| `User_createOne(record)` | `insertOneUser(document)` |
| Opaque resolvers | `@mongo__find(query/sort/selection/…)` |

Website docs deferred. First npm publish of the new packages is required before CI alphas.
