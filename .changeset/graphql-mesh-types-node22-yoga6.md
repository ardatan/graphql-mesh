---
"@graphql-mesh/types": major
---

- Require Node.js `>=22.18.0`
- Remove Mesh `Logger` / `DefaultLogger` / `HivePubSub` types and the Mesh pubsub module; import `Logger` from `@graphql-hive/logger` and `PubSub` from `@graphql-hive/pubsub`
- Do not pass `disposables` into handler / transform / plugin / merger options or `GetMeshSourcePayload`; disposable components implement `[DisposableSymbols]` and `getMesh` registers them with `disposables.use(...)`
- Drop `destroy` pubsub lifecycle typing
- `MeshPluginOptions` no longer includes `log` (use Yoga/Gateway `context.log`)
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
