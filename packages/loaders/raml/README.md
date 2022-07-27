## RAML (@omnigraph/raml)

This package generates `GraphQLSchema` instance from **RAML API Document** (`.raml`) file located at a URL or FileSystem by resolving the JSON Schema dependencies. It uses `@omnigraph/json-schema` by generating the necessary configuration.

```yaml
schema:
  myOmnigraph:
    loader: '@omnigraph/raml'
    ramlFilePath: https://www.my-api.com/api.raml
    operationHeaders:
      Authorization: Bearer {context.apiToken}
```
