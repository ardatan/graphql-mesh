---
id: openapi
title: OpenAPI / Swagger
sidebar_label: "OpenAPI / Swagger"
---

This handler allow you to load remote or local OpenAPI (2/3) and Swagger schemas. Based on `openapi-to-graphql`.

You can import it using remote/local `.json` or `.yaml`.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/openapi
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - openapi:
      source: ./my-schema.json
```

## Config API Reference

{@import ../generated-markdown/OpenapiHandler.generated.md}

