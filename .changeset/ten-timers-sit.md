---
"@graphql-mesh/cli": patch
"@graphql-mesh/config": patch
"@graphql-mesh/odata": patch
"@graphql-mesh/openapi": patch
"json-machete": patch
"@omnigraph/json-schema": patch
"@omnigraph/openapi": patch
"@omnigraph/raml": patch
"@graphql-mesh/types": patch
"@graphql-mesh/utils": patch
"@graphql-mesh/plugin-webhook": patch
---

** Use the new `@whatwg-node/fetch` package instead of `cross-undici-fetch`**

`cross-undici-fetch` has been renamed to `@whatwg-node-fetch`. Now Mesh uses this new package.

** BREAKING: Drop `serve.handlers` in favor of the new plugin system **

Now Mesh uses the new plugin system of GraphQL Yoga that uses WHATWG Fetch API instead of Node specific `serve.handlers`. That means you can use those plugins with any environment even if you are not using Node.js with `mesh start`.

Please check our docs to see how you can migrate to the new usage.
https://www.graphql-mesh.com/docs/guides/subscriptions-webhooks#handle-webhook-http-requests



