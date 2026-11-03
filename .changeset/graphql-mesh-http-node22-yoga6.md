---
"@graphql-mesh/http": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Use Hive `Logger` typing; webhook `pubsub.publish` without unnecessary `await`
- Node builtins via `globalThis.process?.getBuiltinModule` at call sites

#### Example
```ts
import type { Logger } from '@graphql-hive/logger'
import type { PubSub } from '@graphql-hive/pubsub'

// webhook handler publishes directly; Mesh HTTP server types expect Hive Logger/PubSub
pubsub.publish('webhook:received', payload)
```
