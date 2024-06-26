---
'@graphql-mesh/odata': minor
'@omnigraph/json-schema': minor
'@graphql-mesh/transport-common': minor
'@omnigraph/openapi': minor
'@graphql-mesh/transport-http': minor
'@graphql-mesh/transport-rest': minor
'@graphql-mesh/transport-soap': minor
'@omnigraph/raml': minor
'@omnigraph/soap': minor
'@graphql-mesh/json-schema': minor
'@graphql-mesh/openapi': minor
'@graphql-mesh/raml': minor
---

POTENTIAL BREAKING CHANGE:

Now `@httpOperation` and `@transport` directive serializes headers as `[string, string][]` instead of stringified JSON.

```diff
@httpOperation(
-  operationSpecificHeaders: [["Authorization", "Bearer 123"], ["X-Api-Key", "123"]]
+  operationSpecificHeaders: "{\"Authorization\": \"Bearer 123\", \"X-Api-Key\": \"123\"}"
)
```

```diff
@transport(
-  headers: [["Authorization, "Bearer 123"], ["X-Api-Key", "123"]]
+  headers: "{\"Authorization, \"Bearer 123\", \"X-Api-Key\": \"123\"}"
)
```

There is still backwards compatibility but this might look like a breaking change for some users during schema validation.
