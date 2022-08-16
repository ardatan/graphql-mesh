---
"@graphql-mesh/openapi": minor
"@omnigraph/json-schema": minor
"@omnigraph/openapi": minor
---

- Support "$request.query" and "$request.path" usages in [OpenAPI runtime expressions](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#runtimeExpression)
- Fix `Field not found` error when an OpenAPI link refers to an operation which is not `Mutation`
- Do not use AJV and check field names in the received object to resolve the type name for a union field
- Fix `queryParams` which allows you to pass query parameters for all operations
- Handle cookie paramters correctly defined in the OpenAPI document by trimming empty values
- Respect the mime types defined in the OpenAPI document. Now it creates a union for each mime type defined in the document, and resolve it by the mime type.
- Respect JSON examples given in the OpenAPI document correctly even if they are strings with JSON content.
- Normalize(lowercase header names) and merge final operation headers correctly from different places `operationHeaders` from the bundle and configuration plus `headers` defined for that specific operation.

**BREAKING CHANGES:**

- If a JSON Schema type cannot be represented in GraphQL (object without properties etc.), it will no longer use `Any` type but `JSON` type instead which is a scalar from `graphql-scalars`.

- Due to the improvements in `healJSONSchema` some of types that are not named in the JSON Schema might be named in a different way. Please make sure the content of the types are correct and report us on GitHub if they are represented incorrectly.

- UUID format is now represented as `UUID` scalar type which is a scalar from `graphql-scalars`.

- HTTP Errors are now in a more descriptive way. If your consumer respects them strictly, they will probably need to update their implementation.

```diff
{
  "url": "http://www.google.com/api",
  "method": "GET",
- "status": 401,
+ "statusCode": 401,
+ "statusText": "Unauthorized",
- "responseJson": {}
+ "responseBody": {}
}
```
