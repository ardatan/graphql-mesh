---
id: json-schema
title: JSON Schema or Samples
sidebar_label: JSON Schema or Samples
---
![image](https://user-images.githubusercontent.com/20847995/79218994-11434880-7e5a-11ea-8594-08185526080f.png)

This handler allows you to load any remote REST service, and describe its request/response using the YAML config.

With this handler, you can easily customize and control the built GraphQL schema.

To get started, install the handler library from NPM:

```sh
yarn add @graphql-mesh/json-schema
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
## Dynamic Values

Mesh can take dynamic values from the GraphQL Context or the environmental variables. If you use `mesh dev` or `mesh start`, GraphQL Context will be the incoming HTTP request.

The expression inside dynamic values should be as in JS.

### From Context (HTTP Header for `mesh dev` or `mesh start`)

```yml
sources:
  - name: MyGraphQLApi
    handler:
      jsonSchema:
        baseUrl: https://some-service-url/endpoint-path/
        operationHeaders:
          # Please do not use capital letters while getting the headers
          Authorization: Bearer {context.headers['x-my-api-token']}
```

And for `mesh dev` or `mesh start`, you can pass the value using `x-my-graphql-api-token` HTTP header.

### From Environmental Variable

`MY_API_TOKEN` is the name of the environmental variable you have the value.

```yml
sources:
  - name: MyGraphQLApi
    handler:
      jsonSchema:
        baseUrl: https://some-service-url/endpoint-path/
        operationHeaders:
          Authorization: Bearer {env.MY_API_TOKEN}
          # You can also access to the cookies like below;
          # Authorization: Bearer {context.cookies.myApiToken}
```

### From Arguments

Mesh automatically generates arguments for operations if needed;

```yml
sources:
  - name: MyGraphQLApi
    handler:
      jsonSchema:
        baseUrl: https://some-service-url/endpoint-path/
        operations:
          - type: Query
            field: user
            path: /user/{args.id}
            method: GET
            responseSchema: ./json-schemas/user.json
```

This example operation definition will generate a root field with `id: ID` argument, then Mesh will interpolate the expression in `path` to get `id` value from `args`.


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
