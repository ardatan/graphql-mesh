# @graphql-mesh/plugin-webhook

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
