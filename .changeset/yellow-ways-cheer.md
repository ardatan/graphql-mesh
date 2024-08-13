---
'@graphql-mesh/serve-runtime': minor
---

Polling interval option has been renamed to `pollingInterval`

### Breaking Changes

```diff
import { createServeRuntime } from '@graphql-mesh/serve-runtime'

const runtime = createServeRuntime({
- polling: 10_000
+ pollingInterval: 10_000
})
```
