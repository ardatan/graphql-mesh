---
'@graphql-mesh/string-interpolation': patch
---

Return `undefined` when interpolated string is completely an expression that resolves to `undefined`

```js
stringInterpolator.parse('{missing}', {});
```

will now return `undefined` instead of the string `''`.
