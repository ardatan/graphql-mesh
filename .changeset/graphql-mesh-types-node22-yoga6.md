---
"@graphql-mesh/types": major
---

- Require Node.js `>=22.18.0`
- Remove Mesh `Logger` / `DefaultLogger` / `HivePubSub` types and the Mesh pubsub module; import `Logger` from `@graphql-hive/logger` and `PubSub` from `@graphql-hive/pubsub`
- Add optional `disposables?: AsyncDisposableStack` to handler / transform / plugin / merger option types and `GetMeshSourcePayload`
- Drop `destroy` pubsub lifecycle typing
- `MeshPluginOptions` no longer includes `log` (use Yoga/Gateway `context.log`)
