# @graphql-mesh/compose-cli

## 0.6.2

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3
  - @graphql-mesh/fusion-composition@0.1.3
  - @graphql-mesh/types@0.99.3

## 0.6.1

### Patch Changes

- Updated dependencies
  [[`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e)]:
  - @graphql-mesh/types@0.99.2
  - @graphql-mesh/utils@0.99.2
  - @graphql-mesh/fusion-composition@0.1.2

## 0.6.0

### Minor Changes

- [#7266](https://github.com/ardatan/graphql-mesh/pull/7266)
  [`26deb92`](https://github.com/ardatan/graphql-mesh/commit/26deb92dc1d405847289bf28344511f143f94ff4)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING: Remove root-level transforms, please
  use source-level transforms instead

### Patch Changes

- [#7272](https://github.com/ardatan/graphql-mesh/pull/7272)
  [`a486cab`](https://github.com/ardatan/graphql-mesh/commit/a486cab84e757b47f2a07240508d6d586e5abfdd)
  Thanks [@beeequeue](https://github.com/beeequeue)! - `loadGraphQLHTTPSubgraph`: Added
  `schemaHeaders` to introspection requests

- [#7253](https://github.com/ardatan/graphql-mesh/pull/7253)
  [`2b8e52f`](https://github.com/ardatan/graphql-mesh/commit/2b8e52fdc40e8a0aa7c48ffb92de1b29b90b3c4e)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the bug; When a non-nullable field is added
  through `additionalTypeDefs` in the compose config, then the gateway fails to resolve it even if a
  resolver defined in `additionalResolvers`;

  ```ts
  export const composeConfig = defineComposeConfig({
    subgraphs: [
      {
        sourceHandler: loadOpenAPISubgraph('Wiki', {
          source: 'https://wikimedia.org/api/rest_v1/?spec',
          endpoint: 'https://wikimedia.org/api/rest_v1'
        })
      }
    ],
    additionalTypeDefs: /* GraphQL */ `
      extend type pageview_project {
        banana: String
        apple: String!
      }
    `
  })

  export const serveConfig = defineServeConfig({
    additionalResolvers: {
      pageview_project: {
        banana() {
          return '🍌'
        },
        apple() {
          return '🍎' // This is ignored
        }
      }
    }
  })
  ```

- [`ae8dbdc`](https://github.com/ardatan/graphql-mesh/commit/ae8dbdcf43ee0fdfdd93100c0759bee010c506c3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Reject config files that import modules which
  are missing

- Updated dependencies
  [[`e3714fb`](https://github.com/ardatan/graphql-mesh/commit/e3714fb2e91309e515e9c09a7b1c3c15b17fff3d),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)]:
  - @graphql-mesh/fusion-composition@0.1.1
  - @graphql-mesh/types@0.99.1
  - @graphql-mesh/utils@0.99.1

## 0.5.0

### Minor Changes

- [#7257](https://github.com/ardatan/graphql-mesh/pull/7257)
  [`798ed17`](https://github.com/ardatan/graphql-mesh/commit/798ed17c8e00b199596d9f9c35863c815bf4e151)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Support mesh.config.ts or mesh.config.mts or
  mesh.config.cts or mesh.config.js or mesh.config.mjs or mesh.config.cjs configuration files

- [#7261](https://github.com/ardatan/graphql-mesh/pull/7261)
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Use jiti instead of tsx for importig config
  files

### Patch Changes

- [#7261](https://github.com/ardatan/graphql-mesh/pull/7261)
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Added dependency [`jiti@^1.21.6` ↗︎](https://www.npmjs.com/package/jiti/v/1.21.6) (to
    `dependencies`)
  - Removed dependency [`tsx@^4.7.1` ↗︎](https://www.npmjs.com/package/tsx/v/4.7.1) (from
    `dependencies`)
- Updated dependencies
  [[`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2),
  [`94245c7`](https://github.com/ardatan/graphql-mesh/commit/94245c708850ce643e395ea559b65d4897f05936),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00)]:
  - @graphql-mesh/fusion-composition@0.1.0
  - @graphql-mesh/utils@0.99.0
  - @graphql-mesh/types@0.99.0

## 0.4.2

### Patch Changes

- [#7185](https://github.com/ardatan/graphql-mesh/pull/7185)
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (from `^10.2.1`, in `dependencies`)
- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)]:
  - @graphql-mesh/fusion-composition@0.0.8
  - @graphql-mesh/types@0.98.10
  - @graphql-mesh/utils@0.98.10

## 0.4.1

### Patch Changes

- [#7145](https://github.com/ardatan/graphql-mesh/pull/7145)
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-tools/schema@^10.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.4)
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
  [[`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae),
  [`f985978`](https://github.com/ardatan/graphql-mesh/commit/f9859784ad854207e4d32bda11c904b5301610ee),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)]:
  - @graphql-mesh/fusion-composition@0.0.7
  - @graphql-mesh/utils@0.98.9
  - @graphql-mesh/types@0.98.9

## 0.4.0

### Minor Changes

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - Use ESM instead of CommonJS in CLI

### Patch Changes

- Updated dependencies
  [[`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`4c75671`](https://github.com/ardatan/graphql-mesh/commit/4c756717247eb0a8f3431e31e6c86fc97297bd32),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/fusion-composition@0.0.6
  - @graphql-mesh/utils@0.98.8
  - @graphql-mesh/types@0.98.8

## 0.3.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.98.7
  - @graphql-mesh/utils@0.98.7

## 0.3.6

### Patch Changes

- [#7030](https://github.com/ardatan/graphql-mesh/pull/7030)
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.1)
    (from `^10.2.0`, in `dependencies`)
- Updated dependencies
  [[`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/fusion-composition@0.0.5
  - @graphql-mesh/types@0.98.6
  - @graphql-mesh/utils@0.98.6

## 0.3.5

### Patch Changes

- Updated dependencies
  [[`c4d2249`](https://github.com/ardatan/graphql-mesh/commit/c4d22497b4249f9a0969e1d01efbe0721774ce73)]:
  - @graphql-mesh/utils@0.98.5
  - @graphql-mesh/types@0.98.5

## 0.3.4

### Patch Changes

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @graphql-mesh/types@0.98.4
  - @graphql-mesh/utils@0.98.4

## 0.3.3

### Patch Changes

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @graphql-mesh/types@0.98.3
  - @graphql-mesh/utils@0.98.3

## 0.3.2

### Patch Changes

- [`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/fusion-composition@0.0.4
  - @graphql-mesh/types@0.98.2
  - @graphql-mesh/utils@0.98.2

## 0.3.1

### Patch Changes

- Updated dependencies
  [[`6044b7f`](https://github.com/ardatan/graphql-mesh/commit/6044b7f8bd72ee3d4460d9f09f303ea6fc4e007b)]:
  - @graphql-mesh/types@0.98.1
  - @graphql-mesh/utils@0.98.1

## 0.3.0

### Minor Changes

- [#6862](https://github.com/ardatan/graphql-mesh/pull/6862)
  [`31828ad`](https://github.com/ardatan/graphql-mesh/commit/31828ad87a0c4d616f1217282bd1e7e74324fd9c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Better CLI, supporting arguments and adding
  help in the shell

- [#6862](https://github.com/ardatan/graphql-mesh/pull/6862)
  [`31828ad`](https://github.com/ardatan/graphql-mesh/commit/31828ad87a0c4d616f1217282bd1e7e74324fd9c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Rename `target` option to `output` in order
  to be more clear that it's the output file.

  ```diff
  import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
  import { defineConfig } from '@graphql-mesh/compose-cli';

  export const composeConfig = defineConfig({
  - target: 'fusiongraph.graphql',
  + output: 'fusiongraph.graphql',
    subgraphs: [
      {
        sourceHandler: () => ({
          name: 'helloworld',
          schema$: new GraphQLSchema({
            query: new GraphQLObjectType({
              name: 'Query',
              fields: {
                hello: {
                  type: GraphQLString,
                  resolve: () => 'world',
                },
              },
            }),
          }),
        }),
      },
    ],
  });
  ```

- [#6779](https://github.com/ardatan/graphql-mesh/pull/6779)
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - use tsx node loader instead of ts-node

- [#6862](https://github.com/ardatan/graphql-mesh/pull/6862)
  [`31828ad`](https://github.com/ardatan/graphql-mesh/commit/31828ad87a0c4d616f1217282bd1e7e74324fd9c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Rename `runComposeCLI` to just `run` and
  change the supported options

- [#6779](https://github.com/ardatan/graphql-mesh/pull/6779)
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - write composed schema to stdout by default
  when no target is specified

### Patch Changes

- [#6779](https://github.com/ardatan/graphql-mesh/pull/6779)
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency [`tsx@^4.7.1` ↗︎](https://www.npmjs.com/package/tsx/v/4.7.1) (to
    `dependencies`)
  - Removed dependency [`ts-node@^10.9.2` ↗︎](https://www.npmjs.com/package/ts-node/v/10.9.2) (from
    `dependencies`)

- [#6862](https://github.com/ardatan/graphql-mesh/pull/6862)
  [`31828ad`](https://github.com/ardatan/graphql-mesh/commit/31828ad87a0c4d616f1217282bd1e7e74324fd9c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency
    [`@commander-js/extra-typings@^12.0.1` ↗︎](https://www.npmjs.com/package/@commander-js/extra-typings/v/12.0.1)
    (to `dependencies`)
  - Added dependency [`commander@^12.0.0` ↗︎](https://www.npmjs.com/package/commander/v/12.0.0) (to
    `dependencies`)
  - Removed dependency [`spinnies@^0.5.1` ↗︎](https://www.npmjs.com/package/spinnies/v/0.5.1) (from
    `dependencies`)

- [#6779](https://github.com/ardatan/graphql-mesh/pull/6779)
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - fix writing to json target

- [#6779](https://github.com/ardatan/graphql-mesh/pull/6779)
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Use target's absolute path if detected

- Updated dependencies
  [[`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)]:
  - @graphql-mesh/fusion-composition@0.0.3
  - @graphql-mesh/types@0.98.0
  - @graphql-mesh/utils@0.98.0

## 0.2.5

### Patch Changes

- Updated dependencies
  [[`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)]:
  - @graphql-mesh/types@0.97.5
  - @graphql-mesh/utils@0.97.5

## 0.2.4

### Patch Changes

- Updated dependencies
  [[`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)]:
  - @graphql-mesh/utils@0.97.4
  - @graphql-mesh/types@0.97.4

## 0.2.3

### Patch Changes

- Updated dependencies
  [[`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)]:
  - @graphql-mesh/types@0.97.3
  - @graphql-mesh/utils@0.97.3

## 0.2.2

### Patch Changes

- Updated dependencies
  [[`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)]:
  - @graphql-mesh/types@0.97.2
  - @graphql-mesh/utils@0.97.2

## 0.2.1

### Patch Changes

- [#6602](https://github.com/ardatan/graphql-mesh/pull/6602)
  [`915b8f8`](https://github.com/ardatan/graphql-mesh/commit/915b8f8e56edc22515ca99e396f1c9d3b4e904b9)
  Thanks [@ardatan](https://github.com/ardatan)! - Customizations

- Updated dependencies
  [[`915b8f8`](https://github.com/ardatan/graphql-mesh/commit/915b8f8e56edc22515ca99e396f1c9d3b4e904b9),
  [`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020),
  [`915b8f8`](https://github.com/ardatan/graphql-mesh/commit/915b8f8e56edc22515ca99e396f1c9d3b4e904b9)]:
  - @graphql-mesh/fusion-composition@0.0.2
  - @graphql-mesh/types@0.97.1
  - @graphql-mesh/utils@0.97.1

## 0.2.0

### Patch Changes

- [#6592](https://github.com/ardatan/graphql-mesh/pull/6592)
  [`ef370cf`](https://github.com/ardatan/graphql-mesh/commit/ef370cf676ab812a89627b5320c8d9ad383894a8)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/graphql-file-loader@8.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/graphql-file-loader/v/8.0.1)
    (from `8.0.0`, in `dependencies`)

- [`fd25b34`](https://github.com/ardatan/graphql-mesh/commit/fd25b347407251cbe702d20508561964058d9230)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Config file name env var should be
  MESH_COMPOSE_CONFIG_FILE_NAME

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a),
  [`70b05a2`](https://github.com/ardatan/graphql-mesh/commit/70b05a20a948b5ebed5306c14710c8839225cdad)]:
  - @graphql-mesh/types@0.97.0
  - @graphql-mesh/utils@0.97.0

## 0.1.1

### Patch Changes

- Updated dependencies
  [[`0f274ef`](https://github.com/ardatan/graphql-mesh/commit/0f274ef8177068da65e50e08607998d0ed63e8b9)]:
  - @graphql-mesh/utils@0.96.6
  - @graphql-mesh/types@0.96.6

## 0.1.0

### Minor Changes

- [`7b494d9`](https://github.com/ardatan/graphql-mesh/commit/7b494d981862034f256225e2c9a5c43a403ff79d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Improve typings and other accompanying
  improvements

## 0.0.2

### Patch Changes

- Updated dependencies
  [[`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)]:
  - @graphql-mesh/types@0.96.5
  - @graphql-mesh/utils@0.96.5

## 0.0.1

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - New Fusion packages

- Updated dependencies
  [[`ae7b085`](https://github.com/ardatan/graphql-mesh/commit/ae7b085e93ba911f03bbfd2a15ff9ca8be9f4de8),
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)]:
  - @graphql-mesh/types@0.96.4
  - @graphql-mesh/fusion-composition@0.0.1
  - @graphql-mesh/utils@0.96.4
