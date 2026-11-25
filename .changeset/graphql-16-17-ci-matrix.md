---
'@omnigraph/openapi': patch
'@graphql-mesh/fusion-composition': patch
'@graphql-mesh/transport-connect': patch
'@graphql-mesh/transport-sql': patch
'@graphql-mesh/transport-protobuf': patch
'@graphql-mesh/utils': patch
---

CI dual GraphQL 16/17 matrix (`yarn match-graphql`) plus type/runtime shims so Mesh packages keep building and testing against both peer majors. Jest snapshot resolver keeps GraphQL 17 snaps at the historical path and writes sibling `*.gql16.snap` files for print/default diffs.
