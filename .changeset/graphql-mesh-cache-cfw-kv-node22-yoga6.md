---
"@graphql-mesh/cache-cfw-kv": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment for Cloudflare KV cache (Node 22+ / GraphQL peer); KV binding API unchanged

#### Example
```ts
import CFWorkerKVCache from '@graphql-mesh/cache-cfw-kv'
const cache = new CFWorkerKVCache({ namespace: env.MESH_KV })
```
