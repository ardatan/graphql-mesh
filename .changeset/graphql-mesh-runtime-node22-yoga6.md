---
"@graphql-mesh/runtime": major
---

- Require Node.js `>=22.18.0`
- Own an `AsyncDisposableStack`; `destroy` / `deferDispose` dispose that stack instead of `pubsub.publish('destroy')`
- Register disposable handlers, transforms, plugins, cache, and pubsub with `disposables.use(...)`
- Context exposes Hive `log` / `pubsub` types
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
- Mesh instance exposes `[DisposableSymbols.asyncDispose]` directly (no `makeAsyncDisposable` wrapper)
