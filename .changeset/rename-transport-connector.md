---
'@graphql-mesh/transport-connector': minor
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

**Breaking (0.x):** Rename `@graphql-mesh/transport-rest` to `@graphql-mesh/transport-connector`, and rename the Mesh `@transport` kind from `rest` to `connector`.

Hive Gateway loads transports as `@graphql-mesh/transport-${kind}` (see `defaultTransportsGetter`). The package now covers Federation Connectors for OpenAPI/JSON Schema/RAML, OData, and SOAP, so `connector` matches the runtime better than `rest`. Apollo Router does not use Mesh `@transport`; it runs `@connect` / `@source` only, so the kind string is Mesh/Hive-owned.

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
import connector from '@graphql-mesh/transport-connector';

defineGatewayConfig({
  transports: { connector },
});
```

```graphql
schema @transport(subgraph: "API", kind: "connector", location: "https://api.example.com") {
  query: Query
}
```

Install `@graphql-mesh/transport-connector` instead of `@graphql-mesh/transport-rest`. No compat shim: cut over package name, imports, and `kind` together. Type `RESTTransportOptions` / `RESTTransportDirectiveOptions` rename to `ConnectorTransportOptions` / `ConnectorTransportDirectiveOptions`.
