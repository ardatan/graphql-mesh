---
'@graphql-mesh/transform-prefix': minor
'@graphql-mesh/fusion-composition': minor
---

Add optional `force` to prefix protected custom scalars (e.g. from graphql-scalars) that are ignored by default. GraphQL specified scalars stay unprefixed. Aligns v1 `createPrefixTransform` with the legacy transform behavior.
