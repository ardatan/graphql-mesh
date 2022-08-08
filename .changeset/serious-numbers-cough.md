---
"@graphql-mesh/json-schema": minor
"@graphql-mesh/new-openapi": minor
"@omnigraph/json-schema": minor
"@omnigraph/openapi": minor
---

Accept a code file for `operationHeaders`

Now you can generate headers dynamically from the resolver data dynamically like below;

```yml
operationHeaders: ./myOperationHeaders.ts
```

And in `myOperationHeaders.ts`
```ts
export default function myOperationHeaders({
  context,
}: ResolverData) {
  const someToken = context.request.headers.get('some-token');
  const anotherToken = await someLogicThatReturnsAnotherToken(someToken);
  return {
    'x-bar-token': anotherToken,
  };
}
```
