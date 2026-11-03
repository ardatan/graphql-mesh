---
"@graphql-mesh/plugin-http-cache": major
---

- Require Node.js `>=22.18.0`
- Use onFetch payload / `context.log` in `onFetch` (no plugin `log` option / no Yoga-init logger capture)
- Prefer `@whatwg-node/promise-helpers` (`fakePromise` / `handleMaybePromise`)
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
