---
'@graphql-mesh/http': patch
---

Destroy Yoga instance when Mesh instance is destroyed so that the plugins and components using [Explicit Resource Management](https://the-guild.dev/graphql/yoga-server/docs/features/explicit-resource-management) will be cleaned up properly
