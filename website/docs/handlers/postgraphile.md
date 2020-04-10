---
id: postgraphile
title: PostgreSQL / PostGraphile
sidebar_label: PostgreSQL / PostGraphile
---

This handler allows you to use GraphQL schema created by [PostGraphile](https://www.graphile.org/postgraphile/), based on a PostgreSQL database schema.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/postgraphile
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: MyDb
    handler:
      postgraphile:
        connectionString: postgres://postgres:password@localhost/postgres
```

> You can check out our example that uses schema stitching with a PostgreSQL datasource.
[Click here to open the example on GitHub](https://github.com/Urigo/graphql-mesh/tree/master/examples/postgres-geodb)

## Config API Reference

{@import ../generated-markdown/PostGraphileHandler.generated.md}
