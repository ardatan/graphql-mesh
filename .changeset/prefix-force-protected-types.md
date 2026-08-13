---
'@graphql-mesh/transform-prefix': minor
'@graphql-mesh/fusion-composition': minor
---

Add optional `force` to prefix protected custom scalars (e.g. from graphql-scalars) that are ignored by default. GraphQL-specified scalars stay unprefixed.

Note: v1 `createPrefixTransform` previously prefixed those protected scalars by default; that was a bug. Aligning with the legacy ignore behavior is a bug fix (not a breaking change). Use `force` to opt in.
