---
"@graphql-mesh/cache-file": minor
"@graphql-mesh/cache-redis": minor
"@graphql-mesh/plugin-response-cache": patch
"@graphql-mesh/types": minor
---

**New Cloudflare KV Cache support!**

Now you can basically use Cloudflare Workers' KV Caching system within Mesh;

```yml
cache:
  cfKv:
    namespace: MESH
```

**Breaking changes for other cache packages**

Now cache implementations should implement `getKeysByPrefix` that returns keys starting with the given prefix.

**Response Cache Plugin Improvements**

Response Cache plugin needs some complicated cache storage. So the relational entries related to specific cached responses and entities are now kept as seperate cache entries. Thanks to new `getKeysByPrefix`, we can now get a response by an entity id for example easier which is more performant.
