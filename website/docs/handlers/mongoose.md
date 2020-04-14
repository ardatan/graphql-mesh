---
id: mongoose
title: MongoDB / Mongoose
sidebar_label: MongoDB / Mongoose
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

> You can check out our example that uses Mongoose handler.
[Click here to open the example on GitHub](https://github.com/Urigo/graphql-mesh/tree/master/examples/mongoose-example)

## Config API Reference

{@import ../generated-markdown/MongooseHandler.generated.md}
