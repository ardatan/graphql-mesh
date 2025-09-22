---
'@graphql-mesh/plugin-live-query': patch
'@graphql-mesh/types': patch
---

Support polling in an interval by milliseconds

```yaml
plugins:
  - live-query:
      invalidateByPolling:
        - pollingInterval: 10000 # Polling interval in milliseconds
          invalidate:
            - Query.products
```
