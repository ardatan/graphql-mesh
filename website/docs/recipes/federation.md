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

> Stitching merger which is the default one also support federated schemas out of box. So you don't need this unless you want it specifically. While federation merger needs all sources federated, stitching doesn't and stitching merger can combine federated and non-federated sources automatically.

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

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/federation-example?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="federation-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin" />

