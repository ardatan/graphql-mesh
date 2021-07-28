# @graphql-mesh/cli

## 0.31.0

### Minor Changes

- 885ea439a: New MeshStore approach

### Patch Changes

- Updated dependencies [885ea439a]
- Updated dependencies [d8051f87d]
  - @graphql-mesh/config@0.18.0
  - @graphql-mesh/store@0.1.0
  - @graphql-mesh/utils@0.13.0
  - @graphql-mesh/runtime@0.17.1

## 0.30.2

### Patch Changes

- Updated dependencies [01cf89298]
  - @graphql-mesh/config@0.17.0
  - @graphql-mesh/runtime@0.17.0

## 0.30.1

### Patch Changes

- Updated dependencies [bdb58dfec]
  - @graphql-mesh/utils@0.12.0
  - @graphql-mesh/config@0.16.6
  - @graphql-mesh/runtime@0.16.6

## 0.30.0

### Minor Changes

- d27f36029: Add support to require local modules as an addition to installed packages

## 0.29.14

### Patch Changes

- b9036c51b: fix(serve): better error handling
- 4d96aa9b5: fix(cli): fix duplicate methods in incontext sdk typings

## 0.29.13

### Patch Changes

- ee86d8fa7: fix(serve): do not throw if stack is undefined

## 0.29.12

### Patch Changes

- Updated dependencies [7d0e33660]
  - @graphql-mesh/utils@0.11.4
  - @graphql-mesh/config@0.16.5
  - @graphql-mesh/runtime@0.16.5

## 0.29.11

### Patch Changes

- @graphql-mesh/config@0.16.4
- @graphql-mesh/runtime@0.16.4

## 0.29.10

### Patch Changes

- Updated dependencies [3c4c51100]
  - @graphql-mesh/runtime@0.16.3
  - @graphql-mesh/utils@0.11.3
  - @graphql-mesh/config@0.16.3

## 0.29.9

### Patch Changes

- e6acdbd7d: enhance(runtime): do not compose unnecessary resolvers
- Updated dependencies [e6acdbd7d]
  - @graphql-mesh/config@0.16.2
  - @graphql-mesh/runtime@0.16.2
  - @graphql-mesh/utils@0.11.2

## 0.29.8

### Patch Changes

- Updated dependencies [69c89666d]
  - @graphql-mesh/utils@0.11.1
  - @graphql-mesh/config@0.16.1
  - @graphql-mesh/runtime@0.16.1

## 0.29.7

### Patch Changes

- Updated dependencies [214b7a23c]
  - @graphql-mesh/config@0.16.0
  - @graphql-mesh/runtime@0.16.0

## 0.29.6

### Patch Changes

- Updated dependencies [1f4655ee6]
  - @graphql-mesh/runtime@0.15.0
  - @graphql-mesh/config@0.15.7

## 0.29.5

### Patch Changes

- @graphql-mesh/config@0.15.6
- @graphql-mesh/runtime@0.14.1

## 0.29.4

### Patch Changes

- 28f80c0a7: fix(serve): fix subscriptions

## 0.29.3

### Patch Changes

- Updated dependencies [1caa8ffd3]
  - @graphql-mesh/runtime@0.14.0
  - @graphql-mesh/utils@0.11.0
  - @graphql-mesh/config@0.15.5

## 0.29.2

### Patch Changes

- @graphql-mesh/config@0.15.4
- @graphql-mesh/runtime@0.13.4

## 0.29.1

### Patch Changes

- 1c8b460d1: fix(serve) fix browser flag

## 0.29.0

### Minor Changes

- 346fe9c61: Performance improvements and OData fixes

### Patch Changes

- Updated dependencies [346fe9c61]
- Updated dependencies [f89497389]
  - @graphql-mesh/utils@0.10.0
  - @graphql-mesh/runtime@0.13.3
  - @graphql-mesh/config@0.15.3

## 0.28.0

### Minor Changes

- 4b57f7496: feat(serve): ability to configure opening browser window feature

### Patch Changes

- @graphql-mesh/config@0.15.2
- @graphql-mesh/runtime@0.13.2

## 0.27.2

### Patch Changes

- e7c3de4ae: fix(cli): use baseDir for path defined in config file

## 0.27.1

### Patch Changes

- b77148a04: fix(npm-publish): bump all versions to publish again
- Updated dependencies [b77148a04]
  - @graphql-mesh/config@0.15.1
  - @graphql-mesh/runtime@0.13.1
  - @graphql-mesh/utils@0.9.2

