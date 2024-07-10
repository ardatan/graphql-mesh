# @graphql-mesh/transport-http

## 0.3.0

### Minor Changes

- [#7207](https://github.com/ardatan/graphql-mesh/pull/7207)
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Support subscriptions over WebSockets

### Patch Changes

- [#6772](https://github.com/ardatan/graphql-mesh/pull/6772)
  [`27e3cc9`](https://github.com/ardatan/graphql-mesh/commit/27e3cc97c1218863cf2948902bdca050bd71d18a)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor-http@^1.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.1.2)
    (from `^1.0.6`, in `dependencies`)

- [#7207](https://github.com/ardatan/graphql-mesh/pull/7207)
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency
    [`@graphql-tools/executor-graphql-ws@^1.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-graphql-ws/v/1.2.0)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (to `dependencies`)
  - Added dependency [`graphql-ws@^5.16.0` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.16.0)
    (to `dependencies`)
  - Added dependency [`ws@^8.18.0` ↗︎](https://www.npmjs.com/package/ws/v/8.18.0) (to
    `dependencies`)
  - Removed dependency
    [`@envelop/core@^5.0.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.0) (from
    `dependencies`)

- [#7218](https://github.com/ardatan/graphql-mesh/pull/7218)
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor-http@^1.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.1.2)
    (from `^1.0.6`, in `dependencies`)
  - Added dependency
    [`@graphql-tools/executor-graphql-ws@^1.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-graphql-ws/v/1.2.0)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (to `dependencies`)
  - Added dependency [`graphql-ws@^5.16.0` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.16.0)
    (to `dependencies`)
  - Added dependency [`ws@^8.18.0` ↗︎](https://www.npmjs.com/package/ws/v/8.18.0) (to
    `dependencies`)
  - Removed dependency
    [`@envelop/core@^5.0.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.0) (from
    `dependencies`)

- [#7223](https://github.com/ardatan/graphql-mesh/pull/7223)
  [`26549a9`](https://github.com/ardatan/graphql-mesh/commit/26549a9832b4e18afdb22e4615a9951d69a5922b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor-http@^1.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.1.2)
    (from `^1.0.6`, in `dependencies`)
- Updated dependencies
  [[`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)]:
  - @graphql-mesh/transport-common@0.4.0

## 0.2.1

### Patch Changes

- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)]:
  - @graphql-mesh/transport-common@0.3.1

## 0.2.0

### Minor Changes

- [#7145](https://github.com/ardatan/graphql-mesh/pull/7145)
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)
  Thanks [@ardatan](https://github.com/ardatan)! - POTENTIAL BREAKING CHANGE:

  Now `@httpOperation` and `@transport` directive serializes headers as `[string, string][]` instead
  of stringified JSON.

  ```diff
  @httpOperation(
  -  operationSpecificHeaders: [["Authorization", "Bearer 123"], ["X-Api-Key", "123"]]
  +  operationSpecificHeaders: "{\"Authorization\": \"Bearer 123\", \"X-Api-Key\": \"123\"}"
  )
  ```

  ```diff
  @transport(
  -  headers: [["Authorization, "Bearer 123"], ["X-Api-Key", "123"]]
  +  headers: "{\"Authorization, \"Bearer 123\", \"X-Api-Key\": \"123\"}"
  )
  ```

  Also incorrect placement of `@transport` has been fixed to `SCHEMA`

  ```diff
  directive @transport on
  -  FIELD_DEFINITION
  +  SCHEMA
  ```

  There is still backwards compatibility but this might look like a breaking change for some users
  during schema validation.

### Patch Changes

- Updated dependencies
  [[`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)]:
  - @graphql-mesh/transport-common@0.3.0

## 0.1.14

### Patch Changes

- Updated dependencies
  [[`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/transport-common@0.2.8

## 0.1.13

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.2.7

## 0.1.12

### Patch Changes

- Updated dependencies
  [[`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/transport-common@0.2.6

## 0.1.11

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.2.5

## 0.1.10

### Patch Changes

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @graphql-mesh/transport-common@0.2.4

## 0.1.9

### Patch Changes

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @graphql-mesh/transport-common@0.2.3

## 0.1.8

### Patch Changes

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/transport-common@0.2.2

## 0.1.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.2.1

## 0.1.6

### Patch Changes

- Updated dependencies
  [[`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)]:
  - @graphql-mesh/transport-common@0.2.0

## 0.1.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.1.5

## 0.1.4

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.1.4

## 0.1.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.1.1

## 0.1.0

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.1.0

## 0.0.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.0.3

## 0.0.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.0.2

## 0.0.1

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - New Fusion packages

- Updated dependencies
  [[`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)]:
  - @graphql-mesh/transport-common@0.0.1
