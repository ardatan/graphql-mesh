---
id: federation
title: Apollo Federation Transform
sidebar_label: Apollo Federation
---

`federation` transform allows to add the resolvers and directives to conform to the federation specification. Much of the federation sourcecode could be reused ensuring it is compliant to the specification. This transform uses [`graphql-transform-federation`](https://github.com/0xR/graphql-transform-federation) package.

```
yarn add @graphql-mesh/transform-federation
```

## How to use?

Add the following configuration to your Mesh config file:

```yml
transforms:
  - federation: 
        types:
            # Ensure the root queries of this schema show up the combined schema
            - name: Query
              config:
                extend: true
            - name: Product
              config:
                # extend Product {
                extend: true
                # Product @key(fields: "id") {
                keyFields:
                    - id
                fields:
                    # id: Int! @external
                    - name: id
                      external: true

```
