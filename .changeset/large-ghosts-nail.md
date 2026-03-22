---
'@graphql-mesh/string-interpolation': patch
---

If the entire interpolation string is a placeholder for a value, then return that value;

If `{ args: { n: 1, flag: true, name: 'test' } }` is passed as data,

- `{args}` will return `{ n: 1, flag: true, name: 'test' }`
- `{args.name}` will return `"test"`
- `{args.n}` will return `1`
- `{args.flag}` will return `true`
