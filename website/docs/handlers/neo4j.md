---
id: neo4j
title: Neo4j
sidebar_label: Neo4j
---
![image](https://user-images.githubusercontent.com/20847995/79219440-f1605480-7e5a-11ea-980e-6ba54ee1450e.png)

This handler allows you to use GraphQL schema created by `neo4j-graphql-js`.

To get started, install the handler library from NPM:

```sh
yarn add @graphql-mesh/neo4j
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: Neo4j
    handler:
      neo4j:
        url: neo4j://localhost
        username: neo4j
        password: MY_PASSWORD

```

> You can check out our example that uses Neo4j handler.
[Click here to open the example on GitHub](https://github.com/Urigo/graphql-mesh/tree/master/examples/neo4j-example)

## Config API Reference

{@import ../generated-markdown/Neo4jHandler.generated.md}
