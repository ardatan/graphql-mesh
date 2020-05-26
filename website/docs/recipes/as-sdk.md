---
id: as-sdk
title: Mesh as SDK
sidebar_label: Mesh as SDK
---

You can use GraphQL Mesh as a completely type-safe SDK in your existing TypeScript project.

Instead of using GraphQL operations as string with `execute` - you can use GraphQL Mesh and generate a ready-to-use TypeScript SDK to fetch your data. It will make sure to have type-safety and auto-complete for variables and returned data.

To generate this SDK, start by creating your GraphQL operations in a `.graphql` file, for example:

```graphql
query myQuery($someVar: String!) {
  getSomething(var: $someVar) {
    fieldA
    fieldB
  }
}
```

Now, use GraphQL Mesh CLI and point it to the list of your `.graphql` files, and specify the output path for the TypeScript SDK:

```
graphql-mesh generate-sdk --operations "./src/**/*.graphql" --output ./src/generated/sdk.ts
```

Now, instead of using `execute` manually, you can use the generated `getSdk` method with your a GraphQL Mesh client, and use the functions that are generated based on your operations:

```ts
import { getSdk } from './generated/sdk';
import { getMesh, findAndParseConfig } from '@graphql-mesh/runtime';

async function test() {
  // Load mesh config and get the sdkClient from it
  const meshConfig = await findAndParseConfig();
  const { sdkRequester } = await getMesh(meshConfig);
  // Get fully-typed SDK using the Mesh client and based on your GraphQL operations
  const sdk = getSdk(sdkRequester);

  // Execute `myQuery` and get a type-safe result
  // Variables and result are typed: { data?: { getSomething: { fieldA: string, fieldB: number }, errors?: GraphQLError[] } }
  const { data, errors } = await sdk.myQuery({ someVar: 'foo' });
}
```

> You can find an example for that [here](https://github.com/Urigo/graphql-mesh/tree/master/examples/postgres-geodb#using-the-generated-sdk)


![GraphQL Mesh](/img/as-sdk.png)
