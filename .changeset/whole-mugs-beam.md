---
'@graphql-mesh/string-interpolation': patch
---

Return `undefined` when interpolated string is completely an expression that resolves to `undefined`

```js
stringInterpolator.parse('{missing}', {});
```

will now return `undefined` instead of the string `''`.


Also if the given string is `undefined`, return an undefined too;

```js
stringInterpolator.parse(undefined, {});
```

will return `undefined` instead of the string `''`.
