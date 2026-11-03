---
"@graphql-mesh/compose-cli": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment with Mesh compose / types majors; no compose API shape change beyond shared Node / GraphQL peer requirements

#### Example
```bash
# engines.node must be >=22.18.0 when running mesh compose
mesh compose --output supergraph.graphql
```
