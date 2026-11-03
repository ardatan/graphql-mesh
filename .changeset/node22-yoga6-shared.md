---
"@graphql-mesh/types": major
"@graphql-mesh/utils": major
---

Shared platform notes for this major wave. Package-specific migration notes and use-case examples live in each `*-node22-yoga6.md`.

- Require Node.js `>=22.18.0` (18 / 20 dropped)
- `peerDependencies.graphql` is `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
- Prefer Yoga / Hive Gateway `context.log` and `@graphql-hive/logger` / `@graphql-hive/pubsub` (Mesh Logger / PubSub re-exports removed)
- Lifecycle via `AsyncDisposableStack` + `[DisposableSymbols]` / `disposables.use(...)` — do not inject disposables stacks into plugins / caches / handlers
- Node builtins via `globalThis.process?.getBuiltinModule?.('node:…')` at call sites (`@graphql-mesh/cross-helpers` removed)
- Promise helpers from `@whatwg-node/promise-helpers` (`fakePromise` / `fakeRejectPromise` / `Promise.withResolvers`)
