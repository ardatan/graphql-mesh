---
id: postgraphile
title: PostGraphile
sidebar_label: PostGraphile
---

This handler allows you to use GraphQL schema created by `postgraphile`, based on a Postgres database schema.

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
