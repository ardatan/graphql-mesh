---
"@graphql-mesh/plugin-newrelic": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

New Relic can be missing or disabled at process boot — before any GraphQL context exists. That diagnostic (`Agent unavailable…`) still needs an init-time logger. Request instrumentation should nevertheless follow Yoga `context.log`. Optional `options.log` keeps the boot warning without making every Mesh plugin require a logger.

## What changed

- Yoga 6 / envelop-aligned plugin shape
- Optional `options.log` for init-time “agent unavailable” diagnostics
- Prefer `context.log` for request-time work

## How to migrate

Pass `log` only if you care about the init-time agent warning; otherwise omit it and rely on Gateway/Yoga context for request logs.

#### Example
```ts
import { useMeshNewrelic } from '@graphql-mesh/plugin-newrelic'

useMeshNewrelic({
  ...meshPluginOptions,
  log: meshLogger, // optional — options.log?.debug('Agent unavailable…')
})
```
