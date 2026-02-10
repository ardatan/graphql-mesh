---
'@graphql-mesh/types': patch
'@graphql-mesh/plugin-hive': patch
---

Destroy Hive client when Mesh instance is destroyed, in Mesh v0, the destroy event is emitted by the Mesh instance's PubSub engine, so we can subscribe to it and dispose the Hive client when the event is emitted. This ensures that any resources used by the Hive client are properly cleaned up when the Mesh instance is destroyed.
