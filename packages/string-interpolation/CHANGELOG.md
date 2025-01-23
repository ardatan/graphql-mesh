# @graphql-mesh/string-interpolation

## 0.5.8

### Patch Changes

- [#8301](https://github.com/ardatan/graphql-mesh/pull/8301)
  [`78c202e`](https://github.com/ardatan/graphql-mesh/commit/78c202ef8824607e27de1dcc5076c82a02ef86cd)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid logging sensitive data directly. Instead,
  log a generic error message without including the potentially sensitive str variable. This way, it
  still notifies of errors without risking the exposure of sensitive information.

  - Replace the logging statement on line 176 in `packages/string-interpolation/src/interpolator.js`
    to avoid logging the `str` variable.
  - Ensure that the new logging statement provides enough information to debug the issue without
    exposing sensitive data.

## 0.5.7

### Patch Changes

- [#8092](https://github.com/ardatan/graphql-mesh/pull/8092)
  [`2ef651a`](https://github.com/ardatan/graphql-mesh/commit/2ef651a8356b560478f1847399bad975a0c3f0b9)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency [`tslib@^2.4.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.4.0) (to
    `dependencies`)
  - Removed dependency [`tslib@^2.4.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.4.0) (from
    `peerDependencies`)

## 0.5.6

### Patch Changes

- [#7543](https://github.com/ardatan/graphql-mesh/pull/7543)
  [`13fa835`](https://github.com/ardatan/graphql-mesh/commit/13fa835036c3671305fc831fa236f110c33d9965)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dayjs@1.11.13` ↗︎](https://www.npmjs.com/package/dayjs/v/1.11.13) (from
    `1.11.12`, in `dependencies`)

## 0.5.5

### Patch Changes

- [#7311](https://github.com/ardatan/graphql-mesh/pull/7311)
  [`b01f3ea`](https://github.com/ardatan/graphql-mesh/commit/b01f3eabdc42d8905e8d586a4845e8394c094033)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`dayjs@1.11.12` ↗︎](https://www.npmjs.com/package/dayjs/v/1.11.12) (from
    `1.11.11`, in `dependencies`)

- [#7323](https://github.com/ardatan/graphql-mesh/pull/7323)
  [`0bdc18d`](https://github.com/ardatan/graphql-mesh/commit/0bdc18df3d150a61abf987b8829934ed4ca02eed)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dayjs@1.11.12` ↗︎](https://www.npmjs.com/package/dayjs/v/1.11.12) (from
    `1.11.11`, in `dependencies`)

## 0.5.4

### Patch Changes

- [#6904](https://github.com/ardatan/graphql-mesh/pull/6904)
  [`3d88cb8`](https://github.com/ardatan/graphql-mesh/commit/3d88cb8ff1829081411fcb2051ad18d7f89536ba)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dayjs@1.11.11` ↗︎](https://www.npmjs.com/package/dayjs/v/1.11.11) (from
    `1.11.10`, in `dependencies`)

## 0.5.3

### Patch Changes

- [#6138](https://github.com/ardatan/graphql-mesh/pull/6138)
  [`b4d38c55d`](https://github.com/ardatan/graphql-mesh/commit/b4d38c55df8c4d2aeb98325555979eb09d065906)
  Thanks [@Pagebakers](https://github.com/Pagebakers)! - Fixed issue where applyRule() would handle
  falsy replacements incorrectly

## 0.5.2

### Patch Changes

- [#5982](https://github.com/Urigo/graphql-mesh/pull/5982)
  [`8e1056cf9`](https://github.com/Urigo/graphql-mesh/commit/8e1056cf91b0e7069499f5102aaed163a0168597)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dayjs@1.11.10` ↗︎](https://www.npmjs.com/package/dayjs/v/1.11.10) (from
    `1.11.9`, in `dependencies`)

## 0.5.1

### Patch Changes

- [#5626](https://github.com/Urigo/graphql-mesh/pull/5626)
  [`fba66c6fc`](https://github.com/Urigo/graphql-mesh/commit/fba66c6fc7a0ca15393df8ae5382d97eb0ae8fcf)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dayjs@1.11.9` ↗︎](https://www.npmjs.com/package/dayjs/v/1.11.9) (from
    `1.11.8`, in `dependencies`)

## 0.5.0

### Minor Changes

- [#5449](https://github.com/Urigo/graphql-mesh/pull/5449)
  [`ef520d91e`](https://github.com/Urigo/graphql-mesh/commit/ef520d91e6d1800ed63ef016ed74084261788371)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support and require Node 16 or
  higher

### Patch Changes

- [#5506](https://github.com/Urigo/graphql-mesh/pull/5506)
  [`3d9218360`](https://github.com/Urigo/graphql-mesh/commit/3d9218360dff838b9d3c731c92b3b6e8ad52e2c7)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dayjs@1.11.8` ↗︎](https://www.npmjs.com/package/dayjs/v/1.11.8) (from
    `1.11.7`, in `dependencies`)

## 0.4.4

### Patch Changes

- [`abc0c8747`](https://github.com/Urigo/graphql-mesh/commit/abc0c8747b274e011f5b8387233fe96d4f702035)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not set empty header values

## 0.4.3

### Patch Changes

- [#5252](https://github.com/Urigo/graphql-mesh/pull/5252)
  [`c90eb5ac6`](https://github.com/Urigo/graphql-mesh/commit/c90eb5ac631507de1f49db68ca681193cc5a20b5)
  Thanks [@ardatan](https://github.com/ardatan)! - Make shared packages peer dependency

## 0.4.2

### Patch Changes

- [#4930](https://github.com/Urigo/graphql-mesh/pull/4930)
  [`c015b02a1`](https://github.com/Urigo/graphql-mesh/commit/c015b02a1aa50e4d760c3fd59f76dc5dfe587664)
  Thanks [@gilgardosh](https://github.com/gilgardosh)! - Prettier fixes

- [#4999](https://github.com/Urigo/graphql-mesh/pull/4999)
  [`fb9113d5b`](https://github.com/Urigo/graphql-mesh/commit/fb9113d5bfc4865d51f9cb1bd3236c7c0c27b170)
  Thanks [@mhassan1](https://github.com/mhassan1)! - Added missing `tslib` dependency

## 0.4.1

### Patch Changes

- [#4910](https://github.com/Urigo/graphql-mesh/pull/4910)
  [`deb9912e0`](https://github.com/Urigo/graphql-mesh/commit/deb9912e0bc2ae782c9570b60a7224b47af341eb)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes for ESM

## 0.4.0

### Minor Changes

- [#4821](https://github.com/Urigo/graphql-mesh/pull/4821)
  [`1a28c92c2`](https://github.com/Urigo/graphql-mesh/commit/1a28c92c2d67b89b48581b7bb1414d1404428cdb)
  Thanks [@ardatan](https://github.com/ardatan)! - Update build flow to fully support both CommonJS
  and ESM

### Patch Changes

- [#4898](https://github.com/Urigo/graphql-mesh/pull/4898)
  [`5ed3435b8`](https://github.com/Urigo/graphql-mesh/commit/5ed3435b8fdfd115566ef548f044884628d39211)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dayjs@1.11.7` ↗︎](https://www.npmjs.com/package/dayjs/v/1.11.7) (from
    `1.11.6`, in `dependencies`)

## 0.3.3

### Patch Changes

- [#4719](https://github.com/Urigo/graphql-mesh/pull/4719)
  [`5c87cfc60`](https://github.com/Urigo/graphql-mesh/commit/5c87cfc60501213e8701482b093490ec1a5fce23)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dayjs@1.11.6` ↗︎](https://www.npmjs.com/package/dayjs/v/1.11.6) (from
    `1.11.5`, in `dependencies`)

## 0.3.2

### Patch Changes

- [#4310](https://github.com/Urigo/graphql-mesh/pull/4310)
  [`2ad667d96`](https://github.com/Urigo/graphql-mesh/commit/2ad667d964545ed47170cfa4f9393282edc2073b)
  Thanks [@belgattitude](https://github.com/belgattitude)! - Add MIT licence field in package.json

## 0.3.1

### Patch Changes

- [#4298](https://github.com/Urigo/graphql-mesh/pull/4298)
  [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`dayjs@1.11.5` ↗︎](https://www.npmjs.com/package/dayjs/v/1.11.5) (was
    `1.11.4`, in `dependencies`)

## 0.3.0

### Minor Changes

- 13b9b30f7: Add interpolation strings to the generated MeshContext type

## 0.2.0

### Minor Changes

- 974e703e2: No longer import entire lodash library but instead individual smaller packages

### Patch Changes

- 974e703e2: Cleanup dependencies
- 974e703e2: Use deeper lodash imports to have better treeshaking and avoid using eval

## 0.1.0

### Minor Changes

- 2e9addd80: Use platform agnostic json-pointer instead of json-ptr

### Patch Changes

- 2e9addd80: Bump cross-undici-fetch for Node 18 compat

## 0.0.1

### Patch Changes

- 7856f92d3: Bump all packages
