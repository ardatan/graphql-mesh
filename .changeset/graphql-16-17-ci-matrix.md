---
'@omnigraph/openapi': patch
'@graphql-mesh/fusion-composition': patch
'@graphql-mesh/transport-connect': patch
'@graphql-mesh/transport-sql': patch
'@graphql-mesh/transport-protobuf': patch
'@graphql-mesh/utils': patch
---

CI dual GraphQL 16/17 matrix (`yarn match-graphql`). Printed-schema Jest snapshots are canonicalized (whitespace / optional commas) so one snap file works on both majors — no per-version snap forks.
