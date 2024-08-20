---
'@graphql-mesh/types': minor
'@graphql-mesh/plugin-hive': minor
---

Support Hive's experimental persisted documents

```ts
import { useMeshHive } from '@graphql-mesh/plugin-hive'

// Usage Reporting
useMeshHive({
  token: '<hive_registry_token>'
})

// Persisted Documents
useMeshHive({
  experimental__persistedDocuments: {
    cdn: {
      endpoint: 'https://cdn.graphql-hive.com/<target_id>',
      accessToken: '<cdn_access_token>'
    }
  }
})

// Usage Reporting and Persisted Documents
useMeshHive({
  token: '<hive_registry_token>',
  experimental__persistedDocuments: {
    cdn: {
      endpoint: 'https://cdn.graphql-hive.com/<target_id>',
      accessToken: '<cdn_access_token>'
    }
  }
})
```
