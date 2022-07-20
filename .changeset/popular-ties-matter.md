---
"@omnigraph/json-schema": patch
---

```yml
operationHeaders:
  Some-Header: "{context.headers.SOME_HEADER}"
```

If the interpolated value is empty, JSON Schema loader was sending the header with an empty value.
Now it doesn't send the header if the value is empty.
