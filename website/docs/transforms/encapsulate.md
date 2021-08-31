---
id: encapsulate
title: Encapsulate Transform
sidebar_label: Encapsulate
---

The `encapsulate` transform allow you to easily encapsulate a specific schema into a single field under the root type.

For instance, if your handler created a schema like this, named `mySchema`:

```graphql
type Query {
  something: String
}

type Mutation {
  doSomething: String
}
```

The `encapsulate` transform will change your schema to this:

```graphql
type Query {
  mySchema: mySchemaQuery!
}

type Mutation {
  mySchema: mySchemaMutation!
}

type mySchemaQuery {
  something: String
}

type mySchemaMutation {
  doSomething: String
}
```

This transformer is useful when you have multiple APIs in your Mesh, and you wish to have it wrapped with a name to have a better understanding on where each field is coming from.

To get started with this transform, install it from npm:

```
yarn add @graphql-mesh/transform-encapsulate
```

## How to use?

```yml
transforms:
  - encapsulate:
      applyTo:
        query: true
        mutation: false
        subscription: false

```

## Config API Reference

{@import ../generated-markdown/EncapsulateTransformObject.generated.md}
