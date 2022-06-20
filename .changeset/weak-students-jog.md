---
"@graphql-mesh/config": minor
"@graphql-mesh/graphql": minor
"@graphql-mesh/json-schema": minor
"@graphql-mesh/neo4j": minor
"@graphql-mesh/new-openapi": minor
"@graphql-mesh/odata": minor
"@graphql-mesh/openapi": minor
"@graphql-mesh/raml": minor
"@graphql-mesh/soap": minor
"@graphql-mesh/thrift": minor
"json-machete": minor
"@omnigraph/json-schema": minor
"@omnigraph/openapi": minor
"@graphql-mesh/merger-bare": minor
"@graphql-mesh/runtime": minor
"@graphql-mesh/types": minor
"@graphql-mesh/utils": minor
---

Breaking Change:

- Now you can set a global `customFetch` instead of setting `customFetch` individually for each handler. `customFetch` configuration field for each handler will no longer work. And also `customFetch` needs to be the path of the code file that exports the function as `default`. `moduleName#exportName` is not supported for now.

- While programmatically creating the handlers, now you also need `fetchFn` to be passed to the constructor;

```ts
new GraphQLHandler({
  ...,
  fetchFn: myFetchFn,
})
```

- `readFileOrUrl`'s second `config` parameter is now required. Also this second parameter should take an object with `cwd`, `importFn`, `fetch` and `logger`. You can see the diff of handler's codes as an example.
