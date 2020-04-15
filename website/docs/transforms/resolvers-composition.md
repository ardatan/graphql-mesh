---
id: resolvers-composition
title: Resolvers Composition Transform
sidebar_label: Resolvers Composition
---

The `resolversComposition` transform allow you add middleware to your existing resolvers.

```
yarn add @graphql-mesh/transform-resolvers-composition
```

## How to use?

Add the following configuration to your Mesh config file:

```yml
transforms:
  - resolversComposition:
        'Query.me': is-auth#isAuth
        'Mutation.*': is-admin#isAdmin
```

```ts
export const isAuth = next => (root, args, context, info) => {
    if(!context.currentUser) {
        throw new Error('Unauthorized');
    }
    return next(root, args, context, info);
}
```

> You can check out our YouTrack example that uses OpenAPI Handler.
[Click here to open the example on GitHub](https://github.com/Urigo/graphql-mesh/tree/master/examples/openapi-youtrack)

## Config API Reference

{@import ../generated-markdown/ResolversCompositionTransformObject.generated.md}
