# @graphql-mesh/transport-common

## 0.7.13

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.102.12

## 0.7.12

### Patch Changes

- [#7838](https://github.com/ardatan/graphql-mesh/pull/7838)
  [`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.28` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.28)
    (from `^10.0.27`, in `dependencies`)
- Updated dependencies
  [[`de41fc2`](https://github.com/ardatan/graphql-mesh/commit/de41fc2932433f8da35b9de9492720e6c8c100af)]:
  - @graphql-mesh/types@0.102.11

## 0.7.11

### Patch Changes

- [#7828](https://github.com/ardatan/graphql-mesh/pull/7828)
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.27` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.27)
    (from `^10.0.26`, in `dependencies`)
- Updated dependencies
  [[`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)]:
  - @graphql-mesh/types@0.102.10

## 0.7.10

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.102.9

## 0.7.9

### Patch Changes

- [#7769](https://github.com/ardatan/graphql-mesh/pull/7769)
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.26` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.26)
    (from `^10.0.23`, in `dependencies`)
- Updated dependencies
  [[`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)]:
  - @graphql-mesh/types@0.102.8

## 0.7.8

### Patch Changes

- [#7781](https://github.com/ardatan/graphql-mesh/pull/7781)
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.23` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.23)
    (from `^10.0.21`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.5.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.5)
    (from `^10.5.3`, in `dependencies`)
- Updated dependencies
  [[`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)]:
  - @graphql-mesh/types@0.102.7

## 0.7.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.102.6

## 0.7.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.102.5

## 0.7.5

### Patch Changes

