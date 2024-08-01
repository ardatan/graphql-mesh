# @graphql-mesh/serve-cli

## 0.8.9

### Patch Changes

- [#7427](https://github.com/ardatan/graphql-mesh/pull/7427)
  [`8be81d2`](https://github.com/ardatan/graphql-mesh/commit/8be81d25aac222f37ba7bc44592c39b0f53ace95)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/include@^0.0.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/include/v/0.0.0)
    (to `dependencies`)
  - Removed dependency [`jiti@^1.21.6` ↗︎](https://www.npmjs.com/package/jiti/v/1.21.6) (from
    `dependencies`)

- [#7427](https://github.com/ardatan/graphql-mesh/pull/7427)
  [`8be81d2`](https://github.com/ardatan/graphql-mesh/commit/8be81d25aac222f37ba7bc44592c39b0f53ace95)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Resolve tsconfig paths when importing config
  files

- Updated dependencies
  [[`6fc03b6`](https://github.com/ardatan/graphql-mesh/commit/6fc03b6f138ebc81a477fbf0c222ab6e1d882497),
  [`6fc03b6`](https://github.com/ardatan/graphql-mesh/commit/6fc03b6f138ebc81a477fbf0c222ab6e1d882497),
  [`8be81d2`](https://github.com/ardatan/graphql-mesh/commit/8be81d25aac222f37ba7bc44592c39b0f53ace95)]:
  - @graphql-mesh/serve-runtime@0.5.9
  - @graphql-mesh/include@0.0.1

## 0.8.8

### Patch Changes

- Updated dependencies
  [[`7cd4d35`](https://github.com/ardatan/graphql-mesh/commit/7cd4d35100489550cef5815acd424ad85a71ec27)]:
  - @graphql-mesh/serve-runtime@0.5.8

## 0.8.7

### Patch Changes

- [#7192](https://github.com/ardatan/graphql-mesh/pull/7192)
  [`1905f53`](https://github.com/ardatan/graphql-mesh/commit/1905f53a65e6c73d1d305770dcfc4cba34798a09)
  Thanks [@ardatan](https://github.com/ardatan)! - Serve subgraph as a Federation compatible
  subgraph service

- Updated dependencies
  [[`1905f53`](https://github.com/ardatan/graphql-mesh/commit/1905f53a65e6c73d1d305770dcfc4cba34798a09)]:
  - @graphql-mesh/serve-runtime@0.5.7

## 0.8.6

### Patch Changes

- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4),
  [`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/serve-runtime@0.5.6
  - @graphql-mesh/utils@0.99.5
  - @graphql-mesh/types@0.99.5

## 0.8.5

### Patch Changes

- [`3920b8b`](https://github.com/ardatan/graphql-mesh/commit/3920b8bc029bcffedcbd9b12fd2b46edcb380f18)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Trigger release of Docker Image

## 0.8.4

### Patch Changes

- Updated dependencies
  [[`ec31e60`](https://github.com/ardatan/graphql-mesh/commit/ec31e608c271f14554fcef5519a12c4366e87f38),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)]:
  - @graphql-mesh/serve-runtime@0.5.5
  - @graphql-mesh/utils@0.99.4
  - @graphql-mesh/types@0.99.4

## 0.8.3

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3
  - @graphql-mesh/serve-runtime@0.5.4
  - @graphql-mesh/types@0.99.3

## 0.8.2

### Patch Changes

- Updated dependencies
  [[`f47c900`](https://github.com/ardatan/graphql-mesh/commit/f47c900d19e8c634d39e9dd90bfb1acc4f892a1f)]:
  - @graphql-mesh/serve-runtime@0.5.3

## 0.8.1

### Patch Changes

- [#7327](https://github.com/ardatan/graphql-mesh/pull/7327)
  [`cfe779a`](https://github.com/ardatan/graphql-mesh/commit/cfe779a55421ee1064c6778db760bdef8ffb2d3b)
  Thanks [@ardatan](https://github.com/ardatan)! - Add \`--version\` param to Serve CLI to print the
  version

  Additionally, the version will be available in `globalThis.__VERSION__` during the CLI's runtime.

- [#7333](https://github.com/ardatan/graphql-mesh/pull/7333)
  [`bfaeffa`](https://github.com/ardatan/graphql-mesh/commit/bfaeffa9881f3bf7faac07ecc39667793f347b83)
  Thanks [@ardatan](https://github.com/ardatan)! - Ability to configure max header size if you get
  431 with headers payload longer than 16kb which is default value for Node.js
- Updated dependencies
  [[`9f6624e`](https://github.com/ardatan/graphql-mesh/commit/9f6624e327a555b3de201e67ca9f5dabca44e238),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730)]:
  - @graphql-mesh/serve-runtime@0.5.2
  - @graphql-mesh/types@0.99.2
  - @graphql-mesh/utils@0.99.2

## 0.8.0

### Minor Changes

- [`7594f4b`](https://github.com/ardatan/graphql-mesh/commit/7594f4b87dbc75e0f9d7ac3bb1bf68e3bb598561)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Change port using PORT env var

- [#7317](https://github.com/ardatan/graphql-mesh/pull/7317)
  [`8978498`](https://github.com/ardatan/graphql-mesh/commit/8978498a16d6632f3bbe87148f0e8cd3d876e9a8)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Add CLI arguments for polling and error
  masking

  The usage of arguments is as follows:

  ```
  Usage: mesh-serve [options]

  Options:
    --polling <intervalInMs>  schema polling interval in milliseconds (env: POLLING)
    --masked-errors           mask unexpected errors in responses (default: true)
    --no-masked-errors        don't mask unexpected errors in responses
  ```

### Patch Changes

- [`ae8dbdc`](https://github.com/ardatan/graphql-mesh/commit/ae8dbdcf43ee0fdfdd93100c0759bee010c506c3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Reject config files that import modules which
  are missing

- [`ded0714`](https://github.com/ardatan/graphql-mesh/commit/ded07148cbab19121b608b77c42263f5baeed069)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Attempt watch only if supergraph is a path to
  a file

- Updated dependencies
  [[`db05fc3`](https://github.com/ardatan/graphql-mesh/commit/db05fc3d3205ac8e2730099cf453a7a113a5d770),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`db05fc3`](https://github.com/ardatan/graphql-mesh/commit/db05fc3d3205ac8e2730099cf453a7a113a5d770)]:
  - @graphql-mesh/serve-runtime@0.5.1
  - @graphql-mesh/types@0.99.1
  - @graphql-mesh/utils@0.99.1

## 0.7.0

### Minor Changes

- [#7207](https://github.com/ardatan/graphql-mesh/pull/7207)
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Support WebSocket connections

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
  [[`27e3cc9`](https://github.com/ardatan/graphql-mesh/commit/27e3cc97c1218863cf2948902bdca050bd71d18a),
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2),
  [`26549a9`](https://github.com/ardatan/graphql-mesh/commit/26549a9832b4e18afdb22e4615a9951d69a5922b),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`7b35444`](https://github.com/ardatan/graphql-mesh/commit/7b35444dcc15c6d22eb1b26c080c7b78ee8aef8e),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`a2306d2`](https://github.com/ardatan/graphql-mesh/commit/a2306d2c53c9d3cf071aec6e550dc5fff976bfb2),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`eefbfbe`](https://github.com/ardatan/graphql-mesh/commit/eefbfbe94d72fa6f5cf60a8cf363cae039aece89),
  [`de7517e`](https://github.com/ardatan/graphql-mesh/commit/de7517e653babaeabbd80a941a0210c491601725)]:
  - @graphql-mesh/serve-runtime@0.5.0
  - @graphql-mesh/utils@0.99.0
  - @graphql-mesh/types@0.99.0

## 0.6.4

### Patch Changes

- [#7185](https://github.com/ardatan/graphql-mesh/pull/7185)
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (from `^10.2.1`, in `dependencies`)

- [#7173](https://github.com/ardatan/graphql-mesh/pull/7173)
  [`25fd39a`](https://github.com/ardatan/graphql-mesh/commit/25fd39abc37fdad867707073604150b40eace062)
  Thanks [@ardatan](https://github.com/ardatan)! - Change the default behavior of Serve Runtime

  If no `supergraph` or `hive` or `proxy` is provided

  - If `HIVE_CDN_ENDPOINT` and `HIVE_CDN_TOKEN` are provided, use them to fetch the supergraph from
    the Hive CDN
  - If not, check for a local supergraph file at `./supergraph.graphql`

- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`28961ed`](https://github.com/ardatan/graphql-mesh/commit/28961edfb6b4ef998fff1af6759c892c3481ba7a),
  [`25fd39a`](https://github.com/ardatan/graphql-mesh/commit/25fd39abc37fdad867707073604150b40eace062),
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)]:
  - @graphql-mesh/cross-helpers@0.4.4
  - @graphql-mesh/serve-runtime@0.4.4
  - @graphql-mesh/types@0.98.10
  - @graphql-mesh/utils@0.98.10

## 0.6.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.4.3

## 0.6.2

### Patch Changes

- Updated dependencies
  [[`141c3a6`](https://github.com/ardatan/graphql-mesh/commit/141c3a6664afdbe4202986cdc06f5fe018d5863a)]:
  - @graphql-mesh/serve-runtime@0.4.2

## 0.6.1

### Patch Changes

- Updated dependencies
  [[`d68c464`](https://github.com/ardatan/graphql-mesh/commit/d68c4642c9993c37a48004fc0d1f0574f557ca43)]:
  - @graphql-mesh/serve-runtime@0.4.1

## 0.6.0

### Patch Changes

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
  - @graphql-mesh/serve-runtime@0.4.0
  - @graphql-mesh/utils@0.98.9
  - @graphql-mesh/types@0.98.9

## 0.5.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.3.12

## 0.5.0

### Minor Changes

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - Use ESM instead of CommonJS in CLI

### Patch Changes

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Removed dependency
    [`uWebSockets.js@uNetworking/uWebSockets.js#semver:^20` ↗︎](https://www.npmjs.com/package/uWebSockets.js/v/20.0.0)
    (from `dependencies`)

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `Disposable` pattern for plugins and
  transports

- Updated dependencies
  [[`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`4c75671`](https://github.com/ardatan/graphql-mesh/commit/4c756717247eb0a8f3431e31e6c86fc97297bd32),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/serve-runtime@0.3.11
  - @graphql-mesh/utils@0.98.8
  - @graphql-mesh/types@0.98.8

## 0.4.10

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.98.7
  - @graphql-mesh/utils@0.98.7
  - @graphql-mesh/serve-runtime@0.3.10

## 0.4.9

### Patch Changes

- Updated dependencies
  [[`56f5449`](https://github.com/ardatan/graphql-mesh/commit/56f54491e0770ca9621120c202201fd7ef3fd3fe)]:
  - @graphql-mesh/serve-runtime@0.3.9

## 0.4.8

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
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/cross-helpers@0.4.3
  - @graphql-mesh/serve-runtime@0.3.8
  - @graphql-mesh/types@0.98.6
  - @graphql-mesh/utils@0.98.6

## 0.4.7

### Patch Changes

- [#6936](https://github.com/ardatan/graphql-mesh/pull/6936)
  [`c4d2249`](https://github.com/ardatan/graphql-mesh/commit/c4d22497b4249f9a0969e1d01efbe0721774ce73)
  Thanks [@ardatan](https://github.com/ardatan)! - Fallback to node:http when uWebSockets.js is not
  available

- Updated dependencies
  [[`c4d2249`](https://github.com/ardatan/graphql-mesh/commit/c4d22497b4249f9a0969e1d01efbe0721774ce73)]:
  - @graphql-mesh/utils@0.98.5
  - @graphql-mesh/serve-runtime@0.3.7
  - @graphql-mesh/types@0.98.5

## 0.4.6

### Patch Changes

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @graphql-mesh/serve-runtime@0.3.6
  - @graphql-mesh/types@0.98.4
  - @graphql-mesh/utils@0.98.4

## 0.4.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.3.5

## 0.4.4

### Patch Changes

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @graphql-mesh/serve-runtime@0.3.4
  - @graphql-mesh/types@0.98.3
  - @graphql-mesh/utils@0.98.3

## 0.4.3

### Patch Changes

- Updated dependencies
  [[`da798ac`](https://github.com/ardatan/graphql-mesh/commit/da798acf85cf7da8cd45609725dde751b4ef24a3),
  [`da798ac`](https://github.com/ardatan/graphql-mesh/commit/da798acf85cf7da8cd45609725dde751b4ef24a3)]:
  - @graphql-mesh/serve-runtime@0.3.3

## 0.4.2

### Patch Changes

- [`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/cross-helpers@0.4.2
  - @graphql-mesh/serve-runtime@0.3.2
  - @graphql-mesh/types@0.98.2
  - @graphql-mesh/utils@0.98.2

## 0.4.1

### Patch Changes

- Updated dependencies
  [[`6044b7f`](https://github.com/ardatan/graphql-mesh/commit/6044b7f8bd72ee3d4460d9f09f303ea6fc4e007b)]:
  - @graphql-mesh/types@0.98.1
  - @graphql-mesh/utils@0.98.1
  - @graphql-mesh/serve-runtime@0.3.1

## 0.4.0

### Minor Changes

- [#6779](https://github.com/ardatan/graphql-mesh/pull/6779)
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - use tsx node loader instead of ts-node

- [#6862](https://github.com/ardatan/graphql-mesh/pull/6862)
  [`31828ad`](https://github.com/ardatan/graphql-mesh/commit/31828ad87a0c4d616f1217282bd1e7e74324fd9c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Better CLI, supporting arguments and adding
  help in the shell

- [#6862](https://github.com/ardatan/graphql-mesh/pull/6862)
  [`31828ad`](https://github.com/ardatan/graphql-mesh/commit/31828ad87a0c4d616f1217282bd1e7e74324fd9c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Rename `runServeCLI` to just `run` and change
  the supported options

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
  - Added dependency
    [`@graphql-tools/utils@^10.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.1.3)
    (to `dependencies`)
  - Added dependency [`commander@^12.0.0` ↗︎](https://www.npmjs.com/package/commander/v/12.0.0) (to
    `dependencies`)

- [#6779](https://github.com/ardatan/graphql-mesh/pull/6779)
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Destroy pubsub on process kill signals

- Updated dependencies
  [[`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`b372de6`](https://github.com/ardatan/graphql-mesh/commit/b372de6ac72e871ebdc731c0f3f67c16f04bb405),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)]:
  - @graphql-mesh/serve-runtime@0.3.0
  - @graphql-mesh/types@0.98.0
  - @graphql-mesh/utils@0.98.0

## 0.3.16

### Patch Changes

- Updated dependencies
  [[`05aabae`](https://github.com/ardatan/graphql-mesh/commit/05aabae48ad17f80847eb153e5fd4a96b7643d5d)]:
  - @graphql-mesh/serve-runtime@0.2.12

## 0.3.15

### Patch Changes

- [#6776](https://github.com/ardatan/graphql-mesh/pull/6776)
  [`910106c`](https://github.com/ardatan/graphql-mesh/commit/910106cb95e5f16ffddec0ada869ca8f4b0d2049)
  Thanks [@ardatan](https://github.com/ardatan)! - Export useForwardHeaders and useStaticFiles from
  serve-cli

## 0.3.14

### Patch Changes

- Updated dependencies
  [[`9ac2245`](https://github.com/ardatan/graphql-mesh/commit/9ac2245273a561449cfc17dcafc67d0c43baf33e)]:
  - @graphql-mesh/serve-runtime@0.2.11

## 0.3.13

### Patch Changes

- [#6751](https://github.com/ardatan/graphql-mesh/pull/6751)
  [`e100dcc`](https://github.com/ardatan/graphql-mesh/commit/e100dcc43efeebe81085389cee8bb6a6039268be)
  Thanks [@ardatan](https://github.com/ardatan)! - Better defaults for hostname

## 0.3.12

### Patch Changes

- Updated dependencies
  [[`8924438`](https://github.com/ardatan/graphql-mesh/commit/8924438131a7320ef160573539bddfb024bbe343)]:
  - @graphql-mesh/serve-runtime@0.2.10

## 0.3.11

### Patch Changes

- [#6740](https://github.com/ardatan/graphql-mesh/pull/6740)
  [`1ac3fff`](https://github.com/ardatan/graphql-mesh/commit/1ac3fffae8072fd787e6462a97d21a437d4c2dfd)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Removed dependency
    [`@graphql-tools/code-file-loader@^8.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/code-file-loader/v/8.1.1)
    (from `dependencies`)
  - Removed dependency
    [`@graphql-tools/git-loader@^8.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/git-loader/v/8.0.3)
    (from `dependencies`)
  - Removed dependency
    [`@graphql-tools/github-loader@^8.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/github-loader/v/8.0.0)
    (from `dependencies`)
  - Removed dependency
    [`@graphql-tools/graphql-file-loader@^8.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/graphql-file-loader/v/8.0.0)
    (from `dependencies`)
  - Removed dependency
    [`@graphql-tools/load@^8.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/load/v/8.0.0)
    (from `dependencies`)
  - Removed dependency
    [`@graphql-tools/url-loader@^8.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/url-loader/v/8.0.0)
    (from `dependencies`)

- [#6740](https://github.com/ardatan/graphql-mesh/pull/6740)
  [`1ac3fff`](https://github.com/ardatan/graphql-mesh/commit/1ac3fffae8072fd787e6462a97d21a437d4c2dfd)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix schema loading

## 0.3.10

### Patch Changes

- Updated dependencies
  [[`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)]:
  - @graphql-mesh/types@0.97.5
  - @graphql-mesh/utils@0.97.5
  - @graphql-mesh/serve-runtime@0.2.9

## 0.3.9

### Patch Changes

- Updated dependencies
  [[`f293329`](https://github.com/ardatan/graphql-mesh/commit/f2933295532d0760bb731e055dd2bd6e9cb2a63b)]:
  - @graphql-mesh/serve-runtime@0.2.8

## 0.3.8

### Patch Changes

- Updated dependencies
  [[`1639001`](https://github.com/ardatan/graphql-mesh/commit/16390018bd54946fbfbd2bfb8eb3ba7682966a12)]:
  - @graphql-mesh/serve-runtime@0.2.7

## 0.3.7

### Patch Changes

- [`e6e19d6`](https://github.com/ardatan/graphql-mesh/commit/e6e19d6e73161e3719405138d8d0f853d5c805d9)
  Thanks [@ardatan](https://github.com/ardatan)! - Support code files as fusiongraph input

## 0.3.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.2.6

## 0.3.5

### Patch Changes

- [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f)
  Thanks [@ardatan](https://github.com/ardatan)! - Terminate handler registry

- Updated dependencies
  [[`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)]:
  - @graphql-mesh/utils@0.97.4
  - @graphql-mesh/types@0.97.4
  - @graphql-mesh/serve-runtime@0.2.5

## 0.3.4

### Patch Changes

- Updated dependencies
  [[`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)]:
  - @graphql-mesh/types@0.97.3
  - @graphql-mesh/utils@0.97.3
  - @graphql-mesh/serve-runtime@0.2.4

## 0.3.3

### Patch Changes

- Updated dependencies
  [[`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)]:
  - @graphql-mesh/types@0.97.2
  - @graphql-mesh/utils@0.97.2
  - @graphql-mesh/serve-runtime@0.2.3

## 0.3.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.2.2

## 0.3.1

### Patch Changes

- [#6602](https://github.com/ardatan/graphql-mesh/pull/6602)
  [`915b8f8`](https://github.com/ardatan/graphql-mesh/commit/915b8f8e56edc22515ca99e396f1c9d3b4e904b9)
  Thanks [@ardatan](https://github.com/ardatan)! - Customizations

- Updated dependencies
  [[`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)]:
  - @graphql-mesh/types@0.97.1
  - @graphql-mesh/utils@0.97.1
  - @graphql-mesh/serve-runtime@0.2.1

## 0.3.0

### Patch Changes

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a),
  [`70b05a2`](https://github.com/ardatan/graphql-mesh/commit/70b05a20a948b5ebed5306c14710c8839225cdad)]:
  - @graphql-mesh/types@0.97.0
  - @graphql-mesh/utils@0.97.0
  - @graphql-mesh/serve-runtime@0.2.0

## 0.2.1

### Patch Changes

- Updated dependencies
  [[`0f274ef`](https://github.com/ardatan/graphql-mesh/commit/0f274ef8177068da65e50e08607998d0ed63e8b9)]:
  - @graphql-mesh/utils@0.96.6
  - @graphql-mesh/serve-runtime@0.1.1
  - @graphql-mesh/types@0.96.6

## 0.2.0

### Minor Changes

- [`7b494d9`](https://github.com/ardatan/graphql-mesh/commit/7b494d981862034f256225e2c9a5c43a403ff79d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Improve typings and other accompanying
  improvements

### Patch Changes

- [#6559](https://github.com/ardatan/graphql-mesh/pull/6559)
  [`f265dda`](https://github.com/ardatan/graphql-mesh/commit/f265dda8d62dc5f345d69f60c8a3a09f0e6a0451)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/types@^0.96.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.96.5)
    (to `dependencies`)

- [#6568](https://github.com/ardatan/graphql-mesh/pull/6568)
  [`44d40ff`](https://github.com/ardatan/graphql-mesh/commit/44d40fff17877a52e63c6f644635ea53eb9deadb)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Removed dependency
    [`@graphql-mesh/fusion-runtime@^0.0.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/fusion-runtime/v/0.0.2)
    (from `dependencies`)
  - Removed dependency
    [`@graphql-mesh/runtime@^0.97.6` ↗︎](https://www.npmjs.com/package/@graphql-mesh/runtime/v/0.97.6)
    (from `dependencies`)
- Updated dependencies
  [[`f265dda`](https://github.com/ardatan/graphql-mesh/commit/f265dda8d62dc5f345d69f60c8a3a09f0e6a0451),
  [`44d40ff`](https://github.com/ardatan/graphql-mesh/commit/44d40fff17877a52e63c6f644635ea53eb9deadb),
  [`7b494d9`](https://github.com/ardatan/graphql-mesh/commit/7b494d981862034f256225e2c9a5c43a403ff79d)]:
  - @graphql-mesh/serve-runtime@0.1.0

## 0.1.0

### Minor Changes

- [#6549](https://github.com/ardatan/graphql-mesh/pull/6549)
  [`c6535b6`](https://github.com/ardatan/graphql-mesh/commit/c6535b6ba772eeda498710ca1234779a27b6647b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Transpile only mesh config

### Patch Changes

- [#6552](https://github.com/ardatan/graphql-mesh/pull/6552)
  [`57dd00b`](https://github.com/ardatan/graphql-mesh/commit/57dd00bf0e9e6bd4c2526aa5d6d609d18e9cd176)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/cross-helpers@^0.4.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.1)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/runtime@^0.97.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/runtime/v/0.97.5)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/utils@^0.96.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.96.4)
    (to `dependencies`)

- [#6553](https://github.com/ardatan/graphql-mesh/pull/6553)
  [`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/cross-helpers@^0.4.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.1)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/runtime@^0.97.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/runtime/v/0.97.5)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/utils@^0.96.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.96.4)
    (to `dependencies`)

- [#6552](https://github.com/ardatan/graphql-mesh/pull/6552)
  [`57dd00b`](https://github.com/ardatan/graphql-mesh/commit/57dd00bf0e9e6bd4c2526aa5d6d609d18e9cd176)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Include necessary dependencies

- [`2e67aa0`](https://github.com/ardatan/graphql-mesh/commit/2e67aa0f37f2d438d5d7b766d45afb8d126556ee)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump node-libcurl

- [#6550](https://github.com/ardatan/graphql-mesh/pull/6550)
  [`4841da9`](https://github.com/ardatan/graphql-mesh/commit/4841da96096d7f5c41b417fd9114dbad420f4677)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Hot reloading is optional and therefore just
  a warning

- Updated dependencies
  [[`7c18a3f`](https://github.com/ardatan/graphql-mesh/commit/7c18a3f9163f5156758b8cdf0292b28a3bb6046b),
  [`89d8dd6`](https://github.com/ardatan/graphql-mesh/commit/89d8dd6dde4b74a9c3edb3438ef23f2498d94276),
  [`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)]:
  - @graphql-mesh/fusion-runtime@0.0.2
  - @graphql-mesh/runtime@0.97.6
  - @graphql-mesh/serve-runtime@0.0.2
  - @graphql-mesh/utils@0.96.5

## 0.0.1

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - New Fusion packages

- Updated dependencies
  [[`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)]:
  - @graphql-mesh/fusion-runtime@0.0.1
  - @graphql-mesh/serve-runtime@0.0.1
