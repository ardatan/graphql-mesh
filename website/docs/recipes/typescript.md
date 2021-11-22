---
id: typescript
title: TypeScript Support
sidebar_label: TypeScript Support
---

GraphQL Mesh supports TypeScript, and you can easily use it to generate typings for the fetched data, and for you custom resolvers that specific under `additionalResolvers`

## Type safety for custom resolvers

GraphQL Mesh allows for API handler packages to provide TypeScript typings in order to have types support in your code.

First you need to install `ts-node` to allow NodeJS handle `.ts` files before adding `require` section to your configuration file like below;

```sh
yarn add ts-node
```

Then in your `.meshrc.yml` file;
```yaml
require:
  - ts-node/register/transpile-only

additionalResolvers:
  - ./src/mesh-resolvers.ts
```

Then, use the CLI command to generate the typings file based on your unified GraphQL schema:
```sh
mesh build
```

[See more about artifacts](/docs/recipes/build-mesh-artifacts)

Now, you can import `Resolvers` interface from the generated file, and use it as the type for your custom resolvers. It will make sure that your parent value, arguments, context type and return value are fully compatible with the implementation. It will also provide fully typed SDK from the context:

```ts
import { Resolvers } from './.mesh';

export const resolvers: Resolvers = {
  // Your custom resolvers here
};
```


## Type safety for fetched data

See [Mesh as SDK](/docs/recipes/as-sdk) section.
