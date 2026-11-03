---
"@graphql-mesh/migrate-config-cli": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Align with Mesh config / types majors for Node 22+; migration CLI expects the new Hive logger/pubsub typing in generated config

#### Example
```bash
npx @graphql-mesh/migrate-config-cli
# regenerated config imports Logger/PubSub from @graphql-hive/* instead of @graphql-mesh/utils
```
