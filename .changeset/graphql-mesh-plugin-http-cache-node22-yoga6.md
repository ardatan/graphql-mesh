---
"@graphql-mesh/plugin-http-cache": minor
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

HTTP cache debug lines should follow the Yoga request logger. Constructor `log` / onFetch `log: fetchLog` were easy to get wrong relative to `context.log`.

## What changed ()

- No plugin `log` option
- `onFetch` uses `context?.log?.child({ plugin: 'HTTP Cache' }) ?? context?.log`

## How to migrate

Remove `log` from `useHTTPCache({ ... })`. Ensure Yoga/Gateway context provides `log` if you need cache debug output.

#### Example
```ts
import useHTTPCache from '@graphql-mesh/plugin-http-cache'

// before: useHTTPCache({ ...meshPluginOptions, log })
useHTTPCache({ ...meshPluginOptions, cache })
```
