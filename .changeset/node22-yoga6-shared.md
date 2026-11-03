---
"@graphql-mesh/types": major
"@graphql-mesh/utils": major
---

Shared platform notes for this major wave (package-specific details/examples remain in each `*-node22-yoga6.md`):

- Require Node.js `>=22.18.0`
- Prefer Yoga/Gateway `context.log` and Hive `@graphql-hive/logger` / `@graphql-hive/pubsub`
- Lifecycle via `AsyncDisposableStack` + `[DisposableSymbols]` / `disposables.use` (do not inject disposables stacks into plugins/caches/handlers)
- Node builtins via `globalThis.process?.getBuiltinModule?.('node:…')` at call sites
- GraphQL peer `^16.0.0 || ^17.0.0` (Yoga 6 / GraphQL Tools utils/schema/merge/executor)
- Promise helpers from `@whatwg-node/promise-helpers` (`fakePromise` / `fakeRejectPromise` / `Promise.withResolvers`)
