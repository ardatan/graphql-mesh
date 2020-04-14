---
id: federation
title: Apollo Federation
sidebar_label: Apollo Federation
---

This handler allows you to load remote Apollo Federation services.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/handler-federation
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
    - name: Gateway
      handler:
        federation:
          serviceList:
            - name: accounts
              url: http://localhost:4001/graphql
            - name: reviews
              url: http://localhost:4002/graphql    
            - name: products
              url: http://localhost:4003/graphql      
            - name: inventory
              url: http://localhost:4004/graphql      
```

> You can check out our example that uses Federation Handler.
[Click here to open the example on GitHub](https://github.com/Urigo/graphql-mesh/tree/master/examples/federation-example)

## Config API Reference

{@import ../generated-markdown/FederationHandler.generated.md}
