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
  (SDL client API != directive binders)
- Client args: typed `filter: *FilterInput` (`and` / `or` / `not` + field ops). Binder stays
  `query: "$args.filter"`. `$` is illegal in GraphQL names, so generated ops use bare Mongo
  names (`gte`, `in`, …); transport also accepts `_gte` aliases and native `{ $gte }` in
  hand-written binders
- `sort: [*Sort!]` (`id_asc` / `age_desc`; transport maps to `{ field: 1|-1 }`)
- Directive binders: `query` / `selection` / `sort` / `set` / `pipeline`
- `update: *UpdateInput`: same rule - bare op names (`set` / `inc` / `unset`) map to
  `$set` / `$inc` / `$unset`; `_set` aliases + native `$set` still accepted; array mods JSON
- `document` / `documents` for insertOne / insertMany
- BSON ObjectId (GraphQL field `id` ← `_id`, ById args, refs, `recordId`) uses
  `ObjectID` scalar + `ObjectIDQueryOperators` (not opaque GraphQL `ID`)
- Scalars: `graphql-scalars` (`ObjectID`, `DateTime`, `Byte`, `JSON`) + local `Decimal128`
- Mutation write failures always surface as GraphQL `errors` (`DOWNSTREAM_SERVICE_ERROR`);
  generated and handwritten mutations both throw before applying `selection` (no error-payload mapping)
- Generated mutations default to document-only results (`User` / `[User!]!`) via
  `returnDocumentOnlyInMutationResult` (default `true`). Set `false` for Connectors-style
  `*Payload` (`record: $record { … }`, `recordId: $_id`, counts). `updateMany` /
  `deleteMany` always return the payload (counts)
- Nested Mongoose paths emit Embedded / DocumentArray object types + enums; `ref` paths emit
  nested `@mongo__findOne` / `@mongo__find` populate fields
- Mesh composition rewrites `$args` / `$this` in all `mongo__*` binders; `$this`
  renames are one-shot (no cascade), `#` comments are quote-safe, and selection rewrites skip
  quoted literals
- Bulk writes reject vacuous `$or` / `not` of match-nothing filters; required fields reject null
  after BSON coerce, `$unset`, and `$rename`
- String `_id` models require `id: String!` on create, keep BSON string inserts/cursors/payloads,
  and scope empty-input placeholders per collection
- GraphQL `storedId` → mongoose `id` aliases are collection-aware; bulk insert applies them only
  when `@mongo__insertMany(graphqlDocumentInputs: true)` (loader sets this on generated
  DocumentInput roots). Hand-written binders omit the flag so BSON `storedId` is never
  inferred from `_id` presence
- ObjectId coercion and required-field checks are keyed by collection+path (same bare field name
  can differ across models; nested paths via `coerceDeep` / `$elemMatch`)
- Connection cursors still reject array-backed sort keys (correct multikey keyset needs
  `$expr`/`$min`/`$max`, not multikey `$gt`)
- `MongoModelConfig`: exactly one of `model` | `schema` | `path`; flat `fields`
  (only/remove/required); discriminator subtypes auto-read from `schema.discriminatorMapping`
- `queryAndMutations`: opt out of individual Query/Mutation roots (`false` omits; keys follow
  Mongo collection methods: `insertOne` / `deleteMany` / `countDocuments` / …)
- `naming?: Partial<MongoNaming>` on `loadMongoSubgraph` / `loadGraphQLSchemaFromMongo`
- Raw `aggregate*` omitted subgraph-wide when any model has `fields.only` / `fields.remove`, and
  omitted on discriminator subtype models (`$unionWith` can bypass a prepended `$match`)

## Consumer migration

| Before (v0 mongoose) | After |
| --- | --- |
| Runtime `composeWithMongoose` | Same YAML handler or `loadMongoSubgraph` |
| `User_findById(_id)` / `User_findMany(filter)` | `findUserById(id)` / `findUsers(filter)` |
| `User_createOne(record)` | `insertOneUser(document)` |
| Opaque resolvers | `@mongo__find(query/sort/selection/…)` |
| Select `error { message }` on `*Payload` | GraphQL `errors` (`DOWNSTREAM_SERVICE_ERROR`) |
| `createOne` → `*Payload { record }` | `insertOneUser` → `User` (payload via `returnDocumentOnlyInMutationResult: false`) |

```graphql
# Before
query { User_findMany(filter: { age: { gte: 30 } }) { name } }

# After
query { findUsers(filter: { age: { gte: 30 } }) { name } }
```

Website docs deferred. First npm publish of the new packages is required before CI alphas.
