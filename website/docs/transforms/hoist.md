---
id: hoist-field
title: Hoist Field Transform
sidebar_label: Hoist Field
---

The `hoist` transform allows you to lift a field from one object type to a 'parent' root or object type. It is currently only available as a `wrap` transform.

```
yarn add @graphql-mesh/transform-hoist-field
```

> Underneath it leverages the `HoistField` transform from the `@graphql-tools/wrap` package.

## How to use?

Given the following schema:
```graphql
type Query {
  users(limit: Int!, page: Int): UserSearchResult
}

type UserSearchResult {
  page: Int!
  results: [User!]!
}

type User {
  id: ID!
}
```

### Simple hoisting

```yml
transforms:
  - hoist:
      - typeName: Query
        pathConfig:
          - users
          - results
        newFieldName: users
```

Will transform the given schema to:
```graphql
type Query {
  users(limit: Int!, page: Int): [User!]!
}

type User {
  id: ID!
}
```

### Filtering args via a default for the entire path
```yml
transforms:
  - hoist:
      - typeName: Query
        pathConfig:
          - users
          - results
        newFieldName: users
        filterArgsInPath: true # This flag sets the default for the entire path

```
Will transform the given schema to:
```graphql
type Query {
  users: [User!]!
}

type User {
  id: ID!
}
```
### Filtering args via on specific levels of the path
```yml
transforms:
  - hoist:
      - typeName: Query
        pathConfig:
          - fieldName: users
            filterArgs:
              - limit
          - results
        newFieldName: users

```
Will transform the given schema to:
```graphql
type Query {
  users(page: Int): [User!]!
}

type User {
  id: ID!
}
```

## Config API Reference

{@import ../generated-markdown/CacheTransformConfig.generated.md}
