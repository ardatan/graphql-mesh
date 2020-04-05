---
id: extend
title: Extend Transform
sidebar_label: Extend
---

The `extend` transform allow you to add custom GraphQL using SDL syntax. You can use this to add new custom types, extend existing types and link between types. 

```
yarn add @graphql-mesh/transform-extend
```

## How to use?

Add the following configuration to your Mesh config file:

```yml
transforms:
  - extend: | 
    extend type Query {
      myNewField: String!
    }
```
