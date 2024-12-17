---
'@graphql-mesh/plugin-http-cache': patch
---

Relax the typings so the plugin can be used as `GatewayPlugin`.

The pointed line was previously failing because `ctx` is `GatewayConfigContext` which has `config` etc as optional,
but the old type of the plugin options was `MeshPluginOptions` which expects `cache`, `pubsub` etc and more things that are not available in `GatewayConfigContext`.

```ts
import { defineConfig, useHttpCache } from '@graphql-hive/gateway';

export const gatewayConfig = defineConfig({
  plugins: ctx => [
    useHttpCache({
      ...ctx, // This was failing
    })
  ]
})

```
