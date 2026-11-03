---
"@graphql-mesh/plugin-newrelic": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

New Relic setup can fail before any GraphQL request exists (agent missing / disabled). That still needs an init-time logger, while request spans should follow Yoga `context.log`. Keeping `options.log` optional preserves the agent-unavailable diagnostic without forcing every plugin to take a logger.

## What changed in this package

- Align with envelop / Yoga 6 plugin shapes
- Keep optional `options.log` for init-time diagnostics when the New Relic agent is unavailable
- Prefer Yoga `context.log` for request-time logging

#### Example
```ts
import { useMeshNewrelic } from '@graphql-mesh/plugin-newrelic'

useMeshNewrelic({
  ...meshPluginOptions,
  log: meshLogger, // optional — used for: options.log?.debug('Agent unavailable…')
})
```
