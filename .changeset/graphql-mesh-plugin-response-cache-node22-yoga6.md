---
"@graphql-mesh/plugin-response-cache": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Drop deprecated dual overload docs; keep YamlConfig + Gateway `ResponseCacheConfig` support

#### Example
```ts
import { useMeshResponseCache } from '@graphql-mesh/plugin-response-cache'

useMeshResponseCache({
  ...meshPluginOptions,
  ttl: 60_000,
  session: context => context.headers['authorization'],
})
```
