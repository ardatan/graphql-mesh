---
'@graphql-mesh/transport-connect': minor
'@omnigraph/json-schema': minor
'@omnigraph/openapi': minor
'@omnigraph/raml': minor
'@omnigraph/odata': minor
'@omnigraph/soap': minor
'@graphql-mesh/odata': minor
'@graphql-mesh/soap': minor
'@graphql-mesh/fusion-composition': minor
'@graphql-mesh/utils': minor
---

**Breaking (0.x) migration:** `@graphql-mesh/transport-rest` + `@transport(kind: "rest")` → `@graphql-mesh/transport-connect` + `@transport(kind: "connect")`. Cut over package name, imports, and `kind` together (no compat shim).

Types rename: `RESTTransportOptions` / `RESTTransportDirectiveOptions` → `ConnectTransportOptions` / `ConnectTransportDirectiveOptions`.

Hive Gateway loads transports as `@graphql-mesh/transport-${kind}`. This package runs Federation Connectors (`@connect` / `@source`, Apollo `connect/v0.4`) for OpenAPI/JSON Schema/RAML, OData, and SOAP, so `connect` matches the Apollo Connect spec name. Apollo Router ignores Mesh `@transport` and only runs `@connect` / `@source`.

### Before

```ts
import rest from '@graphql-mesh/transport-rest';

defineGatewayConfig({
  transports: { rest },
});
```

```graphql
schema @transport(subgraph: "API", kind: "rest", location: "https://api.example.com") {
  query: Query
}
```

### After

```ts
import connect from '@graphql-mesh/transport-connect';

defineGatewayConfig({
  transports: { connect },
});
```

```graphql
schema @transport(subgraph: "API", kind: "connect", location: "https://api.example.com") {
  query: Query
}
```
