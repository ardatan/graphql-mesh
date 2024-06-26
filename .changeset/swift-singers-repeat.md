---
'@omnigraph/json-schema': patch
'@graphql-mesh/fusion-composition': patch
'@graphql-mesh/plugin-rate-limit': patch
'@graphql-mesh/transport-thrift': patch
'@graphql-mesh/transport-neo4j': patch
'@omnigraph/openapi': patch
'@graphql-mesh/transport-soap': patch
'@graphql-mesh/fusion-runtime': patch
'@graphql-mesh/runtime': patch
'@omnigraph/thrift': patch
'@omnigraph/mysql': patch
'@omnigraph/neo4j': patch
'@graphql-mesh/serve-runtime': patch
'@graphql-mesh/utils': patch
'@omnigraph/raml': patch
'@graphql-mesh/compose-cli': patch
'@graphql-mesh/serve-cli': patch
---

New Federation Composition Approach for the new Mesh v1 alpha;
(If you are using Mesh v0 legacy, ignore this changelog)

Now Mesh Compose produces a superset of Federated Supergraph.

- Drop any options and implementation related to the old `fusiongraph`
- - The output is a valid supergraph that can be consumed by any Federation router. But if it is not Mesh Serve, the subgraph should still be served via Mesh Serve then consumed by that Federation router. If it is Mesh Serve, no additional server is needed because Mesh Serve already knows the additional directives etc of the transports
- Compose the subgraphs using `@theguild/federation-composition` package
- - So benefit from the validation rules of Federation in Mesh Compose
- Ability to consume existing federated subgraphs
- - Since the composition is now Federation, we can accept any federated subgraph
- Implement Federation transform to transform any subgraph to a federated subgraph by adding Federation directives (v2 only) . This is on user's own because they add the directives manually. And for `__resolveReference`, we use `@merge` directive to mark a root field as an entity resolver for Federation
- Use additional `@source` directive to consume transforms on the subgraph execution (field renames etc)
- Use additional `@resolveTo` directive to consume additional stitched resolvers
- Use additional `@transport` directive to choose and configure a specific transport for subgraphs
- Handle unsupported additional directives with another set of additional directives on `Query` for example directives on unions, schema definitions, enum values etc and then `@extraUnionDirective` added with missing directives for unions then on the runtime these directives are added back to the union for the subgraph execution of the transports.

Basically Mesh Compose uses Federation spec for composition, validation and runtime BUT the output is a superset with these additional directives imported via `@composeDirective`;

- `@merge` (Taken from Stitching Directives)
If a custom entity resolver is defined for a root field like below, the gateway will pick it up as an entity resolver;
```graphql
type Query {
   fooById(id: ID!): Foo @merge(keyField: 'id', keyArg: 'id', subgraph: Foo)
}
```

- `@resolveTo` (Taken from v0)
This allows to delegate to a field in any subgraph just like Schema Extensions in old Schema Stitching approach;
```graphql
    extend type Book {
      author: Author
        @resolveTo(
          sourceName: "authors"
          sourceTypeName: "Query"
          sourceFieldName: "authors"
          keyField: "authorId"
          keysArg: "ids"
        )
    }
```

- `@source` Taken from Fusion
This allows us to know how the original definition is in the subgraph. If this directive exists, the runtime applies the transforms from Schema Stitching during the subgraph execution.
This directive can exist in arguments, fields, types etc.

```graphql
type Query {
  user: User @source(type: "MyUser") # This means `User` is actually `MyUser` in the actual subgraph
}

type User @source(name: "MyUser") {
  id: ID
  name: String
}
```

- `@transport` Taken from Fusion
This allows us to choose a specific transport (rest, mysql, graphql-ws, graphql-http etc) for the subgraph execution with some configuration. In the runtime, the gateway loads the transports and passes the subgraph schema with annotations if needed to get an executor to execute queries against that subgraph.

```graphql
schema @transport(subgraph: "API", kind: "rest", location: "http://0.0.0.0:<api_port>") {
  query: Query
  mutation: Mutation
  subscription: Subscription
}
```

- `@extraSchemaDefinitionDirective`
By default, it is not possible to add directives from subgraph to the supergraph but it is possible to do the same thing on types or fields. So we add this directive to `Query` for the directives we want to add to the schema. Then the runtime picks those per `subgraph` to put the directives back to their original places;
```graphql
type Query @extraSchemaDefinitionDirective(
  directives: {transport: [{subgraph: "petstore", kind: "rest", location: "http://0.0.0.0:<petstore_port>/api/v3"}]}
)  {
```

- `@extraEnumValueDirective` and `@extraTypeDirective`
Same for enum values and unions etc that are not supported by the composition library

> Thanks to these directives, subgraphs can be published individually to Hive for example then the supergraph stored there can be handled by Mesh Gateway since the composition is the same. All the additions etc are done on the subgraph level.
> For the Fed gateways except Mesh Serve, subgraphs can be served individually by Mesh Serve again while they are consumed by any gw like Apollo Router
> Shareable is enabled by default for non-federated subgraphs

Documentation PR has details for users;
https://github.com/ardatan/graphql-mesh/pull/7109
