# @graphql-mesh/fusion-composition

## 0.0.8

### Patch Changes

- [#7185](https://github.com/ardatan/graphql-mesh/pull/7185)
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (from `^10.2.1`, in `dependencies`)
- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)]:
  - @graphql-mesh/utils@0.98.10

## 0.0.7

### Patch Changes

- [#7145](https://github.com/ardatan/graphql-mesh/pull/7145)
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-tools/stitching-directives@^3.0.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitching-directives/v/3.0.2)
    (to `dependencies`)
  - Added dependency
    [`@theguild/federation-composition@^0.11.2` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.11.2)
    (to `dependencies`)

- [#7145](https://github.com/ardatan/graphql-mesh/pull/7145)
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)
  Thanks [@Author](https://github.com/Author), [@User](https://github.com/User)! - New Federation
  Composition Approach for the new Mesh v1 alpha; (If you are using Mesh v0 legacy, ignore this
  changelog)

  Now Mesh Compose produces a superset of Federated Supergraph.

  - Drop any options and implementation related to the old `fusiongraph`
  - - The output is a valid supergraph that can be consumed by any Federation router. But if it is
      not Mesh Serve, the subgraph should still be served via Mesh Serve then consumed by that
      Federation router. If it is Mesh Serve, no additional server is needed because Mesh Serve
      already knows the additional directives etc of the transports
  - Compose the subgraphs using `@theguild/federation-composition` package
  - - So benefit from the validation rules of Federation in Mesh Compose
  - Ability to consume existing federated subgraphs
  - - Since the composition is now Federation, we can accept any federated subgraph
  - Implement Federation transform to transform any subgraph to a federated subgraph by adding
    Federation directives (v2 only) . This is on user's own because they add the directives
    manually. And for `__resolveReference`, we use `@merge` directive to mark a root field as an
    entity resolver for Federation
  - Use additional `@source` directive to consume transforms on the subgraph execution (field
    renames etc)
  - Use additional `@resolveTo` directive to consume additional stitched resolvers
  - Use additional `@transport` directive to choose and configure a specific transport for subgraphs
  - Handle unsupported additional directives with another set of additional directives on `Query`
    for example directives on unions, schema definitions, enum values etc and then
    `@extraUnionDirective` added with missing directives for unions then on the runtime these
    directives are added back to the union for the subgraph execution of the transports.

  Basically Mesh Compose uses Federation spec for composition, validation and runtime BUT the output
  is a superset with these additional directives imported via `@composeDirective`;

  - `@merge` (Taken from Stitching Directives) If a custom entity resolver is defined for a root
    field like below, the gateway will pick it up as an entity resolver;

  ```graphql
  type Query {
     fooById(id: ID!): Foo @merge(keyField: 'id', keyArg: 'id', subgraph: Foo)
  }
  ```

  - `@resolveTo` (Taken from v0) This allows to delegate to a field in any subgraph just like Schema
    Extensions in old Schema Stitching approach;

  ```graphql
      extend type Book {

          @resolveTo(
            sourceName: "authors"
            sourceTypeName: "Query"
            sourceFieldName: "authors"
            keyField: "authorId"
            keysArg: "ids"
          )
      }
  ```

  - `@source` Taken from Fusion This allows us to know how the original definition is in the
    subgraph. If this directive exists, the runtime applies the transforms from Schema Stitching
    during the subgraph execution. This directive can exist in arguments, fields, types etc.

  ```graphql
  type Query {
   @source(type: "MyUser") # This means `User` is actually `MyUser` in the actual subgraph
  }

  type User @source(name: "MyUser") {
    id: ID
    name: String
  }
  ```

  - `@transport` Taken from Fusion This allows us to choose a specific transport (rest, mysql,
    graphql-ws, graphql-http etc) for the subgraph execution with some configuration. In the
    runtime, the gateway loads the transports and passes the subgraph schema with annotations if
    needed to get an executor to execute queries against that subgraph.

  ```graphql
  schema @transport(subgraph: "API", kind: "rest", location: "http://0.0.0.0:<api_port>") {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
  ```

  - `@extraSchemaDefinitionDirective` By default, it is not possible to add directives from subgraph
    to the supergraph but it is possible to do the same thing on types or fields. So we add this
    directive to `Query` for the directives we want to add to the schema. Then the runtime picks
    those per `subgraph` to put the directives back to their original places;

  ```graphql
  type Query @extraSchemaDefinitionDirective(
    directives: {transport: [{subgraph: "petstore", kind: "rest", location: "http://0.0.0.0:<petstore_port>/api/v3"}]}
  )  {
  ```

  - `@extraEnumValueDirective` and `@extraTypeDirective` Same for enum values and unions etc that
    are not supported by the composition library

  > Thanks to these directives, subgraphs can be published individually to Hive for example then the
  > supergraph stored there can be handled by Mesh Gateway since the composition is the same. All
  > the additions etc are done on the subgraph level. For the Fed gateways except Mesh Serve,
  > subgraphs can be served individually by Mesh Serve again while they are consumed by any gw like
  > Apollo Router Shareable is enabled by default for non-federated subgraphs

  Documentation PR has details for users; https://github.com/ardatan/graphql-mesh/pull/7109

- Updated dependencies
  [[`f985978`](https://github.com/ardatan/graphql-mesh/commit/f9859784ad854207e4d32bda11c904b5301610ee),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)]:
  - @graphql-mesh/utils@0.98.9

## 0.0.6

### Patch Changes

- [#7009](https://github.com/ardatan/graphql-mesh/pull/7009)
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/utils@^0.98.6` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.98.6)
    (to `dependencies`)
  - Added dependency
    [`graphql-scalars@^1.23.0` ↗︎](https://www.npmjs.com/package/graphql-scalars/v/1.23.0) (to
    `dependencies`)
  - Added dependency [`minimatch@^9.0.0` ↗︎](https://www.npmjs.com/package/minimatch/v/9.0.0) (to
    `dependencies`)

- [#7009](https://github.com/ardatan/graphql-mesh/pull/7009)
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0)
  Thanks [@ardatan](https://github.com/ardatan)! - Implement declarative transforms

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `Disposable` pattern for plugins and
  transports

- [#7009](https://github.com/ardatan/graphql-mesh/pull/7009)
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0)
  Thanks [@User](https://github.com/User)! - Respect existing transformation done in the given
  subgraph schema

  If the given subgraph has the transformed elements with `@source` directive, then the composition
  should respect it;

  ```graphql
  type Query {
   @source(type: "MyUser") # This means `User` is actually `MyUser` in the actual subgraph
  }

  type User @source(name: "MyUser") {
    id: ID
    name: String
  }
  ```

- Updated dependencies
  [[`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/utils@0.98.8

## 0.0.5

### Patch Changes

- [#7030](https://github.com/ardatan/graphql-mesh/pull/7030)
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.4)
    (from `^10.0.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.1)
    (from `^10.2.0`, in `dependencies`)

## 0.0.4

### Patch Changes

- [`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

## 0.0.3

### Patch Changes

- [#6872](https://github.com/ardatan/graphql-mesh/pull/6872)
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency [`pascal-case@^3.0.0` ↗︎](https://www.npmjs.com/package/pascal-case/v/3.0.0)
    (from `dependencies`)

## 0.0.2

### Patch Changes

- [#6602](https://github.com/ardatan/graphql-mesh/pull/6602)
  [`915b8f8`](https://github.com/ardatan/graphql-mesh/commit/915b8f8e56edc22515ca99e396f1c9d3b4e904b9)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency [`pluralize@^8.0.0` ↗︎](https://www.npmjs.com/package/pluralize/v/8.0.0) (to
    `dependencies`)

- [#6602](https://github.com/ardatan/graphql-mesh/pull/6602)
  [`915b8f8`](https://github.com/ardatan/graphql-mesh/commit/915b8f8e56edc22515ca99e396f1c9d3b4e904b9)
  Thanks [@ardatan](https://github.com/ardatan)! - Support `where.id_in` API (Graph Node subgraphs)

## 0.0.1

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - New Fusion packages
