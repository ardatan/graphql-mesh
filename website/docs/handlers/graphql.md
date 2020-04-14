---
id: graphql
title: GraphQL
sidebar_label: GraphQL
---
![image](https://user-images.githubusercontent.com/20847995/79219047-333ccb00-7e5a-11ea-9fce-57ff137ba924.png)

This handler allows you to load remote GraphQL schemas and use it with schema-stitching, based on `graphql-tools`.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/graphql
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

## Config API Reference

{@import ../generated-markdown/GraphQLHandler.generated.md}
