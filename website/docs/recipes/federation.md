---
id: federation
title: Apollo Federation
sidebar_label: Apollo Federation
---

<p align="center">
  <img src="https://storage.googleapis.com/xebia-blog/1/2019/10/apollo-federation.jpg" width="300" alt="Apollo Federation" />
<br/>
</p>

You can use Apollo Federation as a merging strategy in favor of Schema Stitching approach.

To get started, install the merger library from NPM:

```
$ yarn add @graphql-mesh/merger-federation
```

Now, you can use it directly in your Mesh config file:

```yml
merger: federation # Define federation as a merging strategy
sources:
  - name: accounts # Add a non-federated GraphQL Source
    handler:
      graphql:
        endpoint: http://localhost:4001/graphql
    transforms: # Transform it to a federated schema
      - federation:
          types:
            - name: Query
              config:
                extend: true
            - name: User
              config:
                keyFields:
                  - id
                resolveReference: ./services/accounts/user-reference-resolver
  - name: reviews # You can also use a federated schema
    handler:
      graphql:
        endpoint: http://localhost:4002/graphql
  - name: products
    handler:
      graphql:
        endpoint: http://localhost:4003/graphql
  - name: inventory
    handler:
      graphql:
        endpoint: http://localhost:4004/graphql

```

> You can [check out documentation of federation transformer](/docs/transforms/federation) to learn more about adding federation metadata to a non-federated GraphQL Schema.

> You can check out our example that uses Federation as a merging strategy.
[Click here to open the example on GitHub](https://github.com/Urigo/graphql-mesh/tree/master/examples/federation-example)

