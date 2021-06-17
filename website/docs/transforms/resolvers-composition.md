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
      mode: bare | wrap
      compositions:
        - resolver: 'Query.me'
          composer: is-auth#isAuth
        - resolver: 'Mutation.*'
          composer: is-admin#isAdmin
```

```ts
module.exports = {
  isAuth: next => (root, args, context, info) => {
      // Check if Authorization header is present
      if(!context.headers.authorization) {
          throw new Error('Unauthorized');
      }
      return next(root, args, context, info);
  }
};
```

> For information about "bare" and "wrap" modes, please read the [dedicated section](/docs/getting-started/mesh-transforms#two-different-modes).

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/openapi-youtrack?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="odata-trippin-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>

## Config API Reference

{@import ../generated-markdown/ResolversCompositionTransform.generated.md}
