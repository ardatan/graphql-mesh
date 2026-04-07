---
'@graphql-mesh/compose-cli': patch
'@graphql-mesh/fusion-composition': patch
---

Add validation for transforms such as Federation Transform to provide better error messages when the configuration is incorrect. This includes suggestions for field names and argument names when they are not found in the schema. Additionally, improve error messages when applying transforms to subgraphs.

This also adds validation for `@merge` and `@resolveTo` directives to ensure that the referenced fields and arguments exist in the subgraph schemas, providing suggestions when they do not.
