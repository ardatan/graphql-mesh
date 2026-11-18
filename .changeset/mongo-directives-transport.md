---
'@omnigraph/mongo': major
'@graphql-mesh/transport-mongo': major
'@graphql-mesh/mongoose': major
---

## TL;DR

New Mongo subgraph stack: `@omnigraph/mongo` + `@graphql-mesh/transport-mongo` with hand-writable
`@mongo` and transport `kind: "mongo"`.

Mongoose is compose/bootstrap only. Runtime uses the native MongoDB driver for
find/count/connection/pagination/CRUD/aggregate via Connectors-style `filter` / `selection` / `set`
/ `pipeline`.

**Legacy v0 handler:** `@graphql-mesh/mongoose` keeps the same YAML entrypoint and shells into the
new stack (like mysql/tuql -> SQL).

## Decisions

- Client + directive binder: Mongo-native `filter` (not SQL-style `where`)
- Sole PK GraphQL type: `ID`
- Scalars from `graphql-scalars` where available (`ObjectID`, `DateTime`, `Byte`, `JSON`)
- `ref` paths emit nested `@mongo` populate fields

## Consumer migration

| Before | After |
| --- | --- |
| Runtime `composeWithMongoose` | Same YAML handler or `loadMongoSubgraph` |
| `MongoID` | GraphQL `ID` for PK |
| Opaque resolvers | `@mongo(filter/selection/set/…)` |

Website docs deferred. First npm publish of the new packages is required before CI alphas.
