---
'@graphql-mesh/serve-runtime': minor
---

Support Hive's experimental persisted documents

```ts
import { createServeRuntime } from '@graphql-mesh/serve-runtime'

createServeRuntime({
  persistedDocuments: {
    type: 'hive',
    endpoint: 'https://cdn.graphql-hive.com/<target_id>',
    token: '<cdn_access_token>'
  }
})
```
