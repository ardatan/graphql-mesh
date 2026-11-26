---
'@graphql-tools/stitch': major
'@graphql-tools/delegate': major
'@graphql-tools/federation': major
'@graphql-mesh/fusion-runtime': major
---

Stitched Query and Mutation execution uses the planned backbone executor (plan once, then dataflow Fetch / Parallel / Sequence / Island / BatchFetch). Resolve-time `mergeFields` / leftover merge plans are no longer the stitched execute path.

Field resolution on this path uses a slim `defaultMergedResolver` (alias / external value + local hydration). `onStitchedSchema` root overrides are planned as Islands.

Subscriptions, `@defer`, `@stream`, and full SDL introspection (`__schema` / `__type`) still use schema execute until those operations are planned end-to-end.

`@pubsubPublish` result handling and the `join__Graph` name map live in fusion-runtime (executor wrap + helpers) instead of mapping Mutation fields after stitch.
