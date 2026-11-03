---
"@graphql-mesh/transform-prune": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Align with Mesh types / utils majors (Hive logger-pubsub option typing, no Mesh destroy pubsub, no injected `disposables`)

#### Example
```yaml
transforms:
  - prune: {}
```
