---
'@graphql-mesh/graphql': minor
'@graphql-mesh/types': minor
---

## What the change is

Allows providing a static schema definition to the GraphQL handler

## Why the change was made

Network requests to fetch a runtime introspection query cause problems in static workflows (e.g. type generation).

## How a consumer should update their code

Add a list of paths under the `schema` field in the handler config. This will be used to load the schema using [GraphQL Tools](https://www.graphql-tools.com/docs/schema-loading/). If the schema is omitted, a runtime introspection will be used as before.
