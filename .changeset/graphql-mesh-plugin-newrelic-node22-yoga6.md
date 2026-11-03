---
"@graphql-mesh/plugin-newrelic": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Align envelop/Yoga 6 majors
- Keep optional `options.log` for init-time diagnostics when the New Relic agent is unavailable (e.g. `options.log?.debug('Agent unavailable…')`); prefer Yoga `context.log` for request-time logging

#### Example
```ts
import { useMeshNewrelic } from '@graphql-mesh/plugin-newrelic'

useMeshNewrelic({
  ...meshPluginOptions,
  log: meshLogger, // optional init-time logger when the New Relic agent is missing
})
```
