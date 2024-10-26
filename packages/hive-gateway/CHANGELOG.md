# @graphql-hive/gateway

## 1.4.0

### Minor Changes

- [#7712](https://github.com/ardatan/graphql-mesh/pull/7712)
  [`dc54d58`](https://github.com/ardatan/graphql-mesh/commit/dc54d589afa0d08378565e1153b679397f2853a5)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add support for upstream WebSocket
  subscriptions in Docker and binary distributions.

  The HTTP headers of the incoming client's request can now be forwarded to the upstream in the
  [WebSocket HTTP upgrade request](https://developer.mozilla.org/en-US/docs/Web/HTTP/Protocol_upgrade_mechanism#upgrading_http1.1_connections):

  ```ts
  import { defineConfig } from '@graphql-hive/gateway'

  export const gatewayConfig = defineConfig({
    transportEntries: {
      ['*.http']: {
        options: {
          subscriptions: {
            kind: 'ws',
            location: '/subscriptions',
            headers: [['authentication', '{context.headers.authentication}']]
          }
        }
      }
    }
  })
  ```

### Patch Changes

- [#7712](https://github.com/ardatan/graphql-mesh/pull/7712)
  [`dc54d58`](https://github.com/ardatan/graphql-mesh/commit/dc54d589afa0d08378565e1153b679397f2853a5)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - WebSocket connections are now cached
  against the whole `connectionParams` object and forwarded `headers`. The fixes WebSocket
  connection being reused wrongly when `connectionParams.token` is stable while other fields are
  changing.
- Updated dependencies
  [[`dc54d58`](https://github.com/ardatan/graphql-mesh/commit/dc54d589afa0d08378565e1153b679397f2853a5),
  [`dc54d58`](https://github.com/ardatan/graphql-mesh/commit/dc54d589afa0d08378565e1153b679397f2853a5)]:
  - @graphql-mesh/serve-cli@1.4.0
  - @graphql-mesh/serve-runtime@1.2.4

## 1.3.4

### Patch Changes

- Updated dependencies
  [[`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71),
  [`997b81c`](https://github.com/ardatan/graphql-mesh/commit/997b81c8a5d28508057806b4f16eecc5b713cf71)]:
  - @graphql-mesh/serve-runtime@1.2.3
  - @graphql-mesh/utils@0.102.10
  - @graphql-mesh/serve-cli@1.3.4

## 1.3.3

### Patch Changes

- Updated dependencies
  [[`fad4d27`](https://github.com/ardatan/graphql-mesh/commit/fad4d27bfebb80a374c2041b86ffab509845effe)]:
  - @graphql-mesh/utils@0.102.9
  - @graphql-mesh/serve-runtime@1.2.2
  - @graphql-mesh/serve-cli@1.3.3

## 1.3.2

### Patch Changes

- Updated dependencies
  [[`b256868`](https://github.com/ardatan/graphql-mesh/commit/b25686859d5eb622da8b980c20cbccc7c9d5a450),
  [`23631a7`](https://github.com/ardatan/graphql-mesh/commit/23631a72cf9eec81e677aab400ca6b582c0e9b4b)]:
  - @graphql-mesh/serve-cli@1.3.2

## 1.3.1

### Patch Changes

- Updated dependencies
  [[`f7ad933`](https://github.com/ardatan/graphql-mesh/commit/f7ad933b242ca5facb219364f73d1a3befc2bc17)]:
  - @graphql-mesh/serve-runtime@1.2.1
  - @graphql-mesh/serve-cli@1.3.1

## 1.3.0

### Patch Changes

- Updated dependencies
  [[`cc53c6c`](https://github.com/ardatan/graphql-mesh/commit/cc53c6c6056dcb38477b260e916825d4c8864b57),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c),
  [`cc53c6c`](https://github.com/ardatan/graphql-mesh/commit/cc53c6c6056dcb38477b260e916825d4c8864b57),
  [`518c42c`](https://github.com/ardatan/graphql-mesh/commit/518c42c5a2bee00e224df95c2beb758a28d1323c)]:
  - @graphql-mesh/serve-cli@1.3.0
  - @graphql-mesh/serve-runtime@1.2.0
  - @graphql-mesh/utils@0.102.8

## 1.2.0

### Patch Changes

- Updated dependencies
  [[`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be),
  [`50bf472`](https://github.com/ardatan/graphql-mesh/commit/50bf4723657d27dc196d80407bda40c93aa5c9be)]:
  - @graphql-mesh/serve-cli@1.2.0
  - @graphql-mesh/serve-runtime@1.1.1
  - @graphql-mesh/utils@0.102.7

## 1.1.0

### Patch Changes

- Updated dependencies
  [[`e2b7b14`](https://github.com/ardatan/graphql-mesh/commit/e2b7b14fa9fddd41cdfd80d5ab3ae1d97fa9a251)]:
  - @graphql-mesh/serve-runtime@1.1.0
  - @graphql-mesh/serve-cli@1.1.0

## 1.0.9

### Patch Changes

- Updated dependencies
  [[`bf588d3`](https://github.com/ardatan/graphql-mesh/commit/bf588d372c0078378aaa24beea2da794af7949e6),
  [`9801fbb`](https://github.com/ardatan/graphql-mesh/commit/9801fbbe9a874d63ca839edf29468a49be79b565)]:
  - @graphql-mesh/utils@0.102.6
  - @graphql-mesh/serve-runtime@1.0.5
  - @graphql-mesh/serve-cli@1.0.8

## 1.0.8

### Patch Changes

- [#7748](https://github.com/ardatan/graphql-mesh/pull/7748)
  [`1b58ef4`](https://github.com/ardatan/graphql-mesh/commit/1b58ef43599129669dbd0470b807afc985c72080)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Remove node-libcurl, uWebSockets.js and
  json-bigint-patch

- Updated dependencies
  [[`1b58ef4`](https://github.com/ardatan/graphql-mesh/commit/1b58ef43599129669dbd0470b807afc985c72080),
  [`1b58ef4`](https://github.com/ardatan/graphql-mesh/commit/1b58ef43599129669dbd0470b807afc985c72080)]:
  - @graphql-mesh/serve-cli@1.0.7

## 1.0.7

### Patch Changes

- [#7743](https://github.com/ardatan/graphql-mesh/pull/7743)
  [`59c40fc`](https://github.com/ardatan/graphql-mesh/commit/59c40fc784befcf6c26008761290651a21f25c84)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Dynamically import node-libcurl in ESM

- Updated dependencies
  [[`59c40fc`](https://github.com/ardatan/graphql-mesh/commit/59c40fc784befcf6c26008761290651a21f25c84)]:
  - @graphql-mesh/serve-cli@1.0.6

## 1.0.6

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@1.0.4
  - @graphql-mesh/serve-cli@1.0.5

## 1.0.5

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-runtime@1.0.3
  - @graphql-mesh/serve-cli@1.0.4

## 1.0.4

### Patch Changes

- Updated dependencies
  [[`547cbb7`](https://github.com/ardatan/graphql-mesh/commit/547cbb7afa17d1559d9b365facc51618df995367),
  [`547cbb7`](https://github.com/ardatan/graphql-mesh/commit/547cbb7afa17d1559d9b365facc51618df995367)]:
  - @graphql-mesh/serve-runtime@1.0.2
  - @graphql-mesh/serve-cli@1.0.3

## 1.0.3

### Patch Changes

- Updated dependencies
  [[`ccadfab`](https://github.com/ardatan/graphql-mesh/commit/ccadfabb345139f6320861752872e7454b0feea0)]:
  - @graphql-mesh/serve-runtime@1.0.1
  - @graphql-mesh/serve-cli@1.0.2

## 1.0.2

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/serve-cli@1.0.1

## 1.0.1

### Patch Changes

- [`dae87f5`](https://github.com/ardatan/graphql-mesh/commit/dae87f5479c2f2b815379c11f167769f567bf531)
  Thanks [@ardatan](https://github.com/ardatan)! - Add missing `@graphql-hive/gateway` package to
  the Docker bundle

## 1.0.0

### Major Changes

- [`b822c26`](https://github.com/ardatan/graphql-mesh/commit/b822c268b0bab3a91b3ebeed3eca90a9810b5778)
  Thanks [@ardatan](https://github.com/ardatan)! - v1

### Patch Changes

- [#7626](https://github.com/ardatan/graphql-mesh/pull/7626)
  [`fd245f2`](https://github.com/ardatan/graphql-mesh/commit/fd245f2619346667038d3fcce9aa097994368815)
  Thanks [@ardatan](https://github.com/ardatan)! - Enable Compile Caching for better performance -
  (See here)[https://nodejs.org/en/blog/release/v22.8.0#2024-09-03-version-2280-current-rafaelgss]
- Updated dependencies
  [[`fd245f2`](https://github.com/ardatan/graphql-mesh/commit/fd245f2619346667038d3fcce9aa097994368815),
  [`b822c26`](https://github.com/ardatan/graphql-mesh/commit/b822c268b0bab3a91b3ebeed3eca90a9810b5778)]:
  - @graphql-mesh/serve-cli@1.0.0
  - @graphql-mesh/serve-runtime@1.0.0

## 0.1.4

### Patch Changes

- Updated dependencies
  [[`e7765e6`](https://github.com/ardatan/graphql-mesh/commit/e7765e636f077a2dd0d5de2e61351bb6a9f7f8f9)]:
  - @graphql-mesh/serve-cli@0.12.4
  - @graphql-mesh/serve-runtime@0.9.4

## 0.1.3

### Patch Changes

- Updated dependencies
  [[`81c25d3`](https://github.com/ardatan/graphql-mesh/commit/81c25d3a32ba9048303be26b5a38eeaf82a66e73)]:
  - @graphql-mesh/serve-runtime@0.9.3
  - @graphql-mesh/serve-cli@0.12.3

## 0.1.2

### Patch Changes

- [#7601](https://github.com/ardatan/graphql-mesh/pull/7601)
  [`04251e5`](https://github.com/ardatan/graphql-mesh/commit/04251e57d05b91a2d4018ac63639d8b1eb56855a)
  Thanks [@ardatan](https://github.com/ardatan)! - Warn if \`node-libcurl\` is not available

- Updated dependencies
  [[`b50ad41`](https://github.com/ardatan/graphql-mesh/commit/b50ad4132197da143b2568f00b0136e013cee7d0),
  [`04251e5`](https://github.com/ardatan/graphql-mesh/commit/04251e57d05b91a2d4018ac63639d8b1eb56855a)]:
  - @graphql-mesh/serve-cli@0.12.2
  - @graphql-mesh/serve-runtime@0.9.2

## 0.1.1

### Patch Changes

- Updated dependencies
  [[`bc70d78`](https://github.com/ardatan/graphql-mesh/commit/bc70d78c7542d1ca46fe65a9886da880e7e574b7)]:
  - @graphql-mesh/serve-runtime@0.9.1
  - @graphql-mesh/serve-cli@0.12.1

## 0.1.0

### Patch Changes

- [#7584](https://github.com/ardatan/graphql-mesh/pull/7584)
  [`d4838b0`](https://github.com/ardatan/graphql-mesh/commit/d4838b0f530dc1841ad9da0cd88cb26387564012)
  Thanks [@ardatan](https://github.com/ardatan)! - Introduce Hive Gateway

- Updated dependencies
  [[`9f01438`](https://github.com/ardatan/graphql-mesh/commit/9f01438fbdf327c0a4bfa0cf440d890ec871ffcc),
  [`9f01438`](https://github.com/ardatan/graphql-mesh/commit/9f01438fbdf327c0a4bfa0cf440d890ec871ffcc),
  [`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d),
  [`3bf14b3`](https://github.com/ardatan/graphql-mesh/commit/3bf14b33ee621cce004a329928b8a04a68218016),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`0a3e52c`](https://github.com/ardatan/graphql-mesh/commit/0a3e52c2ad2941e7c48f0e80706db41644797c2d),
  [`75e9f63`](https://github.com/ardatan/graphql-mesh/commit/75e9f63d09514a0af786f909dc8c32ac09a1a849),
  [`9f01438`](https://github.com/ardatan/graphql-mesh/commit/9f01438fbdf327c0a4bfa0cf440d890ec871ffcc),
  [`4662f65`](https://github.com/ardatan/graphql-mesh/commit/4662f6558f7146c3c1b51ffd8de0433ff40eaffb),
  [`2ac3981`](https://github.com/ardatan/graphql-mesh/commit/2ac3981ce8e03ba5bfb78f8aceca7e4ed06f938a),
  [`b7f6ebf`](https://github.com/ardatan/graphql-mesh/commit/b7f6ebfa077957c3a1ecad1fed449e972cb09ae0),
  [`d4838b0`](https://github.com/ardatan/graphql-mesh/commit/d4838b0f530dc1841ad9da0cd88cb26387564012)]:
  - @graphql-mesh/serve-cli@0.12.0
  - @graphql-mesh/serve-runtime@0.9.0
  - @graphql-mesh/utils@0.102.5
