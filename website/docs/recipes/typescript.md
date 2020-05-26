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

See [Mesh as SDK](/docs/recipes/as-sdk) section.
