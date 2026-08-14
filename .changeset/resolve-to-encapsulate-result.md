---
'@graphql-mesh/utils': patch
---

Fix `@resolveTo` inferring `sourceSelectionSet` from a `result` path when the source field is missing from the gateway schema. Encapsulate (and similar transforms) keep the real source field as an `@inaccessible` copy such as `_encapsulated_<name>_<field>`, which federation then strips from the supergraph. The client selection set is still wrapped with the `result` path instead of crashing on `sourceField.type`.
