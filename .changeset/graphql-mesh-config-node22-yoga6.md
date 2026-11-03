---
"@graphql-mesh/config": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Create shared `AsyncDisposableStack` for Mesh lifecycle; do not inject it into handlers / transforms / mergers / plugins (they expose `[DisposableSymbols]` and are registered via `disposables.use` in `getMesh`)
- Pass optional `log` into plugin factories for init-time diagnostics; request-time logging still prefers Yoga/Gateway `context.log`
- Resolve logger / pubsub from `@graphql-hive/logger` and `@graphql-hive/pubsub`
- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule` at call sites

#### Example
```ts
import { findAndParseConfig } from '@graphql-mesh/config'
import { getMesh } from '@graphql-mesh/runtime'

const config = await findAndParseConfig()
// config no longer threads a disposables stack into handler/plugin options
const mesh = await getMesh(config)
await using _ = mesh // AsyncDisposable cleanup
```
