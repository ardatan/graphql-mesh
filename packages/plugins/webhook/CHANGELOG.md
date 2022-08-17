# @graphql-mesh/plugin-webhook

## 0.0.8

### Patch Changes

- [#4314](https://github.com/Urigo/graphql-mesh/pull/4314) [`cbc00748e`](https://github.com/Urigo/graphql-mesh/commit/cbc00748e8538e17e83b1a858947ff6503c6d5c0) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-yoga/common@2.12.6` ↗︎](https://www.npmjs.com/package/@graphql-yoga/common/v/2.12.6) (from `2.12.5`, in `dependencies`)

- Updated dependencies [[`b162269f7`](https://github.com/Urigo/graphql-mesh/commit/b162269f70a90594962792ffaaa40d3a7ee9f4e4), [`2ad667d96`](https://github.com/Urigo/graphql-mesh/commit/2ad667d964545ed47170cfa4f9393282edc2073b)]:
  - @graphql-mesh/types@0.79.0
  - @graphql-mesh/string-interpolation@0.3.2

## 0.0.7

### Patch Changes

- Updated dependencies [[`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968)]:
  - @graphql-mesh/string-interpolation@0.3.1
  - @graphql-mesh/types@0.78.8

## 0.0.6

### Patch Changes

- Updated dependencies [[`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)]:
  - @graphql-mesh/types@0.78.7

## 0.0.5

### Patch Changes

- Updated dependencies [[`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b)]:
  - @graphql-mesh/types@0.78.6

## 0.0.4

### Patch Changes

- Updated dependencies [c88a34d82]
  - @graphql-mesh/types@0.78.5

## 0.0.3

### Patch Changes

- @graphql-mesh/types@0.78.4

## 0.0.2

### Patch Changes

- Updated dependencies [738e2f378]
  - @graphql-mesh/types@0.78.3

## 0.0.1

### Patch Changes

- a2ef35c35: ** Use the new `@whatwg-node/fetch` package instead of `cross-undici-fetch`**

  `cross-undici-fetch` has been renamed to `@whatwg-node-fetch`. Now Mesh uses this new package.

  ** BREAKING: Drop `serve.handlers` in favor of the new plugin system **

  Now Mesh uses the new plugin system of GraphQL Yoga that uses WHATWG Fetch API instead of Node specific `serve.handlers`. That means you can use those plugins with any environment even if you are not using Node.js with `mesh start`.

  Please check our docs to see how you can migrate to the new usage.
  https://www.graphql-mesh.com/docs/guides/subscriptions-webhooks#handle-webhook-http-requests

- Updated dependencies [a2ef35c35]
  - @graphql-mesh/types@0.78.2
