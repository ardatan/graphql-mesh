
* `url` (type: `String`, required) - URL for the Neo4j Instance e.g. neo4j://localhost
* `username` (type: `String`, required) - Username for basic authentication
* `password` (type: `String`, required) - Password for basic authentication
* `alwaysIncludeRelationships` (type: `Boolean`) - Specifies whether relationships should always be included in the type definitions as [relationship](https://grandstack.io/docs/neo4j-graphql-js.html#relationship-types) types, even if the relationships do not have properties.
* `database` (type: `String`) - Specifies database name
* `typeDefs` (type: `String`) - Provide GraphQL Type Definitions instead of inferring