---
id: json-schema
title: JSON Schema
sidebar_label: JSON Schema
---

This handler allows you to load any remote REST service, and describe it's request/response using the YAML config.

With this handler, you can easily customize and control the built GraphQL schema.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/json-schema
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: MyApi
    handler:
      jsonSchema:
        baseUrl: https://some-service-url/endpoint-path/
        operations:
          - type: Query
            field: users
            path: /users
            method: GET
            responseSchema: ./json-schemas/users.json
```

## Config API Reference

{@import ../generated-markdown/JsonSchemaHandler.generated.md}
