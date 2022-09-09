# @graphql-mesh/plugin-newrelic

## 0.2.4

### Patch Changes

- Updated dependencies [[`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8)]:
  - @graphql-mesh/utils@0.41.6
  - @graphql-mesh/types@0.83.1

## 0.2.3

### Patch Changes

- Updated dependencies [[`a56ebcec5`](https://github.com/Urigo/graphql-mesh/commit/a56ebcec503402fbdb3d4e3561fd2e38e4dd5c43), [`24afabece`](https://github.com/Urigo/graphql-mesh/commit/24afabece51aee171f902776d3f59b4a17026c49), [`44b868196`](https://github.com/Urigo/graphql-mesh/commit/44b86819695a298e60b1d7b6c54ae2772e8f1588)]:
  - @graphql-mesh/types@0.83.0
  - @graphql-mesh/utils@0.41.5

## 0.2.2

### Patch Changes

- Updated dependencies [[`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53), [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53), [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53)]:
  - @graphql-mesh/cross-helpers@0.2.4
  - @graphql-mesh/types@0.82.3
  - @graphql-mesh/utils@0.41.4

## 0.2.1

### Patch Changes

- Updated dependencies [[`b9bb80094`](https://github.com/Urigo/graphql-mesh/commit/b9bb8009407d27440267a5e9a7ec5dbfecc9bf8f)]:
  - @graphql-mesh/types@0.82.2
  - @graphql-mesh/utils@0.41.3

## 0.2.0

### Minor Changes

- [`8cb6e33c6`](https://github.com/Urigo/graphql-mesh/commit/8cb6e33c6267e007a4c628f9cda81198375ae770) Thanks [@ardatan](https://github.com/ardatan)! - Now `args` and `key` are not sent by default. You should enable `includeResolverArgs` to send them to NewRelic and also `includeRawResult` allows you to send delegation result to NewRelic

## 0.1.3

### Patch Changes

- [#4418](https://github.com/Urigo/graphql-mesh/pull/4418) [`59dbb1985`](https://github.com/Urigo/graphql-mesh/commit/59dbb1985b07a250f0113d70e0f55e467dc17812) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@envelop/newrelic@4.3.0` ↗︎](https://www.npmjs.com/package/@envelop/newrelic/v/4.3.0) (from `4.2.0`, in `dependencies`)

- [#4422](https://github.com/Urigo/graphql-mesh/pull/4422) [`3165827f7`](https://github.com/Urigo/graphql-mesh/commit/3165827f74b48a914b9604b024cd1318c211aa14) Thanks [@ardatan](https://github.com/ardatan)! - 🚀🚀🚀 **New StatsD plugin** 🚀🚀🚀

  You can learn more about tracing and monitoring in GraphQL with different plugins (StatsD, Prometheus, NewRelic and more) in our documentation.
  [Tracing and Monitoring in GraphQL Mesh](http://www.graphql-mesh.com/docs/guides/monitoring-and-tracing)

- Updated dependencies [[`3165827f7`](https://github.com/Urigo/graphql-mesh/commit/3165827f74b48a914b9604b024cd1318c211aa14)]:
  - @graphql-mesh/types@0.82.1
  - @graphql-mesh/utils@0.41.2

## 0.1.2

### Patch Changes

- [#4414](https://github.com/Urigo/graphql-mesh/pull/4414) [`bea2cd91e`](https://github.com/Urigo/graphql-mesh/commit/bea2cd91e074db0dec777b0383218dab423aa87c) Thanks [@ardatan](https://github.com/ardatan)! - Use Request object to find operationSegment if possible

## 0.1.1

### Patch Changes

- Updated dependencies [[`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9), [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9)]:
  - @graphql-mesh/types@0.82.0
  - @graphql-mesh/utils@0.41.1

## 0.1.0

### Minor Changes

- [#4398](https://github.com/Urigo/graphql-mesh/pull/4398) [`7a4023a2c`](https://github.com/Urigo/graphql-mesh/commit/7a4023a2cac2dacc8e78e10dabee65427b9a5e54) Thanks [@ardatan](https://github.com/ardatan)! - Newrelic Plugin

- [#4409](https://github.com/Urigo/graphql-mesh/pull/4409) [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f) Thanks [@ardatan](https://github.com/ardatan)! - New onDelegate hook

### Patch Changes

- Updated dependencies [[`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`df37c40f4`](https://github.com/Urigo/graphql-mesh/commit/df37c40f47c6c53949f5d5f71e062c09fe5e1bd0), [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f), [`7a4023a2c`](https://github.com/Urigo/graphql-mesh/commit/7a4023a2cac2dacc8e78e10dabee65427b9a5e54), [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f)]:
  - @graphql-mesh/cross-helpers@0.2.3
  - @graphql-mesh/types@0.81.0
  - @graphql-mesh/utils@0.41.0
