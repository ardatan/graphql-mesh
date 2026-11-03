---
"@graphql-mesh/config": major
---

- Require Node.js `>=22.18.0`
- Create shared `AsyncDisposableStack` and pass `disposables` into handlers / transforms / mergers
- Stop injecting `log` into plugin factories (plugins should use Yoga/Gateway context `log`)
- Resolve logger / pubsub from `@graphql-hive/logger` and `@graphql-hive/pubsub`
- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule`
