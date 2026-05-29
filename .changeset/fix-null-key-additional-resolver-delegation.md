---
"@graphql-mesh/utils": patch
---

Fix key-based (batch) additional resolvers delegating with a `null` key

A key-based additional resolver (what `mesh-compose` emits for `@resolveTo` /
`BatchResolveTo` with `keyField` + `keysArg`) resolves a relationship field by
looking up the parent's key field in another subgraph. When the parent's key
field value was `null`/`undefined` — a legitimately nullable foreign key — the
in-context SDK's `if (key && argsFromKeys)` gate treated the nullish key as "no
batch" and fell through to the keyless regular delegation path. That emitted an
arg-less query to the source subgraph (no `keysArg` built); if the source
field's argument is optional the subgraph accepted the call and returned its
list (often `[]`), which was then projected onto a singular target field,
surfacing as `Cannot return null for non-nullable field <Type>.<field>.`.

`batchDelegateToSchema` already short-circuits `if (key == null) return null;`,
but the gate diverted nullish keys away before that guard could apply. The
in-context SDK now resolves a nullish key (`key == null`) to `null` before
delegating.
