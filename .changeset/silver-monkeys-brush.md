---
"@omnigraph/json-schema": patch
---

Delete the escaped field name in favor of unescaped/original field name to keep the expected structure

For example if you have `foo-bar` in your request input, it is sanitized to `foo_bar` in order to fit the requirements of GraphQL specification. But then, JSON Schema loader recovers it to the original `foo-bar` field name before sending request. But it was sending both field names.

```graphql
input FooBar {
  foo_bar: String
}
```

Before;
```json
{
  "foo-bar": "baz",
  "foo_bar": "baz"
}
```

After;
```json
{
  "foo-bar": "baz"
}
```