## 0.27.0

### Minor Changes

- 634a8a134: feat(config): introduce introspection cache

### Patch Changes

- d12c7d978: fix(utils): use mkdir before emit output
- Updated dependencies [634a8a134]
- Updated dependencies [2c3312f1a]
- Updated dependencies [d12c7d978]
  - @graphql-mesh/config@0.15.0
  - @graphql-mesh/runtime@0.13.0
  - @graphql-mesh/utils@0.9.1

## 0.26.2

### Patch Changes

- Updated dependencies [0b175305a]
  - @graphql-mesh/runtime@0.12.0
  - @graphql-mesh/config@0.14.3

## 0.26.1

### Patch Changes

- Updated dependencies [939f9beb5]
  - @graphql-mesh/config@0.14.2

## 0.26.0

### Minor Changes

- 7efbf045: Fix CLI usage of base-dir

  **Breaking changes**
  This is technically just a bug fix, but it corrects a behaviour that will break if you relied on it.
  When using CLI commands with the `--dir` option, those commands were using your given `--dir` as the base directory.

  Now CLI commands always use the Current Working Directory (CWD) as the base directory and so the given `--dir` is used to only get the Mesh Config file and process any local file eventually defined in the Config.

- 191a663a: feat(cli): return server and express app from serveMesh

### Patch Changes

- Updated dependencies [191a663a]
  - @graphql-mesh/config@0.14.1
  - @graphql-mesh/runtime@0.11.9

## 0.25.3

### Patch Changes

- Updated dependencies [b9ca0c30]
  - @graphql-mesh/config@0.14.0
  - @graphql-mesh/utils@0.9.0
  - @graphql-mesh/runtime@0.11.8

## 0.25.2

### Patch Changes

- cf58cd5c: enhance(serve): improve logging
- Updated dependencies [cf58cd5c]
  - @graphql-mesh/runtime@0.11.7
  - @graphql-mesh/config@0.13.7

## 0.25.1

### Patch Changes

- Updated dependencies [ec89a923]
- Updated dependencies [ec89a923]
  - @graphql-mesh/utils@0.8.8
  - @graphql-mesh/runtime@0.11.6
  - @graphql-mesh/config@0.13.6

## 0.25.0

### Minor Changes

- b52859c6: enhance(serve): run custom handlers before anything else

## 0.24.1

### Patch Changes

- @graphql-mesh/config@0.13.5
- @graphql-mesh/runtime@0.11.5

## 0.24.0

### Minor Changes

- 76051dd7: feat(serve): ability to change GraphQL endpoint path

### Patch Changes

- @graphql-mesh/config@0.13.4
- @graphql-mesh/runtime@0.11.4

## 0.23.4

### Patch Changes

- @graphql-mesh/config@0.13.3
- @graphql-mesh/runtime@0.11.3

## 0.23.3

### Patch Changes

- @graphql-mesh/config@0.13.2
- @graphql-mesh/runtime@0.11.2

## 0.23.2

### Patch Changes

- @graphql-mesh/config@0.13.1
- @graphql-mesh/runtime@0.11.1

## 0.23.1

### Patch Changes

- f9985ac8: fix(serve): ignore if xdg-open not available

## 0.23.0

### Minor Changes

- 77327988: feat(runtime): Live Queries Support

### Patch Changes

- Updated dependencies [77327988]
  - @graphql-mesh/config@0.13.0
  - @graphql-mesh/runtime@0.11.0

## 0.22.1

### Patch Changes

- @graphql-mesh/config@0.12.6
- @graphql-mesh/runtime@0.10.26

## 0.22.0

### Minor Changes

- 970c43e2: feat(serve): better error handling, progress bar etc

### Patch Changes

- 2cfa421a: fix(serve): better error handling for schema generation errors

## 0.21.0

### Minor Changes

- ea3a183b: Added health checks /healthcheck /readiness

## 0.20.2

### Patch Changes

- @graphql-mesh/config@0.12.5
- @graphql-mesh/runtime@0.10.25

## 0.20.1

### Patch Changes

- @graphql-mesh/config@0.12.4
- @graphql-mesh/runtime@0.10.24

## 0.20.0

### Minor Changes

- a02d86c3: feat(serve): add HTTPS support
- a02d86c3: feat(serve): use GraphQL Helix's version of GraphiQL for playground
- a02d86c3: feat(serve): ability to change binding hostname

