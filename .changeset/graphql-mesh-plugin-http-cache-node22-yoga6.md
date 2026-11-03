---
"@graphql-mesh/plugin-http-cache": major
---

- Require Node.js `>=22.18.0`
- Use onFetch payload / `context.log` in `onFetch` (no plugin `log` option / no Yoga-init logger capture)
- Prefer `@whatwg-node/promise-helpers` (`fakePromise` / `handleMaybePromise`)
