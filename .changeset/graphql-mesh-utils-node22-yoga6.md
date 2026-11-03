---
"@graphql-mesh/utils": major
---

- Require Node.js `>=22.18.0`
- Remove Mesh `Logger` / `DefaultLogger`, Mesh PubSub implementation, and `PubSub` / `MemPubSub` / `HivePubSub` re-exports
- Remove `handleMaybePromise` / `MaybePromise` / `mapMaybePromise` re-exports (use `@whatwg-node/promise-helpers`)
- Disposable helpers wrap dispose with `fakePromise`
- Node builtins via `globalThis.process?.getBuiltinModule?.('node:…')` instead of `@graphql-mesh/cross-helpers`
- `wrapFetchWithHooks` prefers `context.log` for onFetch payload `log` (not init-time defaults)

