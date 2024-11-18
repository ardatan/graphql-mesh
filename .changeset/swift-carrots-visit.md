---
'@graphql-mesh/cache-cfw-kv': minor
---

Allow KV bindings in ES modules format

The new ES modules format of Cloudflare Workers does not set the bindings in the global scope, instead it sets them inside the `env` argument of the `fetch` handler.

### `wrangler.toml`

These [KV namespaces in `wrangler.toml`](https://developers.cloudflare.com/kv/concepts/kv-namespaces/) would be used as following.

```toml
kv_namespaces = [
  { binding = "MY_KV", id = "<ID>" }
]
```

#### Bindings in ES modules format

```ts
import CloudflareKVCacheStorage from '@graphql-mesh/cache-cfw-kv';

export default {
  async fetch(request, env, ctx) {
    const cache = new CloudflareKVCacheStorage({ namespace: env.MY_KV })
  },
};
```

### Bindings in Service Worker format (legacy)

```ts
import CloudflareKVCacheStorage from '@graphql-mesh/cache-cfw-kv';

addEventListener("fetch", async (event) => {
  const cache = new CloudflareKVCacheStorage({ namespace: 'MY_KV' })
})
```
