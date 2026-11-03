---
"@graphql-mesh/plugin-http-cache": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

HTTP cache needs per-request debug lines (hit/miss/revalidate). Feeding a constructor `log` or renaming onFetch’s `log: fetchLog` produced logs without Yoga request children (no request id / operation binding). Yoga 6 already exposes `context.log`; the plugin should child that logger instead of carrying a second channel.

## What changed

- Plugin `log` option removed
- `onFetch` uses `context?.log?.child({ plugin: 'HTTP Cache' }) ?? context?.log`

## How to migrate

1. Remove `log` from `useHTTPCache({ ... })` calls.
2. Ensure your Yoga/Gateway context provides `log` if you rely on cache debug output.

#### Example
```ts
import useHTTPCache from '@graphql-mesh/plugin-http-cache'

// Before: useHTTPCache({ ...meshPluginOptions, log })
// Before: onFetch({ log: fetchLog, ... }) { fetchLog.child(...) }
useHTTPCache({ ...meshPluginOptions, cache })
```
