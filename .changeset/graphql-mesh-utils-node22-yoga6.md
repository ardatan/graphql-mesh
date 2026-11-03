---
"@graphql-mesh/utils": major
---

- Require Node.js `>=22.18.0`
- Remove Mesh `Logger` / `DefaultLogger`, Mesh PubSub implementation, and `PubSub` / `MemPubSub` / `HivePubSub` re-exports
- Remove `handleMaybePromise` / `MaybePromise` / `mapMaybePromise` re-exports (use `@whatwg-node/promise-helpers`)
- Disposable helpers: keep `isDisposable` / `dispose` / `makeAsyncDisposable`; drop unused `createDisposable` / `createAsyncDisposable` / `makeDisposable`
- Node builtins via `globalThis.process?.getBuiltinModule?.('node:…')` instead of `@graphql-mesh/cross-helpers`
- `wrapFetchWithHooks` no longer accepts a default logger argument; onFetch `log` comes from `context.log` (fallback Hive `Logger`)
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
