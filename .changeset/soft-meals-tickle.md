---
'neo4j-example': minor
---

Fix `BigInt cannot represent X error` when a `BigInt` field is requested in a query by replacing Neo4J's `BigInt` scalar with GraphQL Scalars'.
