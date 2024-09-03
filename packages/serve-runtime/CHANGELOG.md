# @graphql-mesh/serve-runtime

## 0.9.2

### Patch Changes

- Updated dependencies
  [[`379c9cf`](https://github.com/ardatan/graphql-mesh/commit/379c9cf2c6c958d5d1615c953137204ddcf3e7bc)]:
  - @graphql-mesh/plugin-hive@0.102.6
  - @graphql-mesh/hmac-upstream-signature@0.4.2

## 0.9.1

### Patch Changes

- [`bc70d78`](https://github.com/ardatan/graphql-mesh/commit/bc70d78c7542d1ca46fe65a9886da880e7e574b7)
  Thanks [@ardatan](https://github.com/ardatan)! - Print documents in `subgraph-execute` logs
  correctly

- Updated dependencies []:
  - @graphql-mesh/hmac-upstream-signature@0.4.1

## 0.9.0

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

### Patch Changes

- [#7594](https://github.com/ardatan/graphql-mesh/pull/7594)
  [`9f01438`](https://github.com/ardatan/graphql-mesh/commit/9f01438fbdf327c0a4bfa0cf440d890ec871ffcc)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@envelop/disable-introspection@^6.0.0` ↗︎](https://www.npmjs.com/package/@envelop/disable-introspection/v/6.0.0)
    (to `dependencies`)
  - Added dependency
    [`@envelop/generic-auth@^8.0.0` ↗︎](https://www.npmjs.com/package/@envelop/generic-auth/v/8.0.0)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/hmac-upstream-signature@^0.3.6` ↗︎](https://www.npmjs.com/package/@graphql-mesh/hmac-upstream-signature/v/0.3.6)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/plugin-response-cache@^0.102.4` ↗︎](https://www.npmjs.com/package/@graphql-mesh/plugin-response-cache/v/0.102.4)
    (to `dependencies`)
  - Added dependency
    [`@graphql-yoga/plugin-csrf-prevention@^3.7.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-csrf-prevention/v/3.7.0)
    (to `dependencies`)
  - Added dependency
    [`@graphql-yoga/plugin-defer-stream@^3.7.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-defer-stream/v/3.7.0)
    (to `dependencies`)
  - Added dependency
    [`@graphql-yoga/plugin-persisted-operations@^3.7.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-persisted-operations/v/3.7.0)
    (to `dependencies`)

- [#7595](https://github.com/ardatan/graphql-mesh/pull/7595)
  [`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.4)
    (from `^0.0.3`, in `dependencies`)

- [#7596](https://github.com/ardatan/graphql-mesh/pull/7596)
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.5)
    (from `^0.0.4`, in `dependencies`)

- [#7597](https://github.com/ardatan/graphql-mesh/pull/7597)
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.5)
    (from `^0.0.4`, in `dependencies`)

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

- [#7584](https://github.com/ardatan/graphql-mesh/pull/7584)
  [`d4838b0`](https://github.com/ardatan/graphql-mesh/commit/d4838b0f530dc1841ad9da0cd88cb26387564012)
  Thanks [@ardatan](https://github.com/ardatan)! - Introduce Hive Gateway

- Updated dependencies
  [[`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d),
  [`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d),
  [`75e9f63`](https://github.com/ardatan/graphql-mesh/commit/75e9f63d09514a0af786f909dc8c32ac09a1a849),
  [`9f01438`](https://github.com/ardatan/graphql-mesh/commit/9f01438fbdf327c0a4bfa0cf440d890ec871ffcc)]:
  - @graphql-mesh/fusion-runtime@0.8.6
  - @graphql-mesh/utils@0.102.5
  - @graphql-mesh/hmac-upstream-signature@0.4.0
  - @graphql-mesh/plugin-hive@0.102.5
  - @graphql-mesh/plugin-response-cache@0.102.5
  - @graphql-mesh/transport-http@0.6.6
  - @graphql-mesh/transport-common@0.7.6

## 0.8.6

### Patch Changes

- Updated dependencies
  [[`5146df0`](https://github.com/ardatan/graphql-mesh/commit/5146df0fd3313227d5d7df2beb726ca89e13923f)]:
  - @graphql-mesh/transport-common@0.7.5
  - @graphql-mesh/fusion-runtime@0.8.5
  - @graphql-mesh/transport-http@0.6.5

## 0.8.5

### Patch Changes

- [#7576](https://github.com/ardatan/graphql-mesh/pull/7576)
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.21` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.21)
    (from `^10.0.20`, in `dependencies`)
- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005),
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/fusion-runtime@0.8.4
  - @graphql-mesh/transport-common@0.7.4
  - @graphql-mesh/utils@0.102.4
  - @graphql-mesh/transport-http@0.6.4
  - @graphql-mesh/plugin-hive@0.102.4

## 0.8.4

### Patch Changes

- [#7572](https://github.com/ardatan/graphql-mesh/pull/7572)
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.20)
    (from `^10.0.19`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.2.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.9)
    (from `^2.2.8`, in `dependencies`)
- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4),
  [`e9d73b7`](https://github.com/ardatan/graphql-mesh/commit/e9d73b7f3af98544f24d7223de735034abf17feb)]:
  - @graphql-mesh/fusion-runtime@0.8.3
  - @graphql-mesh/transport-common@0.7.3
  - @graphql-mesh/utils@0.102.3
  - @graphql-mesh/transport-http@0.6.3
  - @graphql-mesh/plugin-hive@0.102.3

## 0.8.3

### Patch Changes

- [#7407](https://github.com/ardatan/graphql-mesh/pull/7407)
  [`3ea4ea7`](https://github.com/ardatan/graphql-mesh/commit/3ea4ea7e62f4a957a3733eab59ccefd37d8b9e8e)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Export DisposableSymbols from
  serveRuntime and use it in plugins

- [#7560](https://github.com/ardatan/graphql-mesh/pull/7560)
  [`46f847d`](https://github.com/ardatan/graphql-mesh/commit/46f847d47e9ced84a0010c5f3a9aae5702e0f96f)
  Thanks [@ardatan](https://github.com/ardatan)! - New plugin to set a custom agent;

  ```ts
  import { readFileSync } from 'fs'
  import { Agent } from 'https'
  import { defineConfig, useCustomAgent } from '@graphql-mesh/serve-cli'

  const agent = new Agent({
    ca: readFileSync('/path/to/ca.crt')
    // or
    rejectUnauthorized: false
  })

  export const serveConfig = defineConfig({
    plugins: () => [
      useCustomAgent(
        // This function will be called for each URL to determine if the custom agent should be used
        ({ url }) =>
          url === 'https://example.com'
            ? agent
            : undefined
      )
    ]
  })
  ```

- [#7566](https://github.com/ardatan/graphql-mesh/pull/7566)
  [`416897a`](https://github.com/ardatan/graphql-mesh/commit/416897a9b8924d309e685faf92325391f7d7f687)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes the regression on usage reporting
  configuration

## 0.8.2

### Patch Changes

- [#7555](https://github.com/ardatan/graphql-mesh/pull/7555)
  [`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.3` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.3)
    (from `^0.0.2`, in `dependencies`)
- Updated dependencies
  [[`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a),
  [`5d95aad`](https://github.com/ardatan/graphql-mesh/commit/5d95aad185448e8e3a004a08e364f98ee9bbee2a)]:
  - @graphql-mesh/fusion-runtime@0.8.2
  - @graphql-mesh/utils@0.102.2
  - @graphql-mesh/plugin-hive@0.102.2
  - @graphql-mesh/transport-http@0.6.2
  - @graphql-mesh/transport-common@0.7.2

## 0.8.1

### Patch Changes

- [#7553](https://github.com/ardatan/graphql-mesh/pull/7553)
  [`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/disposablestack@^0.0.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.2)
    (from `^0.0.1`, in `dependencies`)
- Updated dependencies
  [[`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de),
  [`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de),
  [`e49a7e6`](https://github.com/ardatan/graphql-mesh/commit/e49a7e69475b652a53a0f289a44247e8b7ea96de),
  [`60bfc22`](https://github.com/ardatan/graphql-mesh/commit/60bfc2240108af0a599a66451517a146cace879d)]:
  - @graphql-mesh/fusion-runtime@0.8.1
  - @graphql-mesh/utils@0.102.1
  - @graphql-mesh/transport-common@0.7.1
  - @graphql-mesh/plugin-hive@0.102.1
  - @graphql-mesh/transport-http@0.6.1

## 0.8.0

### Minor Changes

- [#7530](https://github.com/ardatan/graphql-mesh/pull/7530)
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Support Hive's experimental persisted
  documents

  ```ts
  import { createServeRuntime } from '@graphql-mesh/serve-runtime'

  createServeRuntime({
    persistedDocuments: {
      type: 'hive',
      endpoint: 'https://cdn.graphql-hive.com/<target_id>',
      token: '<cdn_access_token>'
    }
  })
  ```

### Patch Changes

- [#7540](https://github.com/ardatan/graphql-mesh/pull/7540)
  [`86acf63`](https://github.com/ardatan/graphql-mesh/commit/86acf6382b15e00fde87b718e84bb86e682621a8)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-hive/core@^0.8.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/core/v/0.8.0)
    (from `^0.7.1`, in `dependencies`)
- Updated dependencies
  [[`86acf63`](https://github.com/ardatan/graphql-mesh/commit/86acf6382b15e00fde87b718e84bb86e682621a8),
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373),
  [`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)]:
  - @graphql-mesh/plugin-hive@0.102.0
  - @graphql-mesh/utils@0.102.0
  - @graphql-mesh/transport-http@0.6.0
  - @graphql-mesh/fusion-runtime@0.8.0
  - @graphql-mesh/transport-common@0.7.0

## 0.7.3

### Patch Changes

- [#7524](https://github.com/ardatan/graphql-mesh/pull/7524)
  [`eeab8fe`](https://github.com/ardatan/graphql-mesh/commit/eeab8fe6bd5d930a1faed22f8c78e302876de7af)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`graphql-yoga@^5.7.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.7.0) (from `^5.6.0`,
    in `dependencies`)
  - Added dependency
    [`@graphql-hive/core@^0.7.1` ↗︎](https://www.npmjs.com/package/@graphql-hive/core/v/0.7.1) (to
    `dependencies`)
  - Added dependency
    [`@graphql-yoga/plugin-apollo-usage-report@^0.1.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/plugin-apollo-usage-report/v/0.1.0)
    (to `dependencies`)
  - Removed dependency
    [`@graphql-hive/apollo@^0.35.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/apollo/v/0.35.0)
    (from `dependencies`)

- [#7524](https://github.com/ardatan/graphql-mesh/pull/7524)
  [`eeab8fe`](https://github.com/ardatan/graphql-mesh/commit/eeab8fe6bd5d930a1faed22f8c78e302876de7af)
  Thanks [@ardatan](https://github.com/ardatan)! - GraphOS Integration

- Updated dependencies
  [[`eeab8fe`](https://github.com/ardatan/graphql-mesh/commit/eeab8fe6bd5d930a1faed22f8c78e302876de7af)]:
  - @graphql-mesh/fusion-runtime@0.7.3

## 0.7.2

### Patch Changes

- [#7518](https://github.com/ardatan/graphql-mesh/pull/7518)
  [`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-mesh/fusion-runtime@^0.7.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/fusion-runtime/v/0.7.1)
    (from `^0.7.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/transport-common@^0.6.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/0.6.1)
    (from `^0.6.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-mesh/transport-http@^0.5.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-http/v/0.5.1)
    (from `^0.5.0`, in `dependencies`)
- Updated dependencies
  [[`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e),
  [`b0cdc83`](https://github.com/ardatan/graphql-mesh/commit/b0cdc839699a1dd90d125289b49b75f703cbb18e)]:
  - @graphql-mesh/fusion-runtime@0.7.2
  - @graphql-mesh/transport-http@0.5.2

## 0.7.1

### Patch Changes

- Updated dependencies
  [[`e06ac0d`](https://github.com/ardatan/graphql-mesh/commit/e06ac0d721c9af17ea3825b310622aa725dfe807),
  [`09ad884`](https://github.com/ardatan/graphql-mesh/commit/09ad8840fbb38d770157fb435abfcae19d08f095),
  [`67e1062`](https://github.com/ardatan/graphql-mesh/commit/67e10629c70ec553234c1ffc99af4b89ddb31985)]:
  - @graphql-mesh/fusion-runtime@0.7.1
  - @graphql-mesh/transport-common@0.6.1
  - @graphql-mesh/transport-http@0.5.1

## 0.7.0

### Minor Changes

- [#7469](https://github.com/ardatan/graphql-mesh/pull/7469)
  [`e509a25`](https://github.com/ardatan/graphql-mesh/commit/e509a259d3080db1300c9f38ae149f648fc9159f)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - MeshServeConfig doesnt have the `hive`
  property anymore

  Hive's usage reporting can be used with any of serve modes (supergraph, subgraph and proxy), while
  Hive CDN usage has more integrated configuration.

  ### Usage reporting

  ```diff
  import { createServeRuntime } from '@graphql-mesh/serve-runtime'

  export const runtime = createServeRuntime({
    supergraph: 'supergraph.graphql',
  - hive: {
  -   token: '<hive-registry-token>'
  - },
  + reporting: {
  +   type: 'hive',
  +   token: '<hive-registry-token>'
  + }
  })
  ```

  ### Supergraph from Hive CDN

  ```diff
  import { createServeRuntime } from '@graphql-mesh/serve-runtime'

  export const runtime = createServeRuntime({
  - hive: {
  + supergraph: {
  +   type: 'hive',
      endpoint: '<hive-endpoint>',
      key: '<hive-cdn-key>'
    }
  })
  ```

  ### Proxy with schema from Hive CDN

  ```diff
  import { createServeRuntime } from '@graphql-mesh/serve-runtime'

  export const runtime = createServeRuntime({
    proxy: '<endpoint>',
  - hive: {
  + schema: {
  +   type: 'hive',
      endpoint: '<hive-endpoint>',
      key: '<hive-cdn-key>'
    }
  })
  ```

- [#7469](https://github.com/ardatan/graphql-mesh/pull/7469)
  [`e509a25`](https://github.com/ardatan/graphql-mesh/commit/e509a259d3080db1300c9f38ae149f648fc9159f)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Any schema source for proxy mode

  Now you can directly provide a GraphQL schema, a path to an SDL or a URL to pull the schema from
  when running in proxy mode.

  ### GraphQL schema

  ```ts
  import { createServeRuntime } from '@graphql-mesh/serve-runtime'

  export const runtime = createServeRuntime({
    proxy: {
      endpoint: 'http://upstream/graphql'
    },
    schema: /* GraphQL */ `
      type Query {
        hello: String
      }
    `
  })
  ```

  ### Path

  ```ts
  import { createServeRuntime } from '@graphql-mesh/serve-runtime'

  export const runtime = createServeRuntime({
    proxy: {
      endpoint: 'http://upstream/graphql'
    },
    schema: './schema.graphql'
  })
  ```

  ### URL

  ```ts
  import { createServeRuntime } from '@graphql-mesh/serve-runtime'

  export const runtime = createServeRuntime({
    proxy: {
      endpoint: 'http://upstream/graphql'
    },
    schema: 'https://my-cdn.com/graphql/schema'
  })
  ```

  ### Hive CDN

  ```ts
  import { createServeRuntime } from '@graphql-mesh/serve-runtime'

  export const runtime = createServeRuntime({
    proxy: {
      endpoint: 'http://upstream/graphql'
    },
    schema: {
      type: 'hive',
      endpoint: 'https://cdn.graphql-hive.com/artifacts/v1/0123-3434/sdl',
      key: 'SOME_HIVE_KEY'
    }
  })
  ```

- [#7501](https://github.com/ardatan/graphql-mesh/pull/7501)
  [`83b8cdc`](https://github.com/ardatan/graphql-mesh/commit/83b8cdc937fcb7e3cc4e2ee7a3ae3c1f12ccaf31)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Polling interval option has been renamed to
  `pollingInterval`

  ### Breaking Changes

  ```diff
  import { createServeRuntime } from '@graphql-mesh/serve-runtime'

  const runtime = createServeRuntime({
  - polling: 10_000
  + pollingInterval: 10_000
  })
  ```

### Patch Changes

- [#7497](https://github.com/ardatan/graphql-mesh/pull/7497)
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.5.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.2)
    (from `^10.3.4`, in `dependencies`)

- [#7498](https://github.com/ardatan/graphql-mesh/pull/7498)
  [`1a9746f`](https://github.com/ardatan/graphql-mesh/commit/1a9746f6ca9b517230a0337d5a852bf05707303a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-hive/apollo@^0.35.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/apollo/v/0.35.0)
    (from `^0.34.0`, in `dependencies`)

- [#7500](https://github.com/ardatan/graphql-mesh/pull/7500)
  [`1d24997`](https://github.com/ardatan/graphql-mesh/commit/1d249977bbc1180f15ea0e11eece6cce1e8f2de1)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-hive/apollo@^0.35.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/apollo/v/0.35.0)
    (from `^0.34.0`, in `dependencies`)

- [#7512](https://github.com/ardatan/graphql-mesh/pull/7512)
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@^10.0.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.19)
    (from `^10.0.18`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.2.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.8)
    (from `^2.2.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.5.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.3)
    (from `^10.5.2`, in `dependencies`)

- [#7469](https://github.com/ardatan/graphql-mesh/pull/7469)
  [`e509a25`](https://github.com/ardatan/graphql-mesh/commit/e509a259d3080db1300c9f38ae149f648fc9159f)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Environment variables are not used,
  MeshServeConfig contains all necessary configuration options

  @graphql-mesh/serve-runtime is for programmatic usage and therefore should have explicit
  configuration and assume no defaults. Keep in mind that this doesn't change
  @graphql-mesh/serve-cli, which can still be configured using environment variables.

- [#7501](https://github.com/ardatan/graphql-mesh/pull/7501)
  [`83b8cdc`](https://github.com/ardatan/graphql-mesh/commit/83b8cdc937fcb7e3cc4e2ee7a3ae3c1f12ccaf31)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Disable polling for static schemas

- Updated dependencies
  [[`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`1a9746f`](https://github.com/ardatan/graphql-mesh/commit/1a9746f6ca9b517230a0337d5a852bf05707303a),
  [`1d24997`](https://github.com/ardatan/graphql-mesh/commit/1d249977bbc1180f15ea0e11eece6cce1e8f2de1),
  [`ace0a65`](https://github.com/ardatan/graphql-mesh/commit/ace0a650f9543ad977182414e16f581d59a2f3ef),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6),
  [`e509a25`](https://github.com/ardatan/graphql-mesh/commit/e509a259d3080db1300c9f38ae149f648fc9159f),
  [`83b8cdc`](https://github.com/ardatan/graphql-mesh/commit/83b8cdc937fcb7e3cc4e2ee7a3ae3c1f12ccaf31),
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)]:
  - @graphql-mesh/cross-helpers@0.4.6
  - @graphql-mesh/fusion-runtime@0.7.0
  - @graphql-mesh/plugin-hive@0.101.0
  - @graphql-mesh/transport-common@0.6.0
  - @graphql-mesh/transport-http@0.5.0
  - @graphql-mesh/utils@0.101.0

## 0.6.0

### Patch Changes

- [#7477](https://github.com/ardatan/graphql-mesh/pull/7477)
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@^10.0.18` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.18)
    (from `^10.0.17`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.3.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.3.4)
    (from `^10.2.3`, in `dependencies`)
  - Removed dependency
    [`@graphql-tools/executor-yoga@^3.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-yoga/v/3.0.0)
    (from `dependencies`)

- [#7482](https://github.com/ardatan/graphql-mesh/pull/7482)
  [`d5a4cd4`](https://github.com/ardatan/graphql-mesh/commit/d5a4cd4ff93984b62d9670cc286886e62de1bc55)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/federation@^2.2.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.5)
    (from `^2.2.4`, in `dependencies`)

- [#7466](https://github.com/ardatan/graphql-mesh/pull/7466)
  [`e2d3270`](https://github.com/ardatan/graphql-mesh/commit/e2d3270c7f32bf0a77b657546a2335572aeb0b79)
  Thanks [@ardatan](https://github.com/ardatan)! - Support Hive CDN in proxy mode If Hive CDN
  endpoint is provided, the runtime won't introspect the schema from the endpoint, and fetch it from
  Hive CDN.

  By default, Mesh Serve introspects the schema from the endpoint. And it fails, it skips the
  validation and schema aware features. But if Hive CDN endpoint and key have been provided in the
  configuration, Mesh Serve will fetch the schema from the Hive CDN.

  ```ts filename="mesh.config.ts"
  import { defineConfig } from '@graphql-mesh/serve-cli'

  export const serveConfig = defineConfig({
    proxy: {
      endpoint: 'https://example.com/graphql'
    },
    hive: {
      endpoint: 'https://cdn.graphql-hive.com/artifacts/v1/0123-3434/sdl',
      key: 'SOME_HIVE_KEY'
    }
  })
  ```

- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`d5a4cd4`](https://github.com/ardatan/graphql-mesh/commit/d5a4cd4ff93984b62d9670cc286886e62de1bc55),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c),
  [`0c82de5`](https://github.com/ardatan/graphql-mesh/commit/0c82de538b1780d7858e65a8216854550cd7db1b),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7),
  [`4d1eb28`](https://github.com/ardatan/graphql-mesh/commit/4d1eb285c2b703c5f80473ad0f316004306fac7f),
  [`0c82de5`](https://github.com/ardatan/graphql-mesh/commit/0c82de538b1780d7858e65a8216854550cd7db1b),
  [`a324c5e`](https://github.com/ardatan/graphql-mesh/commit/a324c5ef300c25dcfa265f3457453b50af0b83e7)]:
  - @graphql-mesh/cross-helpers@0.4.5
  - @graphql-mesh/fusion-runtime@0.6.0
  - @graphql-mesh/transport-common@0.5.0
  - @graphql-mesh/transport-http@0.4.0
  - @graphql-mesh/utils@0.100.0
  - @graphql-mesh/plugin-hive@0.100.0

## 0.5.11

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/fusion-runtime@0.5.10
  - @graphql-mesh/utils@0.99.7
  - @graphql-mesh/plugin-hive@0.99.7
  - @graphql-mesh/transport-common@0.4.7
  - @graphql-mesh/transport-http@0.3.7

## 0.5.10

### Patch Changes

- [#7447](https://github.com/ardatan/graphql-mesh/pull/7447)
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@^10.0.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.17)
    (from `^10.0.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.2.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.4)
    (from `^2.2.3`, in `dependencies`)

- [#7448](https://github.com/ardatan/graphql-mesh/pull/7448)
  [`2041e8d`](https://github.com/ardatan/graphql-mesh/commit/2041e8dafcae602aed96e51f4e9ab38113c3ccde)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@graphql-hive/apollo@^0.34.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/apollo/v/0.34.0)
    (from `^0.33.4`, in `dependencies`)

- [#7447](https://github.com/ardatan/graphql-mesh/pull/7447)
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)
  Thanks [@ardatan](https://github.com/ardatan)! - Export
  \`MeshServeConfigContext`\, \`useContentEncoding\` and \`useUpstreamCancel\` from \`serve-cli\`
  and \`serve-runtime\`

- [#7447](https://github.com/ardatan/graphql-mesh/pull/7447)
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the wrong information on the landing page

- [#7447](https://github.com/ardatan/graphql-mesh/pull/7447)
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on schema loading handling

- [#7447](https://github.com/ardatan/graphql-mesh/pull/7447)
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)
  Thanks [@ardatan](https://github.com/ardatan)! - Log debug messages when readiness check fails

- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`2041e8d`](https://github.com/ardatan/graphql-mesh/commit/2041e8dafcae602aed96e51f4e9ab38113c3ccde),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb),
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/fusion-runtime@0.5.9
  - @graphql-mesh/plugin-hive@0.99.6
  - @graphql-mesh/transport-common@0.4.6
  - @graphql-mesh/utils@0.99.6
  - @graphql-mesh/transport-http@0.3.6

## 0.5.9

### Patch Changes

- [#7428](https://github.com/ardatan/graphql-mesh/pull/7428)
  [`6fc03b6`](https://github.com/ardatan/graphql-mesh/commit/6fc03b6f138ebc81a477fbf0c222ab6e1d882497)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/server@^0.9.46` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.46)
    (from `^0.9.34`, in `dependencies`)

- [#7428](https://github.com/ardatan/graphql-mesh/pull/7428)
  [`6fc03b6`](https://github.com/ardatan/graphql-mesh/commit/6fc03b6f138ebc81a477fbf0c222ab6e1d882497)
  Thanks [@ardatan](https://github.com/ardatan)! - New plugin to apply compression between
  subgraphs, gateway and the client So Mesh can compress the request before sending it to the
  subgraph and decompress the response. Then do the same for the response from the subgraph to the
  client.

  ```ts filename="mesh.config.ts"
  import { defineConfig, useContentEncoding } from '@graphql-mesh/serve-cli'

  export default defineConfig({
    plugins: () => [
      useContentEncoding({
        subgraphs: ['*'] // Enable compression for all subgraphs
        // subgraphs: ['subgraph1', 'subgraph2'] // Enable compression for specific subgraphs
      })
    ]
  })
  ```

## 0.5.8

### Patch Changes

- [#7424](https://github.com/ardatan/graphql-mesh/pull/7424)
  [`7cd4d35`](https://github.com/ardatan/graphql-mesh/commit/7cd4d35100489550cef5815acd424ad85a71ec27)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/federation@^2.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.3)
    (from `^2.2.1`, in `dependencies`)
- Updated dependencies
  [[`7cd4d35`](https://github.com/ardatan/graphql-mesh/commit/7cd4d35100489550cef5815acd424ad85a71ec27)]:
  - @graphql-mesh/fusion-runtime@0.5.8

## 0.5.7

### Patch Changes

- [#7192](https://github.com/ardatan/graphql-mesh/pull/7192)
  [`1905f53`](https://github.com/ardatan/graphql-mesh/commit/1905f53a65e6c73d1d305770dcfc4cba34798a09)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/batch-delegate@^9.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/9.0.3)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/wrap@^10.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/10.0.5)
    (to `dependencies`)
  - Added dependency
    [`@whatwg-node/server@^0.9.34` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.34)
    (to `dependencies`)
- Updated dependencies
  [[`1905f53`](https://github.com/ardatan/graphql-mesh/commit/1905f53a65e6c73d1d305770dcfc4cba34798a09)]:
  - @graphql-mesh/fusion-runtime@0.5.7

## 0.5.6

### Patch Changes

- [#7401](https://github.com/ardatan/graphql-mesh/pull/7401)
  [`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/disposablestack@^0.0.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/disposablestack/v/0.0.1)
    (to `dependencies`)
  - Removed dependency
    [`disposablestack@^1.1.6` ↗︎](https://www.npmjs.com/package/disposablestack/v/1.1.6) (from
    `dependencies`)
- Updated dependencies
  [[`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4),
  [`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4),
  [`33c23e8`](https://github.com/ardatan/graphql-mesh/commit/33c23e83a60328df806a8adc8d262a0c6de7e5a4)]:
  - @graphql-mesh/fusion-runtime@0.5.6
  - @graphql-mesh/plugin-hive@0.99.5
  - @graphql-mesh/utils@0.99.5
  - @graphql-mesh/transport-http@0.3.5
  - @graphql-mesh/transport-common@0.4.5

## 0.5.5

### Patch Changes

- [#7366](https://github.com/ardatan/graphql-mesh/pull/7366)
  [`ec31e60`](https://github.com/ardatan/graphql-mesh/commit/ec31e608c271f14554fcef5519a12c4366e87f38)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Removed dependency
    [`@whatwg-node/server@^0.9.34` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.34)
    (from `dependencies`)

- [#7343](https://github.com/ardatan/graphql-mesh/pull/7343)
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the issue when you go to landing page then
  GraphiQL, queries are not executed

- [#7343](https://github.com/ardatan/graphql-mesh/pull/7343)
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)
  Thanks [@ardatan](https://github.com/ardatan)! - More verbose debug logs for HTTP fetch calls and
  subgraph requests

- [#7343](https://github.com/ardatan/graphql-mesh/pull/7343)
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)
  Thanks [@ardatan](https://github.com/ardatan)! - Request ID;

  If user provides a request id with `x-request-id` header, it will be used as a request id
  otherwise Mesh generates a random UUID as a request id. Then it will return the request id in the
  response headers with `x-request-id` header.

  This `x-request-id` is also available in upstream headers as `request-id` for the upstream
  services to use.

  This request id will also be added to the logs.

- Updated dependencies
  [[`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b),
  [`597e790`](https://github.com/ardatan/graphql-mesh/commit/597e7905e542be06e7f576d8ffde3f94d7b0630b)]:
  - @graphql-mesh/fusion-runtime@0.5.5
  - @graphql-mesh/utils@0.99.4
  - @graphql-mesh/transport-http@0.3.4
  - @graphql-mesh/plugin-hive@0.99.4
  - @graphql-mesh/transport-common@0.4.4

## 0.5.4

### Patch Changes

- Updated dependencies
  [[`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e),
  [`5e5dec5`](https://github.com/ardatan/graphql-mesh/commit/5e5dec51b571df8d23a4379f61fd7fbd7a3df58e)]:
  - @graphql-mesh/utils@0.99.3
  - @graphql-mesh/fusion-runtime@0.5.4
  - @graphql-mesh/transport-http@0.3.3
  - @graphql-mesh/plugin-hive@0.99.3
  - @graphql-mesh/transport-common@0.4.3

## 0.5.3

### Patch Changes

- [#7304](https://github.com/ardatan/graphql-mesh/pull/7304)
  [`f47c900`](https://github.com/ardatan/graphql-mesh/commit/f47c900d19e8c634d39e9dd90bfb1acc4f892a1f)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Pass context type from `OnSubgraphExecute`
  to `ExecutionRequest`

- Updated dependencies
  [[`f47c900`](https://github.com/ardatan/graphql-mesh/commit/f47c900d19e8c634d39e9dd90bfb1acc4f892a1f)]:
  - @graphql-mesh/fusion-runtime@0.5.3

## 0.5.2

### Patch Changes

- [#7351](https://github.com/ardatan/graphql-mesh/pull/7351)
  [`9f6624e`](https://github.com/ardatan/graphql-mesh/commit/9f6624e327a555b3de201e67ca9f5dabca44e238)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/federation@^2.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.0)
    (from `^2.1.2`, in `dependencies`)

- [#7352](https://github.com/ardatan/graphql-mesh/pull/7352)
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@^10.0.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.16)
    (from `^10.0.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.2.1)
    (from `^2.2.0`, in `dependencies`)

- [#7294](https://github.com/ardatan/graphql-mesh/pull/7294)
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730)
  Thanks [@ardatan](https://github.com/ardatan)! - Ability to manipulate transport entry through
  `transportEntries`.

  For example, you can add extra headers to a subgraph

  ```ts
  transportEntries: {
    products: {
      // This adds extra headers to the subgraph configuration
      headers: [
        // This forwards `authorization` from the upstream to downstream
        ['authorization', '{context.headers.authorization}'],
        // Or some static value
        ['x-extra', process.env.SOME_THING]
      ]
    }
  }
  ```

- Updated dependencies
  [[`9f6624e`](https://github.com/ardatan/graphql-mesh/commit/9f6624e327a555b3de201e67ca9f5dabca44e238),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730),
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e),
  [`29dc043`](https://github.com/ardatan/graphql-mesh/commit/29dc043c1fd5d83b3a3f8a1c739957f3d723067a),
  [`345a814`](https://github.com/ardatan/graphql-mesh/commit/345a81490f5201f6ee2f378b1b9d83c5881c9730)]:
  - @graphql-mesh/fusion-runtime@0.5.2
  - @graphql-mesh/transport-common@0.4.2
  - @graphql-mesh/transport-http@0.3.2
  - @graphql-mesh/utils@0.99.2
  - @graphql-mesh/plugin-hive@0.99.2

## 0.5.1

### Patch Changes

- [#7300](https://github.com/ardatan/graphql-mesh/pull/7300)
  [`db05fc3`](https://github.com/ardatan/graphql-mesh/commit/db05fc3d3205ac8e2730099cf453a7a113a5d770)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency
    [`@graphql-hive/apollo@^0.33.4` ↗︎](https://www.npmjs.com/package/@graphql-hive/apollo/v/0.33.4)
    (to `dependencies`)
  - Removed dependency
    [`@graphql-hive/client@^0.32.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.32.0)
    (from `dependencies`)

- [#7316](https://github.com/ardatan/graphql-mesh/pull/7316)
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@^10.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.14)
    (from `^10.0.12`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor-http@^1.1.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.1.5)
    (from `^1.1.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.1.2)
    (from `^2.1.1`, in `dependencies`)

- [#7300](https://github.com/ardatan/graphql-mesh/pull/7300)
  [`db05fc3`](https://github.com/ardatan/graphql-mesh/commit/db05fc3d3205ac8e2730099cf453a7a113a5d770)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Upgrade Hive SDK to use latest

- Updated dependencies
  [[`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`db05fc3`](https://github.com/ardatan/graphql-mesh/commit/db05fc3d3205ac8e2730099cf453a7a113a5d770),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3),
  [`2b8e52f`](https://github.com/ardatan/graphql-mesh/commit/2b8e52fdc40e8a0aa7c48ffb92de1b29b90b3c4e),
  [`db05fc3`](https://github.com/ardatan/graphql-mesh/commit/db05fc3d3205ac8e2730099cf453a7a113a5d770),
  [`26deb92`](https://github.com/ardatan/graphql-mesh/commit/26deb92dc1d405847289bf28344511f143f94ff4)]:
  - @graphql-mesh/fusion-runtime@0.5.1
  - @graphql-mesh/plugin-hive@0.99.1
  - @graphql-mesh/transport-common@0.4.1
  - @graphql-mesh/transport-http@0.3.1
  - @graphql-mesh/utils@0.99.1

## 0.5.0

### Minor Changes

- [#7207](https://github.com/ardatan/graphql-mesh/pull/7207)
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - New `transportOptions` configuration property
  for passing custom transport options per subgraph for specific transport kinds

  For example, adding subscriptions support for Apollo Federation v2 subgraphs:

  ```ts
  import { defineConfig } from '@graphql-mesh/serve-cli'
  import { HTTPTransportOptions } from '@graphql-mesh/transport-http'

  export const serveConfig = defineConfig({
    transportOptions: {
      // apply options to all subgraphs
      '*': {
        // on the "http" transport kind
        http: {
          // custom http transport options
          subscriptions: {
            ws: {
              path: '/subscriptions'
            }
          }
        } satisfies HTTPTransportOptions
      }
    }
  })
  ```

### Patch Changes

- [#6772](https://github.com/ardatan/graphql-mesh/pull/6772)
  [`27e3cc9`](https://github.com/ardatan/graphql-mesh/commit/27e3cc97c1218863cf2948902bdca050bd71d18a)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor-http@^1.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.1.2)
    (from `^1.0.6`, in `dependencies`)

- [#7218](https://github.com/ardatan/graphql-mesh/pull/7218)
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor-http@^1.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.1.2)
    (from `^1.0.6`, in `dependencies`)

- [#7223](https://github.com/ardatan/graphql-mesh/pull/7223)
  [`26549a9`](https://github.com/ardatan/graphql-mesh/commit/26549a9832b4e18afdb22e4615a9951d69a5922b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/executor-http@^1.1.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.1.2)
    (from `^1.0.6`, in `dependencies`)

- [#7177](https://github.com/ardatan/graphql-mesh/pull/7177)
  [`7b35444`](https://github.com/ardatan/graphql-mesh/commit/7b35444dcc15c6d22eb1b26c080c7b78ee8aef8e)
  Thanks [@ardatan](https://github.com/ardatan)! - Disable validation of the operations on the
  gateway while using Mesh Server as a proxy

  ```ts filename="mesh.config.ts"
  import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli'

  export default defineServeConfig({
    proxy: {
      endpoint: 'https://my-service.com/graphql'
    },
    skipValidation: true
  })
  ```

  This will disable the validation of the operations, and send the operations directly to the
  upstream service.

- [#7216](https://github.com/ardatan/graphql-mesh/pull/7216)
  [`a2306d2`](https://github.com/ardatan/graphql-mesh/commit/a2306d2c53c9d3cf071aec6e550dc5fff976bfb2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Invoke onSchemaChange plugin hook as soon as
  supergraph changes and schema setting optimizations

- [#7207](https://github.com/ardatan/graphql-mesh/pull/7207)
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Refactor transports and improve getting
  subgraph executors

- [#7215](https://github.com/ardatan/graphql-mesh/pull/7215)
  [`eefbfbe`](https://github.com/ardatan/graphql-mesh/commit/eefbfbe94d72fa6f5cf60a8cf363cae039aece89)
  Thanks [@ardatan](https://github.com/ardatan)! - Cleanup created transport executors per schema
  change Previously they were cleaned up only on server close, which could lead to memory leaks in
  case of schema changes.

- [#7220](https://github.com/ardatan/graphql-mesh/pull/7220)
  [`de7517e`](https://github.com/ardatan/graphql-mesh/commit/de7517e653babaeabbd80a941a0210c491601725)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Close subscriptions on disposal and schema
  change with different codes.

  When the server gets disposed (on shutdown), all active subscriptions will complete emitting the
  following execution error:

  ```json
  {
    "errors": [
      {
        "extensions": {
          "code": "SHUTTING_DOWN"
        },
        "message": "subscription has been closed because the server is shutting down"
      }
    ]
  }
  ```

  However, when the server detects a schema change, all active subscriptions will complete emitting
  the following execution error:

  ```json
  {
    "errors": [
      {
        "extensions": {
          "code": "SUBSCRIPTION_SCHEMA_RELOAD"
        },
        "message": "subscription has been closed due to a schema reload"
      }
    ]
  }
  ```

- Updated dependencies
  [[`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2),
  [`27e3cc9`](https://github.com/ardatan/graphql-mesh/commit/27e3cc97c1218863cf2948902bdca050bd71d18a),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2),
  [`26549a9`](https://github.com/ardatan/graphql-mesh/commit/26549a9832b4e18afdb22e4615a9951d69a5922b),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`a8e3f00`](https://github.com/ardatan/graphql-mesh/commit/a8e3f003264f2a4703a35a08667818fa8800dc00),
  [`eefbfbe`](https://github.com/ardatan/graphql-mesh/commit/eefbfbe94d72fa6f5cf60a8cf363cae039aece89),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e),
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)]:
  - @graphql-mesh/transport-common@0.4.0
  - @graphql-mesh/transport-http@0.3.0
  - @graphql-mesh/utils@0.99.0
  - @graphql-mesh/fusion-runtime@0.5.0
  - @graphql-mesh/plugin-hive@0.99.0

## 0.4.4

### Patch Changes

- [#7183](https://github.com/ardatan/graphql-mesh/pull/7183)
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`graphql-yoga@^5.6.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.6.0) (from `^5.3.0`,
    in `dependencies`)

- [#7185](https://github.com/ardatan/graphql-mesh/pull/7185)
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@^10.0.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.12)
    (from `^10.0.11`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.1.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.1.1)
    (from `^2.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitch@^9.2.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/9.2.10)
    (from `^9.2.9`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (from `^10.2.1`, in `dependencies`)

- [#7165](https://github.com/ardatan/graphql-mesh/pull/7165)
  [`28961ed`](https://github.com/ardatan/graphql-mesh/commit/28961edfb6b4ef998fff1af6759c892c3481ba7a)
  Thanks [@ardatan](https://github.com/ardatan)! - Rename the title of GraphiQL to GraphiQL Mesh

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
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)]:
  - @graphql-mesh/cross-helpers@0.4.4
  - @graphql-mesh/fusion-runtime@0.4.1
  - @graphql-mesh/transport-common@0.3.1
  - @graphql-mesh/utils@0.98.10
  - @graphql-mesh/plugin-hive@0.98.12
  - @graphql-mesh/transport-http@0.2.1

## 0.4.3

### Patch Changes

- Updated dependencies
  [[`a7e8a9c`](https://github.com/ardatan/graphql-mesh/commit/a7e8a9cea8ef31c0418bc0ad2c5d536b75eebab0)]:
  - @graphql-mesh/plugin-hive@0.98.11

## 0.4.2

### Patch Changes

- [`141c3a6`](https://github.com/ardatan/graphql-mesh/commit/141c3a6664afdbe4202986cdc06f5fe018d5863a)
  Thanks [@ardatan](https://github.com/ardatan)! - Add http transport by default

## 0.4.1

### Patch Changes

- [`d68c464`](https://github.com/ardatan/graphql-mesh/commit/d68c4642c9993c37a48004fc0d1f0574f557ca43)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix Hive integration

- Updated dependencies
  [[`d68c464`](https://github.com/ardatan/graphql-mesh/commit/d68c4642c9993c37a48004fc0d1f0574f557ca43)]:
  - @graphql-mesh/plugin-hive@0.98.10

## 0.4.0

### Patch Changes

- [#7145](https://github.com/ardatan/graphql-mesh/pull/7145)
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-hive/client@^0.32.0` ↗︎](https://www.npmjs.com/package/@graphql-hive/client/v/0.32.0)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/plugin-hive@^0.98.7` ↗︎](https://www.npmjs.com/package/@graphql-mesh/plugin-hive/v/0.98.7)
    (to `dependencies`)

- [#7155](https://github.com/ardatan/graphql-mesh/pull/7155)
  [`f985978`](https://github.com/ardatan/graphql-mesh/commit/f9859784ad854207e4d32bda11c904b5301610ee)
  Thanks [@ardatan](https://github.com/ardatan)! - Construct Logger during Mesh init

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
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae),
  [`7544594`](https://github.com/ardatan/graphql-mesh/commit/75445949f91f225ffed15491b8040b61ec4cf3ae)]:
  - @graphql-mesh/plugin-hive@0.98.9
  - @graphql-mesh/utils@0.98.9
  - @graphql-mesh/transport-common@0.3.0
  - @graphql-mesh/fusion-runtime@0.4.0

## 0.3.12

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/fusion-runtime@0.3.10

## 0.3.11

### Patch Changes

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Removed dependency
    [`@graphql-tools/federation@^1.1.36` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/1.1.36)
    (from `dependencies`)

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`disposablestack@^1.1.6` ↗︎](https://www.npmjs.com/package/disposablestack/v/1.1.6) (to
    `dependencies`)

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `Disposable` pattern for plugins and
  transports

- Updated dependencies
  [[`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/fusion-runtime@0.3.9
  - @graphql-mesh/utils@0.98.8
  - @graphql-mesh/transport-common@0.2.8

## 0.3.10

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/fusion-runtime@0.3.8
  - @graphql-mesh/utils@0.98.7
  - @graphql-mesh/transport-common@0.2.7

## 0.3.9

### Patch Changes

- [#7061](https://github.com/ardatan/graphql-mesh/pull/7061)
  [`56f5449`](https://github.com/ardatan/graphql-mesh/commit/56f54491e0770ca9621120c202201fd7ef3fd3fe)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor-yoga@^3.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-yoga/v/3.0.0)
    (from `^2.0.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^2.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/2.0.0)
    (from `^1.1.36`, in `dependencies`)

## 0.3.8

### Patch Changes

- [#7030](https://github.com/ardatan/graphql-mesh/pull/7030)
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.11)
    (from `^10.0.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/federation@^1.1.36` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/1.1.36)
    (from `^1.1.35`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitch@^9.2.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/9.2.9)
    (from `^9.2.8`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.1)
    (from `^10.2.0`, in `dependencies`)
- Updated dependencies
  [[`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c),
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/cross-helpers@0.4.3
  - @graphql-mesh/fusion-runtime@0.3.7
  - @graphql-mesh/transport-common@0.2.6
  - @graphql-mesh/utils@0.98.6

## 0.3.7

### Patch Changes

- Updated dependencies
  [[`c4d2249`](https://github.com/ardatan/graphql-mesh/commit/c4d22497b4249f9a0969e1d01efbe0721774ce73)]:
  - @graphql-mesh/utils@0.98.5
  - @graphql-mesh/fusion-runtime@0.3.6
  - @graphql-mesh/transport-common@0.2.5

## 0.3.6

### Patch Changes

- [`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)
  Thanks [@ardatan](https://github.com/ardatan)! - Update GraphQL Tools packages

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @graphql-mesh/transport-common@0.2.4
  - @graphql-mesh/fusion-runtime@0.3.5
  - @graphql-mesh/utils@0.98.4

## 0.3.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/fusion-runtime@0.3.4

## 0.3.4

### Patch Changes

- [`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @graphql-mesh/transport-common@0.2.3
  - @graphql-mesh/fusion-runtime@0.3.3
  - @graphql-mesh/utils@0.98.3

## 0.3.3

### Patch Changes

- [#6917](https://github.com/ardatan/graphql-mesh/pull/6917)
  [`da798ac`](https://github.com/ardatan/graphql-mesh/commit/da798acf85cf7da8cd45609725dde751b4ef24a3)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Removed dependency
    [`@graphql-tools/schema@^10.0.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.2)
    (from `dependencies`)
  - Removed dependency
    [`@graphql-tools/wrap@^10.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/10.0.5)
    (from `dependencies`)
  - Removed dependency
    [`graphql-mobius@^0.1.13` ↗︎](https://www.npmjs.com/package/graphql-mobius/v/0.1.13) (from
    `dependencies`)

- [#6917](https://github.com/ardatan/graphql-mesh/pull/6917)
  [`da798ac`](https://github.com/ardatan/graphql-mesh/commit/da798acf85cf7da8cd45609725dde751b4ef24a3)
  Thanks [@ardatan](https://github.com/ardatan)! - Remove unnecessary dependency and unused code

## 0.3.2

### Patch Changes

- [`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/transport-common@0.2.2
  - @graphql-mesh/fusion-runtime@0.3.2
  - @graphql-mesh/cross-helpers@0.4.2
  - @graphql-mesh/utils@0.98.2

## 0.3.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.98.1
  - @graphql-mesh/fusion-runtime@0.3.1
  - @graphql-mesh/transport-common@0.2.1

## 0.3.0

### Patch Changes

- [#6779](https://github.com/ardatan/graphql-mesh/pull/6779)
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.1.3)
    (from `^10.0.8`, in `dependencies`)

- [#6872](https://github.com/ardatan/graphql-mesh/pull/6872)
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@^10.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.6)
    (from `^10.0.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@^10.0.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/10.0.5)
    (from `^10.0.1`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.9.34` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.34)
    (from `^0.9.16`, in `dependencies`)
  - Updated dependency
    [`graphql-yoga@^5.3.0` ↗︎](https://www.npmjs.com/package/graphql-yoga/v/5.3.0) (from `^5.1.1`,
    in `dependencies`)
  - Added dependency
    [`@graphql-mesh/transport-common@^0.1.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/0.1.5)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/federation@^1.1.25` ↗︎](https://www.npmjs.com/package/@graphql-tools/federation/v/1.1.25)
    (to `dependencies`)
  - Added dependency
    [`@graphql-tools/stitch@^9.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/9.2.0)
    (to `dependencies`)
  - Removed dependency
    [`@graphql-mesh/fusion-federation@^0.0.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/fusion-federation/v/0.0.2)
    (from `dependencies`)

- [#6872](https://github.com/ardatan/graphql-mesh/pull/6872)
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `@graphql-tools/federation` for Federation
  Supergraphs

- [`b372de6`](https://github.com/ardatan/graphql-mesh/commit/b372de6ac72e871ebdc731c0f3f67c16f04bb405)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump Federation packages

- Updated dependencies
  [[`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84),
  [`7881346`](https://github.com/ardatan/graphql-mesh/commit/78813467cf0e2c988a55cdf1225ff60c4690ede8),
  [`6399add`](https://github.com/ardatan/graphql-mesh/commit/6399addeeca2d5cf0bf545c537d01c784de65e84)]:
  - @graphql-mesh/fusion-runtime@0.3.0
  - @graphql-mesh/transport-common@0.2.0
  - @graphql-mesh/utils@0.98.0

## 0.2.12

### Patch Changes

- [#6792](https://github.com/ardatan/graphql-mesh/pull/6792)
  [`05aabae`](https://github.com/ardatan/graphql-mesh/commit/05aabae48ad17f80847eb153e5fd4a96b7643d5d)
  Thanks [@ardatan](https://github.com/ardatan)! - Forward headers only if it is a request from the
  client to the gateway

- Updated dependencies []:
  - @graphql-mesh/fusion-runtime@0.2.12

## 0.2.11

### Patch Changes

- [#6762](https://github.com/ardatan/graphql-mesh/pull/6762)
  [`9ac2245`](https://github.com/ardatan/graphql-mesh/commit/9ac2245273a561449cfc17dcafc67d0c43baf33e)
  Thanks [@ardatan](https://github.com/ardatan)! - New Plugin: useForwardHeaders

- Updated dependencies
  [[`4beaa4c`](https://github.com/ardatan/graphql-mesh/commit/4beaa4ce24ca3d63be8dd375d300d388f5bd5183)]:
  - @graphql-mesh/fusion-federation@0.0.2
  - @graphql-mesh/fusion-runtime@0.2.11

## 0.2.10

### Patch Changes

- [#6747](https://github.com/ardatan/graphql-mesh/pull/6747)
  [`8924438`](https://github.com/ardatan/graphql-mesh/commit/8924438131a7320ef160573539bddfb024bbe343)
  Thanks [@ardatan](https://github.com/ardatan)! - Readiness and healthcheck endpoints

- Updated dependencies
  [[`8924438`](https://github.com/ardatan/graphql-mesh/commit/8924438131a7320ef160573539bddfb024bbe343)]:
  - @graphql-mesh/fusion-runtime@0.2.10

## 0.2.9

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.97.5
  - @graphql-mesh/fusion-runtime@0.2.9

## 0.2.8

### Patch Changes

- [`f293329`](https://github.com/ardatan/graphql-mesh/commit/f2933295532d0760bb731e055dd2bd6e9cb2a63b)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve proxy execution

- Updated dependencies
  [[`f293329`](https://github.com/ardatan/graphql-mesh/commit/f2933295532d0760bb731e055dd2bd6e9cb2a63b)]:
  - @graphql-mesh/fusion-runtime@0.2.8

## 0.2.7

### Patch Changes

- [`1639001`](https://github.com/ardatan/graphql-mesh/commit/16390018bd54946fbfbd2bfb8eb3ba7682966a12)
  Thanks [@ardatan](https://github.com/ardatan)! - Modularization

- Updated dependencies
  [[`1639001`](https://github.com/ardatan/graphql-mesh/commit/16390018bd54946fbfbd2bfb8eb3ba7682966a12)]:
  - @graphql-mesh/fusion-runtime@0.2.7

## 0.2.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/fusion-runtime@0.2.6

## 0.2.5

### Patch Changes

- Updated dependencies
  [[`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f),
  [`e2fb7ed`](https://github.com/ardatan/graphql-mesh/commit/e2fb7edb8b02a53fa6f1b1f1fba629ea7c84488f)]:
  - @graphql-mesh/utils@0.97.4
  - @graphql-mesh/fusion-runtime@0.2.5

## 0.2.4

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.97.3
  - @graphql-mesh/fusion-runtime@0.2.4

## 0.2.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.97.2
  - @graphql-mesh/fusion-runtime@0.2.3

## 0.2.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/fusion-runtime@0.2.2

## 0.2.1

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/utils@0.97.1
  - @graphql-mesh/fusion-runtime@0.2.1

## 0.2.0

### Patch Changes

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a),
  [`70b05a2`](https://github.com/ardatan/graphql-mesh/commit/70b05a20a948b5ebed5306c14710c8839225cdad),
  [`35b9cab`](https://github.com/ardatan/graphql-mesh/commit/35b9cab1d6c50fd6165879dc6cc8e5cb03dd2eef),
  [`662a36a`](https://github.com/ardatan/graphql-mesh/commit/662a36ac5135cc8153f62ab1c18497032f21cb6f)]:
  - @graphql-mesh/utils@0.97.0
  - @graphql-mesh/fusion-runtime@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies
  [[`b7c3631`](https://github.com/ardatan/graphql-mesh/commit/b7c3631bd58779c1910705fd7f2b39545bc071dd),
  [`0f274ef`](https://github.com/ardatan/graphql-mesh/commit/0f274ef8177068da65e50e08607998d0ed63e8b9)]:
  - @graphql-mesh/fusion-runtime@0.1.1
  - @graphql-mesh/utils@0.96.6

## 0.1.0

### Minor Changes

- [`7b494d9`](https://github.com/ardatan/graphql-mesh/commit/7b494d981862034f256225e2c9a5c43a403ff79d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Improve typings and other accompanying
  improvements

### Patch Changes

- [#6559](https://github.com/ardatan/graphql-mesh/pull/6559)
  [`f265dda`](https://github.com/ardatan/graphql-mesh/commit/f265dda8d62dc5f345d69f60c8a3a09f0e6a0451)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency
    [`@envelop/core@^5.0.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.0) (to
    `dependencies`)

- [#6568](https://github.com/ardatan/graphql-mesh/pull/6568)
  [`44d40ff`](https://github.com/ardatan/graphql-mesh/commit/44d40fff17877a52e63c6f644635ea53eb9deadb)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Added dependency
    [`@graphql-mesh/cross-helpers@^0.4.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/cross-helpers/v/0.4.1)
    (to `dependencies`)
  - Added dependency
    [`@graphql-mesh/utils@^0.96.5` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.96.5)
    (to `dependencies`)
- Updated dependencies
  [[`44d40ff`](https://github.com/ardatan/graphql-mesh/commit/44d40fff17877a52e63c6f644635ea53eb9deadb),
  [`7b494d9`](https://github.com/ardatan/graphql-mesh/commit/7b494d981862034f256225e2c9a5c43a403ff79d)]:
  - @graphql-mesh/fusion-runtime@0.1.0

## 0.0.2

### Patch Changes

- Updated dependencies
  [[`7c18a3f`](https://github.com/ardatan/graphql-mesh/commit/7c18a3f9163f5156758b8cdf0292b28a3bb6046b)]:
  - @graphql-mesh/fusion-runtime@0.0.2

## 0.0.1

### Patch Changes

- Updated dependencies
  [[`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)]:
  - @graphql-mesh/fusion-federation@0.0.1
  - @graphql-mesh/fusion-runtime@0.0.1
