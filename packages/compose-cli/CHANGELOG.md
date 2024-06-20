# @graphql-mesh/compose-cli

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
