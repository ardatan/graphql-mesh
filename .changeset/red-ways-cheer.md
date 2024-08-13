---
'@graphql-mesh/serve-cli': minor
---

Polling interval option has been renamed to `pollingInterval`

### Breaking Changes

```diff
import { defineConfig } from '@graphql-mesh/serve-cli';

export serveConfig = defineConfig({
- polling: 10_000
+ pollingInterval: 10_000
});
```