### Patch Changes

- a02d86c3: fix(runtime): patch graphql-compose schemas to support @defer and @stream
- Updated dependencies [a02d86c3]
  - @graphql-mesh/runtime@0.10.23
  - @graphql-mesh/config@0.12.3

## 0.19.2

### Patch Changes

- Updated dependencies [69d2198d]
  - @graphql-mesh/utils@0.8.7
  - @graphql-mesh/config@0.12.2
  - @graphql-mesh/runtime@0.10.22

## 0.19.1

### Patch Changes

- Updated dependencies [bf6c517d]
  - @graphql-mesh/runtime@0.10.21
  - @graphql-mesh/config@0.12.1

## 0.19.0

### Minor Changes

- 63e12ef3: Better config validations, allow to set --dir in cli for base path

### Patch Changes

- Updated dependencies [63e12ef3]
  - @graphql-mesh/config@0.12.0

## 0.18.0

### Minor Changes

- 8e8848e1: feat(serve): ability to change maxRequestBodySize

### Patch Changes

- @graphql-mesh/config@0.11.20
- @graphql-mesh/runtime@0.10.20

## 0.17.1

### Patch Changes

- Updated dependencies [7e970f09]
  - @graphql-mesh/utils@0.8.6
  - @graphql-mesh/config@0.11.19
  - @graphql-mesh/runtime@0.10.19

## 0.17.0

### Minor Changes

- e8994875: feat(serve): ability to change maxFileSize and maxFiles for graphql-upload

### Patch Changes

- @graphql-mesh/config@0.11.18
- @graphql-mesh/runtime@0.10.18

## 0.16.3

### Patch Changes

- Updated dependencies [8d345721]
  - @graphql-mesh/utils@0.8.5
  - @graphql-mesh/config@0.11.17
  - @graphql-mesh/runtime@0.10.17

## 0.16.2

### Patch Changes

- c767df01: fix(fs): fix fs handling issues for non Node environments
- b3d7ecbf: chore(deps): replace fs-extra with native fs
- Updated dependencies [c767df01]
- Updated dependencies [b3d7ecbf]
  - @graphql-mesh/runtime@0.10.16
  - @graphql-mesh/utils@0.8.4
  - @graphql-mesh/config@0.11.16

## 0.16.1

### Patch Changes

- @graphql-mesh/config@0.11.15
- @graphql-mesh/runtime@0.10.15

## 0.16.0

### Minor Changes

- c1de3e43: feat(cli): add `playground` option to serve configuration

### Patch Changes

- @graphql-mesh/config@0.11.14
- @graphql-mesh/runtime@0.10.14

## 0.15.7

### Patch Changes

- @graphql-mesh/config@0.11.13
- @graphql-mesh/runtime@0.10.13

## 0.15.6

### Patch Changes

- @graphql-mesh/config@0.11.12
- @graphql-mesh/runtime@0.10.12

## 0.15.5

### Patch Changes

- Updated dependencies [08c2966e]
- Updated dependencies [08c2966e]
  - @graphql-mesh/utils@0.8.3
  - @graphql-mesh/config@0.11.11
  - @graphql-mesh/runtime@0.10.11

## 0.15.4

### Patch Changes

- 0b08b2a6: fix(generate-sdk): fix mismatch TS definitions for scalars

## 0.15.3

### Patch Changes

- @graphql-mesh/config@0.11.10
- @graphql-mesh/runtime@0.10.10

## 0.15.2

### Patch Changes

- @graphql-mesh/config@0.11.9
- @graphql-mesh/runtime@0.10.9

## 0.15.1

### Patch Changes

- a7dcd2d9: fix(cli): fix enum values mismatch in generated sdk

## 0.15.0

### Minor Changes

- bccbb9ca: feat(cli): export serve command

## 0.14.1

### Patch Changes

- Updated dependencies [c85a54eb]
  - @graphql-mesh/utils@0.8.2
  - @graphql-mesh/config@0.11.8
  - @graphql-mesh/runtime@0.10.8

## 0.14.0

### Minor Changes

- 1ba078b8: Added a new cli command for printing the static mesh schema to a file

### Patch Changes

- 438b5250: feat(cli): rename schema dump command
  - @graphql-mesh/config@0.11.7
  - @graphql-mesh/runtime@0.10.7

## 0.13.0

### Minor Changes

