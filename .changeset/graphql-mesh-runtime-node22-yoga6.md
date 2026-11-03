---
"@graphql-mesh/runtime": major
---

- Require Node.js `>=22.18.0`
- Own an `AsyncDisposableStack`; `destroy` / `deferDispose` dispose that stack instead of `pubsub.publish('destroy')`
- Register disposable handlers, transforms, plugins, cache, and pubsub with `disposables.use(...)`
- Context exposes Hive `log` / `pubsub` types
