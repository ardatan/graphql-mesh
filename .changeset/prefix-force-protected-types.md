---
'@graphql-mesh/transform-prefix': minor
'@graphql-mesh/fusion-composition': patch
---

Add optional `force` to prefix protected custom scalars (e.g. from graphql-scalars) that are ignored by default. GraphQL-specified scalars stay unprefixed.

Also fixes v1 `createPrefixTransform`, which incorrectly prefixed those protected scalars by default. Behavior now matches the legacy transform; use `force` to opt in.
