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

> We have a lot of examples for OpenAPI Handler;
- [JavaScript Wiki](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-javascript-wiki)
- [Location Weather](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-location-weather)

## Config API Reference

{@import ../generated-markdown/OpenapiHandler.generated.md}
