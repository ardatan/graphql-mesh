---
'@graphql-mesh/types': patch
'@graphql-mesh/http': patch
---

By default, Mesh does not allow extra parameters in the request body other than `query`, `operationName`, `extensions`, and `variables`, then throws 400 HTTP Error.
This change adds a new option called `extraParamNames` to allow extra parameters in the request body.

```yaml
serve:
  extraParamNames:
    - extraParam1
    - extraParam2
```

```ts
const res = await fetch('/graphql', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        query: 'query { __typename }',
        extraParam1: 'value1',
        extraParam2: 'value2',
    }),
});

console.assert(res.status === 200);
```
