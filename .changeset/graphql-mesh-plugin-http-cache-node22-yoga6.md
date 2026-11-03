---
"@graphql-mesh/plugin-http-cache": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

HTTP cache logging was wired through a plugin `log` option or the onFetch payload rename (`log: fetchLog`). Under Yoga 6 the request already carries `context.log`, so a second logger channel was redundant and often wrong (init logger vs per-request child).

## What changed in this package

- No plugin `log` option
- In `onFetch`, use `context?.log?.child({ plugin: 'HTTP Cache' })` (fallback `context.log`)

#### Example
```ts
import useHTTPCache from '@graphql-mesh/plugin-http-cache'

// Before:
// onFetch({ ..., log: fetchLog }) { const log = fetchLog?.child(...) }
// useHTTPCache({ ...meshPluginOptions, log })

useHTTPCache({ ...meshPluginOptions, cache })
// inside plugin: const log = context?.log?.child?.({ plugin: 'HTTP Cache' }) ?? context?.log
```
