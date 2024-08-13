---
'@graphql-mesh/fusion-runtime': minor
---

Polling interval option has been renamed to `pollingInterval`

### Breaking Changes

```diff
import { UnifiedGraphManager } from '@graphql-mesh/fusion-runtime';

const mngr = new UnifiedGraphManager({
- polling: 10_000
+ pollingInterval: 10_000
});
```
