# @graphql-mesh/transport-http-callback

## 0.0.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.99.7
  - @graphql-mesh/transport-common@0.4.7

## 0.0.5

### Patch Changes

- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/transport-common@0.4.6
  - @graphql-mesh/utils@0.99.6

## 0.0.4

### Patch Changes

- [#7401](https://github.com/ardatan/graphql-mesh/pull/7401)
  [`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/utils@^0.99.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.99.4)
    (to `dependencies`)
- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/utils@0.99.5
  - @graphql-mesh/transport-common@0.4.5

## 0.0.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.4.4

## 0.0.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/transport-common@0.4.3

## 0.0.1

### Patch Changes

- [#7334](https://github.com/ardatan/graphql-mesh/pull/7334)
  [`22ebcf0`](https://github.com/ardatan/graphql-mesh/commit/22ebcf09d14ddc2da055f566c0e8e08f7428e141)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/cross-helpers@^0.4.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.4)
    (to `dependencies`)

- [#7294](https://github.com/ardatan/graphql-mesh/pull/7294)
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730)
  Thanks [@ardatan](https://github.com/ardatan)! - Support for HTTP Callback protocol for
  subscriptions

  ```ts
      reviews: {
        kind: 'hybrid',
        options: {
          subscriptions: {
            kind: 'http-callback',
          },
        } satisfies HybridTransportOptions<HTTPCallbackTransportOptions>,
      },
  ```

  Learn more about protocol;
  https://www.apollographql.com/docs/router/executing-operations/subscription-callback-protocol/

- Updated dependencies
  [[`b01f3ea`](https://github.com/ardatan/graphql-mesh/commit/b01f3eabdc42d8905e8d586a4845e8394c094033),
  [`0bdc18d`](https://github.com/ardatan/graphql-mesh/commit/0bdc18df3d150a61abf987b8829934ed4ca02eed),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730)]:
  - @graphql-mesh/string-interpolation@0.5.5
  - @graphql-mesh/transport-common@0.4.2
