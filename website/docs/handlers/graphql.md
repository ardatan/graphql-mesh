---
id: graphql
title: GraphQL
sidebar_label: GraphQL
---
![image](https://user-images.githubusercontent.com/20847995/79219047-333ccb00-7e5a-11ea-9fce-57ff137ba924.png)

This handler allows you to load remote GraphQL schemas and use it with schema-stitching, based on `graphql-tools`.

To get started, install the handler library from NPM:

```sh
yarn add @graphql-mesh/graphql
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: MyGraphQLApi
    handler:
      graphql:
        endpoint: http://my-service-url:3000/graphql
```

> You can check out our example that uses schema stitching with a PostgreSQL datasource.
[Click here to open the example on GitHub](https://github.com/Urigo/graphql-mesh/tree/master/examples/postgres-geodb)

## Dynamic Header Values (e.g. for Authorization)

Mesh can take dynamic values from the GraphQL Context or the environmental variables. If you use `mesh dev` or `mesh start`, GraphQL Context will be the incoming HTTP request.

The expression inside dynamic values should be as in JS.

### From Context (HTTP Header for `mesh dev` or `mesh start`)

```yml
sources:
  - name: MyGraphQLApi
    handler:
      graphql:
        endpoint: http://my-service-url:3000/graphql
        operationHeaders:
          # Please do not use capital letters while getting the headers
          Authorization: Bearer {context.headers['x-my-api-token']}
          # You can also access to the cookies like below;
          # Authorization: Bearer {context.cookies.myApiToken}
```

And for `mesh dev` or `mesh start`, you can pass the value using `x-my-graphql-api-token` HTTP header.

### From Environmental Variable

`MY_API_TOKEN` is the name of the environmental variable you have the value.

```yml
sources:
  - name: MyGraphQLApi
    handler:
      graphql:
        endpoint: http://my-service-url:3000/graphql
        operationHeaders:
          Authorization: Bearer {env.MY_API_TOKEN}
```

## Config API Reference

{@import ../generated-markdown/GraphQLHandler.generated.md}
