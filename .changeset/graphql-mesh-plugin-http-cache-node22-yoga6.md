---
"@graphql-mesh/plugin-http-cache": major
---

- Require Node.js `>=22.18.0`
- Prefer `context?.log?.child({ plugin: 'HTTP Cache' })` in `onFetch` (no plugin `log` option / no Yoga-init logger capture)
- Prefer `@whatwg-node/promise-helpers` (`fakePromise` / `handleMaybePromise`)
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
#### Example
```ts
// onFetch logging uses Yoga context logger
onFetch({ context, url }) {
  const log = context?.log?.child?.({ plugin: 'HTTP Cache' })
  log?.debug(`cache lookup ${url}`)
}
```
