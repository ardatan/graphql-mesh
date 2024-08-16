---
'@graphql-mesh/serve-cli': minor
---

Support Hive's experimental persisted documents

### Using CLI options

```sh
mesh-serve supergraph [schemaPathOrUrl] --hive-persisted-documents-endpoint "https://cdn.graphql-hive.com/<target_id>" --hive-persisted-documents-token <cdn_access_token>
```

### Using config file

```ts
import { defineConfig } from '@graphql-mesh/serve-cli'

export const serveConfig = defineConfig({
  persistedDocuments: {
    type: 'hive',
    endpoint: 'https://cdn.graphql-hive.com/<target_id>',
    token: '<cdn_access_token>'
  }
})
```
