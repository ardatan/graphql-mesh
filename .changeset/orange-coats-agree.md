---
"@graphql-mesh/supergraph": patch
"@graphql-mesh/runtime": patch
---

Better error messages in case of Supergraph SDL endpoint returns invalid result or it is down

If the endpoint is down;
```
Failed to generate the schema for the source "supergraph"
Failed to load supergraph SDL from http://down-sdl-source.com/my-sdl.graphql:
Couldn't resolve host name
```

If the endpoint returns invalid result;
```
Failed to generate the schema for the source "supergraph"
Supergraph source must be a valid GraphQL SDL string or a parsed DocumentNode, but got an invalid result from ./fixtures/supergraph-invalid.graphql instead.
Got result: type Query {

Got error: Syntax Error: Expected Name, found <EOF>.
```
