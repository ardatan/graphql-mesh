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

**Breaking (0.x):** Rename `@graphql-mesh/transport-rest` to `@graphql-mesh/transport-connect`, and rename the Mesh `@transport` kind from `rest` to `connect`.

Hive Gateway loads transports as `@graphql-mesh/transport-${kind}` (see `defaultTransportsGetter`). The package executes Federation Connectors (`@connect` / `@source`, Apollo `connect/v0.4`) for OpenAPI/JSON Schema/RAML, OData, and SOAP, so `connect` matches the Apollo Connect spec name. Apollo Router does not use Mesh `@transport`; it runs `@connect` / `@source` only, so the kind string is Mesh/Hive-owned.

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

Install `@graphql-mesh/transport-connect` instead of `@graphql-mesh/transport-rest`. No compat shim: cut over package name, imports, and `kind` together. Type `RESTTransportOptions` / `RESTTransportDirectiveOptions` rename to `ConnectTransportOptions` / `ConnectTransportDirectiveOptions`.