- [#7488](https://github.com/ardatan/graphql-mesh/pull/7488)
  [`5146df0`](https://github.com/ardatan/graphql-mesh/commit/5146df0fd3313227d5d7df2beb726ca89e13923f)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve Transport typings

## 0.7.4

### Patch Changes

- [#7576](https://github.com/ardatan/graphql-mesh/pull/7576)
  [`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.21` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.21)
    (from `^10.0.20`, in `dependencies`)
- Updated dependencies
  [[`edbc074`](https://github.com/ardatan/graphql-mesh/commit/edbc074523ebc86114bb3342f86b7bcd9268d005)]:
  - @graphql-mesh/types@0.102.4

## 0.7.3

### Patch Changes

- [#7572](https://github.com/ardatan/graphql-mesh/pull/7572)
  [`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.20)
    (from `^10.0.19`, in `dependencies`)
- Updated dependencies
  [[`14ec31f`](https://github.com/ardatan/graphql-mesh/commit/14ec31f95bc06e9a3d06fae387fc40cc534e01f4)]:
  - @graphql-mesh/types@0.102.3

## 0.7.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.102.2

## 0.7.1

### Patch Changes

- [#7013](https://github.com/ardatan/graphql-mesh/pull/7013)
  [`60bfc22`](https://github.com/ardatan/graphql-mesh/commit/60bfc2240108af0a599a66451517a146cace879d)
  Thanks [@ardatan](https://github.com/ardatan)! - Introduce a standard Upstream Error Format for
  HTTP-based sources;

  So all sources throw an error will have the extensions in the following format;

  ```json
  {
    "extensions": {
      "request": {
        // The details of the request made to the upstream service
        "endpoint": "https://api.example.com",
        "method": "GET"
      },
      "response": {
        // The details of the HTTP response from the upstream service
        "status": 401,
        "statusText": "Unauthorized",
        "headers": {
          "content-type": "application/json"
        },
        "body": {
          // The raw body returned by the upstream service
          "error-message": "Unauthorized access"
        }
      }
    }
  }
  ```

- Updated dependencies []:
  - @graphql-mesh/types@0.102.1

## 0.7.0

### Patch Changes

- Updated dependencies
  [[`db41f96`](https://github.com/ardatan/graphql-mesh/commit/db41f96b392de95d5f3aff958df399bf58575373)]:
  - @graphql-mesh/types@0.102.0

## 0.6.1

### Patch Changes

- [#7516](https://github.com/ardatan/graphql-mesh/pull/7516)
  [`67e1062`](https://github.com/ardatan/graphql-mesh/commit/67e10629c70ec553234c1ffc99af4b89ddb31985)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Transport's kind doesn't need to be typed

## 0.6.0

### Patch Changes

- [#7497](https://github.com/ardatan/graphql-mesh/pull/7497)
  [`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.5.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.2)
    (from `^10.3.4`, in `dependencies`)

- [#7512](https://github.com/ardatan/graphql-mesh/pull/7512)
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.19)
    (from `^10.0.18`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.5.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.3)
    (from `^10.5.2`, in `dependencies`)
- Updated dependencies
  [[`d784488`](https://github.com/ardatan/graphql-mesh/commit/d784488dcf04b3b0bf32f386baf8b48e1f20d27e),
  [`190e9ec`](https://github.com/ardatan/graphql-mesh/commit/190e9ece9bc050a0564f3b5292ab5229e63d40a6)]:
  - @graphql-mesh/types@0.101.0

## 0.5.0

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
- Updated dependencies
  [[`c06a048`](https://github.com/ardatan/graphql-mesh/commit/c06a0482e7431683f0b75fde3aebbb97aca00c4c)]:
  - @graphql-mesh/types@0.100.0

## 0.4.7

### Patch Changes

- Updated dependencies
  [[`a1bfc49`](https://github.com/ardatan/graphql-mesh/commit/a1bfc492ac3378f22b79a51824407e776b496a84)]:
  - @graphql-mesh/types@0.99.7

## 0.4.6

### Patch Changes

- [#7447](https://github.com/ardatan/graphql-mesh/pull/7447)
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@^10.0.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.17)
    (from `^10.0.16`, in `dependencies`)

- [#7447](https://github.com/ardatan/graphql-mesh/pull/7447)
  [`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on schema loading handling

- Updated dependencies
  [[`6c67e77`](https://github.com/ardatan/graphql-mesh/commit/6c67e77d3c308615a733577293ecb6dd55793aeb)]:
  - @graphql-mesh/types@0.99.6

## 0.4.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.99.5

## 0.4.4

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.99.4

## 0.4.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.99.3

## 0.4.2

### Patch Changes

- [#7352](https://github.com/ardatan/graphql-mesh/pull/7352)
  [`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@^10.0.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.16)
    (from `^10.0.14`, in `dependencies`)

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
  [[`4bc495c`](https://github.com/ardatan/graphql-mesh/commit/4bc495c03493f18c85e11f3f5fb54b3c35d16d8e)]:
  - @graphql-mesh/types@0.99.2

## 0.4.1

### Patch Changes

- [#7316](https://github.com/ardatan/graphql-mesh/pull/7316)
  [`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.14)
    (from `^10.0.12`, in `dependencies`)
- Updated dependencies
  [[`7800514`](https://github.com/ardatan/graphql-mesh/commit/780051468203f3e82e7fee4ac40ce8b8a2cb10a3)]:
  - @graphql-mesh/types@0.99.1

## 0.4.0

### Minor Changes

- [#7207](https://github.com/ardatan/graphql-mesh/pull/7207)
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Define transports using a default export
  satisfying the `Transport` generic

  For example, a custom http transport implementation looks like this:

  ```ts
  // http-transport.ts

  import { Transport } from '@graphql-mesh/transport-common'

  export interface HTTPTransportOptions {
    cache?: boolean
  }

  export default {
    getSubgraphExecutor(opts) {
      // <the implementation of your executor getter>
    }
  } satisfies Transport<'http', HTTPTransportOptions>
  ```

  and is used for Mesh serve like this:

  ```ts
  // mesh.config.ts

  import { defineConfig } from '@graphql-mesh/serve-cli'

  export const serveConfig = defineConfig({
    transport: {
      http: import('./http-transport')
    }
  })
  ```

  or like this:

  ```ts
  // mesh.config.ts

  import { defineConfig } from '@graphql-mesh/serve-cli'
  import httpTransport from './http-transport'

  export const serveConfig = defineConfig({
    transport: {
      http: httpTransport
    }
  })
  ```

### Patch Changes

- [#7207](https://github.com/ardatan/graphql-mesh/pull/7207)
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency
    [`@envelop/core@^5.0.1` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.1) (to
    `dependencies`)

- [#7218](https://github.com/ardatan/graphql-mesh/pull/7218)
  [`ededa2c`](https://github.com/ardatan/graphql-mesh/commit/ededa2c9e0fd44b338f2d3c66adfa1b59b130fa2)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:

  - Added dependency
    [`@envelop/core@^5.0.1` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.1) (to
    `dependencies`)

- [#7207](https://github.com/ardatan/graphql-mesh/pull/7207)
  [`69e6eb5`](https://github.com/ardatan/graphql-mesh/commit/69e6eb55b8e66024ccb7c97c017589e1eeb6bb1e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Improved typings and rename
  `TransportBaseContext` to `TransportContext`

- Updated dependencies []:
  - @graphql-mesh/types@0.99.0

## 0.3.1

### Patch Changes

- [#7185](https://github.com/ardatan/graphql-mesh/pull/7185)
  [`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.12)
    (from `^10.0.11`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.2.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.3)
    (from `^10.2.1`, in `dependencies`)
- Updated dependencies
  [[`0d916a4`](https://github.com/ardatan/graphql-mesh/commit/0d916a4b4603ca57a383337f42c51ef8d5f4ae3d),
  [`8a04cf7`](https://github.com/ardatan/graphql-mesh/commit/8a04cf7abff41122d5268c57acfb26e97712730b)]:
  - @graphql-mesh/types@0.98.10

## 0.3.0

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

- Updated dependencies []:
  - @graphql-mesh/types@0.98.9

## 0.2.8

### Patch Changes

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `Disposable` pattern for plugins and
  transports

- Updated dependencies
  [[`4c75671`](https://github.com/ardatan/graphql-mesh/commit/4c756717247eb0a8f3431e31e6c86fc97297bd32),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/types@0.98.8

## 0.2.7

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.98.7

## 0.2.6

### Patch Changes

- [#7030](https://github.com/ardatan/graphql-mesh/pull/7030)
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.11)
    (from `^10.0.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.1)
    (from `^10.2.0`, in `dependencies`)
- Updated dependencies
  [[`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)]:
  - @graphql-mesh/types@0.98.6

## 0.2.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.98.5

## 0.2.4

### Patch Changes

- [`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)
  Thanks [@ardatan](https://github.com/ardatan)! - Update GraphQL Tools packages

- Updated dependencies
  [[`fb59244`](https://github.com/ardatan/graphql-mesh/commit/fb592447c12950582881b24c0ca035a34d2ca48c)]:
  - @graphql-mesh/types@0.98.4

## 0.2.3

### Patch Changes

- [`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies
  [[`c47b2aa`](https://github.com/ardatan/graphql-mesh/commit/c47b2aa8c225f04157c1391c638f866bb01edffa)]:
  - @graphql-mesh/types@0.98.3

## 0.2.2

### Patch Changes

- [`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

- Updated dependencies
  [[`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)]:
  - @graphql-mesh/types@0.98.2

## 0.2.1

### Patch Changes

- Updated dependencies
  [[`6044b7f`](https://github.com/ardatan/graphql-mesh/commit/6044b7f8bd72ee3d4460d9f09f303ea6fc4e007b)]:
  - @graphql-mesh/types@0.98.1

## 0.2.0

### Patch Changes

- [#6872](https://github.com/ardatan/graphql-mesh/pull/6872)
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.6)
    (from `^10.0.3`, in `dependencies`)
- Updated dependencies
  [[`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)]:
  - @graphql-mesh/types@0.98.0

## 0.1.5

### Patch Changes

- Updated dependencies
  [[`52f74e7`](https://github.com/ardatan/graphql-mesh/commit/52f74e75219a32d30dea693a571c64c9c7519eb6)]:
  - @graphql-mesh/types@0.97.5

## 0.1.4

### Patch Changes

- Updated dependencies
  [[`ff33394`](https://github.com/ardatan/graphql-mesh/commit/ff3339451d8911f9b9265e158ad86844648ee12f)]:
  - @graphql-mesh/types@0.97.4

## 0.1.3

### Patch Changes

- Updated dependencies
  [[`57f4a60`](https://github.com/ardatan/graphql-mesh/commit/57f4a601c1f9819937c784ab9aae68f3368cbefd)]:
  - @graphql-mesh/types@0.97.3

## 0.1.2

### Patch Changes

- Updated dependencies
  [[`7a712ab`](https://github.com/ardatan/graphql-mesh/commit/7a712ab915ac3216765951080e689d510b5682a6)]:
  - @graphql-mesh/types@0.97.2

## 0.1.1

### Patch Changes

- Updated dependencies
  [[`dbaf72c`](https://github.com/ardatan/graphql-mesh/commit/dbaf72c4520f64524dce14b798019639c4d57020)]:
  - @graphql-mesh/types@0.97.1

## 0.1.0

### Patch Changes

- Updated dependencies
  [[`92dce67`](https://github.com/ardatan/graphql-mesh/commit/92dce67df35d70001ca9c818870a85256175279a)]:
  - @graphql-mesh/types@0.97.0

## 0.0.3

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.96.6

## 0.0.2

### Patch Changes

- Updated dependencies
  [[`4b3ea1d`](https://github.com/ardatan/graphql-mesh/commit/4b3ea1d4ac804341d8dcae289ec1eac37026b908)]:
  - @graphql-mesh/types@0.96.5

## 0.0.1

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - New Fusion packages

- Updated dependencies
  [[`ae7b085`](https://github.com/ardatan/graphql-mesh/commit/ae7b085e93ba911f03bbfd2a15ff9ca8be9f4de8)]:
  - @graphql-mesh/types@0.96.4