- c8389f64: feat(generate-sdk): add flattenTypes option to generate sdk smaller

## 0.12.6

### Patch Changes

- @graphql-mesh/config@0.11.6
- @graphql-mesh/runtime@0.10.6

## 0.12.5

### Patch Changes

- Updated dependencies [0129bebb]
  - @graphql-mesh/config@0.11.5
  - @graphql-mesh/runtime@0.10.5

## 0.12.4

### Patch Changes

- @graphql-mesh/config@0.11.4
- @graphql-mesh/runtime@0.10.4

## 0.12.3

### Patch Changes

- Updated dependencies [c064e3a8]
  - @graphql-mesh/utils@0.8.1
  - @graphql-mesh/config@0.11.3
  - @graphql-mesh/runtime@0.10.3

## 0.12.2

### Patch Changes

- 1f0b2f1f: enhance(cli): improve error messages
- Updated dependencies [1f0b2f1f]
  - @graphql-mesh/runtime@0.10.2
  - @graphql-mesh/config@0.11.2

## 0.12.1

### Patch Changes

- @graphql-mesh/config@0.11.1
- @graphql-mesh/runtime@0.10.1

## 0.12.0

### Minor Changes

- 2d14fcc3: bump graphql-tools to v7
- 2d14fcc3: feat(graphql): use graphql-ws instead of subscriptions-transport-ws

### Patch Changes

- Updated dependencies [2d14fcc3]
  - @graphql-mesh/config@0.11.0
  - @graphql-mesh/runtime@0.10.0
  - @graphql-mesh/utils@0.8.0

## 0.11.14

### Patch Changes

- Updated dependencies [bf3e1d3a]
  - @graphql-mesh/config@0.10.19

## 0.11.13

### Patch Changes

- 5df99891: Fix generated code IsTypeOfResolverFn type arguments
- Updated dependencies [c9a272f7]
  - @graphql-mesh/runtime@0.9.0
  - @graphql-mesh/config@0.10.18

## 0.11.12

### Patch Changes

- Updated dependencies [c1b073de]
  - @graphql-mesh/runtime@0.8.0
  - @graphql-mesh/utils@0.7.0
  - @graphql-mesh/config@0.10.17

## 0.11.11

### Patch Changes

- @graphql-mesh/config@0.10.16
- @graphql-mesh/runtime@0.7.15

## 0.11.10

### Patch Changes

- @graphql-mesh/config@0.10.15
- @graphql-mesh/runtime@0.7.14

## 0.11.9

### Patch Changes

- @graphql-mesh/config@0.10.14
- @graphql-mesh/runtime@0.7.13

## 0.11.8

### Patch Changes

- 0ae7b154: fix(cli): generate typescript definitions properly

## 0.11.7

### Patch Changes

- @graphql-mesh/config@0.10.13
- @graphql-mesh/runtime@0.7.12

## 0.11.6

### Patch Changes

- @graphql-mesh/config@0.10.12

## 0.11.5

### Patch Changes

- @graphql-mesh/config@0.10.11
- @graphql-mesh/runtime@0.7.11

## 0.11.4

### Patch Changes

- @graphql-mesh/config@0.10.10
- @graphql-mesh/runtime@0.7.10

## 0.11.3

### Patch Changes

- @graphql-mesh/config@0.10.9
- @graphql-mesh/runtime@0.7.9

## 0.11.2

### Patch Changes

- Updated dependencies [f6dae19b]
  - @graphql-mesh/runtime@0.7.8
  - @graphql-mesh/config@0.10.8

## 0.11.1

### Patch Changes

- Updated dependencies [bd26407b]
  - @graphql-mesh/runtime@0.7.7
  - @graphql-mesh/config@0.10.7

## 0.11.0

### Minor Changes

- e500313b: feat(odata): add Duration scalar for Edm.Duration type

### Patch Changes

- @graphql-mesh/config@0.10.6
- @graphql-mesh/runtime@0.7.6

## 0.10.0

### Minor Changes

- b50a68e3: feat(serve): support cookies and static file serving

### Patch Changes

- @graphql-mesh/config@0.10.5
- @graphql-mesh/runtime@0.7.5

## 0.9.6

### Patch Changes

- 3b658014: fix(server): pass correct configuration
- Updated dependencies [9a7a55c4]
- Updated dependencies [3b658014]
  - @graphql-mesh/utils@0.6.0
  - @graphql-mesh/runtime@0.7.4
  - @graphql-mesh/config@0.10.4

