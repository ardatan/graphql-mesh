---
id: openapi
title: OpenAPI / Swagger
sidebar_label: 'OpenAPI / Swagger'
---
![image](https://user-images.githubusercontent.com/20847995/79218686-7ba7b900-7e59-11ea-8a5e-676a83b9f86e.png)

This handler allows you to load remote or local [OpenAPI (2/3) and Swagger](https://swagger.io/) schemas. Based on [OpenAPI-to-GraphQL](https://developer.ibm.com/open/projects/openapi-to-graphql/).

You can import it using remote/local `.json` or `.yaml`.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/openapi
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: MyOpenapiApi
    handler:
      openapi:
        source: ./my-schema.json
```

## Overriding default Query/Mutation operations
By default OpenAPI-to-GraphQL will place all GET operations into Query fields and all other operations into Mutation fields; with this option you can manually override this process.
In order to switch between Query and Mutation operations, and vice versa, you need to define a rule per override, consisting of: OAS title, path of the operation, method of the operation and finally the destination type (e.g. Query or Mutation).
See example below:

```yaml
sources:
  - name: MyOpenapiApi
    handler:
      openapi:
        source: ./my-schema.json
        selectQueryOrMutationField:
          - title: "Weather Service v1" # OAS title
            path: /weather/current # operation path
            method: post
            type: Query # switch method POST from default Mutation into Query
          - title: "Weather Service v1" # OAS title
            path: /weather/forecast # operation path
            method: get
            type: Mutation # switch method GET from default Query into Mutation
```

## Dynamic Header Values

Mesh can take dynamic values from the GraphQL Context or the environmental variables. If you use `mesh serve`, GraphQL Context will be the incoming HTTP request.

The expression inside dynamic values should be as in JS.

### From Context (HTTP Header for `mesh serve`)

```yml
sources:
  - name: MyGraphQLApi
    handler:
      openapi:
        source: ./my-schema.json
        operationHeaders:
          # Please do not use capital letters while getting the headers
          Authorization: Bearer {context.headers['x-my-api-token']} 
          # You can also access to the cookies like below;
          # Authorization: Bearer {context.cookies.myApiToken}
```

And for `mesh serve`, you can pass the value using `x-my-graphql-api-token` HTTP header.

### From Environmental Variable

`MY_API_TOKEN` is the name of the environmental variable you have the value.

```yml
sources:
  - name: MyGraphQLApi
    handler:
      openapi:
        source: ./my-schema.json
        operationHeaders:
          Authorization: Bearer ${MY_API_TOKEN}
```

> We have a lot of examples for OpenAPI Handler;
- [JavaScript Wiki](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-javascript-wiki)
- [Location Weather](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-location-weather)
- [StackExchange](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-stackexchange)
- [Stripe](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-stripe)
- [Subscriptions Example with Webhooks](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-subscriptions)
- [Youtrack](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-youtrack)

## Config API Reference

{@import ../generated-markdown/OpenapiHandler.generated.md}
