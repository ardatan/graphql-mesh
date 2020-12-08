---
id: encapsulate
title: Encapsulate Transform
sidebar_label: Encapsulate
---

The `encapsulate` transform allow you to easily encapsulate specific schema, into a single field under the root type.

That means, if you handler created a schema like that, that is named as `mySchema`:

```graphql
type Query {
  something: String
}

type Mutation {
  doSomething: String
}
```

The `encapsulate` transform will change your change to that:

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

This transformer is useful when you have multiple APIs in your Mesh, and you wish to have it wrapped with a field to have better understanding on where each field is coming from.

To get started with this transform, install it from npm:

```
yarn add @graphql-mesh/transform-encapsulate
```

## How to use?

```yml
transforms:
  - encapsulate
```

## Config API Reference

{@import ../generated-markdown/EncapsulateTransformObject.generated.md}
