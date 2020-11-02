---
id: as-sdk
title: Mesh as SDK
sidebar_label: Mesh as SDK
---

You can use GraphQL Mesh as a completely type-safe SDK in your existing TypeScript project.

Instead of using GraphQL operations as string with `execute` - you can use GraphQL Mesh and generate a ready-to-use TypeScript SDK to fetch your data. It will make sure to have type-safety and auto-complete for variables and returned data.

## Generate an SDK without GraphQL Operations

GraphQL Mesh can generate needed GraphQL operations for you on build time. Let's see how it works;

Assume that you have the following GraphQL Schema;
```graphql
type Query {
  getSomething(var: String): Something
}
type Something {
  fieldA: String
  fieldB: Int
  fieldC(someOtherVar: String): Foo
}
type Foo {
  id: ID!
  bar: Bar
}
type Bar {
  id: ID!
  baz: Baz
}
type Baz {
  id: ID!
  qux: Qux
}
type Qux {
  id: ID!
}
```

Run the following command to generate an SDK to the specified;
```
graphql-mesh generate-sdk --output ./src/generated/sdk.ts
```

GraphQL Mesh generates GraphQL operation on build time by a depth limit for each root field;
```graphql
query getSomethingQuery($var: String, $someOtherVar: String) {
  getSomething(var: $var) {
    fieldA
    fieldB
    fieldC(someOtherVar: $someOtherVar) {
      id
    }
  }
} 
```

As you can see all the nested fields with their arguments (not only the root one but all the nested fields) are collected and added as variables and selection set in the generated operation.
But other nested fields of `fieldC` is not there because the depth limit is 2 by default. But we can increase and decrease this value by specifying it on the command line like below;

```
graphql-mesh generate-sdk --output ./src/generated/sdk.ts --depth 3
```

Now it becomes;
```graphql
query getSomethingQuery($var: String, $someOtherVar: String) {
  getSomething(var: $var) {
    fieldA
    fieldB
    fieldC(someOtherVar: $someOtherVar) {
      id
      bar {
        id
      }
    }
  }
} 
```

But if you have more advanced use cases, you can create your own GraphQL operations;

## Generate Advanced SDK with Custom GraphQL Operations

If you want to have more control on GraphQL operations, create your own GraphQL operations in a `.graphql` file for your SDK, for example:

```graphql
query myQuery($someVar: String!) {
  getSomething(var: $someVar) {
    fieldA
    fieldB
  }
}
```

In this case we only have `fieldA` and `fieldB` in our result so those are not added to the response object anymore.

Now, use GraphQL Mesh CLI and point it to the list of your `.graphql` files, and specify the output path for the TypeScript SDK:

```
graphql-mesh generate-sdk --operations "./src/**/*.graphql" --output ./src/generated/sdk.ts
```

## Using the generated SDK in the code

Now, instead of using `execute` manually, you can use the generated `getSdk` method with your a GraphQL Mesh client, and use the functions that are generated based on your operations:

```ts
import { getSdk } from './generated/sdk';
import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';

async function test() {
  // Load mesh config and get the sdkClient from it
  const meshConfig = await findAndParseConfig();
  const { sdkRequester } = await getMesh(meshConfig);
  // Get fully-typed SDK using the Mesh client and based on your GraphQL operations
  const sdk = getSdk(sdkRequester);

  // Execute `myQuery` and get a type-safe result
  // Variables and result are typed: { getSomething: { fieldA: string, fieldB: number }, errors?: GraphQLError[] }
  const { getSomething } = await sdk.myQuery({ someVar: 'foo' });
}
```

> You can find an example for that [here](https://github.com/Urigo/graphql-mesh/tree/master/examples/postgres-geodb#using-the-generated-sdk)


![GraphQL Mesh](/img/as-sdk.png)
