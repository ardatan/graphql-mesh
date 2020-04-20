---
id: filter-schema
title: Filter Schema Transform
sidebar_label: Filter Schema
---

The `filterSchema` transform allows you to filter fields in specific tyypes.

```
yarn add @graphql-mesh/transform-filter-schema
```

## How to use?

Add the following configuration to your Mesh config file:

```yml
transforms:
  - filterSchema:
    - Query.!admins # <-- This will remove field `admins` from `Query` type
    - Mutation.!{addUser, removeUser} # <-- This will remove fields `addUser` and `removeUser` from `Mutation` type
    - User.{id,username,name,age} # <-- This will remove fields except `id`, `username`, `name` and `age`
```

Let's assume you have the following schema,
```graphql
type Query {
    me: User
    users: [User]
    user(id: ID): User
    admins: [User]
}

type Mutation {
    updateMyProfile(name: String, age: Int): User
    addUser(username: String, name: String, age: Int): User
    removeUser(id: ID): ID
}

type User {
    id: ID
    username: String
    password: String
    name: String
    age: Int
    ipAddress: String
}
```

It would become the following schema;
```graphql
type Query {
    me: User
    users: [User]
    user(id: ID): User
    admins: [User]
}

type Mutation {
    updateMyProfile(name: String, age: Int): User
    addUser(username: String, name: String, age: Int): User
    removeUser(id: ID): ID
}

type User {
    id: ID
    username: String
    password: String
    name: String
    age: Int
    ipAddress: String
}
``````graphql
type Query {
    me: User
    users: [User]
    user(id: ID): User
}

type Mutation {
    updateMyProfile(name: String, age: Int): User
}

type User {
    id: ID
    username: String
    name: String
    age: Int
}
```

