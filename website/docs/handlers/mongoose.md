---
id: mongoose
title: Mongoose
sidebar_label: Mongoose
---

This handler allows you to use GraphQL schema created by `graphql-compose-mongoose`.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/mongoose
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: Mongoose
    handler:
      mongoose:
        connectionString: mongodb://localhost:27017/test
        models:
          - name: User
            path: ./src/models#User

```

## Config API Reference

{@import ../generated-markdown/MongooseHandler.generated.md}
