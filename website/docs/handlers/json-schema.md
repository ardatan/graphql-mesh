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

## Codesandbox Example

You can check out our example that uses JSON Schema handler with mock data.

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/json-schema-example?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="json-schema-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin" />

## Config API Reference

{@import ../generated-markdown/JsonSchemaHandler.generated.md}
