---
"@omnigraph/json-schema": minor
"@omnigraph/openapi": minor
---

BREAKING CHANGE:

- `requestSchema` and `requestSample` are no longer used for query parameters in GET operations, but instead we introduced new `argTypeMap` and `queryParamsArgMap` to define schemas for query parameters.

For JSON Schema Handler configuration, the following changes are **NEEDED**;
```diff
- requestSample: { some_flag: true }
+ queryParamsArgMap:
+   some_flag: some_flag
+ argTypeMap:
+   some_flag:
+     type: boolean
```

or just use the string interpolation;
```yaml
path: /mypath?some_flag={args.some_flag}
```

- Query parameters no longer uses `input`, and they become an argument of that operation directly.

In the generated GraphQL Schema;
```diff
- someOp(input: SomeInput): OpResult
- input SomeInput {
-  some_flag: Boolean
- }
+ someOp(some_flag: Boolean): OpResult
```

- `argTypeMap` no longer takes GraphQL type names but instead it can take JSON Schema pointer or JSON Schema definition itself. New `argTypeMap` can configure any argument even if it is defined in the headers.

```diff
argTypeMap:
- some_flag: Boolean
+ some_flag:
+   type: boolean
```
