---
id: graphql
title: GraphQL
sidebar_label: GraphQL
---

This handler allow you to load remote GraphQL schemas and use it with schema-stitching, based on `graphql-tools-fork`.

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

## Config API Reference

{@import ../generated-markdown/GraphQLHandler.generated.md}
