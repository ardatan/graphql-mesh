---
"@graphql-mesh/plugin-http-cache": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Prefer `context?.log?.child({ plugin: 'HTTP Cache' })` in `onFetch` (no plugin `log` option / no Yoga-init logger capture)
- Prefer `@whatwg-node/promise-helpers` (`fakePromise` / `handleMaybePromise`)

#### Example
```ts
import useHTTPCache from '@graphql-mesh/plugin-http-cache'

// Before: useHTTPCache({ ...meshPluginOptions, log })
useHTTPCache({ ...meshPluginOptions })

// onFetch logging uses Yoga/Gateway context logger:
// const log = context?.log?.child?.({ plugin: 'HTTP Cache' }) ?? context?.log
```
