---
"@graphql-mesh/config": major
---

- Require Node.js `>=22.18.0`
- Create shared `AsyncDisposableStack` for Mesh lifecycle; do not inject it into handlers / transforms / mergers / plugins (they expose `[DisposableSymbols]` and are registered via `disposables.use` in `getMesh`)
- Pass optional `log` into plugin factories for init-time diagnostics; request-time logging still prefers Yoga/Gateway `context.log`
- Resolve logger / pubsub from `@graphql-hive/logger` and `@graphql-hive/pubsub`
- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule`
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
