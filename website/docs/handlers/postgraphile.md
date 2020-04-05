---
id: postgraphile
title: PostGraphile
sidebar_label: PostGraphile
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

## Config API Reference

{@import ../generated-markdown/PostGraphileHandler.generated.md}
