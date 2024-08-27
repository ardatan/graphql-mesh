---
'@graphql-mesh/hmac-upstream-signature': minor
'@graphql-mesh/plugin-operation-headers': minor
'@graphql-mesh/transport-http-callback': minor
'@graphql-mesh/plugin-opentelemetry': minor
'@graphql-mesh/fusion-composition': minor
'@graphql-mesh/plugin-prometheus': minor
'@graphql-mesh/transport-sqlite': minor
'@graphql-mesh/plugin-jwt-auth': minor
'@graphql-mesh/serve-runtime': minor
'@graphql-mesh/serve-cli': minor
---

BREAKING:
All types prefixed with `MeshServe`, now are prefixed with `Gateway`.
e.g. `MeshServeRuntime` -> `GatewayRuntime`

Runtime factory is renamed;
`createServeRuntime` -> `createGatewayRuntime`

The expected export name for config files are renamed from `serveConfig` to `gatewayConfig`

RENAMING:

You can rename the product, config file name etc by using the following config options;

For example;
```ts
productName = 'Mesh Gateway';
productDescription = 'Mesh Gateway is a GraphQL Gateway that can be used to serve a supergraph schema.';
productLogo = "<svg>...</svg>";
productPackageName = "@graphql-mesh/gateway";
```
