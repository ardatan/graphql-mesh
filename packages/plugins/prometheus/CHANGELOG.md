# @graphql-mesh/plugin-prometheus

## 0.107.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.9.2

## 0.107.1

### Patch Changes

- Updated dependencies
  [[`bc70d78`](https://github.com/ardatan/graphql-mesh/commit/bc70d78c7542d1ca46fe65a9886da880e7e574b7)]:
  - @graphql-mesh/serve-runtime@0.9.1

## 0.107.0

### Minor Changes

- [#7580](https://github.com/ardatan/graphql-mesh/pull/7580)
  [`75e9f63`](https://github.com/ardatan/graphql-mesh/commit/75e9f63d09514a0af786f909dc8c32ac09a1a849)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING: All types prefixed with `MeshServe`,
  now are prefixed with `Gateway`. e.g. `MeshServeRuntime` -> `GatewayRuntime`

  Runtime factory is renamed; `createServeRuntime` -> `createGatewayRuntime`

  The expected export name for config files are renamed from `serveConfig` to `gatewayConfig`

  RENAMING:

  You can rename the product, config file name etc by using the following config options;

  For example;

  ```ts
  productName = 'Mesh Gateway'
  productDescription =
    'Mesh Gateway is a GraphQL Gateway that can be used to serve a supergraph schema.'
  productLogo = '<svg>...</svg>'
  productPackageName = '@graphql-mesh/gateway'
  ```

- [#7582](https://github.com/ardatan/graphql-mesh/pull/7582)
  [`2ac3981`](https://github.com/ardatan/graphql-mesh/commit/2ac3981ce8e03ba5bfb78f8aceca7e4ed06f938a)
  Thanks [@dotansimha](https://github.com/dotansimha)! - **Breaking Change:** Rename all metrics
  options to their actual metric name to avoid confusion.

  All metric options have been moved under a mandatory `metrics` key, and the name of each options
  have been renamed to match the default metric name.

  The plugin option argument is also now mandatory.

  ```diff
  export const serveConfig = defineConfig({
    plugins: pluginCtx => [
      usePrometheus({
        ...pluginCtx,

        // Enable all available metrics
  -     fetchMetrics: true,
  -     subgraphExecute: true,
  -     subgraphExecuteErrors: true,
  -     http: true
  -     requestSummary: true,
  -     parse: true,
  -     validate: true,
  -     contextBuilding: true,
  -     execute: true,
  -     subscribe: true,
  -     errors: true,
  -     deprecatedFields: true,
  -     requestTotalDuration: true,
  -     schemaChangeCount: true,

        // Warning: enabling resolvers level metrics will introduce significant overhead
  -     resolvers: true,
  +     metrics: {
  +       graphql_gateway_fetch_duration: true,
  +       graphql_gateway_subgraph_execute_duration: true,
  +       graphql_gateway_subgraph_execute_errors
  +       graphql_yoga_http_duration: true,
  +       graphql_envelop_request_time_summary: true,
  +       graphql_envelop_phase_parse: true,
  +       graphql_envelop_phase_validate: true,
  +       graphql_envelop_phase_context: true,
  +       graphql_envelop_phase_execute: true,
  +       graphql_envelop_phase_subscribe: true,
  +       graphql_envelop_error_result: true,
  +       graphql_envelop_deprecated_field: true,
  +       graphql_envelop_request_duration: true,
  +       graphql_envelop_schema_change: true,

          // Warning: enabling resolvers level metrics will introduce significant overhead
  +       graphql_envelop_execute_resolver: true,
  +     }
      })
    ]
  })
  ```

### Patch Changes

- [#7582](https://github.com/ardatan/graphql-mesh/pull/7582)
  [`2ac3981`](https://github.com/ardatan/graphql-mesh/commit/2ac3981ce8e03ba5bfb78f8aceca7e4ed06f938a)
  Thanks [@dotansimha](https://github.com/dotansimha)! - dependencies updates:

  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@6.0.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/6.0.0)
    (from `^5.0.0`, in `dependencies`)

- [#7582](https://github.com/ardatan/graphql-mesh/pull/7582)
  [`2ac3981`](https://github.com/ardatan/graphql-mesh/commit/2ac3981ce8e03ba5bfb78f8aceca7e4ed06f938a)
  Thanks [@dotansimha](https://github.com/dotansimha)! - dependencies updates:

  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@^6.1.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/6.1.0)
    (from `^6.0.0`, in `dependencies`)
  - Added dependency [`prom-client@^15.0.0` ↗︎](https://www.npmjs.com/package/prom-client/v/15.0.0)
    (to `dependencies`)

- [#7582](https://github.com/ardatan/graphql-mesh/pull/7582)
  [`2ac3981`](https://github.com/ardatan/graphql-mesh/commit/2ac3981ce8e03ba5bfb78f8aceca7e4ed06f938a)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Add missing labels `path` and `phase` of
  `graphql_envelop_error_result` metric to the configuration.

  Add missing labels `method` and `statusCode` of `graphql_yoga_http_duration` metric to the
  configuration.

- [#7594](https://github.com/ardatan/graphql-mesh/pull/7594)
  [`9f01438`](https://github.com/ardatan/graphql-mesh/commit/9f01438fbdf327c0a4bfa0cf440d890ec871ffcc)
  Thanks [@ardatan](https://github.com/ardatan)! - Adding these plugins to serve-runtime by default,
  and make them configurable through the configuration;

  - `useResponseCache`
  - `useContentEncoding`
  - `useDeferStream`
  - `useExecutionCancellation`
  - `useUpstreamCancellation`
  - `useDisableIntrospection`
  - `useCSRFPrevention`
  - `useCustomAgent`
  - `useGenericAuth`
  - `useHMACUpstreamSignature`
  - `useWebhooks`

  In addition, the following ones are added to the serve-cli:

  - `useJWT`
  - `usePrometheus`
  - `useOpenTelemetry`
  - `useRateLimit`

- Updated dependencies
  [[`9f01438`](https://github.com/ardatan/graphql-mesh/commit/9f01438fbdf327c0a4bfa0cf440d890ec871ffcc),
  [`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d),
  [`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d),
  [`75e9f63`](https://github.com/ardatan/graphql-mesh/commit/75e9f63d09514a0af786f909dc8c32ac09a1a849),
  [`9f01438`](https://github.com/ardatan/graphql-mesh/commit/9f01438fbdf327c0a4bfa0cf440d890ec871ffcc),
  [`d4838b0`](https://github.com/ardatan/graphql-mesh/commit/d4838b0f530dc1841ad9da0cd88cb26387564012)]:
  - @graphql-mesh/serve-runtime@0.9.0
  - @graphql-mesh/utils@0.102.5
  - @graphql-mesh/types@0.102.5

## 0.106.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.8.6

## 0.106.2

### Patch Changes

- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/serve-runtime@0.8.5
  - @graphql-mesh/types@0.102.4
  - @graphql-mesh/utils@0.102.4

## 0.106.1

### Patch Changes

- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)]:
  - @graphql-mesh/serve-runtime@0.8.4
  - @graphql-mesh/types@0.102.3
  - @graphql-mesh/utils@0.102.3

## 0.106.0

### Minor Changes

- [#7407](https://github.com/ardatan/graphql-mesh/pull/7407)
  [`3ea4ea7`](https://github.com/ardatan/graphql-mesh/commit/3ea4ea7e62f4a957a3733eab59ccefd37d8b9e8e)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - **Breaking Change:** Rename all metrics
  options to their actual metric name to avoid confusion.

  All metric options have been moved under a mandatory `metrics` key, and the name of each options
  have been renamed to match the default metric name.

  The plugin option argument is also now mandatory.

  ```diff
  export const serveConfig = defineConfig({
    plugins: pluginCtx => [
      usePrometheus({
        ...pluginCtx,

        // Enable all available metrics
  -     fetchMetrics: true,
  -     subgraphExecute: true,
  -     subgraphExecuteErrors: true,
  -     http: true
  -     requestSummary: true,
  -     parse: true,
  -     validate: true,
  -     contextBuilding: true,
  -     execute: true,
  -     subscribe: true,
  -     errors: true,
  -     deprecatedFields: true,
  -     requestTotalDuration: true,
  -     schemaChangeCount: true,

        // Warning: enabling resolvers level metrics will introduce significant overhead
  -     resolvers: true,
  +     metrics: {
  +       graphql_gateway_fetch_duration: true,
  +       graphql_gateway_subgraph_execute_duration: true,
  +       graphql_gateway_subgraph_execute_errors
  +       graphql_yoga_http_duration: true,
  +       graphql_envelop_request_time_summary: true,
  +       graphql_envelop_phase_parse: true,
  +       graphql_envelop_phase_validate: true,
  +       graphql_envelop_phase_context: true,
  +       graphql_envelop_phase_execute: true,
  +       graphql_envelop_phase_subscribe: true,
  +       graphql_envelop_error_result: true,
  +       graphql_envelop_deprecated_field: true,
  +       graphql_envelop_request_duration: true,
  +       graphql_envelop_schema_change: true,

          // Warning: enabling resolvers level metrics will introduce significant overhead
  +       graphql_envelop_execute_resolver: true,
  +     }
      })
    ]
  })
  ```

### Patch Changes

- [#7407](https://github.com/ardatan/graphql-mesh/pull/7407)
  [`3ea4ea7`](https://github.com/ardatan/graphql-mesh/commit/3ea4ea7e62f4a957a3733eab59ccefd37d8b9e8e)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:

  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@^6.0.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/6.0.0)
    (from `^5.0.0`, in `dependencies`)

- [#7407](https://github.com/ardatan/graphql-mesh/pull/7407)
  [`3ea4ea7`](https://github.com/ardatan/graphql-mesh/commit/3ea4ea7e62f4a957a3733eab59ccefd37d8b9e8e)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add missing labels `path` and `phase`
  of `graphql_envelop_error_result` metric to the configuration.

  Add missing labels `method` and `statusCode` of `graphql_yoga_http_duration` metric to the
  configuration.

- Updated dependencies
  [[`3ea4ea7`](https://github.com/ardatan/graphql-mesh/commit/3ea4ea7e62f4a957a3733eab59ccefd37d8b9e8e),
  [`46f847d`](https://github.com/ardatan/graphql-mesh/commit/46f847d47e9ced84a0010c5f3a9aae5702e0f96f),
  [`416897a`](https://github.com/ardatan/graphql-mesh/commit/416897a9b8924d309e685faf92325391f7d7f687)]:
  - @graphql-mesh/serve-runtime@0.8.3

## 0.105.2

### Patch Changes

- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a),
  [`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/serve-runtime@0.8.2
  - @graphql-mesh/utils@0.102.2
  - @graphql-mesh/types@0.102.2

## 0.105.1

### Patch Changes

- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de),
  [`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de)]:
  - @graphql-mesh/serve-runtime@0.8.1
  - @graphql-mesh/utils@0.102.1
  - @graphql-mesh/types@0.102.1

## 0.105.0

### Patch Changes

- Updated dependencies
  [[`86acf63`](https://github.com/ardatan/graphql-mesh/commit/86acf6382b15e00fde87b718e84bb86e682621a8),
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373),
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)]:
  - @graphql-mesh/serve-runtime@0.8.0
  - @graphql-mesh/types@0.102.0
  - @graphql-mesh/utils@0.102.0

## 0.104.3

### Patch Changes

- Updated dependencies
  [[`eeab8fe`](https://github.com/ardatan/graphql-mesh/commit/eeab8fe6bd5d930a1faed22f8c78e302876de7af),
  [`eeab8fe`](https://github.com/ardatan/graphql-mesh/commit/eeab8fe6bd5d930a1faed22f8c78e302876de7af)]:
  - @graphql-mesh/serve-runtime@0.7.3

## 0.104.2

### Patch Changes

- [#7518](https://github.com/ardatan/graphql-mesh/pull/7518)
  [`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/serve-runtime@^0.7.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/serve-runtime/v/0.7.1)
    (from `^0.7.0`, in `dependencies`)
- Updated dependencies
  [[`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)]:
  - @graphql-mesh/serve-runtime@0.7.2

## 0.104.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.7.1

## 0.104.0

### Patch Changes

- Updated dependencies
  [[`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`1a9746f`](https://github.com/ardatan/graphql-mesh/commit/1a9746f6ca9b517230a0337d5a852bf05707303a),
  [`1d24997`](https://github.com/ardatan/graphql-mesh/commit/1d249977bbc1180f15ea0e11eece6cce1e8f2de1),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`e509a25`](https://github.com/ardatan/graphql-mesh/commit/e509a259d3080db1300c9f38ae149f648fc9159f),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`83b8cdc`](https://github.com/ardatan/graphql-mesh/commit/83b8cdc937fcb7e3cc4e2ee7a3ae3c1f12ccaf31),
  [`e509a25`](https://github.com/ardatan/graphql-mesh/commit/e509a259d3080db1300c9f38ae149f648fc9159f),
  [`e509a25`](https://github.com/ardatan/graphql-mesh/commit/e509a259d3080db1300c9f38ae149f648fc9159f),
  [`83b8cdc`](https://github.com/ardatan/graphql-mesh/commit/83b8cdc937fcb7e3cc4e2ee7a3ae3c1f12ccaf31)]:
  - @graphql-mesh/serve-runtime@0.7.0
  - @graphql-mesh/types@0.101.0
  - @graphql-mesh/utils@0.101.0

## 0.103.0

### Patch Changes

- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`d5a4cd4`](https://github.com/ardatan/graphql-mesh/commit/d5a4cd4ff93984b62d9670cc286886e62de1bc55),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7),
  [`4d1eb28`](https://github.com/ardatan/graphql-mesh/commit/4d1eb285c2b703c5f80473ad0f316004306fac7f),
  [`e2d3270`](https://github.com/ardatan/graphql-mesh/commit/e2d3270c7f32bf0a77b657546a2335572aeb0b79),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7)]:
  - @graphql-mesh/serve-runtime@0.6.0
  - @graphql-mesh/types@0.100.0
  - @graphql-mesh/utils@0.100.0

## 0.102.11

### Patch Changes

- Updated dependencies
  [[`a1bfc49`](https://github.com/ardatan/graphql-mesh/commit/a1bfc492ac3378f22b79a51824407e776b496a84)]:
  - @graphql-mesh/types@0.99.7
  - @graphql-mesh/utils@0.99.7
  - @graphql-mesh/serve-runtime@0.5.11

## 0.102.10

### Patch Changes

- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`2041e8d`](https://github.com/ardatan/graphql-mesh/commit/2041e8dafcae602aed96e51f4e9ab38113c3ccde),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/serve-runtime@0.5.10
  - @graphql-mesh/types@0.99.6
  - @graphql-mesh/utils@0.99.6

## 0.102.9

### Patch Changes

- Updated dependencies
  [[`6fc03b6`](https://github.com/ardatan/graphql-mesh/commit/6fc03b6f138ebc81a477fbf0c222ab6e1d882497),
  [`6fc03b6`](https://github.com/ardatan/graphql-mesh/commit/6fc03b6f138ebc81a477fbf0c222ab6e1d882497)]:
  - @graphql-mesh/serve-runtime@0.5.9

## 0.102.8

### Patch Changes

- Updated dependencies
  [[`7cd4d35`](https://github.com/ardatan/graphql-mesh/commit/7cd4d35100489550cef5815acd424ad85a71ec27)]:
  - @graphql-mesh/serve-runtime@0.5.8

## 0.102.7

### Patch Changes

- Updated dependencies
  [[`1905f53`](https://github.com/ardatan/graphql-mesh/commit/1905f53a65e6c73d1d305770dcfc4cba34798a09)]:
  - @graphql-mesh/serve-runtime@0.5.7

## 0.102.6

### Patch Changes

- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4),
  [`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/serve-runtime@0.5.6
  - @graphql-mesh/utils@0.99.5
  - @graphql-mesh/types@0.99.5

## 0.102.5

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

## 0.102.4

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3
  - @graphql-mesh/serve-runtime@0.5.4
  - @graphql-mesh/types@0.99.3

## 0.102.3

### Patch Changes

- Updated dependencies
  [[`f47c900`](https://github.com/ardatan/graphql-mesh/commit/f47c900d19e8c634d39e9dd90bfb1acc4f892a1f)]:
  - @graphql-mesh/serve-runtime@0.5.3

## 0.102.2

### Patch Changes

- Updated dependencies
  [[`9f6624e`](https://github.com/ardatan/graphql-mesh/commit/9f6624e327a555b3de201e67ca9f5dabca44e238),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730)]:
  - @graphql-mesh/serve-runtime@0.5.2
  - @graphql-mesh/types@0.99.2
  - @graphql-mesh/utils@0.99.2

## 0.102.1

### Patch Changes

- Updated dependencies
  [[`db05fc3`](https://github.com/ardatan/graphql-mesh/commit/db05fc3d3205ac8e2730099cf453a7a113a5d770),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`db05fc3`](https://github.com/ardatan/graphql-mesh/commit/db05fc3d3205ac8e2730099cf453a7a113a5d770)]:
  - @graphql-mesh/serve-runtime@0.5.1
  - @graphql-mesh/types@0.99.1
  - @graphql-mesh/utils@0.99.1

## 0.102.0

### Minor Changes

- [#7218](https://github.com/ardatan/graphql-mesh/pull/7218)
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add missing labels and move their
  configuration to the `labels` options to match Yoga and Envelop plugin API

### Patch Changes

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

## 0.101.4

### Patch Changes

- Updated dependencies
  [[`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`28961ed`](https://github.com/ardatan/graphql-mesh/commit/28961edfb6b4ef998fff1af6759c892c3481ba7a),
  [`25fd39a`](https://github.com/ardatan/graphql-mesh/commit/25fd39abc37fdad867707073604150b40eace062),
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)]:
  - @graphql-mesh/serve-runtime@0.4.4
  - @graphql-mesh/types@0.98.10
  - @graphql-mesh/utils@0.98.10

## 0.101.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.4.3

## 0.101.2

### Patch Changes

- Updated dependencies
  [[`141c3a6`](https://github.com/ardatan/graphql-mesh/commit/141c3a6664afdbe4202986cdc06f5fe018d5863a)]:
  - @graphql-mesh/serve-runtime@0.4.2

## 0.101.1

### Patch Changes

- Updated dependencies
  [[`d68c464`](https://github.com/ardatan/graphql-mesh/commit/d68c4642c9993c37a48004fc0d1f0574f557ca43)]:
  - @graphql-mesh/serve-runtime@0.4.1

## 0.101.0

### Patch Changes

- Updated dependencies
  [[`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae),
  [`f985978`](https://github.com/ardatan/graphql-mesh/commit/f9859784ad854207e4d32bda11c904b5301610ee),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)]:
  - @graphql-mesh/serve-runtime@0.4.0
  - @graphql-mesh/utils@0.98.9
  - @graphql-mesh/types@0.98.9

## 0.100.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.3.12

## 0.100.6

### Patch Changes

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

## 0.100.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.98.7
  - @graphql-mesh/utils@0.98.7
  - @graphql-mesh/serve-runtime@0.3.10

## 0.100.4

### Patch Changes

- Updated dependencies
  [[`56f5449`](https://github.com/ardatan/graphql-mesh/commit/56f54491e0770ca9621120c202201fd7ef3fd3fe)]:
  - @graphql-mesh/serve-runtime@0.3.9

## 0.100.3

### Patch Changes

- Updated dependencies
  [[`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/serve-runtime@0.3.8
  - @graphql-mesh/types@0.98.6
  - @graphql-mesh/utils@0.98.6

## 0.100.2

### Patch Changes

- Updated dependencies
  [[`c4d2249`](https://github.com/ardatan/graphql-mesh/commit/c4d22497b4249f9a0969e1d01efbe0721774ce73)]:
  - @graphql-mesh/utils@0.98.5
  - @graphql-mesh/serve-runtime@0.3.7
  - @graphql-mesh/types@0.98.5

## 0.100.1

### Patch Changes

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @graphql-mesh/serve-runtime@0.3.6
  - @graphql-mesh/types@0.98.4
  - @graphql-mesh/utils@0.98.4

## 0.100.0

### Minor Changes

- [#6911](https://github.com/ardatan/graphql-mesh/pull/6911)
  [`532c935`](https://github.com/ardatan/graphql-mesh/commit/532c93595d628e563ab5e4b6e6001235f3daa09d)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Adds a cache for metrics definition
  (Summary, Histogram and Counter).

  Fixes an issue preventing this plugin to be initialized multiple times, leading to metrics
  duplication error (https://github.com/ardatan/graphql-mesh/issues/6545).

  ## Behavior Breaking Change:

  Due to Prometheus client API limitations, a metric is only defined once for a given registry. This
  means that if the configuration of the metrics, it will be silently ignored on plugin
  re-initialization.

  This is to avoid potential loss of metrics data produced between the plugin re-initialization and
  the last pull by the prometheus agent.

  If you need to be sure metrics configuration is up to date after a plugin re-initialization, you
  can either:

  - restart the whole node process instead of just recreating a graphql server at runtime
  - clear the registry using `registry.clear()` before plugin re-initialization:
    ```ts
    function usePrometheusWithReset() {
      registry.clear()
      return usePrometheus({ ... })
    }
    ```
  - use a new registry for each plugin instance:
    ```ts
    function usePrometheusWithRegistry() {
      const registry = new Registry()
      return usePrometheus({
        registry,
        ...
      })
    }
    ```

  Keep in mind that this implies potential data loss in pull mode.

  ## New configuration options

  Each metrics can now be fully customized. You can use the new factories `createHistogram`,
  `createCounter` and `createSummary` to provide your own configuration for each metrics.

  **Example:**

  ```ts
  import { usePrometheus, createHistogram, createCounter, createSummary } from '@graphql-mesh/plugin-prometheus'
  import { Registry } from 'prom-client'

  const registry = new Registry()

  usePrometheus({
    registry,
    parse: createHistogram({
      registry: registry // make sure to add your custom registry, if you are not using the default one
      histogram: new Histogram({
        name: 'my_custom_name',
        help: 'HELP ME',
        labelNames: ['opText'] as const,
      }),
      fillLabelsFn: params => {
        // if you wish to fill your `labels` with metadata, you can use the params in order to get access to things like DocumentNode, operationName, operationType, `error` (for error metrics) and `info` (for resolvers metrics)
        return {
          opText: print(params.document)
        }
      }
    })
  })
  ```

### Patch Changes

- [#6911](https://github.com/ardatan/graphql-mesh/pull/6911)
  [`532c935`](https://github.com/ardatan/graphql-mesh/commit/532c93595d628e563ab5e4b6e6001235f3daa09d)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:

  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@^5.0.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/5.0.0)
    (from `^4.1.0`, in `dependencies`)

- [#6950](https://github.com/ardatan/graphql-mesh/pull/6950)
  [`db20dc0`](https://github.com/ardatan/graphql-mesh/commit/db20dc0a85fc8a4d69e843aad82b267c2d34bf5f)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@^5.0.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/5.0.0)
    (from `^4.1.0`, in `dependencies`)

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.3.5

## 0.99.4

### Patch Changes

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @graphql-mesh/serve-runtime@0.3.4
  - @graphql-mesh/types@0.98.3
  - @graphql-mesh/utils@0.98.3

## 0.99.3

### Patch Changes

- Updated dependencies
  [[`da798ac`](https://github.com/ardatan/graphql-mesh/commit/da798acf85cf7da8cd45609725dde751b4ef24a3),
  [`da798ac`](https://github.com/ardatan/graphql-mesh/commit/da798acf85cf7da8cd45609725dde751b4ef24a3)]:
  - @graphql-mesh/serve-runtime@0.3.3

## 0.99.2

### Patch Changes

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/serve-runtime@0.3.2
  - @graphql-mesh/types@0.98.2
  - @graphql-mesh/utils@0.98.2

## 0.99.1

### Patch Changes

- Updated dependencies
  [[`6044b7f`](https://github.com/ardatan/graphql-mesh/commit/6044b7f8bd72ee3d4460d9f09f303ea6fc4e007b)]:
  - @graphql-mesh/types@0.98.1
  - @graphql-mesh/utils@0.98.1
  - @graphql-mesh/serve-runtime@0.3.1

## 0.99.0

### Patch Changes

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

## 0.98.9

### Patch Changes

- Updated dependencies
  [[`05aabae`](https://github.com/ardatan/graphql-mesh/commit/05aabae48ad17f80847eb153e5fd4a96b7643d5d)]:
  - @graphql-mesh/serve-runtime@0.2.12

## 0.98.8

### Patch Changes

- Updated dependencies
  [[`9ac2245`](https://github.com/ardatan/graphql-mesh/commit/9ac2245273a561449cfc17dcafc67d0c43baf33e)]:
  - @graphql-mesh/serve-runtime@0.2.11

## 0.98.7

### Patch Changes

- Updated dependencies
  [[`8924438`](https://github.com/ardatan/graphql-mesh/commit/8924438131a7320ef160573539bddfb024bbe343)]:
  - @graphql-mesh/serve-runtime@0.2.10

## 0.98.6

### Patch Changes

- Updated dependencies
  [[`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)]:
  - @graphql-mesh/types@0.97.5
  - @graphql-mesh/utils@0.97.5
  - @graphql-mesh/serve-runtime@0.2.9

## 0.98.5

### Patch Changes

- Updated dependencies
  [[`f293329`](https://github.com/ardatan/graphql-mesh/commit/f2933295532d0760bb731e055dd2bd6e9cb2a63b)]:
  - @graphql-mesh/serve-runtime@0.2.8

## 0.98.4

### Patch Changes

- Updated dependencies
  [[`1639001`](https://github.com/ardatan/graphql-mesh/commit/16390018bd54946fbfbd2bfb8eb3ba7682966a12)]:
  - @graphql-mesh/serve-runtime@0.2.7

## 0.98.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@0.2.6

## 0.98.2

### Patch Changes

- [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f)
  Thanks [@ardatan](https://github.com/ardatan)! - Terminate handler registry

- [`3d59e68`](https://github.com/ardatan/graphql-mesh/commit/3d59e68ba7f220c10ccc9731e0c96faaae603034)
  Thanks [@ardatan](https://github.com/ardatan)! - Add `operationType` to metrics

- Updated dependencies
  [[`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)]:
  - @graphql-mesh/utils@0.97.4
  - @graphql-mesh/types@0.97.4
  - @graphql-mesh/serve-runtime@0.2.5

## 0.98.1

### Patch Changes

- [`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes on Prometheus plugin

- Updated dependencies
  [[`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)]:
  - @graphql-mesh/types@0.97.3
  - @graphql-mesh/utils@0.97.3
  - @graphql-mesh/serve-runtime@0.2.4

## 0.98.0

### Minor Changes

- [`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)
  Thanks [@ardatan](https://github.com/ardatan)! - Track Fusion subgraphs

### Patch Changes

- Updated dependencies
  [[`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)]:
  - @graphql-mesh/types@0.97.2
  - @graphql-mesh/utils@0.97.2
  - @graphql-mesh/serve-runtime@0.2.3

## 0.97.1

### Patch Changes

- Updated dependencies
  [[`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)]:
  - @graphql-mesh/types@0.97.1
  - @graphql-mesh/utils@0.97.1

## 0.97.0

### Patch Changes

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a),
  [`70b05a2`](https://github.com/ardatan/graphql-mesh/commit/70b05a20a948b5ebed5306c14710c8839225cdad)]:
  - @graphql-mesh/types@0.97.0
  - @graphql-mesh/utils@0.97.0

## 0.96.7

### Patch Changes

- Updated dependencies
  [[`0f274ef`](https://github.com/ardatan/graphql-mesh/commit/0f274ef8177068da65e50e08607998d0ed63e8b9)]:
  - @graphql-mesh/utils@0.96.6
  - @graphql-mesh/types@0.96.6

## 0.96.6

### Patch Changes

- Updated dependencies
  [[`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)]:
  - @graphql-mesh/types@0.96.5
  - @graphql-mesh/utils@0.96.5

## 0.96.5

### Patch Changes

- Updated dependencies
  [[`ae7b085`](https://github.com/ardatan/graphql-mesh/commit/ae7b085e93ba911f03bbfd2a15ff9ca8be9f4de8)]:
  - @graphql-mesh/types@0.96.4
  - @graphql-mesh/utils@0.96.4

## 0.96.4

### Patch Changes

- Updated dependencies
  [[`ac26793`](https://github.com/ardatan/graphql-mesh/commit/ac26793e59f76f0839b61a8030e0eefc7383e640)]:
  - @graphql-mesh/types@0.96.3
  - @graphql-mesh/utils@0.96.3

## 0.96.3

### Patch Changes

- [`d83b5fe`](https://github.com/ardatan/graphql-mesh/commit/d83b5fe20f66a6853d5b5c83c38607e5cf305c68)
  Thanks [@ardatan](https://github.com/ardatan)! - Ranged dependencies

## 0.96.2

### Patch Changes

- Updated dependencies
  [[`d758afa`](https://github.com/ardatan/graphql-mesh/commit/d758afa7da55cf3ed6b4ed9e8cccfd0ed67fe658),
  [`4fac014`](https://github.com/ardatan/graphql-mesh/commit/4fac01400544bc6e8b2a4ae55f1a4dd4771bbc5c)]:
  - @graphql-mesh/types@0.96.2
  - @graphql-mesh/utils@0.96.2

## 0.96.1

### Patch Changes

- [#6308](https://github.com/ardatan/graphql-mesh/pull/6308)
  [`fbc705b`](https://github.com/ardatan/graphql-mesh/commit/fbc705bb0aab11c04a4d59fd165f35189f93077d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@3.0.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/3.0.1)
    (from `3.0.0`, in `dependencies`)
- Updated dependencies []:
  - @graphql-mesh/types@0.96.1
  - @graphql-mesh/utils@0.96.1

## 0.96.0

### Patch Changes

- Updated dependencies
  [[`5c6a8f784`](https://github.com/ardatan/graphql-mesh/commit/5c6a8f784a787641b90349e584b49de629cc41ff)]:
  - @graphql-mesh/types@0.96.0
  - @graphql-mesh/utils@0.96.0

## 0.95.12

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.95.8
  - @graphql-mesh/types@0.95.8

## 0.95.11

### Patch Changes

- [#6094](https://github.com/Urigo/graphql-mesh/pull/6094)
  [`7c509bf2d`](https://github.com/Urigo/graphql-mesh/commit/7c509bf2d9f110ca0da0984d4bed783c3b267458)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@3.0.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/3.0.0)
    (from `2.0.6`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@^4.0.5 || ^5.0.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/4.0.5) (from
    `^4.0.5`, in `peerDependencies`)

## 0.95.10

### Patch Changes

- [#6052](https://github.com/Urigo/graphql-mesh/pull/6052)
  [`4a8abe263`](https://github.com/Urigo/graphql-mesh/commit/4a8abe263a25a64cf033df80b0dacdd2c0e35203)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`prom-client@^13 || ^14.0.0 || ^15.0.0` ↗︎](https://www.npmjs.com/package/prom-client/v/13.0.0)
    (from `^13 || ^14.0.0`, in `peerDependencies`)
- Updated dependencies
  [[`a13969c77`](https://github.com/Urigo/graphql-mesh/commit/a13969c77794c44493d7a9426be7e38a6d673c88)]:
  - @graphql-mesh/types@0.95.7
  - @graphql-mesh/utils@0.95.7

## 0.95.9

### Patch Changes

- [#6017](https://github.com/Urigo/graphql-mesh/pull/6017)
  [`ce4a580fb`](https://github.com/Urigo/graphql-mesh/commit/ce4a580fb2773bf0b401d4dffbcbedf0bf729de8)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@2.0.6` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/2.0.6)
    (from `2.0.5`, in `dependencies`)

## 0.95.8

### Patch Changes

- [#6018](https://github.com/Urigo/graphql-mesh/pull/6018)
  [`41005ff7d`](https://github.com/Urigo/graphql-mesh/commit/41005ff7d240ef7803c7fcca0504aaf84be850b0)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`graphql-yoga@^4.0.5` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/4.0.5) (from `4.0.4`,
    in `peerDependencies`)

## 0.95.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.95.6
  - @graphql-mesh/types@0.95.6

## 0.95.6

### Patch Changes

- Updated dependencies
  [[`b8f16a42b`](https://github.com/Urigo/graphql-mesh/commit/b8f16a42bf599723c2e311c47e74f812c6d1b781)]:
  - @graphql-mesh/types@0.95.5
  - @graphql-mesh/utils@0.95.5

## 0.95.5

### Patch Changes

- Updated dependencies
  [[`625e5d787`](https://github.com/Urigo/graphql-mesh/commit/625e5d7878d44abd7c9d1542bf5cdcd4e37e2411)]:
  - @graphql-mesh/types@0.95.4
  - @graphql-mesh/utils@0.95.4

## 0.95.4

### Patch Changes

- [#5932](https://github.com/Urigo/graphql-mesh/pull/5932)
  [`eeb36bf8c`](https://github.com/Urigo/graphql-mesh/commit/eeb36bf8c859fc9fcdfeb7df33b1689ee0f29890)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@2.0.5` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/2.0.5)
    (from `2.0.4`, in `dependencies`)
- Updated dependencies
  [[`33ae7a89a`](https://github.com/Urigo/graphql-mesh/commit/33ae7a89a13f40ebbe0a01620e378fe4a914df7f)]:
  - @graphql-mesh/types@0.95.3
  - @graphql-mesh/utils@0.95.3

## 0.95.3

### Patch Changes

- [#5824](https://github.com/Urigo/graphql-mesh/pull/5824)
  [`d175a50c2`](https://github.com/Urigo/graphql-mesh/commit/d175a50c29fbe31aeed43dd493a75500f01300a3)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@2.0.4` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/2.0.4)
    (from `2.0.3`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@4.0.4` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/4.0.4) (from `4.0.3`, in
    `peerDependencies`)

## 0.95.2

### Patch Changes

- Updated dependencies
  [[`d8da4b282`](https://github.com/Urigo/graphql-mesh/commit/d8da4b282ab15ab6d0ea24c78c172e31fa1170ea)]:
  - @graphql-mesh/types@0.95.2
  - @graphql-mesh/utils@0.95.2

## 0.95.1

### Patch Changes

- Updated dependencies
  [[`7cdc69e04`](https://github.com/Urigo/graphql-mesh/commit/7cdc69e0454ab99ea5c3b8072ac28da8f81a8796)]:
  - @graphql-mesh/types@0.95.1
  - @graphql-mesh/utils@0.95.1

## 0.95.0

### Patch Changes

- Updated dependencies
  [[`bb50c4f94`](https://github.com/Urigo/graphql-mesh/commit/bb50c4f941caa59d69186d1415dce5773596e8bc)]:
  - @graphql-mesh/types@0.95.0
  - @graphql-mesh/utils@0.95.0

## 0.94.8

### Patch Changes

- Updated dependencies
  [[`d1310cdff`](https://github.com/Urigo/graphql-mesh/commit/d1310cdff53c53d5342e28b7c0c1af1dd25c6c75)]:
  - @graphql-mesh/utils@0.94.6
  - @graphql-mesh/types@0.94.6

## 0.94.7

### Patch Changes

- Updated dependencies
  [[`f11e9b307`](https://github.com/Urigo/graphql-mesh/commit/f11e9b307f1336d5ead9a75befdb61de963c6c5b)]:
  - @graphql-mesh/utils@0.94.5
  - @graphql-mesh/types@0.94.5

## 0.94.6

### Patch Changes

- Updated dependencies
  [[`ff1678eea`](https://github.com/Urigo/graphql-mesh/commit/ff1678eeabec67edaa4991b938ef81437cd9361e)]:
  - @graphql-mesh/types@0.94.4
  - @graphql-mesh/utils@0.94.4

## 0.94.5

### Patch Changes

- [#5626](https://github.com/Urigo/graphql-mesh/pull/5626)
  [`fba66c6fc`](https://github.com/Urigo/graphql-mesh/commit/fba66c6fc7a0ca15393df8ae5382d97eb0ae8fcf)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@2.0.3` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/2.0.3)
    (from `2.0.2`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@4.0.3` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/4.0.3) (from `4.0.2`, in
    `peerDependencies`)
- Updated dependencies []:
  - @graphql-mesh/utils@0.94.3
  - @graphql-mesh/types@0.94.3

## 0.94.4

### Patch Changes

- Updated dependencies
  [[`d0d4917f4`](https://github.com/Urigo/graphql-mesh/commit/d0d4917f405d7d6acfba62abef38909e1398ce7c)]:
  - @graphql-mesh/types@0.94.2
  - @graphql-mesh/utils@0.94.2

## 0.94.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.94.1
  - @graphql-mesh/utils@0.94.1

## 0.94.2

### Patch Changes

- [#5601](https://github.com/Urigo/graphql-mesh/pull/5601)
  [`cb399b206`](https://github.com/Urigo/graphql-mesh/commit/cb399b20672514f8e47b769e254e9812301d1c69)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@2.0.2` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/2.0.2)
    (from `2.0.1`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@4.0.2` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/4.0.2) (from `4.0.1`, in
    `peerDependencies`)

## 0.94.1

### Patch Changes

- [#5582](https://github.com/Urigo/graphql-mesh/pull/5582)
  [`daee20bab`](https://github.com/Urigo/graphql-mesh/commit/daee20babb4c833cc94b5acd54cab32bc4d3031c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@2.0.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/2.0.1)
    (from `2.0.0`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@4.0.1` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/4.0.1) (from `4.0.0`, in
    `peerDependencies`)

## 0.94.0

### Minor Changes

- [#5449](https://github.com/Urigo/graphql-mesh/pull/5449)
  [`ef520d91e`](https://github.com/Urigo/graphql-mesh/commit/ef520d91e6d1800ed63ef016ed74084261788371)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support and require Node 16 or
  higher

### Patch Changes

- [#5516](https://github.com/Urigo/graphql-mesh/pull/5516)
  [`6f22ed875`](https://github.com/Urigo/graphql-mesh/commit/6f22ed875707a2c6616ecbc48516b095f89351da)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@2.0.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/2.0.0)
    (from `1.9.1`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@4.0.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/4.0.0) (from `3.9.1`, in
    `peerDependencies`)
- Updated dependencies
  [[`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`4296a55f4`](https://github.com/Urigo/graphql-mesh/commit/4296a55f4a6fb1c8e1701403cfe88067255ae9b7),
  [`e881ea609`](https://github.com/Urigo/graphql-mesh/commit/e881ea609a1d355356c1dc04c7a42b00b6e86e0d),
  [`01fb0cc85`](https://github.com/Urigo/graphql-mesh/commit/01fb0cc858dfbf2cd931d1b08b0749a0b82b232c),
  [`ef520d91e`](https://github.com/Urigo/graphql-mesh/commit/ef520d91e6d1800ed63ef016ed74084261788371)]:
  - @graphql-mesh/types@0.94.0
  - @graphql-mesh/utils@0.94.0

## 0.93.1

### Patch Changes

- [#5365](https://github.com/Urigo/graphql-mesh/pull/5365)
  [`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/types@^0.93.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.93.0)
    (from `^1.0.0`, in `peerDependencies`)
  - Updated dependency
    [`@graphql-mesh/utils@^0.93.0` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.93.0)
    (from `^1.0.0`, in `peerDependencies`)
- Updated dependencies
  [[`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8),
  [`1dd9a6940`](https://github.com/Urigo/graphql-mesh/commit/1dd9a694092094c7f00c6ca53686becadee62cb8)]:
  - @graphql-mesh/types@0.93.1
  - @graphql-mesh/utils@0.93.1

## 1.0.0

### Patch Changes

- [#5345](https://github.com/Urigo/graphql-mesh/pull/5345)
  [`0da46e1e6`](https://github.com/Urigo/graphql-mesh/commit/0da46e1e6de9d9f49e1a4444784689a992f4e678)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.9.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.9.1)
    (from `1.9.0`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.9.1` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.9.1) (from `3.9.0`, in
    `peerDependencies`)
- Updated dependencies
  [[`cff645677`](https://github.com/Urigo/graphql-mesh/commit/cff645677c680e248ed718e5bb98ece5a41f9c0f),
  [`cff645677`](https://github.com/Urigo/graphql-mesh/commit/cff645677c680e248ed718e5bb98ece5a41f9c0f),
  [`72fe781c1`](https://github.com/Urigo/graphql-mesh/commit/72fe781c15f20ad2af792b8245aedfdcc742e048),
  [`a597261db`](https://github.com/Urigo/graphql-mesh/commit/a597261dbb4f18c47bf7323695e853950ae500df)]:
  - @graphql-mesh/types@1.0.0
  - @graphql-mesh/utils@1.0.0

## 0.5.10

### Patch Changes

- [#5328](https://github.com/Urigo/graphql-mesh/pull/5328)
  [`0d73b3f71`](https://github.com/Urigo/graphql-mesh/commit/0d73b3f71e847d751eea130df62d795c3b06a192)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.9.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.9.0)
    (from `1.8.0`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.9.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.9.0) (from `3.8.0`, in
    `peerDependencies`)
- Updated dependencies
  [[`0d73b3f71`](https://github.com/Urigo/graphql-mesh/commit/0d73b3f71e847d751eea130df62d795c3b06a192),
  [`0d73b3f71`](https://github.com/Urigo/graphql-mesh/commit/0d73b3f71e847d751eea130df62d795c3b06a192),
  [`ed2232e71`](https://github.com/Urigo/graphql-mesh/commit/ed2232e715c1dadc3817d8b3b469f75ddbae6ac6)]:
  - @graphql-mesh/types@0.91.15
  - @graphql-mesh/utils@0.43.23

## 0.5.9

### Patch Changes

- [#5263](https://github.com/Urigo/graphql-mesh/pull/5263)
  [`5156add74`](https://github.com/Urigo/graphql-mesh/commit/5156add74c011b7cfcdc5f56245676d327153229)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.8.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.8.0)
    (from `1.7.3`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.8.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.8.0) (from `3.7.3`, in
    `peerDependencies`)
- Updated dependencies
  [[`870de5dae`](https://github.com/Urigo/graphql-mesh/commit/870de5dae08a7e43d9aa0f52d5d504cffb4d8fc8),
  [`aea134764`](https://github.com/Urigo/graphql-mesh/commit/aea1347645c322437ed6ccfadabcfc23065bc9c8),
  [`a1e08193b`](https://github.com/Urigo/graphql-mesh/commit/a1e08193be3ac8cab5f6f8c84025f934134369b6),
  [`6aa7da6f8`](https://github.com/Urigo/graphql-mesh/commit/6aa7da6f8492adb1af5598e501d089b7b008637a)]:
  - @graphql-mesh/types@0.91.13
  - @graphql-mesh/utils@0.43.21

## 0.5.8

### Patch Changes

- [#5252](https://github.com/Urigo/graphql-mesh/pull/5252)
  [`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)
  Thanks [@ardatan](https://github.com/ardatan)! - Make shared packages peer dependency

- Updated dependencies
  [[`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)]:
  - @graphql-mesh/types@0.91.12
  - @graphql-mesh/utils@0.43.20

## 0.5.7

### Patch Changes

- [#5192](https://github.com/Urigo/graphql-mesh/pull/5192)
  [`7e7096695`](https://github.com/Urigo/graphql-mesh/commit/7e709669564fa427332b8af00bc66234485f3d54)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.7.3` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.7.3)
    (from `1.7.0`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.7.3` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.7.3) (from `3.7.0`, in
    `peerDependencies`)
- Updated dependencies
  [[`7e7096695`](https://github.com/Urigo/graphql-mesh/commit/7e709669564fa427332b8af00bc66234485f3d54)]:
  - @graphql-mesh/types@0.91.11
  - @graphql-mesh/utils@0.43.19

## 0.5.6

### Patch Changes

- Updated dependencies
  [[`3f658a771`](https://github.com/Urigo/graphql-mesh/commit/3f658a7711cd68bc7451c1494699c5ffb8e919ce)]:
  - @graphql-mesh/utils@0.43.18
  - @graphql-mesh/types@0.91.10

## 0.5.5

### Patch Changes

- Updated dependencies
  [[`a272fdbca`](https://github.com/Urigo/graphql-mesh/commit/a272fdbca655b17119fb1dcb1c44498f387b1edc)]:
  - @graphql-mesh/types@0.91.9
  - @graphql-mesh/utils@0.43.17

## 0.5.4

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.91.8
  - @graphql-mesh/utils@0.43.16

## 0.5.3

### Patch Changes

- Updated dependencies
  [[`fa2c010c1`](https://github.com/Urigo/graphql-mesh/commit/fa2c010c13f95ce401c345a1330d8fddabeebc17)]:
  - @graphql-mesh/utils@0.43.15
  - @graphql-mesh/types@0.91.7

## 0.5.2

### Patch Changes

- [#5167](https://github.com/Urigo/graphql-mesh/pull/5167)
  [`ab08c2af5`](https://github.com/Urigo/graphql-mesh/commit/ab08c2af559aee4ee009c1bafceab7f5d1e87321)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.7.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.7.0)
    (from `1.6.1`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.7.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.7.0) (from `3.6.0`, in
    `peerDependencies`)
- Updated dependencies
  [[`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391),
  [`0b438c329`](https://github.com/Urigo/graphql-mesh/commit/0b438c32950f524db65163d67f6a64f451214391)]:
  - @graphql-mesh/types@0.91.6
  - @graphql-mesh/utils@0.43.14

## 0.5.1

### Patch Changes

- Updated dependencies
  [[`5c19f8d6f`](https://github.com/Urigo/graphql-mesh/commit/5c19f8d6f79f2d9bfbeb6458c8dc7a1729c37db9)]:
  - @graphql-mesh/types@0.91.5
  - @graphql-mesh/utils@0.43.13

## 0.5.0

### Minor Changes

- [#5145](https://github.com/Urigo/graphql-mesh/pull/5145)
  [`63ab17f0b`](https://github.com/Urigo/graphql-mesh/commit/63ab17f0bd402b5a3923d752ba715f556f3beadd)
  Thanks [@madorb](https://github.com/madorb)! - `fetchRequestHeaders`, `fetchResponseHeaders`,
  `httpRequestHeaders` and `httpResponseHeaders`

### Patch Changes

- [#5148](https://github.com/Urigo/graphql-mesh/pull/5148)
  [`38e55054c`](https://github.com/Urigo/graphql-mesh/commit/38e55054cebb1464a3e1efc001ae36f54859edf1)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.6.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.6.1)
    (from `1.6.0`, in `dependencies`)
- Updated dependencies
  [[`63ab17f0b`](https://github.com/Urigo/graphql-mesh/commit/63ab17f0bd402b5a3923d752ba715f556f3beadd)]:
  - @graphql-mesh/types@0.91.4
  - @graphql-mesh/utils@0.43.12

## 0.4.6

### Patch Changes

- [#5137](https://github.com/Urigo/graphql-mesh/pull/5137)
  [`4d61de74e`](https://github.com/Urigo/graphql-mesh/commit/4d61de74ee4bc288eb488c55ae2597b1cb5654a1)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`graphql-yoga@3.6.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.6.0) (from `3.5.1`, in
    `peerDependencies`)

## 0.4.5

### Patch Changes

- Updated dependencies
  [[`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e),
  [`8c9c39cf5`](https://github.com/Urigo/graphql-mesh/commit/8c9c39cf56c0cd0e3e3908b5c54cb4c1bca4151e)]:
  - @graphql-mesh/types@0.91.3
  - @graphql-mesh/utils@0.43.11

## 0.4.4

### Patch Changes

- Updated dependencies
  [[`989a47802`](https://github.com/Urigo/graphql-mesh/commit/989a478027b703ab969d529f09bc83071fe4f96f)]:
  - @graphql-mesh/types@0.91.2
  - @graphql-mesh/utils@0.43.10

## 0.4.3

### Patch Changes

- [#5126](https://github.com/Urigo/graphql-mesh/pull/5126)
  [`f5fb8e392`](https://github.com/Urigo/graphql-mesh/commit/f5fb8e392971e99ab52a06c249235ada265f96e0)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.6.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.6.0)
    (from `1.5.1`, in `dependencies`)

## 0.4.2

### Patch Changes

- Updated dependencies
  [[`d694ccc1f`](https://github.com/Urigo/graphql-mesh/commit/d694ccc1f5a2cbc3ed97778a3210594005f2830b)]:
  - @graphql-mesh/utils@0.43.9
  - @graphql-mesh/types@0.91.1

## 0.4.1

### Patch Changes

- [#5091](https://github.com/Urigo/graphql-mesh/pull/5091)
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.5.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.5.1)
    (from `1.4.0`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.5.1` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.5.1) (from `3.4.0`, in
    `peerDependencies`)
- Updated dependencies
  [[`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`89bb72165`](https://github.com/Urigo/graphql-mesh/commit/89bb7216580a05740a377962ae988a3674b6282e),
  [`7e8bb87dd`](https://github.com/Urigo/graphql-mesh/commit/7e8bb87ddf4cb1210db6873334bdd18007cc0552)]:
  - @graphql-mesh/types@0.91.0
  - @graphql-mesh/utils@0.43.8

## 0.4.0

### Minor Changes

- [`bcf29dfd0`](https://github.com/Urigo/graphql-mesh/commit/bcf29dfd02d19cf5c770b83fc627f059569a0fac)
  Thanks [@ardatan](https://github.com/ardatan)! - Now you can customize the names of the metrics

### Patch Changes

- [#5080](https://github.com/Urigo/graphql-mesh/pull/5080)
  [`93692213a`](https://github.com/Urigo/graphql-mesh/commit/93692213a7397110a4ad87cb7d4c752f947f2013)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.4.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.4.0)
    (from `1.3.0`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.4.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.4.0) (from `3.3.0`, in
    `peerDependencies`)
- Updated dependencies
  [[`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72),
  [`2005d2b28`](https://github.com/Urigo/graphql-mesh/commit/2005d2b2864b13ae163e86b9ea6627f2a4b2ff72),
  [`bcf29dfd0`](https://github.com/Urigo/graphql-mesh/commit/bcf29dfd02d19cf5c770b83fc627f059569a0fac)]:
  - @graphql-mesh/types@0.90.0
  - @graphql-mesh/utils@0.43.7

## 0.3.8

### Patch Changes

- Updated dependencies
  [[`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5),
  [`ed5843d8a`](https://github.com/Urigo/graphql-mesh/commit/ed5843d8a771045eed61cdad33b72734666577d5)]:
  - @graphql-mesh/types@0.89.5
  - @graphql-mesh/utils@0.43.6

## 0.3.7

### Patch Changes

- [#4991](https://github.com/Urigo/graphql-mesh/pull/4991)
  [`bb5abc15d`](https://github.com/Urigo/graphql-mesh/commit/bb5abc15d8ff9227f5fc9fafe78d1befc7ae0797)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.3.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.3.0)
    (from `1.2.1`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.3.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.3.0) (from `3.2.1`, in
    `peerDependencies`)

- [#4930](https://github.com/Urigo/graphql-mesh/pull/4930)
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Prettier fixes

- Updated dependencies
  [[`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`994813331`](https://github.com/Urigo/graphql-mesh/commit/99481333186e8471207e21ad14c7883f7215ce1c),
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664),
  [`d573d203f`](https://github.com/Urigo/graphql-mesh/commit/d573d203f8bb04ff75cb4d83ba0deaa2bf9818a7)]:
  - @graphql-mesh/types@0.89.4
  - @graphql-mesh/utils@0.43.5

## 0.3.6

### Patch Changes

- [#4980](https://github.com/Urigo/graphql-mesh/pull/4980)
  [`e701041f3`](https://github.com/Urigo/graphql-mesh/commit/e701041f315e918e74719e2f89e946f56320157e)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`graphql-yoga@3.2.1` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.2.1) (from `3.2.0`, in
    `peerDependencies`)

## 0.3.5

### Patch Changes

- [#4965](https://github.com/Urigo/graphql-mesh/pull/4965)
  [`06db3cd64`](https://github.com/Urigo/graphql-mesh/commit/06db3cd6479853e536e36cc2619c94dea9c7e5ed)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.2.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.2.1)
    (from `1.1.1`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.2.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.2.0) (from `3.1.1`, in
    `peerDependencies`)

## 0.3.4

### Patch Changes

- Updated dependencies
  [[`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9),
  [`99f4c84e6`](https://github.com/Urigo/graphql-mesh/commit/99f4c84e619996bc4f392bc81c33022b8678e0d9)]:
  - @graphql-mesh/types@0.89.3
  - @graphql-mesh/utils@0.43.4

## 0.3.3

### Patch Changes

- Updated dependencies
  [[`deb9912e0`](https://github.com/Urigo/graphql-mesh/commit/deb9912e0bc2ae782c9570b60a7224b47af341eb)]:
  - @graphql-mesh/types@0.89.2
  - @graphql-mesh/utils@0.43.3

## 0.3.2

### Patch Changes

- Updated dependencies
  [[`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43),
  [`f1c2e20e5`](https://github.com/Urigo/graphql-mesh/commit/f1c2e20e5228425dc220986d85653fc7f3811e43)]:
  - @graphql-mesh/types@0.89.1
  - @graphql-mesh/utils@0.43.2

## 0.3.1

### Patch Changes

- Updated dependencies
  [[`3edaa00ac`](https://github.com/Urigo/graphql-mesh/commit/3edaa00ac772d519e351e620bfa670514db886e5)]:
  - @graphql-mesh/types@0.89.0
  - @graphql-mesh/utils@0.43.1

## 0.3.0

### Minor Changes

- [#4821](https://github.com/Urigo/graphql-mesh/pull/4821)
  [`1a28c92c2`](https://github.com/Urigo/graphql-mesh/commit/1a28c92c2d67b89b48581b7bb1414d1404428cdb)
  Thanks [@ardatan](https://github.com/ardatan)! - Update build flow to fully support both CommonJS
  and ESM

### Patch Changes

- [#4878](https://github.com/Urigo/graphql-mesh/pull/4878)
  [`c047b3088`](https://github.com/Urigo/graphql-mesh/commit/c047b3088e91fec2265dc84ce82d5d45d3429609)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.1.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.1.1)
    (from `1.1.0`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.1.1` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.1.1) (from `3.1.0`, in
    `peerDependencies`)
- Updated dependencies
  [[`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f),
  [`500a4504c`](https://github.com/Urigo/graphql-mesh/commit/500a4504c734ee1eaf55daa2296789096034513f),
  [`1a28c92c2`](https://github.com/Urigo/graphql-mesh/commit/1a28c92c2d67b89b48581b7bb1414d1404428cdb)]:
  - @graphql-mesh/types@0.88.0
  - @graphql-mesh/utils@0.43.0

## 0.2.15

### Patch Changes

- Updated dependencies
  [[`eba73c626`](https://github.com/Urigo/graphql-mesh/commit/eba73c6261a2fdde8ece31915202203b70ff0e5f)]:
  - @graphql-mesh/utils@0.42.9
  - @graphql-mesh/types@0.87.1

## 0.2.14

### Patch Changes

- [#4856](https://github.com/Urigo/graphql-mesh/pull/4856)
  [`8b25eb578`](https://github.com/Urigo/graphql-mesh/commit/8b25eb578c293ef72de70301f2e24dc0c22ba75b)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.1.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.1.0)
    (from `1.0.3`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.1.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.1.0) (from `3.0.3`, in
    `peerDependencies`)

## 0.2.13

### Patch Changes

- Updated dependencies
  [[`0d9771428`](https://github.com/Urigo/graphql-mesh/commit/0d97714284a6eea31c2c9420addd4a1518584924),
  [`686b3301b`](https://github.com/Urigo/graphql-mesh/commit/686b3301b2441bc095a379d95e77686b4f5ceb70)]:
  - @graphql-mesh/types@0.87.0
  - @graphql-mesh/utils@0.42.8

## 0.2.12

### Patch Changes

- [#4846](https://github.com/Urigo/graphql-mesh/pull/4846)
  [`968bb382e`](https://github.com/Urigo/graphql-mesh/commit/968bb382e40674adb85e7a3a53e94683dd070aae)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.0.2` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.0.2)
    (from `1.0.1`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.0.2` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.0.2) (from `3.0.1`, in
    `peerDependencies`)

- [#4850](https://github.com/Urigo/graphql-mesh/pull/4850)
  [`7df7c644d`](https://github.com/Urigo/graphql-mesh/commit/7df7c644d85c00c0c0c3f8907854bbef50d298eb)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.0.3` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.0.3)
    (from `1.0.2`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.0.3` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.0.3) (from `3.0.2`, in
    `peerDependencies`)

## 0.2.11

### Patch Changes

- [#4835](https://github.com/Urigo/graphql-mesh/pull/4835)
  [`ef6cc3b25`](https://github.com/Urigo/graphql-mesh/commit/ef6cc3b2565b8efd0c6c0dfbc8040747b8d80573)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`graphql-yoga@3.0.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.0.0) (from
    `3.0.0-next.12`, in `peerDependencies`)

- [#4837](https://github.com/Urigo/graphql-mesh/pull/4837)
  [`b0adaa48c`](https://github.com/Urigo/graphql-mesh/commit/b0adaa48cf9f389ead587a23decd4750a74d8f55)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.0.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.0.1)
    (from `1.0.0`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.0.1` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.0.1) (from `3.0.0`, in
    `peerDependencies`)

## 0.2.10

### Patch Changes

- [#4806](https://github.com/Urigo/graphql-mesh/pull/4806)
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.0.0-next.6` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.0.0)
    (from `1.0.0-next.4`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.0.0-next.12` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.0.0) (from
    `3.0.0-next.10`, in `peerDependencies`)

- [#4809](https://github.com/Urigo/graphql-mesh/pull/4809)
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.0.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.0.0)
    (from `1.0.0-next.6`, in `dependencies`)
- Updated dependencies
  [[`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33),
  [`8c7d96cff`](https://github.com/Urigo/graphql-mesh/commit/8c7d96cff868095216520bafebe989ec94a9df65),
  [`990f649ef`](https://github.com/Urigo/graphql-mesh/commit/990f649ef8832bc786b89b0c15744d49a422bb03),
  [`db95881b5`](https://github.com/Urigo/graphql-mesh/commit/db95881b530053064425f476ccac7d552d44af33),
  [`76deb32d1`](https://github.com/Urigo/graphql-mesh/commit/76deb32d1c036bc8da171be55582ec3f7b9c5015),
  [`baa4fbf82`](https://github.com/Urigo/graphql-mesh/commit/baa4fbf82af4a8787b9cab8c99e9177e3491ecf8),
  [`cf9c6d5e0`](https://github.com/Urigo/graphql-mesh/commit/cf9c6d5e00e41f2403bcb9ad1a6e403390ff3ec6)]:
  - @graphql-mesh/types@0.86.0
  - @graphql-mesh/utils@0.42.7

## 0.2.9

### Patch Changes

- [#4773](https://github.com/Urigo/graphql-mesh/pull/4773)
  [`d9c5c1195`](https://github.com/Urigo/graphql-mesh/commit/d9c5c119522a1c4cad455d62818e07a2b8f41005)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.0.0-next.3` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.0.0)
    (from `1.0.0-next.2`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.0.0-next.9` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.0.0) (from
    `3.0.0-next.8`, in `peerDependencies`)

- [#4780](https://github.com/Urigo/graphql-mesh/pull/4780)
  [`8e94f36a7`](https://github.com/Urigo/graphql-mesh/commit/8e94f36a77a1e666144c6a8797e0049ab64062d9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.0.0-next.4` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.0.0)
    (from `1.0.0-next.3`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.0.0-next.10` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.0.0) (from
    `3.0.0-next.9`, in `peerDependencies`)
- Updated dependencies
  [[`d9c5c1195`](https://github.com/Urigo/graphql-mesh/commit/d9c5c119522a1c4cad455d62818e07a2b8f41005),
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a),
  [`85e5071d0`](https://github.com/Urigo/graphql-mesh/commit/85e5071d084d5372830213511f55f4a30a17bb33),
  [`d9c5c1195`](https://github.com/Urigo/graphql-mesh/commit/d9c5c119522a1c4cad455d62818e07a2b8f41005),
  [`a764fe0d3`](https://github.com/Urigo/graphql-mesh/commit/a764fe0d36928cd830e79942f8ab57cd70d2602a),
  [`85e5071d0`](https://github.com/Urigo/graphql-mesh/commit/85e5071d084d5372830213511f55f4a30a17bb33),
  [`c55e68381`](https://github.com/Urigo/graphql-mesh/commit/c55e683816bd5668fa9e520e6e434363a2a78425)]:
  - @graphql-mesh/types@0.85.7
  - @graphql-mesh/utils@0.42.6

## 0.2.8

### Patch Changes

- Updated dependencies
  [[`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a),
  [`f26714af8`](https://github.com/Urigo/graphql-mesh/commit/f26714af8afff2eb5384f7294f5d8856eb5cf20a)]:
  - @graphql-mesh/types@0.85.6
  - @graphql-mesh/utils@0.42.5

## 0.2.7

### Patch Changes

- Updated dependencies
  [[`d5f2d950e`](https://github.com/Urigo/graphql-mesh/commit/d5f2d950e6318a74c062c9dbc436d5e9c0e8d59d)]:
  - @graphql-mesh/utils@0.42.4
  - @graphql-mesh/types@0.85.5

## 0.2.6

### Patch Changes

- [#4748](https://github.com/Urigo/graphql-mesh/pull/4748)
  [`305dd2262`](https://github.com/Urigo/graphql-mesh/commit/305dd2262054f4173384c0af8f90e8879411bbe0)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.0.0-next.2` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.0.0)
    (from `1.0.0-next.1`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.0.0-next.8` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.0.0) (from
    `3.0.0-next.7`, in `peerDependencies`)
- Updated dependencies
  [[`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd),
  [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd)]:
  - @graphql-mesh/types@0.85.4
  - @graphql-mesh/utils@0.42.3

## 0.2.5

### Patch Changes

- [#4732](https://github.com/Urigo/graphql-mesh/pull/4732)
  [`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/utils@0.42.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.42.1)
    (from `0.42.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@0.85.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.85.2)
    (from `0.85.1`, in `dependencies`)
- Updated dependencies
  [[`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56),
  [`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56)]:
  - @graphql-mesh/types@0.85.3
  - @graphql-mesh/utils@0.42.2

## 0.2.4

### Patch Changes

- [#4728](https://github.com/Urigo/graphql-mesh/pull/4728)
  [`c72d904dc`](https://github.com/Urigo/graphql-mesh/commit/c72d904dc11adfd3b6ee1695b1aaeae6ab64e1e9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/plugin-prometheus@1.0.0-next.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-prometheus/v/1.0.0)
    (from `1.0.0-next.0`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@3.0.0-next.7` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.0.0) (from
    `3.0.0-next.6`, in `peerDependencies`)
- Updated dependencies
  [[`09c286994`](https://github.com/Urigo/graphql-mesh/commit/09c28699441cda92f79e4e9b8464e7be5f46a786)]:
  - @graphql-mesh/types@0.85.2
  - @graphql-mesh/utils@0.42.1

## 0.2.3

### Patch Changes

- [`49765b2c3`](https://github.com/Urigo/graphql-mesh/commit/49765b2c321a5fcb1511ac57f56701dc17fae835)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Yoga

## 0.2.2

### Patch Changes

- Updated dependencies
  [[`398af2bf6`](https://github.com/Urigo/graphql-mesh/commit/398af2bf602182ca315bc8d99d2237ad1a16ee48),
  [`1d61fbcec`](https://github.com/Urigo/graphql-mesh/commit/1d61fbcecb8d5b286bb1c2e727bdf7d233c566da)]:
  - @graphql-mesh/types@0.85.1
  - @graphql-mesh/utils@0.42.0

## 0.2.1

### Patch Changes

- [#4296](https://github.com/Urigo/graphql-mesh/pull/4296)
  [`a863ea13f`](https://github.com/Urigo/graphql-mesh/commit/a863ea13f0ce679c511a3646b158690cf35d6714)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@envelop/prometheus@7.0.2` ↗︎](https://www.npmjs.com/package/@envelop/prometheus/v/7.0.2)
    (from `6.6.0`, in `dependencies`)

- [#4689](https://github.com/Urigo/graphql-mesh/pull/4689)
  [`2b619b732`](https://github.com/Urigo/graphql-mesh/commit/2b619b732d35355855b4a4175a0c3050f14d9fda)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`graphql-yoga@3.0.0-next.5` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/3.0.0) (from
    `3.0.0-next.4`, in `peerDependencies`)

- [#4690](https://github.com/Urigo/graphql-mesh/pull/4690)
  [`a05b1a96a`](https://github.com/Urigo/graphql-mesh/commit/a05b1a96a5fbe1d47d41205e6003e2f30c1bb61c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/prometheus@7.0.2` ↗︎](https://www.npmjs.com/package/@envelop/prometheus/v/7.0.2)
    (from `6.6.0`, in `dependencies`)

## 0.2.0

### Minor Changes

- [`814f2d516`](https://github.com/Urigo/graphql-mesh/commit/814f2d51692df593fcf368765e9c8a0ce99f46bd)
  Thanks [@ardatan](https://github.com/ardatan)! - Add `endpoint` option to expose it via HTTP
  server

### Patch Changes

- Updated dependencies
  [[`6fb57d3ba`](https://github.com/Urigo/graphql-mesh/commit/6fb57d3ba6ce68e47d9f5dbf54e57d178441fa18),
  [`814f2d516`](https://github.com/Urigo/graphql-mesh/commit/814f2d51692df593fcf368765e9c8a0ce99f46bd)]:
  - @graphql-mesh/types@0.85.0
  - @graphql-mesh/utils@0.41.22

## 0.1.20

### Patch Changes

- Updated dependencies
  [[`637e9e9d8`](https://github.com/Urigo/graphql-mesh/commit/637e9e9d8a702cf28cde48137a0f73bab7628f6d)]:
  - @graphql-mesh/types@0.84.10
  - @graphql-mesh/utils@0.41.21

## 0.1.19

### Patch Changes

- Updated dependencies
  [[`dd831a7d1`](https://github.com/Urigo/graphql-mesh/commit/dd831a7d1256400d1b7441cfb99b517cf856ce5b)]:
  - @graphql-mesh/types@0.84.9
  - @graphql-mesh/utils@0.41.20

## 0.1.18

### Patch Changes

- Updated dependencies
  [[`5b44abcd2`](https://github.com/Urigo/graphql-mesh/commit/5b44abcd2aaa765ee329539112d9dface063efa6)]:
  - @graphql-mesh/utils@0.41.19
  - @graphql-mesh/types@0.84.8

## 0.1.17

### Patch Changes

- Updated dependencies
  [[`ffb301435`](https://github.com/Urigo/graphql-mesh/commit/ffb3014353c17d23a03cf8001eba606c85c2043f),
  [`ffb301435`](https://github.com/Urigo/graphql-mesh/commit/ffb3014353c17d23a03cf8001eba606c85c2043f)]:
  - @graphql-mesh/types@0.84.7
  - @graphql-mesh/utils@0.41.18

## 0.1.16

### Patch Changes

- Updated dependencies
  [[`31a64714a`](https://github.com/Urigo/graphql-mesh/commit/31a64714a3e47dc41b950b3e1cfd1a49e7ff2d8a),
  [`31a64714a`](https://github.com/Urigo/graphql-mesh/commit/31a64714a3e47dc41b950b3e1cfd1a49e7ff2d8a)]:
  - @graphql-mesh/types@0.84.6
  - @graphql-mesh/utils@0.41.17

## 0.1.15

### Patch Changes

- Updated dependencies
  [[`88ab8f9ae`](https://github.com/Urigo/graphql-mesh/commit/88ab8f9ae32a4d0f52c978d625082abe075bebe4)]:
  - @graphql-mesh/utils@0.41.16
  - @graphql-mesh/types@0.84.5

## 0.1.14

### Patch Changes

- Updated dependencies
  [[`186e37bcd`](https://github.com/Urigo/graphql-mesh/commit/186e37bcd94c6eae16b30abd2f4c8b04d2ef422e)]:
  - @graphql-mesh/utils@0.41.15
  - @graphql-mesh/types@0.84.4

## 0.1.13

### Patch Changes

- Updated dependencies
  [[`93f4ed55d`](https://github.com/Urigo/graphql-mesh/commit/93f4ed55de7b9f2a55e11bf1df4ab7b4c59b3825)]:
  - @graphql-mesh/utils@0.41.14
  - @graphql-mesh/types@0.84.3

## 0.1.12

### Patch Changes

- Updated dependencies
  [[`ff251e4c7`](https://github.com/Urigo/graphql-mesh/commit/ff251e4c7654306d3030774447c991788768e148)]:
  - @graphql-mesh/types@0.84.2
  - @graphql-mesh/utils@0.41.13

## 0.1.11

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.84.1
  - @graphql-mesh/utils@0.41.12

## 0.1.10

### Patch Changes

- Updated dependencies
  [[`077e65c18`](https://github.com/Urigo/graphql-mesh/commit/077e65c1857aaefa2689f33decc9e72ded281c94),
  [`ee1cb6f76`](https://github.com/Urigo/graphql-mesh/commit/ee1cb6f7620f71fd824e69f4171cfef6c5d51794)]:
  - @graphql-mesh/types@0.84.0
  - @graphql-mesh/utils@0.41.11

## 0.1.9

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.83.5
  - @graphql-mesh/utils@0.41.10

## 0.1.8

### Patch Changes

- [#4439](https://github.com/Urigo/graphql-mesh/pull/4439)
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:

  - Updated dependency
    [`@graphql-mesh/utils@0.41.8` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.41.8)
    (from `0.41.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/types@0.83.3` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.83.3)
    (from `0.82.1`, in `dependencies`)

- Updated dependencies
  [[`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2),
  [`78599180d`](https://github.com/Urigo/graphql-mesh/commit/78599180d76f71e6d23114a0115e6338785a44d2)]:
  - @graphql-mesh/types@0.83.4
  - @graphql-mesh/utils@0.41.9

## 0.1.7

### Patch Changes

- Updated dependencies
  [[`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f),
  [`6f52af1c2`](https://github.com/Urigo/graphql-mesh/commit/6f52af1c2d6bf0a9de555a4d535b459ff2d8987f)]:
  - @graphql-mesh/types@0.83.3
  - @graphql-mesh/utils@0.41.8

## 0.1.6

### Patch Changes

- Updated dependencies
  [[`d84f81d94`](https://github.com/Urigo/graphql-mesh/commit/d84f81d9487ce228125863b8b283adab75daff19)]:
  - @graphql-mesh/utils@0.41.7
  - @graphql-mesh/types@0.83.2

## 0.1.5

### Patch Changes

- Updated dependencies
  [[`2a3753b5a`](https://github.com/Urigo/graphql-mesh/commit/2a3753b5a4bd23c7c89f4f08a3e55093e24902a8)]:
  - @graphql-mesh/utils@0.41.6
  - @graphql-mesh/types@0.83.1

## 0.1.4

### Patch Changes

- Updated dependencies
  [[`a56ebcec5`](https://github.com/Urigo/graphql-mesh/commit/a56ebcec503402fbdb3d4e3561fd2e38e4dd5c43),
  [`24afabece`](https://github.com/Urigo/graphql-mesh/commit/24afabece51aee171f902776d3f59b4a17026c49),
  [`44b868196`](https://github.com/Urigo/graphql-mesh/commit/44b86819695a298e60b1d7b6c54ae2772e8f1588)]:
  - @graphql-mesh/types@0.83.0
  - @graphql-mesh/utils@0.41.5

## 0.1.3

### Patch Changes

- Updated dependencies
  [[`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53),
  [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53)]:
  - @graphql-mesh/types@0.82.3
  - @graphql-mesh/utils@0.41.4

## 0.1.2

### Patch Changes

- Updated dependencies
  [[`b9bb80094`](https://github.com/Urigo/graphql-mesh/commit/b9bb8009407d27440267a5e9a7ec5dbfecc9bf8f)]:
  - @graphql-mesh/types@0.82.2
  - @graphql-mesh/utils@0.41.3

## 0.1.1

### Patch Changes

- Updated dependencies
  [[`3165827f7`](https://github.com/Urigo/graphql-mesh/commit/3165827f74b48a914b9604b024cd1318c211aa14)]:
  - @graphql-mesh/types@0.82.1
  - @graphql-mesh/utils@0.41.2

## 0.1.0

### Minor Changes

- [#4411](https://github.com/Urigo/graphql-mesh/pull/4411)
  [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9)
  Thanks [@ardatan](https://github.com/ardatan)! - New Prometheus Plugin

- [#4411](https://github.com/Urigo/graphql-mesh/pull/4411)
  [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9)
  Thanks [@ardatan](https://github.com/ardatan)! - Plugin factories now can return promises

### Patch Changes

- Updated dependencies
  [[`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9),
  [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9)]:
  - @graphql-mesh/types@0.82.0
  - @graphql-mesh/utils@0.41.1
