---
id: typescript
title: TypeScript Support
sidebar_label: TypeScript Support
---

GraphQL Mesh supports TypeScript, and you can easily use it to generate typings for the fetched data, or for you custom resolvers that specific under `additionalResolvers`

## Type safety for custom resolvers

GraphQL Mesh allow API handler packages to provide TypeScript typings in order to have types support in your code.

In order to use the TypeScript support, use the CLI to generate typings file based on your unified GraphQL schema:

```
graphql-mesh typescript --output ./src/generated/mesh.ts
```

Now, you can import `Resolvers` interface from the generated file, and use it as the type for your custom resolvers. It will make sure that your parent value, arguments, context type and return value are fully compatible with the implementation. It will also provide fully typed SDK from the context:

```ts
import { Resolvers } from './generated/mesh';

export const resolvers: Resolvers = {
  // Your custom resolvers here
};
```

And make sure you have `require` section set in your config file (to allow GraphQL Mesh to compile TypeScript files):

```yaml
require:
  - ts-node/register/transpile-only
additionalResolvers:
  - ./src/mesh-resolvers.ts  
```

## Type safety for fetched data

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
import { ApolloServer } from 'apollo-server';

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
