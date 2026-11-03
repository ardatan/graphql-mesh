---
"@graphql-mesh/plugin-newrelic": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major vs `master` (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub -> disposables, builtins, promise helpers).

## Motivation

New Relic can be missing at process boot, before any GraphQL context exists. The init-time "Agent unavailable" diagnostic still needs an optional logger; request work should use `context.log`.

## What changed (vs `master`)

- Yoga 6 / envelop-aligned plugin shape
- Optional `options.log` for init-time agent-missing diagnostics
- Prefer `context.log` for request-time work

## How to migrate

Pass `log` only if you want the init-time agent warning.

#### Example
```ts
import { useMeshNewrelic } from '@graphql-mesh/plugin-newrelic'

useMeshNewrelic({
  ...meshPluginOptions,
  log: meshLogger, // optional: options.log?.debug('Agent unavailable...')
})
```