## 0.9.5

### Patch Changes

- c4317b4e: enhance(serve): respect PORT env variable

## 0.9.4

### Patch Changes

- a3b42cfd: fix(runtime): handle transforms correctly for single source
- Updated dependencies [a3b42cfd]
  - @graphql-mesh/config@0.10.3
  - @graphql-mesh/runtime@0.7.3
  - @graphql-mesh/utils@0.5.4

## 0.9.3

### Patch Changes

- Updated dependencies [6d624576]
  - @graphql-mesh/config@0.10.2
  - @graphql-mesh/runtime@0.7.2

## 0.9.2

### Patch Changes

- Updated dependencies [405cec23]
  - @graphql-mesh/config@0.10.1
  - @graphql-mesh/runtime@0.7.1

## 0.9.1

### Patch Changes

- cfae8d4d: fix(serve): fix handlers error

## 0.9.0

### Minor Changes

- 48d89de2: feat(runtime): replace hooks with pubsub logic

### Patch Changes

- Updated dependencies [48d89de2]
- Updated dependencies [2e7d4fb0]
- Updated dependencies [48d89de2]
  - @graphql-mesh/config@0.10.0
  - @graphql-mesh/runtime@0.7.0

## 0.8.4

### Patch Changes

- Updated dependencies [79adf4b6]
  - @graphql-mesh/config@0.9.0
  - @graphql-mesh/runtime@0.6.5

## 0.8.3

### Patch Changes

- 89e1e028: fix(serve): allow string as port value
  - @graphql-mesh/config@0.8.4
  - @graphql-mesh/runtime@0.6.4

## 0.8.2

### Patch Changes

- @graphql-mesh/config@0.8.3
- @graphql-mesh/runtime@0.6.3

## 0.8.1

### Patch Changes

- 9900d2fa: fix(cli-serve): show whole error stack trace
- Updated dependencies [9900d2fa]
  - @graphql-mesh/runtime@0.6.2
  - @graphql-mesh/config@0.8.2

## 0.8.0

### Minor Changes

- c8d9695e: feat(cli): support --require flag to load dotenv etc

### Patch Changes

- @graphql-mesh/config@0.8.1
- @graphql-mesh/runtime@0.6.1

## 0.7.1

### Patch Changes

- Updated dependencies [6aef18be]
- Updated dependencies [6aef18be]
  - @graphql-mesh/runtime@0.6.0
  - @graphql-mesh/config@0.8.0

## 0.7.0

### Minor Changes

- f8c8d549: fix(cli): update scalars map for generated sdk and types

## 0.6.0

### Minor Changes

- a789c312: feat(stitching): use batch execution

### Patch Changes

- Updated dependencies [a789c312]
  - @graphql-mesh/config@0.7.0
  - @graphql-mesh/runtime@0.5.0

## 0.5.0

### Minor Changes

- 718e7a16: fix(runtime): fix browser support

### Patch Changes

- Updated dependencies [718e7a16]
  - @graphql-mesh/config@0.6.0
  - @graphql-mesh/runtime@0.4.0

## 0.4.0

### Minor Changes

- a76d74bb: feat(config): able to configure serve command in mesh config file

### Patch Changes

- 5067ac73: fix(serve): fix typo
- Updated dependencies [a76d74bb]
  - @graphql-mesh/config@0.5.0
  - @graphql-mesh/runtime@0.3.2

## 0.3.2

### Patch Changes

- Updated dependencies [dde7878b]
  - @graphql-mesh/runtime@0.3.1
  - @graphql-mesh/config@0.4.1

## 0.3.1

### Patch Changes

- 8ccf1eac: export generateSdk function

## 0.3.0

### Minor Changes

- 705c4626: introduce an independent config package

### Patch Changes

- Updated dependencies [705c4626]
  - @graphql-mesh/config@0.4.0
  - @graphql-mesh/runtime@0.3.0

## 0.2.19

### Patch Changes

- @graphql-mesh/runtime@0.2.19

## 0.2.18

### Patch Changes

- Updated dependencies [f650cd2f]
  - @graphql-mesh/runtime@0.2.18

## 0.2.17

### Patch Changes

- Updated dependencies [3c131332]
  - @graphql-mesh/runtime@0.2.17

## 0.2.16

### Patch Changes

- Updated dependencies [16ab2aa5]
  - @graphql-mesh/runtime@0.2.16
