---
id: as-sdk
title: Mesh as SDK
sidebar_label: Mesh as SDK
---

You can use GraphQL Mesh as a completely type-safe SDK in your existing TypeScript project.

Instead of using GraphQL operations as string with `execute` - you can use GraphQL Mesh and generate a ready-to-use TypeScript SDK to fetch your data. It will make sure to have type-safety and auto-complete for variables and returned data.

Create your own GraphQL operations in a `.graphql` file for your SDK, for example:

```graphql
query myQuery($someVar: String!) {
  getSomething(var: $someVar) {
    fieldA
    fieldB
  }
}
```

In this case we only have `fieldA` and `fieldB` in our result so those are not added to the response object anymore.

Now, point to those operations in your `.meshrc.yml`;

```yml
sources:
  ...

documents:
  - ./src/**/*.graphql
```

## Try those operations in the playground

You can run `mesh dev` to try your operations in the playground;

```
yarn mesh dev
```

## Build your SDK with Mesh artifacts

This will generate an SDK inside your Mesh artifacts under `.mesh` directory;

```
yarn mesh build
```

## Using the generated SDK in the code

Now, instead of using `execute` manually, you can use the generated `getSdk` method with your a GraphQL Mesh client, and use the functions that are generated based on your operations:

```ts
import { getMeshSdk } from './.mesh';

async function test() {
  // Load mesh config and get the sdkClient from it
  const sdk = await getMeshSdk();

  // Execute `myQuery` and get a type-safe result
  // Variables and result are typed: { getSomething: { fieldA: string, fieldB: number }, errors?: GraphQLError[] }
  const { getSomething } = await sdk.myQuery({ someVar: 'foo' });
}
```

> You can find an example for that [here](https://github.com/Urigo/graphql-mesh/tree/master/examples/postgres-geodb#using-the-generated-sdk)


![GraphQL Mesh](/img/as-sdk.png)
